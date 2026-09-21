# PROMPT 003 — Índice de Apuntes Unificado sin Códigos Duplicados (1.1, 1.3…) y Restricción del Índice a la Vista Apuntes

> **Versión:** v1.0 · **Fecha:** 2026-09-21 · **Autor:** puente (dpint)
> **Estado:** ✅ Implementado (v7.2) · **Depende de:** ninguno (independiente; compatible con PROMPT 002 y 001)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Corregir la experiencia del **ÍNDICE DE CÉDULAS** (barra lateral `#app-sidebar`) para que:

1. **No se repitan códigos** en el índice: hoy el mismo número de sección (p. ej. `1.1`, `1.3`) aparece varias veces porque cada archivo de apunte reinicia su numeración `Sección N.N`. El índice debe presentar **un código único por cédula**, ordenado de manera continua y completa, reflejando fielmente las secciones reales contenidas en los apuntes.
2. **El índice se muestre en una sola visual unificada y ordenada**, sin duplicados, conservando el agrupamiento por disciplina (Civil / Procesal / Constitucional) y por capítulo.
3. **El índice solo esté disponible en la vista Apuntes**: en las vistas **Casos** y **Grafo** la barra lateral del índice no debe poder abrirse ni mostrarse; el botón `#btn-toggle-sidebar` debe quedar oculto/deshabilitado fuera de la vista Apuntes. El índice existe exclusivamente para los apuntes, su orden y su navegación.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (§2.3 esquema de tópicos con el nuevo campo `indexCode`, §3.1 flujo de sincronización, §8 mapa de archivos y Bitácora de Versiones → próximo hito **v7.2**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`) en todo texto renderizado desde datos (incluidos los tooltips del índice).
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`) ni cambiar `id`, `code` ni `chapterNumber` de los tópicos.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

> "Antes de implementar el prompt 2, necesito un prompt: en el índice se repiten algunos puntos, habiendo 2 [veces] 1.1, 2 [veces] 1.3 y así. Que ello no se repita, que el índice sea acorde a las secciones contenidas en los apuntes, que se unifique una sola visual, unificando los contenidos de manera completa y ordenada, y que el índice no pueda abrirse en el menú de casos, solo esté disponible para los apuntes y su orden y navegación a través de él."

**Intención:** el usuario percibe el índice como **duplicado y desordenado** (misma numeración en varios apuntes) y quiere **una única lista coherente** donde cada cédula aparezca una sola vez con un código propio, alineada con lo que realmente contienen los apuntes; además quiere que ese índice pertenezca **exclusivamente a la vista de Apuntes**, no a Casos ni al Grafo.

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

**Datos (`all_afg_topics.json`, fuente: `generate_clean_notes_data.py`):**
- **53 tópicos en total:** `civil` = 34, `procesal` = 9, `constitucional` = 10.
- Los `code` provienen de los encabezados `Sección N.N` de cada apunte (regex en `extract_sections_from_file`, línea ~176 de `generate_clean_notes_data.py`).
- **Duplicados confirmados en `civil`:** códigos `1.1`–`1.7` repetidos entre archivos → `ACTO JURIDICO.md` (cap. 1: 1.1–1.7), `LOS BIENES.md` (cap. 2: 1.1–1.6), `LAS OBLIGACIONES.md` (cap. 3: 1.1–1.5 y cap. 4: 1.6–1.7), `CLASE_9_11.md` (caps. 5–8: 1.1–1.4, 2.1–2.3, 3.1–3.3, 4.1–4.4). `procesal` y `constitucional` no presentan duplicados.
- Los `id` **sí son únicos**: formato `{subject}-{clean_stem}-{code.replace('.','-')}` (p. ej. `civil-actojuridi-1-1`, `civil-losbienes-1-1`).
- Cada tópico incluye: `{id, subject, discipline, sectionName, chapterNumber, chapterTitle, category, code, title, cleanTitle, sourceFile, userSourceFiles, hasUserNotes, tags, isFree, content, charCount, connections}`.
- `main()` (línea ~337) reúne todas las secciones, inyecta `connections` desde `dogmatic_connections.json`, escribe `all_afg_topics.json` y `update_data_js()` regenera `js/data.js` (`INITIAL_DATA.topics`) **manteniendo intactos** `cases` y `graph`.

**Consumidores críticos de `code` (NO renumerar `code`):**
- `js/app.js` → `renderSidebar()` (línea ~672): badge `<span class="cedula-code-badge">§ ${t.code}</span>`; ordenación por `code` (líneas ~635–641).
- `js/app.js` → breadcrumb del visor (línea ~813): `Sección ${topic.code}`.
- `js/case-solver.js` → línea ~327: pill de cédulas vinculadas `§ ${t.code || ''} ${t.title}`.
- `test_e2e_case_flow.cjs` → secciones 9.5/9.6 (líneas ~697–735): exige `t.code === "1.1"` y `chapterNumber === 6` para un apunte subido con `Sección 1.1`/`1.2`. **Renumerar `code` rompería estas aserciones.**

**Sidebar global (gateo por vista):**
- `index.html` → `<aside id="app-sidebar" class="app-sidebar">` es un elemento **global** (fuera de las `.view-section`), con `sidebar-header` ("ÍNDICE DE CÉDULAS"), `.subject-filters` (`Todas`/`I. Civil`/`II. Proce.`/`III. Público`), `.coverage-filters` (solo admin), `.sidebar-meta-stats`, `#topics-tree-container` y `#sidebar-footer-admin`.
- `css/sidebar.css` → `.app-sidebar.collapsed` (ancho 0 / `translateX(-100%)` en escritorio; drawer off-canvas ≤ 1024px).
- `js/app.js` → `switchView(viewName)` (línea ~446) NO gestiona la barra lateral: solo tab activo + `.view-section` + `renderCurrentView()`. El toggle `#btn-toggle-sidebar` (botón de hamburguesa en `index.html`, línea ~47) abre/cierra la sidebar en **cualquier** vista (`setupNavigation`, líneas ~394–436), incluida `cases` y `graph`.
- `App.openTopic(topicId)` (línea ~466) navega al tópico y hace `switchView('topics')` si no está en esa vista.

## CAMBIOS A IMPLEMENTAR

### PARTE A — Parser: campo canónico único `indexCode` (`generate_clean_notes_data.py`)

Introducir un **índice canónico único por disciplina** que elimine la percepción de duplicados sin alterar `code`, `id` ni `chapterNumber`:

1. **Nuevo campo `indexCode` por tópico:** patrón `"N.N"` donde `N` = 1 para Civil, 2 para Procesal, 3 para Constitucional (mismo orden de `disciplineOrder` usado en `renderSidebar`), y la segunda componente es una secuencia `1..M` **continua dentro de la disciplina**, asignada tras ordenar los tópicos de forma determinista: `(chapterNumber asc, code con orden natural asc)`.
   - Ejemplo Civil: `civ-acto-1-1` → `1.1`, `civ-acto-1-7` → `1.7`, `civ-bienes-1-1` → `1.8`, …, último civil → `1.34`. Procesal → `2.1..2.9`. Constitucional → `3.1..3.10`.
   - **Estabilidad/idempotencia:** el algoritmo debe producir el mismo `indexCode` ante ejecuciones repetidas del parser (ordenamiento estable; ante empate de `(chapterNumber, code)`, mantener el orden de aparición en `FILES_CONFIG`/registro). Un `code` duplicado en un mismo archivo (fuera del índice descartado) nunca debe generar `indexCode` repetido en la disciplina.
2. **Determinación del orden de disciplinas:** derivar de `DISCIPLINE_MAP` (o del orden `civil → procesal → constitucional`) para que coincida con `renderSidebar`.
3. **Ubicación:** nueva función `assign_index_codes(all_sections)` invocada en `main()` **después** de inyectar `connections` y **antes** de escribir `all_afg_topics.json` / `update_data_js()`. Dicha función muta cada sección en el lugar (`sec["indexCode"] = ...`).
4. **Apuntes subidos por admin (PROMPT 001, ya implementado):** al regenerar, los tópicos nuevos entran al mismo ordenamiento canónico y reciben su `indexCode` (p. ej. un apunte con capítulo 6 se intercala por `chapterNumber`). No se requiere lógica especial.
5. **Retrocompatibilidad:** todo tópico sin `indexCode` (datos viejos en localStorage) debe poder renderizarse con fallback `t.indexCode || t.code`. El parser debe garantizar que **ningún tópico quede sin `indexCode`** tras la regeneración.

### PARTE B — Regeneración estática y sincronización (`all_afg_topics.json`, `js/data.js`)

1. Ejecutar el parser para regenerar ambos archivos con el campo `indexCode` en los 53 tópicos (sin alterar `cases` y `graph` de `js/data.js`).
2. `App.syncWithServer()` (`js/app.js`, línea ~307) ya hace merge por `id` conservando `mastered` y esparciendo los campos del servidor (`{ ...existing, ...st, mastered: existing.mastered }`); el nuevo campo fluye solo. **Verificar** que tras `GET /api/sync-topics` los tópicos locales exhiban `indexCode`.
3. Si `syncWithServer` detecta tópicos sin `indexCode` (estado previo persistido), el cliente debe **recalcular el fallback** de forma consistente (usar `indexCode || code`; no renumerar en cliente, solo mostrar).

### PARTE C — UI: badge único, ordenación y gateo por vista (`js/app.js`, `js/case-solver.js`, opcional `css/sidebar.css`)

1. **Badge del índice (`renderSidebar`, línea ~672):** mostrar `§ ${t.indexCode || t.code}`. Conservar el tooltip informativo: `title="${t.title}"` → ampliar a `Cédula ${t.indexCode} · Sección ${t.code} (${t.sourceFile})` escapado con `SecurityShield.escapeHtml`.
2. **Ordenación dentro del capítulo (líneas ~635–641):** priorizar `indexCode` cuando exista: `parseCode(t.indexCode || t.code)` (ya compatible con el patrón `N.N`). La ordenación de capítulos por `chapterNumber` no cambia.
3. **Breadcrumb del visor (línea ~813):** mostrar `Cédula ${topic.indexCode} — Sección ${topic.code} (${topic.sourceFile})` con fallback al comportamiento actual cuando falte `indexCode`.
4. **Pills de cédulas vinculadas (`js/case-solver.js`, línea ~327):** `§ ${t.indexCode || t.code} ${t.title}`.
5. **Gateo de la sidebar por vista (`switchView`):** nueva lógica en `App.switchView(viewName)` (sin romper `openTopic` ni `setupNavigation`):
   - `viewName === 'topics'`: restaurar el índice → quitar `.collapsed` de `#app-sidebar` (si fue ocultado por el gateo), ocultar `#sidebar-backdrop` y **mostrar** `#btn-toggle-sidebar`.
   - `viewName !== 'topics'` (Casos y Grafo): **ocultar el índice** → añadir `.collapsed` a `#app-sidebar`, ocultar `#sidebar-backdrop`, y **ocultar/deshabilitar** `#btn-toggle-sidebar` (p. ej. `classList.add('hidden')` + `aria-hidden="true"` y `disabled`), de modo que **no pueda abrirse** en esas vistas.
   - Usar un flag interno (p. ej. `this.sidebarHiddenByView`) para no sobrescribir un colapso manual hecho por el usuario en la vista Apuntes: al volver de Casos/Grafo, restaurar solo si fue el gateo quien lo ocultó.
   - Este gateo aplica también en móvil/drawer (≤ 1024px): al entrar a Casos/Grafo, el drawer debe quedar cerrado y el toggle oculto; al entrar a Apuntes, disponible.
6. **Regresión de `ConceptGraph`:** el handler actual del toggle en `setupNavigation` invoca `ConceptGraph.resizeCanvas()`/`setupData()` (líneas ~429–434) al alternar la sidebar en `graph`. Al ocultar el toggle en Grafo, verificar que el grafo **no dependa** de la sidebar para su tamaño/uso y que siga funcionando a pantalla completa; ajustar sin romper el viewport.

### PARTE D — SEGURIDAD (recordatorio obligatorio)

- Todo texto proveniente de `title`, `sourceFile`, `indexCode`, `code` y `cleanTitle` que se renderice en el DOM (badges, tooltips, breadcrumb, pills) debe pasar por `SecurityShield.escapeHtml` o asignarse vía `textContent` (son datos parcialmente derivados de apuntes de usuario).
- No se agregan endpoints nuevos; no se altera el Zero Exposure de `CASOS/1_PAUTAS_EVALUACION/` (HTTP 403 ya implementado).
- `indexCode` es derivado del contenido; no debe permitir inyección (es numérico generado, pero validar en render igualmente).

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **Ampliar `test_e2e_case_flow.cjs`** (nueva sección o ampliar sección 9) con:
   - **Unicidad:** para cada disciplina, los `indexCode` de `GET /api/sync-topics` son únicos (0 duplicados en civil = 34, procesal = 9, constitucional = 10) y se corresponden 1:1 con los tópicos existentes (`total === 53`).
   - **Continuidad y orden:** la secuencia `indexCode` por disciplina es `1.1..1.34`, `2.1..2.9`, `3.1..3.10` (o la que resulte), ordenada por `(chapterNumber, code)`.
   - **No regresión de `code`:** el apunte subido con `Sección 1.1/1.2` mantiene `code === "1.1"`/`"1.2"` y `chapterNumber === 6` (aserciones existentes intactas) y además recibe `indexCode` válido.
   - **Gateo por vista (si el entorno de la suite permite manipulación del DOM, como en secciones existentes):** `App.switchView('cases')` deja `#app-sidebar.collapsed` y `#btn-toggle-sidebar` oculto; `App.switchView('topics')` restaura. Si el entorno no expone el DOM de `App`, verificar al menos la ausencia de regresión en las suites y documentarlo en el hito.
   - **Fallback:** tópicos sin `indexCode` renderizan su `code` (no crash).
2. Ejecutar ambas suites y dejar **100 % PASS**: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs` (confirmar conteos actuales: 81 y 114 respectivamente; verificar en el momento de implementar).
3. **Actualizar `CONTEXT.md` SIEMPRE:** §2.3 (nuevo campo `indexCode` en el esquema de tópicos y regla de unicidad por disciplina), §3.1 (nota de gateo del índice a la vista Apuntes), §8 (responsabilidades de `generate_clean_notes_data.py` y `js/app.js` ampliadas), y Bitácora §9 → **v7.2** con fecha, alcance, archivos modificados y nº de pruebas aprobadas.

## DEFINITION OF DONE

- [ ] `generate_clean_notes_data.py` asigna `indexCode` único y ordenado por disciplina (patrón `N.N`), idempotente; `all_afg_topics.json` y `js/data.js` regenerados con los 53 tópicos provistos de `indexCode`.
- [ ] El sidebar muestra **un único código por cédula** (badge `§ indexCode`), capítulos ordenados por `chapterNumber` y cédulas por `indexCode`; 0 duplicados visuales de `1.1`/`1.3`/etc. en la vista Apuntes.
- [ ] Breadcrumb y pills de cédulas muestran `indexCode` con fallback a `code`, con tooltips escapados (`sourceFile` visible como nombre de archivo, sin rutas internas).
- [ ] **Gateo por vista:** en Casos y Grafo, `#app-sidebar` queda colapsada/oculta, `#sidebar-backdrop` oculto y `#btn-toggle-sidebar` oculto/deshabilitado (no se puede abrir el índice); en Apuntes se restaura. Colapso manual en Apuntes no se sobrescribe.
- [ ] `code`, `id` y `chapterNumber` intactos; `ConceptGraph` sigue funcionando.
- [ ] Suites **100 % PASS** (`test_unlock_auth_flow.cjs` y `test_e2e_case_flow.cjs`) incluyendo las nuevas aserciones de unicidad/orden/gateo.
- [ ] `CONTEXT.md` actualizado (§2.3, §3.1, §8 y Bitácora §9 v7.2).

## NOTAS PARA EL EJECUTOR

- **No renumerar `code`:** mantiene la fidelidad a las secciones reales de los apuntes ("acorde a las secciones contenidas en los apuntes") y no rompe las suites existentes. `indexCode` es la numeración canónica de exhibición/navegación.
- El gateo no afecta a `CaseSolver` (tiene su propio panel interno `cases-list-panel` en `#view-cases`); solo se oculta la barra global del índice.
- Compatibilidad con PROMPT 002: `indexCode` es un campo adicional del esquema de tópicos; si 002 se implementa antes, este hito **no debe** chocar con `TOPICS_INDEX`/`APUNTES_INDEX` (que indexan por `id`).
- Si al regenerar el parser cambia el orden natural de `CLASE_9_11.md` (caps. 5–8 con códigos 1.x–4.x), mantener el criterio `(chapterNumber, code natural)` y registrar el resultado real en CONTEXT.md.