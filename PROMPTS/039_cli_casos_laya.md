# PROMPT 039 — CLI Casos local: consulta extractiva, corrección y triage con Laya

> **Versión:** v1.0 · **Fecha:** 2026-09-26 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 038 verde (laya_router + LAYA_TASKS). Orden acordado: primero ciclo grafo (041–042), este después.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Un ejecutable local (`python scripts/cli_casos.py`) para estudiar desde terminal: **consultar** los casos de `CASOS/2_CASOS_SEMANALES/` en lenguaje natural con citas verbatim, **corregir** respuestas de controles contra pauta oficial (aciertos, omisiones, errores fatales) y **triar** hallazgos con Laya. Sin LLM, sin tocar el canon, sin persistir nada que no sea log.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión disponible).
2. Suites 4/4 al 100 % PASS; el CLI trae `--self-test` y gancho en CI.
3. Vanilla + stdlib (el scoring reusa `normalize_text` + `sinonimos.json` + BM25 de `build_vault_index.py`; Laya solo vía `laya_router.py` con fallback).
4. Archivos `CASOS/1_PAUTAS_EVALUACION/` y `all_cases.json` son confidenciales (Zero Exposure): el CLI los lee en local pero **jamás imprime su contenido íntegro** (solo citas acotadas ≤140 chars con procedencia).
5. Laya sugiere, nunca califica: la corrección es determinista contra pauta; Laya solo tria/ordena.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: terminal ejecutable para consultas sobre archivos de casos, que nutra al agente y sirva para corregir controles — "yo seré la prueba de que este sistema da resultados".
>
> **Intención Nexo:** el compañero de estudio en terminal para el sprint al grado: preguntas y te responde con evidencia, le pegas tu respuesta y te corrige como comisión (pauta + error fatal), y Laya ordena qué repasar primero.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| `CASOS/2_CASOS_SEMANALES/*.md` + `PLANTILLA_CASO.md` | Estructura real: hechos, preguntas A–E, correcta, explicación, pauta, errorFatalDeGrado, modelSolution |
| `build_vault_index.py` (normalize, BM25, sinonimos) | Funciones exactas a importar (no re-scoring nuevo) |
| `scripts/laya_router.py` + `LAYA_TASKS` | Dónde registrar `casos_triage` (choice: repasar/ok/dominado) y cómo invocar con fallback |
| `test_e2e_case_flow.cjs` + CI `deploy-pages.yml` | Dónde enganchar `--self-test` (smoke en CI sin Laya: todo debe pasar en fallback) |

## CAMBIOS A IMPLEMENTAR

### PARTE A — `scripts/cli_casos.py`: consulta extractiva

- `consulta "<pregunta>" [--top 3]`: rankea casos+secciones con BM25+sinónimos; imprime citas verbatim ≤140 chars con `archivo · sección`; `empty` honesto si no hay cobertura.
- Solo lectura de `CASOS/`; jamás escribe fuera de `logs/` propio.

### PARTE B — Corrección contra pauta (`corrige`)

- `corrige --caso <id|archivo> --respuesta <txt|archivo>`: compara contra explicación oficial + `pauta` + `errorFatalDeGrado` por overlap de bigramas (gate ≥3, patrón 026/031) y checklist de conceptos de la pauta; reporta: aciertos (con cita), omisiones (qué faltó, con cita) y **error fatal** si reproduce el `errorFatalDeGrado` (reprobación inmediata, como la comisión).
- Veredicto por pregunta + global, siempre con evidencia textual, cero nota inventada (no hay puntaje LLM: hay cobertura de pauta).

### PARTE C — Triage con Laya + nutrición del agente

- Nueva entrada `casos_triage` en `LAYA_TASKS` (choice `urgente/repasar/dominado`, ≤5 opciones, fallback `repasar`).
- `repaso`: lista los casos ordenados por triage (con fallback determinista por antigüedad/errores si Laya ausente).
- `nutre --caso <id>`: propone `linkedApuntes` por overlap real con el Vault (mismo criterio que el generador) e imprime el JSON sugerido para revisión humana — **propone, no escribe** en `all_cases.json`.

### PARTE D — SEGURIDAD Y CI

- Cap de lectura por archivo (64 KB, patrón modelos), timeout por inferencia Laya, log en `logs/cli_casos.jsonl` sin PII (respuestas truncadas a 80 chars).
- `--self-test`: batería offline (consulta con match exacto, empty honesto, corrección perfecta vs corrección con error fatal, triage en fallback) con exit 0/1; gancho en CI que corre sin Laya instalada.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Sección e2e que invoca el CLI (`execFileSync`): `--self-test` en verde + 4 aserciones de humo (consulta cita verbatim resoluble, empty honesto, error fatal detectado, `nutre` no muta `all_cases.json`).
- Suites 4/4 PASS + `CONTEXT.md`.

## DEFINITION OF DONE

- [ ] `consulta` responde con citas verbatim + procedencia
- [ ] `corrige` marca aciertos/omisiones/error fatal con evidencia
- [ ] `repaso` ordena (Laya o fallback) y `nutre` propone sin escribir
- [ ] `--self-test` verde con y sin Laya; CI enganchado
- [ ] Suites 4/4 PASS + `CONTEXT.md`

## NOTAS PARA EL EJECUTOR

- Este prompt corre DESPUÉS del ciclo grafo (041–042). Si el 040 (chatbot) ya existe, reutilizar su lógica de corrección en vez de duplicarla.
- El corrector no asigna notas numéricas: la rúbrica AIME con puntaje vive en la app; aquí hay cobertura de pauta + error fatal. Documentarlo así.
