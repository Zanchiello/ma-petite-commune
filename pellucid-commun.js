/* Ma Petite Commune — éléments communs à toutes les pages :
   - le glossaire toujours à portée de main (rond flottant, déplaçable, qui ouvre un panneau de recherche) ;
   - l'encart sur la fraîcheur des données (pages d'actualité, Observer, accueil). */
(function () {
  "use strict";
  const MAJ = {
    donnees: "Comptes des communes : exercice 2025 (OFGL)",
    textes: "Textes du PLF 2027 : à jour au 3 novembre 2026",
  };
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const css = `
  .plg-fab{position:fixed;z-index:60;width:52px;height:52px;border-radius:50%;border:1px solid var(--pl-line,#d6dbd5);
    background:color-mix(in srgb,var(--pl-panel,#fbfcfa) 88%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    box-shadow:0 6px 18px rgba(0,0,0,.16),inset 0 0 0 5px color-mix(in srgb,var(--pl-ink,#121614) 6%,transparent);
    color:var(--pl-ink,#121614);display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;
    font:700 15px/1 var(--pl-display,system-ui);letter-spacing:.02em;user-select:none;-webkit-user-select:none}
  .plg-fab:focus-visible{outline:2px solid var(--pl-accent,#2160c8);outline-offset:3px}
  .plg-fab span{pointer-events:none}
  .plg-panel{position:fixed;z-index:61;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));
    width:min(420px,calc(100vw - 24px));max-height:min(70vh,560px);display:flex;flex-direction:column;
    background:var(--pl-panel,#fbfcfa);color:var(--pl-ink,#121614);border:1px solid var(--pl-line,#d6dbd5);border-radius:12px;
    box-shadow:0 18px 50px rgba(0,0,0,.25);font:15px/1.5 var(--pl-body,system-ui)}
  .plg-head{display:flex;align-items:center;gap:8px;padding:12px 12px 8px}
  .plg-head b{font-family:var(--pl-display,system-ui);font-stretch:80%;font-size:19px;flex:1}
  .plg-head a{color:var(--pl-accent,#2160c8);font-size:13.5px;font-weight:700;text-decoration:none}
  .plg-x{border:0;background:transparent;color:inherit;font-size:22px;line-height:1;padding:2px 8px;cursor:pointer;border-radius:6px}
  .plg-x:focus-visible,.plg-panel input:focus-visible{outline:2px solid var(--pl-accent,#2160c8);outline-offset:2px}
  .plg-panel input{margin:0 12px 8px;font:16px var(--pl-body,system-ui);color:inherit;background:var(--pl-bg,#f1f3f0);
    border:1px solid var(--pl-line,#d6dbd5);border-radius:8px;padding:9px 11px}
  .plg-list{overflow:auto;padding:0 12px 12px;display:flex;flex-direction:column;gap:2px;min-height:0}
  .plg-it{border-top:1px solid var(--pl-line,#d6dbd5);padding:9px 0}
  .plg-it h4{margin:0 0 3px;font-size:15.5px}
  .plg-it h4 small{font:500 12.5px var(--pl-mono,monospace);color:var(--pl-ink-2,#59615c);margin-left:6px}
  .plg-it p{margin:0;font-size:14px;color:var(--pl-ink-2,#59615c)}
  .plg-it code{font:500 12.5px var(--pl-mono,monospace)}
  .plg-it a{color:var(--pl-accent,#2160c8);font-size:13px;font-weight:700;text-decoration:none}
  .plg-empty{color:var(--pl-ink-2,#59615c);font-size:14px;padding:6px 0}
  .pl-maj{background:var(--pl-accent-soft,#dce6f6);color:var(--pl-ink,#121614);font:13.5px/1.4 var(--pl-body,system-ui)}
  .pl-maj div{max-width:1400px;margin:0 auto;padding-block:6px;padding-left:max(16px,env(safe-area-inset-left,0px));
    padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-wrap:wrap;gap:2px 14px;align-items:center}
  .pl-maj b{font-weight:700}
  .pl-maj a{color:var(--pl-accent,#2160c8);font-weight:700;text-decoration:none;margin-left:auto}
  @media print{.plg-fab,.plg-panel,.pl-maj{display:none!important}}
  @media (prefers-reduced-motion:no-preference){.plg-panel{animation:plg-in .16s ease-out}@keyframes plg-in{from{opacity:0;transform:translateY(8px)}}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- Menu repliable sur téléphone ---------- */
  document.documentElement.classList.add("pl-js");
  (function () {
    const nav = document.querySelector(".pl-nav"), inner = nav && nav.querySelector(".pl-nav-in"), links = nav && nav.querySelector(".pl-links");
    if (!inner || !links || inner.querySelector(".pl-menu")) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "pl-menu";
    b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", links.id || "pl-links");
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menu</span>';
    inner.insertBefore(b, links);
    b.addEventListener("click", () => { const on = !nav.classList.contains("open"); nav.classList.toggle("open", on); b.setAttribute("aria-expanded", String(on)); b.querySelector("span").textContent = on ? "Fermer" : "Menu"; });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("open")) { b.click(); b.focus(); } });
  })();

  /* ---------- Encart sur la fraîcheur des données ---------- */
  const MAJ_PAGES = /^(index\.html|observer\.html|observer-fragilite\.html|s-informer\.html|plf27-[a-z-]+\.html)$/;
  if (MAJ_PAGES.test(page)) {
    const band = document.createElement("div"); band.className = "pl-maj"; band.setAttribute("role", "note");
    const textes = page === "observer.html" || page === "observer-fragilite.html" ? "" : `<span>${MAJ.textes}</span>`;
    band.innerHTML = `<div><b>Mise à jour des données</b><span>${MAJ.donnees}</span>${textes}<a href="credits.html">Sources et dates →</a></div>`;
    const nav = document.querySelector(".pl-nav");
    if (nav) nav.after(band); else document.body.prepend(band);
  }

  /* ---------- Glossaire flottant ---------- */
  if (/^(glossaire\.html|vases-communicants\.html)$/.test(page)) return;
  const fab = document.createElement("button");
  fab.type = "button"; fab.className = "plg-fab"; fab.setAttribute("aria-haspopup", "dialog");
  fab.setAttribute("aria-label", "Ouvrir le glossaire des finances locales"); fab.title = "Glossaire";
  fab.innerHTML = '<span aria-hidden="true">A–Z</span>';
  document.body.appendChild(fab);

  const SIZE = 52, M = 12;
  const insets = () => { const bar = document.body.classList.contains("pd-on") ? 76 : 0; return bar; };
  let pos = null;
  try { pos = JSON.parse(store.get("pellucid-glossaire-pos") || "null"); } catch (e) { pos = null; }
  function place() {
    const W = document.documentElement.clientWidth, H = window.innerHeight;
    let x = pos ? pos.x * W : W - SIZE - M - 4, y = pos ? pos.y * H : H - SIZE - M - 4 - insets();
    x = Math.min(Math.max(M, x), W - SIZE - M); y = Math.min(Math.max(M + 40, y), H - SIZE - M - insets());
    fab.style.left = x + "px"; fab.style.top = y + "px";
  }
  place(); addEventListener("resize", place);
  new MutationObserver(place).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  let drag = null;
  fab.addEventListener("pointerdown", e => {
    fab.setPointerCapture(e.pointerId);
    const r = fab.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
    fab.style.cursor = "grabbing";
  });
  fab.addEventListener("pointermove", e => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
    if (!drag.moved) return;
    const W = document.documentElement.clientWidth, H = window.innerHeight;
    pos = { x: (e.clientX - drag.dx) / W, y: (e.clientY - drag.dy) / H }; place();
  });
  fab.addEventListener("pointerup", () => {
    const moved = drag && drag.moved; drag = null; fab.style.cursor = "grab";
    if (moved) {      // comme l'ancien bouton de l'iPhone, le rond se range contre le bord le plus proche
      const W = document.documentElement.clientWidth, r = fab.getBoundingClientRect();
      pos = { x: (r.left + SIZE / 2 < W / 2 ? M : W - SIZE - M) / W, y: r.top / window.innerHeight }; place();
      store.set("pellucid-glossaire-pos", JSON.stringify(pos));
    } else open();
  });
  fab.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });

  let panel = null, data = null;
  async function load() {
    if (data) return data;
    const r = await fetch("glossaire.json"); data = await r.json(); return data;
  }
  function render(q) {
    const list = panel.querySelector(".plg-list"), v = norm(q).trim();
    if (!data) { list.innerHTML = '<p class="plg-empty">Chargement…</p>'; return; }
    const hits = data.filter(t => !v || norm(t.t + " " + t.a).includes(v) || (v.length > 3 && norm(t.d).includes(v)));
    hits.sort((a, b) => (norm(a.t + " " + a.a).includes(v) ? 0 : 1) - (norm(b.t + " " + b.a).includes(v) ? 0 : 1));
    if (!hits.length) { list.innerHTML = '<p class="plg-empty">Aucun terme. Essayez un sigle : DGF, CAF, FCTVA.</p>'; return; }
    list.innerHTML = hits.slice(0, v ? 30 : 12).map(t => `<article class="plg-it"><h4>${esc(t.t)}${t.a ? `<small>${esc(t.a)}</small>` : ""}</h4>
      <p>${esc(t.d)}</p>${t.f ? `<p><code>${esc(t.f)}</code></p>` : ""}<a href="glossaire.html#${t.i}">Dans le glossaire →</a></article>`).join("")
      + (v ? "" : '<p class="plg-empty">Tapez un mot pour chercher parmi les ' + data.length + " définitions.</p>");
  }
  async function open() {
    if (panel) { panel.querySelector("input").focus(); return; }
    panel = document.createElement("div"); panel.className = "plg-panel"; panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Glossaire des finances locales");
    panel.innerHTML = `<div class="plg-head"><b>Glossaire</b><a href="glossaire.html">Tout le glossaire</a>
      <button type="button" class="plg-x" aria-label="Fermer le glossaire">×</button></div>
      <input type="search" id="plg-q" placeholder="Un mot ou un sigle : DGF, épargne…" autocomplete="off" aria-label="Chercher dans le glossaire">
      <div class="plg-list" aria-live="polite"></div>`;
    document.body.appendChild(panel); fab.hidden = true;
    const input = panel.querySelector("input"); input.focus();
    input.addEventListener("input", () => render(input.value));
    panel.querySelector(".plg-x").onclick = close;
    panel.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    render(""); try { await load(); render(input.value); } catch (e) { panel.querySelector(".plg-list").innerHTML = '<p class="plg-empty">Le glossaire n’a pas pu être chargé. <a href="glossaire.html">Ouvrir la page du glossaire</a>.</p>'; }
  }
  function close() { if (!panel) return; panel.remove(); panel = null; fab.hidden = false; fab.focus(); }
})();
