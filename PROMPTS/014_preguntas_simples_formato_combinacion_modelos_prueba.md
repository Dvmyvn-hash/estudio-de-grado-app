# PROMPT 014 — Preguntas de Verificación Simples y Claras (Formato Combinación I–IV, solo Dogmáticas) + Carpeta `MODELOS_DE_PRUEBA/`

> **Versión:** v1.0 · **Fecha:** 2026-09-23 · **Autor:** puente (dpint)
> **Estado:** ✅ Implementado (v7.17) · **Depende de:** 010 (contrato estructural 4×5 del `QuestionDeveloper`) y 012 (motor contenido-conductor v7.15 que este prompt simplifica)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Rediseñar las **4 preguntas de verificación** que el `QuestionDeveloper` genera al cierre de cada cédula para que sean **simples, cortas, claras e identificables**: preguntas **dogmáticas** de selección múltiple con el formato clásico de examen de **combinación I, II, III, IV** («a) I y II correctas», «b) II y IV», etc.) para **requisitos, características y elementos del concepto**, preguntas de **plazo simple** («¿cuántos días/años dura o son?») cuando la cédula lo contenga, y definiciones cortas como relleno — siempre con distractores simples y el objetivo de **demostrar el manejo sencillo de los contenidos desarrollados**, sin extensión innecesaria ni artificios. Los **casos prácticos quedan fuera** de esta etapa (se generarán aparte). Adicionalmente, crear la carpeta **`MODELOS_DE_PRUEBA/`** en la raíz del repo donde se depositan **exámenes modelo reales de cualquier rama del derecho** (penal, laboral, tributario, etc.), de los cuales el agente extrae **solo la estructura de las preguntas** (nunca su contenido) para nutrir el nuevo formato.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 7.3 contratos, Sección 8 mapa de archivos — filas `js/question-developer.js`, `js/app.js`, `index.html`, `test_e2e_case_flow.cjs`, **nuevas filas `MODELOS_DE_PRUEBA/`, `extract_estructura_pruebas.py`, `js/exam-structure-grammar.js`** — y Bitácora de Versiones Sección 9 → próxima versión **v7.17**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; ampliar/adaptar las suites con pruebas de la nueva funcionalidad (Subsecciones 24.4/24.5 de `test_e2e_case_flow.cjs`).
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. **No romper el contrato estructural v7.11 (Subsección 24.4):** 4 preguntas por cédula, 5 opciones A-E, `correctAnswer` ∈ {a..e}, `solucionDogmatica` ≥ 150 chars con cierre `"Conclusión:"`, `sourceCitations` subconjunto de las citas reales, IDs `qv-{subject}-{stem}-{code}-{n}`, generación 100 % determinista (`fnv1a` + `mulberry32`), auto-completado 4/4 en `StorageService`, cero citas fabricadas en cédulas sin citas. **Estos contratos se conservan tal cual; el cambio es el formato interno de los enunciados/opciones.**

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

> "dame un prompt para arreglar esto ya que las preguntas igual se ven raras y poco claras, vere si puedo conseguir modelo de pruebas para que sepa bien como crearlas (para que generes una carpeta de MODELOS DE PRUEBA para que se nutra el agente, las pruebas pueden ser de otras ramas del derecho, la idea es que sepa la estructura de las preguntas), de momento que sean algo mas simples, no tan extensas, que sean claras e identificatorias, cuando haya requisitos o caracteristicas, preguntar por ellas, crear las preguntas de seleccion multiple de caracteristicas de seleccionar entre i, ii, iii, iv, ejemplo a) ii y iv correctas, o cosas asi, pero que genere preguntas con sentido, que sean simples y acorde a los contenidos y sin mayor complejidad, que sean solo dogmaticas, los casos sera aparte, si hay en plazo, preguntar de cuantos dias o años es ese plazo, o identifica los elementos del concepto y poder seleccionar entre i, ii, iii y cosas asi, con distractores simples, pero que el fin sea demostrar el manejo sencillo de los contenidos desarrollados."

Interpretación de diseño (aterrizada al código):
- **El motor v7.15 «concepto mejor desarrollado» produce opciones larguísimas** (la correcta es la más extensa por construcción, con distractores que omiten cláusulas). Eso se percibe como «raro y poco claro». Se sustituye por **opciones cortas y combinaciones I–IV**, siguiendo la estructura real de los exámenes de grado chilenos.
- **Formato canónico de combinación:** el enunciado presenta 4 proposiciones (I, II, III, IV) y las alternativas A-E son combinaciones («Solo I», «I y II», «I, II y III», «II y IV»…). Con 3 proposiciones verdaderas extraídas del apunte y 1 falsa (mutación simple), la correcta es la combinación que incluye **todas las verdaderas y ninguna falsa**; los 4 distractores incluyen la falsa y/o omiten una verdadera. Determinista por cédula.
- **Solo dogmáticas:** los arquetipos de caso (`_specCaso`) **no** se emiten en esta etapa; `detectNature` se conserva como metadato de clasificación y para futuras preguntas de caso «aparte». Las preguntas de plazo pasan de «cómputo aritmético de un caso» a **«¿de cuántos días/años es el plazo?»** (dogmática numérica simple).
- **Carpeta `MODELOS_DE_PRUEBA/`:** el humano depositará exámenes reales (en `.md`/`.txt`, de cualquier rama) para que el agente **aprenda la estructura** (enunciados con lista I–IV, combinaciones de alternativas, redacción de requisitos/características/plazos). Esa estructura se compila a una gramática estática. **El contenido de los modelos jamás entra a las preguntas ni a `sourceCitations`** (guardrail anti-contaminación dogmática).

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

### Motor de preguntas (`js/question-developer.js`)
- **Superficie pública v7.11 (no mover):** `detectNature`, `buildSectionQuestions`, `extractCitations`, `validateSectionQuestions`, `getSectionQuestions`, `natureOf`, `NATURE_TAXONOMY` (5 naturalezas: `dogmatic`, `case`, `procedencia`, `competencia`, `plazos` — líneas 48-79).
- **Motor contenido-conductor v7.15 (líneas 236-435):** extractores `_splitSentences`/`_cleanSentence`, `_extractDefinitions`, `_extractTraits`, `_extractProcedenciaSentence`, `_extractPlazo` (preferencia `hábiles`, vencimiento por aritmética de días de semana), `_extractTribunals`, `_plazosRuleSentence`, y `_buildContext(topic)` (línea 435).
- **Arquetipos v7.15 (líneas 596-880):** `_specConcepto`/`_specConceptoAlt`, `_specCaracteristicas`, `_specProcedencia`, `_specPlazosCalculo`, `_specPlazosRegla`, `_specCompetencia`/`_specCompetenciaAlt`, `_specCaso`, `_specDefinicionDirecta`. La mecánica «concepto mejor desarrollado» hace que **la correcta sea la opción más extensa** y normaliza distractores a ~0.85×L con tope `[0.72·L, 0.98·L]` y ratio máx/mín ≤ 1.6.
- **Mix por naturaleza (`_archetypeQueue`, línea 895):** `procedencia`, `competencia`, `plazos`, `case`, `dogmatic` → colas distintas; `_getQuestionSpecsForNature` (línea 996) compone 4 especificaciones con rellenos deterministas (`_specConcepto` alt / `_specDefinicionDirecta`) y último recurso incondicional (líneas 1042-1057).
- **`buildSectionQuestions(topic)` (línea 914):** genera exactamente 4 preguntas; cada una con forma `{ id: "qv-{subject}-{stem}-{indexCode}-{n}", topicId, nature, number, questionText, options: [{id:"a".."e", text}], correctAnswer: "a".."e", solucionDogmatica, pauta, sourceCitations }`; barajado determinista con `mulberry32(seed + qNum*997)` (líneas 953-970).
- **`validateSectionQuestions` (línea 1063):** retorna `{ valid, errors, warnings }` (absurdos `_BANNED_ABSURD`, anclaje por bigramas, homogeneidad > 1.6).
- **`_AFIN_BANK` (líneas 91-104):** banco de instituciones afines por disciplina para distractores verosímiles (ej. «La posesión inscrita es la que consta en el registro conservatorio…»).

### Orquestación y persistencia (`js/app.js` + `js/storage.js` + `index.html`)
- `renderTopicViewer()` inyecta `QuestionDeveloper.getSectionQuestions(topic)` y renderiza el cuestionario `#section-quiz-developer` (tarjetas `.quiz-question-card`, opciones `.quiz-option` con letras a-e, solución `.quiz-solution` al responder, banner `#quiz-completed-banner`).
- `StorageService.recordTopicAnswer`/`resetTopicQuiz`/`isTopicQuizCompleted`/`markTopicMastered` (auto-completado al acertar 4/4, persistencia `topicQuizzes`). Contrato intacto: las respuestas guardadas ya tienen `{id, questionText, options, correctAnswer}` — el nuevo formato no cambia la forma, solo los textos.
- El rendering actual pinta `q.questionText` y `option.text`; con enunciados multilínea I–IV es necesario conservar saltos de línea (ver PARTE C).

### Suites de prueba (`test_e2e_case_flow.cjs`)
- **Subsección 24.4 (v7.11, contrato estructural — DEBE SOBREVIVIR íntegra):** 24.4.1 `detectNature` por precedencia (procedencia > competencia > plazos > case > dogmatic); 24.4.2 4 preguntas × 5 opciones A-E, `correctAnswer` A-E, solución ≥ 150 chars + `"Conclusión:"`, `sourceCitations` subconjunto, ids `qv-`; 24.4.3 determinismo (dos corridas idénticas); 24.4.4 auto-completado 4/4; 24.4.5 cédula sin citas → `sourceCitations` vacío y cero artículos inventados; 24.4.6 no-regresión `toggleTopicMastery`/`calculateProgress`. **Todas sobreviven porque el formato combinación sigue siendo 4×5 A-E.**
- **Subsección 24.5 (v7.15, calidad «manejo» — SE ADAPTA/REEMPLAZA):** 24.5.1 anclaje de la correcta por bigramas (103 cédulas) → se adapta a las **proposiciones I–IV** (verdaderas ancladas, falsa nunca verbatim); 24.5.2 concepto mejor desarrollado (correcta = más extensa) → **se reemplaza** por formato simple/combinación; 24.5.3 cero absurdos → se conserva y extiende a proposiciones; 24.5.4 plausibilidad ≥ 1 distractor con vocabulario compartido → se conserva/adapta; 24.5.5 homogeneidad ≤ 1.6 + correcta más extensa → **se reemplaza** por tope de longitud de opciones (≤ 120 chars) y corrección de combinaciones; 24.5.6 cómputo aritmético (18 días hábiles notificados un lunes → jueves 4ª semana) → **se reemplaza** por plazo simple dogmático («¿de cuántos días es el plazo?» con distractores numéricos simples) conservando `"Conclusión:"`; 24.5.7 regresión 24.4 → se conserva.
- Totales actuales: e2e **810**, auth **132**, mobile **20**, dedup **8** (980 total). El conteo e2e cambia al adaptar 24.5 (declarar el nuevo total en el commit).

## CAMBIOS A IMPLEMENTAR

### PARTE A — Nuevo motor de preguntas simples (solo dogmáticas) en `js/question-developer.js`

1. **Modalidad única dogmática por ahora:** en `_getQuestionSpecsForNature` y `_archetypeQueue`, toda cédula genera el mismo mix dogmático simple. `NATURE_TAXONOMY` y `detectNature` se conservan sin cambios (metadato de clasificación y preparación de la etapa de casos «aparte»); cada pregunta generada lleva `nature: "dogmatic"` (compatible con el chip actual del quiz, que mostrará «Pregunta Dogmática»).

2. **Nueva cola por cédula (exactamente 4, orden de preferencia con fallback):**
   `requisitos (combinación I–IV)` → `características (combinación I–IV)` → `elementos del concepto (combinación I–IV)` → `plazo simple (numérico)` → `definición simple` (relleno hasta completar 4; nunca repetir el mismo arquetipo salvo definición como último recurso).

3. **Nuevos arquetipos (reemplazan la mecánica «más extensa»):**
   - `_specCombinacionRequisitos(ctx, cites)` — «Según el apunte, ¿cuáles de los siguientes son **requisitos** de [institución]?» con proposiciones I-IV **cortas** extraídas de `_extractRequisitos` (ver punto 5).
   - `_specCombinacionCaracteristicas(ctx, cites)` — «…¿cuáles de las siguientes son **características** de [institución]?» desde `_extractTraits` (existe, p. ej. «ser…», «constar…», rasgos de la institución).
   - `_specCombinacionElementos(ctx, cites)` — «Identifica los **elementos** que integran el concepto de [institución]:» desde `_extractElementos`.
   - `_specPlazoSimple(ctx, cites)` — «¿De cuántos días años es el plazo de [regla del apunte]?» o «El plazo establecido es de:» con **4 distractores numéricos simples** (cambiar el número, la unidad días↔años, o hábiles↔corridos; p. ej. correcta «18 días hábiles» → distractores «5 días hábiles», «18 días corridos», «30 días hábiles», «5 días corridos»). Nunca cómputo aritmético de fecha.
   - `_specDefinicionSimple(ctx, cites)` — «¿Qué es [institución]?» con la definición real **corta** del apunte (≤ ~160 chars) como correcta y distractores cortos: definición de una institución afín (`_AFIN_BANK` o mutación simple) o negación evidente. **Sin** mecánica de «más desarrollada».

4. **Gramática de la combinación I–IV (reglas exactas):**
   - Se extraen **3 proposiciones verdaderas** (T1, T2, T3) del apunte como cláusulas cortas (requisitos/características/elementos reales; cada una ≤ ~90 chars) y se fabrica **1 proposición falsa (F)** por **mutación simple** de una real: negación («…no es requisito…»), cambio de número/unidad, inversión de sujeto/predicado o sustitución por institución afín. La falsa **nunca** debe aparecer verbatim en el contenido del apunte.
   - Enunciado: identificar cada proposición con numerales romanos y saltos de línea: `I. …\nII. …\nIII. …\nIV. …`. Orden de presentación de I-IV **determinista** por cédula (barajado con el PRNG sembrado, o fijo por extracción — se acepta cualquiera, pero reproducible).
   - Opciones A-E (5): la **correcta = {T1, T2, T3}** («I, II y III»); los **4 distractores** son combinaciones simples que **incluyen al menos una proposición falsa o omiten al menos una verdadera**, p. ej.: «Solo IV» (todo falso), «I y IV» (mezcla con falsa), «I y II» (omite T3), «II y III» (omite T1). La opción correcta debe ser la única que incluya **todas** las verdaderas y **ninguna** falsa; ningún distractor puede ser el conjunto exacto de verdaderas.
   - Longitud de cada opción-combinación ≤ **120 chars**; formato legible («I y II», «I, II y III», «Solo III»…). Barajado de letras A-E determinista igual que hoy (`mulberry32(seed + qNum*997)`).
   - `solucionDogmatica` del arquetipo: justifica cada proposición (por qué I, II, III son correctas y IV falsa, citando la regla), la combinación correcta, y cierra con `"Conclusión:"` — **mantiene ≥ 150 chars** (contrato 24.4.2). `pauta`: una línea de dominio del contenido.

5. **Nuevos extractores (arriba del bloque v7.15, reutilizando `_extractTraits` y `_extractPlazo`):**
   - `_extractRequisitos(content)`: oraciones/enumeraciones que marcan requisitos («requisitos», «se requiere», «debe», «es necesario», «para su validez/existencia», listas «1°… 2°…», «a)… b)…»); retorna cláusulas cortas (3+ o `[]`).
   - `_extractElementos(content)`: oraciones con «elementos», «integran», «comprende», «se compone de», «componentes», «partes del concepto»; retorna 3+ cláusulas cortas o `[]`.
   - `_componentFalsa(clausulasReales, ctx)`: mutador determinista de una cláusula real (reglas del punto 4) con verificación anti-verbatim y anti-absurdos.
   - Si un arquetipo no obtiene 3+ verdaderas → ese arquetipo se omite y se avanza en la cola (fallback definición simple). Las aserciones 24.4.2 (4 preguntas) siguen garantizadas por el relleno.

### PARTE B — Carpeta `MODELOS_DE_PRUEBA/` + compilador de estructura

1. **Crear la carpeta raíz `MODELOS_DE_PRUEBA/`** con:
   - `README.md`: propósito («aprender la estructura de las preguntas de exámenes reales»), cómo depositar exámenes (archivos `.md`/`.txt`, cualquier rama del derecho: penal, laboral, tributario, procesal, etc.; un examen por archivo; máx. 64 KB), y el aviso explícito de que **solo se extrae estructura, nunca contenido**.
   - `_estructura_extraida.md`: documento generado en esta implementación que resume la gramática observada/establecida (enunciados con lista I-IV, combinaciones de alternativas, preguntas de requisitos/características/plazos numéricos, definiciones cortas) — es la memoria del puente para el humano.
   - (Opcional) 1-2 **ejemplos semilla** sintetizados con la estructura canónica (marcados como ficticios, para que el humano vea el formato y pueda reemplazarlos por exámenes reales).
2. **Compilador `extract_estructura_pruebas.py`** (patrón de `generate_clean_notes_data.py`, determinista e idempotente):
   - Escanea `MODELOS_DE_PRUEBA/*.md|*.txt` (ignora `README.md` y `_estructura_extraida.md`), extrae de cada examen solo patrones estructurales: presencia de listas numeradas/romanistas (I-IV), combinaciones de alternativas («a) I y II»), preguntas de requisitos/características/plazos, y las frecuencias de esas formas.
   - Genera `js/exam-structure-grammar.js` (comprometido): un objeto estático `EXAM_STRUCTURE_GRAMMAR` (ej. `{ combinationFormat: true, statementCounts: [4], optionPatterns: [...], questionKinds: ["requisitos","caracteristicas","elementos","plazo","definicion"] , maxOptionChars: 120 }`).
   - **Nunca** escribe en `question-developer.js` contenido de las pruebas; la gramática solo habilita/parametriza los formatos del PARTE A.
3. **Integración:** `QuestionDeveloper` consume `EXAM_STRUCTURE_GRAMMAR` (si la constante existe vía `globalThis`/módulo) para parámetros del formato (conteo de proposiciones y tope de caracteres); en su ausencia usa los valores por defecto de PARTE A (el motor funciona igual sin modelos). Los modelos de otras ramas jamás participan en `extractCitations` ni en `sourceCitations`.

### PARTE C — UI de quiz (`js/app.js` + `index.html` + `css`)

1. Renderizado de enunciados **multilínea**: `q.questionText` trae `\n` entre I-IV; renderizar con saltos de línea preservados (estilo `white-space: pre-line` en `.quiz-question-text` o dividir por `\n` y pintar `<p>` por proposición), manteniendo las opciones `.quiz-option` con su letra A-E debajo. Sanitizar cada texto con `SecurityShield.escapeHtml`/`textContent` (patrón existente).
2. Sin cambios en `.quiz-solution`, banner 4/4, barajado de letras ni contrato de `StorageService`. Verificar que la solución apilada (que ahora lista proposiciones I-IV) se muestre legible.

### PARTE D — SEGURIDAD (recordatorio obligatorio)

- Todo texto de enunciado, proposición, opción y solución se escapa contra XSS en el origen antes de insertarse al DOM (mismo patrón que hoy).
- Los archivos de `MODELOS_DE_PRUEBA/` se leen con límite de tamaño (64 KB) y solo extensiones `.md`/`.txt`; contenido ajeno **nunca** se incrusta en preguntas, `sourceCitations`, ni en la solución dogmática (anti-contaminación y anti-absurdo dogmático).
- Determinsmo intacto: ningún uso de `Math.random` en el nuevo código de generación (solo `fnv1a` + `mulberry32` sembrado por cédula); dos corridas idénticas.
- No añadir dependencias; no exponer los modelos en logs ni en payloads.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **`test_e2e_case_flow.cjs`:**
   - **Conservar 24.4** (los 6 subbloques deben pasar sin edición).
   - **Reescribir Subsección 24.5** → «Sencillez y formato combinación I–IV (v7.17)» con bloques (nombres de referencia, adaptar los existentes):
     - 24.5.1 anclaje: en las 103 cédulas, toda proposición **verdadera** de una pregunta de combinación comparte bigramas con el contenido del apunte, y la proposición **falsa** no aparece verbatim.
     - 24.5.2 formato: toda pregunta es `nature: "dogmatic"`; cuando es de combinación (requisitos/características/elementos), el enunciado contiene 4 proposiciones I–IV y la opción correcta es exactamente el conjunto de proposiciones verdaderas (ninguna falsa, todas las verdaderas); cada distractor incluye ≥ 1 falsa u omite ≥ 1 verdadera; opciones ≤ 120 chars.
     - 24.5.3 cero absurdos (conservado): `_BANNED_ABSURD` con cero hits en enunciados, proposiciones, opciones y soluciones de las 103 cédulas.
     - 24.5.4 plausibilidad: cada pregunta tiene ≥ 1 distractor que comparte vocabulario con las proposiciones verdaderas.
     - 24.5.5 sencillez: toda opción (no solución) ≤ 120 chars; la correcta **no** tiene que ser la más extensa; enunciados ≤ ~420 chars.
     - 24.5.6 plazo simple: `procesal-procemayor-5-2` genera la pregunta de plazo con la opción correcta = plazo real del apunte (18 días hábiles) y distractores numéricos simples (distintos número/unidad); `solucionDogmatica` ≥ 150 chars + `"Conclusión:"`.
     - 24.5.7 regresión 24.4 (conservado): 4×5, citas subconjunto, determinismo.
     - + verificación de que **no existe** pregunta `_specCaso` (`nature: "case"` o enunciado con supuesto fáctico) en ninguna cédula (requisito «casos aparte»).
   - Declarar y documentar el **nuevo total e2e** (el número de aserciones cambia; actualizar también el conteo en CONTEXT.md y en la bitácora).
2. **`test_deduplication_flow.cjs` (o nueva mini-suite):** fixture temporal en `MODELOS_DE_PRUEBA/` (un examen semilla con estructura I-IV) → `extract_estructura_pruebas.py` genera `js/exam-structure-grammar.js` con los patrones esperados; limpiar fixture al final (patrón de fixtures temporales ya usado en v7.9).
3. **Suites completas al 100 % PASS:** las 4 (`test_unlock_auth_flow.cjs`, `test_e2e_case_flow.cjs`, `test_deduplication_flow.cjs`, `test_mobile_header_theme.cjs`).
4. **`CONTEXT.md` a actualizar (versión objetivo v7.17):**
   - Sección 2.x/7.3 (contratos del `QuestionDeveloper`): nuevo perfil «simple y claro — formato combinación I–IV», solo dogmáticas, plazos numéricos, tope 120 chars, casos aparte; contrato 24.4 intacto.
   - Sección 8 (mapa de archivos): filas `js/question-developer.js`, `js/app.js`, `index.html`, `test_e2e_case_flow.cjs` actualizadas, y **nuevas filas** `MODELOS_DE_PRUEBA/`, `extract_estructura_pruebas.py`, `js/exam-structure-grammar.js`; fila `PROMPTS/` → añadir «014 preguntas simples de verificación (combinación I–IV, solo dogmáticas) + modelos de prueba estructurales ✅/📝 v7.17».
   - Bitácora Sección 9 → nueva entrada **v7.17** con misión, el nuevo formato (con un ejemplo canónico I–IV), carpeta de modelos, guardrails y conteos de pruebas.
   - `PROMPTS/README.md` fila 014 → `✅ Implementado (v7.17)`.
5. Componentes no tocados: `server.py`, endpoints, `test_unlock_auth_flow.cjs`, `test_mobile_header_theme.cjs` (solo re-ejecutar).

## DEFINITION OF DONE

- [ ] `js/question-developer.js`: mix dogmático único; nuevos arquetipos `_specCombinacionRequisitos`/`_specCombinacionCaracteristicas`/`_specCombinacionElementos` (I–IV), `_specPlazoSimple` (numérico) y `_specDefinicionSimple`; mutador `_componentFalsa` anti-verbatim; extractores `_extractRequisitos`/`_extractElementos`; cero preguntas `_specCaso` emitidas.
- [ ] Formato combinación conforme: 4 proposiciones I–IV, correcta = todas las verdaderas (sin falsas), cada distractor con ≥ 1 falsa u omitiendo ≥ 1 verdadera, opciones ≤ 120 chars, determinismo idéntico entre corridas.
- [ ] `MODELOS_DE_PRUEBA/` creada con `README.md` + `_estructura_extraida.md` (+ semillas opcionales) y `extract_estructura_pruebas.py` que genera `js/exam-structure-grammar.js` determinista (contenido de modelos jamás incrustado en preguntas/citas).
- [ ] UI de quiz renderiza enunciados multilínea I–IV legibles y opciones A-E sanitizadas; sin cambios en `StorageService` ni en el auto-completado 4/4.
- [ ] `test_e2e_case_flow.cjs`: Subsección 24.4 intacta al 100 %; Subsección 24.5 reescrita (perfil simple I–IV + plazo simple + cero `case`); nuevo total e2e declarado; fixture de `MODELOS_DE_PRUEBA` testeado; las 4 suites al 100 % PASS.
- [ ] `CONTEXT.md` v7.17 actualizado (7.3, 8 con filas nuevas, bitácora 9) y `PROMPTS/README.md` fila 014 ✅ Implementado (v7.17).
- [ ] Commits + push a `main`.

## NOTAS PARA EL EJECUTOR

- **Ejemplo ilustrativo del formato (no es texto extraído; solo muestra la estructura):**
  > «Según el apunte, ¿cuáles de los siguientes son requisitos del acto jurídico?  
  > I. La manifestación de voluntad.  
  > II. La capacidad del autor.  
  > III. El objeto lícito.  
  > IV. La inscripción en el Registro Conservatorio.  
  > a) I, II y III  b) I y IV  c) Solo IV  d) I y II  e) II y III  
  > (correcta: a) — I, II y III son requisitos reales; IV es la falsa por mutación)».
  La solución dogmática debe explicar por qué I-II-III son verdaderas y IV falsa, y cerrar con «Conclusión:».
- El contrato 24.4 es el **ancla de compatibilidad**: si una aserción de 24.4 fallara tras el cambio, es un bug (no ajustar el test). 24.5 es la sección que se reescribe.
- La correcta **ya no debe ser la más extensa** (se elimina la normalización ± y el ratio ≤ 1.6 como requisito; el tope es de longitud máxima, no de homogeneidad). Borrar/neutralizar los helpers v7.15 que solo servían para esa mecánica (`_normalizeLengths`, `_padTo`/banco cíclico, etc.) si quedan huérfanos — con cuidado de no romper `validateSectionQuestions` (adaptar sus warnings: anclaje ahora sobre proposiciones, homogeneidad desactivada o reemplazada por el tope).
- Los exámenes reales que el humano deposite en `MODELOS_DE_PRUEBA/` pueden ser de **otras ramas del derecho**: su utilidad es estructural. El puente ya estableció la gramática canónica (I–IV + combinaciones + plazo numérico + definición corta): el compilador solo la valida/parametriza, y el humano puede ampliar `_estructura_extraida.md` si aparece un patrón nuevo.
- La etapa de preguntas de **caso** queda fuera deliberadamente (el usuario: «los casos sera aparte»); no eliminar `NATURE_TAXONOMY.case` ni `_specCaso` (se reutilizarán), solo no emitirlos ahora.
- Si una cédula solo permite definir (sin requisitos/características/elementos/plazo), las 4 preguntas se rellenan con definiciones simples **variadas** (mutaciones de institución afín) para no duplicar enunciados.