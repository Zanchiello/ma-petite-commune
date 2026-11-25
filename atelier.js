/* Ma Petite Commune — section « Télécharger » de l'accueil.
   Le visiteur compose un graphique (indicateur, périmètre, taille de commune, période, forme) ;
   une page A4 se construit en direct, puis se télécharge en PDF, PNG, SVG ou CSV.
   Tout est fabriqué dans le navigateur, à partir des données déjà publiées par Observer (carte-departements.json). */
(() => {
  const $ = id => document.getElementById(id);
  const zone = $("atelier"); if (!zone) return;
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ANS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const IND = {
    teb: { t: "Taux d'épargne brute", u: "%", d: 1, sens: 1, def: "Épargne brute rapportée aux recettes réelles de fonctionnement." },
    dh:  { t: "Dette par habitant", u: "€", d: 0, sens: -1, def: "Encours de dette au 31 décembre, rapporté à la population." },
    eq:  { t: "Dépenses d'équipement par habitant", u: "€", d: 0, sens: 0, def: "Dépenses d'investissement en équipements, rapportées à la population." },
    fit: { t: "Impôts et taxes par habitant", u: "€", d: 0, sens: 0, def: "Produit des impôts et taxes, rapporté à la population." },
    cap: { t: "Capacité de désendettement", u: "ans", d: 1, sens: -1, def: "Nombre d'années d'épargne brute nécessaires pour rembourser toute la dette." }
  };
  // Postes d'« Anatomie d'un budget » (Observer), en euros par habitant, disponibles de 2022 à 2025
  const ANAT = [
    ["Fonctionnement · recettes", [["il", "Impôts locaux"], ["ia", "Fiscalité reversée et autres impôts"], ["ce", "Dotation globale de fonctionnement"], ["sr", "Autres dotations et participations"], ["vb", "Produits des services et du domaine"], ["ra", "Autres produits"]]],
    ["Fonctionnement · dépenses", [["pe", "Personnel"], ["ac", "Achats et charges externes"], ["di", "Contingents et subventions versées"], ["cf", "Charges financières (intérêts)"], ["da", "Autres charges"]]],
    ["Investissement · ressources", [["fc", "FCTVA"], ["sd", "Subventions d'investissement reçues"], ["ar", "Autres ressources d'investissement"], ["em", "Emprunts nouveaux"]]],
    ["Investissement · emplois", [["se", "Subventions d'équipement versées"], ["ad", "Autres emplois d'investissement"], ["rb", "Remboursement du capital de la dette"]]],
    ["Soldes", [["rrf", "Recettes de fonctionnement"], ["drf", "Dépenses de fonctionnement"], ["eb", "Épargne brute"]]]
  ];
  ANAT.forEach(([g, l]) => l.forEach(([k, t]) => { IND[k] = { t: t + " par habitant", u: "€", d: 0, sens: k === "eb" ? 1 : 0, debut: 2022, g,
    def: (k === "eb" ? "Recettes moins dépenses de fonctionnement, " : k === "rrf" || k === "drf" ? "Total de la section, " : "Poste d'« Anatomie d'un budget » dans Observer, ") + "rapporté à la population. Disponible de 2022 à 2025." }; }));
  IND.eq.g = "Investissement · emplois";
  const STRATE = { all: "communes de 200 à 3 499 habitants", "2": "communes de 200 à 499 habitants", "3": "communes de 500 à 1 999 habitants", "4": "communes de 2 000 à 3 499 habitants" };
  const FORME = { courbe: "Évolution", barres: "Évolution", carte: "Carte des départements", classement: "Classement des départements" };
  const BLEU = "#172E3A", CREME = "#F5F1E8", SAUGE = "#78A995", TERRA = "#D77D68", SAFRAN = "#E9B65C", TERRA_T = "#8A5043", SAUGE_T = "#49675B", GRIS = "#586971";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nf = (v, d = 0) => v == null || Number.isNaN(v) ? "–" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fu = (v, i) => nf(v, i.d) + " " + i.u;

  let C = null, COM = null;   // COM : commune choisie {n, c, dc, p, s, v}
  const DEP = {};             // fichiers par département, chargés à la demande
  const sels = ["at-ind", "at-forme", "at-per", "at-strate", "at-de", "at-a", "at-ref"].map($);
  const REF = () => $("at-ref").value === "moy" ? "moy" : "med";
  const refMot = E => E.ref === "moy" ? "moyenne" : "médiane";
  const NAT = E => C[E.ref === "moy" ? "national_moy" : "national"][E.ind], DEPV = E => C[E.ref === "moy" ? "vals_annees_moy" : "vals_annees"][E.ind];

  /* ---------- Données de la vue choisie ---------- */
  function etat() {
    const ind = $("at-ind").value, forme = $("at-forme").value, per = $("at-per").value, st = per === "com" && COM ? String(COM.s) : $("at-strate").value;
    let a = +$("at-de").value, b = +$("at-a").value; if (a > b) [a, b] = [b, a];
    const deb = IND[ind].debut || 2018; a = Math.max(a, deb); b = Math.max(b, deb);
    return { ind, I: IND[ind], forme, per, st, a, b, ref: REF() };
  }
  function serie(E) {
    const ia = E.a - 2018, ib = E.b - 2018;
    if (E.per === "com" && COM) { const j = COM.ind.indexOf(E.ind), v = COM.v[j] || []; const plein = j < 5 ? v : Array(COM.depuis - 2018).fill(null).concat(v); return plein.slice(ia, ib + 1); }
    if (E.per === "fr") return NAT(E)[E.st].slice(ia, ib + 1);
    const g = +E.per; return DEPV(E)[E.st].slice(ia, ib + 1).map(r => r[g]);
  }
  function perNom(E) { if (E.forme === "carte" || E.forme === "classement" || E.per === "fr") return "France";
    if (E.per === "com" && COM) return COM.n + " (" + COM.dn + ", " + nf(COM.p) + " hab.)"; const g = C.geo[+E.per]; return g.n + " (" + g.c + ")"; }
  const mediane = E => NAT(E)[String(COM.s)].slice(E.a - 2018, E.b - 2017);   // communes de même taille, France (médiane ou moyenne)

  /* ---------- Page A4 (595 × 842) en SVG ---------- */
  function page(E, fontesCss = "") {
    const W = 595, H = 842, I = E.I;
    const carto = E.forme === "carte" || E.forme === "classement";
    const unec = !carto && E.per === "com" && COM;
    const titre = I.t + (carto ? "" : unec ? " · " + COM.n : E.ref === "moy" ? ", moyenne des communes" : " de la commune médiane");
    const sous = (carto ? (E.ref === "moy" ? "Moyenne" : "Médiane") + " des communes de chaque département · " + E.b : perNom(E) + " · " + (E.a === E.b ? E.a : E.a + "-" + E.b)) + " · " + (unec ? "comparée aux " + STRATE[E.st] : STRATE[E.st]);
    let corps = "", cle = "";
    if (!carto) {
      const s = serie(E), ok = s.filter(v => v != null);
      const v1 = s[s.length - 1], v0 = s[0];
      if (v1 != null && v0 != null && s.length > 1) {
        const dlt = v1 - v0, pct = I.u === "€" ? Math.round(dlt / v0 * 100) : null;
        const txt = (dlt >= 0 ? "+" : "−") + (I.u === "%" ? nf(Math.abs(dlt), 1) + " point" + (Math.abs(dlt) >= 2 ? "s" : "") : nf(Math.abs(dlt), I.d) + " " + I.u) + (pct != null ? " (" + (pct >= 0 ? "+" : "−") + Math.abs(pct) + " %)" : "") + " depuis " + E.a;
        const bon = I.sens === 0 ? null : (dlt * I.sens > 0);
        cle = `<text x="40" y="264" font-family="Work Sans" font-size="12.5" fill="${GRIS}">en ${E.b} · <tspan font-weight="800" fill="${bon == null ? BLEU : bon ? SAUGE_T : TERRA_T}">${dlt >= 0 ? "▲" : "▼"} ${esc(txt)}</tspan></text>`;
      }
      corps += `<text x="40" y="238" font-family="Besley" font-weight="600" font-size="54" fill="${TERRA_T}">${esc(fu(v1, I))}</text>` + cle;
      // graphique
      const x0 = 70, x1 = 545, y0 = 300, y1 = 640, n = s.length;
      const med = unec ? mediane(E) : null, tousV = ok.concat(med ? med.filter(v => v != null) : []);
      const lo0 = Math.min(...tousV), hi0 = Math.max(...tousV), pad = (hi0 - lo0) * 0.25 || Math.abs(hi0) * 0.1 || 1;
      const lo = E.forme === "barres" ? 0 : Math.max(0, lo0 - pad), hi = hi0 + pad;
      const X = i => n === 1 ? (x0 + x1) / 2 : x0 + 20 + i * ((x1 - x0 - 40) / (n - 1)), Y = v => y1 - (v - lo) / (hi - lo || 1) * (y1 - y0);
      for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); corps += `<path d="M${x0} ${y.toFixed(1)}H${x1}" stroke="${BLEU}" stroke-opacity="${k ? .08 : .35}" stroke-width="1"/><text x="${x0 - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="Work Sans" font-size="10" fill="${GRIS}">${nf(v, I.u === "€" ? 0 : 1)}</text>`; }
      s.forEach((v, i) => corps += `<text x="${X(i).toFixed(1)}" y="${y1 + 18}" text-anchor="middle" font-family="Work Sans" font-weight="700" font-size="10.5" fill="${GRIS}">${E.a + i}</text>`);
      if (med) { const pm = med.map((v, i) => v == null ? null : `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).filter(Boolean).join(" ");
        corps += `<polyline class="at-m" points="${pm}" fill="none" stroke="${GRIS}" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>`
          + `<rect x="${x0}" y="${y1 + 32}" width="14" height="8" rx="2" fill="${E.forme === "barres" ? SAUGE : SAUGE_T}"/><text x="${x0 + 20}" y="${y1 + 40}" font-family="Work Sans" font-weight="700" font-size="10" fill="${BLEU}">${esc(COM.n)}</text>`
          + `<path d="M${x0 + 30 + COM.n.length * 6} ${y1 + 36}H${x0 + 54 + COM.n.length * 6}" stroke="${GRIS}" stroke-width="2" stroke-dasharray="5 4"/><text x="${x0 + 60 + COM.n.length * 6}" y="${y1 + 40}" font-family="Work Sans" font-size="10" fill="${GRIS}">${E.ref === "moy" ? "Moyenne" : "Médiane"} des ${esc(STRATE[E.st])}, France</text>`; }
      if (E.forme === "barres") {
        const bw = Math.min(46, (x1 - x0 - 40) / n * 0.62);
        s.forEach((v, i) => { if (v == null) return; const y = Y(v), last = i === n - 1;
          corps += `<rect class="at-b" style="--k:${i}" x="${(X(i) - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(y1 - y).toFixed(1)}" rx="4" fill="${last ? TERRA : SAUGE}"/>`
            + `<text class="at-t" x="${X(i).toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-family="Work Sans" font-weight="800" font-size="10.5" fill="${last ? TERRA_T : BLEU}">${nf(v, I.d)}</text>`; });
      } else {
        const pts = s.map((v, i) => v == null ? null : `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).filter(Boolean).join(" ");
        corps += `<polyline class="at-l" pathLength="1" points="${pts}" fill="none" stroke="${SAUGE_T}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
        s.forEach((v, i) => { if (v == null) return; const last = i === n - 1;
          corps += `<circle class="at-p" style="--k:${i}" cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${last ? 6 : 4}" fill="${last ? TERRA : SAUGE_T}"/>`
            + `<text class="at-t" x="${X(i).toFixed(1)}" y="${(Y(v) - 11).toFixed(1)}" text-anchor="middle" font-family="Work Sans" font-weight="800" font-size="10.5" fill="${last ? TERRA_T : BLEU}">${nf(v, I.d)}</text>`; });
      }
    } else {
      const yi = E.b - 2018, v = DEPV(E)[E.st][yi];
      const tous = DEPV(E)[E.st].flat().filter(x => x != null).sort((p, q) => p - q);
      const qt = [.2, .4, .6, .8].map(p => tous[Math.floor(p * (tous.length - 1))]);
      const SC = ["#DFE2E3", "#B0B8BC", "#7D8A91", "#4A5C65", "#172E3A"];
      const cls = x => x == null ? "#D3D3D3" : SC[qt.filter(t => x > t).length];
      const paires = C.geo.map((g, k) => [g.n, v[k]]).filter(p => p[1] != null).sort((p, q) => q[1] - p[1]);
      const med = paires.map(p => p[1]).sort((p, q) => p - q)[Math.floor(paires.length / 2)];
      corps += `<text x="40" y="236" font-family="Besley" font-weight="600" font-size="22" fill="${BLEU}">De ${esc(fu(paires[paires.length - 1][1], E.I))} à ${esc(fu(paires[0][1], E.I))}</text><text x="40" y="258" font-family="Work Sans" font-size="12" fill="${GRIS}">entre départements en ${E.b} ; département médian : ${esc(fu(med, E.I))}</text>`;
      if (E.forme === "carte") {
        corps += `<svg x="40" y="285" width="515" height="420" viewBox="0 0 622 597">` + C.geo.map((g, k) => `<path class="at-d" style="--k:${(k % 12)}" d="${g.p}" fill="${cls(v[k])}" stroke="${CREME}" stroke-width="1"/>`).join("") + `</svg>`;
        const lim = [tous[0], ...qt, tous[tous.length - 1]];
        SC.forEach((c, k) => { const x = 40 + k * 103; corps += `<rect x="${x}" y="716" width="12" height="12" rx="2" fill="${c}"/><text x="${x + 17}" y="726" font-family="Work Sans" font-size="9.5" fill="${GRIS}">${nf(lim[k], E.I.d)} à ${nf(lim[k + 1], E.I.d)} ${E.I.u}</text>`; });
        corps += `<text x="40" y="746" font-family="Work Sans" font-size="9.5" fill="${GRIS}">Gris : moins de 10 communes suivies. Échelle commune aux années ${E.I.debut || 2018} à 2025.</text>`;
      } else {
        const haut = paires.slice(0, 10), bas = paires.slice(-10).reverse(), mx = paires[0][1];
        const col = (liste, x, lab, coul) => { let o = `<text x="${x}" y="300" font-family="Work Sans" font-weight="800" font-size="12" fill="${BLEU}">${lab}</text>`;
          liste.forEach(([n, val], i) => { const y = 322 + i * 38, w = Math.max(4, val / mx * 170);
            o += `<text x="${x}" y="${y}" font-family="Work Sans" font-size="11.5" fill="${BLEU}">${i + 1}. ${esc(n)}</text><rect class="at-c" style="--k:${i}" x="${x}" y="${y + 6}" width="${w.toFixed(1)}" height="10" rx="3" fill="${coul}"/><text x="${x + w + 6}" y="${y + 15}" font-family="Work Sans" font-weight="800" font-size="10.5" fill="${BLEU}">${nf(val, E.I.d)}</text>`; });
          return o; };
        corps += col(haut, 40, "Les 10 plus élevés", TERRA) + col(bas, 310, "Les 10 plus bas", SAUGE);
      }
    }
    const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const logo = document.querySelector(".pl-brand svg").innerHTML;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${fontesCss ? `<style>${fontesCss}</style>` : ""}
<rect width="${W}" height="${H}" fill="#FFFFFF"/><rect width="${W}" height="78" fill="${BLEU}"/>
<svg x="36" y="18" width="84" height="43" viewBox="${document.querySelector(".pl-brand svg").getAttribute("viewBox")}" preserveAspectRatio="xMinYMid meet">${logo}</svg>
<text x="128" y="37" font-family="Montserrat" font-weight="800" font-size="11" fill="${CREME}">Ma Petite</text><text x="128" y="51" font-family="Montserrat" font-weight="800" font-size="11" fill="${CREME}">Commune</text>
<text x="${W - 36}" y="44" text-anchor="end" font-family="Work Sans" font-weight="700" font-size="10" fill="${SAFRAN}">Les finances locales, en clair</text>
<text x="40" y="120" font-family="Work Sans" font-weight="800" font-size="10.5" letter-spacing="1.6" fill="${TERRA_T}">${esc(FORME[E.forme].toUpperCase())}</text>
<text x="40" y="152" font-family="Besley" font-weight="600" font-size="25" fill="${BLEU}">${esc(titre)}</text>
<text x="40" y="176" font-family="Work Sans" font-size="11.5" fill="${GRIS}">${esc(sous)}</text>
<text x="40" y="194" font-family="Work Sans" font-style="italic" font-size="10.5" fill="${GRIS}">${esc(I.def)}</text>
${corps}
<path d="M40 778H555" stroke="${BLEU}" stroke-opacity=".15"/>
<text x="40" y="796" font-family="Work Sans" font-size="9" fill="${GRIS}">Source : DGFiP, comptes individuels des communes (budget principal) ; calculs Ma Petite Commune, d'après les données d'Observer.</text>
<text x="40" y="810" font-family="Work Sans" font-size="9" fill="${GRIS}">${E.ref === "moy" ? "Moyennes simples" : "Médianes"} des communes de 200 à 3 500 hab. suivies par Observer. Départements de moins de 10 communes non représentés.</text>
<text x="40" y="826" font-family="Work Sans" font-weight="700" font-size="9" fill="${BLEU}">commentseportentlesfinancesdemapetitecommune.com · téléchargé le ${esc(date)}</text>
</svg>`;
  }

  /* ---------- Aperçu animé ---------- */
  function apercu() {
    const E = etat();
    const carto = E.forme === "carte" || E.forme === "classement";
    $("at-per").disabled = carto; $("at-de").disabled = carto; $("at-com").disabled = carto;
    $("at-strate").disabled = carto ? false : E.per === "com"; document.querySelector(".at-strate-l").classList.toggle("at-off", !carto && E.per === "com");
    document.querySelector(".at-per-l").classList.toggle("at-off", carto); document.querySelector(".at-de-l").classList.toggle("at-off", carto);
    $("at-a-lab").textContent = carto ? "Année" : "à";
    const deb = E.I.debut || 2018; [$("at-de"), $("at-a")].forEach(s => { [...s.options].forEach(o => { o.disabled = +o.value < deb; }); if (+s.value < deb) s.value = String(s === $("at-de") ? deb : 2025); });
    $("at-msg").textContent = deb > 2018 ? "Ce poste est disponible de " + deb + " à 2025." : ($("at-msg").textContent.startsWith("Ce poste") ? "" : $("at-msg").textContent);
    const f = $("at-feuille");
    f.innerHTML = page(E);
    f.classList.remove("joue"); void f.offsetWidth; if (!calme) f.classList.add("joue");
    $("at-nom").textContent = nomFichier(E);
  }
  const slug = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const nomFichier = E => { const carto = E.forme === "carte" || E.forme === "classement";
    return ["mpc", E.ind, E.forme, E.ref === "moy" ? "moyenne" : "", carto ? "departements-" + E.b : (E.per === "fr" ? "france" : E.per === "com" && COM ? slug(COM.n) + "-" + COM.c : C.geo[+E.per].c) + "-" + E.a + "-" + E.b, !carto && E.per === "com" ? "" : E.st === "all" ? "" : "strate" + E.st].filter(Boolean).join("-"); };

  /* ---------- Exports ---------- */
  let fontes = null;
  async function fontesCss() {
    if (fontes) return fontes;
    const b64 = async u => { const r = await fetch(u); const b = new Uint8Array(await r.arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
    const F = [["Besley", "normal", "400 900", "fonts/besley-latin-wght-normal.woff2"], ["Besley", "italic", "400 900", "fonts/besley-latin-wght-italic.woff2"], ["Work Sans", "normal", "100 900", "fonts/work-sans-latin-wght-normal.woff2"], ["Montserrat", "normal", "800", "fonts/montserrat-latin-800-normal.woff2"]];
    const parts = await Promise.all(F.map(async ([f, st, w, u]) => `@font-face{font-family:'${f}';font-style:${st};font-weight:${w};src:url(data:font/woff2;base64,${await b64(u)}) format('woff2')}`));
    return (fontes = parts.join(""));
  }
  const telecharger = (blob, nom) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
  async function canvasDe(svg, echelle) {
    const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.src = url; await img.decode(); await new Promise(r => setTimeout(r, 120));
    const c = document.createElement("canvas"); c.width = Math.round(595 * echelle); c.height = Math.round(842 * echelle);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return c;
  }
  // PDF minimal : une page A4 contenant l'image JPEG de la page (aucune bibliothèque extérieure)
  function pdfDe(jpeg, w, h, titre) {
    const enc = new TextEncoder(), morceaux = [], offs = []; let pos = 0;
    const ajoute = x => { const b = typeof x === "string" ? enc.encode(x) : x; morceaux.push(b); pos += b.length; };
    const objet = (n, corps) => { offs[n] = pos; ajoute(`${n} 0 obj\n`); corps(); ajoute("\nendobj\n"); };
    const hex = s => "<FEFF" + [...s].map(c => c.charCodeAt(0).toString(16).padStart(4, "0")).join("").toUpperCase() + ">";
    ajoute("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    objet(1, () => ajoute("<< /Type /Catalog /Pages 2 0 R >>"));
    objet(2, () => ajoute("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
    objet(3, () => ajoute("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>"));
    objet(4, () => { ajoute(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); ajoute(jpeg); ajoute("\nendstream"); });
    const cont = "q 595.28 0 0 841.89 0 0 cm /Im0 Do Q";
    objet(5, () => ajoute(`<< /Length ${cont.length} >>\nstream\n${cont}\nendstream`));
    objet(6, () => ajoute(`<< /Title ${hex(titre)} /Author ${hex("Ma Petite Commune")} /Producer ${hex("commentseportentlesfinancesdemapetitecommune.com")} >>`));
    const xref = pos;
    ajoute(`xref\n0 7\n0000000000 65535 f \n` + [1, 2, 3, 4, 5, 6].map(n => String(offs[n]).padStart(10, "0") + " 00000 n \n").join(""));
    ajoute(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(morceaux, { type: "application/pdf" });
  }
  function csvDe(E) {
    const I = E.I, l = [];
    if (E.forme === "carte" || E.forme === "classement") { l.push(["code", "departement", I.t + " (" + I.u + ", " + refMot(E) + " des communes)", "annee", "strate"]); const v = DEPV(E)[E.st][E.b - 2018]; C.geo.forEach((g, k) => l.push([g.c, g.n, v[k] == null ? "" : String(v[k]).replace(".", ","), E.b, STRATE[E.st]])); }
    else if (E.per === "com" && COM) { const m = mediane(E); l.push(["annee", "commune", "code_insee", I.t + " (" + I.u + ")", refMot(E) + " des " + STRATE[E.st] + " (France)"]);
      serie(E).forEach((v, i) => l.push([E.a + i, COM.n, COM.c, v == null ? "" : String(v).replace(".", ","), m[i] == null ? "" : String(m[i]).replace(".", ",")])); }
    else { l.push(["annee", "perimetre", I.t + " (" + I.u + ", " + refMot(E) + " des communes)", "strate"]); serie(E).forEach((v, i) => l.push([E.a + i, perNom(E), v == null ? "" : String(v).replace(".", ","), STRATE[E.st]])); }
    l.push([]); l.push(["Source : DGFiP, comptes individuels des communes ; calculs Ma Petite Commune (" + (E.ref === "moy" ? "moyennes simples" : "médianes") + ")."]);
    return new Blob(["﻿" + l.map(r => r.map(c => /[;"\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  }
  async function exporter(fmt, bouton) {
    const E = etat(), nom = nomFichier(E);
    bouton.classList.add("encours"); bouton.disabled = true;
    try {
      if (fmt === "csv") telecharger(csvDe(E), nom + ".csv");
      else {
        const svg = page(E, await fontesCss());
        if (fmt === "svg") telecharger(new Blob([svg], { type: "image/svg+xml" }), nom + ".svg");
        else {
          const c = await canvasDe(svg, fmt === "pdf" ? 2.78 : 2.5);
          if (fmt === "png") telecharger(await new Promise(r => c.toBlob(r, "image/png")), nom + ".png");
          else { const j = await new Promise(r => c.toBlob(r, "image/jpeg", 0.92)); telecharger(pdfDe(new Uint8Array(await j.arrayBuffer()), c.width, c.height, E.I.t + " · Ma Petite Commune"), nom + ".pdf"); }
        }
      }
      bouton.classList.add("fait"); setTimeout(() => bouton.classList.remove("fait"), 1600);
    } catch (e) { $("at-msg").textContent = "Le téléchargement n'a pas pu se faire dans ce navigateur. Essayez le format CSV ou SVG."; }
    bouton.classList.remove("encours"); bouton.disabled = false;
  }

  /* ---------- Choix d'une commune ---------- */
  let LISTE = null;
  const norm = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[-'’]/g, " ").replace(/\s+/g, " ").trim();
  async function liste() { if (LISTE) return LISTE; const j = await (await fetch("communes.json")).json();
    const code = Object.fromEntries(C.geo.map(g => [g.n, g.c]));
    return (LISTE = j.c.map(r => ({ n: r[0], c: r[1], dn: j.d[r[2]], dc: code[j.d[r[2]]], p: r[3], k: norm(r[0]) }))); }
  async function choisir(c) {
    $("at-com").value = c.n; $("at-com-l").hidden = true; $("at-com").setAttribute("aria-expanded", "false");
    try { if (!DEP[c.dc]) DEP[c.dc] = await (await fetch("donnees-communes/" + c.dc + ".json")).json();
      const r = DEP[c.dc].c[c.c]; if (!r) { $("at-msg").textContent = "Pas de comptes pour cette commune."; return; }
      COM = Object.assign({}, c, { s: r[0], v: r.slice(1), ind: DEP[c.dc].ind, depuis: DEP[c.dc].nouveaux_depuis || 2022 });
      let o = $("at-per").querySelector('option[value="com"]'); if (!o) { o = new Option("", "com"); $("at-per").insertBefore(o, $("at-per").options[1]); }
      o.textContent = c.n + " (" + c.dn + ")"; $("at-per").value = "com"; $("at-msg").textContent = ""; $("at-com-x").hidden = false;
      if ($("at-forme").value === "carte" || $("at-forme").value === "classement") $("at-forme").value = "courbe";
      apercu();
    } catch (e) { $("at-msg").textContent = "Les données de cette commune n'ont pas pu être chargées."; }
  }
  function brancherCommune() {
    const q = $("at-com"), L = $("at-com-l"); let hits = [], cur = -1;
    q.addEventListener("focus", () => liste().catch(() => {}));
    q.addEventListener("input", async () => { const v = norm(q.value); const all = await liste();
      if (v.length < 2) { L.hidden = true; return; }
      hits = /^\d/.test(v) ? all.filter(c => c.c.startsWith(v.toUpperCase())).slice(0, 7) : all.filter(c => c.k.startsWith(v)).slice(0, 7);
      if (hits.length < 7 && v.length > 2) hits = hits.concat(all.filter(c => !c.k.startsWith(v) && c.k.includes(v)).slice(0, 7 - hits.length));
      cur = -1; L.innerHTML = hits.length ? hits.map((c, i) => `<li role="option" id="atc-${i}" data-i="${i}"><b>${esc(c.n)}</b><span>${esc(c.dn)} · ${nf(c.p)} hab.</span></li>`).join("") : '<li class="none">Aucune commune de 200 à 3 500 habitants à ce nom.</li>';
      L.hidden = false; q.setAttribute("aria-expanded", "true"); });
    q.addEventListener("keydown", e => { if (L.hidden || !hits.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); cur = (cur + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length; [...L.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === cur))); q.setAttribute("aria-activedescendant", "atc-" + cur); }
      else if (e.key === "Enter") { e.preventDefault(); choisir(hits[Math.max(cur, 0)]); } else if (e.key === "Escape") L.hidden = true; });
    L.addEventListener("pointerdown", e => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); choisir(hits[+li.dataset.i]); } });
    q.addEventListener("blur", () => setTimeout(() => L.hidden = true, 150));
    $("at-com-x").addEventListener("click", () => { COM = null; q.value = ""; $("at-com-x").hidden = true; const o = $("at-per").querySelector('option[value="com"]'); if (o) o.remove(); $("at-per").value = "fr"; apercu(); });
    // la commune suivie ailleurs sur le site est proposée d'office
    try { const n = localStorage.getItem("pellucid-commune"); if (n) q.placeholder = "Ex. : " + n; } catch (e) {}
  }

  /* ---------- Mise en route ---------- */
  fetch("carte-departements.json").then(r => r.json()).then(d => {
    C = d;
    // liste des indicateurs : les cinq historiques, puis les postes d'Anatomie par groupe
    const choix = $("at-ind").value, grp = {}; Object.entries(IND).forEach(([k, i]) => { if (i.g) (grp[i.g] = grp[i.g] || []).push(k); });
    $("at-ind").innerHTML = `<optgroup label="Indicateurs clés (2018 à 2025)">${["teb", "dh", "eq", "fit", "cap"].map(k => `<option value="${k}">${esc(IND[k].t)}</option>`).join("")}</optgroup>`
      + ANAT.map(([g]) => `<optgroup label="${esc(g)} (2022 à 2025)">${grp[g].filter(k => k !== "eq").map(k => `<option value="${k}">${esc(IND[k].t)}</option>`).join("")}</optgroup>`).join("");
    $("at-ind").value = choix;
    $("at-per").insertAdjacentHTML("beforeend", C.geo.map((g, k) => [g.n, k, g.c]).sort((p, q) => p[0].localeCompare(q[0], "fr")).map(([n, k, c]) => `<option value="${k}">${esc(n)} (${c})</option>`).join(""));
    sels.forEach(s => s.addEventListener("change", apercu)); brancherCommune();
    zone.querySelectorAll("[data-fmt]").forEach(b => b.addEventListener("click", () => exporter(b.dataset.fmt, b)));
    // la feuille ne se construit qu'à l'arrivée de la section, pour qu'on voie l'animation
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); apercu(); } }, { threshold: 0.25 });
    io.observe($("at-feuille"));
  }).catch(() => { $("at-msg").textContent = "Les données n'ont pas pu être chargées."; });
})();
