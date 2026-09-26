# PROMPT 040 — Chatbot socrático de casos: interroga, responde y corrige con evidencia

> **Versión:** v1.0 · **Fecha:** 2026-09-26 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 038 verde. Orden acordado: primero ciclo grafo (041–042), este después (idealmente tras el 039 para reutilizar su corrector).

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Un chatbot **extractivo** (cero LLM, cero alucinación) dentro de la vista Casos que opera sobre UN caso a la vez — del catálogo o subido efímeramente: **interroga** (pregunta→citas verbatim), **escucha tu respuesta y la corrige** contra pauta (aciertos, omisiones, error fatal) y **debate** (contra-argumento solo con citas). Todo en una cáscara conversacional con turnos e historial en memoria.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión disponible).
2. Suites 4/4 al 100 % PASS; ampliar con la nueva funcionalidad.
3. Vanilla, cero dependencias nuevas, cero LLM en runtime. Toda afirmación del bot es cita verbatim o mensaje honesto de falta de cobertura.
4. Sanitización en origen (`escapeHtml`); subida efímera con cap 64 KB, tipos `.md/.txt` (PDF = fase futura declarada, no implementada); el archivo subido **jamás** toca `CASOS/`, canon, Vault ni `localStorage` persistente (historial solo en memoria de la vista).
5. Laya (vía endpoint local con fallback) solo enruta intenciones y tria; nunca redacta ni califica.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: subir un caso (o PDF) brevemente para consultas sin saturar archivos; revisar caso y preguntas; generar pauta; responder y que corrija en base al razonamiento.
>
> **Intención Nexo:** la comisión examinadora en el bolsillo: el bot pregunta con las preguntas reales del caso, tú respondes, te corrige como grado. Lo "socrático" es el método (pregunta→respuesta→refutación con evidencia), no un LLM conversando.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| Vista Casos (`CaseSolver`, `js/case-solver.js`, `#view-cases`) | Dónde montar el panel chat sin romper el solver actual |
| `js/qa-composer.js` (modos, salto highlight) + Vault | Motor de respuestas extractivas a reutilizar |
| Corrector del 039 (`corrige`: bigramas, pauta, error fatal) | Reutilizar lógica (portarla a JS o compartir criterio); no duplicar |
| `POST /api/laya/predict` + `LAYA_TASKS` | Registrar `chat_intent` (choice: preguntar/responder/debatir/pauta, fallback: preguntar) |
| Buscador único, mastery, gate admin 015 | No interferir; el chat es de la vista Casos |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Cáscara conversacional (`#case-chat-*` en vista Casos)

- Panel con turnos (usuario/bot), input con `maxlength="200"` + debounce + purge (patrón header), historial en memoria (se pierde al salir de la vista, por diseño), `aria-live="polite"`, 360px limpio, targets ≥44px.
- Selector de caso: del catálogo IA o **subida efímera** (`.md/.txt` vía `FileReader`, cap 64 KB, parse a estructura caso/preguntas con validación y mensaje honesto si el formato no se reconoce). Nada persiste.

### PARTE B — Tres modos (intención vía Laya, override manual)

- `preguntar`: el bot interroga con las preguntas del caso (una a la vez) y ante tu respuesta compone la evidencia con `QAComposer` (modo `definicion` sobre el caso + Vault).
- `responder`: tú preguntas libremente sobre el caso → respuesta extractiva con citas + salto highlight (mismo patrón QA).
- `debatir/pauta`: `pauta` genera la pauta de respuesta (silogismo con citas: premisa mayor/menor/conclusión, **compuesta, no redactada**); `debatir` objeta tu última respuesta solo con citas contrarias del Vault; si no hay, mensaje honesto.
- Pills de modo manuales (Laya sugiere por defecto, el usuario manda).

### PARTE C — Corrección socrática (reutilizar 039)

- Al responder una interrogación: aciertos/omisiones/error-fatal con citas, en tono comisión (sobrio, exigente). Sin puntaje numérico LLM (ver nota 039).
- Contador de cobertura de la pauta (`3/5 elementos`) derivado, no inventado.

### PARTE D — SEGURIDAD Y LÍMITES HONESTOS

- Subida: tipo y tamaño validados en cliente; escaneado el texto con `SecurityShield` antes de usarlo; PDF/imagen → mensaje honesto "formato no soportado en V1" (sin OCR).
- Sin persistencia: test que audita que el texto subido no llega a `localStorage`, `CASOS/` ni payloads de export.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nueva Sección e2e: flujo completo con caso fixture (interrogar→responder→corrección con error fatal detectado→pauta con citas verbatim); upload efímero sin persistencia (auditoría de storage tras cerrar vista); intención Laya con override; empty honesto ante pregunta fuera de cobertura; 360px sin overflow.
- Suites 4/4 PASS + `CONTEXT.md`.

## DEFINITION OF DONE

- [ ] Chat sobre 1 caso (catálogo o efímero) con 3 modos funcionales
- [ ] Corrección con aciertos/omisiones/error-fatal + citas
- [ ] Pauta como silogismo compuesto, debate solo con citas
- [ ] Cero persistencia de subidas; V2-PDF declarada como futuro
- [ ] Suites 4/4 PASS + `CONTEXT.md`

## NOTAS PARA EL EJECUTOR

- Corre DESPUÉS del ciclo grafo (041–042); idealmente tras el 039 para heredar el corrector.
- Si el caso subido no trae pauta, la pauta se compone desde el Vault (modo `panorama` sobre sus instituciones) y se rotula `pauta compuesta (no oficial)`. Honestidad siempre.
