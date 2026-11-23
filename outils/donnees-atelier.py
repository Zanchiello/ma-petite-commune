"""Données de la section « Télécharger vos graphiques » (atelier.js).

Ajoute aux fichiers existants :
- les postes d'« Anatomie d'un budget » d'Observer (2022 à 2025) et trois soldes (recettes et
  dépenses de fonctionnement, épargne brute), en euros par habitant ;
- la moyenne simple des communes, à côté de la médiane, pour la France et pour chaque département.

Les médianes déjà publiées des cinq indicateurs historiques ne sont pas recalculées.
Lancer depuis la racine du site : python3 outils/donnees-atelier.py
"""
import base64, json, zlib
from pathlib import Path
import numpy as np

RACINE = Path(__file__).resolve().parent.parent
P = json.loads((RACINE / "observer-data.json").read_text())
inf = lambda b: zlib.decompress(base64.b64decode(b))
communes = json.loads(inf(P["communes_z"]))
N = len(communes)
ANS = P["annees"]                       # 2018 à 2025
NY = len(ANS)

# --- séries historiques (même décodage qu'observer.html)
S = P["series"]; buf = inf(S["z"]); ex = json.loads(inf(S["ex_z"]))
all16 = np.frombuffer(buf, dtype=np.int16, count=S["n16"]); all8 = np.frombuffer(buf, dtype=np.uint8, offset=S["n16"] * 2)
serie = {}
for j, m in enumerate(S["names"]):
    q, sc = S["q"][j], S["scales"][j]
    if q["b"] == 16:
        v = all16[q["o"]:q["o"] + N * NY].astype(float); v[v == -32768] = np.nan; a = v / sc
    else:
        v = all8[q["o"]:q["o"] + N * NY].astype(float); a = np.where(v == 255, np.nan, (q["lo"] + v * q["st"]) / sc)
    serie[m] = a
for j, k, v in ex:
    serie[S["names"][j]][k] = v / S["scales"][j]
serie = {m: a.reshape(N, NY) for m, a in serie.items()}

# --- Anatomie d'un budget (2022 à 2025), placée dans une grille 2018-2025
B = P["budget"]; BF = B["fields"]; BY = B["years"]
barr = np.frombuffer(inf(B["z"]), dtype=np.int16).reshape(N, len(BY), len(BF)).astype(float); barr[barr == -32768] = np.nan
off = ANS.index(BY[0])
anat = {}
for k, f in enumerate(BF):
    a = np.full((N, NY), np.nan); a[:, off:off + len(BY)] = barr[:, :, k]; anat[f] = a
anat["rrf"] = sum(anat[f] for f in ["il", "ia", "ce", "sr", "vb", "ra"])
anat["drf"] = sum(anat[f] for f in ["pe", "ac", "di", "cf", "da"])
anat["eb"] = anat["rrf"] - anat["drf"]
del anat["eq"]   # identique à l'indicateur « eq » déjà publié (vérifié : écart nul en 2025)
NOUVEAUX = ["il", "ia", "ce", "sr", "vb", "ra", "pe", "ac", "di", "cf", "da", "fc", "sd", "ar", "em", "se", "ad", "rb", "rrf", "drf", "eb"]
HISTO = ["teb", "dh", "eq", "fit", "cap"]
val = {**{m: serie[m] for m in HISTO}, **{m: anat[m] for m in NOUVEAUX}}
DEC = {"teb": 1, "cap": 1}

C = json.loads((RACINE / "carte-departements.json").read_text())
strate = np.array([c["s"] for c in communes])
nom_dep = np.array([P["deps"][c["d"]] for c in communes])
geo_noms = [g["n"] for g in C["geo"]]
MASQUES = {"all": np.isin(strate, [2, 3, 4]), "2": strate == 2, "3": strate == 3, "4": strate == 4}

def rond(x, m):
    if x is None or np.isnan(x): return None
    d = DEC.get(m, 0); return round(float(x), d) if d else int(round(float(x)))

def stat(a, f):
    a = a[~np.isnan(a)]
    return None if a.size == 0 else (np.median(a) if f == "med" else a.mean())

for f, cle_n, cle_d in [("med", "national", "vals_annees"), ("moy", "national_moy", "vals_annees_moy")]:
    C.setdefault(cle_n, {}); C.setdefault(cle_d, {})
    for m in HISTO + NOUVEAUX:
        if f == "med" and m in HISTO: continue          # déjà publié, inchangé
        C[cle_n][m] = {}; C[cle_d][m] = {}
        for s, mk in MASQUES.items():
            C[cle_n][m][s] = [rond(stat(val[m][mk, y], f), m) for y in range(NY)]
            par_an = []
            for y in range(NY):
                ligne = []
                for n in geo_noms:
                    sel = mk & (nom_dep == n); a = val[m][sel, y]; a = a[~np.isnan(a)]
                    ligne.append(rond(stat(a, f), m) if a.size >= 10 else None)
                par_an.append(ligne)
            C[cle_d][m][s] = par_an
(RACINE / "carte-departements.json").write_text(json.dumps(C, ensure_ascii=False, separators=(",", ":")))

# --- fichiers par département : séries des nouveaux postes pour chaque commune
code = {c["c"]: i for i, c in enumerate(communes)}
for p in sorted((RACINE / "donnees-communes").glob("*.json")):
    D = json.loads(p.read_text())
    if D["ind"][:5] != HISTO: raise SystemExit(f"format inattendu : {p}")
    D["ind"] = HISTO + NOUVEAUX; D["nouveaux_depuis"] = BY[0]   # nouveaux postes : années BY[0] à 2025 seulement
    for insee, r in D["c"].items():
        r[:] = r[:1 + len(HISTO)]
        i = code.get(insee)
        for m in NOUVEAUX:
            r.append([None] * len(BY) if i is None else [rond(v, m) for v in val[m][i][off:]])
    p.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")))
print("ok", len(NOUVEAUX), "nouveaux indicateurs")
