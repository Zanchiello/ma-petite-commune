/* Ma Petite Commune — Observer : bibliothèque de téléchargement de la commune suivie.
   Chaque graphique de l'onglet « Une commune », dans chacune de ses vues (indicateur, année de comparaison…),
   se télécharge en PDF, PNG, SVG ou CSV ; les textes (chiffres clés, légendes, tableaux) en Word, PDF ou Markdown.
   Tout est fabriqué dans le navigateur, sans serveur : cela fonctionne aussi sur le site public. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  if (!$("tab-com")) return;   // seulement sur la page Observer
  const BLEU = "#172E3A", CREME = "#F5F1E8", TERRA = "#D77D68", SAFRAN = "#E9B65C", TERRA_T = "#8A5043", GRIS = "#586971";
  const W = 842, H = 595;                                    // A4 paysage, en points
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  const attente = (ms = 60) => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, ms))));
  const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

  /* ---------- Catalogue des graphiques de l'onglet « Une commune » ---------- */
  // sel : listes déroulantes qui changent la vue ; leg : légende ; cap : phrase de contexte ; tab : tableau de données ; kpi : chiffres clés
  const CAT = [
    // Une commune
    { id: "traj", g: "com", sel: ["f-metric"], leg: "traj-legend", cap: "traj-cap" },
    { id: "bud", g: "com", cap: "bud-cap", tab: "bud-table", kpi: "kpis" },
    { id: "fis-stack", g: "com", leg: "fis-legend", cap: "fis-cap", tab: "fis-table", kpi: "fis-kpis" },
    { id: "fis-hist", g: "com", sel: ["fis-m"], cap: "fis-hist-cap" },
    { id: "fis-idx", g: "com", sel: ["fis-m"], leg: "fis-idx-legend", tab: "fis-idx-table" },
    { id: "rei-chart", g: "com", sel: ["rei-m"], leg: "rei-legend", cap: "rei-cap", tab: "rei-table", kpi: "rei-kpis" },
    { id: "rsk-stack", g: "com", leg: "rsk-legend", cap: "rsk-cap", tab: "rsk-table", kpi: "rsk-kpis" },
    { id: "jum", g: "com", cap: "jum-cap", grille: true },
    { id: "rad", g: "com", leg: "rad-legend", cap: "rad-cap", tab: "rad-table" },
    { id: "nb", g: "com", cap: "nb-cap", tab: "nb-table" },
    { id: "wf", g: "com", sel: ["wf-a", "wf-b"], cap: "wf-cap", tab: "wf-table" },
    // Vue d'ensemble (toutes les communes du filtre courant)
    { id: "stage", g: "vue", cap: "stage-cap" },
    { id: "race", g: "vue", sel: ["f-race"], tab: "race-table" },
    { id: "area", g: "vue", cap: "area-cap" },
    { id: "movers", g: "vue", cap: "mov-cap", liste: true, btn: ["[data-m]"] },
    { id: "ru-list", g: "vue", cap: "ru-cap", liste: true, btn: ["[data-ru]", "#ru-years button"] },
    // Territoire
    { id: "vg", g: "ter", sel: ["vg-m"], tab: "vg-table" },
    { id: "sl", g: "ter", sel: ["sl-a", "sl-b"], leg: "sl-legend" },
    { id: "hm", g: "ter", sel: ["hm-dep"] }
  ];
  const GROUPES = { com: ["tb-com", "Une commune"], vue: ["tb-vue", "Vue d'ensemble"], ter: ["tb-ter", "Territoire"] };
  async function activer(item) { const tb = $(GROUPES[item.g][0]); if (tb && tb.getAttribute("aria-selected") !== "true") { tb.click(); await attente(350); } }
  const filtres = () => ["f-tr", "f-dep", "f-cat"].map(id => { const x = $(id); return x && x.selectedIndex > 0 ? x.selectedOptions[0].textContent.trim() : ""; }).filter(Boolean).join(" · ") || "toutes les communes suivies";
  const titreDe = el => {   // le titre le plus proche au-dessus du graphique, dans sa carte
    const carte = el.closest("section.card, section, article") || document.body;
    const tetes = [...carte.querySelectorAll("h2, h3")].filter(h => h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    return txt(tetes[tetes.length - 1]) || txt(carte.querySelector("h2"));
  };
  const commune = () => { const c = txt($("traj-cap")); return { nom: (c.split("(")[0] || "").trim() || txt($("q")) || "commune", ctx: c }; };
  const boutons = q => [...document.querySelectorAll(q)];
  const appuye = q => { const b = boutons(q).find(x => x.getAttribute("aria-pressed") === "true"); return b ? txt(b) : ""; };
  const vueDe = item => [...(item.sel || []).map(id => { const s = $(id); return s && s.selectedOptions[0] ? s.selectedOptions[0].textContent.trim() : ""; }), ...(item.btn || []).map(appuye)].filter(Boolean).join(" · ");

  /* ---------- Graphiques figés : couleurs et polices résolues, prêts à quitter la page ---------- */
  const PROPS = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "letter-spacing", "visibility"];
  function figer(svg) {
    const c = svg.cloneNode(true), a = [svg, ...svg.querySelectorAll("*")], b = [c, ...c.querySelectorAll("*")];
    a.forEach((o, i) => { const cs = getComputedStyle(o), d = b[i]; if (!d.setAttribute) return;
      d.setAttribute("style", PROPS.map(p => { const v = cs.getPropertyValue(p); return v ? p + ":" + v : ""; }).filter(Boolean).join(";") + (cs.display === "none" ? ";display:none" : ""));
      d.removeAttribute("class"); if (d.tagName && d.tagName.toLowerCase() === "foreignobject") d.remove(); });
    [...c.querySelectorAll("title, desc")].forEach(n => n.remove());
    const vb = (svg.getAttribute("viewBox") || "").split(/[ ,]+/).map(Number);
    const r = svg.getBoundingClientRect();
    c.setAttribute("viewBox", vb.length === 4 && vb[2] ? vb.join(" ") : `0 0 ${r.width} ${r.height}`);
    c.removeAttribute("width"); c.removeAttribute("height"); c.removeAttribute("role"); c.removeAttribute("tabindex");
    return { svg: c, vw: vb[2] || r.width, vh: vb[3] || r.height };
  }
  const interieur = el => new XMLSerializer().serializeToString(el).replace(/^<svg[^>]*>|<\/svg>$/g, "");
  function legende(id) {
    const L = $(id); if (!L) return [];
    return [...L.querySelectorAll(".key")].map(k => { const i = k.querySelector("i"), cs = i ? getComputedStyle(i) : null;
      const ligne = i && i.classList.contains("sw-line");
      return { t: txt(k), ligne, coul: cs ? (ligne ? cs.borderTopColor : cs.backgroundColor) : GRIS, op: cs ? cs.opacity : 1, tirets: cs && cs.borderTopStyle === "dashed" }; });
  }
  const kpis = id => { const K = $(id); return K ? [...K.querySelectorAll(".kpi")].map(k => ({ k: txt(k.querySelector(".k")), v: txt(k.querySelector(".v")), d: txt(k.querySelector(".d")) })) : []; };
  const tableau = id => { const T = $(id) && ($(id).tagName === "TABLE" ? $(id) : $(id).querySelector("table")); if (!T) return null;
    return [...T.querySelectorAll("tr")].map(tr => [...tr.children].map(td => txt(td))); };

  // une ligne de liste : nom, département et population, précision éventuelle, variation
  const ligneListe = li => { const sp = li.querySelector("button > span, span"), sm = [...(sp ? sp.querySelectorAll("small") : [])];
    const nom = sp ? [...sp.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(" ").replace(/\s+/g, " ").trim() : txt(li);
    return [nom, txt(sm[0]), txt(sm[1]), txt(li.querySelector(".d"))]; };

  /* ---------- Mise en page A4 paysage ---------- */
  const couper = (t, taille, largeur) => { const max = Math.max(10, Math.floor(largeur / (taille * 0.53))), mots = String(t).split(" "), l = []; let cur = "";
    mots.forEach(m => { if ((cur + " " + m).trim().length > max) { if (cur) l.push(cur); cur = m; } else cur = (cur + " " + m).trim(); }); if (cur) l.push(cur); return l; };
  function page(item, fontes = "") {
    const el = $(item.id), com = commune(), titre = titreDe(el), vue = vueDe(item), date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const logo = (document.querySelector(".pl-brand svg") || { innerHTML: "" }).innerHTML;
    let y = 106, o = "";
    const surTitre = item.g === "com" ? "Observer · " + com.nom : "Observer · " + GROUPES[item.g][1] + " · " + filtres();
    o += `<text x="36" y="${y}" font-family="Manrope" font-weight="800" font-size="9.5" letter-spacing="1.4" fill="${TERRA_T}">${esc(surTitre.toUpperCase())}</text>`; y += 26;
    o += `<text x="36" y="${y}" font-family="Newsreader" font-weight="600" font-size="22" fill="${BLEU}">${esc(titre)}</text>`; y += 18;
    const sous = [vue, txt($(item.cap)) || (item.g === "com" ? com.ctx : "")].filter(Boolean).join(" — ");
    couper(sous, 10.5, 770).slice(0, 2).forEach(l => { o += `<text x="36" y="${y}" font-family="Manrope" font-size="10.5" fill="${GRIS}">${esc(l)}</text>`; y += 14; });
    y += 6;
    // chiffres clés (jusqu'à quatre)
    const K = item.kpi ? kpis(item.kpi).slice(0, 4) : [];
    if (K.length) { const kw = (770 - (K.length - 1) * 10) / K.length;
      K.forEach((k, i) => { const x = 36 + i * (kw + 10);
        o += `<rect x="${x}" y="${y}" width="${kw}" height="50" rx="6" fill="${CREME}"/><text x="${x + 10}" y="${y + 15}" font-family="Manrope" font-size="8" fill="${GRIS}">${esc(couper(k.k, 8, kw - 20)[0] || "")}</text>`
          + `<text x="${x + 10}" y="${y + 34}" font-family="Newsreader" font-weight="600" font-size="17" fill="${BLEU}">${esc(k.v)}</text><text x="${x + 10}" y="${y + 45}" font-family="Manrope" font-size="7.5" fill="${GRIS}">${esc(couper(k.d, 7.5, kw - 20)[0] || "")}</text>`; });
      y += 62; }
    // légende
    const L = item.leg ? legende(item.leg) : [];
    const basLeg = L.length ? 30 : 0, haut0 = y, dispo = H - 62 - basLeg - y;
    // graphique
    if (item.liste) {
      const L2 = [...el.querySelectorAll("li")].map(ligneListe), cause = L2.some(r => r[2]), pas = cause ? 24 : 15;
      const col = 2, n = Math.min(L2.length, Math.floor((dispo - 16) / pas) * col), parCol = Math.ceil(n / col);
      L2.slice(0, n).forEach((r, i) => { const x = 36 + Math.floor(i / parCol) * 390, yy = y + 12 + (i % parCol) * pas;
        o += `<text x="${x}" y="${yy}" font-family="Manrope" font-size="9" fill="${GRIS}">${i + 1}.</text><text x="${x + 18}" y="${yy}" font-family="Manrope" font-weight="700" font-size="9" fill="${BLEU}">${esc(r[0])}</text>`
          + `<text x="${x + 150}" y="${yy}" font-family="Manrope" font-size="8" fill="${GRIS}">${esc(r[1])}</text><text x="${x + 372}" y="${yy}" text-anchor="end" font-family="Manrope" font-weight="800" font-size="9" fill="${TERRA_T}">${esc(r[3])}</text>`
          + (r[2] ? `<text x="${x + 18}" y="${yy + 10}" font-family="Manrope" font-size="7.5" fill="${GRIS}">${esc(r[2].length > 80 ? r[2].slice(0, 79) + "…" : r[2])}</text>` : ""); });
      if (L2.length > n) o += `<text x="36" y="${y + 14 + parCol * pas}" font-family="Manrope" font-size="8.5" fill="${GRIS}">… et ${L2.length - n} autres, dans le fichier CSV.</text>`;
    } else if (el.tagName === "CANVAS") {
      let gw = 770, gh = gw * el.height / el.width; if (gh > dispo) { gh = dispo; gw = gh * el.width / el.height; }
      o += `<image x="${36 + (770 - gw) / 2}" y="${y}" width="${gw}" height="${gh}" href="${el.toDataURL("image/png")}" preserveAspectRatio="xMidYMid meet"/>`; y += gh;
    } else if (item.grille) {
      const cartes = [...el.querySelectorAll(".jc")], col = 4, gw = (770 - (col - 1) * 10) / col, rangs = Math.ceil(cartes.length / col), gh = Math.min(120, (dispo - (rangs - 1) * 8) / rangs);
      cartes.forEach((cj, i) => { const x = 36 + (i % col) * (gw + 10), yy = y + Math.floor(i / col) * (gh + 8), s = cj.querySelector("svg");
        o += `<rect x="${x}" y="${yy}" width="${gw}" height="${gh}" rx="6" fill="${cj.classList.contains("me") ? "#F9EBD1" : CREME}"/>`
          + `<text x="${x + 8}" y="${yy + 14}" font-family="Manrope" font-weight="800" font-size="9.5" fill="${BLEU}">${esc(txt(cj.querySelector(".jn")))}</text><text x="${x + 8}" y="${yy + 25}" font-family="Manrope" font-size="7.5" fill="${GRIS}">${esc(txt(cj.querySelector("small")))}</text>`;
        if (s) { const f = figer(s), sh = gh - 44, sw = Math.min(gw - 16, sh * f.vw / f.vh); o += `<svg x="${x + 8}" y="${yy + 30}" width="${sw}" height="${sh}" viewBox="${f.svg.getAttribute("viewBox")}">${interieur(f.svg)}</svg>`; }
        o += `<text x="${x + 8}" y="${yy + gh - 5}" font-family="Manrope" font-size="7" fill="${GRIS}">${esc((couper(txt(cj.querySelector(".jd")), 7, gw - 16)[0] || ""))}</text>`; });
    } else {
      const svgs = [...el.querySelectorAll("svg")].filter(s => !s.closest("button, label"));
      const s = svgs.sort((p, q) => q.getBoundingClientRect().width * q.getBoundingClientRect().height - p.getBoundingClientRect().width * p.getBoundingClientRect().height)[0];
      if (s) { const f = figer(s); let gw = 770, gh = gw * f.vh / f.vw; if (gh > dispo) { gh = dispo; gw = gh * f.vw / f.vh; }
        o += `<svg x="${36 + (770 - gw) / 2}" y="${y}" width="${gw}" height="${gh}" viewBox="${f.svg.getAttribute("viewBox")}" preserveAspectRatio="xMidYMid meet">${interieur(f.svg)}</svg>`; y += gh; }
      else o += `<text x="36" y="${y + 20}" font-family="Manrope" font-size="11" fill="${GRIS}">Graphique indisponible pour cette commune.</text>`;
    }
    if (L.length) { let x = 36; const yl = H - 62 - 12;
      L.forEach(k => { const w = 26 + k.t.length * 5.2; if (x + w > 806) return;
        o += k.ligne ? `<path d="M${x} ${yl - 3}H${x + 16}" stroke="${k.coul}" stroke-width="2.5"${k.tirets ? ' stroke-dasharray="4 3"' : ""}/>` : `<rect x="${x}" y="${yl - 8}" width="14" height="10" rx="2" fill="${k.coul}" fill-opacity="${k.op}"/>`;
        o += `<text x="${x + 20}" y="${yl}" font-family="Manrope" font-size="9" fill="${BLEU}">${esc(k.t)}</text>`; x += w + 10; }); }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${fontes ? `<style>${fontes}</style>` : ""}
<rect width="${W}" height="${H}" fill="#FFFFFF"/><rect width="${W}" height="62" fill="${BLEU}"/>
<svg x="32" y="12" width="76" height="39" viewBox="${document.querySelector(".pl-brand svg").getAttribute("viewBox")}" preserveAspectRatio="xMinYMid meet">${logo}</svg>
<text x="114" y="30" font-family="Montserrat" font-weight="800" font-size="10" fill="${CREME}">Ma Petite</text><text x="114" y="43" font-family="Montserrat" font-weight="800" font-size="10" fill="${CREME}">Commune</text>
<text x="${W - 34}" y="36" text-anchor="end" font-family="Manrope" font-weight="700" font-size="9.5" fill="${SAFRAN}">Les finances locales, en clair</text>
${o}
<path d="M36 ${H - 40}H${W - 36}" stroke="${BLEU}" stroke-opacity=".15"/>
<text x="36" y="${H - 26}" font-family="Manrope" font-size="8" fill="${GRIS}">Source : DGFiP, comptes individuels des communes (budget principal), et sources citées dans Observer ; calculs Ma Petite Commune.</text>
<text x="36" y="${H - 14}" font-family="Manrope" font-weight="700" font-size="8" fill="${BLEU}">commentseportentlesfinancesdemapetitecommune.com · Observer · téléchargé le ${esc(date)}</text>
</svg>`;
  }

  /* ---------- Formats ---------- */
  let FONTES = null;
  async function fontes() {
    if (FONTES) return FONTES;
    const b64 = async u => { const b = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
    const F = [["Newsreader", "200 800", "fonts/newsreader-latin-opsz-normal.woff2"], ["Manrope", "400", "fonts/manrope-latin-400-normal.woff2"], ["Manrope", "700", "fonts/manrope-latin-700-normal.woff2"], ["Manrope", "800", "fonts/manrope-latin-800-normal.woff2"], ["Montserrat", "800", "fonts/montserrat-latin-800-normal.woff2"]];
    return (FONTES = (await Promise.all(F.map(async ([f, w, u]) => `@font-face{font-family:'${f}';font-weight:${w};src:url(data:font/woff2;base64,${await b64(u)}) format('woff2')}`))).join(""));
  }
  async function toile(svg, pw, ph, ech) {
    const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.src = url; await img.decode(); await new Promise(r => setTimeout(r, 80));
    const c = document.createElement("canvas"); c.width = Math.round(pw * ech); c.height = Math.round(ph * ech);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return c;
  }
  const blobDe = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
  // PDF minimal : chaque page est une image JPEG (aucune bibliothèque extérieure)
  function pdf(pages, titre) {   // pages : [{jpeg, w, h, pw, ph}]
    const enc = new TextEncoder(), m = [], offs = []; let pos = 0;
    const aj = x => { const b = typeof x === "string" ? enc.encode(x) : x; m.push(b); pos += b.length; };
    const obj = (n, f) => { offs[n] = pos; aj(`${n} 0 obj\n`); f(); aj("\nendobj\n"); };
    const hex = s => "<FEFF" + [...s].map(c => c.charCodeAt(0).toString(16).padStart(4, "0")).join("").toUpperCase() + ">";
    const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
    aj("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    obj(1, () => aj("<< /Type /Catalog /Pages 2 0 R >>"));
    obj(2, () => aj(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
    pages.forEach((p, i) => { const b = 3 + i * 3, cont = `q ${p.pw} 0 0 ${p.ph} 0 0 cm /Im0 Do Q`;
      obj(b, () => aj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pw} ${p.ph}] /Resources << /XObject << /Im0 ${b + 1} 0 R >> >> /Contents ${b + 2} 0 R >>`));
      obj(b + 1, () => { aj(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`); aj(p.jpeg); aj("\nendstream"); });
      obj(b + 2, () => aj(`<< /Length ${cont.length} >>\nstream\n${cont}\nendstream`)); });
    const info = 3 + n * 3; obj(info, () => aj(`<< /Title ${hex(titre)} /Author ${hex("Ma Petite Commune")} >>`));
    const xref = pos; aj(`xref\n0 ${info + 1}\n0000000000 65535 f \n` + Array.from({ length: info }, (_, i) => String(offs[i + 1]).padStart(10, "0") + " 00000 n \n").join(""));
    aj(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(m, { type: "application/pdf" });
  }
  const csv = lignes => new Blob(["﻿" + lignes.map(r => r.map(c => /[;"\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  // ZIP sans compression (méthode « stockée »), suffisant pour des PDF et PNG déjà compressés
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function zip(fichiers) {   // [{nom, blob}]
    const enc = new TextEncoder(), parts = [], centre = []; let pos = 0;
    const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    for (const f of fichiers) {
      const data = new Uint8Array(await f.blob.arrayBuffer()), nom = enc.encode(f.nom), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nom.length, true);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nom.length, true); c.setUint32(42, pos, true);
      parts.push(new Uint8Array(h.buffer), nom, data); centre.push(new Uint8Array(c.buffer), nom); pos += 30 + nom.length + data.length;
    }
    const tc = centre.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, fichiers.length, true); e.setUint16(10, fichiers.length, true); e.setUint32(12, tc, true); e.setUint32(16, pos, true);
    return new Blob([...parts, ...centre, new Uint8Array(e.buffer)], { type: "application/zip" });
  }
  const telecharger = (blob, nom) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };

  // fabrique un fichier pour un graphique, dans la vue actuellement affichée
  async function fichier(item, fmt) {
    const com = commune(), vue = vueDe(item), base = `${item.g === "com" ? slug(com.nom) : "observer-" + item.g}-${slug(titreDe($(item.id)))}${vue ? "-" + slug(vue) : ""}`;
    if (fmt === "csv") {
      let t = item.tab ? tableau(item.tab) : null;
      if (!t && item.liste) t = [["Rang", "Commune", "Département et population", "Précision", "Variation du score"], ...[...$(item.id).querySelectorAll("li")].map((li, i) => [i + 1, ...ligneListe(li)])];
      if (!t) return null; return { nom: base + ".csv", blob: csv([...t, [], ["Source : Observer, Ma Petite Commune — " + (item.g === "com" ? com.ctx : filtres())]]) }; }
    const svg = page(item, await fontes());
    if (fmt === "svg") return { nom: base + ".svg", blob: new Blob([svg], { type: "image/svg+xml" }) };
    const c = await toile(svg, W, H, fmt === "pdf" ? 2.4 : 2.2);
    if (fmt === "png") return { nom: base + ".png", blob: await blobDe(c, "image/png") };
    const j = new Uint8Array(await (await blobDe(c, "image/jpeg", 0.92)).arrayBuffer());
    return { nom: base + ".pdf", blob: pdf([{ jpeg: j, w: c.width, h: c.height, pw: W, ph: H }], titreDe($(item.id)) + " · " + com.nom) };
  }

  /* ---------- Vues : toutes les combinaisons des listes déroulantes d'un graphique ---------- */
  const options = id => [...($(id) ? $(id).options : [])].map(o => o.value);
  const axes = item => [...(item.sel || []).map(id => ({ k: "s", id, vals: options(id), lib: v => { const o = [...$(id).options].find(x => x.value === v); return o ? o.textContent.trim() : v; } })),
    ...(item.btn || []).map(q => ({ k: "b", q, vals: boutons(q).map(txt), lib: v => v }))];
  function combinaisons(item) {
    let acc = [[]]; axes(item).forEach(a => { const nv = []; acc.forEach(x => a.vals.forEach(v => nv.push([...x, v]))); acc = nv; });
    if (item.id === "wf" || item.id === "sl") acc = acc.filter(([a, b]) => a !== b);   // comparer une année à elle-même n'a pas de sens
    return acc;
  }
  async function poser(item, vals) {
    await activer(item); let change = false;
    axes(item).forEach((a, i) => { if (vals[i] == null) return;
      if (a.k === "s") { const s = $(a.id); if (s && s.value !== vals[i]) { s.value = vals[i]; s.dispatchEvent(new Event("change")); change = true; } }
      else { const b = boutons(a.q).find(x => txt(x) === vals[i]); if (b && b.getAttribute("aria-pressed") !== "true") { b.click(); change = true; } } });
    await attente(change ? 120 : 30);
  }
  const lire = item => axes(item).map(a => a.k === "s" ? $(a.id).value : appuye(a.q));

  /* ---------- Textes : dossier de la commune ---------- */
  function blocsTexte() {
    const com = commune(), B = [{ t: "h1", v: "Observer · " + com.nom }, { t: "p", v: com.ctx }, { t: "p", v: "Téléchargé le " + new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) + " sur commentseportentlesfinancesdemapetitecommune.com." }];
    [...$("tab-com").querySelectorAll("section.card")].forEach(sec => {
      const h = txt(sec.querySelector("h2")); if (!h) return; B.push({ t: "h2", v: h });
      const vus = new Set();
      sec.querySelectorAll("h3, p.cap, .kpis, table, .jd").forEach(n => {
        if ([...vus].some(v => v.contains(n))) return;
        if (n.matches("h3")) B.push({ t: "h3", v: txt(n) });
        else if (n.matches("p.cap")) { const v = txt(n); if (v) B.push({ t: "p", v }); }
        else if (n.matches(".kpis")) { vus.add(n); [...n.querySelectorAll(".kpi")].forEach(k => B.push({ t: "kpi", k: txt(k.querySelector(".k")), v: txt(k.querySelector(".v")), d: txt(k.querySelector(".d")) })); }
        else if (n.matches("table")) { vus.add(n); B.push({ t: "table", v: [...n.querySelectorAll("tr")].map(tr => [...tr.children].map(td => txt(td))) }); }
        else if (n.matches(".jd")) B.push({ t: "li", v: txt(n.closest(".jc").querySelector(".jn")) + " — " + txt(n) });
      });
    });
    B.push({ t: "p", v: "Sources : DGFiP, comptes individuels des communes (budget principal) ; Insee ; DGFiP, fichier REI ; base GASPAR ; Drias ; calculs Ma Petite Commune." });
    return B;
  }
  const markdown = B => B.map(b => b.t === "h1" ? "# " + b.v : b.t === "h2" ? "\n## " + b.v : b.t === "h3" ? "\n### " + b.v : b.t === "kpi" ? `- **${b.k}** : ${b.v}${b.d ? " (" + b.d + ")" : ""}` : b.t === "li" ? "- " + b.v
    : b.t === "table" ? "\n" + b.v.map((r, i) => "| " + r.join(" | ") + " |" + (i === 0 ? "\n|" + r.map(() => " --- ").join("|") + "|" : "")).join("\n") + "\n" : "\n" + b.v).join("\n") + "\n";
  // Word (.docx) minimal, sans bibliothèque : paragraphes, titres et tableaux
  async function docx(B, titre) {
    const x = s => esc(s).replace(/'/g, "&apos;");
    const r = (t, gras, taille, coul) => `<w:r><w:rPr>${gras ? "<w:b/>" : ""}${taille ? `<w:sz w:val="${taille}"/>` : ""}${coul ? `<w:color w:val="${coul}"/>` : ""}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
    const p = (style, contenu) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}${contenu}</w:p>`;
    const corps = B.map(b => b.t === "h1" ? p("Title", r(b.v)) : b.t === "h2" ? p("Heading1", r(b.v)) : b.t === "h3" ? p("Heading2", r(b.v))
      : b.t === "kpi" ? p("ListBullet", r(b.k + " : ", true) + r(b.v, true, null, "8A5043") + (b.d ? r(" (" + b.d + ")") : "")) : b.t === "li" ? p("ListBullet", r(b.v))
      : b.t === "table" ? `<w:tbl><w:tblPr><w:tblStyle w:val="Grille"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr>` + b.v.map((row, i) => `<w:tr>` + row.map(c => `<w:tc><w:p>${r(c, i === 0, 18)}</w:p></w:tc>`).join("") + `</w:tr>`).join("") + `</w:tbl>` + p("", "")
      : p("", r(b.v))).join("");
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corps}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const sty = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:color w:val="172E3A"/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:color w:val="172E3A"/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="8A5043"/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360" w:hanging="200"/></w:pPr></w:style>
<w:style w:type="table" w:styleId="Grille"><w:name w:val="Grille"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="E4DDCF"/><w:left w:val="single" w:sz="4" w:color="E4DDCF"/><w:bottom w:val="single" w:sz="4" w:color="E4DDCF"/><w:right w:val="single" w:sz="4" w:color="E4DDCF"/><w:insideH w:val="single" w:sz="4" w:color="E4DDCF"/><w:insideV w:val="single" w:sz="4" w:color="E4DDCF"/></w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
    const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
    const drels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(titre)}</dc:title><dc:creator>Ma Petite Commune</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`;
    const t = s => new Blob([s], { type: "application/xml" });
    const z = await zip([{ nom: "[Content_Types].xml", blob: t(ct) }, { nom: "_rels/.rels", blob: t(rels) }, { nom: "word/document.xml", blob: t(doc) }, { nom: "word/_rels/document.xml.rels", blob: t(drels) }, { nom: "word/styles.xml", blob: t(sty) }, { nom: "docProps/core.xml", blob: t(core) }]);
    return new Blob([z], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }
  // PDF du dossier texte : pages A4 portrait mises en page en SVG
  async function pdfTexte(B, titre) {
    const PW = 595, PH = 842, X = 48, LW = 499, F = await fontes(), pages = []; let o = "", y = 0;
    const neuve = () => { if (o) pages.push(o); o = ""; y = 70; };
    const ligne = (t, taille, poids, coul, fam = "Manrope", ecart = 1.45) => { couper(t, taille, LW).forEach(l => { if (y + taille * ecart > PH - 60) neuve(); y += taille * ecart; o += `<text x="${X}" y="${y.toFixed(1)}" font-family="${fam}" font-weight="${poids}" font-size="${taille}" fill="${coul}">${esc(l)}</text>`; }); };
    neuve();
    B.forEach(b => {
      if (b.t === "h1") { y += 6; ligne(b.v, 24, 600, BLEU, "Newsreader", 1.2); y += 6; }
      else if (b.t === "h2") { if (y > PH - 160) neuve(); y += 14; ligne(b.v, 16, 600, BLEU, "Newsreader", 1.3); o += `<path d="M${X} ${y + 5}H${X + LW}" stroke="${TERRA}" stroke-width="1"/>`; y += 8; }
      else if (b.t === "h3") { y += 6; ligne(b.v, 11, 800, TERRA_T); }
      else if (b.t === "kpi") ligne("• " + b.k + " : " + b.v + (b.d ? " (" + b.d + ")" : ""), 9.5, 400, BLEU);
      else if (b.t === "li") ligne("• " + b.v, 9.5, 400, BLEU);
      else if (b.t === "table") { const nc = Math.max(...b.v.map(r => r.length)), cw = LW / nc; y += 4;
        b.v.forEach((r, i) => { if (y + 15 > PH - 60) neuve(); y += 14; if (i === 0) o += `<rect x="${X}" y="${y - 10}" width="${LW}" height="14" fill="${CREME}"/>`;
          r.forEach((c, k) => { o += `<text x="${X + 4 + k * cw}" y="${y.toFixed(1)}" font-family="Manrope" font-weight="${i === 0 ? 800 : 400}" font-size="7.5" fill="${BLEU}">${esc(c.length > cw / 4 ? c.slice(0, Math.floor(cw / 4) - 1) + "…" : c)}</text>`; }); });
        y += 6; }
      else ligne(b.v, 9.5, 400, GRIS);
    });
    pages.push(o);
    const res = [];
    for (let i = 0; i < pages.length; i++) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}"><style>${F}</style><rect width="${PW}" height="${PH}" fill="#fff"/><rect width="${PW}" height="34" fill="${BLEU}"/><text x="${X}" y="22" font-family="Montserrat" font-weight="800" font-size="10" fill="${CREME}">Ma Petite Commune</text><text x="${PW - X}" y="22" text-anchor="end" font-family="Manrope" font-size="9" fill="${SAFRAN}">${esc(titre)}</text>${pages[i]}<text x="${PW - X}" y="${PH - 28}" text-anchor="end" font-family="Manrope" font-size="8" fill="${GRIS}">${i + 1} / ${pages.length}</text><text x="${X}" y="${PH - 28}" font-family="Manrope" font-size="8" fill="${GRIS}">commentseportentlesfinancesdemapetitecommune.com</text></svg>`;
      const c = await toile(svg, PW, PH, 2.2), j = new Uint8Array(await (await blobDe(c, "image/jpeg", 0.9)).arrayBuffer());
      res.push({ jpeg: j, w: c.width, h: c.height, pw: PW, ph: PH });
    }
    return pdf(res, titre);
  }

  /* ---------- Thème clair pendant la capture (les fichiers sont toujours sur fond blanc) ---------- */
  async function enClair(f) {
    const h = document.documentElement, avant = h.getAttribute("data-theme");
    const sombre = avant === "dark" || (!avant && matchMedia("(prefers-color-scheme: dark)").matches);
    if (sombre) { h.setAttribute("data-theme", "light"); await attente(30); }
    try { return await f(); } finally { if (sombre) { if (avant) h.setAttribute("data-theme", avant); else h.removeAttribute("data-theme"); } }
  }

  /* ---------- Interface : bouton sur chaque graphique et bibliothèque ---------- */
  const st = document.createElement("style");
  st.textContent = `
.ox-btn{display:inline-flex;width:auto!important;flex:0 0 auto;align-self:flex-start;justify-content:center;white-space:nowrap;align-items:center;gap:6px;min-height:34px;padding:0 12px;border-radius:999px;border:1.5px solid currentColor;background:transparent;color:var(--text-secondary,#586971);font:700 13px Manrope,system-ui,sans-serif;cursor:pointer;margin:6px 0;transition:background .2s,color .2s,transform .2s}
.ox-btn:hover{background:#172E3A;color:#F5F1E8;border-color:#172E3A;transform:translateY(-1px)}
.ox-btn:focus-visible{outline:3px solid #8A5043;outline-offset:2px}
.ox-lib-zone{grid-column:1/-1;display:flex;width:100%;min-width:0}
.ox-lib-ouvrir{display:inline-flex;width:auto!important;max-width:100%;flex:0 0 auto;justify-content:flex-start;text-align:left;white-space:nowrap;align-items:center;gap:10px;min-height:48px;padding:0 20px;border-radius:999px;border:0;background:#172E3A;color:#F5F1E8;font:800 15.5px Manrope,system-ui,sans-serif;cursor:pointer;margin:4px 0 12px;box-shadow:0 8px 18px rgba(23,46,58,.18);transition:transform .25s,box-shadow .25s}
.ox-lib-ouvrir:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(23,46,58,.25)}
.ox-lib-ouvrir b{color:#E9B65C}
@media (max-width:600px){.ox-lib-ouvrir{white-space:normal;min-height:52px;padding:8px 18px;font-size:14.5px;line-height:1.25}}
dialog.ox-lib{width:min(1180px,96vw);max-height:92vh;padding:0;border:0;border-radius:24px;background:#F5F1E8;color:#172E3A;box-shadow:0 30px 80px rgba(0,0,0,.35);font-family:Manrope,system-ui,sans-serif}
dialog.ox-lib::backdrop{background:rgba(10,22,29,.55);backdrop-filter:blur(3px)}
dialog.ox-lib[open]{animation:oxEntre .35s cubic-bezier(.2,.8,.2,1)}
@keyframes oxEntre{from{opacity:0;transform:translateY(20px) scale(.98)}}
.ox-tete{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;padding:20px 26px;background:#172E3A;color:#F5F1E8}
.ox-tete h2{margin:0;font:600 26px/1.1 Newsreader,Georgia,serif;color:#F5F1E8}.ox-tete h2 em{color:#E9B65C}
.ox-tete p{margin:2px 0 0;font-size:13.5px;color:#C4C6C2}
.ox-fermer{margin-left:auto;min-width:44px;height:44px;border-radius:999px;border:2px solid #F5F1E8;background:none;color:#F5F1E8;font:800 18px Manrope;cursor:pointer}
.ox-onglets{display:flex;gap:6px;padding:14px 26px 0}
.ox-onglets button{min-height:42px;padding:0 18px;border-radius:999px;border:2px solid #172E3A;background:none;color:#172E3A;font:800 14.5px Manrope;cursor:pointer}
.ox-onglets button[aria-selected=true]{background:#172E3A;color:#F5F1E8}
.ox-barre{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:14px 26px;border-bottom:1px solid #E4DDCF}
.ox-barre label{font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px}
.ox-barre select{min-height:40px;border-radius:10px;border:2px solid #E4DDCF;background:#fff;padding:0 10px;font:600 14px Manrope;color:#172E3A}
.ox-go{min-height:42px;padding:0 18px;border-radius:999px;border:0;background:#D77D68;color:#172E3A;font:800 14.5px Manrope;cursor:pointer}
.ox-go.alt{background:#E9B65C}
.ox-go:disabled{opacity:.5;cursor:progress}
.ox-prog{flex-basis:100%;height:6px;border-radius:6px;background:#E4DDCF;overflow:hidden;display:none}.ox-prog.on{display:block}
.ox-prog i{display:block;height:100%;width:0;background:#D77D68;transition:width .2s}
.ox-msg{font-size:13.5px;color:#8A5043;font-weight:700}
.ox-grp{padding-bottom:0;border:0}.ox-grp button{min-height:38px;padding:0 16px;border-radius:999px;border:2px solid #E4DDCF;background:#fff;color:#172E3A;font:800 13.5px Manrope;cursor:pointer}
.ox-grp button[aria-pressed=true]{border-color:#172E3A;background:#F9EBD1}
.ox-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;padding:20px 26px 28px}
.ox-carte{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:18px;background:#fff;border:2px solid transparent;transition:border-color .2s,transform .25s cubic-bezier(.2,.8,.2,1.2),box-shadow .25s;animation:oxCarte .45s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i) * 45ms)}
@keyframes oxCarte{from{opacity:0;transform:translateY(14px)}}
.ox-carte:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(23,46,58,.14)}
.ox-carte.coche{border-color:#172E3A;background:#FDF7EA}
.ox-apercu{aspect-ratio:842/595;border-radius:8px;overflow:hidden;box-shadow:0 1px 0 #E4DDCF,0 6px 14px rgba(60,40,20,.12);background:#fff;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.ox-carte:hover .ox-apercu{transform:scale(1.02)}
.ox-apercu svg{display:block;width:100%;height:100%}
.ox-apercu.maj{animation:oxMaj .45s ease}
@keyframes oxMaj{from{opacity:.25;transform:translateY(6px)}}
.ox-titre{display:flex;gap:10px;align-items:flex-start;font-weight:800;font-size:14.5px;line-height:1.3;cursor:pointer}
.ox-titre input{width:20px;height:20px;accent-color:#8A5043;flex:none;margin-top:1px}
.ox-vue select{width:100%;min-height:36px;border-radius:10px;border:2px solid #E4DDCF;background:#F5F1E8;font:600 13px Manrope;color:#172E3A;padding:0 8px}
.ox-vue small{display:block;margin-bottom:4px;font-size:12px;font-weight:700;color:#586971}
.ox-fmts{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.ox-fmts button{min-height:36px;border-radius:10px;border:2px solid #172E3A;background:#fff;color:#172E3A;font:800 12.5px Manrope;cursor:pointer;transition:background .2s,color .2s,transform .2s}
.ox-fmts button:hover{background:#172E3A;color:#F5F1E8}
.ox-fmts button:disabled{opacity:.3;cursor:not-allowed;background:#fff;color:#172E3A}
.ox-fmts button.fait{background:#78A995;border-color:#78A995}
.ox-textes{padding:20px 26px 28px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:20px}
.ox-textes .ox-carte{animation:none}
.ox-liseuse{max-height:58vh;overflow:auto;padding:22px 26px;border-radius:12px;background:#fff;box-shadow:0 6px 14px rgba(60,40,20,.12);font-size:13.5px;line-height:1.55}
.ox-liseuse h3{font:600 22px Newsreader,Georgia,serif;margin:0 0 8px}.ox-liseuse h4{font:600 17px Newsreader,Georgia,serif;margin:16px 0 4px;border-bottom:1px solid #D77D68}.ox-liseuse h5{font-size:13px;color:#8A5043;margin:10px 0 2px}
.ox-liseuse table{border-collapse:collapse;font-size:11.5px;margin:6px 0}.ox-liseuse td{border:1px solid #E4DDCF;padding:2px 6px}
@media (prefers-reduced-motion:reduce){dialog.ox-lib[open],.ox-carte,.ox-apercu.maj{animation:none}}
@media (max-width:760px){.ox-textes{grid-template-columns:1fr}}`;
  document.head.appendChild(st);

  const FL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  // bouton « Télécharger » sous chaque graphique
  CAT.forEach(item => { const el = $(item.id); if (!el) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "ox-btn"; b.innerHTML = FL + "Télécharger ce graphique";
    b.addEventListener("click", () => ouvrir(item.id));
    if (el.tagName === "CANVAS" || item.liste) (el.closest("section") || el.parentNode).appendChild(b); else el.insertAdjacentElement("afterend", b); });
  // bouton d'ouverture de la bibliothèque, en tête de l'onglet
  const ouvreur = document.createElement("button"); ouvreur.type = "button"; ouvreur.className = "ox-lib-ouvrir";
  ouvreur.innerHTML = FL.replace('width="16" height="16"', 'width="20" height="20"') + "<span>Bibliothèque de téléchargement <b>· graphiques et textes</b></span>";
  ouvreur.addEventListener("click", () => ouvrir());
  ["tab-com", "tab-vue", "tab-ter"].forEach((id, i) => { const p = $(id), premier = p && p.querySelector("section.card"); if (!premier) return;
    const o = i ? ouvreur.cloneNode(true) : ouvreur; if (i) o.addEventListener("click", () => ouvrir()); const z = document.createElement("div"); z.className = "ox-lib-zone"; z.appendChild(o); premier.insertAdjacentElement("beforebegin", z); });

  const dlg = document.createElement("dialog"); dlg.className = "ox-lib"; dlg.setAttribute("aria-labelledby", "ox-t");
  dlg.innerHTML = `<div class="ox-tete"><div><h2 id="ox-t">Bibliothèque de <em id="ox-com">la commune</em></h2><p>Chaque graphique, dans chacune de ses vues, et les textes de la commune, à télécharger.</p></div><button type="button" class="ox-fermer" aria-label="Fermer la bibliothèque">✕</button></div>
<div class="ox-onglets" role="tablist"><button type="button" role="tab" id="ox-o1" aria-selected="true">Graphiques</button><button type="button" role="tab" id="ox-o2" aria-selected="false">Textes</button></div>
<div id="ox-p1"><div class="ox-barre ox-grp" role="group" aria-label="Partie d'Observer"><button type="button" data-grp="com">Une commune</button><button type="button" data-grp="vue">Vue d'ensemble</button><button type="button" data-grp="ter">Territoire</button></div><div class="ox-barre"><label><input type="checkbox" id="ox-tous"> Tout sélectionner</label><label>Format <select id="ox-fmt"><option value="pdf">PDF</option><option value="png">PNG</option><option value="svg">SVG</option><option value="csv">CSV (données)</option></select></label>
<button type="button" class="ox-go" id="ox-sel">Télécharger la sélection (ZIP)</button><button type="button" class="ox-go alt" id="ox-tout">Toutes les vues de cette partie (ZIP)</button><span class="ox-msg" id="ox-msg" aria-live="polite"></span><div class="ox-prog" id="ox-prog"><i></i></div></div><div class="ox-grille" id="ox-grille"></div></div>
<div id="ox-p2" hidden><div class="ox-textes"><div class="ox-carte"><p class="ox-titre" style="cursor:default">Dossier texte de la commune</p><p style="margin:0;font-size:13.5px;line-height:1.5;color:#586971">Tous les textes de l'onglet : contexte, chiffres clés, légendes et tableaux, section par section. À relire, compléter et joindre à un rapport ou à une délibération.</p>
<div class="ox-fmts" style="grid-template-columns:repeat(3,1fr)"><button type="button" data-tx="docx">Word</button><button type="button" data-tx="pdf">PDF</button><button type="button" data-tx="md">Markdown</button></div>
<p style="margin:6px 0 0;font-size:12.5px;color:#586971">Les tableaux de chaque graphique sont aussi disponibles en CSV dans l'onglet Graphiques.</p></div><div class="ox-liseuse" id="ox-lis" tabindex="0" aria-label="Aperçu du dossier texte"></div></div></div>`;
  document.body.appendChild(dlg);
  dlg.querySelector(".ox-fermer").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  const onglet = k => { $("ox-o1").setAttribute("aria-selected", String(k === 1)); $("ox-o2").setAttribute("aria-selected", String(k === 2)); $("ox-p1").hidden = k !== 1; $("ox-p2").hidden = k !== 2; if (k === 2) liseuse(); };
  dlg.querySelectorAll("[data-grp]").forEach(b => b.addEventListener("click", () => { groupe = b.dataset.grp; $("ox-msg").textContent = ""; cartes(); }));
  $("ox-o1").addEventListener("click", () => onglet(1)); $("ox-o2").addEventListener("click", () => onglet(2));

  const libelleVal = (id, v) => { const o = [...$(id).options].find(x => x.value === v); return o ? o.textContent.trim() : v; };
  async function apercu(item, carte) { const a = carte.querySelector(".ox-apercu"); await activer(item); await enClair(async () => { a.innerHTML = page(item); }); a.classList.remove("maj"); void a.offsetWidth; a.classList.add("maj"); }
  let groupe = "com";
  const majTete = () => { $("ox-t").innerHTML = groupe === "com" ? `Bibliothèque de <em id="ox-com">${esc(commune().nom)}</em>` : `Bibliothèque d'Observer · <em>${esc(GROUPES[groupe][1])}</em>`; };
  function cartes() {
    majTete();
    const g = $("ox-grille"); g.innerHTML = "";
    dlg.querySelectorAll("[data-grp]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.grp === groupe)));
    CAT.filter(it => $(it.id) && it.g === groupe).forEach((item, i) => {
      const combos = combinaisons(item), c = document.createElement("div"); c.className = "ox-carte"; c.style.setProperty("--i", i); c.dataset.id = item.id;
      const ax = axes(item);
      const vue = ax.length ? `<div class="ox-vue"><small>${combos.length} vue${combos.length > 1 ? "s" : ""} possibles</small><select aria-label="Vue du graphique">${combos.map(v => `<option value="${esc(v.join("|"))}"${v.join("|") === lire(item).join("|") ? " selected" : ""}>${esc(v.map((x, k) => ax[k].lib(x)).join(" · "))}</option>`).join("")}</select></div>` : "";
      c.innerHTML = `<div class="ox-apercu" role="img" aria-label="Aperçu de la page"></div><label class="ox-titre"><input type="checkbox"> <span>${esc(titreDe($(item.id)))}</span></label>${vue}<div class="ox-fmts">${["pdf", "png", "svg", "csv"].map(f => `<button type="button" data-f="${f}"${f === "csv" && !item.tab && !item.liste ? " disabled title=\"Pas de tableau pour ce graphique\"" : ""}>${f.toUpperCase()}</button>`).join("")}</div>`;
      g.appendChild(c);
      c.querySelector("input").addEventListener("change", e => c.classList.toggle("coche", e.target.checked));
      const s = c.querySelector(".ox-vue select");
      if (s) s.addEventListener("change", async () => { await poser(item, s.value.split("|")); apercu(item, c); });
      c.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", async () => {
        b.disabled = true; try { if (s) await poser(item, s.value.split("|")); const f = await enClair(() => fichier(item, b.dataset.f)); if (f) { telecharger(f.blob, f.nom); b.classList.add("fait"); setTimeout(() => b.classList.remove("fait"), 1500); } }
        catch (e) { $("ox-msg").textContent = "Ce format n'a pas pu être créé dans ce navigateur."; } b.disabled = false; }));
      file.push(() => apercu(item, c));
    });
    (async () => { for (const f of file.splice(0)) await f(); })();
  }
  const file = [];
  async function lot(liste, fmt, nomZip) {   // liste : [{item, vals}]
    const btns = [$("ox-sel"), $("ox-tout")], prog = $("ox-prog"), barre = prog.querySelector("i"), msg = $("ox-msg");
    btns.forEach(b => b.disabled = true); prog.classList.add("on"); barre.style.width = "0";
    const ongletAvant = Object.values(GROUPES).map(g => $(g[0])).find(t => t && t.getAttribute("aria-selected") === "true");
    const avant = new Map(CAT.filter(it => it.g === groupe).map(it => [it, lire(it)])), fichiers = [];
    try {
      await enClair(async () => { for (let i = 0; i < liste.length; i++) { const { item, vals } = liste[i];
        msg.textContent = `Préparation ${i + 1} / ${liste.length}…`; await poser(item, vals);
        const f = await fichier(item, fmt); if (f && !fichiers.some(x => x.nom === f.nom)) fichiers.push(f); barre.style.width = ((i + 1) / liste.length * 100) + "%"; } });
      for (const [it, v] of avant) await poser(it, v);
      if (ongletAvant) ongletAvant.click();
      if (!fichiers.length) { msg.textContent = "Aucun fichier dans ce format pour la sélection."; return; }
      msg.textContent = "Assemblage de l'archive…"; telecharger(await zip(fichiers), nomZip); msg.textContent = `${fichiers.length} fichier${fichiers.length > 1 ? "s" : ""} téléchargé${fichiers.length > 1 ? "s" : ""}.`;
    } catch (e) { msg.textContent = "Le téléchargement s'est interrompu."; }
    finally { btns.forEach(b => b.disabled = false); setTimeout(() => prog.classList.remove("on"), 1200); }
  }
  $("ox-tous").addEventListener("change", e => dlg.querySelectorAll(".ox-carte input[type=checkbox]").forEach(c => { c.checked = e.target.checked; c.dispatchEvent(new Event("change")); }));
  $("ox-sel").addEventListener("click", () => {
    const l = [...dlg.querySelectorAll(".ox-carte.coche")].map(c => { const item = CAT.find(x => x.id === c.dataset.id), s = c.querySelector(".ox-vue select"); return { item, vals: s ? s.value.split("|") : [] }; });
    if (!l.length) { $("ox-msg").textContent = "Cochez au moins un graphique."; return; }
    lot(l, $("ox-fmt").value, `${groupe === "com" ? slug(commune().nom) : "observer-" + groupe}-graphiques-${$("ox-fmt").value}.zip`);
  });
  $("ox-tout").addEventListener("click", () => {
    const l = []; CAT.filter(it => $(it.id) && it.g === groupe).forEach(item => combinaisons(item).forEach(vals => l.push({ item, vals })));
    const fmt = $("ox-fmt").value;
    if (fmt !== "csv" && l.length > 40 && !confirm(`${l.length} vues à préparer : cela peut prendre une à deux minutes. Continuer ?`)) return;
    lot(l, fmt, `${groupe === "com" ? slug(commune().nom) : "observer-" + groupe}-toutes-les-vues-${fmt}.zip`);
  });
  function liseuse() {
    const B = blocsTexte();
    $("ox-lis").innerHTML = B.map(b => b.t === "h1" ? `<h3>${esc(b.v)}</h3>` : b.t === "h2" ? `<h4>${esc(b.v)}</h4>` : b.t === "h3" ? `<h5>${esc(b.v)}</h5>` : b.t === "kpi" ? `<p>• <b>${esc(b.k)}</b> : ${esc(b.v)} ${b.d ? "<small>(" + esc(b.d) + ")</small>" : ""}</p>` : b.t === "li" ? `<p>• ${esc(b.v)}</p>`
      : b.t === "table" ? `<table>${b.v.map((r, i) => `<tr>${r.map(c => i ? `<td>${esc(c)}</td>` : `<td><b>${esc(c)}</b></td>`).join("")}</tr>`).join("")}</table>` : `<p>${esc(b.v)}</p>`).join("");
  }
  dlg.querySelectorAll("[data-tx]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true; const B = blocsTexte(), nom = slug(commune().nom) + "-dossier-observer", titre = "Observer · " + commune().nom;
    try { if (b.dataset.tx === "md") telecharger(new Blob([markdown(B)], { type: "text/markdown;charset=utf-8" }), nom + ".md");
      else if (b.dataset.tx === "docx") telecharger(await docx(B, titre), nom + ".docx");
      else telecharger(await pdfTexte(B, titre), nom + ".pdf");
      b.classList.add("fait"); setTimeout(() => b.classList.remove("fait"), 1500); } catch (e) { alert("Le dossier n'a pas pu être créé dans ce navigateur."); }
    b.disabled = false; }));

  function ouvrir(focus) {
    const it = focus && CAT.find(x => x.id === focus);
    groupe = it ? it.g : (Object.entries(GROUPES).find(([, g]) => $(g[0]) && $(g[0]).getAttribute("aria-selected") === "true") || ["com"])[0];
    majTete(); $("ox-msg").textContent = ""; onglet(1); cartes();
    if (!dlg.open) dlg.showModal();
    if (focus) setTimeout(() => { const c = dlg.querySelector(`.ox-carte[data-id="${focus}"]`); if (c) { c.scrollIntoView({ block: "center" }); c.querySelector("input").focus(); c.classList.add("coche"); c.querySelector("input").checked = true; } }, 120);
  }
})();
