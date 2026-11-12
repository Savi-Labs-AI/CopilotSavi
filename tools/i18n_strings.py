#!/usr/bin/env python3
"""Utilidades de traducción de contenido.

  python3 -I tools/i18n_strings.py extract            -> lista numerada de cadenas únicas del español
  python3 -I tools/i18n_strings.py apply <code>       -> genera src/data/content.<code>.json desde src/i18n/<code>.map.json

El mapa <code>.map.json es {cadena_es: cadena_traducida}. Solo se sustituyen los campos de texto
(title, heading, name, tagline, x, tip, app, group, note, items[]); ids, tipos y claves estructurales no se tocan.
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
TEXT_KEYS = {"title", "heading", "name", "tagline", "x", "tip", "app", "group", "note"}


def walk(node, fn):
    if isinstance(node, dict):
        return {k: (fn(v) if (k in TEXT_KEYS and isinstance(v, str)) else
                    [fn(i) if isinstance(i, str) else walk(i, fn) for i in v] if (k == "items" and isinstance(v, list)) else
                    walk(v, fn)) for k, v in node.items()}
    if isinstance(node, list):
        return [walk(i, fn) for i in node]
    return node


def unique_strings(content):
    seen, out = set(), []
    def grab(s):
        if s not in seen:
            seen.add(s); out.append(s)
        return s
    walk(content, grab)
    return out


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    es = json.loads((SRC / "data/content.json").read_text(encoding="utf-8"))
    if cmd == "extract":
        for i, s in enumerate(unique_strings(es)):
            print(f"[{i}] {s}")
    elif cmd == "apply" and len(sys.argv) == 3:
        code = sys.argv[2]
        mp = json.loads((SRC / f"i18n/{code}.map.json").read_text(encoding="utf-8"))
        missing = [s for s in unique_strings(es) if s not in mp]
        if missing:
            sys.exit(f"✗ faltan {len(missing)} cadenas en {code}.map.json, p. ej.: {missing[0][:80]!r}")
        out = walk(es, lambda s: mp[s])
        (SRC / f"data/content.{code}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"✓ content.{code}.json generado ({len(mp)} cadenas)")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
