#!/usr/bin/env python3
"""Comprueba que una traducción conserva la estructura del maestro en español.

Uso:  python3 -I tools/check_translation.py en
Compara src/data/content.json (es) con src/data/content.<lang>.json y src/i18n/ui.es.json con ui.<lang>.json.
Falla si cambia algo que la maquetación necesita: ids, número/orden/tipo de bloques, claves estructurales
(key, targets, role, tone, tl, pending), número de ítems, nº de líneas con **negrita inicial**, pasos **N.**,
flechas →, huecos [entre corchetes] de los prompts, o claves/variables de la interfaz.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
STRUCT = ("id", "t", "key", "targets", "role", "tone", "tl", "pending", "num")
errors = []


def err(path, msg):
    errors.append(f"{path}: {msg}")


def text_shape(s):
    """Rasgos del texto que la maquetación usa (independientes del idioma)."""
    lines = s.split("\n")
    return {
        "lines": len(lines),
        "boldlead": [bool(re.match(r"^\*\*[^*]+\*\*", l)) for l in lines],
        "boldonly": bool(re.fullmatch(r"\*\*[^*]+\*\*", s.strip())),
        "step": bool(re.match(r"^\*\*\d+\.", s)),
        "arrows": s.count("→"),
        "placeholders": len(re.findall(r"\[[^\]]+\]", s)),
    }


def compare(a, b, path="$"):
    if type(a) is not type(b):
        return err(path, f"tipo distinto ({type(a).__name__} → {type(b).__name__})")
    if isinstance(a, dict):
        for k in STRUCT:
            if a.get(k) != b.get(k):
                err(path, f"clave estructural «{k}» distinta: {a.get(k)!r} → {b.get(k)!r}")
        if set(a) != set(b):
            err(path, f"claves distintas: faltan {sorted(set(a) - set(b))}, sobran {sorted(set(b) - set(a))}")
        for k in a:
            if k in b and k not in STRUCT:
                compare(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list):
        if len(a) != len(b):
            return err(path, f"nº de elementos distinto: {len(a)} → {len(b)}")
        for i, (x, y) in enumerate(zip(a, b)):
            compare(x, y, f"{path}[{i}]")
    elif isinstance(a, str):
        sa, sb = text_shape(a), text_shape(b)
        for k in sa:
            if sa[k] != sb[k]:
                err(path, f"forma del texto distinta ({k}: {sa[k]} → {sb[k]})")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    lang = sys.argv[1]
    es = json.loads((SRC / "data/content.json").read_text(encoding="utf-8"))
    tr = json.loads((SRC / f"data/content.{lang}.json").read_text(encoding="utf-8"))
    compare(es, tr)
    ui_es = json.loads((SRC / "i18n/ui.es.json").read_text(encoding="utf-8"))
    f = SRC / f"i18n/ui.{lang}.json"
    if f.exists():
        ui = json.loads(f.read_text(encoding="utf-8"))
        for k, v in ui_es.items():
            if k.startswith("_"):
                continue
            if k not in ui:
                err(f"ui.{k}", "falta la clave")
                continue
            vars_es = set(re.findall(r"\{\w+\}", json.dumps(v, ensure_ascii=False)))
            vars_tr = set(re.findall(r"\{\w+\}", json.dumps(ui[k], ensure_ascii=False)))
            if vars_es != vars_tr:
                err(f"ui.{k}", f"variables distintas {sorted(vars_es)} → {sorted(vars_tr)}")
            if isinstance(v, dict) and set(v) - set(ui[k]) - {"one", "few", "many"}:
                err(f"ui.{k}", "faltan subclaves")
    else:
        err(f"i18n/ui.{lang}.json", "no existe")
    if errors:
        print(f"✗ {len(errors)} problemas en «{lang}»:")
        print("\n".join("  - " + e for e in errors[:200]))
        sys.exit(1)
    print(f"✓ «{lang}» conserva la estructura del maestro en español.")


if __name__ == "__main__":
    main()
