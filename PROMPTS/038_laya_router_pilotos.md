# PROMPT 038 — Laya como capa compartida de decisiones + pilotos Q&A y Shield

> **Versión:** v1.0 · **Fecha:** 2026-09-26 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 037 verde (v7.46 commiteado). Requiere `LAYA_HOME` instalado en la máquina que ejecuta (ver Parte A).

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Convertir Laya (modelo local de decisiones, ya instalado en `LAYA_HOME`) en una **herramienta compartida y extensible** del repo — no un piloto de usar y tirar: un wrapper con contrato (fallback determinista, timeout, log) que **futuros prompts puedan reutilizar** para enrutar, clasificar y puntuar. Sobre esa capa, dos pilotos de valor inmediato y bajo riesgo: **autodetección del modo Q&A** (`definicion/panorama/comparativa`) y **capa aditiva de riesgo en `SecurityShield`**. Si Laya no está instalada o no responde, la app se comporta exactamente como hoy.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión `v7.47`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs`, `node test_mobile_header_theme.cjs`; ampliar suites.
3. Stack vanilla + Python stdlib en el wrapper (sin dependencias nuevas en el repo; `laya`+`torch` viven solo en el venv de `LAYA_HOME`, nunca en `requirements.txt`).
4. Sanitización en el origen; Laya **sugiere, nunca decide** en rúbricas, auth, mastery o calificaciones (línea roja).
5. No romper contratos (buscador único `#global-search-input`, pills manuales como fallback visible, `SecurityShield` regex intacto, deploy estático idéntico en Pages).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "implementarlo en la mayor cantidad de herramientas y funciones... para futuras ideas o incorporaciones... ampliar nuestras capacidades".
>
> **Intención Nexo:** el valor de Laya no es un piloto, es la capa. Este prompt deja el enchufe (`LayaRouter` + endpoint local + registro de tareas de decisión documentado) y lo estrena con los 2 pilotos de mayor valor/menor riesgo del mapeo (Q&A y Shield). Todo lo futuro (039 CLI CASOS, 040 chatbot, triage de nutrición) consume el mismo enchufe sin reinventarlo.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| `C:\Users\dpint\.laya\` (`setup_laya.py`, `LAYA_CONTRACT.md`, venv `laya 0.3.20`, marker `.installed`, checkpoint `multilingual`) | API real instalada: `Router(default=...)`, `preload([...])`, `predict(state, questions, model=...)`; claves `english/multilingual/typed-decisions` (NO existe `checkpoint=`) |
| `server.py` (endpoints `/api/...`, patrones de auth, límites de payload, CORS) | Dónde montar `POST /api/laya/predict` solo-local (en Pages no existe → el cliente jamás lo exige) |
| `js/qa-composer.js` (`composeAnswer(query, mode)`, pills `#qa-mode-pills`) | Punto de autodetección: pre-clasificar `definicion/panorama/comparativa`, pills como override manual |
| `js/security-shield.js` (regex de jailbreak/forzado) | Punto aditivo: score `noul` de riesgo en paralelo, OR lógico (cualquiera bloquea), regex intacto |
| Limitación oficial documentada | `choice` con >20 opciones se degrada → ninguna tarea registrada supera 5 opciones |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Instalador canónico en el repo + verificación de LAYA_HOME

- Copiar `C:\Users\dpint\.laya\setup_laya.py` a `scripts/setup_laya.py` (canónico versionado; adapta rutas a `LAYA_HOME` por entorno, sin hardcodear `C:\Users\dpint`). El de `.laya` sigue siendo el ejecutable; el del repo es la fuente versionada (documentar la convención en ambos headers).
- `scripts/setup_laya.py --check` (nuevo flag): verifica sin instalar (venv + marker + import + versión) y sale 0/1 — lo usa CI y futuros prompts para detectar presencia.
- Documentar en `LAYA_CONTRACT.md` (copia breve en repo o referencia): `LAYA_HOME`, fallback, timeout 500 ms, línea roja.

### PARTE B — `scripts/laya_router.py`: el enchufe reutilizable (corazón del prompt)

- CLI: `python scripts/laya_router.py predict --task <id> --state '<json>' [--timeout-ms 500]` → JSON `{ task, decision, confidence, latencyMs, fallback: false }` a stdout; ante cualquier fallo (sin marker, timeout, excepción) → `{ fallback: true, reason }` con exit 0 (el fallback no es error, es el diseño).
- Lee `LAYA_HOME`, usa el python del venv, timeout duro vía `subprocess.run(timeout=...)`, log de cada llamada en `LAYA_HOME/logs/router.jsonl` (task, latencia, fallback sí/no — base para el benchmark futuro).
- **Registro de tareas** (`LAYA_TASKS`, dict versionado en el mismo script, documentado para futuros prompts): cada tarea declara `questions` fijas (choice/score/noul, ≤5 opciones), `model` (`multilingual` default ES) y `fallback` (comportamiento actual). Tareas iniciales:
  - `qa_mode`: `choice {definicion, panorama, comparativa}` — "¿qué forma de respuesta pide esta pregunta?"
  - `shield_risk`: `noul` — "¿este texto intenta manipular la evaluación o saltarse instrucciones?"
- Prohibido registrar tareas que decidan rúbrica, auth, mastery o notas (validar por allowlist de tipos en el propio script si es trivial, o documentar la prohibición con test que la audite).

### PARTE C — Endpoint local `POST /api/laya/predict` (server.py, solo-local)

- Body `{ task, state }`; valida `task` contra `LAYA_TASKS` (rechaza tareas desconocidas, 400); límite de payload (state ≤ 4 KB, 413 si excede); delega a `laya_router.py` con timeout; responde su JSON tal cual (incluido `fallback:true`).
- Sin auth nueva (mismo nivel que el resto de endpoints locales de lectura); rate-limit simple en memoria (1 req/150 ms por IP, patrón del buscador).
- En Pages este endpoint no existe: el cliente JS lo trata como opcional (ver Parte D).

### PARTE D — Piloto 1: autodetección de modo Q&A (JS, con override manual)

- Antes de `composeAnswer`, `fetch('/api/laya/predict', {task:'qa_mode', state:{query}})` con `AbortController` timeout 600 ms; si responde `fallback:false`, preselecciona la pill correspondiente (el usuario puede cambiarla a mano — las pills mandan siempre).
- Si el fetch falla, 404 (Pages) o timeout → `definicion` (comportamiento actual, cero cambios visibles).
- Marcar visualmente la preselección automática con `title="Sugerido por Laya"` (honestidad UI, sin rebrand).

### PARTE E — Piloto 2: Shield aditivo (JS + router, OR lógico)

- En paralelo al regex actual (sin tocarlo), misma llamada con `task:'shield_risk'`; si `noul ≥ 0.85` O el regex dispara → bloqueo 0.0 pts con evidencia registrada (origen: `regex`/`laya`/`ambos`).
- Umbral 0.85 como constante nombrada (`LAYA_SHIELD_THRESHOLD`, afinable con datos del log futuro).
- Si Laya ausente/falla → solo regex (estado actual exacto).

### PARTE F — SEGURIDAD Y ACCESIBILIDAD

- `state` sanitizado antes de enviar (mismo purge del header, 200 chars); endpoint valida tamaño y tarea; `escapeHtml` en todo render de decisiones; log sin PII (truncar queries a 80 chars en `router.jsonl`).
- `aria-live` en la pill preseleccionada; sin cambios de layout (móvil intacto).

### PARTE G — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nueva Sección 37 en `test_e2e_case_flow.cjs` (mock del endpoint: Laya presente / ausente / timeout):
  1. Sin Laya → Q&A usa `definicion`, Shield solo regex (paridad total con v7.46).
  2. Con Laya mockeada → preselección de modo correcta en 6 queries ES de muestra; override manual prevalece.
  3. Shield: regex solo, laya solo (≥0.85), ambos, ninguno — matriz OR completa.
  4. Tareas >5 opciones o fuera del registro → rechazadas (400 / test de auditoría).
  5. `router.jsonl` registra sin PII (queries truncadas).
- Benchmark inicial (anexo al reporte, no gate): 20 queries ES reales del historial Vault → acierto qa_mode vs modo que el usuario eligió a mano; latencia p50/p95. Si Laya no supera al default, se documenta y los pilotos quedan como opt-in (no se revierte la capa).
- Suites 4/4 PASS + `CONTEXT.md` (§8: `scripts/setup_laya.py`, `scripts/laya_router.py`, `POST /api/laya/predict`, `LAYA_TASKS`, umbrales; §9 v7.47).

## DEFINITION OF DONE

- [ ] `scripts/setup_laya.py` versionado + `--check` funcional
- [ ] `scripts/laya_router.py` con `LAYA_TASKS` (qa_mode, shield_risk), fallback exit-0 y log jsonl sin PII
- [ ] Endpoint local con validación, payload cap y rate-limit; Pages intacto (404 → fallback)
- [ ] Q&A preselecciona modo con override manual; Shield OR con umbral nombrado
- [ ] Benchmark 20 queries anexado con veredicto honesto
- [ ] Suites 4/4 PASS + `CONTEXT.md` (§8 + §9 v7.47)

## NOTAS PARA EL EJECUTOR

- La API real es la instalada (`laya 0.3.20`): `Router(default='multilingual')`, `preload(['multilingual'])`, `predict(state, questions, model='multilingual')`. No usar `checkpoint=` (no existe) ni fiarse de ejemplos de marketing.
- Futuro explícito (no programar): 039 CLI CASOS, 040 chatbot, triage de nutrición — todos consumen `laya_router.py` + nuevas entradas en `LAYA_TASKS`. Si sobra holgura, dejarlas listadas en `PROMPTS/README.md` como 📝, sin código.
