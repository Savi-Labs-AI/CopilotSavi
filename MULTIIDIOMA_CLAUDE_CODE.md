# Copilot con savi — Preparación multidioma (v3.2 · fase de diseño cerrada)
## Guía para incorporar EN · IT · DE · PL con Claude Code

**Estado:** el diseño, la estructura y el contenido en español están cerrados para esta fase. La web ya funciona como **multidioma**: tiene el selector de idioma, los textos de interfaz separados del código, el contenido marcado con claves estructurales y la carga de varios idiomas. **Faltan solo las traducciones**: no hay que tocar el diseño ni la lógica de maquetación.

> Sustituye al documento anterior `INTEGRACION_CLAUDE_CODE.md` (v3.0), que ya está aplicado.

### Decisiones cerradas de esta fase
- **Diseño, estructura y contenido en español: cerrados.** La traducción debe conservar íntegramente el diseño y todas las funcionalidades.
- **El tagline corporativo «Digitize your incentives in a phygital world» se mantiene en inglés en los cinco idiomas.** Está fijo en la plantilla (`lang="en" translate="no"`) y **no** forma parte de `ui.<code>.json`.
- **Herramientas externas de SAVI:** se nombran Salesforce, Jira y **Offer Manager** en todas las secciones («¿Cómo se conecta con tu trabajo?» y «Lleva Copilot más allá → Agentes»). La antigua «Cool Tabs» ya no aparece en el contenido.
- **Idioma activo:** el español sigue activo de forma temporal. El inglés pasará a ser el predeterminado **en cuanto su traducción esté completa y validada**; no hace falta ningún cambio de código, solo añadir `content.en.json` y `ui.en.json` (ver §3).

---

## 1. Idiomas definidos

| Código | Nombre en el selector | Papel |
|---|---|---|
| `en` | English | **Idioma predeterminado** (en cuanto tenga traducción) |
| `es` | Español | Maestro aprobado · **idioma activo temporalmente** y respaldo |
| `it` | Italiano | Pendiente |
| `de` | Deutsch | Pendiente |
| `pl` | Polski | Pendiente |

Configuración: `src/i18n/languages.json` (`default: "en"`, `fallback: "es"`). El orden de la lista es el orden del selector. Los nombres se muestran siempre en su propio idioma y con su atributo `lang`, que es la práctica recomendada.

**Cuándo un idioma está disponible:** existen **a la vez** `src/data/content.<code>.json` (o el maestro, en el caso de `es`) y `src/i18n/ui.<code>.json`. Si falta alguno de los dos, el idioma aparece en el selector como **«Pendiente»** (`aria-disabled="true"`) y no se puede activar.

---

## 2. Archivos y flujo de construcción

```
src/
  data/contenido_maestro.md      ← español, fuente única del contenido aprobado
  data/content.json              ← generado (es) + claves estructurales (ver §4)
  data/content.<code>.json       ← NUEVO por idioma: traducción de content.json
  i18n/languages.json            ← idiomas, predeterminado y respaldo
  i18n/ui.es.json                ← textos de interfaz (es)
  i18n/ui.<code>.json            ← NUEVO por idioma
  build.py · app.js · styles.css · index.tmpl.html
tools/check_translation.py        ← valida que una traducción conserva la estructura
```

`python3 -I src/build.py`:
1. Genera `content.json` desde el maestro y lo **anota** con `annotate()` (solo sobre el español).
2. Incrusta en el HTML un `<script type="application/json" data-lang="<code>">` por cada idioma con contenido. El de español conserva `id="content"`.
3. Incrusta `#i18n` = `{ default, fallback, languages, ui: { <code>: {…} } }` con los `ui.<code>.json` existentes.
4. Informa: `idiomas con contenido: [...] · con textos de interfaz: [...]`.

**Flujo recomendado para cada idioma:**
1. Traducir `content.json` → `content.<code>.json` (reglas en §4).
2. Traducir `ui.es.json` → `ui.<code>.json` (reglas en §5).
3. Ejecutar `python3 -I tools/check_translation.py <code>`: debe dar ✓.
4. Ejecutar `python3 -I src/build.py` y revisar visualmente (checklist en §9).

> Si el maestro en español cambia, hay que regenerar `content.json` y actualizar las traducciones. `check_translation.py` detecta los desajustes de estructura.

---

## 3. Lógica de idioma ya implementada (`app.js`)

| Pieza | Comportamiento |
|---|---|
| Idioma inicial | Prefijo de idioma en la URL (`#en/...`) → elección guardada (`localStorage["savi-copilot-lang"]`) → `default` (en) → `fallback` (es). Solo se usa si el idioma está disponible. La elección **solo se guarda cuando la persona cambia de idioma en el selector**: quien visite la web mientras solo existe el español no queda «fijado» en español; cuando se publique el inglés, lo verá por defecto. |
| `setLang(code)` | Reconstruye el modelo con `CONTENTS[code]`, vuelve a pintar paneles y pestañas, aplica los textos fijos, conserva sección y ficha y emite `document` → `CustomEvent("langchange", {detail:{lang}})`. |
| `<html lang>` y `data-lang` | Se actualizan al cambiar de idioma. **Imprescindible**: el guionado automático (alemán, polaco) depende de `lang`. |
| Textos fijos de la plantilla | Atributos `data-i18n`, `data-i18n-aria` y `data-i18n-placeholder` → `applyStaticText()`. |
| Rutas | Se mantiene `#sec/sub`. El analizador ya acepta un prefijo de idioma opcional (`#de/dia/outlook`). **Pendiente de decidir:** si `route()` debe escribir el prefijo (enlaces compartibles por idioma). |
| Búsqueda | Indexa el idioma activo. Normaliza tildes y diéresis (NFD); `ł` se mantiene. Las sugerencias son `ui.searchSuggestions`. |
| Selector | Botón (globo + código) con menú `role="menu"` y opciones `menuitemradio`. Teclado: ↓ ↑ Inicio Fin Intro Esc Tab. Se cierra al pulsar fuera. En móvil el menú ocupa el ancho de la pantalla bajo la cabecera. |

---

## 4. Contrato del contenido traducido (`content.<code>.json`)

**Traducir solo** estos campos de texto: `title` (sección), `heading`, `name`, `tagline`, `x`, `items[]`, `title` / `app` / `tip` de los prompts, `group` (biblioteca), `note`.

**No tocar nunca:**
- `id` de secciones y subapartados: son las rutas y la clave de los iconos.
- `num`, `t` (tipo de bloque), el orden y el número de bloques e ítems.
- Las claves estructurales que añade `annotate()`:

| Clave | Dónde | Para qué |
|---|---|---|
| `chunk.key` | Descubre | `hero`, `what`, `capabilities`, `where`, `connect`, `control`, `start`: cada bloque de la portada se localiza por esta clave, no por su título |
| `chunk.targets` | Descubre › start | Destino (`dia` / `depto`) de cada línea de «¿Por dónde quieres empezar?» |
| `block.role` | p, ol | `callout`, `compare`, `phrases`, `howto`, `note`, `convo` |
| `block.tone` | p | `info`, `warn`, `explore`, `example`, `accent` |
| `block.tl` | p (semáforo) | `["g","a","r"]`: color de cada línea, sin leer «Verde/Ámbar/Rojo» |
| `block.pending` | h3 | Aviso «pendiente de validar» |

**Marcas de formato que se deben conservar** (la maquetación las usa en cualquier idioma):
- `**Negrita inicial**` al principio de párrafos e ítems: genera tarjetas y títulos de tarjeta. Si hay varias líneas, cada una conserva la suya.
- `**N. Título**` en los pasos numerados (Teams).
- Flechas `→` en los flujos (Método savi, Outlook → Word → PowerPoint).
- `(Apps)` entre paréntesis al final de la etiqueta en el recorrido Comercial.
- `;` como separador en los párrafos con `role: "howto"`: cada fragmento se convierte en un paso.
- Huecos `[entre corchetes]` en los prompts: se traducen (`[client]`, `[Kunde]`, `[klient]`), pero se mantienen los corchetes y su número.
- Citas en `role: "phrases"` y `"convo"`: vale cualquier convención tipográfica del idioma (`«…»`, `„…“`, `“…”`, `»…«`).
- La palabra `SAVI` en el texto se pinta como marca (**savi** en negrita cursiva) en cualquier idioma.

**Nombres de producto:** usar el nombre **oficial de Microsoft en cada idioma** (Researcher, Analyst, Notebooks, Pages, Agent Builder…). Hay que comprobarlos en la documentación de Microsoft 365 de cada idioma y no suponerlos.

**Revisión obligatoria por una persona nativa**, sobre todo de los matices de permisos, privacidad, licencias, el semáforo «pendiente de validar» y «Copilot te ayuda. Tú decides.».

---

## 5. Textos de interfaz (`ui.<code>.json`)

- Las claves son estables y los valores se traducen. Variables: `{n}`, `{q}` y `{x}` se conservan.
- **Plurales** con `Intl.PluralRules`: objetos `{one, few, many, other}`.
  - en / es / it / de: `one` y `other`.
  - **pl** necesita `one`, `few` y `many`. Ejemplo: `{"one":"{n} prompt","few":"{n} prompty","many":"{n} promptów","other":"{n} promptu"}`.
- `tabShort`: etiquetas cortas de las pestañas (móvil y escritorio estrecho). Conviene que tengan como mucho unas dos palabras.
- `searchSuggestions`: lista de palabras de búsqueda propias del idioma.
- El tagline corporativo **no se traduce** y no existe como clave en `ui.<code>.json` (decisión cerrada, ver arriba).

---

## 6. Qué se cambió para que el diseño no dependa del idioma

| Antes (v3.1) | Ahora (v3.2) |
|---|---|
| Portada localizada por títulos en español (`/^¿Qué es/`…) | `chunk.key` y `chunk.targets` |
| Avisos detectados por «Ten en cuenta / Precaución…» | `role: "callout"` + `tone` |
| Semáforo por «Verde / Ámbar / Rojo» | `block.tl` |
| «Pendiente» por la palabra PENDIENTE | `block.pending` |
| Tarjetas «Cómo…», «Explora», «Ejemplo», «Frases útiles», «Poco específico» por su texto | `role` + `tone` |
| Conversación por comillas «» | `role: "convo"` |
| Textos de interfaz escritos en el código | `t("clave")` + `ui.<code>.json` |
| Filtro de biblioteca `data-lib="Todos"` | `data-lib="__all"`: el valor «todos» ya no es una palabra; los grupos siguen usando su nombre traducido |
| Título del hero limitado a `12.5ch` | Ancho máximo en px y tamaño fluido (`clamp`) |

Las expresiones regulares en español se concentran **solo** en `build.py › annotate()`, que se ejecuta únicamente sobre el maestro en español.

---

## 7. Reglas de diseño para textos largos (ya aplicadas en `styles.css`)

- **Guionado** `hyphens: auto` en títulos, tarjetas, selectores y botones. Depende de `<html lang>`.
- **Cortes seguros:** `overflow-wrap: break-word` en general y `anywhere` en móvil, para compuestos alemanes muy largos.
- **Rejillas** con `minmax(0, 1fr)` y `min-width: 0` en hijos flexibles: una palabra larga no ensancha la página.
- **Botones, chips, pastillas y contadores** pueden ocupar dos líneas: no tienen alto fijo ni `nowrap`.
- **Pestañas medidas, no contadas.** `fitTabs()` comprueba si caben: si no caben los títulos completos usa `tabShort`; si tampoco, pasa a dos filas. Nunca se oculta una sección. En móvil, la barra inferior admite dos líneas y cada pestaña tiene `aria-label` con el título completo.
- **Hero:** la capa de texto va en el flujo de una rejilla sobre el vídeo. Si el texto crece, el bloque crece y nada se recorta.
- **Cabecera de ficha en móvil** (punto 4 del encargo): rejilla con icono y contador en la primera fila, y rótulo de sección, título y lema a todo el ancho debajo.
- **Botón de búsqueda:** el texto se recorta con «…» y el texto completo se mantiene para lectores de pantalla.

**Prueba de estrés realizada:** contenido e interfaz alargados un **+44 %**, con palabras compuestas de más de 25 caracteres, en 1440, 1024, 390 y 360 px. Resultado: sin desbordes horizontales, las 5 pestañas visibles, 68 botones de copia y ningún error de consola.

---

## 8. Tareas pendientes para Claude Code (fase de traducción)

1. Crear `ui.en.json` y `content.en.json` → `check_translation.py en` → build → **validación del inglés** (revisión nativa y QA de §9). Solo entonces se publica: al existir los dos archivos, el inglés pasa a ser el idioma inicial automáticamente. Mientras no estén validados, no se incluyen en `src/` (el español sigue activo).
2. Repetir con `it`, `de` y `pl`.
3. Decidir si `route()` escribe el prefijo de idioma en la URL (recomendado para compartir enlaces).
4. **Vídeo:** si se suben subtítulos a Vimeo, en `setLang()` cambiar el parámetro `texttrack=<code>` de la URL del iframe. Si el vídeo solo existe en un idioma, decidir qué mostrar en los demás.
5. Actualizar `<title>` y `meta description` por idioma (`document.title` ya usa `t("siteTitle")`).
6. Revisión nativa y aprobación de cada idioma antes de publicarlo.

---

## 9. Checklist de QA por idioma

- [ ] `check_translation.py <code>` ✓ y el build lista el idioma en «con contenido» y «con textos de interfaz».
- [ ] El selector muestra el idioma como disponible; al cambiarlo se conservan la sección y la ficha, y `<html lang>` cambia.
- [ ] 5 pestañas visibles en 1440, 1024, 390 y 360 px, sin desplazamiento horizontal.
- [ ] 68 botones «Copiar» (62 en fichas + 6 en la biblioteca); el texto copiado coincide con el traducido.
- [ ] Filtros de la biblioteca con sus recuentos; buscador con resultados y sugerencias del idioma.
- [ ] Plurales correctos (en polaco: 1, 2–4 y 5+).
- [ ] Avisos, semáforo «pendiente de validar» y «Copilot te ayuda. Tú decides.» presentes.
- [ ] Pie: el tagline sigue en inglés; Salesforce, Jira y Offer Manager nombrados igual en todas las secciones.
- [ ] Teclado: selector de idioma (↓ ↑ Intro Esc), pestañas (← → Inicio Fin), Esc en el buscador.
