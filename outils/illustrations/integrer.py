"""Insère les illustrations dans les pages du site. À lancer sur des fichiers d'origine (git checkout avant)."""
import re, sys
sys.path.insert(0, "/home/claude/illus")
import dessins as D

SITE = "/home/claude/ma-petite-commune/"

def rw(name, fn):
    p = SITE + name
    s = open(p, encoding="utf-8").read()
    t = fn(s)
    assert t != s, f"aucun changement dans {name}"
    open(p, "w", encoding="utf-8").write(t)
    print("ok", name)

def once(s, old, new):
    assert s.count(old) == 1, (old[:60], s.count(old))
    return s.replace(old, new)

# ---------- Accueil ----------
CSS_INDEX = """<style id="illus-css">
.mark-big.illus-wrap svg.illus-hero{width:min(520px,100%);height:auto}
.rub-ill{display:block;margin:-4px 0 2px}
.rub-ill svg{width:120px;height:auto;display:block}
@media (max-width:820px){.hero.hero{grid-template-areas:"txt" "mark" "profil"}.mark-big.illus-wrap{order:0;justify-content:center}.mark-big.illus-wrap svg.illus-hero{width:min(340px,100%)}}
</style>
</head>"""

def index(s):
    s, n = re.subn(r'<div class="mark-big">\s*<svg viewBox="-4 -680.*?</svg>\s*</div>',
                   '<div class="mark-big illus-wrap">' + D.HERO + '</div>', s, count=1, flags=re.S)
    assert n == 1
    for href, art in (("s-informer.html", D.RUB_INFORMER), ("apprendre.html", D.RUB_APPRENDRE), ("observer.html", D.RUB_OBSERVER)):
        s = once(s, f'<a class="rub" href="{href}">', f'<a class="rub" href="{href}"><span class="rub-ill">{art}</span>')
    return once(s, "</head>", CSS_INDEX)

# ---------- S'informer : vignettes des cartes ----------
def informer(s):
    for k, art in D.VIG.items():
        s, n = re.subn(rf'(<a class="card-a" href="{k}\.html"[^>]*>)', lambda m: m.group(1) + f'<span class="vig">{art}</span>', s, count=1)
        assert n == 1, k
    return s

# ---------- Articles : vignette en tête ----------
def article(k):
    def f(s):
        return once(s, '<div class="kicker">', f'<div class="art-vig">{D.VIG[k]}</div>\n  <div class="kicker">')
    return f

CSS_ARTICLE = """
/* Illustrations (2026-11-13) */
.card-a .vig{display:block;margin:-2px 0 4px}
.card-a .vig svg{display:block;width:100%;max-width:220px;height:auto}
.art .art-vig svg{display:block;width:min(260px,70%);height:auto}
"""

# ---------- Observer : bandeau ----------
CSS_OBS = """<style id="illus-css">
.obs-banner{margin:6px 0 14px}
.obs-banner svg{display:block;width:100%;max-width:1000px;height:auto}
</style>
</head>"""

def observer(s):
    s = once(s, "<h1>Communes en mouvement</h1>", '<h1>Communes en mouvement</h1>\n  <div class="obs-banner">' + D.OBS_BANNER + "</div>")
    return once(s, "</head>", CSS_OBS)

rw("index.html", index)
rw("s-informer.html", informer)
for k in D.VIG:
    rw(k + ".html", article(k))
rw("observer.html", observer)
p = SITE + "article.css"
open(p, "a", encoding="utf-8").write(CSS_ARTICLE)
print("ok article.css")
