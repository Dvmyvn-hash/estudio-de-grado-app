# PROMPT 010 — El Desarrollador de Preguntas del Agente: 4 Verificaciones de Grado al Cierre de Cada Cédula (Naturaleza Detectada y Cierre Automático como Completada)

> **Versión:** v1.0 · **Fecha:** 2026-09-22 · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** `009_agente_ia_nutricion_apuntes_dinamicos.md` (✅ Implementado en **v7.10** — este PROMPT es incremental, no debe repetir sus cambios)

> Copia y pega este bloque completo como prompt inicial en tu agente de Antigravity IDE. Está redactado para ejecutarse dentro del repositorio `estudio-de-grado-app` (GRADOMANIACOS) conforme a las reglas de `AGENTS.md`.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa la funcionalidad descrita **respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio**.

## MISIÓN

Construir el **Desarrollador de Preguntas del Agente** (`QuestionDeveloper`): un subsistema en el cliente que, para **cada cédula** del temario (los 53 tópicos canónicos y cualquier módulo nuevo auto-descubierto de PROMPT 008), **cierra la sección con 4 preguntas de verificación de grado** en formato A-E auto-corregido, con **solución dogmática oficial revelable**, **naturaleza detectada automáticamente** (preguntas **dogmáticas** por defecto; **de caso** si la cédula trata de plazos, cómputos o aplicación práctica; **de procedencia** si trata de vías adjetivas, recursos o acciones; **de competencia** si trata de tribunales y reglas de competencia), **derivadas del contenido real de la cédula** (cero contenido de memoria, cero artículos inventados, reutilizando `CaseGeneratorAgent.extractCitations`). Al **acertar las 4 preguntas (4/4)**, la cédula **queda marcada automáticamente como completada (dominada)** en el progreso del usuario, sin depender del botón manual — que se conserva como refuerzo de repaso. El resultado final: **leer una cédula ya no termina en "leí el texto", sino en "verifiqué que domina la sección"**.

## REGLAS OBLIGATORIAS DEL REPOSITORIO (ADEMÁS DEL CÓDIGO)

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 1.2 → verificación del agente; 2.5 → esquema `topicQuizzes`; 3.1 → flujo UI y nuevos IDs del DOM; Sección 7.3 → Sección 24 de tests; Sección 8 → fila nueva `js/question-developer.js`; Bitácora Sección 9 → **v7.11**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; **ampliar la Sección 24 de `test_e2e_case_flow.cjs`** con las verificaciones de abajo.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. **No romper contratos del PROMPT 009 (v7.10):** `FUENTES_CORPUS`, `corpusSeed`, `DYNAMIC_CORPUS`, `APUNTES_INDEX`, `extractCitations`, `populateApuntesIndex`, `getLinkedApuntesForArchetype`, `assertCitationIntegrity` (3 capas), `validateGeneratedCase`, `syncApuntesFromServer`, `invalidateApuntes`. Este PROMPT **solo consume** esos contratos (con *fallback defensivo* si alguno no existiera) y no los modifica.
5. No romper contratos anteriores: `INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `linkedFuentes`, `linkedApuntes`, `pauta`/`errorFatalDeGrado`/`officialRubric`/`modelSolution`, flujo demo/desbloqueo. **No se toca `server.py` ni `generate_clean_notes_data.py`** (cero endpoints de escritura, cero cambios de CI).
6. Guardrails de seguridad vigentes: sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), cero ejecución de contenido de apuntes, cero path-traversal, cero dependencias nuevas.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

"Mientras implemento el PROMPT 009 quiero un prompt el cual, en base al desarrollador de preguntas del agente, pueda incluir 4 preguntas dogmáticas al final de cada sección, con el fin de que determine el manejo de ella y quede como completada. Que estas preguntas sean dogmáticas como te dije, o si tienen que ver con plazos o cosas así, sean preguntas de casos, o preguntas de procedencia, o cosas de ese estilo."

Es decir: **el agente no solo genera casos; también se convierte en el "desarrollador de preguntas" de cada cédula.** Al terminar de leer una sección, el postulante se encuentra con 4 preguntas que la comisión de grado le haría sobre ese contenido; la *naturaleza* de las preguntas se adapta a la materia de la cédula (teoría → dogmática; plazos/aplicación → casos; recursos/acciones → procedencia; tribunales → competencia). El postulante las responde en el propio visor, ve la solución dogmática oficial y, si acierta las 4, **la cédula se declara completada** y su % de avance sube sin tocar ningún botón.

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

- **`js/case-generator-agent.js` (v7.10, PROMPT 009 ya consumido):**
  - `extractCitations(text)` (~línea 94): regex central de citas chilenas (`Arts. N N°… inc. … (CC|CPC|COT|CPR|Código …)`) → `[{ raw, article, code, normGroup, artNum, artNums }]`. **Contrato a reutilizar** (fallback defensivo: si no existe, implementar una copia local en `QuestionDeveloper` con la misma regex).
  - `corpusSeed`, `DYNAMIC_CORPUS` y `populateApuntesIndex(topicsList)` (~línea 399): preservan `content` (tope 4.000 chars), `code`, `chapterNumber`, `chapterTitle`, `sourceFile`, `indexCode` por cédula y construyen `DYNAMIC_CORPUS[sourceFile]` vía `deriveRulesFromSections`.
  - `syncApuntesFromServer()` (~línea 353): pobla `APUNTES_INDEX` desde `/api/sync-topics` o `INITIAL_DATA.topics` (modo GitHub Pages). `invalidateApuntes()` (~443) re-sincroniza.
- **`js/app.js`:**
  - `renderTopicViewer()` (~línea 837): renderiza el visor con `container.innerHTML`. Estructura: contenido real `#topic-markdown-body` (`MarkdownParser.render(topic.content)`) → acordeón `.inline-connections-box` → **tarjeta de finalización `.topic-completion-box`** (líneas ~1034-1047) con `#btn-bottom-mastery` ("Completar Cédula (+ %)") y botón de cabecera `#btn-toggle-mastery` (líneas ~941-944). Locked: `.paywall-container` con 3 beneficios (líneas ~1058-1071).
  - `handleMasteryClick` (~línea 1188): `StorageService.toggleTopicMastery(topic.id)` + re-render + toast. Eventos cableados con `querySelector` tras el `innerHTML`.
  - `openTopic(topicId)` (~536), `renderSidebar()` (~604, dedupe + dots `.topic-mastery-dot`), `renderCurrentView()` (~548, sync defensivo de apuntes al entrar a "cases").
- **`js/storage.js`:**
  - `userProgress[key] = { masteredTopicIds: [], lastActivity }` (clave por `LicenseService.getCurrentLicense().code` o `"demo_student"`).
  - `toggleTopicMastery(topicId)` (~137): lista `masteredTopicIds`. `isTopicMasteredByUser` (~161) y `calculateProgress` (~167) alimentan el % de avance del sidebar.
  - `getData()` (~10) migra/auto-cura `topics` desde `INITIAL_DATA` (dedupe por clave natural, preserva `mastered`).
- **`index.html`:** scripts de `js/data.js` → `storage.js` → … → `case-generator-agent.js` (~712) → `case-solver.js` (~713) → `app.js` (~714). El módulo nuevo debe cargarse **después de `case-generator-agent.js`** (para consumir `extractCitations`) y **antes de `app.js`**.
- **`js/data.js` `INITIAL_DATA.topics`:** cédulas con `id`, `subject`, `code`, `indexCode`, `cleanTitle`, `chapterTitle`, `category`, `sourceFile`, `tags`, `content` (texto real), `connections`. No existe hoy ningún campo de preguntas de verificación.
- **Suites:** `test_e2e_case_flow.cjs` usa `assert(cond, msg)` con contador; el PROMPT 009 añade la **Sección 23** (nutrición dinámica y citas corpus-driven). `test_deduplication_flow.cjs` afirma los 53 tópicos; `test_unlock_auth_flow.cjs` y `test_mobile_header_theme.cjs` cubren auth/header. **No existe ninguna funcionalidad previa de preguntas de autoevaluación por cédula** (grep de `autoeval|quiz|repaso` sin resultados).

## CAMBIOS A IMPLEMENTAR

### PARTE A — Nuevo módulo `js/question-developer.js` (el Desarrollador de Preguntas)

**Contrato del singleton** (mismo patrón de módulos del repo: objeto global + `window`/`globalThis`/`module.exports`):

1. **Taxonomía de naturaleza (`NATURE_TAXONOMY`):** `dogmatic | case | procedencia | competencia | plazos`. Etiquetas UI documentadas: `dogmatic` → "Pregunta Dogmática", `case` → "Pregunta de Caso", `procedencia` → "Pregunta de Procedencia", `competencia` → "Pregunta de Competencia", `plazos` → "Pregunta de Plazos/Cómputo".
2. **`detectNature(topic)` — clasificador heurístico ponderado** (mismo espíritu determinista y documentado que `infer_file_config` del PROMPT 008). Orden de precedencia estricto, la primera coincidencia gana:
   - `procedencia` (vías adjetivas): `procedencia`, `admisibilidad`, `requisitos de admisibilidad`, `recurso de apelación`, `recurso de casación`, `recurso de protección`, `recurso de amparo`, `recurso de queja`, `recurso de reposición`, `incidente`, `excepción dilatoria`, `excepción perentoria`, `medida prejudicial`, `medida cautelar`, `nulidad procesal`, `interponer`, `deducir`, `inadmisibil`.
   - `competencia`: `competencia`, `tribunal competente`, `juzgado de letras`, `corte de apelaciones`, `corte suprema`, `prórroga de competencia`, `radicación`, `acumulación`, `inhibitoria`, `declinatoria`, `prevención`, `reglas de competencia`, `cuantía`.
   - `plazos`: `plazo`, `término`, `días hábiles`, `cómputo`, `caducidad`, `perención`, `fatal`, `suspende`, `interrumpe`, `contados desde`, `notificación`, `estado diario`, `días corridos`, `hábiles`, `de días`, `de meses`, `de años` (solo cuando la sección **gira** sobre tiempo; si la palabra aparece 1-2 veces aislada, seguir al siguiente nivel).
   - `case` (aplicación práctica): `caso`, `ejemplo`, `supuesto`, `aplicación práctica`, `cálculo`, `operación aritmética`, `en la práctica`, `ilustra`, `ejemplifica`.
   - `dogmatic` (**fallback por defecto**): todo lo demás (concepto, requisitos, elementos, clasificación, efectos, diferencias, principios).
   - Regla de conteo: se puntúa cada familia sobre el texto (`cleanTitle` + `content`, normalizado en minúsculas); si hay empate, prevalece el orden de precedencia. Sin texto → `dogmatic`.
3. **`buildSectionQuestions(topic)` → exactamente 4 preguntas**, cada una:
   ```js
   {
     id: "qv-civil-losbienes-1-4-1",            // convención {subject}-{stem}-{code-sin-puntos}-{n}
     topicId: topic.id,
     nature: "dogmatic",                        // naturaleza detectada (o por-pregunta según el mix)
     number: 1,
     questionText: "...",                       // derivado del instituto/cleanTitle + plantilla
     options: [{ id: "a", text: "..." }, /* b c d e */],
     correctAnswer: "a",                        // exactamente 1 correcta
     solucionDogmatica: "... Conclusión: ...",  // ≥ 200 chars, cierre "Conclusión:" obligatorio
     pauta: "...",                              // criterio de la comisión (breve)
     sourceCitations: ["Art. 686 CC", ...]      // ⊆ citas REALES de topic.content
   }
   ```
4. **Definición del mix por naturaleza ("determina el manejo de la sección")** — *Regla Maestra*:
   - `dogmatic` (default): 4 preguntas dogmáticas → (1) concepto/requisitos del instituto; (2) clasificación/partes/elementos; (3) efectos/consecuencias jurídicas; (4) diferencias con instituciones afines o vicios/contrapuntos.
   - `procedencia` → (1) ¿procede o no el recurso/acción/incidente en el supuesto base?; (2) requisitos de admisibilidad/procedencia; (3) plazo y tribunal ante el que se interpone (si la cédula lo da); (4) dogmática del instituto adjetivo.
   - `plazos` → (1) **caso de cómputo** (fechas: "deducido el X, ¿hasta cuándo corre?" con distractor de días corridos/hábiles); (2) **caso** de interrupción/suspensión/caducidad o vencimiento; (3) dogmática del régimen de plazos; (4) **caso** de efectos por vencimiento/omisión.
   - `competencia` → (1) tribunal competente en el supuesto (formato caso/procedencia); (2) regla de competencia absoluta o relativa aplicable; (3) prórroga/radicación/extensión; (4) dogmática de la competencia.
   - `case` → (1)-(3) mini-casos de subsunción (variando hechos: buena/mala fe, plazos, montos — con distractores seductores) y (4) dogmática de clausura.
5. **Citas corpus-driven (guardrail central):** cada pregunta que cite norma debe usar **solo** las citas reales devueltas por `CaseGeneratorAgent.extractCitations(contenido)` (o fallback local). Si la cédula **no contiene citas**, las preguntas se formulan en clave institucional/doctrinal (`sourceCitations: []`) **sin inventar artículos jamás**. `QuestionDeveloper.validateSectionQuestions(topic, questions)` debe retornar `{ valid, warnings }` y rechazar la renderización si una cita no está en el contenido.
6. **Generación determinista (clave para pruebas):** seeder `fnv1a(topic.id)` → PRNG `mulberry32()` para **barajar la posición de la alternativa correcta (Fisher-Yates)**. Misma cédula → mismas 4 preguntas y mismas posiciones A-E en cada visita. El PRNG es **no criptográfico** (solo orden/UX; documentarlo).
7. **Memoización en memoria:** `getSectionQuestions(topic)` cachea por clave `topic.id:hash(content).slice(0,12)` para no regenerar en cada re-render (53 cédulas máx., content tope 4.000 chars — costo trivial).
8. Exponer `QuestionDeveloper.natureOf(topicId)` para que la UI pinte el badge de naturaleza sin regenerar las preguntas.

### PARTE B — Persistencia del progreso de verificación (`js/storage.js`)

1. **Nuevo sub-árbol** dentro de `userProgress[key]` (default en `getData` y al crear la entrada):
   ```js
   topicQuizzes: {
     "civil-losbienes-1-4": {
       correctCount: 0,                    // 0..4
       answers: [null, null, null, null],  // letra elegida por pregunta (null = sin responder)
       completed: false,                   // true solo al llegar a 4/4
       completedAt: null,
       updatedAt: null
     }
   }
   ```
2. **Nuevos métodos** (sin romper los existentes):
   - `getTopicQuizState(topicId, userKey = null)` → estado o `null`.
   - `recordTopicAnswer(topicId, qIndex, chosenLetter, correctLetter, userKey = null)` → `{ isCorrect, correctCount, completed, newlyMastered }`. Si `correctCount === 4` y aún no `completed`: marca `completed: true`, `completedAt` ISO y **auto-marca la cédula dominada** con el nuevo método idempotente `markTopicMastered(topicId)` (añade a `masteredTopicIds` **solo si no está**; devuelve `{ mastered: true }`).
   - `markTopicMastered(topicId, userKey = null)` — método nuevo e **idempotente** (distinto de `toggleTopicMastery`, que permanece intacto para el botón manual de repaso).
   - `isTopicQuizCompleted(topicId, userKey = null)`, `resetTopicQuiz(topicId, userKey = null)` (borra la entrada y, si procede, deja `mastered` como estaba).
   - `toggleTopicMastery` **no cambia**: si el usuario desmarca "Dominado" tras completar por quiz, `completed` persiste (veracidad de la verificación) pero el % de avance baja (el usuario eligió repasar).
3. **`getData()`:** al migrar/auto-curar, añadir `topicQuizzes: {}` al default y preservarlo (no depende de `INITIAL_DATA`).
4. **Alcance explícito:** `topicQuizzes` es **local-first** como `masteredTopicIds` (sin push al servidor, sin endpoints, sin cambios en `db.py`/SQLite). Documentarlo en CONTEXT.md §2.5.

### PARTE C — UI en `js/app.js` (`renderTopicViewer`)

1. **Renderizar `#section-quiz-developer` AL FINAL de cada cédula desbloqueada**, inmediatamente antes de la tarjeta `.topic-completion-box`, con:
   - Cabecera: título "🎓 Verificación de Cédula — Desarrollador de Preguntas del Agente", badge `#quiz-nature-badge` (materia + naturaleza detectada + nº citas reales usadas), barra de progreso `#quiz-progress-fill` (0-100%) y contador `#quiz-progress-count` (`0/4 verificadas`).
   - 4 tarjetas `.quiz-question-card` (una por pregunta), cada una con: enunciado `data-quiz-question`, 5 opciones `.quiz-option` (botones A-E con `data-option`), contenedor de feedback `.quiz-answer-feedback` (✓/✗ + explicación breve) y **solución dogmática revelable** `.quiz-solution` (oculta hasta responder; muestra `solucionDogmatica`, `pauta` y `sourceCitations`).
   - Banner de cierre `#quiz-completed-banner` (oculto hasta 4/4): "🎉 Cédula Completada por Verificación — 4/4 correctas" + texto de que el % de avance fue actualizado.
2. **Goting y estado:** el bloque solo se renderiza cuando `isUnlocked === true`. Preguntas ya respondidas (según `StorageService.getTopicQuizState`) se pintan con su selección + solución revelada y la barra en su estado (restaurar estado al re-render). En modo Demo, **no** renderizar el quiz; solo actualizar la copia del `.paywall-container` añadiendo el beneficio "4 preguntas de verificación del agente por cédula con cierre automático" a la lista de 3 beneficios existentes (líneas ~1058-1071).
3. **Eventos (mismo patrón del `handleMasteryClick`):** tras el `innerHTML`, cablear un solo delegado en `container` para `.quiz-option`: al clicar una opción no respondida → `recordTopicAnswer`; pintar feedback/solución en el DOM (sin re-render total, para no perder scroll); actualizar barra y contador en el DOM; si `newlyMastered === true` → `this.renderSidebar()` + toast "🎉 ¡Cédula completada por verificación (4/4)!" y refrescar el texto/estado de `#btn-bottom-mastery` ("Dominado ✅ / Marcar para Repasar").
4. **Accesibilidad/UX:** alternativas únicas (deshabilitar las demás del bloque tras responder), `aria-pressed` en activa, foco visible; los textos dinámicos se inyectan con `SecurityShield.escapeHtml` (los objetos de pregunta viven en memoria y contienen solo plantillas fijas + citas extraídas, pero se aplica el mismo estándar). `window.lucide.createIcons()` tras pintar.
5. Cargar el script en `index.html` entre `js/case-generator-agent.js` (~712) y `js/case-solver.js` (~713), con comentario de dependencia: `<!-- QuestionDeveloper: consume CaseGeneratorAgent.extractCitations; lo usa App.renderTopicViewer -->`.

### PARTE D — SEGURIDAD (recordatorio obligatorio)

- **Cero ejecución de contenido de apuntes:** solo parsing de texto; las preguntas se componen de plantillas estáticas + citas extraídas por regex; jamás se evalúa `topic.content`.
- **Cero alucinación normativa:** toda cita de una pregunta debe existir en `extractCitations(topic.content)`; `validateSectionQuestions` bloquea la renderización si una cita no está verificada contra el contenido real (`sourceCitations` ⊆ citas reales).
- **Sin endpoints, sin path-traversal:** cero cambios en `server.py`/`db.py`; `topicQuizzes` vive en `localStorage` (`userProgress`).
- **Sanitización en el origen** (`SecurityShield.escapeHtml`/`textContent`) en todo texto inyectado al DOM.
- PRNG determinista **no criptográfico** (solo orden/UX de alternativas), documentado como tal.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **Sección 24 de `test_e2e_case_flow.cjs` (añadir tras la Sección 23 del PROMPT 009, sin romper las aserciones existentes):**
   a. `detectNature`: cédula con "recurso de apelación/admisibilidad" → `procedencia`; con "competencia/prórroga/tribunal competente" → `competencia`; con "plazo de 5 días/cómputo/estado diario" → `plazos`; con "caso/ejemplo/aplicación práctica" (y sin las anteriores) → `case`; cédula genérica → `dogmatic`.
   b. `buildSectionQuestions` sobre un tópico canónico real (p. ej. `civil-losbienes-1-4`): **exactamente 4** preguntas; cada una con 5 opciones; `correctAnswer` presente entre ellas; `solucionDogmatica` ≥ 200 chars terminando en "Conclusión:"; `sourceCitations ⊆ extractCitations(content)`; ids `qv-{subject}-{stem}-{code}-{n}`.
   c. **Determinismo:** dos llamadas con el mismo tópico → mismos `id` y misma letra `correctAnswer` (seed `fnv1a`).
   d. **Completado automático:** simular `recordTopicAnswer` con 4/4 correctas → `isTopicQuizCompleted === true` y el id aparece en `masteredTopicIds`; con 3/4 → `completed === false`.
   e. **Cédula sin citas:** contenido sin artículos → preguntas con `sourceCitations: []` y sin artículos inventados (assert de no-alucinación).
   f. **No regresión:** `toggleTopicMastery` manual sigue funcionando (toggle on/off) y `calculateProgress` refleja la auto-marca del quiz.
2. Ejecutar las 4 suites y dejar **100 % PASS**. Registrar el total de aserciones en la bitácora.
3. **Actualizar `CONTEXT.md`:** Sección 1.2 (nuevo bloque "Verificación de Cédula (v7.11)" con la Regla Maestra de mix por naturaleza), 2.5 (esquema `topicQuizzes` en `userProgress[key]` + alcance local-first), 3.1 (flujo: lectura → Verificación de Cédula → 4/4 → auto-completado → % avance; IDs del DOM `#section-quiz-developer`, `.quiz-question-card`, `.quiz-option`, `.quiz-solution`, `#quiz-completed-banner`, `#quiz-progress-fill`), Sección 7.3 (Sección 24 del E2E), Sección 8 (fila `js/question-developer.js` → `QuestionDeveloper`), y **Bitácora Sección 9 → v7.11** con fecha, alcance, archivos y nº de pruebas.

## DEFINITION OF DONE

- [ ] `js/question-developer.js` implementado como singleton `QuestionDeveloper` con `detectNature` (5 naturalezas, precedencia documentada), `buildSectionQuestions` (exactamente 4), mix por naturaleza según la Regla Maestra, `validateSectionQuestions` y `getSectionQuestions` memoizado.
- [ ] Toda cita de pregunta es real (⊆ `extractCitations(content)`); cédulas sin artículos generan preguntas institucionales sin citas inventadas.
- [ ] Generación determinista por seed `fnv1a(topic.id)` + `mulberry32`: misma cédula → mismas preguntas y posiciones.
- [ ] `StorageService`: `topicQuizzes` en `userProgress`, `recordTopicAnswer` auto-marca `completed` y auto-añade a `masteredTopicIds` al llegar a 4/4 (idempotente); `toggleTopicMastery` intacto.
- [ ] `renderTopicViewer` muestra la Verificación de Cédula al final de cada cédula desbloqueada, restaura estado en re-render, y al 4/4 actualiza barra/banner/sidebar/% avance sin perder scroll; paywall actualizado con el beneficio.
- [ ] `index.html` carga `js/question-developer.js` después de `case-generator-agent.js` y antes de `app.js`.
- [ ] Las 4 suites pasan al 100 % (aserciones previas intactas + Sección 24 nueva: detección, forma, determinismo, 4/4, no-alucinación, no-regresión).
- [ ] `CONTEXT.md` actualizado (1.2, 2.5, 3.1, 7.3, 8) y Bitácora **v7.11** registrada; `PROMPTS/README.md` indexa el 010 como ✅ Implementado (v7.11) al cierre.

## NOTAS PARA EL EJECUTOR

- **Ejecución recomendada:** el PROMPT 009 debe estar implementado (v7.10) antes de ejecutar este; si algún contrato del 009 no existiera en el árbol (ramas en paralelo), **usa fallback defensivo** (copia local de la regex de `extractCitations` y `populateApuntesIndex` conservador) sin bloquear el resto del alcance.
- No instales dependencias; el stack es vanilla. El PRNG determinista se implementa en ~15 líneas (sin librerías).
- Respeta la nomenclatura jurídica chilena y la pauta estética del repo: títulos con `🎓`, toasts en español, botones que **no cambian su texto actual** ("Completar Cédula (+ %)" / "Marcar para Repasar") salvo el re-etiquetado mínimo documentado en PARTE C.
- Las alternativas deben seguir la calidad del workbench: **al menos 2 distractores seductores** refutados expresamente en `solucionDogmatica`, cierre obligatorio "Conclusión: [enunciado técnico inequívoco]".
- El quiz es **local-first** a propósito: cero endpoints, cero CI, cero cambios en `all_afg_topics.json` (las preguntas nacen del contenido en vivo, igual filosofía "corpus vivos" del 009).
- Si el contenido de una cédula es monolítico o muy corto (< 300 chars), igual se generan 4 preguntas dogmáticas sobre el instituto del `cleanTitle`, sin citas fabricadas.
- Mantén la Sección 23 del 009 y todo contrato previo (casos `caso-ia-*`, demo/desbloqueo, header móvil) 100 % operativos.