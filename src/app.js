/* Copilot con savi — v3.2 (rediseño UX/UI, preparado para 5 idiomas)
   Datos embebidos por build.py:
     script[type="application/json"][data-lang]  → contenido por idioma (hoy solo «es»; id="content" se conserva)
     #i18n                                         → { default, fallback, languages[], ui:{<code>:{…}} }
     #video-config                                 → vídeo del hero
   Contrato conservado: #tabs [role=tab][data-id] · section.panel#sec-<id> · [data-go] · [data-sub] · #sb-<id>
   · [data-lib] · .prompt > pre + .copy · rutas #sec/sub · .tl.g/.a/.r · .callout(.warn) · .control · .steps
   Regla i18n: la maquetación NO depende del texto. Las variantes se deciden con claves estructurales del
   contenido (chunk.key, chunk.targets, block.role, block.tone, block.tl, block.pending) o con sintaxis
   markdown neutra (**negrita inicial**, **N. paso**, →, (Apps)). Los textos de interfaz salen de t(). */

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pad = n => String(n).padStart(2, "0");
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

/* ---------- Datos e idiomas ---------- */
const V = JSON.parse($("#video-config").textContent);
const A = typeof ASSETS === "object" ? ASSETS : {};
const I18N = JSON.parse($("#i18n").textContent);
const CONTENTS = {};
$$('script[type="application/json"][data-lang]').forEach(s => { CONTENTS[s.dataset.lang] = JSON.parse(s.textContent); });
const LANGS = I18N.languages.map(l => Object.assign({}, l, { ready: !!(CONTENTS[l.code] && I18N.ui[l.code]) }));
const isReady = code => LANGS.some(l => l.code === code && l.ready);
function pickInitialLang() {
  const fromHash = location.hash.slice(1).split("/")[0];
  for (const c of [fromHash, store.get("savi-copilot-lang"), I18N.default, I18N.fallback]) if (c && isReady(c)) return c;
  return (LANGS.find(l => l.ready) || { code: "es" }).code;
}

const state = { lang: pickInitialLang(), sec: "descubre", sub: {}, lib: null, cap: 0 };

/* Valor bruto de un texto de interfaz (objetos y listas), con idioma de respaldo */
const tRaw = key => { const ui = I18N.ui[state.lang] || {}, fb = I18N.ui[I18N.fallback] || {}; return ui[key] ?? fb[key]; };
/* Textos de interfaz: t("clave", {n, q, x}) · plurales con Intl.PluralRules */
function t(key, vars) {
  const ui = I18N.ui[state.lang] || {}, fb = I18N.ui[I18N.fallback] || {};
  let v = ui[key] ?? fb[key] ?? key;
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const n = vars && vars.n != null ? vars.n : 0;
    let cat = "other"; try { cat = new Intl.PluralRules(state.lang).select(n); } catch (e) {}
    v = v[cat] ?? v.other ?? "";
  }
  if (typeof v === "string" && vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return v;
}

/* Markdown mínimo: **negrita**, *cursiva*, `código`, [texto](url), SAVI → savi, saltos de línea */
function inline(s) {
  let h = esc(s);
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  h = h.replace(/\bSAVI\b/gi, '<span class="savi">savi</span>');
  return h.replace(/\n/g, "<br>");
}
/* Texto del prompt: se escapa tal cual y se resaltan los [huecos]. textContent sigue siendo el texto original. */
const promptText = x => esc(x).replace(/\[([^\]]+)\]/g, '<mark class="ph">[$1]</mark>');

/* ---------- Iconos (trazo propio, sin logotipos de terceros) ---------- */
const I = {
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.7 1.6 1.6.7-1.6.7L19 21l-.7-1.6-1.6-.7 1.6-.7z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  building: "M4 21V5l8-2v18 M12 8h8v13 M7 8h2 M7 12h2 M7 16h2 M15 12h2 M15 16h2 M2 21h20",
  rocket: "M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2 M9 15l-3-3c1-4 5-9 13-9 0 8-5 12-9 13z M15 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  grad: "M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5 M22 9v6",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  mail: "M3 6h18v12H3z M3 7l9 6 9-6",
  users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M21 19v-1a4 4 0 0 0-3-3.9 M15.5 4.2a3 3 0 0 1 0 5.6",
  table: "M3 4h18v16H3z M3 10h18 M3 15h18 M9 4v16",
  doc: "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6",
  slides: "M3 4h18v12H3z M12 16v4 M8 20h8 M7 12l3-3 2 2 4-4",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4",
  cloud: "M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 21V5 M8 7h7",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M3 20h18",
  notebook: "M6 3h12v18H6z M9 3v18 M12 8h4 M12 12h4",
  page: "M6 3h12v18H6z M9 8h6 M9 12h6 M9 16h3",
  check: "M4 6l2 2 3-3 M4 13l2 2 3-3 M12 7h8 M12 14h8 M4 20h16",
  bot: "M5 9h14v10H5z M12 5v4 M9 13v1 M15 13v1 M9 16.5h6 M12 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12h.01",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  headset: "M4 14v-2a8 8 0 0 1 16 0v2 M4 14h3v5H4z M17 14h3v5h-3z M20 19a3 3 0 0 1-3 2h-3",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9 12l2 2 4-4",
  bars: "M4 20h16 M7 16v-4 M12 16V7 M17 16v-7",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9 M12 3c-2.5 2.7-3.8 5.7-3.8 9s1.3 6.3 3.8 9",
  upload: "M12 15V4 M7 9l5-5 5 5 M4 15v5h16v-5",
  apps: "M5 5h4v4H5z M15 5h4v4h-4z M5 15h4v4H5z M15 15h4v4h-4z",
  layers: "M12 3l9 5-9 5-9-5z M3 13l9 5 9-5",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  chev: "M6 9l6 6 6-6",
  film: "M3 5h18v14H3z M7 5v14 M17 5v14 M3 9h4 M3 15h4 M17 9h4 M17 15h4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01",
  alert: "M12 3l10 18H2z M12 10v5 M12 18h.01",
  bulb: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  copy: "M9 9h11v11H9z M5 15H4V4h11v1",
  ok: "M5 12l5 5 9-10",
  x: "M6 6l12 12 M18 6L6 18"
};
const ic = (k, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${I[k] || I.layers}"/></svg>`;
const SUB_ICON = {
  "copilot-app": "chat", outlook: "mail", teams: "users", excel: "table", word: "doc", powerpoint: "slides", sharepoint: "share", onedrive: "cloud", prompts: "book",
  comercial: "target", "customer-success": "heart", "customer-care-call-center": "headset", "operaciones-y-validacion": "shield", "finanzas-y-administracion": "bars", "direccion-y-responsables": "compass",
  researcher: "search", analyst: "chart", notebooks: "notebook", pages: "page", planner: "check", agentes: "bot"
};
const SEC_ICON = { descubre: "sparkle", dia: "sun", depto: "building", mas: "rocket", aprende: "grad" };
const SEC_MASCOT = { dia: "mascot-ipad", depto: "mascot-notebook", mas: "mascot-hold-side", aprende: "mascot-palm" };
const img = (k, cls, alt = "") => A[k] ? `<img class="${cls}" src="${A[k]}" alt="${esc(alt)}"${alt ? "" : ' aria-hidden="true"'}>` : "";

/* ---------- Modelo: bloques → nodos (sin depender del idioma) ---------- */
const BOLDLEAD = /^\*\*[^*]+\*\*/;
const BOLDONLY = /^\*\*[^*]+\*\*$/;
function leadOf(line) {
  const m = String(line).match(/^\*\*([^*]+)\*\*:?\s*([\s\S]*)$/);
  return m ? { lead: m[1].replace(/[.:]\s*$/, ""), rest: m[2] } : { lead: "", rest: line };
}

let C, SEC, SUBINDEX, PROMPTS, LIB_GROUPS;
function mkPrompt(p, ctx, i, label) {
  const o = {
    pid: `p-${ctx.sec}-${ctx.sub}-${i}`, title: p.title || "", app: p.app || "", group: p.group || "", x: p.x, tip: p.tip || "",
    sec: ctx.sec, sub: ctx.sub, where: `${ctx.secTitle} · ${ctx.subName}`, disp: p.title || label || ctx.subName,
    norm: norm([p.title, p.app, p.x, p.tip, ctx.subName, label, p.group].join(" "))
  };
  PROMPTS.push(o);
  return o;
}
function toNodes(bl, ctx) {
  const out = [];
  let i = 0, k = 0, pidx = 0, label = "", inTl = false;
  const id = () => `a-${ctx.sec}-${ctx.sub}-${k++}`;
  while (i < bl.length) {
    const b = bl[i];
    if (b.t === "prompt" || b.t === "card") {
      const items = [];
      while (i < bl.length && (bl[i].t === "prompt" || bl[i].t === "card")) { items.push(mkPrompt(bl[i], ctx, pidx++, label)); i++; }
      out.push({ kind: "prompts", id: id(), items, inTl });
      continue;
    }
    if (b.t === "h3") {
      inTl = false; label = b.x.replace(/\*\*/g, "");
      out.push({ kind: "h3", id: id(), x: b.x, pending: !!b.pending, toc: label.split(/\s+[—–-]\s+/)[0] });
      i++; continue;
    }
    if (b.t === "ul") { inTl = false; out.push({ kind: b.items.every(x => BOLDLEAD.test(x)) ? "feat" : "ul", id: id(), items: b.items }); i++; continue; }
    if (b.t === "ol") {
      inTl = false;
      out.push({ kind: b.role === "convo" ? "convo" : b.items.every(x => BOLDLEAD.test(x)) ? "journey" : "ol", id: id(), items: b.items });
      i++; continue;
    }
    const x = b.x || "";
    if (b.role === "callout") { inTl = false; out.push({ kind: "callout", id: id(), x, warn: b.tone === "warn", toc: leadOf(x).lead }); i++; continue; }
    const st = x.match(/^\*\*(\d+)\.\s*([^*]+)\*\*:?\s*([\s\S]*)$/);
    if (st) { inTl = true; label = `${st[1]}. ${st[2]}`; out.push({ kind: "step", id: id(), n: st[1], label: st[2], rest: st[3] }); i++; continue; }
    const lines = x.split("\n");
    if (lines.length >= 2 && lines.every(l => BOLDLEAD.test(l))) { inTl = false; out.push({ kind: "cards", id: id(), lines, tl: b.tl || [] }); i++; continue; }
    if (BOLDONLY.test(x.trim()) && x.includes("→")) { inTl = false; out.push({ kind: "flow", id: id(), lead: "", steps: x.trim().replace(/\*\*/g, "").split("→").map(s => s.trim()) }); i++; continue; }
    if (BOLDONLY.test(x.trim())) { inTl = false; const tx = x.trim().replace(/\*\*/g, ""); label = tx.replace(/[.:]\s*$/, ""); out.push({ kind: "label", id: id(), x: tx, toc: label }); i++; continue; }
    const fl = x.match(/^(\*\*[^*]+\*\*)\s*\*\*([^*]*→[^*]*)\*\*\.?\s*$/);
    if (fl) { inTl = false; out.push({ kind: "flow", id: id(), lead: fl[1], steps: fl[2].split("→").map(s => s.trim()) }); i++; continue; }
    const nb = bl[i + 1];
    if (b.role === "compare" && nb && nb.t === "prompt") {
      inTl = false; const L = leadOf(x);
      out.push({ kind: "compare", id: id(), badLead: L.lead, badRest: L.rest, good: mkPrompt(nb, ctx, pidx++, label) });
      i += 2; continue;
    }
    inTl = false; out.push({ kind: "p", id: id(), x, role: b.role || "", tone: b.tone || "" }); i++;
  }
  return out;
}
function buildModel(content) {
  C = content; SEC = {}; SUBINDEX = []; PROMPTS = [];
  C.sections.forEach(sec => {
    SEC[sec.id] = sec;
    (sec.subs || []).forEach(sb => {
      if (sb.isLib) return;
      const ctx = { sec: sec.id, secTitle: sec.title, sub: sb.id, subName: sb.name };
      sb.nodes = toNodes(sb.blocks || [], ctx);
      sb.prompts = sb.nodes.flatMap(n => n.kind === "prompts" ? n.items : n.kind === "compare" ? [n.good] : []);
      sb.toc = []; let first = true;
      sb.nodes.forEach(n => {
        if (n.toc) sb.toc.push({ id: n.id, label: n.toc });
        else if ((n.kind === "prompts" || n.kind === "compare") && first) { first = false; if (sb.prompts.length > 1) sb.toc.push({ id: n.id, label: t("tocPrompts", { n: sb.prompts.length }) }); }
      });
      SUBINDEX.push({ sec: sec.id, secTitle: sec.title, sub: sb.id, name: sb.name, tagline: sb.tagline || "", norm: norm(`${sb.name} ${sb.tagline || ""} ${sec.title}`) });
    });
    if (sec.id === "dia") {
      const name = t("libName");
      const ctx = { sec: "dia", secTitle: sec.title, sub: "prompts", subName: name };
      sec.lib = (C.library || []).map((p, i) => mkPrompt(p, ctx, i, ""));
      sec.subs = sec.subs.filter(s => !s.isLib).concat([{ id: "prompts", name, isLib: true, tagline: "", nodes: [], prompts: sec.lib, toc: [] }]);
      SUBINDEX.push({ sec: "dia", secTitle: sec.title, sub: "prompts", name, tagline: "", norm: norm(`${name} ${sec.title}`) });
    }
  });
  LIB_GROUPS = [...new Set((C.library || []).map(x => x.group))];
}

/* ---------- Componentes ---------- */
function promptCard(p, compact) {
  const long = p.x.length > 650;
  return `<article class="prompt pc${compact ? " pc-compact" : ""}" id="${p.pid}">` +
    `<div class="pc-bar"><span class="pc-k">${ic("chat")}${esc(t("prompt"))}</span>${p.app ? `<span class="app-pill">${esc(p.app)}</span>` : ""}</div>` +
    (p.title ? `<h4 class="pc-t">${inline(p.title)}</h4>` : "") +
    `<pre class="pc-x${long ? " clamp" : ""}">${promptText(p.x)}</pre>` +
    (long ? `<button type="button" class="pc-more" aria-expanded="false">${esc(t("showFull"))}</button>` : "") +
    (p.tip ? `<p class="pc-tip tip">${ic("bulb")}<span>${inline(p.tip)}</span></p>` : "") +
    `<button type="button" class="copy" data-pid="${p.pid}">${ic("copy")}<span>${esc(t("copy"))}</span></button></article>`;
}
const promptGrid = (items, compact) => `<div class="pgrid${compact ? " pgrid-compact" : ""}">${items.map(p => promptCard(p, compact)).join("")}</div>`;

/* Citas en cualquier convención tipográfica: «…» „…“ “…” »…« "…" */
const QUOTES = /«[^»]+»|„[^“”"]+[“”"]|“[^”]+”|»[^«]+«|"[^"]+"/g;
function leadCard(n) {
  const x = n.x, L = leadOf(x), raw = (x.match(/^\*\*([^*]+)\*\*/) || [])[1] || "";
  if (n.role === "howto" && /;\s/.test(L.rest)) {
    const parts = L.rest.split(/;\s+/);
    return `<div class="howto"><p class="howto-t">${ic("check")}<span>${inline(raw.replace(/:$/, ""))}</span></p><ol class="howto-s">${parts.map((s, i) => `<li><span class="hs-n">${pad(i + 1)}</span><span>${inline(s)}</span></li>`).join("")}</ol></div>`;
  }
  if (n.role === "phrases") {
    const quotes = L.rest.match(QUOTES) || [];
    if (quotes.length) {
      const last = quotes[quotes.length - 1], tail = L.rest.slice(L.rest.lastIndexOf(last) + last.length).replace(/^[.,;\s]+/, "");
      return `<div class="note phrases"><p class="note-t">${ic("chat")}${inline(L.lead)}</p><ul class="qchips">${quotes.map(q => `<li>${esc(q)}</li>`).join("")}</ul>${tail ? `<p class="note-d">${inline(tail)}</p>` : ""}</div>`;
    }
  }
  const kind = ["explore", "example", "accent"].includes(n.tone) ? n.tone : "";
  const icon = { explore: "sparkle", example: "chat", accent: "target" }[kind] || "info";
  return `<div class="note${kind ? " " + kind : ""}"><p class="note-t">${ic(icon)}<span>${inline(L.lead)}</span></p><p class="note-d">${inline(L.rest)}</p></div>`;
}
function nodeHTML(n) {
  const wrap = inner => `<div class="blk blk-${n.kind}" id="${n.id}">${inner}</div>`;
  switch (n.kind) {
    case "prompts": return wrap(`<p class="mlabel">${ic("copy")}<span class="ml-t">${esc(t("promptsToTry"))}</span><span class="ml-n">${n.items.length}</span></p>${promptGrid(n.items)}`);
    case "h3": return wrap(`<h3 class="modh sub${n.pending ? " pend warnh" : ""}">${n.pending ? ic("alert") : ""}<span>${inline(n.x)}</span></h3>`);
    case "label": return wrap(`<h3 class="modh lbl">${inline(n.x)}</h3>`);
    case "ul": return wrap(`<ul class="checks ul">${n.items.map(x => `<li>${ic("ok", "ic ck")}<span>${inline(x)}</span></li>`).join("")}</ul>`);
    case "feat": return wrap(`<ul class="feat">${n.items.map((x, j) => { const L = leadOf(x); return `<li class="tile"><span class="tile-n">${pad(j + 1)}</span><span class="tile-t">${inline(L.lead)}</span><span class="tile-d">${inline(L.rest)}</span></li>`; }).join("")}</ul>`);
    case "convo": return wrap(`<ol class="convo">${n.items.map((x, j) => `<li><span class="cv-n">${pad(j + 1)}</span><p class="cv-b">${inline(x)}</p></li>`).join("")}</ol>`);
    case "ol": return wrap(`<ol class="ncards steps">${n.items.map((x, j) => `<li><span class="nc-n" aria-hidden="true">${pad(j + 1)}</span><span class="nc-t">${inline(x)}</span></li>`).join("")}</ol>`);
    case "journey": return wrap(`<ol class="journey">${n.items.map((x, j) => {
      const L = leadOf(x), m = L.lead.match(/^(.*?)\s*\(([^)]+)\)$/);
      return `<li class="jn"><span class="jn-n">${esc(t("step", { n: pad(j + 1) }))}</span><span class="jn-t">${inline(m ? m[1] : L.lead)}</span>${m ? `<span class="jn-apps">${esc(m[2])}</span>` : ""}<span class="jn-d">${inline(L.rest)}</span></li>`;
    }).join("")}</ol>`);
    case "step": return wrap(`<div class="tstep"><span class="ts-n" aria-hidden="true">${pad(n.n)}</span><div class="ts-b"><h4 class="ts-t"><span class="sr-only">${n.n}. </span>${inline(n.label)}</h4>${n.rest.trim() ? `<p class="ts-d">${inline(n.rest)}</p>` : ""}${(n.kids || []).map(k => promptGrid(k.items, true)).join("")}</div></div>`);
    case "callout": return wrap(`<div class="callout${n.warn ? " warn" : ""}" role="note"><span class="co-ic">${ic(n.warn ? "alert" : "info")}</span><p>${inline(n.x)}</p></div>`);
    case "cards": return wrap(`<div class="tiles cards">${n.lines.map((l, j) => {
      const L = leadOf(l), tl = n.tl[j] || "";
      return `<div class="tile${tl ? ` tl ${tl} tl-${tl}` : " card"}"><p class="tile-t">${tl ? '<span class="tl-dot" aria-hidden="true"></span>' : ""}<span>${inline(L.lead)}</span></p><p class="tile-d">${inline(L.rest)}</p></div>`;
    }).join("")}</div>`);
    case "flow": return wrap(`<div class="flow">${n.lead ? `<p class="flow-l">${inline(n.lead.replace(/\*\*/g, ""))}</p>` : ""}<ol class="flow-s">${n.steps.map((s, j) => `<li><span>${pad(j + 1)}</span>${esc(s)}</li>`).join("")}</ol></div>`);
    case "compare": return wrap(`<div class="compare"><div class="cmp-bad"><p class="cmp-l">${ic("x")}<span>${esc(n.badLead)}</span></p><p class="cmp-x">${inline(n.badRest)}</p></div><div class="cmp-arrow" aria-hidden="true">${ic("arrow")}</div><div class="cmp-good">${promptCard(n.good)}</div></div>`);
    default: return wrap(BOLDLEAD.test(n.x) ? leadCard(n) : `<p class="np">${inline(n.x)}</p>`);
  }
}
/* Los prompts que siguen a un paso numerado van dentro de ese paso */
function groupSteps(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.kind === "step") {
      const st = Object.assign({}, n, { kids: [] });
      while (nodes[i + 1] && nodes[i + 1].kind === "prompts" && nodes[i + 1].inTl) st.kids.push(nodes[++i]);
      out.push(st);
    } else out.push(n);
  }
  return out;
}

function videoHTML() {
  if (V.src) {
    const asVideo = V.mode === "video" || (V.mode !== "iframe" && /\.(mp4|webm|mov)(\?|#|$)/i.test(V.src));
    if (asVideo) {
      return `<video controls preload="metadata" playsinline aria-label="${esc("COPILOT · " + t("videoTitle"))}"${V.poster ? ` poster="${esc(V.poster)}"` : ""}><source src="${esc(V.src)}">${V.captions ? `<track kind="subtitles" src="${esc(V.captions)}" srclang="${esc(V.captionsLang || "es")}" label="${esc(V.captionsLabel || "Español")}" default>` : ""}${esc(t("videoUnsupported"))}</video>`;
    }
    return `<iframe id="hero-video" src="${esc(V.src)}" title="${esc("COPILOT · " + t("videoTitle"))}" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  }
  return `<div class="vph" data-video-placeholder role="img" aria-label="${esc(t("videoPlaceholderAria"))}"><div class="vph-c"><span class="vph-ic">${ic("film")}</span><b>${esc(t("videoTitle"))}</b><span class="vph-meta">COPILOT${V.duration ? " · " + esc(V.duration) : ""}</span><span class="soon">${esc(t("videoSoon"))}</span></div></div>`;
}
const TECH = `<div class="tech-bg" aria-hidden="true"><span class="glow g1"></span><span class="glow g2"></span><span class="scan"></span></div>`;

/* ---------- 01 · Descubre (bloques localizados por chunk.key, no por su título) ---------- */
let CAPS = [];
function capPanel() {
  const c = CAPS[state.cap] || CAPS[0]; if (!c) return "";
  return `<p class="cap-k">${c.n} / ${pad(CAPS.length)}</p><h3 class="cap-t">${inline(c.lead)}</h3><p class="cap-d">${inline(c.desc)}</p>` +
    (c.ex ? `<div class="chat">${img("mascot-hug", "chat-av")}<p class="bubble">${inline(c.ex)}</p></div>` : "");
}
function renderDescubre(sec) {
  const ch = sec.chunks, get = key => ch.find(c => c.key === key) || { heading: "", blocks: [] };
  const ps = c => c.blocks.filter(b => b.t === "p");
  const hero = get("hero");
  const heroPs = ps(hero).filter(b => !BOLDONLY.test(b.x.trim())), stmt = ps(hero).filter(b => BOLDONLY.test(b.x.trim()));
  const hasVideo = !!V.src;
  let h = `<section class="hero dark" aria-labelledby="hero-title">${TECH}<div class="wrap hero-in">
    <div class="stage${hasVideo ? " has-video" : ""}" id="stage">
      <div class="stage-video">${videoHTML()}</div>
      <div class="stage-ov">
        <span class="eyebrow"><span class="dot"></span>${esc(t("welcome"))}</span>
        <h1 class="hero-h1" id="hero-title">${inline(hero.heading)}</h1>
        <div class="hero-lead">${heroPs.map(b => `<p>${inline(b.x)}</p>`).join("")}</div>
        ${hasVideo ? `<button type="button" class="play" data-play><span class="play-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span><span class="play-t">${esc(t("watchVideo"))}</span>${V.duration ? `<span class="play-d">${esc(V.duration)}</span>` : ""}</button>` : ""}
      </div>
    </div>
    <div class="hero-foot">${stmt.map(b => `<p class="statement">${inline(b.x.replace(/\*\*/g, ""))}</p>`).join("")}${img("mascot-point", "hero-mascot", t("mascotPoint"))}</div>
  </div></section>`;

  const que = get("what");
  h += `<section class="wrap block split" aria-labelledby="que-h"><h2 class="h2" id="que-h">${inline(que.heading)}</h2><div>${ps(que).map(b => `<p class="lede">${inline(b.x)}</p>`).join("")}</div></section>`;

  const caps = get("capabilities");
  CAPS = ps(caps).map((b, i) => {
    const ls = b.x.split("\n"), m = ls[0].match(/^\*\*([^*]+)\*\*\s*([\s\S]*)$/);
    return { n: pad(i + 1), lead: m ? m[1] : ls[0], label: m ? m[1].replace(/[.:]\s*$/, "") : ls[0], desc: m ? m[2] : "", ex: ls.slice(1).join("\n") };
  });
  if (state.cap >= CAPS.length) state.cap = 0;
  h += `<section class="band tech-light" aria-labelledby="caps-h"><div class="wrap block"><h2 class="h2" id="caps-h">${inline(caps.heading)}</h2><div class="caps">
    <div class="caps-list" role="group" aria-label="${esc(caps.heading)}">${CAPS.map((c, i) => `<button type="button" class="cap-btn" data-cap="${i}" aria-pressed="${i === state.cap}" aria-controls="cap-panel"><span class="cap-n">${c.n}</span><span class="cap-l">${esc(c.label)}</span></button>`).join("")}</div>
    <div class="cap-panel" id="cap-panel" aria-live="polite">${capPanel()}</div></div></div></section>`;

  const donde = get("where"), dIc = ["chat", "apps"];
  h += `<section class="wrap block" aria-labelledby="donde-h"><h2 class="h2" id="donde-h">${inline(donde.heading)}</h2><div class="grid2">${ps(donde).filter(b => BOLDLEAD.test(b.x)).map((b, i) => { const L = leadOf(b.x); return `<div class="kpi card"><span class="kpi-ic">${ic(dIc[i] || "layers")}</span><p class="kpi-t">${inline(L.lead)}</p><p>${inline(L.rest)}</p></div>`; }).join("")}</div>
    ${ps(donde).filter(b => !BOLDLEAD.test(b.x)).map(b => `<p class="help">${ic("info")}<span>${inline(b.x)}</span></p>`).join("")}</section>`;

  const con = get("connect"), ul = con.blocks.find(b => b.t === "ul"), sIc = ["grid", "globe", "upload"];
  h += `<section class="wrap block" aria-labelledby="con-h"><h2 class="h2" id="con-h">${inline(con.heading)}</h2>
    <div class="sources">${(ul ? ul.items : []).map((x, i) => { const L = leadOf(x); return `<div class="src"><span class="src-ic">${ic(sIc[i] || "layers")}</span><p class="src-t">${inline(L.lead)}</p><p class="src-d">${inline(L.rest)}</p></div>`; }).join("")}</div>
    <div class="merge" aria-hidden="true"></div><div class="hub">${img("mascot-hug", "")}<span>${esc(t("hub"))}</span></div>
    ${ps(con).map(b => `<div class="callout${b.tone === "warn" ? " warn" : ""}" role="note"><span class="co-ic">${ic(b.tone === "warn" ? "alert" : "info")}</span><p>${inline(b.x)}</p></div>`).join("")}</section>`;

  const ctrl = get("control");
  h += `<section class="wrap block" aria-labelledby="ctrl-h"><div class="control dark">${TECH}${img("mascot-wave", "ctrl-m", t("mascotWave"))}<div class="ctrl-b"><span class="pill">${esc(t("mostImportant"))}</span><h2 class="ctrl-h" id="ctrl-h">${inline(ctrl.heading)}</h2>
    ${ps(ctrl).map(b => BOLDONLY.test(b.x.trim()) ? `<p class="strong">${inline(b.x.trim().replace(/\*\*/g, ""))}</p>` : `<p>${inline(b.x)}</p>`).join("")}</div></div></section>`;

  const start = get("start");
  const lines = ps(start).flatMap(b => b.x.split("\n")), targets = start.targets || [];
  h += `<section class="wrap block" aria-labelledby="start-h"><h2 class="h2" id="start-h">${inline(start.heading)}</h2><div class="cta-grid cta-row">${lines.map((l, i) => {
    const m = l.match(/^\*\*([^*]+?):?\*\*:?\s*(.*)$/), go = SEC[targets[i]] ? targets[i] : "dia";
    const chips = SEC[go].subs.filter(s => !s.isLib).map(s => `<button type="button" class="mini-chip" data-go="${go}" data-sub="${s.id}">${ic(SUB_ICON[s.id], "ic")}<span>${esc(s.name)}</span></button>`).join("");
    return `<div class="cta"><button type="button" class="cta-main cta-card" data-go="${go}"><span class="cta-ic">${ic(SEC_ICON[go])}</span><span class="cta-t">${inline(m ? m[1] : l)}</span><span class="cta-d">${inline(m ? m[2] : "")}</span><span class="cta-arrow">${ic("arrow")}</span></button><div class="cta-chips" role="group" aria-label="${esc(t("shortcuts", { x: m ? m[1] : "" }))}">${chips}</div></div>`;
  }).join("")}</div></section>`;
  return h;
}

/* ---------- 02–05 · Secciones con subapartados ---------- */
function countLabel(sec, s) {
  const n = s.prompts.length;
  return n ? t(sec.id === "depto" ? "countCases" : "countPrompts", { n }) : "";
}
function curSub(sec) { const id = state.sub[sec.id]; return sec.subs.some(s => s.id === id) ? id : sec.subs[0].id; }
function selectorHTML(sec, cur) {
  const on = s => `aria-pressed="${s.id === cur}"`;
  if (sec.id === "aprende") {
    return `<ol class="path subnav" aria-label="${esc(t("pathAria", { x: sec.title }))}">${sec.subs.map((s, i) =>
      `<li><button type="button" class="path-b" data-sub="${s.id}" ${on(s)}><span class="path-n">${i + 1}</span><span class="path-t">${esc(s.name)}</span></button></li>`).join("")}</ol>`;
  }
  const label = t({ dia: "selApps", depto: "selDepts", mas: "selTools" }[sec.id] || "selApps");
  return `<div class="selgrid subnav sel-${sec.id}" role="group" aria-label="${esc(label)}">${sec.subs.map(s =>
    `<button type="button" class="selcard${s.isLib ? " is-lib" : ""}" data-sub="${s.id}" ${on(s)}><span class="sc-ic">${ic(SUB_ICON[s.id])}</span><span class="sc-n">${esc(s.name)}</span>${sec.id === "mas" && s.tagline ? `<span class="sc-tag">${esc(s.tagline)}</span>` : ""}${s.prompts.length ? `<span class="sc-c">${esc(countLabel(sec, s))}</span>` : ""}</button>`).join("")}</div>`;
}
function libHTML(group) {
  const lib = SEC.dia.lib, all = "__all";
  const g0 = group && LIB_GROUPS.includes(group) ? group : all;
  const chip = (g, label, n) => `<button type="button" class="chip" aria-pressed="${g === g0}" data-lib="${esc(g)}"><span>${esc(label)}</span><span class="chip-c">${n}</span></button>`;
  const chips = chip(all, t("libAll"), lib.length) + LIB_GROUPS.map(g => chip(g, g, lib.filter(p => p.group === g).length)).join("");
  const items = lib.filter(x => g0 === all || x.group === g0);
  return `<div class="libbar"><div class="chips" role="group" aria-label="${esc(t("libFilter"))}">${chips}</div></div><div class="nodes" id="lib-grid"><div class="blk blk-prompts">${promptGrid(items)}</div></div>`;
}
function detailHTML(sec, subId) {
  const idx = sec.subs.findIndex(s => s.id === subId), s = sec.subs[idx];
  const prev = sec.subs[idx - 1], next = sec.subs[idx + 1], cl = countLabel(sec, s);
  const nodes = s.nodes.slice(), intro = [];
  while (nodes.length && nodes[0].kind === "p" && !BOLDLEAD.test(nodes[0].x)) intro.push(nodes.shift());
  const libIntro = s.isLib ? `<p>${esc(t("libIntro"))}</p>` : "";
  /* Cabecera de ficha en rejilla: icono · textos · contador (en móvil: icono + contador arriba, textos a todo el ancho) */
  let h = `<header class="dhead dark">${TECH}<div class="dhead-top">
      <span class="dicon">${sec.id === "aprende" ? pad(idx + 1) : ic(SUB_ICON[s.id])}</span>
      ${cl ? `<span class="count-pill">${ic("copy")}<span>${esc(cl)}</span></span>` : ""}
      <div class="dhead-t"><p class="eyebrow-d"><span class="ed-n">${sec.num}</span><span class="ed-t">${esc(sec.title)}</span></p><h2 class="dtitle" id="dt-${sec.id}" tabindex="-1">${esc(s.name)}</h2>${s.tagline ? `<p class="dtag">${inline(s.tagline)}</p>` : ""}</div>
    </div>
    ${intro.length || libIntro ? `<div class="dintro">${libIntro}${intro.map(n => `<p id="${n.id}">${inline(n.x)}</p>`).join("")}</div>` : ""}
    ${s.toc.length >= 3 ? `<nav class="toc" aria-label="${esc(t("onThisPage"))}"><span class="toc-l">${esc(t("onThisPage"))}</span>${s.toc.map(x => `<a class="toc-a" href="#${x.id}" data-anchor="${x.id}">${esc(x.label)}</a>`).join("")}</nav>` : ""}</header>`;
  h += s.isLib ? libHTML(state.lib) : `<div class="nodes">${groupSteps(nodes).map(nodeHTML).join("")}</div>`;
  if (sec.id === "depto" && sec.note) h += `<div class="callout" role="note" style="margin-top:22px"><span class="co-ic">${ic("info")}</span><p>${inline(sec.note)}</p></div>`;
  h += `<nav class="pager" aria-label="${esc(t("pagerAria"))}">${prev ? `<button type="button" class="pg prev" data-sub="${prev.id}"><span class="pg-l">← ${esc(t("prev"))}</span><span class="pg-n">${esc(prev.name)}</span></button>` : ""}${next ? `<button type="button" class="pg next" data-sub="${next.id}"><span class="pg-l">${esc(t("next"))} →</span><span class="pg-n">${esc(next.name)}</span></button>` : ""}</nav>`;
  return h;
}
function renderWithSubs(sec) {
  const cur = curSub(sec); state.sub[sec.id] = cur;
  const it = sec.intro || {};
  return `<section class="sechead dark" aria-labelledby="h-${sec.id}">${TECH}<div class="wrap sechead-in"><div class="sechead-txt">
      <p class="kicker">${sec.num}</p><h1 class="sec-h1" id="h-${sec.id}">${esc(sec.title)}</h1>
      ${it.heading ? `<h2 class="sec-h2">${inline(it.heading)}</h2>` : ""}${(it.blocks || []).filter(b => b.t === "p").map(b => `<p class="sec-p">${inline(b.x)}</p>`).join("")}
    </div>${img(SEC_MASCOT[sec.id], "sec-m")}</div></section>
    <div class="wrap subwrap is-top sw-${sec.id}">${selectorHTML(sec, cur)}<article class="detail subbody" id="sb-${sec.id}" aria-labelledby="dt-${sec.id}">${detailHTML(sec, cur)}</article></div>`;
}
const renderPanel = sec => sec.id === "descubre" ? renderDescubre(sec) : renderWithSubs(sec);

/* ---------- Textos fijos de la plantilla ([data-i18n], [data-i18n-aria]) ---------- */
function applyStaticText() {
  const L = LANGS.find(l => l.code === state.lang);
  document.documentElement.lang = state.lang;
  document.documentElement.dataset.lang = state.lang;
  $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  const md = $('meta[name="description"]'); if (md) md.setAttribute("content", t("siteDescription"));
  $$("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $$("[data-i18n-placeholder]").forEach(el => { el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder)); });
  const lb = $("#lang-btn");
  if (lb && L) { $(".lang-code", lb).textContent = L.short; lb.setAttribute("aria-label", `${t("language")}: ${L.native}`); }
  renderLangMenu();
}

/* ---------- Selector de idioma (botón + menú de opciones; teclado completo) ---------- */
const langBox = $("#lang"), langBtn = $("#lang-btn"), langMenu = $("#lang-menu");
function renderLangMenu() {
  if (!langMenu) return;
  langMenu.setAttribute("aria-label", t("languageMenu"));
  langMenu.innerHTML = LANGS.map(l => {
    const cur = l.code === state.lang;
    return `<li role="none"><button type="button" role="menuitemradio" class="lang-opt" lang="${l.code}" data-lang="${l.code}" aria-checked="${cur}"${l.ready ? "" : ' aria-disabled="true"'} tabindex="-1">
      <span class="lo-code" aria-hidden="true">${l.short}</span><span class="lo-name">${esc(l.native)}</span>${l.ready ? "" : `<span class="lo-pend">${esc(t("languagePending"))}</span>`}${cur ? ic("ok", "ic lo-ok") : ""}</button></li>`;
  }).join("");
}
function openLang(focusIdx) {
  langBox.classList.add("open"); langBtn.setAttribute("aria-expanded", "true");
  const opts = $$(".lang-opt", langMenu), i = focusIdx ?? Math.max(0, opts.findIndex(o => o.dataset.lang === state.lang));
  opts[i]?.focus();
}
function closeLang(restore) { if (!langBox.classList.contains("open")) return; langBox.classList.remove("open"); langBtn.setAttribute("aria-expanded", "false"); if (restore) langBtn.focus(); }
function setLang(code) {
  if (!isReady(code) || code === state.lang) return false;
  state.lang = code; store.set("savi-copilot-lang", code);
  buildModel(CONTENTS[code]); mountAll(); applyStaticText(); route();
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: code } }));
  return true;
}
langBtn?.addEventListener("click", () => langBox.classList.contains("open") ? closeLang() : openLang());
langBtn?.addEventListener("keydown", e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); openLang(e.key === "ArrowUp" ? LANGS.length - 1 : undefined); } });
langMenu?.addEventListener("keydown", e => {
  const opts = $$(".lang-opt", langMenu), i = opts.indexOf(document.activeElement);
  const nx = { ArrowDown: (i + 1) % opts.length, ArrowUp: (i - 1 + opts.length) % opts.length, Home: 0, End: opts.length - 1 }[e.key];
  if (nx !== undefined) { e.preventDefault(); opts[nx].focus(); return; }
  if (e.key === "Escape") { e.preventDefault(); closeLang(true); }
  if (e.key === "Tab") closeLang();
});
langMenu?.addEventListener("click", e => {
  const o = e.target.closest(".lang-opt"); if (!o) return;
  if (o.getAttribute("aria-disabled") === "true") return;   // traducción pendiente: la opción se ve pero no se activa
  closeLang(true); setLang(o.dataset.lang);
});
document.addEventListener("click", e => { if (langBox && !langBox.contains(e.target)) closeLang(); });

/* ---------- Montaje y navegación ---------- */
const app = $("#app"), tabs = $("#tabs"), live = $("#live");
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const pid = id => "sec-" + id;   // los paneles NO usan el id del hash: así el navegador no hace scroll automático
function mountAll() {
  app.innerHTML = ""; tabs.innerHTML = "";
  C.sections.forEach(sec => {
    const p = document.createElement("section");
    p.className = "panel"; p.id = pid(sec.id); p.innerHTML = renderPanel(sec);
    p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "tab-" + sec.id);
    app.appendChild(p);
    const short = (tRaw("tabShort") || {})[sec.id] || sec.title;
    const b = document.createElement("button");
    b.type = "button"; b.className = "tab"; b.setAttribute("role", "tab"); b.dataset.id = sec.id;
    b.id = "tab-" + sec.id; b.setAttribute("aria-controls", pid(sec.id));
    b.setAttribute("aria-label", sec.title);   // nombre accesible completo aunque se vea la etiqueta corta
    b.innerHTML = `<span class="ico">${ic(SEC_ICON[sec.id])}</span><span class="n">${sec.num}</span><span class="full">${esc(sec.title)}</span><span class="short">${esc(short)}</span>`;
    tabs.appendChild(b);
  });
  fitTabs();
}
/* Pestañas: se mide (no se cuenta caracteres). Si los títulos completos no caben → etiquetas cortas;
   si aun así no caben → desplazamiento con degradado indicador. Ninguna sección queda oculta. */
function fitTabs() {
  tabs.classList.remove("compact", "scrolls");
  if (matchMedia("(max-width:760px)").matches) return;
  if (tabs.scrollWidth > tabs.clientWidth + 1) tabs.classList.add("compact");
  if (tabs.scrollWidth > tabs.clientWidth + 1) tabs.classList.add("scrolls");
}
let fitT; window.addEventListener("resize", () => { clearTimeout(fitT); fitT = setTimeout(fitTabs, 120); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTabs);
/* Rutas: #sec/sub (se acepta además un prefijo de idioma opcional: #en/sec/sub) */
function parseHash() {
  const parts = location.hash.slice(1).split("/").filter(Boolean);
  if (parts[0] && LANGS.some(l => l.code === parts[0])) parts.shift();
  return parts;
}
function route(push = true) {
  const sec = SEC[state.sec];
  $$("section.panel").forEach(p => { const on = p.id === pid(state.sec); p.classList.toggle("on", on); p.hidden = !on; });
  $$("button", tabs).forEach(b => { const on = b.dataset.id === state.sec; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
  if (push) { try { history.replaceState(null, "", "#" + state.sec + (state.sub[state.sec] ? "/" + state.sub[state.sec] : "")); } catch (e) {} }
  document.title = sec.title + " · " + t("siteTitle");
}
const headH = () => ($(".top")?.offsetHeight || 0);
const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
function scrollToEl(el, center) {
  if (!el) return;
  if (center) { el.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
  window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - headH() - 16), behavior: "smooth" });
}
function showSec(id, sub, opts = {}) {
  if (!SEC[id]) id = "descubre";
  const same = id === state.sec;
  state.sec = id;
  if (sub) state.sub[id] = sub;
  if (id !== "descubre") $("#" + pid(id)).innerHTML = renderPanel(SEC[id]);
  route();
  if (opts.target) { const el = document.getElementById(opts.target); flash(el); scrollToEl(el, true); }
  else if (sub && same && !opts.top) scrollToEl($("#sb-" + id));
  else toTop();
}
function setSub(secId, sub) {
  state.sub[secId] = sub;
  const sec = SEC[secId], panel = $("#" + pid(secId));
  $$(".subnav [data-sub]", panel).forEach(c => c.setAttribute("aria-pressed", c.dataset.sub === sub));
  $("#sb-" + secId).innerHTML = detailHTML(sec, sub);
  route();
  const sel = $(`.subnav [data-sub="${sub}"]`, panel);
  if (sel && sel.parentElement.scrollWidth > sel.parentElement.clientWidth) sel.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  const box = $("#sb-" + secId), top = box.getBoundingClientRect().top;
  if (top < headH() || top > innerHeight * .7) scrollToEl(box);
}
function flash(el) { if (!el) return; el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2600); }

tabs.addEventListener("click", e => { const b = e.target.closest("button"); if (b) showSec(b.dataset.id); });
/* Teclado (patrón de pestañas): ← → Inicio Fin mueven el foco y activan la pestaña */
tabs.addEventListener("keydown", e => {
  const list = $$("button", tabs), i = list.indexOf(document.activeElement);
  if (i < 0) return;
  const next = { ArrowRight: (i + 1) % list.length, ArrowLeft: (i - 1 + list.length) % list.length, Home: 0, End: list.length - 1 }[e.key];
  if (next === undefined) return;
  e.preventDefault(); list[next].focus(); showSec(list[next].dataset.id);
});

/* ---------- Copia ---------- */
function copyFrom(btn, txt, preEl) {
  const lbl = btn.querySelector("span") || btn;
  const reset = () => { lbl.textContent = t("copy"); btn.classList.remove("ok"); btn.querySelector("path")?.setAttribute("d", I.copy); };
  const done = () => { lbl.textContent = t("copied"); btn.classList.add("ok"); btn.querySelector("path")?.setAttribute("d", I.ok); live.textContent = t("copiedLive"); setTimeout(reset, 1600); };
  const fallback = () => {
    const ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (err) {}
    ta.remove();
    if (ok) { done(); return; }
    if (preEl) { const r = document.createRange(); r.selectNodeContents(preEl); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    lbl.textContent = t("copySelected"); live.textContent = t("copySelectedLive");
    setTimeout(reset, 2500);
  };
  (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(txt).then(done) : Promise.reject()).catch(fallback);
}

/* ---------- Buscador global ---------- */
const sroot = $("#search-root");
let lastFocus = null, sq = "";
const subItem = x => `<li><button type="button" class="sres" data-go="${x.sec}" data-sub="${x.sub}"><span class="ri-ic">${ic(SUB_ICON[x.sub])}</span><span class="sres-t"><b>${esc(x.name)}</b><small>${esc(x.secTitle)}${x.tagline ? " · " + esc(x.tagline) : ""}</small></span></button></li>`;
function searchResults(q) {
  const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) {
    const sugg = tRaw("searchSuggestions"); const list = Array.isArray(sugg) ? sugg : [];
    return `<p class="sov-h">${esc(t("searchTry"))}</p><div class="chips">${list.map(x => `<button type="button" class="chip" data-q="${esc(x)}">${esc(x)}</button>`).join("")}</div>
      <p class="sov-h">${esc(t("searchApps"))}</p><ul class="sov-subs">${SUBINDEX.filter(x => x.sec === "dia").map(subItem).join("")}</ul>
      <p class="sov-h">${esc(t("searchDepts"))}</p><ul class="sov-subs">${SUBINDEX.filter(x => x.sec === "depto").map(subItem).join("")}</ul>`;
  }
  const match = s => terms.every(w => s.includes(w));
  const subs = SUBINDEX.filter(x => match(x.norm)), ps = PROMPTS.filter(p => match(p.norm));
  let h = `<p class="sov-count">${esc(t("searchCountPrompts", { n: ps.length }))} · ${esc(t("searchCountCards", { n: subs.length }))}${ps.length > 40 ? " " + esc(t("searchShowing", { n: 40 })) : ""}</p>`;
  if (subs.length) h += `<p class="sov-h">${esc(t("searchCards"))}</p><ul class="sov-subs">${subs.slice(0, 12).map(subItem).join("")}</ul>`;
  if (ps.length) h += `<p class="sov-h">${esc(t("searchPrompts"))}</p><div class="sov-prompts">${ps.slice(0, 40).map(p => `<article class="pres"><div class="pres-top"><b>${inline(p.disp)}</b><small>${esc(p.where)}</small></div><p class="pres-x">${esc(p.x)}</p><div class="pres-act"><button type="button" class="copy" data-pid="${p.pid}">${ic("copy")}<span>${esc(t("copy"))}</span></button><button type="button" class="link-btn" data-goto="${p.pid}">${esc(t("viewInContext"))}</button></div></article>`).join("")}</div>`;
  if (!subs.length && !ps.length) h += `<div class="sov-empty">${img("mascot-wave", "")}<div><b>${esc(t("searchNone", { q }))}</b><p>${esc(t("searchNoneHint"))}</p></div></div>`;
  return h;
}
function openSearch() {
  lastFocus = document.activeElement; closeLang();
  sroot.innerHTML = `<div class="sov"><button type="button" class="sov-scrim" tabindex="-1" aria-label="${esc(t("searchClose"))}" data-search-close></button>
    <div class="sov-panel" role="dialog" aria-modal="true" aria-label="${esc(t("searchDialog"))}">
      <div class="sov-bar">${ic("search")}<label class="sr-only" for="sov-q">${esc(t("searchLabel"))}</label><input id="sov-q" class="sov-in" type="search" autocomplete="off" placeholder="${esc(t("searchOpen"))}" value="${esc(sq)}"><button type="button" class="sov-x" aria-label="${esc(t("searchClose"))}" data-search-close>${ic("x")}</button></div>
      <div class="sov-body" id="sov-body" aria-live="polite">${searchResults(sq)}</div></div></div>`;
  document.body.style.overflow = "hidden";
  const inp = $("#sov-q"); inp.focus(); inp.select();
  inp.addEventListener("input", () => { sq = inp.value; $("#sov-body").innerHTML = searchResults(sq); });
}
function closeSearch(restore = true) {
  if (!sroot.innerHTML) return;
  sroot.innerHTML = ""; document.body.style.overflow = "";
  if (restore && lastFocus && document.contains(lastFocus)) lastFocus.focus();
}
sroot.addEventListener("keydown", e => {
  if (e.key === "Escape") { e.preventDefault(); closeSearch(); return; }
  if (e.key === "Tab") {   // foco atrapado dentro del diálogo
    const f = $$(".sov-panel button, .sov-panel input", sroot).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

/* ---------- Delegación de eventos ---------- */
document.addEventListener("click", e => {
  const tg = e.target;
  if (tg.closest("#lang")) return;
  if (tg.closest("[data-search-open]")) { openSearch(); return; }
  if (tg.closest("[data-search-close]")) { closeSearch(); return; }
  const q = tg.closest("[data-q]");
  if (q) { sq = q.dataset.q; const inp = $("#sov-q"); inp.value = sq; inp.focus(); $("#sov-body").innerHTML = searchResults(sq); return; }
  const gt = tg.closest("[data-goto]");
  if (gt) { const p = PROMPTS.find(x => x.pid === gt.dataset.goto); closeSearch(false); if (p) showSec(p.sec, p.sub, { target: p.pid }); return; }
  const g = tg.closest("[data-go]");
  if (g) { const inSearch = !!g.closest("#search-root"); closeSearch(false); showSec(g.dataset.go, g.dataset.sub, { top: true }); if (inSearch || g.dataset.sub) $("#dt-" + state.sec)?.focus({ preventScroll: true }); return; }
  const s = tg.closest("[data-sub]");
  if (s) { setSub(state.sec, s.dataset.sub); if (s.classList.contains("pg")) $("#dt-" + state.sec)?.focus({ preventScroll: true }); return; }
  const l = tg.closest("[data-lib]");
  if (l) { state.lib = l.dataset.lib; const box = $("#sb-dia"); box.querySelector(".libbar").remove(); box.querySelector("#lib-grid").outerHTML = libHTML(state.lib); box.querySelector(`[data-lib="${CSS.escape(state.lib)}"]`)?.focus(); return; }
  if (tg.closest("[data-play]")) { playVideo(); return; }
  const cp = tg.closest("[data-cap]");
  if (cp) { state.cap = +cp.dataset.cap; $$("[data-cap]").forEach(b => b.setAttribute("aria-pressed", b === cp)); $("#cap-panel").innerHTML = capPanel(); return; }
  const a = tg.closest("[data-anchor]");
  if (a) { e.preventDefault(); scrollToEl(document.getElementById(a.dataset.anchor)); return; }
  const m = tg.closest(".pc-more");
  if (m) { const pre = m.parentElement.querySelector("pre"), open = m.getAttribute("aria-expanded") !== "true";
    pre.classList.toggle("clamp", !open); m.setAttribute("aria-expanded", open); m.textContent = t(open ? "showLess" : "showFull"); return; }
  const c = tg.closest(".copy");
  if (c) {
    const card = c.closest(".prompt"), pre = card && card.querySelector("pre");
    const p = PROMPTS.find(x => x.pid === c.dataset.pid);
    copyFrom(c, pre ? pre.textContent : (p ? p.x : ""), pre);
  }
});

/* ---------- Vídeo: capa superpuesta + API postMessage de Vimeo (sin scripts externos) ---------- */
const VIMEO = "https://player.vimeo.com";
function vimeo(method, value) {
  const f = $("#hero-video"); if (!f || !f.contentWindow) return;
  try { f.contentWindow.postMessage(JSON.stringify(value === undefined ? { method } : { method, value }), VIMEO); } catch (e) {}
}
function playVideo() {
  const st = $("#stage"); if (!st) return;
  st.classList.add("playing"); vimeo("play");
  const vid = $("video", st);   // vídeo local (<video>): reproducir al pulsar la capa
  if (vid) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); vid.focus(); }
  const f = $("#hero-video"); if (f) setTimeout(() => f.focus(), 400);
}
window.addEventListener("message", e => {
  if (e.origin !== VIMEO) return;
  let d = e.data; try { if (typeof d === "string") d = JSON.parse(d); } catch (err) { return; }
  if (!d || !d.event) return;
  if (d.event === "ready") { vimeo("addEventListener", "play"); vimeo("addEventListener", "ended"); }
  if (d.event === "play") $("#stage")?.classList.add("playing");
  if (d.event === "ended") $("#stage")?.classList.remove("playing");
});

window.addEventListener("hashchange", () => { const [s, sub] = parseHash(); if (s !== state.sec || (sub && sub !== state.sub[s])) showSec(s, sub, { top: true }); });

/* ---------- Arranque ---------- */
buildModel(CONTENTS[state.lang] || CONTENTS[I18N.fallback]);
mountAll();
applyStaticText();
const [h0, h1] = parseHash();
showSec(h0 || "descubre", h1, { top: true });
window.addEventListener("load", toTop);
