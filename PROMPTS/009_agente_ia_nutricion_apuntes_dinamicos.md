# PROMPT 009 — El Agente de IA se Nutre en Vivo de los Apuntes Dinámicos de `fuentes/` (Corpus Dinámico, Citas Corpus-Driven y Validador Integrado)

> **Versión:** v1.0 · **Fecha:** 2026-09-22 · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** `008_indice_automatico_fuentes_auto_seccionado.md`

> Copia y pega este bloque completo como prompt inicial en tu agente de Antigravity IDE. Está redactado para ejecutarse dentro del repositorio `estudio-de-grado-app` (GRADOMANIACOS) conforme a las reglas de `AGENTS.md`.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa la funcionalidad descrita **respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio**.

## MISIÓN

Garantizar que el **Agente de IA (`js/case-generator-agent.js`) se nutra correctamente y en vivo de los apuntes** tras la incorporación de los cambios de `fuentes/` y del PROMPT 008 (auto-descubrimiento de archivos, auto-seccionado `N.1, N.2…` y ordenamiento automático). Concretamente:

1. **Corpus dinámico:** cuando un `.md` nuevo (no canónico) aparece en `fuentes/` y genera cédulas nuevas, el agente debe **incorporar esas cédulas a su nutrición en tiempo real** — con `rules` y `doctrine` derivadas del contenido real (cero contenido de memoria), no solo el nombre del archivo.
2. **Integridad de citas corpus-driven:** `assertCitationIntegrity()` debe validar citas contra **las fuentes reales** (canónicas + dinámicas), sustituyendo el whitelist estático como única fuente de verdad, para que los módulos nuevos no produzcan falsos rechazos ni se acepten citas inventadas.
3. **Vinculación viva de cédulas:** los `linkedTopics`/`linkedApuntes` (píldoras `.btn-linked-apunte`, salto `data-goto-topic`) deben resolver contra el `APUNTES_INDEX` en vivo — y contra la convención de IDs de PROMPT 008 (`{subject}-{stem}-{code-sin-puntos}`).
4. **Cero regresión:** los 13 arquetipos existentes, los 6 apuntes canónicos y las 53 cédulas (34/9/10) permanecen 100 % operativos, con las 4 suites al 100 % PASS.

## REGLAS OBLIGATORIAS DEL REPOSITORIO (ADEMÁS DEL CÓDIGO)

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Secciones 2.5 y 3.1 → convención de IDs y corpus dinámico; Sección 8 → responsabilidad ampliada de `js/case-generator-agent.js`; Bitácora Sección 9 → **v7.9**, ejecutada en conjunto con el PROMPT 008).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; ampliar la Sección 23 de `test_e2e_case_flow.cjs` con la nutrición dinámica.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. **No romper contratos existentes:** `INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `linkedFuentes`, `linkedApuntes`, campos `pauta`/`errorFatalDeGrado`/`officialRubric`/`modelSolution`, flujo demo/desbloqueo.
5. Sanitización en el origen (`SecurityShield.escapeHtml`/`MarkdownParser`), `sourceFile` sin separadores, cero path-traversal, cero ejecución de contenido de apuntes.
6. Si el PROMPT 008 aún no está ejecutado, implementar este PROMPT suponiendo su contrato (funciones de auto-descubrimiento/seccionado) con **fallback defensivo** si alguna no existiera.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

"Debido a los cambios realizados en `fuentes` y en razón de que el agente de IA se nutre — o tiene indicado que se nutra — de los apuntes, dame un prompt para que todo ello funcione debidamente con la incorporación del PROMPT 008." Es decir: el agente debe **comer del mismo plato** que el índice: si el humano deja un `.md` en `fuentes/`, ese contenido debe nutrir la generación de casos y la verificación de citas, sin mantener el "conocimiento del agente" desincronizado del repositorio.

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

- **`js/case-generator-agent.js`:**
  - `FUENTES_CORPUS` (líneas ~23-61): corpus **estático** claveado por los 6 nombres canónicos (`ACTO JURIDICO.md`, `LOS BIENES.md`, `LAS OBLIGACIONES.md`, `CLASE_9_11.md`, `PROCESAL.md`, `CONSTITUCIONAL.md`) con `{ title, sections: [{name, rules, doctrine}] }`. Es el respaldo de `resolveLinkedFuente()`.
  - `syncFuentesFromServer()` (~63-73): `fetch("/api/fuentes")` → `serverFuentes`.
  - `resolveLinkedFuente(fuenteRef)` (~75-123): 4 pasos → (1) coincidencia directa en `FUENTES_CORPUS`; (2) *best-effort* insensible a mayúsculas/stem; (3) contra `serverFuentes` (devuelve `file/section/rules` **tal cual, sin derivar contenido**); (4) warning y `null` para desconocidos.
  - `TOPICS_INDEX`/`APUNTES_INDEX` (~125-126), `syncApuntesFromServer()` (~128-168): puebla desde `window.INITIAL_DATA.topics`, luego `fetch("/api/sync-topics")`, luego (Node) lectura de `all_afg_topics.json`. `populateApuntesIndex()` (~170-186) mapea tópico → `{ id, indexCode, title, subject, sourceFile }` (**descartando `content`, `rules`, `code`**).
  - `invalidateApuntes()` (~188-192) y `getLinkedApuntesForArchetype(arch)` (~194-221): matchea `arch.linkedTopics[].id` contra `APUNTES_INDEX` por id; si no existe, devuelve el ítem con `sourceFile: ""` (sin sanear contra el índice vivo).
  - `assertCitationIntegrity(caseObj)` (~223-292): regex `Art(s). N [N°|inc] (CC|CPC|COT|CPR|…)` y **whitelist estático `validNorms`** (~250-269) de artículos por código. Un módulo nuevo con cita legal no listada → **falso error "Cita legal no verificada en fuentes oficiales"** y el caso queda marcado inválido.
  - `validateGeneratedCase(caseObj)` (~294-378): exige `linkedTopics` ≥ 1 y array `linkedApuntes` con `sourceFile` saneado (bloqueo de separadores `/` o `\`). No verifica que los ids existan en el índice vivo.
  - Generación (~3308-3343): `linkedApuntes = getLinkedApuntesForArchetype(...)`, `linkedFuentes = resolveLinkedFuente(...)`, y luego `validateGeneratedCase` + `assertCitationIntegrity`.
- **`js/app.js`:** `App.startLiveSync()` ya invoca `CaseGeneratorAgent.syncFuentesFromServer()` + `syncApuntesFromServer()` al arranque (~198-202) y `invalidateApuntes()` + `syncApuntesFromServer()` tras un cambio de hash (`syncWithServer`, ~361-365). El ciclo de re-nutrición en vivo **ya está cableado**; falta que la nutrición use contenido real y que el validador sea corpus-driven.
- **`js/case-solver.js`:** renderiza las píldoras `.linked-apuntes-section`/`.btn-linked-apunte` con `[data-goto-topic]` (salto directo a `App.openTopic`).
- **PARSER (PROMPT 008 previsto):** `build_files_config()` escaneará `fuentes/` (auto-descubrimiento) y `extract_sections_from_file()` generará cédulas `N.1, N.2…` con ids `{subject}-{stem}-{code-sin-puntos}`, `indexCode` canónico `N.M` por disciplina, y campos `content`, `code`, `chapterNumber`, `chapterTitle`, `category`. Las cédulas viajan en `/api/sync-topics` y en `INITIAL_DATA.topics`.

## CAMBIOS A IMPLEMENTAR

### PARTE A — Corpus dinámico real (`FUENTES_CORPUS` evoluciona a seed + aumento en vivo)

1. **Mantener `FUENTES_CORPUS` como seed canónico** (los 6 archivos; imprescindible como fallback en modo estático GitHub Pages sin servidor). Renombrar conceptualmente `this.corpusSeed = this.FUENTES_CORPUS` (o mantener el nombre, documentándolo) y añadir:
   - `this.DYNAMIC_CORPUS = {}` → clave = `sourceFile` real; valor = `{ file, sections/cedulas }`.
   - `this.corpusSources = null` → lista ordenada de archivos de `fuentes/` según `/api/fuentes`.
2. **`populateApuntesIndex(topicsList)` debe preservar contenido y citas:** además de `id/indexCode/title/subject/sourceFile`, mapear `code`, `chapterNumber`, `chapterTitle`, `content` (recortado a un tope documentado, p. ej. 4 000 chars por cédula para no inflar memoria), y construir/aumentar `DYNAMIC_CORPUS[sourceFile]` con las cédulas reales de ese archivo.
3. **Nuevo método `deriveRulesFromSections(sourceFile, cédulas)`:** extrae del `content` real las menciones `Art(s). N [N° …|inc …] (CC|CPC|COT|CPR|Código …)` (reutilizar la regex de `assertCitationIntegrity` como helper central `extractCitations(text)`), deduplica y las empaqueta en el campo `rules` del corpus dinámico. `section` del corpus se toma del `cleanTitle` de la cédula más afín (o primera) del archivo.
4. **`syncApuntesFromServer()`:** tras poblar `APUNTES_INDEX` desde `/api/sync-topics`, invocar la derivación de `DYNAMIC_CORPUS`; en modo estático (sin fetch OK), usar `INITIAL_DATA.topics` con el mismo pipeline (js/data.js ya incluye el contenido real tras la regeneración de CI).

### PARTE B — Resolución de fuentes con prioridad viva (`resolveLinkedFuente`)

Nuevo orden de pasos:
1. Coincidencia directa en corpus semilla (canónico) — sin cambio.
2. Coincidencia *best-effort* por stem insensible a mayúsculas (canónico) — sin cambio.
3. **Nuevo: coincidencia contra `DYNAMIC_CORPUS`** (archivos auto-descubiertos): si `cleanFile` está en `DYNAMIC_CORPUS`, devolver `{ file, section, rules }` con `rules` derivadas del contenido real (no el del arquetipo ni vacío).
4. Coincidencia contra `serverFuentes` (mantener, como respaldo de nombres).
5. Warning defensivo + `null` (mantener).

`getLinkedApuntesForArchetype(arch)`:
- Resolver cada `arch.linkedTopics[]` primero por `id` exacto (comportamiento actual) y, si no existe, por **clave secundaria `(subject, indexCode)` o `(subject, code)`** contra `APUNTES_INDEX` (los ids cambian según el stem del archivo; la clave por código es tolerante). Si tampoco existe, conservar el ítem con warning y `sourceFile: ""` (no reventar la nutrición).

### PARTE C — Integridad de citas corpus-driven (`assertCitationIntegrity`)

1. **Extraer el helper `extractCitations(text)`** (regex central) y usarlo tanto en la derivación de `rules` (PARTE A) como en el validador.
2. **Validación de citas en 3 capas (en orden):**
   - **Capa 1 — Corpus semilla:** cita presente en las `rules`/`doctrine` de `FUENTES_CORPUS`.
   - **Capa 2 — Corpus dinámico:** cita presente en `DYNAMIC_CORPUS` (derivada del contenido real de las cédulas). **Esto legitima las citas de los módulos nuevos de PROMPT 008.**
   - **Capa 3 — Whitelist canónico `validNorms`:** respaldo histórico (mantener intacto para cero regresión).
   - Si una cita no está en ninguna capa → error "Cita legal no verificada en fuentes" (cero citas de memoria: el error se mantiene).
3. **Pre-computar el índice de citas válidas** en `populateApuntesIndex`/sincronización (construir un `Map: "CC:686" → true` etc.) para que `assertCitationIntegrity` sea O(1) por cita y no re-explore contenido por caso generado.
4. El `textPool` que escanea el caso generado conserva su comportamiento (no hay cambios de contrato en el caso).

### PARTE D — Validador integrado (`validateGeneratedCase`) y re-nutrición en vivo

1. Cuando `APUNTES_INDEX` esté poblado, validar que cada `linkedTopics[].id` (o clave secundaria) exista en el índice; si un entorno no tiene índice (test unitario aislado), **soft-warning** en vez de error (mantener compatibilidad con tests actuales que no proporcionan índice).
2. Extender la sanitización existente de `linkedApuntes[].sourceFile` (bloqueo `/` y `\`) también a `linkedFuentes.file`.
3. `js/app.js`: verificar que el flujo `sync-check` → `syncWithServer()` → `invalidateApuntes()` → re-render produce las píldoras `.linked-apuntes-section` con el índice refrescado (ya cableado; confirmar y, si falta en algún camino — p. ej. apertura del taller de casos antes del primer sync —, invocar `CaseGeneratorAgent.syncApuntesFromServer()` antes de renderizar los casos).
4. Documentar contratos en `CONTEXT.md`: convención de IDs `{subject}-{stem}-{code-sin-puntos}` (PROMPT 008) como clave primaria y `(subject, indexCode)` como clave secundaria tolerante para `linkedTopics`.

### PARTE E — SEGURIDAD (recordatorio obligatorio)

- No se ejecuta jamás contenido de apuntes; solo parsing de texto y extracción de citas.
- `sourceFile`/`linkedFuentes.file` saneados sin separadores (path-traversal) antes de renderizar con `SecurityShield.escapeHtml`/`MarkdownParser`.
- El corpus dinámico vive en memoria del cliente (y en `all_afg_topics.json`/`js/data.js` server-side); no se exponen archivos crudos.
- Sin cambios en el flujo de licencias ni en endpoints de escritura.

### PARTE F — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **Sección 23 de `test_e2e_case_flow.cjs` (ampliar, sin romper las 651 aserciones actuales):**
   - Nutrición dinámica: `CaseGeneratorAgent.populateApuntesIndex([... tópico 1.5 nuevo de `Módulo 2` ...])` → `getLinkedApuntesForArchetype(arquetipo con 'linkedTopics' que lo referencie por clave secundaria)` incluye el tópico nuevo con `sourceFile` real y `indexCode` correcto.
   - `resolveLinkedFuente({file: "MODULO_NUEVO.md"})` con `DYNAMIC_CORPUS` poblado → devuelve `rules` derivadas del contenido (no vacío, no hardcodeado).
   - `assertCitationIntegrity` corpus-driven: cita presente solo en un tópico dinámico (`Art. 999 CC` simulado en contenido) → `valid: true`; cita inventada (`Art. 9999 CC`) → `valid: false`; y los 13 arquetipos con corpus semilla siguen `valid: true` (cero regresión).
   - `validateGeneratedCase` con `linkedTopics` de id real → `valid: true`; con `linkedFuentes.file` con separador → error de sanitización.
   - Invariante PROMPT 008: tras la sincronización, siguen siendo **53 tópicos canónicos** y el corpus dinámico del repo real contiene solo las 6 fuentes canónicas (assert de no-contaminación).
2. Ejecutar las 4 suites y dejar **100 % PASS**. Registrar el total en la bitácora.
3. **Actualizar `CONTEXT.md`:** Sección 2.5 (convención de IDs + claves secundarias), 3.1 (nutrición en vivo del agente y re-nutrición en sync), Sección 7.3 (nuevas aserciones de la Sección 23), Sección 8 (fila `js/case-generator-agent.js`: corpus semilla + dinámico, validador corpus-driven), y **Bitácora Sección 9 → v7.9** (junto al PROMPT 008) con fecha, alcance, archivos y nº de pruebas.

## DEFINITION OF DONE

- [ ] `DYNAMIC_CORPUS` y `extractCitations()` implementados; `populateApuntesIndex` preserva `content`/`code`/`chapterNumber` y deriva `rules` reales.
- [ ] `resolveLinkedFuente` resuelve archivos nuevos (no canónicos) con `rules` derivadas del contenido real de sus cédulas.
- [ ] `assertCitationIntegrity` valida en 3 capas (semilla → dinámico → whitelist) con índice O(1) pre-computado; una cita de un módulo nuevo es aceptada y una inventada rechazada.
- [ ] `getLinkedApuntesForArchetype` resuelve por clave secundaria `(subject, indexCode/code)` cuando el id exacto no existe.
- [ ] `validateGeneratedCase` verifica `linkedTopics` contra el índice vivo (soft-warning si no hay índice) y sanea `linkedFuentes.file`.
- [ ] En servidor en vivo, tras soltar un `.md` nuevo en `fuentes/`, el agente se re-nutre al siguiente ciclo de sync (≤ 3.5 s) y las píldoras `.btn-linked-apunte` reflejan las cédulas nuevas.
- [ ] En GitHub Pages (estático), la nutrición usa `INITIAL_DATA.topics` regenerado por CI (sin servidor).
- [ ] Las 4 suites pasan al 100 % (las 651 aserciones previas intactas + nuevas de nutrición dinámica y citas).
- [ ] `CONTEXT.md` actualizado (2.5, 3.1, 7.3, 8) y Bitácora v7.9 registrada; `PROMPTS/README.md` indexa el 009 como ✅ Implementado (v7.9) al cierre.

## NOTAS PARA EL EJECUTOR

- **Ejecución recomendada:** implementar en serie con el PROMPT 008 en un único hito **v7.9** ("Índice automático desde `fuentes/` + nutrición viva del agente"). Si 008 ya está implementado, este PROMPT es incremental y no debe repetir sus cambios.
- No instales dependencias nuevas; el stack es vanilla.
- La extracción de citas debe tolerar los formatos reales de los apuntes: `Art. 2320 inc. 4 CC`, `Art. 19 N° 24 CPR`, `Arts. 686, 724 CC`, `Art. 464 N° 7 CPC`, `Art. 529 COT`, `Auto Acordado CS…` (este último, si aparece, se conserva sin entrar al índice canónico de artículos).
- Mantén intacto el contrato de `officialRubric`/`pauta`/`errorFatalDeGrado`/`modelSolution` y el barajado Fisher-Yates; este PROMPT toca exclusivamente **nutrición, citas, vinculación y sincronización**.
- Respeta la nomenclatura jurídica chilena y toasts/mensajes en español.