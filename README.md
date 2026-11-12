# Copilot con savi

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
