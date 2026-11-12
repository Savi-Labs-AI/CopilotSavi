#!/usr/bin/env python3
"""Prepara una copia LIMPIA del proyecto para el repositorio público de GitHub.

Uso:  python3 -I tools/export_github.py <carpeta_destino>

- Copia solo una lista blanca de archivos (sitio generado, código, traducciones, herramientas).
- NO copia: copias de seguridad, paquete de traspaso, MP4, PENDIENTES_INTERNOS, auditoría interna,
  informes de investigación ni imágenes sueltas.
- Depura el contenido maestro en español: quita las notas editoriales de cabecera y el Anexo B
  (validaciones internas con IT/DPO). Después reconstruye en destino y comprueba que el resultado
  es idéntico al sitio local.
- Respeta el .git del destino (se puede ejecutar de nuevo para sincronizar cambios).
"""
import filecmp, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

FILES = [
    "index.html", "MULTIIDIOMA_CLAUDE_CODE.md",
    "src/app.js", "src/styles.css", "src/index.tmpl.html", "src/build.py",
    "src/data/content.json", "src/data/content.en.json", "src/data/video.json",
    "tools/check_translation.py", "tools/i18n_strings.py", "tools/export_github.py",
]
DIRS = ["assets", "src/i18n"]   # se copian enteras

README = """# Copilot con savi

Guía interna de **savi** para aprender a usar Microsoft 365 Copilot: aplicaciones, casos prácticos por
departamento, prompts copiables y buenas prácticas. Un único `index.html` autocontenido.

- **Idiomas:** English (predeterminado) y Español. Italiano, alemán y polaco: infraestructura preparada, sin traducir.
- **Estructura:** 5 secciones · 8 aplicaciones · 6 departamentos · 68 prompts (62 en fichas + 6 en «Más prompts»).
- **Vídeo de bienvenida:** configurable en `src/data/video.json`.

## Reconstruir

```bash
python3 -I src/build.py                    # genera index.html (y copilot_savi.html, que no se versiona)
python3 -I tools/check_translation.py en   # valida que una traducción conserva la estructura
```

## Archivos

| Ruta | Qué es |
|---|---|
| `index.html` | La web generada (la sirve GitHub Pages) |
| `src/data/contenido_maestro.md` | Contenido en español (fuente única) |
| `src/data/content.en.json` · `src/i18n/` | Traducción al inglés y textos de interfaz |
| `src/app.js` · `styles.css` · `index.tmpl.html` · `build.py` | Funciones, diseño y generación |
| `tools/` | Verificación de traducciones y exportación |
| `MULTIIDIOMA_CLAUDE_CODE.md` | Guía para añadir idiomas |

El tagline *Digitize your incentives in a phygital world* se mantiene en inglés en todos los idiomas.
"""

GITIGNORE = "copilot_savi.html\nPENDIENTES_INTERNOS.md\n.DS_Store\n__pycache__/\n"


def sanitize_master(text):
    lines = text.split("\n")
    i01 = next(i for i, l in enumerate(lines) if l.startswith("# 01 ·"))
    end = next((i for i, l in enumerate(lines) if l.startswith("# ANEXO B")), len(lines))
    body = "\n".join(lines[i01:end]).rstrip()
    body = body.rstrip("-").rstrip()   # quita el '---' final antes del Anexo B
    # párrafo editorial del Anexo A -> frase neutra (build.py solo lee los '### ...')
    body = re.sub(r"(# ANEXO A[^\n]*\n\n)(.*?)(\n###)", r"\1Ejemplos adicionales de la biblioteca «Más prompts».\n\3", body, count=1, flags=re.S)
    return "# COPILOT CON SAVI — CONTENIDO MAESTRO\n\n" + body + "\n"


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    dest = pathlib.Path(sys.argv[1]).expanduser().resolve()
    if dest == ROOT or ROOT in dest.parents:
        sys.exit("✗ El destino no puede estar dentro del proyecto.")
    dest.mkdir(parents=True, exist_ok=True)

    # 1) limpiar lo que no sea .git (para que los borrados también se sincronicen)
    for p in dest.iterdir():
        if p.name == ".git":
            continue
        shutil.rmtree(p) if p.is_dir() else p.unlink()

    # 2) copiar lista blanca
    for f in FILES:
        (dest / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / f, dest / f)
    for d in DIRS:
        shutil.copytree(ROOT / d, dest / d, ignore=shutil.ignore_patterns(".DS_Store", "*.batch*.json"))
    (dest / "src/data").mkdir(parents=True, exist_ok=True)
    (dest / "src/data/contenido_maestro.md").write_text(
        sanitize_master((ROOT / "src/data/contenido_maestro.md").read_text(encoding="utf-8")), encoding="utf-8")
    (dest / "README.md").write_text(README, encoding="utf-8")
    (dest / ".gitignore").write_text(GITIGNORE, encoding="utf-8")

    # 3) reconstruir en destino y comprobar que coincide con el sitio local
    keep_index = (dest / "index.html").read_bytes()
    subprocess.run([sys.executable, "-I", str(dest / "src/build.py")], check=True, stdout=subprocess.DEVNULL)
    same_site = (dest / "index.html").read_bytes() == (ROOT / "index.html").read_bytes()
    same_content = filecmp.cmp(dest / "src/data/content.json", ROOT / "src/data/content.json", shallow=False)
    leaks = [p for p in ("PENDIENTES_INTERNOS.md", "src/data/auditoria_global.md") if (dest / p).exists()]
    (dest / "copilot_savi.html").unlink(missing_ok=True)   # lo regenera el build; no se versiona

    print(f"destino: {dest}")
    print("  index.html reconstruido == local:", "✓" if same_site else "✗")
    print("  content.json reconstruido == local:", "✓" if same_content else "✗")
    print("  archivos internos presentes:", leaks or "ninguno ✓")
    if not (same_site and same_content) or leaks or keep_index != (dest / "index.html").read_bytes() and not same_site:
        sys.exit("✗ La exportación no coincide con el proyecto local: revisar antes de subir.")


if __name__ == "__main__":
    main()
