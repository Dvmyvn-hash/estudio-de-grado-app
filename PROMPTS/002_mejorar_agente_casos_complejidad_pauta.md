# PROMPT 002 — Mejora Integral del Agente de Creación de Casos: Complejidad, Rúbrica AIME 2026-20, Precisión Sin Vaguedad, Apego Estricto a las Fuentes y Nutrición desde los Apuntes Cargados

> **Versión:** v1.1 · **Fecha:** 2026-09-21 · **Autor:** puente (dpint)
> **Estado:** ✅ Implementado (v7.3) · **Depende de:** PROMPT 001 (subida de apuntes desde admin; el diseño de la Parte F es compatible con o sin él)
>
> **v1.1 (revisión):** incorpora la **Parte F** — el agente debe nutrirse también de los **apuntes cargados/dinámicos** (`/api/sync-topics` + `INITIAL_DATA.topics`): los nuevos apuntes subidos por el administrador pasan a ser fuente viva de casos, doctrina y cobertura temática, con guardrails anti-alucinación.

> Copia y pega este bloque completo como prompt inicial en tu agente de Antigravity IDE. Está redactado para ejecutarse dentro del repositorio `estudio-de-grado-app` (GRADOMANIACOS) conforme a las reglas de `AGENTS.md`.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional), y como jurista chileno especializado en la metodología de comisiones examinadoras de grado (Protocolo AFG 2026-20, Pauta de Análisis de Hechos 2026 y Rúbrica Oficial AIME 2026-20). Implementa de forma completa la siguiente funcionalidad **respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio**.

## MISIÓN

Elevar la calidad dogmática, la complejidad lógica y la utilidad pedagógica de los casos generados por `CaseGeneratorAgent` (`js/case-generator-agent.js`), de modo que:

1. **Cada caso** presente un problema jurídico relativamente complejo, lógico y resoluble con los datos entregados, estructurado según la Pauta 2026 (hechos principales, secundarios, distractores, partes e instituciones), con **3 a 4 preguntas** de alternativas (A–E) de dificultad graduada y, al menos en un tercio de los casos, con cruce interdisciplinario (civil + procesal; civil + constitucional; procesal + constitucional).
2. **Cada respuesta o solución legal** esté **fundamentada de manera precisa, clara y definitiva, sin vaguedad**: cita exacta de norma + artículo (+ inciso/numeral cuando aplique), silogismo completo (premisa mayor → premisa menor → conclusión irrefutable) y una **`Conclusión:`** explícita que resuelva el problema.
3. **Cada pregunta** esté anclada a la **Rúbrica Oficial AIME 2026-20** en sus 4 dimensiones (Marco Jurídico 0.5 · Hechos Relevantes 1.0 · Subsunción 2.0 · Precisión Técnica 0.5) con *guiding question* y descriptores graduados (sobresaliente/suficiente/básico/insuficiente), más su **`errorFatalDeGrado`** (el concepto erróneo inadmisible que la pregunta busca filtrar).
4. **Todo el contenido emitido** tenga **apego estricto a las fuentes implementadas**: `fuentes/*.md` (civil, procesal, constitucional, derecho_de_bienes), el corpus `FUENTES_CORPUS`, la pauta `CASOS/1_PAUTAS_EVALUACION/pauta_rubrica_resolucion_casos.md` (sin exponerla: Zero Exposure), el índice temático canónico `all_afg_topics.json` (53 cédulas/tópicos) **y los apuntes cargados (dinámicos)**: secciones extraídas de `~/Desktop/Fuentes_Grado/APUNTES/` y de las subidas por el administrador, servidas por `/api/sync-topics` e `INITIAL_DATA.topics`. Garantizando que **no se invente ni se cite de memoria** ningún artículo que no exista en esas fuentes.
5. **El agente se nutre de los nuevos apuntes cargados**: cada vez que se suben o cambian apuntes (Panel Admin → `POST /api/admin/upload-notes` del PROMPT 001, o nuevos archivos en la carpeta vigilada de APUNTES), el generador debe **absorber automáticamente** esas secciones como fuente viva para: enriquecer doctrina y distractores, ampliar `linkedTopics`/`linkedApuntes`, extender la cobertura del temario y mantener las citas verificadas (sin inventar contenido que no esté en un apunte o fuente real).

## REGLAS OBLIGATORIAS DEL REPOSITORIO (ADEMÁS DEL CÓDIGO)

1. **`CONTEXT.md` es la única fuente canónica de verdad.** Todo cambio de código, datos, esquemas o pruebas DEBE quedar documentado en `CONTEXT.md` al terminar la tarea (Sección 1.2/1.3 si cambia la rúbrica o guardrails, Sección 2.3 si cambia el esquema JSON de casos, Sección 8 mapa de archivos y **Bitácora de Versiones de la Sección 9, propuesto como v7.1**; si el PROMPT 001 (`v6.8`, "Subida de Apuntes") ya se ejecutó antes, re-basar el número al siguiente hito libre).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; **agregar** pruebas nuevas para esta funcionalidad (ver PARTE E).
3. No romper la compatibilidad de los identificadores, clases y contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `CaseGeneratorAgent`, `CaseSolver`, `SecurityShield`, esquema `all_cases.json`, endpoints `/api/ai/*`).
4. Toda entrada de usuario debe sanitizarse en el origen (`SecurityShield.escapeHtml` / `textContent`); el backend conserva los guardrails anti path traversal, `MAX_PAYLOAD_SIZE` y validaciones canónicas.
5. **Confidencialidad Zero Exposure:** el contenido del archivo `CASOS/1_PAUTAS_EVALUACION/pauta_rubrica_resolucion_casos.md` y de la carpeta `1_PAUTAS_EVALUACION` es estrictamente confidencial. El motor puede **inspirarse en su estructura metodológica** (ya reflejada en `CONTEXT.md` §1.2 y en el código) pero no debe exponerlo, copiarlo literalmente ni servirlo por ningún endpoint.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

"Quiero un prompt para poder mejorar el agente de creación de casos, sus respuestas y que pueda ser mucho más completo en razón de los contenidos a evaluar y la pauta, identificando problemas relativamente complejos, lógicos y con respuesta o solución legal fundamentada de manera precisa, clara, sin vaguedad y con estricto apego a las fuentes implementadas."

Es decir: hoy el `CaseGeneratorAgent` produce casos válidos pero con limitaciones observables —cobertura parcial del temario (10 arquetipos para 53 tópicos), explicaciones que a veces no cierran una conclusión definitiva, `modelSolution` genérico, cobertura irregular de los 4 criterios de la rúbrica en algunas preguntas, referencias dogmáticas que deben verificarse contra las fuentes reales del repo **y un total desacople de los apuntes cargados (no los usa como fuente de contenido ni doctrina)**—. El objetivo es convertir al generador en una fábrica de casos de nivel examen de grado: complejos, lógicos, exhaustivos en la pauta, **estrictamente fieles a las fuentes implementadas** y **nutridos en tiempo real por los apuntes que se vayan cargando**, con soluciones modelo impecables que el estudiante pueda estudiar como respuesta oficial.

## DIAGNÓSTICO DEL ESTADO ACTUAL (levantado del código — no asumir)

- **`js/case-generator-agent.js` (núcleo del cambio):**
  - `FUENTES_CORPUS` (líneas ~23-56): mini-resumen embebido de las 4 fuentes (`civil.md`, `derecho_de_bienes.md`, `procesal.md`, `constitucional.md`) con secciones `{name, rules, doctrine}`. No se regenera automáticamente desde los `.md` reales; riesgo de desfase con `fuentes/*.md` (fuente canónica real de la cátedra).
  - `INSTITUTIONS` (líneas ~71+): catálogo de instituciones con `rules` (citas) y `incompatibleWith`/`incompatibilityReasons` (matriz de incompatibilidad dogmática ya funcional).
  - `synthesizeCase()` (línea 1109): define los **10 arquetipos** en línea — `bienes_posesion_doble_venta`, `lesion_enorme_dolo_mandato`, `cautelares_radicacion_mandato`, `clausula_penal_ejecutivo`, `responsabilidad_medica_chance`, `transaccion_equivalente_excepcion`, `imparcialidad_prejuzgamiento_momentos`, `resolucion_pacto_comisorio`, `nulidad_absoluta_simulacion`, `recurso_proteccion_autotutela`— cada uno con `subjects`, `targetInsts`, `linkedFuentes`, `linkedTopics`, `dogmaticPrinciples` y un `build()` que retorna `{title, facts, breakdown, questions}`.
  - Preguntas: cada una trae `area`, `questionText`, 5 `options`, `correctAnswer`, `explanation` y `officialRubric`. **Algunos arquetipos ya implementan bien la rúbrica de 4 dimensiones con `guidingQuestion` + descriptores**; hay que **estandarizarla en el 100 % de las preguntas**, sin excepciones ni rúbricas truncadas.
  - `modelSolution` (línea ~2331): **placeholder genérico** `"Revisar la justificación y desglose oficial en cada una de las 3 preguntas..."`. Debe convertirse en una solución modelo completa (Conflicto → Fundamento normativo → Subsunción → Conclusión definitiva).
  - `methodology` (líneas ~2325-2330): `legalBasis` rellena desde `breakdown.instituciones`; `applicationReasoning` y `dogmaticFramework` son **texto genérico fijo** en lugar del razonamiento real del caso.
  - `linkedTopics`: usa ids reales del índice (p. ej. `civil-los -1-3`, `civil-acto-1-4`) pero no se valida que existan; algunos arquetipos los omiten.
  - **Desacople total de los apuntes:** `syncFuentesFromServer()` (línea ~58) descarga `/api/fuentes` a `serverFuentes` pero **ese dato no se usa en `synthesizeCase()`**; el agente **ignora por completo `/api/sync-topics` e `INITIAL_DATA.topics`** (los 53 tópicos y cualquier apunte cargado). No existe `APUNTES_INDEX` ni cacheo de apuntes.
- **Flujo real de los apuntes (para la Parte F, no asumir otra cosa):**
  - Los apuntes viven en `~/Desktop/Fuentes_Grado/APUNTES/`. `generate_clean_notes_data.py` usa `FILES_CONFIG` **estático** (`ACTO JURIDICO.md`, `LOS BIENES.md`, `LAS OBLIGACIONES.md`, `CLASE_9_11.md`, `PROCESAL.md`, `CONSTITUCIONAL.md`) y `extract_sections_from_file(cfg)` extrae las secciones `Sección N.N` en vivo.
  - `server.py` → `get_all_synced_topics()` (línea ~483) llama `extract_sections_from_file` por cada config, **regenera `all_afg_topics.json`** y lo sirve por `GET /api/sync-topics` → `{topics, count}` (línea ~920).
  - Cada sección del apunte tiene `{id, subject, discipline, sectionName, chapterNumber, chapterTitle, category, code, title, cleanTitle, sourceFile, userSourceFiles, hasUserNotes, tags, isFree, content, charCount, connections}` (ids dinámicos como `civil-acci-1-1`).
  - El PROMPT 001 añadirá `POST /api/admin/upload-notes` + `apuntes_registry.json` + `build_files_config()` para que los apuntes subidos por admin entren al mismo flujo (`all_afg_topics.json` regenerado → visible en `/api/sync-topics`). **La Parte F debe funcionar con o sin el PROMPT 001 implementado** (si el registry no existe, seguir soportando el `FILES_CONFIG` estático y los 53 tópicos).
- **Fuentes implementadas disponibles (apego obligatorio):**
  - `fuentes/civil.md`, `fuentes/derecho_de_bienes.md`, `fuentes/procesal.md`, `fuentes/constitucional.md` — texto canónico de la cátedra servido por `/api/fuentes` y leído por `syncFuentesFromServer()`.
  - `all_afg_topics.json`: **53 tópicos** con `{id, code, title, subject, ...}` (`civil-acto-1-1`…, `civil-los -1-1`…), índice canónico que alimenta el sidebar (Sección 3.1 de CONTEXT.md).
  - `CASOS/1_PAUTAS_EVALUACION/pauta_rubrica_resolucion_casos.md`: rúbrica oficial (Dimensión 1 Hechos 20 %, Dimensión 2 Fundamento Normativo 25 %, Dimensión 3 Subsunción 30 %, Dimensión 4 Rigor Dogmático 25 %) — **confidencial, no copiar ni exponer**; solo tomar su metodología para enriquecer descriptores.
- **Esquema canónico de salida** (CONTEXT.md §2.3 y `all_cases.json`): `{id, title, subjects, difficulty, summary, facts, factsBreakdown:{principales,secundarios,distractores,partes,instituciones}, questions:[{id,number,area,questionText,requiresJustification,options:[{id,text}],correctAnswer,explanation,officialRubric:{criterio1Marco,criterio2Hechos,criterio3Subsuncion,criterio4Precision}}], methodology:{conflict,legalBasis,applicationReasoning,dogmaticFramework}, linkedFuentes, linkedTopics, dogmaticPrinciples, modelSolution, ...}`.
- **Renderizado** (`js/case-solver.js`): consume `linkedTopics`, `linkedFuentes`, `dogmaticPrinciples` (líneas ~317-340) y `modelSolution` (línea ~1082). Cualquier campo nuevo debe respetar ese contrato (o extenderse con render compatible).
- **Ninguna dependencia LLM externa conectada todavía:** el generador es **determinístico/algorítmico** (CONTEXT.md §4.1 contempla un futuro Gemini API con fallback local). Todo lo que se escriba es JavaScript puro ES6; **no agregar fetch a APIs LLM**.

## CAMBIOS A IMPLEMENTAR

### PARTE A — ANCLAJE ESTRICTO A LAS FUENTES IMPLEMENTADAS (`js/case-generator-agent.js` + `js/data.js`)

1. **Sincronizar `FUENTES_CORPUS` con las fuentes reales:** mantener el corpus embebido como *fallback* offline, pero al iniciar (o en `syncFuentesFromServer()`) intentar reconstruirlo desde `GET /api/fuentes` y **verificar** que las citas (`rules`) de cada sección coincidan con las citas realmente presentes en `fuentes/*.md`. Si una cita del corpus no existe en la fuente real, corregirla (nunca borrar silenciosamente: emitir `console.warn` con la discrepancia).
2. **Mapa de ítems del temario (`all_afg_topics.json`):** cargar el índice de 53 tópicos (desde `/api/sync-topics` si está disponible, o desde el `topics` de `js/data.js`) en un nuevo índice `TOPICS_INDEX` (`{id, code, title, subject, keywords}`). Este índice es la **semilla canónica**; la Parte F añade el índice dinámico `APUNTES_INDEX` que lo extiende con los apuntes cargados (sin duplicar ids).
3. **Validador de integridad de citas (`assertCitationIntegrity`):** función que recorre `INSTITUTIONS`, todos los `rules`, todas las `explanation` y los `officialRubric` de los 10 arquetipos y verifica que cada referencia del tipo `Art. NNN [CC|CPC|COT|CPR]` tenga una contraparte textual en `FUENTES_CORPUS` o en el `TOPICS_INDEX`. Debe ejecutarse al final de `synthesizeCase()` y loguear un diagnóstico. **Cero citas de memoria.**
4. **Corregir/validar `linkedTopics`:** toda pregunta o arquetipo que declare `linkedTopics` debe apuntar a ids **existentes** en `TOPICS_INDEX`; si un id no existe, reemplazarlo por el id real del tópico equivalente, y documentar las correcciones en `CONTEXT.md` §2.3.

### PARTE B — COMPLEJIDAD LÓGICA Y COBERTURA COMPLETA DEL TEMARIO

1. **Cobertura sistemática del temario:** construir una **tabla de cobertura arquetipo ↔ tópicos** (en comentario JSDoc del archivo y en `CONTEXT.md` §2.3) que demuestre que, en conjunto, los arquetipos alcanzan **los tópicos centrales de las 4 fuentes** (Teoría del Acto Jurídico, Obligaciones, RCE, Bienes/Posesión, Competencia y Jurisdicción, Juicio Ordinario/Cautelares, Recursos, Garantías Constitucionales, Acciones Constitucionales). **No se exige** un arquetipo por cada uno de los 53 tópicos, pero sí que:
   - Cada institución publicada en `INSTITUTIONS` tenga **al menos un** arquetipo que la ejercite (si no, añadir el arquetipo o marcar la institución como "de cobertura doctrinaria" y excluirla del menú de generación para no vender casos inexistentes).
   - Al menos **3 arquetipos nuevos y de cruce interdisciplinario** (p. ej. Civil→daños + Procesal→competencia/medidas; Civil→contratos + Procesal→ejecutivo; Constitucional→protección + Procesal→competencia de las Cortes) para que el agente pueda "identificar problemas relativamente complejos, lógicos" que atraviesen más de una rama.
2. **Arquitectura de preguntas graduada (patrón obligatorio para arquetipos nuevos y refactor de los existentes):**
   - **P1 — Núcleo dogmático** (institución central del caso): el estudiante debe identificar el régimen aplicable.
   - **P2 — Matiz o trampa dogmática** (distractor conceptual fino, p. ej. plazo, inciso, requisito de procedencia).
   - **P3 — Vía adjetiva / solución procesal** (acción, excepción, recurso o competencia idónea).
   - **P4 (opcional) — Pauta / criterio excepcional** (doctrina, jurisprudencia consolidada o límite de la institución; solo si el caso lo soporta).
   - Cada pregunta debe **depender lógicamente de los mismos hechos** (misma litis), no ser preguntas inconexas.
3. **Graduación de plausibilidad en las 5 alternativas:** la opción correcta nunca debe distinguirse por longitud, obviedad ni redacción descuidada; **al menos 2 opciones incorrectas deben ser "seductoras"** (invitan a un error dogmático concreto y verosímil) y **ninguna debe ser absurda**. La `explanation` debe refutar expresamente las seductoras.
4. **Riqueza fáctica — Pauta 2026:** en los `facts` y `factsBreakdown`, garantizar: fechas y plazos determinantes, montos, inmuebles/CBR, juzgados, notarios, individualización de partes principales y secundarias, y **al menos 1 hecho distractor** por caso que sea semánticamente tentador (p. ej. entrega material vs. posesión inscrita; muerte del mandante en mandato judicial vs. civil). Si un arquetipo existente tenía distractores débiles o ausentes, reforzarlos.

### PARTE C — PAUTA, RÚBRICA Y "CONTENIDOS A EVALUAR" (COMPLETITUD TOTAL)

1. **Rúbrica AIME 2026-20 estandarizada al 100 %:** toda pregunta **debe** incluir `officialRubric` con las 4 dimensiones y sus pesos canónicos, sin excepción:
   - `criterio1Marco` (0.5), `criterio2Hechos` (1.0), `criterio3Subsuncion` (2.0), `criterio4Precision` (0.5).
   - Cada dimensión con `{name, maxPoints, guidingQuestion, outstanding, sufficient, basic, insufficient}` (descriptores alineados a la metodología del dossier `pauta_rubrica_resolucion_casos.md`: hechos vinculantes vs. accesorios; precisión del articulado; silogismo completo con carga de la prueba; rigor dogmático y doctrina, sin "sentido común").
2. **Datos de pauta por pregunta (nuevos campos, render compatibles con `CaseSolver`):**
   - `pauta`: texto breve de *"Pauta de Evaluación y Criterios del Profesor"* (qué se evalúa en esa pregunta y qué respuesta se premia).
   - `errorFatalDeGrado`: concepto erróneo inadmisible que esa pregunta detecta (p. ej. *"confundir entrega material con tradición conservatoria"*), alineado con el formato `PLANTILLA_CASO.md`.
   - Renderizar ambos campos en el workbench (sección de retroalimentación) usando `SecurityShield.escapeHtml`.
3. **`modelSolution` real (eliminar el placeholder):** construir una solución canónica completa por caso con la estructura de `PLANTILLA_CASO.md`:
   1) Conflicto y hechos determinantes; 2) Fundamento normativo con artículos exactos; 3) Subsunción (premisa mayor/menor → conclusión); 4) Dogmática y doctrina. Debe redactarse caso a caso en el `build()` del arquetipo (con las variables mutadas insertadas), no como constante genérica.
4. **`methodology` con contenido real:** `legalBasis` debe enumerar artículos exactos (p. ej. `["Arts. 686, 724, 728, 1817 CC", "Art. 254 CPC"]`), `applicationReasoning` debe expresar el razonamiento real del caso y `dogmaticFramework` la teoría/principio dogmático concreto (ya existen ejemplos bien logrados, replicar ese nivel).
5. **`dogmaticPrinciples` y `linkedFuentes`:** verificar que existan en todos los arquetipos y que `linkedFuentes.rules` coincida con las citas usadas en las preguntas.

### PARTE D — PRECISIÓN Y ANTI-VAGUEDAD (guardrails de redacción obligatorios)

1. **Cierre conclusivo:** toda `explanation` debe terminar con una línea **`Conclusión:`** que resuelva de manera definitiva el problema planteado (no dejar "depende", "probablemente" ni finales abiertos). Si el arquetipo no lo tenía, añadirlo a las 10 explicaciones (o más) que genere.
2. **Cita forense exacta:** prohibido citar "el Código Civil" a secas; se exige norma + artículo (+ inciso/numeral cuando aplique), p. ej. `Art. 1552 CC`, `Art. 529 COT`, `Art. 464 N° 7 CPC`, `Art. 19 N° 3 inc. 6 CPR`. Revisar y corregir cada explicación existente que cite de forma genérica.
3. **Prohibido el hedging forense:** eliminar muletillas ("podría decirse", "en general", "se estima razonablemente", "depende del juez") cuando exista una solución dogmática uniforme. Tono seco, académico y de comisión de grado (CONTEXT.md §1.4).
4. **Refutación de seductoras:** cada `explanation` debe descartar expresamente las alternativas incorrectas seductoras, señalando el error dogmático concreto (no basta decir "es incorrecta").

### PARTE E — VALIDACIÓN, PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **`CaseGeneratorAgent.validateGeneratedCase(case)` (nuevo método):** tras `synthesizeCase()`, ejecutar y logguear un diagnóstico verificando:
   - 3-4 preguntas; 5 opciones por pregunta; `correctAnswer` existe entre los ids de `options`.
   - `officialRubric` completo con 4 dimensiones y `maxPoints` correctos (0.5/1.0/2.0/0.5).
   - `explanation` termina en `Conclusión:` (o `conclusion` presente).
   - Toda cita `Art. NN` de las explicaciones existe en el corpus (via `assertCitationIntegrity`), tolerando incisos textuales nuevos siempre que el artículo base esté en la fuente.
   - `linkedTopics[].id` existe en `TOPICS_INDEX` **y** `linkedApuntes[].topicId` existe en `APUNTES_INDEX` (con `sourceFile` solo nombre de archivo).
   - `factsBreakdown.distractores` no vacío; `modelSolution` tiene ≥ 400 caracteres y no contiene el placeholder histórico.
2. **Ampliar `test_e2e_case_flow.cjs`** con una sección nueva (p. ej. sección 23 "Calidad Dogmática del Motor de Casos IA") que fuerce la generación de **todos los arquetipos** (método auxiliar para inyectar la selección de instituciones por arquetipo o exponer los arquetipos para test) y aserte: 5 opciones por pregunta, rúbrica 4 dimensiones con pesos correctos, `explanation` con cierre conclusivo, `linkedTopics` válidos contra `all_afg_topics.json`, `distractores` no vacíos, `modelSolution` completo, y que el barajado (`shuffleQuestionOptions`) produjo opciones mezcladas.
3. **Ampliar la misma sección 23 con pruebas de nutrición desde apuntes (`syncApuntesFromServer` + `linkedApuntes`):**
   - Con el servidor levantado, `GET /api/sync-topics` entrega `topics`; verificar que `syncApuntesFromServer()` construye `APUNTES_INDEX` sin ids duplicados y que contiene los 53 tópicos (y los de apuntes cuando existan).
   - Tras generar un caso, verificar que `linkedApuntes` no vacío, con `topicId` existente en `APUNTES_INDEX` y `sourceFile` como nombre de archivo (sin rutas internas).
   - Verificar que `invalidateApuntes()` limpió el cache y que un segundo `syncApuntesFromServer()` vuelve a poblarlo (idempotencia).
   - Si el PROMPT 001 ya está implementado: subir un apunte de prueba por `POST /api/admin/upload-notes`, llamar `/api/sync-topics`, sincronizar el agente y generar un caso que incluya el tópico nuevo en `linkedApuntes`.
4. Ejecutar ambas suites y dejar **100 % PASS**; verificar que no se rompen los 91 tests existentes de `test_e2e_case_flow.cjs` ni los 101 de `test_unlock_auth_flow.cjs`.
5. **Actualizar `CONTEXT.md` SIEMPRE:** §1.2 (si cambia la descripción de la rúbrica o el patrón de preguntas), §2.3 (nuevos campos `pauta`, `errorFatalDeGrado`, `linkedApuntes`, solución modelo y tabla de cobertura arquetipo ↔ tópicos ↔ apuntes), §3.1 (flujo de sincronización de apuntes que alimenta al agente), §8 (responsabilidad ampliada de `case-generator-agent.js`), y Bitácora §9 v7.1 con fecha, alcance, archivos modificados y nº de pruebas aprobadas.

### PARTE F — NUTRICIÓN DINÁMICA DESDE LOS APUNTES CARGADOS (NUEVA FUENTE VIVA DEL AGENTE)

El agente debe **alimentarse de los apuntes cargados** (los 6 apuntes estáticos de `FILES_CONFIG` y, cuando el PROMPT 001 esté implementado, los nuevos apuntes subidos por el administrador vía `POST /api/admin/upload-notes`), convirtiéndolos en una fuente real de contenido y doctrina para la síntesis:

1. **`CaseGeneratorAgent.syncApuntesFromServer()` (nuevo método):**
   - Fetch a `GET /api/sync-topics` → `{topics, count}` y construcción del índice dinámico **`APUNTES_INDEX`** con el esquema real de secciones `{id, subject, discipline, chapterNumber, chapterTitle, code, title, cleanTitle, sourceFile, userSourceFiles, hasUserNotes, tags, isFree, content, charCount, connections}`.
   - **Fallback offline / GitHub Pages:** si `/api/sync-topics` no está disponible, construir `APUNTES_INDEX` desde `INITIAL_DATA.topics` (`js/data.js`). Si ambas vías fallan, degradar con gracia manteniendo solo `TOPICS_INDEX` (53 tópicos) y loguear aviso.
   - **Refresco automático (frescura de los apuntes):** llamar a `syncApuntesFromServer()` al inicializar y **después de cada generación**; además exponer `CaseGeneratorAgent.invalidateApuntes()` para que `App.startLiveSync()`/`syncWithServer()` la invoque cuando el `sync-check` detecte cambios (≤ 3.5 s), de modo que un apunte recién subido quede disponible para la siguiente creación de caso sin recargar la página.
   - **Idempotencia:** `APUNTES_INDEX` nunca debe tener ids duplicados, incluso si el regulador externo regenera `all_afg_topics.json` varias veces (key = `id` del tópico).

2. **Uso dogmático de los apuntes en la síntesis (`synthesizeCase`):**
   - **Anclaje nuevo `linkedApuntes`:** cada caso generado debe declarar `linkedApuntes: [{topicId, code, title, sourceFile}]` con los tópicos de apunte (nuevos o clásicos) que respaldan sus instituciones — renderizables en `CaseSolver` (panel de fuentes/retroalimentación, escapado con `SecurityShield.escapeHtml`), junto a `linkedTopics` y `linkedFuentes` ya existentes.
   - **Enriquecimiento de doctrina y pauta:** cuando una sección del apunte con `content` y `connections` respalda una institución del caso, la `explanation`, el `dogmaticFramework` y los descriptores de la rúbrica pueden citarla como apoyo doctrinal (*"según el apunte `{sourceFile}`, Sección {code}: …"*). El texto extraído del apunte debe escapar HTML, truncarse razonablemente y citarse, jamás pegarse como bloque gigante.
   - **Distractores y variables desde apuntes:** el mutador (`MUTATOR_DATA`) y los constructores de hechos pueden incorporar datos/doctrina del `APUNTES_INDEX` (máximo las secciones del mismo `subject` que el arquetipo) para aumentar la variabilidad sin inventar.
   - **Cobertura dinámica del temario:** al generar, el agente debe poder responder "uno de los tópicos presentes en los apuntes cargados no tiene arquetipo propio"; en ese caso lo **asocia al arquetipo dogmáticamente más afín** (`targetInsts` + `tags` + subject) y lo documenta en la tabla de cobertura como *"cobertura desde apuntes"*, nunca inventando un patrón de caso nuevo sin plantilla.

3. **Guardrail anti-alucinación con apuntes (obligatorio):**
   - El apunte es **soporte doctrinal y fáctico, no la fuente de la alternativa correcta por sí sola**: la respuesta correcta siempre debe fundarse en norma positiva verificable (`fuentes/*.md`, `FUENTES_CORPUS` o artículos ya presentes en el corpus) a través de `assertCitationIntegrity`.
   - Todo texto derivado de apuntes que llegue al DOM pasa por `SecurityShield.escapeHtml`/`textContent` (los `content` de apuntes son entrada de usuario admin/NotebookLM: nunca `innerHTML` crudo).
   - Si una sección de apunte invoca un artículo que no existe en el corpus verificado, **no se usa como cita legal**; se registra en el diagnóstico como discrepancia (nunca se asume ni se corrige de memoria).
   - Cero exposición de rutas internas: `linkedApuntes.sourceFile` se muestra como nombre de archivo (p. ej. `MI NUEVO APUNTE.md`), no como ruta absoluta de `APUNTES_DIR`.

4. **Interacción con el PROMPT 001 (`POST /api/admin/upload-notes`):**
   - Si el endpoint y `apuntes_registry.json` ya existen, la Parte F **no debe duplicar su lógica**: solo consumir el resultado vía `/api/sync-topics` (que el PROMPT 001 ya regenera). Verificar que tras una subida admin, el siguiente `/api/sync-topics` incluya las secciones nuevas y que `syncApuntesFromServer()` las absorba.
   - Si el PROMPT 001 aún no está implementado, la Parte F debe soportar igualmente los 6 apuntes estáticos + los 53 tópicos, quedando lista para absorber las subidas cuando existan.

## DEFINITION OF DONE

- [ ] **`FUENTES_CORPUS`** sincroniza con `fuentes/*.md` reales cuando `/api/fuentes` está disponible, con `assertCitationIntegrity` verificando que ninguna cita sea inventada (diagnóstico en consola).
- [ ] **Tabla de cobertura** arquetipo ↔ tópicos documentada; cada institución de `INSTITUTIONS` tiene arquetipo que la ejercita (o queda excluida del menú con nota); existen ≥ 3 arquetipos nuevos de cruce interdisciplinario.
- [ ] Las **10+ explicaciones** terminan con **`Conclusión:`** definitiva; las citas son forenses exactas (norma + artículo [+ inciso]) y las seductoras se refutan expresamente.
- [ ] El **100 % de las preguntas** de todos los arquetipos trae `officialRubric` completo (4 dimensiones, pesos 0.5/1.0/2.0/0.5, `guidingQuestion` + 4 descriptores), más los nuevos campos `pauta` y `errorFatalDeGrado` renderizados en el workbench sin XSS.
- [ ] `modelSolution` es una **solución canónica real por caso** (≥ 400 caracteres, sin placeholder) y `methodology` refleja el razonamiento concreto del caso.
- [ ] `linkedTopics[].id` apunta a tópicos existentes en `all_afg_topics.json` y `linkedApuntes[].topicId` a tópicos existentes en el índice de apuntes cargados (0 ids huérfanos).
- [ ] **`CaseGeneratorAgent.syncApuntesFromServer()` y `invalidateApuntes()`** implementados: el agente absorbe `/api/sync-topics`/`INITIAL_DATA.topics` (idempotente, sin duplicados), se refresca tras cada generación y vía `App.startLiveSync()`, y los casos generados declaran `linkedApuntes` con `sourceFile` seguro (nombre, sin rutas).
- [ ] **Guardrail anti-alucinación con apuntes:** los apuntes solo aportan doctrina/fáctico; toda alternativa correcta se funda en norma verificada; texto de apuntes escapado antes del DOM; discrepancias de artículos no verificables quedan en el diagnóstico, nunca en el caso.
- [ ] `CaseGeneratorAgent.validateGeneratedCase(case)` implementado y ejecutado al sintetizar; diagnóstico sin errores críticos.
- [ ] Suites **100 % PASS**: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`, incluyendo la nueva sección de calidad dogmática **y las pruebas de nutrición desde apuntes (sección 23)**.
- [ ] `CONTEXT.md` refleja exactamente el estado final (rúbrica, esquema de casos, tabla de cobertura, mapa de archivos, bitácora v7.1) y no se rompe ningún flujo existente (generación, FIFO, demo vs. pase activo, candado/licencias, sincronización).

## NOTAS PARA EL EJECUTOR

- **No instalar dependencias nuevas.** Stack vanilla: JS ES6 sin bundlers, Python `http.server`/`sqlite3`. Todo el cambio vive en `js/case-generator-agent.js` (y, si hace falta, pequeños ajustes de render en `js/case-solver.js` con `SecurityShield.escapeHtml`).
- El generador es **algorítmico y determinístico**: no se conecta a ninguna API LLM. La calidad se logra con mejor contenido en los arquetipos y validación estricta, no con generación por fetch.
- **No exponer** el contenido del dossier `1_PAUTAS_EVALUACION` (Zero Exposure, HTTP 403 ya implementado). Solo se puede usar su metodología para mejorar descriptores; jamás copiarlo a respuestas públicas.
- **Apuntes = fuente viva, no caja negra:** los `content` de los apuntes y las subidas admin son **entrada de usuario**; tratar como tal (escapar HTML, nunca `innerHTML` crudo, `sourceFile` como nombre). El valor pedagógico está en citarlos como apoyo doctrinal verificable, no en volcarlos literalmente.
- **Orden de implementación recomendado:** primero PARTE A (índices y validador), luego PARTE F (podría consumirlos), después B/C/D, y al final E (pruebas). Si el PROMPT 001 no está implementado, la Parte F funciona con los 6 apuntes estáticos + 53 tópicos igualmente.
- Respeta la nomenclatura jurídica chilena y el tono de comisión de grado (secciones "cédula", "capítulo", `civil|procesal|constitucional`).
- Si el PROMPT 001 (`v6.8`) se ha implementado antes de ejecutar este, ajustar el número de versión de la bitácora en consecuencia (próximo hito libre tras v6.8/v7.0).