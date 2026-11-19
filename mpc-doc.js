/* Pages de contenu : sommaire actif, barre de lecture, apparitions et compteurs */
(() => {
  const art = document.querySelector(".art.dk"); if (!art) return;
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sobre = art.classList.contains("dk-sobre");
  // barre de lecture
  const prog = document.createElement("div"); prog.className = "dk-prog"; prog.setAttribute("aria-hidden", "true"); document.body.appendChild(prog);
  const maj = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.setProperty("--p", h > 0 ? Math.min(1, scrollY / h).toFixed(4) : 0); };
  addEventListener("scroll", maj, { passive: true }); maj();
  // sommaire actif
  const liens = [...art.querySelectorAll(".dk-toc a")];
  const titres = liens.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const actif = () => { let k = 0; titres.forEach((t, i) => { if (t.getBoundingClientRect().top < innerHeight * .3) k = i; }); liens.forEach((a, i) => a.classList.toggle("on", i === k)); };
  addEventListener("scroll", actif, { passive: true }); actif();
  // compteurs
  const compte = el => { const orig = el.textContent, m = orig.match(/\d+(?:[   ]\d{3})*(?:,\d+)?/); if (!m || calme) return;
    const t = m[0], dec = (t.split(",")[1] || "").length, v = parseFloat(t.replace(/[\s  ]/g, "").replace(",", ".")), t0 = performance.now();
    const pas = now => { const q = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - q, 3); el.textContent = q < 1 ? orig.replace(t, (v * e).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })) : orig; if (q < 1) requestAnimationFrame(pas); };
    requestAnimationFrame(pas); };
  // apparitions
  const cibles = sobre ? [] : [...art.querySelectorAll("[data-a], .dk-corps h2, .dk-barre")];
  const voir = el => { el.classList.add("vu"); el.querySelectorAll(".n").forEach(compte); };
  if (calme || !("IntersectionObserver" in window)) { cibles.forEach(e => e.classList.add("vu")); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { voir(e.target); io.unobserve(e.target); } }), { threshold: .15 });
  cibles.forEach(c => io.observe(c));
  setTimeout(() => cibles.forEach(c => c.classList.contains("vu") || voir(c)), 9000);
})();
