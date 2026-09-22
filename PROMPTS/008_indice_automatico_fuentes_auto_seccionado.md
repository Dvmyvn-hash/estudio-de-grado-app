# PROMPT 008 — Índice Automático en `fuentes/`: Suelta el `.md` y el Temario se Secciona, Numera y Ordena Solo

> **Versión:** v1.0 · **Fecha:** 2026-09-22 · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** `007_fuentes_canonicas_eliminar_subida_admin_regen_ci.md`

> Copia y pega este bloque completo como prompt inicial en tu agente de Antigravity IDE. Está redactado para ejecutarse dentro del repositorio `estudio-de-grado-app` (GRADOMANIACOS) conforme a las reglas de `AGENTS.md`.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa la funcionalidad descrita **respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio**.

## MISIÓN

Hacer que **depositar un archivo `.md` en la carpeta `fuentes/` sea el único acto necesario** para publicar apuntes: el sistema debe **descubrir automáticamente** el archivo (sin editar `FILES_CONFIG` ni ningún código), **seccionarlo solo** en cédulas `N.1`, `N.2`, `N.3`… (donde `N` es el módulo/capítulo detectado dentro del apunte desarrollado), **generar automáticamente los puntos del índice** de la Sección de Apuntes, **ordenarlos solo** en la página (por materia → módulo/capítulo → sección) y publicarlos con el flujo existente `git push` → CI → GitHub Pages. El humano **solo suelta el `.md`**; el resto es automático, determinista e idempotente.

## REGLAS OBLIGATORIAS DEL REPOSITORIO (ADEMÁS DEL CÓDIGO)

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Secciones 2.5, 3.1, Sección 8 mapa de archivos → `generate_clean_notes_data.py`, y Bitácora de Versiones Sección 9 → **v7.9**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; ampliar suites con pruebas de auto-descubrimiento y auto-seccionado.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. **No alterar la salida canónica actual:** los 6 apuntes oficiales (`ACTO JURIDICO.md`, `LOS BIENES.md`, `LAS OBLIGACIONES.md`, `CLASE_9_11.md`, `PROCESAL.md`, `CONSTITUCIONAL.md`) deben seguir arrojando **exactamente 53 tópicos (34 Civil / 9 Procesal / 10 Constitucional)** con los mismos `indexCode`. La auto-identificación aplica **solo a archivos nuevos** no declarados en `FILES_CONFIG`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `linkedFuentes`, flujo demo/desbloqueo, `/api/sync-topics`, `/api/fuentes`).
6. Guardrails de seguridad vigentes: sanitización XSS en el origen, path-traversal bloqueado, no exponer `CASOS/` ni secretos.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

"Quiero fortalecer la forma en que yo subo un apunte a la carpeta: que automáticamente se generen los puntos en el índice, que se seccione en 1.1, 1.2 en los apuntes desarrollados y así sucesivamente respecto del módulo desarrollado, que se puedan ordenar automáticamente en la página, y yo solo suba el `.md` en la carpeta `fuentes`." Es decir: cero pasos manuales entre "dejar el archivo" y "verlo publicado y ordenado".

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

- **`generate_clean_notes_data.py`:**
  - `FILES_CONFIG` (líneas ~16-109) es una **lista fija y manual** de 6 archivos con `file`, `subject`, `discipline`, `defaultCategory`, `defaultChapterNum` y `categoryMap` (mapeo manual código → categoría/capítulo).
  - `build_files_config()` (líneas ~117-124) retorna `copy.deepcopy(FILES_CONFIG)` **sin escanear la carpeta**: un `.md` nuevo depositado en `fuentes/` **NO se indexa** salvo que el humano edite `FILES_CONFIG`.
  - `extract_sections_from_file(cfg)` (líneas ~126-260): prioriza `fuentes/` y luego `Desktop/Fuentes_Grado/APUNTES`. Detecta encabezados con la regex `^(?:#{1,4}\s*\*{0,2}|\*{2})\s*Secci[oó]n\s*(\d+\.\d+)\s*[:–\-—]...`. **Sin encabezados `Sección N.N` genera UNA sola sección monolítica con `code = "1.1"`** (no secciona por módulos ni por headings Markdown).
  - `deduplicate_sections()` (v7.8): unicidad por tupla `(subject, chapterNumber, code)`; prevalece mayor `charCount`.
  - `assign_index_codes()` (líneas ~357-401): asigna `indexCode` continuo `N.M` por disciplina (Civil `1.x`, Procesal `2.x`, Constitucional `3.x`) ordenando por `(chapterNumber, parse_code_tuple(code), orig_idx)`. **El ordenamiento canónico de la página ya existe**; lo que falta es alimentarlo con archivos auto-descubiertos.
- **`server.py`:** `get_all_synced_topics()` (líneas ~530-564) importa `extract_sections_from_file, build_files_config, update_data_js, assign_index_codes, deduplicate_sections` desde `generate_clean_notes_data` → cualquier mejora del parser beneficia automáticamente la sincronización en vivo (`/api/sync-topics`).
- **`js/app.js`:** `App.renderSourcesList()` lista hoy los 6 nombres canónicos de `fuentes/` (v7.8). Debe pasar a listar dinámicamente lo que exista en `fuentes/`.
- **`js/case-generator-agent.js`:** `FUENTES_CORPUS` y `linkedFuentes.file` están remapeados a los 6 nombres canónicos (v7.8).
- **CI:** `.github/workflows/deploy-pages.yml` ya ejecuta `python3 generate_clean_notes_data.py` antes de publicar (v7.8): el flujo `git push` → página ya funciona.
- **`fuentes/`:** contiene únicamente los 6 archivos canónicos (sin `README.md` ni temporales).
- **Pruebas:** `test_deduplication_flow.cjs` afirma "exactamente 53 tópicos"; Sección 9 de `test_e2e_case_flow.cjs` afirma 6 fuentes canónicas y cobertura 34/9/10.

## CAMBIOS A IMPLEMENTAR

### PARTE A — Auto-descubrimiento de archivos (`generate_clean_notes_data.py`: `build_files_config()`)

1. **Escanear `fuentes/` en tiempo de ejecución:** nueva función `discover_fuentes_files(fuentes_dir=None)` que retorna la lista **ordenada alfabéticamente (case-insensitive)** de archivos `*.md` / `*.markdown` presentes en `fuentes/` **que no estén ya declarados en `FILES_CONFIG`** (comparación por nombre, insensible a mayúsculas — ver guardrail Windows abajo).
2. **`build_files_config()` = `deepcopy(FILES_CONFIG)` + config inferida para cada archivo descubierto:**
   - `file`: nombre exacto del archivo.
   - `subject`: **inferido por heurística de contenido** con orden de precedencia documentado. Propuesta mínima:
     - `constitucional`: cita de `Constitución`, `CPR`, `art. 19`, `art. 20`, `recurso de protección`, `amparo`, `Tribunal Constitucional`, `derechos fundamentales`, `garantías constitucionales`.
     - `procesal`: `Código de Procedimiento Civil`, `CPC`, `Código Orgánico de Tribunales`, `COT`, `juicio`, `incidente`, `recurso`, `demanda`, `prueba`, `tribunal`, `juzgado`, `carga de la prueba`, `casación`.
     - `civil` (fallback): cualquier otro caso (también si menciona `Código Civil`, `CC`, `acto jurídico`, `bienes`, `obligaciones`, `contrato`, `dominio`, `posesión`, `responsabilidad`, `nulidad`, `prescripción`).
     - Si no hay texto (archivo vacío) → `subject = "civil"` (default documentado).
   - `discipline`: `DISCIPLINE_MAP[subject]` (ya existente).
   - `defaultCategory`: primer encabezado `#` del archivo o, si no existe, `subject` capitalizado ("Derecho Civil", etc.).
   - `defaultChapterNum`: número del primer módulo/capítulo detectado (ver PARTE B) o `1` si el archivo no usa módulos. Documentar la regla elegida en `CONTEXT.md`.
   - `categoryMap`: `{}` (se resolverá automáticamente en `extract_sections_from_file`).
3. **Determinismo:** el orden de `discover_fuentes_files()` debe ser estable entre ejecuciones y entre CI/local (ordenar por `os.path.basename` en minúsculas antes de cualquier procesamiento). El resultado de `assign_index_codes()` para el set completo **debe ser idéntico local y en CI**.
4. **Guardrail Windows (`core.ignorecase=true`):** si un archivo descubierto coincide en stem con uno declarado en `FILES_CONFIG` pero difiere en mayúsculas (`procesal.md` vs `PROCESAL.md`), **omitir el descubierto, usar el nombre de `FILES_CONFIG` y loguear un warning** (evita colisiones de caso como las de v7.8).
5. **Ignorar ruido:** excluir `README.md`, archivos que empiecen con `~`, `.` u ocultos, y cualquier archivo cuyo contenido tenga < 50 caracteres (avisar con ALERTA y continuar).

### PARTE B — Auto-seccionado en cédulas `N.1`, `N.2`… (`generate_clean_notes_data.py`: `extract_sections_from_file()`)

Mantener 100 % intacto el comportamiento actual con encabezados explícitos `Sección N.N` (los 6 archivos canónicos dependen de él). Añadir, **en orden de precedencia**:

1. **Módulos explícitos → secciones automáticas:** detectar encabezados de módulo/capítulo con regex tipo `^(?:#{1,4}\s*)?(?:M[oó]dulo|Cap[ií]tulo|UNIDAD)\s*[:–—]?\s*(\d+)\s*[:–\-—]?\s*(.*)$` (IGNORECASE). Para cada módulo `N`, generar/renumerar sus secciones como `N.1`, `N.2`, `N.3`… y `chapterNumber = N`. Si dentro de un módulo existen encabezados `Sección X.Y` explícitos, **renumerarlos secuencialmente dentro del módulo** (`N.1`, `N.2`, …) para garantizar continuidad sin huecos (el `code` literal original pasa a `origCode` preservado en el objeto para trazabilidad).
2. **Headings Markdown como fronteras de sección:** si el archivo no tiene módulos ni `Sección N.N` explícitas pero sí encabezados `##`/`###`, cada encabezado de nivel `##` (o el primer `###` si no hay `##`) delimita una sección → códigos `1.1`, `1.2`, … (o `N.*` si se detecta un módulo en PARTE B.1). El título de la cédula = texto del heading.
3. **Fallback monolítico (sin estructura alguna):** conservar el comportamiento actual de una sola sección, pero numerada según el módulo detectado (`M.1` si existe `Módulo N`, si no `1.1`) en vez de `1.1` fijo.
4. **Regla de numeración posterior robusta (complemento a los ítems anteriores):** en todos los casos automáticos, tras extraer las secciones se renumero por capítulo para que la secuencia sea `N.1, N.2, …` **consecutiva y sin huecos**, y se recalcula `chapterTitle`/`category` desde el título del módulo (p. ej. `"Módulo 2: Derechos Fundamentales"` → `chapterTitle` y `category` coherentes). `id` = `{subject}-{stem}-{code-sin-puntos}` (mismo patrón existente).
5. **Compatibilidad total con «los puntos del índice»:** cada cédula generada conserva el esquema canónico completo (`id, subject, discipline, sectionName, chapterNumber, chapterTitle, category, code, indexCode, title, cleanTitle, sourceFile, userSourceFiles, hasUserNotes, tags, isFree, content, charCount, connections`). El índice del sidebar agrupa por disciplina → `chapterTitle` → `§ indexCode` y se ordena con la lógica existente (`parseCode`), por lo que **no se requieren cambios de UI** para ordenar: basta alimentar secciones correctas.

### PARTE C — Render dinámico (frontend)

1. `js/app.js` → `App.renderSourcesList()`: dejar de hardcodear los 6 nombres; renderizar dinámicamente la lista de archivos de `fuentes/` (fuente: el mismo `sources` que expone `/api/fuentes`, o `serverTopics` → set de `sourceFile`). En modo estático sin servidor, derivar del set de `sourceFile` en `INITIAL_DATA.topics`.
2. `js/case-generator-agent.js`: `FUENTES_CORPUS` y `linkedFuentes` deben **tolerar archivos desconocidos** (nombres no canónicos): mapeo *best-effort* por coincidencia de stem/id y, si no hay match, no romper la nutrición (omitir ese vínculo con log de advertencia). No es necesario predeclarar los archivos nuevos.
3. Sin cambios en el ordenamiento del sidebar (ya canónico vía `indexCode`), salvo verificación E2E.

### PARTE D — Sincronización en vivo y CI

1. `server.py` (`get_all_synced_topics()`): no requiere cambios de arquitectura (ya importa `build_files_config`), pero **verificar** que un archivo nuevo en `fuentes/` aparece en `/api/sync-topics` sin reiniciar el servidor y que `GET /api/fuentes` expone la lista actualizada de `fuentes/` (nombres reales en disco).
2. CI: no requiere cambios (ya regenera `python3 generate_clean_notes_data.py`). Documentar en `CONTEXT.md` el flujo final: soltar `.md` en `fuentes/` → (opcional) `python generate_clean_notes_data.py` para previsualizar → `git push` → publicación automática.
3. Asegurar que `update_data_js()` y `all_afg_topics.json` se regeneran correctamente con el nuevo set (sin perder `cases` ni `graph` de `js/data.js`).

### PARTE E — SEGURIDAD (recordatorio obligatorio)

- Solo se procesan archivos `.md`/`.markdown` de `fuentes/` (jamás `.py`, `.cjs`, ejecutables, etc.). Nunca ejecutar contenido de los apuntes.
- `sourceFile` se deriva de `Path(name).name` (nunca rutas absolutas) y se sanea contra path-traversal antes de inyectarse en token/visor (`SecurityShield.escapeHtml`).
- El contenido de los apuntes se renderiza con `MarkdownParser` y se escapa en tooltips/breadcrumbs/pills.
- La inferencia de `subject` no debe alterar el esquema de licencias (`isFree` se calcula con la regla existente `code in ["1.1","2.1"] and chap_num == 1`).

### PARTE F — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **`test_deduplication_flow.cjs`:** añadir aserciones de invariante:
   - `discover_fuentes_files()` sobre el repo actual devuelve `[]` (los 6 canónicos ya cubren todo) → no rompe el conteo de 53.
   - Fixture unitaria: crear un archivo temporal de prueba **fuera de `fuentes/`** (p. ej. `Temp/APUNTE_PRUEBA.md` con `Módulo 2` + 3 subtemas y otro sin estructura) y verificar: auto-descubrimiento por directorio parametrizado, auto-seccionado `2.1/2.2/2.3`, inferencia de `subject`, numeración sin huecos, monolitismo `1.1` para el archivo sin estructura, e idempotencia (2º procesamiento = mismo resultado). **No dejar archivos de prueba en `fuentes/`.**
2. **`test_e2e_case_flow.cjs` (Sección 9):** mantener "53 tópicos exclusivos de las fuentes canónicas" e "`/api/fuentes` con 6 fuentes" (sin cambios si no se agregan archivos al repo), y añadir un assert de contrato: las 53 cédulas tienen `code` e `indexCode` con formato `N.M` y `chapterNumber` coherente.
3. Ejecutar las 4 suites y dejar **100 % PASS**. Documentar en la bitácora el total.
4. **Actualizar `CONTEXT.md`:** Sección 2.5 (auto-descubrimiento y auto-seccionado como comportamiento canónico), Sección 3.1 (flujo «soltar `.md` → índice listo», regla de inferencia y de módulos), Sección 8 (responsabilidad ampliada de `generate_clean_notes_data.py`, nota dinámica en `js/app.js`), y **Bitácora Sección 9 → v7.9** con fecha, alcance, archivos modificados y nº de pruebas aprobadas.

## DEFINITION OF DONE

- [ ] Depositando un `.md` nuevo en `fuentes/` (sin tocar código), `python generate_clean_notes_data.py` lo descubre y genera sus cédulas `N.1, N.2, …` automáticamente, sin alterar las 53 cédulas canónicas existentes.
- [ ] Archivos con `Módulo N`/`Capítulo N` producen secciones numeradas según el módulo; archivos con solo `##` se seccionan como `1.1, 1.2…`; archivos sin estructura producen una sección monolítica con módulo detectado (o `1.1`).
- [ ] En la página, el índice muestra los puntos nuevos agrupados (materia → capítulo → `§ indexCode`) y ordenados automáticamente junto al temario existente, sin cambios manuales de orden.
- [ ] `App.renderSourcesList()` lista dinámicamente los archivos reales de `fuentes/`.
- [ ] El servidor en vivo (`/api/sync-topics`, `/api/fuentes`) refleja el archivo nuevo sin reiniciar.
- [ ] `git push` → CI regenera → GitHub Pages publica (flujo v7.8 intacto).
- [ ] Las 4 suites pasan al 100 % (53-topic invariante mantenido).
- [ ] `CONTEXT.md` actualizado (2.5, 3.1, 8) y Bitácora v7.9 registrada.
- [ ] `PROMPTS/README.md` indexa el 008 como ✅ Implementado (v7.9) al cierre.

## NOTAS PARA EL EJECUTOR

- No instales dependencias nuevas; el stack es vanilla (`http.server`, `sqlite3`, JS ES6 sin bundlers).
- **La regla de oro del repo:** los 6 canónicos son intocables en su salida (53 tópicos). El auto-descubrimiento es *aditivo*: solo agrega archivos no declarados.
- Decisión abierta a documentar en `CONTEXT.md`: `defaultChapterNum` cuando el archivo no declara módulos (recomendado: `1`, salvo que el archivo detecte un módulo explícito).
- La heurística de `subject` es un punto de ajuste: implementar con pesos simples de conteo de keywords y umbral mínimo, y documentar el orden de precedencia exacto para que sea reproducible y testeable.
- Respeta la nomenclatura jurídica chilena (cédula, capítulo, sección `N.N`, materias `civil|procesal|constitucional`) y los toasts/mensajes en español.