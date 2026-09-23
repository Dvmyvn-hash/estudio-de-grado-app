# PROMPT 012 — Perfeccionar las Preguntas de Verificación de Cédula: Perfil de Dificultad «Manejo», Preguntas Ancladas a los Apuntes (Concepto Mejor Desarrollado, Características, Procedencia, Plazos, Definiciones)

> **Versión:** v1.0 · **Fecha:** 2026-09-23 · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** `010_desarrollador_preguntas_verificacion_cedulas.md` (✅ Implementado en **v7.11** — este PROMPT es incremental, **no repite** sus cambios, solo **refina el motor de generación** de `js/question-developer.js`)

> Copia y pega este bloque completo como prompt inicial en tu agente de Antigravity IDE. Está redactado para ejecutarse dentro del repositorio `estudio-de-grado-app` (GRADOMANIACOS) conforme a las reglas de `AGENTS.md`.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

**Reescribir el motor de generación de preguntas de verificación** (`QuestionDeveloper` → `_getQuestionSpecsForNature`) para que las 4 preguntas que cierran cada cédula dejen de ser **plantillas genéricas y de alta exigencia** y pasen a ser **preguntas de manejo ancladas al contenido real de cada apunte**: definiciones y conceptos (donde **el concepto mejor desarrollado y más fiel al apunte es el correcto**), características de la institución, modos de procedencia, cálculo de plazos y preguntas redactadas **en los términos exactos en que están redactados los apuntes** (vocabulario real de la cédula, no tecnicismos rebuscados). La dificultad se calibra a **«manejo»**: suficiente para comprobar que el postulante leyó y entendió la sección, **sin la rigurosidad exhaustiva** ni los distractores artificiales/absurdos actuales. El objetivo operativo: quien domine la cédula **debe reconocer el correcto a primera lectura** en al menos 3 de 4 preguntas; quien no la leyó, no debe poder adivinar por descarte de disparates.

**Se conservan intactos todos los contratos del PROMPT 010 (v7.11):** exactamente 4 preguntas por cédula, 5 alternativas A-E, 1 correcta, `solucionDogmatica` con cierre obligatorio `"Conclusión:"`, `pauta`, `sourceCitations ⊆ citas reales` (`extractCitations`), generación determinista (`fnv1a` + `mulberry32`), memoización, `detectNature` con sus 5 naturalezas, auto-completado de la cédula al 4/4 y UI de la Sección de Verificación sin cambios. Este PROMPT **solo cambia el contenido de las preguntas** (textos, distractores y estrategia de construcción) y añade las verificaciones de test correspondientes.

## REGLAS OBLIGATORIAS DEL REPOSITORIO (ADEMÁS DEL CÓDIGO)

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 7.3 → ampliar Sección 24 de `test_e2e_case_flow.cjs`; Sección 8 → fila `js/question-developer.js` actualizada y catálogo `PROMPTS/`; Bitácora Sección 9 → **v7.15**; PROMPTS/README.md → indexar el 012 como ✅ Implementado (v7.15)).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; **ampliar la Sección 24 de `test_e2e_case_flow.cjs`** con las verificaciones de abajo (nuevo bloque 24.5), sin romper las aserciones existentes.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. **No romper contratos del PROMPT 010 (v7.11):** `QuestionDeveloper.detectNature`, `buildSectionQuestions`, `_getQuestionSpecsForNature`, `validateSectionQuestions`, `getSectionQuestions` (memoizado), `NATURE_TAXONOMY`, `natureOf`, `StorageService.topicQuizzes` (`recordTopicAnswer`, `markTopicMastered`, `isTopicQuizCompleted`), UI `#section-quiz-developer`, `.quiz-option`, `.quiz-solution`, `#quiz-completed-banner`. Este PROMPT consume esos contratos y **solo reemplaza la estrategia de especificación de preguntas** (el cuerpo de `_getQuestionSpecsForNature` y sus ayudantes).
5. No romper contratos de PROMPT 009 (v7.10): `CaseGeneratorAgent.extractCitations` (o fallback local), `DYNAMIC_CORPUS`, `APUNTES_INDEX`. No se toca `server.py`, `db.py`, `generate_clean_notes_data.py` ni `all_afg_topics.json` — el quiz sigue siendo **local-first** y derivado del contenido en vivo de cada cédula.
6. Guardrails de seguridad vigentes: sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), cero ejecución de contenido de apuntes, cero path-traversal, PRNG determinista no criptográfico.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

> "Me gustaría que hagamos un prompt para perfeccionar las preguntas al final de cada sección para demostrar manejo. Las preguntas eran demasiado difíciles y con conceptos enredados o una redacción muy específica. La idea es que pregunte: conceptos (por ejemplo, **el concepto mejor desarrollado es el correcto**), características de la institución, modos de procedencia, cálculo de plazos, definiciones, y ese tipo de pregunta. Tampoco con una rigurosidad tan exhaustiva, pero sí lo suficiente para que determine manejo, en los términos que se redactan los apuntes."

**Intención del usuario (traducida a criterios de ingeniería):**
- La verificación debe medir **manejo de la sección**, no erudición de detalles oscuros.
- Las preguntas deben **nacer del texto real de la cédula**: quien leyó el apunte entiende el enunciado y reconoce el correcto; quien responde de memoria o por lógica de descarte de absurdos, falla.
- Redacción **corta, directa y en el vocabulario del apunte** (prohibido el "legalese" indescifrable y los distractores ridículos que hoy existen).
- Tipos de pregunta priorizados: **concepto/definición** (correcto = el desarrollo más completo y fiel al apunte), **características**, **modos de procedencia**, **cálculo de plazos**.

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

- **`js/question-developer.js` (v7.11, PROMPT 010 ya implementado):**
  - `_getQuestionSpecsForNature(nature, cleanTitle, uniqueCitations, topic)` (~línea 274): **devuelve 4 plantillas fijas por naturaleza** en las que **solo se interpola `${cleanTitle}`**. Consecuencia diagnosticada: **la misma cédula genérica se repite para todo el temario** (todas las cédulas dogmáticas reciben el mismo bloque "concurrencia copulativa de requisitos / tripartito art. 1444 / efecto relativo / causales de ineficacia"), y para cédulas procesales concretas (p. ej. "La Demanda") los textos son ajenos a su contenido.
  - **Distractores actuales incluyen absurdos/sarcásticos** que el usuario considera "enredados": "sorteo público efectuado ante el secretario del tribunal de alzada" (~467), "aprobación del concejo municipal respectivo" (~482), "multa a beneficio municipal en la cuenta corriente del juzgado" (~417), "transferir la titularidad del crédito litigioso a favor del Fisco de Chile" (~322), "notificador judicial sin autorización del juez" (~394). Este estilo **debe eliminarse por completo**.
  - `solucionDogmatica` actual: redacción abstracta tipo "concurrencia copulativa de legitimación activa, oportunidad procesal y agravio sustancial" (~289); debe reescribirse **en términos del apunte**, con refutación de una línea por distractor.
  - Helpers existentes reutilizables: `extractCitations` (~85, regex de citas chilenas), `detectNature` (~107, 5 naturalezas con precedencia), PRNG `fnv1a` (~12) + `mulberry32` (~21) + `shuffleArray` (~32), memoización `_cache` (~79) y `getSectionQuestions` (~594), `validateSectionQuestions` (~548).
  - **No existe** hoy ninguna extracción de definiciones/características del contenido (grep `definición|caracter|requisito` sobre el generador: solo aparecen en textos de plantillas). Este PROMPT introduce los ayudantes de extracción.
- **`test_e2e_case_flow.cjs` Sección 24.4 (v7.11):** asserts de `detectNature` (5 naturalezas), forma (4 × 5 alternativas, `correctAnswer` ∈ A-E, `solucionDogmatica` ≥ 150 chars con "Conclusión:", `sourceCitations ⊆ extractCitations(content)`, ids `qv-{subject}-{stem}-{code}-{n}`), determinismo (misma cédula → mismos ids/letra correcta), 4/4 → auto-completado, cédula sin citas → sin artículos inventados. **Ninguna aserción depende del texto literal de las preguntas**, por lo que la reescritura del contenido no rompe la Sección 24.4 existente.
- **Cédulas canónicas de referencia para pruebas:** `civil-losbienes-1-4` (dogmatic), una cédula de procedencia real (p. ej. una de `PROCESAL.md` con "recurso de apelación/admisibilidad"), una con régimen de plazos (p. ej. "término/plazo/cómputo" en `PROCESAL.md`) y una de las 36 nuevas de `PROCEMAYORCUANTIA-pulido.md` (p. ej. la del capítulo 7 "La Demanda" — ideal para procedencia) y la 10 "El Emplazamiento" — ideal para plazos.

## CAMBIOS A IMPLEMENTAR

### PARTE A — Motor de generación anclado al contenido (`js/question-developer.js`)

Reescribir el cuerpo de `_getQuestionSpecsForNature` (y añadir ayudantes privados) con una arquitectura **contenido-conductor**:

1. **Ayudantes de extracción (nuevos, deterministas):**
   - `_splitSentences(content)` → `string[]`: segmentación pragmática en oraciones (`.`/`\n`), respetando abreviaturas jurídicas (`Art.`, `N°`, `inc.`, `p.ej.`, `etc.`).
   - `_extractDefinitionSentences(content, cleanTitle)` → oraciones candidatas a definición: contienen marcadores `se define`, `consiste en`, `se entiende por`, `es aquel`, `es aquella`, `es la institución`, `constituye`, `designa`, `concepto de`, `definición`, `definicion`, `se caracteriza`, `consiste`; longitud ≥ 80 caracteres; priorizar las que mencionan el instituto del `cleanTitle` (o sus raíces). Devolver **la mejor** (la de mayor longitud y más menciones del instituto). Sin coincidencias → `null`.
   - `_extractCharacteristicBlocks(content)` → lista ordenada de ítems: detectar enumeraciones del apunte (viñetas `- ` / `* `, numerales `1.`/`2.`, literales `a)`/`b)`, listas con `;`) y oraciones con `caracterís`, `requisito`, `elemento`, `principio`, `postula`, `se distingue`, `se clasifica`, `comprende`. Normalizar cada ítem a una frase corta (≤ 200 chars). Devolver hasta 6 ítems en orden de aparición en el texto.
   - `_extractProcedenciaFacts(content)` → pares `{ condicion, decision }` del estilo "procede/no procede/cuando": oraciones con `procede`, `no procede`, `se concede`, `cabe deducir`, `requiere`, `es admisible`, `se interpone`, `dentro de`, `término de`, `ante el`, `no se admite`. Sirve para los ítems de procedencia y plazos.
2. **Arquetipos de pregunta contenido-conductores (banco por naturaleza).** El motor elige 4 según la naturaleza detectada y **lo que realmente aporta el contenido**:
   - **A. Concepto mejor desarrollado** (para cédulas con `_extractDefinitionSentences` no nulo; prioridad alta en `dogmatic`): enunciado: *"Según el apunte, ¿cuál de las siguientes definiciones de `{instituto}` es la **más completa y desarrollada**?"* Opciones:
     - **correcta:** paráfrasis fiel de la oración-definición real, conservando **todos** sus elementos y el vocabulario del apunte (puede ser casi textual).
     - distractor 1: la misma definición **sin un elemento clave** (se suprime un requisito/calificativo).
     - distractor 2: la misma definición **con un elemento añadido** que el apunte no declara (inventado pero verosímil).
     - distractor 3: definición de la **institución afín** (otra mencionada en la misma cédula/capítulo) redactada en el mismo estilo.
     - distractor 4: definición "a medias": primera mitad fiel + segunda mitad falsa (mezcla con otra institución).
   - **B. Características de la institución** (para cédulas con `_extractCharacteristicBlocks` con ≥ 3 ítems): enunciado: *"De acuerdo con lo desarrollado en el apunte, las características de `{instituto}` son:"* Opciones:
     - **correcta:** enumeración que coincide **exactamente** con los ítems extraídos del apunte (presentados en el mismo orden).
     - distractor 1: reemplaza un ítem real por uno **verosímil pero ausente** en el apunte (tomado de otra institución o inventado coherente).
     - distractor 2: omite un ítem real (lista incompleta).
     - distractor 3: invierte/mezcla dos ítems reales (asignación cruzada).
     - distractor 4: añade un ítem **genérico-vacío** ("cualquier otra que las partes estipulen") que el apunte no contempla.
   - **C. Modos de procedencia** (para `procedencia` y cédulas con `_extractProcedenciaFacts`): enunciado: *"Según el apunte, `{instituto}` procede:"* Opciones:
     - **correcta:** el/los supuestos de procedencia tal como los desarrolla la cédula (con su condición: plazo, tribunal, requisito).
     - distractor 1: incluye un supuesto que el apunte **excluye expresamente** o no contempla.
     - distractor 2: confunde la vía con la institución afín (otro recurso/acción/incidente del mismo capítulo).
     - distractor 3: omite un requisito copulativo (presenta la procedencia con menos condiciones de las reales).
     - distractor 4: invierte la oportunidad (procede "en cualquier estado de la causa" cuando el apunte exige un momento procesal).
   - **D. Cálculo de plazos** (para `plazos` y cédulas que fijen un plazo concreto, p. ej. "término de 5 días hábiles"): **máximo 2 pasos aritméticos**, con datos del apunte. Enunciado con fechas/término simples (p. ej. "notificada una resolución el lunes, con plazo fatal de 3 días hábiles..."). Opciones:
     - **correcta:** cómputo fiel a la regla que el propio apunte enseña (hábiles vs. corridos, fatalidad, exclusión del día de la notificación).
     - distractor 1: error de cómputo típico (contar el día de la notificación).
     - distractor 2: error de cómputo típico (contar feriados/fines de semana como hábiles cuando la regla es hábil).
     - distractor 3: confundir la regla del apunte con la contraria (corridos cuando el apunte enseña hábiles, o viceversa).
     - distractor 4: prórroga inexistente (extender el plazo sin base en la cédula).
     - **Regla de oro:** si la cédula **no enseña un cómputo**, no se fabrica uno; se cae a la definición/regla de cómputo (pregunta D-bis: "según el apunte, ¿cómo se computa / qué regla rige?", con las mismas reglas de distractor).
   - **E. Definición directa** (respaldo universal, especialmente en cédulas sin definición desarrollada larga): enunciado: *"Según lo expuesto en el apunte, `{instituto}` es:"* — correcto = enunciado que **corresponde a la cédula**; distractores = definiciones de instituciones afines del capítulo y variantes "faltante/añadida". Es la versión simple del arquetipo A.
   - **F. Distinción sencilla** (opcional, una por quiz como máximo): *"La diferencia esencial entre `{instituto}` y `{institución afín mencionada en la cédula}` es:"* con correcto = la distinción que el apunte desarrolla. Solo si la cédula menciona explícitamente la institución afín.
3. **Mix por naturaleza (reemplaza la Regla Maestra de texto genérico por una matriz contenido-consciente):**
   - `dogmatic` → A (o E si no hay definición larga) + B + B/F + un cierre simple (definición o distinción). **Nunca** los 4 genéricos abstractos actuales.
   - `procedencia` → C + C (segundo ángulo: requisitos de admisibilidad según el apunte) + A/E (razón de ser) + D-bis o B.
   - `plazos` → D (cálculo, si la cédula lo enseña) o D-bis + C (oportunidad para deducir) + A/E + B.
   - `competencia` → C (tribunal/regla del apunte) + A/E + B + D-bis (término para deducir, si consta).
   - `case` → 2 mini-casos de subsunción **directos** (datos del apunte, sin dobles vueltas) + A/E + B.
   - **Orden de prioridad realista:** si el contenido no permite un arquetipo (p. ej. no hay definición), **saltar al siguiente**, nunca rellenar con plantilla ajena. Si no hay material, caer al arquetipo E (definición directa) y B/C según lo que exista; **prohibido** fabricar doctrina que la cédula no desarrolla.
4. **Perfil de dificultad «Manejo» — reglas de estilo vinculantes (checklist para el ejecutor):**
   - **Un enunciado = una sola idea.** Prohibido: doble negación, subordinadas encadenadas, paréntesis explicativos largos, adjetivación acumulada, y los prefijos "En el marco de…/Respecto a la…/En virtud del principio de…" sin contenido verificable. El enunciado debe ser legible en ≤ 45 palabras.
   - **Correcto reconocible por quien leyó el apunte:** debe ser la opción **más fiel al desarrollo del texto** (no la más rebuscada técnicamente). Si un lector competente de la cédula duda entre la correcta y un distractor, la pregunta está mal construida.
   - **Distractores plausibles y refutables en una línea:** cada distractor falla por un solo elemento real (elemento faltante / añadido / institución afín / regla contraria). **Prohibido** el humor, el sarcasmo y los absurdos: se eliminan de todo el banco actual (sorteos públicos, concejos municipales, multas a beneficio municipal, "Fisco de Chile" sin base en el apunte, notificadores judiciales con potestades, "presidio sin juicio", etc.).
   - **Vocabulario del apunte:** los términos del enunciado y del correcto deben provenir del `content`/`cleanTitle` reales (verificación mecánica: el bigrama más largo del enunciado y del correcto debe aparecer en el contenido normalizado). No usar tecnicismos que la cédula no usa.
   - **No preguntar lo que el apunte no enseña:** nada de artículos, plazos, tribunales o efectos que no estén en la cédula (el guardrail de `sourceCitations` ya lo exige para citas; se extiende a **hechos y conceptos**).
   - **Longitud de opciones homogénea:** todas las alternativas de una pregunta con extensión similar (± 30 %), para impedir "la más larga es la correcta" y para que no destaque el absurdo por su brevedad.
5. **`solucionDogmatica` y `pauta` reescritos:**
   - `solucionDogmatica`: explicación en términos del apunte (1-2 oraciones) + **una línea de refutación por distractor** ("se descarta X porque el apunte exige/no contempla…") + cierre obligatorio `"Conclusión: [la correcta es… porque…]"`. Mantener ≥ 150 caracteres y el cierre `"Conclusión:"` (contrato v7.11).
   - `pauta`: criterio de comisión **operativo y breve** ("el postulante debe identificar que…"), no un slogan académico.
6. **Determinismo, memoización y forma intactos:** los arquetipos se seleccionan por seed del tópico (misma cédula → misma selección de arquetipos y mismos textos); el barajado sigue con `mulberry32`; `sourceCitations` solo cita lo extraído por `extractCitations`; `validateSectionQuestions` **se amplía** con las reglas del punto 4 (prohibición de absurdos, bigrama presente en contenido, opciones homogéneas) como **warnings**, sin bloquear la renderización (retrocompatibilidad), salvo violación grave (cita no real).

### PARTE B — Persistencia y UI (sin cambios de contrato)

- **`js/storage.js`:** cero cambios. `topicQuizzes`, `recordTopicAnswer`, `markTopicMastered`, `isTopicQuizCompleted` operan igual (el 4/4 sigue auto-completando la cédula).
- **`js/app.js` (`renderTopicViewer`):** solo ajuste de **copy** opcional si no rompe tests: el badge de naturaleza puede mostrar la etiqueta existente; se añade —si no existe— un subtítulo breve en la cabecera de la verificación: "4 preguntas al nivel del apunte" o similar. **No** cambiar IDs, clases ni flujo de eventos. Si el cambio de texto rompiera alguna aserción E2E existente, descartar el copy (el texto de los badges no es parte del contrato de tests actual, verificar con grep).
- `index.html`: **sin cambios** (el módulo ya se carga).

### PARTE C — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **Sección 24.5 de `test_e2e_case_flow.cjs`** (añadir tras 24.4, sin tocar aserciones previas):
   a. **Anclaje al contenido:** sobre 3 cédulas reales (dogmatic, procedencia, plazos de las listadas en ESTADO ACTUAL), para cada una de sus 4 preguntas assert **mecánico**: el enunciado y la opción correcta contienen al menos un bigrama (normalizado a minúsculas, sin puntuación) presente en `topic.content`. Esto prueba "en los términos que se redactan los apuntes".
   b. **Concepto mejor desarrollado:** cédula con definición → entre las opciones, la correcta es la que más elementos de la oración-definición real conserva; assert de que existe al menos 1 distractor "sin elemento clave" y 1 "con elemento añadido" (verificable comparando con la oración extraída del contenido).
   c. **Prohibición de absurdos:** assert de que **ninguna opción** de ninguna pregunta generada sobre las 103 cédulas contiene tokens de la lista negra actual: `sorteo público`, `concejo municipal`, `multa a beneficio municipal`, `Fisco de Chile` (cuando el apunte no lo menciona), `presidio`, `notificador judicial con potestad`, `duplicar el plazo`, `prórroga unilateral` fuera de cédulas que la enseñen. Mantener la lista acotada y documentada en el test.
   d. **Distractores plausibles:** cada distractor debe diferir de la correcta en "un solo elemento" — verificación mecánica pragmática: ninguna opción incorrecta es igual al correcto normalizado; y al menos 2 distractores por quiz comparten ≥ 1 bigrama con la correcta (plausibilidad léxica).
   e. **Homogeneidad:** dentro de cada pregunta, la longitud (chars) de la opción más larga ≤ 1,6 × la más corta.
   f. **Plazos computables:** para cédulas de `plazos` con plazo explícito, assert de que existe una pregunta cuyo correcto contiene un cómputo aritmético verificable (patrón numérico de días) y que la `solucionDogmatica` explica el paso a paso.
   g. **Regresión 24.4:** repetir vértebras de la 24.4 existente (4×5, `correctAnswer` ∈ A-E, `solucionDogmatica` ≥ 150 con "Conclusión:", determinismo, `sourceCitations ⊆`, 4/4 auto-completado, `detectNature`) para probar que el refino no rompió el contrato.
2. Ejecutar las 4 suites y dejar **100 % PASS**. Registrar el total de aserciones en la bitácora.
3. **Actualizar `CONTEXT.md`:** Sección 1.2 (bloque "Verificación de Cédula (v7.11)" → añadir párrafo v7.15: perfil «Manejo», arquetipos A-F, reglas de estilo y anclaje al contenido), Sección 7.3 (Sección 24.5 con las verificaciones nuevas), Sección 8 (fila `js/question-developer.js` → mencionar motor contenido-conductor + perfil «Manejo»; fila `PROMPTS/` → indexar el 012), y **Bitácora Sección 9 → v7.15** con fecha, alcance, archivos y nº de pruebas. `PROMPTS/README.md` → marcar el 012 ✅ Implementado (v7.15).

## DEFINITION OF DONE

- [ ] `_getQuestionSpecsForNature` reescrito: las 4 preguntas de **toda** cédula canónica (103) nacen de arquetipos contenido-conductores (A-F) con datos reales del `content`, nunca de las plantillas genéricas abstractas actuales (verificado con las aserciones 24.5.a).
- [ ] Las 5 naturalezas (`detectNature`) siguen funcionando y dirigen el mix contenido-consciente de la PARTE A punto 3.
- [ ] Toda pregunta cumple las reglas del perfil «Manejo»: enunciado ≤ 45 palabras de una sola idea; correcto fiel al apunte y reconocible por quien leyó la cédula; distractores plausibles que fallan por un solo elemento; cero absurdos/sarcasmos (lista negra del test); opciones homogéneas (± 30 %); vocabulario real del apunte.
- [ ] En cédulas con definición: existe el arquetipo "concepto mejor desarrollado" (correcto = el más completo/fiel; distractores con elemento faltante/añadido/institución afín). En cédulas de procedencia: modos de procedencia según el apunte. En plazos: cálculo simple verificable (o regla de cómputo si el apunte no da números). En todas: al menos una pregunta de definición/características.
- [ ] `solucionDogmatica` ≥ 150 chars, termina en `"Conclusión: ..."`, refuta cada distractor en una línea, en términos del apunte; `pauta` breve y operativa.
- [ ] Contratos v7.11/v7.10 intactos: 4×5 A-E, determinismo por seed, memoización, `sourceCitations ⊆ extractCitations`, zero cambios en `storage.js`/`server.py`/`db.py`/`generate_clean_notes_data.py`/`all_afg_topics.json`.
- [ ] Sección 24.5 de `test_e2e_case_flow.cjs` añadida (anclaje, concepto mejor desarrollado, prohibición de absurdos, plausibilidad, homogeneidad, plazos computables, regresión 24.4); las 4 suites al **100 % PASS**.
- [ ] `CONTEXT.md` actualizado (1.2, 7.3, 8) y Bitácora **v7.15** registrada; `PROMPTS/README.md` indexa el 012 como ✅ Implementado (v7.15).

## NOTAS PARA EL EJECUTOR

- **Ejecución recomendada:** el PROMPT 010 debe estar implementado (v7.11); este PROMPT es **solo de refinamiento del contenido de preguntas** — la forma, la UI, la persistencia y la seguridad ya existen. No reinventar módulos.
- **Los datos de prueba reales están en las 103 cédulas regeneradas en v7.14** (34 Civil / 59 Procesal / 10 Constitucional). Usa `procesal-procemayor-*-2-*` (La Demanda) para procedencia y `procesal-procemayor-*-5-*` (El Emplazamiento) para plazos como cédulas de referencia reales y ricas.
- **Determinismo primero, calidad después:** al cambiar el contenido de los textos, la semilla (`fnv1a(topic.id)`) no debe cambiar la selección de arquetipos entre visitas. Si se añade una opción de arquetipo nueva, documentar el orden de selección por seed para no romper la aserción de determinismo de la 24.4.
- **Filosofía de la dificultad «Manejo»:** la comisión de grado pregunta conceptos, características y aplicaciones directas — y el postulante responde "conceptos en los términos de su apunte". La verificación debe sentirse como un repaso eficaz, no como un examen trampa. Si al revisar las 4 preguntas de una cédula un lector con el apunte a la vista no puede identificar el correcto en ≤ 2 minutos, la pregunta se reescribe.
- Mantén intactas las Secciones 23, 24.4 y 25 del E2E y todo contrato previo (casos `caso-ia-*`, demo/desbloqueo, header móvil, multi-dispositivo).