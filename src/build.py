#!/usr/bin/env python3
"""Genera copilot_savi.html a partir de:
  data/contenido_maestro.md  -> data/content.json  (contenido estructurado)
  data/video.json            -> configuración del vídeo hero
  styles.css, app.js, index.tmpl.html
Uso:  python3 -I src/build.py
Estructura: src/ (este script, app.js, styles.css, index.tmpl.html), src/data/, assets/
"""
import base64, json, pathlib, re

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
DATA = HERE / "data"

SECTIONS = [
    ("descubre", "01", "Descubre Copilot"),
    ("dia", "02", "Copilot en tu día a día"),
    ("depto", "03", "Copilot en tu departamento"),
    ("mas", "04", "Lleva Copilot más allá"),
    ("aprende", "05", "Aprende a utilizarlo bien"),
]
PRETTY = {
    "COPILOT APP": "Copilot App", "OUTLOOK": "Outlook", "TEAMS": "Teams", "EXCEL": "Excel",
    "WORD": "Word", "POWERPOINT": "PowerPoint", "SHAREPOINT": "SharePoint", "ONEDRIVE": "OneDrive",
    "COMERCIAL": "Comercial", "CUSTOMER SUCCESS": "Customer Success",
    "CUSTOMER CARE / CALL CENTER": "Customer Care / Call Center",
    "OPERACIONES Y VALIDACIÓN": "Operaciones y Validación",
    "FINANZAS Y ADMINISTRACIÓN": "Finanzas y Administración",
    "DIRECCIÓN Y RESPONSABLES": "Dirección y responsables",
    "RESEARCHER": "Researcher", "ANALYST": "Analyst", "NOTEBOOKS": "Notebooks",
    "PAGES": "Pages", "PLANNER": "Planner", "AGENTES": "Agentes",
}
# Ejemplos heredados que ya cubre el contenido maestro (evita duplicados)
SKIP_LEGACY = {
    "Priorizar la bandeja", "Traducir manteniendo el tono", "Traducir un documento",
    "Preguntar durante la reunión", "Sacar tareas después de la reunión",
    "Estado de un cliente o campaña", "¿Qué debería priorizar hoy?",
}


def slug(s):
    s = s.lower()
    s = s.translate(str.maketrans("áéíóúñü", "aeiounu"))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def parse_blocks(lines):
    blocks, i, n = [], 0, len(lines)
    while i < n:
        l = lines[i]
        s = l.strip()
        if not s or s == "---":
            i += 1
        elif l.startswith("### "):
            blocks.append({"t": "h3", "x": l[4:].strip()}); i += 1
        elif l.startswith(">"):
            q = []
            while i < n and lines[i].startswith(">"):
                q.append(lines[i][1:].lstrip()); i += 1
            blocks.append({"t": "prompt", "x": "\n".join(q).strip()})
        elif l.startswith("- "):
            items = []
            while i < n and lines[i].startswith("- "):
                items.append(lines[i][2:].strip()); i += 1
            blocks.append({"t": "ul", "items": items})
        elif re.match(r"^\d+\. ", l):
            items = []
            while i < n and re.match(r"^\d+\. ", lines[i]):
                items.append(re.sub(r"^\d+\. ", "", lines[i]).strip()); i += 1
            blocks.append({"t": "ol", "items": items})
        else:
            para = []
            while i < n and lines[i].strip() and lines[i].strip() != "---" and not (
                lines[i].startswith(("#", ">", "- ")) or re.match(r"^\d+\. ", lines[i])):
                para.append(lines[i].rstrip()); i += 1
            blocks.append({"t": "p", "x": "\n".join(para).strip()})
    return promote_titles(blocks)


def promote_titles(blocks):
    """Un párrafo solo en negrita justo antes de un prompt pasa a ser su título."""
    out = []
    for b in blocks:
        if b["t"] == "prompt" and out and out[-1]["t"] == "p":
            m = re.fullmatch(r"\*\*([^*]+)\*\*", out[-1]["x"].strip())
            if m:
                title = re.sub(r"^Prompt\s*[—-]\s*", "", m.group(1)).strip().rstrip(":")
                out.pop()
                b = dict(b, title=title)
        out.append(b)
    return out


def group_cards(blocks):
    """h3 seguido de un prompt (y opcionalmente 'Consejo') -> tarjeta de caso práctico."""
    out, i = [], 0
    while i < len(blocks):
        b = blocks[i]
        if b["t"] == "h3":
            j, has_q = i + 1, False
            while j < len(blocks) and blocks[j]["t"] != "h3":
                has_q = has_q or blocks[j]["t"] == "prompt"
                j += 1
            if has_q:
                title, _, app = b["x"].partition(" · ")
                card = {"t": "card", "title": title.strip(), "app": app.strip()}
                for k in blocks[i + 1:j]:
                    if k["t"] == "prompt":
                        card["x"] = k["x"]
                    elif k["t"] == "p" and k["x"].startswith("**Consejo:**"):
                        card["tip"] = k["x"].replace("**Consejo:**", "", 1).strip()
                out.append(card)
                i = j
                continue
        out.append(b); i += 1
    return out


def split_chunks(lines):
    chunks, cur = [], {"heading": None, "lines": []}
    for l in lines:
        if l.startswith("## "):
            chunks.append(cur)
            cur = {"heading": l[3:].strip(), "lines": []}
        else:
            cur["lines"].append(l)
    chunks.append(cur)
    return chunks


def sub_name(sec_id, heading):
    tagline = None
    if sec_id == "dia":
        m = re.match(r"^02\.[A-Z] · (.+?) — (.+)$", heading)
        name, tagline = m.group(1), m.group(2)
    elif sec_id in ("depto", "mas"):
        name, _, tagline = heading.partition(" — ")
        tagline = tagline or None
    else:
        name = re.sub(r"^\d+\.\s*", "", heading)
    return PRETTY.get(name.strip(), name.strip()), tagline


def parse_master(md):
    lines = md.split("\n")
    # secciones públicas 01..05
    starts = [i for i, l in enumerate(lines) if l.startswith("# ")]
    def body(pred):
        for k, i in enumerate(starts):
            if pred(lines[i]):
                end = starts[k + 1] if k + 1 < len(starts) else len(lines)
                return lines[i + 1:end]
        return []

    sections = []
    for sid, num, title in SECTIONS:
        raw = body(lambda l, num=num: l.startswith(f"# {num} ·"))
        chunks = split_chunks(raw)
        sec = {"id": sid, "num": num, "title": title}
        if sid == "descubre":
            sec["chunks"] = [{"heading": c["heading"], "blocks": parse_blocks(c["lines"])}
                             for c in chunks if c["heading"]]
        else:
            if sid == "depto":
                first = parse_blocks(chunks[0]["lines"])
                sec["intro"] = {"heading": None, "blocks": first}
                rest = chunks[1:]
            else:
                intro = chunks[1]
                sec["intro"] = {"heading": intro["heading"], "blocks": parse_blocks(intro["lines"])}
                rest = chunks[2:]
            subs, byname = [], {}
            for c in rest:
                name, tag = sub_name(sid, c["heading"])
                blocks = parse_blocks(c["lines"])
                if name in byname:  # p.ej. COMERCIAL aparece dos veces
                    byname[name]["blocks"] += blocks
                    continue
                s = {"id": slug(name), "name": name, "tagline": tag, "blocks": blocks}
                byname[name] = s; subs.append(s)
            if sid == "depto":
                for s in subs:
                    s["blocks"] = group_cards(s["blocks"])
                    for b in list(s["blocks"]):
                        if b["t"] == "p" and b["x"].startswith("**Nota transversal"):
                            sec["note"] = b["x"]; s["blocks"].remove(b)
            sec["subs"] = subs
        sections.append(sec)

    # Anexo A: ejemplos heredados (sin duplicar)
    anexo = body(lambda l: l.startswith("# ANEXO A"))
    library, i = [], 0
    while i < len(anexo):
        m = re.match(r"^### (.+) \((.+?) — (.+)\)$", anexo[i])
        if m:
            title, group, app = m.groups()
            q, tip, i = [], "", i + 1
            while i < len(anexo) and not anexo[i].startswith("### "):
                if anexo[i].startswith(">"):
                    q.append(anexo[i][1:].lstrip())
                elif anexo[i].startswith("**Nota heredada:**"):
                    tip = anexo[i].replace("**Nota heredada:**", "", 1).strip()
                i += 1
            if title not in SKIP_LEGACY:
                tip = tip.replace("; para responder, mira el truco de arriba", "")
                library.append({"t": "prompt", "title": title, "group": group, "app": app,
                                "x": "\n".join(q).strip(), "tip": tip})
        else:
            i += 1

    # Anexo B: validaciones internas, fuera de la web pública
    anexo_b = "\n".join(body(lambda l: l.startswith("# ANEXO B"))).strip()
    return {"sections": sections, "library": library}, anexo_b


# ---------------------------------------------------------------------------
# Anotación estructural (solo sobre el maestro en español).
# Añade claves neutras que app.js usa para maquetar SIN leer el texto:
#   chunk.key / chunk.targets (Descubre) · block.role / block.tone / block.tl / block.pending
# Las traducciones (data/content.<lang>.json) deben conservar estas claves y los "id".
# ---------------------------------------------------------------------------
RE_CALLOUT = re.compile(r"^\*\*(Ten en cuenta|Precaución|Importante|Aviso obligatorio|Nota transversal|Nota)\b")
RE_WARN = re.compile(r"^\*\*(Precaución|Aviso obligatorio)")
RE_BOLDLEAD = re.compile(r"^\*\*[^*]+\*\*")
CHUNK_KEYS = [(r"^¿Qué es", "what"), (r"^¿Qué puedes", "capabilities"), (r"^¿Dónde", "where"),
              (r"^¿Cómo se conecta", "connect"), (r"^Copilot te ayuda", "control"), (r"^¿Por dónde", "start")]
TL = {"Verde": "g", "Ámbar": "a", "Rojo": "r"}


def _lead(line):
    m = re.match(r"^\*\*([^*]+)\*\*", line)
    return re.sub(r"[.:]\s*$", "", m.group(1)) if m else ""


def annotate_blocks(blocks):
    for i, b in enumerate(blocks):
        nxt = blocks[i + 1] if i + 1 < len(blocks) else None
        if b["t"] == "h3" and "PENDIENTE" in b["x"]:
            b["pending"] = True
        if b["t"] == "ol" and all(x.strip().startswith("«") for x in b["items"]):
            b["role"] = "convo"
        if b["t"] != "p":
            continue
        x = b["x"]
        if RE_CALLOUT.match(x):
            b["role"], b["tone"] = "callout", ("warn" if RE_WARN.match(x) else "info")
            continue
        lines = x.split("\n")
        if len(lines) >= 2 and all(RE_BOLDLEAD.match(l) for l in lines):
            tl = [TL.get(_lead(l), "") for l in lines]
            if any(tl):
                b["tl"] = tl
            continue
        lead = _lead(x)
        if not lead:
            continue
        if lead.startswith("Poco específico") and nxt and nxt["t"] == "prompt":
            b["role"] = "compare"
        elif lead.startswith("Frases útiles"):
            b["role"] = "phrases"
        elif lead.startswith("Cómo ") and "; " in x:
            b["role"] = "howto"
        elif lead.startswith("Explora"):
            b["role"], b["tone"] = "note", "explore"
        elif lead.startswith("Ejemplo"):
            b["role"], b["tone"] = "note", "example"
        elif re.match(r"(Cierre|Uso posterior|Objetivo)", lead):
            b["role"], b["tone"] = "note", "accent"


def annotate(content):
    for sec in content["sections"]:
        if sec["id"] == "descubre":
            for k, c in enumerate(sec["chunks"]):
                c["key"] = "hero" if k == 0 else next((key for rx, key in CHUNK_KEYS if re.match(rx, c["heading"])), None)
                if c["key"] == "start":
                    lines = [l for b in c["blocks"] if b["t"] == "p" for l in b["x"].split("\n")]
                    c["targets"] = ["dia" if re.search(r"día a día", l, re.I) else "depto" for l in lines]
                annotate_blocks(c["blocks"])
        for sb in sec.get("subs") or []:
            annotate_blocks(sb["blocks"])
        if sec.get("intro"):
            annotate_blocks(sec["intro"]["blocks"])
    return content


def b64(path):
    path = pathlib.Path(path)
    mime = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml"}[path.suffix.lower()]
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


ASSETS = ROOT / "assets"   # imágenes ya optimizadas (WebP ≤440 px para las mascotas)
EMBED = ["mascot-point", "mascot-ipad", "mascot-notebook", "mascot-hold-side", "mascot-palm",
         "mascot-wave", "mascot-hug"]


def main():
    content, anexo_b = parse_master((DATA / "contenido_maestro.md").read_text(encoding="utf-8"))
    content = annotate(content)
    (DATA / "content.json").write_text(json.dumps(content, ensure_ascii=False, indent=1), encoding="utf-8")
    if anexo_b:   # el repositorio público no incluye el Anexo B (validaciones internas)
        (ROOT / "PENDIENTES_INTERNOS.md").write_text(
            "# Pendientes internos — Copilot con savi (NO publicar)\n\n" + anexo_b +
            "\n\nVer también `src/data/auditoria_global.md`.\n", encoding="utf-8")

    video = (DATA / "video.json").read_text(encoding="utf-8")
    css = (HERE / "styles.css").read_text(encoding="utf-8")
    js = (HERE / "app.js").read_text(encoding="utf-8")
    page = (HERE / "index.tmpl.html").read_text(encoding="utf-8")

    safe = lambda s: s.replace("</", "<\\/")
    # Idiomas: español = maestro; el resto, si existen data/content.<code>.json + i18n/ui.<code>.json
    I18N_DIR = HERE / "i18n"
    langs = json.loads((I18N_DIR / "languages.json").read_text(encoding="utf-8"))
    contents, ui = {"es": content}, {}
    for L in langs["languages"]:
        code = L["code"]
        f_ui = I18N_DIR / f"ui.{code}.json"
        if f_ui.exists():
            ui[code] = {k: v for k, v in json.loads(f_ui.read_text(encoding="utf-8")).items() if not k.startswith("_")}
        f_ct = DATA / f"content.{code}.json"
        if code != "es" and f_ct.exists():
            contents[code] = json.loads(f_ct.read_text(encoding="utf-8"))
    i18n = {"default": langs["default"], "fallback": langs["fallback"], "languages": langs["languages"], "ui": ui}
    blocks = []
    for code, ct in contents.items():
        attr = ' id="content"' if code == "es" else ""
        blocks.append(f'<script{attr} type="application/json" data-lang="{code}">{safe(json.dumps(ct, ensure_ascii=False))}</script>')

    page = (page.replace("{{CSS}}", css)
                .replace("{{LOGO}}", b64(ASSETS / "savi_logo_white.webp"))
                .replace("{{CONTENTS}}", "\n".join(blocks))
                .replace("{{I18N}}", safe(json.dumps(i18n, ensure_ascii=False)))
                .replace("{{VIDEO}}", safe(video))
                .replace("{{ASSETS}}", json.dumps({k: b64(ASSETS / f"{k}.webp") for k in EMBED}))
                .replace("{{JS}}", js))
    out = ROOT / "copilot_savi.html"
    out.write_text(page, encoding="utf-8")
    (ROOT / "index.html").write_text(page, encoding="utf-8")   # mismo archivo con el nombre que sirve GitHub Pages

    sec = {s["id"]: s for s in content["sections"]}
    print("HTML:", len(page) // 1024, "KB")
    print("apps:", [s["name"] for s in sec["dia"]["subs"]])
    print("deptos:", [s["name"] for s in sec["depto"]["subs"]])
    print("más allá:", [s["name"] for s in sec["mas"]["subs"]])
    print("aprende:", [s["name"] for s in sec["aprende"]["subs"]])
    n = lambda bl: sum(1 for b in bl if b["t"] in ("prompt", "card"))
    tot = sum(n(s["blocks"]) for k in ("dia", "depto", "mas", "aprende") for s in sec[k]["subs"])
    print("prompts/casos:", tot, "+ biblioteca:", len(content["library"]))
    print("idiomas con contenido:", list(contents), "· con textos de interfaz:", list(ui))


if __name__ == "__main__":
    main()
