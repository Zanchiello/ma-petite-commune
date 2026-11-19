/* Ma Petite Commune — effets communs repris de l'accueil :
   haut de page qui arrive au chargement, blocs en cascade à l'arrivée, barres et schémas qui se construisent,
   chiffres qui défilent, gras dynamique sous la souris. Chaque animation d'arrivée ne se joue qu'une fois. */
(() => {
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  // L'accueil a ses propres effets ; les outils interactifs restent sobres (seuls les boutons réagissent, via le CSS).
  if (["", "index.html", "observer.html", "vases-communicants.html", "le-fil.html"].includes(page)) return;
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const survol = matchMedia("(hover:hover) and (pointer:fine)").matches;
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const main = document.querySelector("main, .art") || document.body;

  /* ---------- Gras dynamique (textes courts seulement : chapeaux, « L'essentiel », encadrés, cartes) ---------- */
  if (survol && !calme) {
    $$(".pl-lede, .chapo, .essentiel li, .box p, .status-box p, .card-a p, .module .body > p, .prod > p, .g-def, .split li, .steps li > span, .module li span", main).forEach(p => {
      const walk = n => {
        if (n.nodeType === 3) {
          const f = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) f.append(t); else { const s = document.createElement("span"); s.className = "mpc-gm"; s.textContent = t; f.append(s); } });
          n.replaceWith(f);
        } else if (n.nodeType === 1 && !["A", "ABBR", "SUP", "SVG", "BUTTON"].includes(n.tagName.toUpperCase())) [...n.childNodes].forEach(walk);
      };
      [...p.childNodes].forEach(walk);
      const mots = $$(".mpc-gm", p); let raf = 0, mx = 0, my = 0;
      const maj = () => { raf = 0; for (const m of mots) { const r = m.getBoundingClientRect(); const d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2)); m.style.setProperty("--g", Math.max(0, 1 - d / 110).toFixed(2)); } };
      p.addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(maj); });
      p.addEventListener("pointerleave", () => { cancelAnimationFrame(raf); raf = 0; mots.forEach(m => m.style.setProperty("--g", 0)); });
    });
  }

  /* ---------- Survol : cartes, encadrés, lignes de tableau ---------- */
  $$(".card-a, .module, .prod, .otiles > div, .compare > div, .split > div, .steps > li").forEach(el => el.classList.add("mpc-c"));
  $$(".box, .essentiel, .status-box, .g-term, figure").forEach(el => el.classList.add("mpc-e"));
  $$("table tbody tr").forEach(el => el.classList.add("mpc-l"));

  if (calme || !("IntersectionObserver" in window)) return;

  /* ---------- Haut de page : arrive au chargement ---------- */
  $$(".pl-main > header > *, .art > .crumb, .art > .art-vig, .art > .kicker, .art > h1, .art > .chapo, .art > .meta").forEach((el, i) => { el.style.setProperty("--mpc-i", i); el.classList.add("mpc-h"); });

  /* ---------- Arrivée en cascade et éléments qui se construisent ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; io.unobserve(el);
    requestAnimationFrame(() => el.classList.add("mpc-vu"));
    if (el._compte) el._compte();
    if (el._svgs) el._svgs.forEach(v => requestAnimationFrame(() => v.classList.add("mpc-vu")));
    setTimeout(() => el.classList.add("mpc-fini"), 1600);
  }), { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  const deja = el => el.getBoundingClientRect().top < innerHeight * 0.92;   // déjà visible au chargement : on n'y touche pas
  const suivre = (el, cls) => { if (deja(el)) return false; el.classList.add(cls); io.observe(el); return true; };

  // Cartes et blocs : en cascade, frère après frère
  const groupes = new Map();
  $$(".card-a, .module, .prod, .g-term, .box, .essentiel, .status-box, figure, .steps > li, .otiles > div, .compare > div", main).forEach(el => {
    const k = el.parentNode; if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(el);
  });
  groupes.forEach(liste => { let i = 0; liste.forEach(el => { if (suivre(el, "mpc-a")) el.style.setProperty("--mpc-i", Math.min(i++, 6)); }); });

  // Barres horizontales : elles se remplissent
  const barres = new Map();
  $$(".hb", main).forEach(hb => { const k = hb.parentNode; if (!barres.has(k)) barres.set(k, []); barres.get(k).push(hb); });
  barres.forEach((liste, k) => { if (k.classList.contains("mpc-g")) return; liste.forEach((hb, i) => hb.style.setProperty("--mpc-i", i)); suivre(k, "mpc-g"); });

  // Schémas en SVG des articles : dévoilement de gauche à droite (hors vignettes de tête et cartes)
  $$("figure svg, .art .scroll > svg", main).forEach(svg => {
    const t = svg.closest("figure") || svg.parentNode;
    if (deja(t)) return;
    svg.classList.add("mpc-r"); (t._svgs = t._svgs || []).push(svg);
    if (!t.classList.contains("mpc-a")) io.observe(t);
  });

  // Calcul pas à pas
  $$(".eq", main).forEach(eq => { [...eq.children].forEach((c, i) => c.style.setProperty("--mpc-i", i)); suivre(eq, "mpc-eq"); });

  /* Filet de sécurité : tout ce qui est passé à l'écran finit visible, même si l'observateur n'a rien vu */
  let filet = 0;
  addEventListener("scroll", () => { clearTimeout(filet); filet = setTimeout(() => {
    $$(".mpc-a:not(.mpc-vu), .mpc-r:not(.mpc-vu), .mpc-g:not(.mpc-vu), .mpc-eq:not(.mpc-vu)").forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight * 0.95) { el.classList.add("mpc-vu"); if (el._compte) el._compte(); if (el._svgs) el._svgs.forEach(v => v.classList.add("mpc-vu")); }
    }); }, 250); }, { passive: true });

  /* ---------- Chiffres qui défilent jusqu'à leur valeur ---------- */
  const NB = /\d{1,3}(?:[   ]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
  const ecrire = (txt, v, dec, grp) => { let s = v.toFixed(dec).replace(".", ","); if (grp) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, grp); return s; };
  $$(".essentiel strong, .otiles b, .compare b, .card-a .fig, .price, .hb .v", main).forEach(el => {
    if (el.children.length || el.textContent.length > 40) return;
    const orig = el.textContent; const toks = [...orig.matchAll(NB)];
    if (!toks.length) return;
    const parts = toks.map(m => { const t = m[0]; const grp = (t.match(/[   ]/) || [""])[0]; const dec = (t.split(",")[1] || "").length; return { t, v: parseFloat(t.replace(/[   ]/g, "").replace(",", ".")), dec, grp, i: m.index }; });
    if (parts.some(p => p.v >= 1900 && p.v <= 2100 && !p.grp && !p.dec)) return;       // une année ne défile pas
    const cible = el.closest(".essentiel, .otiles, .compare, .card-a, .prod, .hb, figure") || el;
    const rendu = q => { let out = "", last = 0; parts.forEach(p => { out += orig.slice(last, p.i) + ecrire(p.t, p.v * q, p.dec, p.grp); last = p.i + p.t.length; }); return out + orig.slice(last); };
    const lancer = () => { const t0 = performance.now(); el.setAttribute("aria-label", orig);
      const pas = t => { const q = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - q, 3); el.textContent = q < 1 ? rendu(e) : orig; if (q < 1) requestAnimationFrame(pas); else el.removeAttribute("aria-label"); };
      requestAnimationFrame(pas); };
    if (deja(cible)) return;
    el.textContent = rendu(0);
    const prev = cible._compte; cible._compte = () => { if (prev) prev(); setTimeout(lancer, 150); };
    if (!cible.classList.contains("mpc-a") && !cible.classList.contains("mpc-g")) io.observe(cible);
  });
})();
