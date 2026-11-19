(() => {
  const $ = id => document.getElementById(id);
  const z = $("cfg"); if (!z) return;
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nf = v => Math.round(v).toLocaleString("fr-FR");
  const tabs = [$("t-carte"), $("t-abo")], pans = [$("p-carte"), $("p-abo")];
  let mode = 0, q = 0, affiche = 0, raf = 0;
  const sol = () => $("o-sol").checked ? 0.5 : 1;
  const choisir = k => { mode = k; z.dataset.mode = k ? "abo" : "carte";
    tabs.forEach((t, i) => { t.setAttribute("aria-selected", String(i === k)); t.tabIndex = i === k ? 0 : -1; });
    pans.forEach((p, i) => { p.hidden = i !== k; if (i === k && !calme) { p.classList.remove("entre"); void p.offsetWidth; p.classList.add("entre"); } });
    calc(); };
  tabs.forEach((t, i) => { t.addEventListener("click", () => choisir(i));
    t.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const k = 1 - mode; choisir(k); tabs[k].focus(); } }); });
  const prix = el => +el.dataset.base * sol();
  const anim = cible => { cancelAnimationFrame(raf); const de = affiche, t0 = performance.now();
    if (calme) { affiche = cible; $("cfg-tv").textContent = nf(cible); return; }
    const pas = t => { const p = Math.min(1, (t - t0) / 450), e = 1 - Math.pow(1 - p, 3); affiche = de + (cible - de) * e; $("cfg-tv").textContent = nf(affiche); if (p < 1) raf = requestAnimationFrame(pas); };
    raf = requestAnimationFrame(pas);
    const tv = $("cfg-tv").parentNode; tv.classList.remove("pulse"); void tv.offsetWidth; tv.classList.add("pulse"); };
  let resume = "";
  function calc() {
    z.querySelectorAll(".cfg-p[data-base]").forEach(p => { if (p.id !== "q-p") p.textContent = nf(prix(p)) + " €"; });
    $("q-n").textContent = q; $("q-p").textContent = nf(q * 500 * sol()) + " €";
    if (mode === 0) {
      const d = $("o-diag").checked, pl = $("o-plan").checked, pr = $("o-pres").checked;
      const pack = d && pl && pr;
      let tot = pack ? 790 * sol() : [["o-diag", 390], ["o-plan", 290], ["o-pres", 200]].reduce((a, [id, v]) => a + ($(id).checked ? v * sol() : 0), 0);
      tot += q * 500 * sol();
      const pk = $("cfg-pack"); pk.hidden = !pack;
      if (pack) pk.innerHTML = `<b>Pack début de mandat appliqué :</b> ces trois prestations font ${nf(790 * sol())} € au lieu de ${nf(880 * sol())} €, avec en plus une page « budget lisible » pour le bulletin municipal.`;
      z.querySelectorAll("#p-carte .cfg-l").forEach(l => { const c = l.querySelector("input"); l.classList.toggle("on", c ? c.checked : q > 0); });
      $("cfg-tl").textContent = "Total à la carte"; $("cfg-ts").textContent = "Prix nets, sans TVA en sus" + (sol() < 1 ? ", tarif solidaire appliqué." : ".");
      const choix = [d && "diagnostic financier", pl && "plan de financement", pr && "présentation en conseil", q && q + " dossier" + (q > 1 ? "s" : "") + " de subvention"].filter(Boolean);
      resume = "Formule à la carte : " + (choix.length ? choix.join(", ") : "rien de coché") + (pack ? " (pack début de mandat)" : "") + ". Total indiqué : " + nf(tot) + " €" + (sol() < 1 ? " (tarif solidaire)" : "") + ".";
      $("cfg-go").classList.toggle("off", !choix.length);
      anim(tot);
    } else {
      const n = +$("cfg-n").value, pack = $("o-pack-abo").checked, a1 = (pack ? 790 : 390) * sol(), s = 290 * sol();
      $("cfg-n-v").textContent = n + (n > 1 ? " ans" : " an");
      $("cfg-frise").innerHTML = Array.from({ length: n }, (_, i) => `<li style="--i:${i}"><span>Année ${i + 1}</span><b>${nf(i ? s : a1)} €</b><em>${i ? "suivi annuel" : (pack ? "pack début de mandat" : "diagnostic financier")}</em></li>`).join("");
      $("o-pack-abo").closest(".cfg-l").classList.toggle("on", pack);
      const tot = a1 + s * (n - 1);
      $("cfg-tl").textContent = `Total sur ${n} an${n > 1 ? "s" : ""}`;
      $("cfg-ts").textContent = `Soit ${nf(tot / n)} € par an en moyenne. Prix nets, sans TVA en sus` + (sol() < 1 ? ", tarif solidaire appliqué." : ".");
      resume = `Formule abonnement : ${pack ? "pack début de mandat" : "diagnostic financier"} la première année, puis suivi annuel, sur ${n} an${n > 1 ? "s" : ""}. Total indiqué : ${nf(tot)} €` + (sol() < 1 ? " (tarif solidaire)" : "") + ".";
      $("cfg-go").classList.remove("off");
      anim(tot);
    }
  }
  z.addEventListener("change", calc);
  $("cfg-n").addEventListener("input", calc);
  $("q-plus").addEventListener("click", () => { q = Math.min(9, q + 1); calc(); });
  $("q-moins").addEventListener("click", () => { q = Math.max(0, q - 1); calc(); });
  $("cfg-go").addEventListener("click", () => { try { sessionStorage.setItem("pellucid-demande", JSON.stringify({ sujet: "offre", message: resume, commune: localStorage.getItem("pellucid-commune") || undefined })); } catch (e) {} });
  $("o-diag").checked = true; choisir(0);
})();
