# PROMPT 033 — Ciclo de Nutrición y Mejora Continua: comando repetible (no implementación)

> **Versión:** v1.0 · **Fecha:** 2026-09-25 · **Autor:** puente (dpint) + socio (OpenCode)
> **Estado:** ✅ Implementado (v7.42) · **Tipo:** protocolo permanente, NO one-shot · **Depende de:** v7.32 verde (gate + barrido)

---

## FRASE DE ACTIVACIÓN (con OpenCode o con Anti)

> **`nutrir sistema`**

Al recibirla, el agente (OpenCode o Antigravity) ejecuta este protocolo completo sin pedir más instrucciones. Equivale a correr `node scripts/ciclo_nutricion.cjs` + diagnosticar + actuar bajo compuertas + registrar.

## ROL

Actúa como ingeniero de software senior experto en `estudio-de-grado-app` (GRADOMANIACOS). Tu tarea NO es implementar nada nuevo salvo que el diagnóstico lo exija y el humano lo apruebe: es **medir, diagnosticar, actuar bajo compuertas y registrar**, para que el sistema se vaya haciendo mejor en cada ciclo.

## MISIÓN

Cada ciclo deja al sistema igual o mejor que antes, con evidencia: barrido determinista de los 4.785 tríos mixtos, comparación contra el historial, diagnóstico del top-20 débil y del piloto, acción solo donde aporte, y registro auditable (`nutricion_historial.jsonl` + commit convencional).

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** se actualiza §9 (nueva versión) **solo si el ciclo cambió motor/código**; las corridas de medición puras se registran únicamente en `nutricion_historial.jsonl` (sin inflar versiones).
2. Suites según lo tocado: medición pura → basta el ciclo en verde + `python scripts/lint_fuentes.py`; cambio de motor → 4/4 al 100%.
3. Stack vanilla, sin dependencias nuevas.
4. Prohibido tocar en un ciclo: `all_afg_topics.json`, `js/data.js`, `vault_index.json`, `dogmatic_connections.json`, claves auth, canon.
5. Staging con paths explícitos (nunca `-A`); el ledger completo vive en TEMP y NO se commitea (solo `trios_ledger_report.json` + `nutricion_historial.jsonl`).

## EL CICLO (5 fases, siempre en orden)

### FASE 0 — Estado (primero, no asumir)
- `git status` + `git log --oneline -3`; canon vigente desde `all_afg_topics.json` (conteo derivado, nunca número mágico).

### FASE 1 — Medir (comando, ~60–90s)
- Ejecutar `node scripts/ciclo_nutricion.cjs`. Respeta su veredicto:
  - `BASELINE/MEJORA/ESTABLE` → continuar.
  - `REGRESION` (exit 2) → NO commitear; diagnosticar causa (¿cambió el canon? ¿cambió el generador?) y reportar al humano.

### FASE 2 — Diagnosticar (lectura del reporte, sin código aún)
- Top-20 débiles: ¿concentrados en un par de instituciones o dispersos? ¿`archetypeId: "unknown"` dominando (hueco de cobertura de arquetipos)?
- `needsReview > 0`: ¿qué preguntas/instituciones derivan del apunte?
- Piloto 4/4: cualquier piloto no verde es hallazgo prioritario.
- Clasificar cada hallazgo: `datos` (requiere prompt de ingesta, fuera de este ciclo) / `motor` (gate, overlap, arquetipos) / `cobertura` (instituciones sin arquetipo).

### FASE 3 — Actuar (bajo compuertas estrictas)
- **Automático (sin preguntar):** re-ejecutar medición, regenerar reporte, anexar historial.
- **Con aprobación del humano:** cualquier cambio en `js/case-generator-agent.js` (umbrales, overlap, arquetipos), nuevos scripts o cambios de prompts.
- **Prohibido sin prompt dedicado:** regenerar datos, reindexar Vault/cruces, tocar auth/ventas/servidor.

### FASE 4 — Verificar
- Medición pura: ciclo en verde + lint OK.
- Cambio de motor: 4 suites al 100% (`test_unlock_auth_flow.cjs`, `test_e2e_case_flow.cjs`, `test_deduplication_flow.cjs`, `test_mobile_header_theme.cjs`).

### FASE 5 — Registrar
- Commit convencional con paths explícitos, ej: `chore(nutricion): ciclo 2026-09-25 ESTABLE 4785/4785 fully 100% (PROMPT 033)`.
- `CONTEXT.md` §9 solo ante cambio de motor/código; el historial JSONL es el registro de las mediciones.

## DEFINITION OF DONE (por ciclo)

- [ ] Ciclo ejecutado con veredicto explícito (BASELINE/MEJORA/ESTABLE/REGRESION)
- [ ] Diagnóstico del top-20 + piloto registrado en la respuesta (no solo en archivos)
- [ ] Acción aplicada solo bajo su compuerta (o "sin acción requerida" justificado)
- [ ] Verificación según lo tocado + commit convencional con paths explícitos
- [ ] `nutricion_historial.jsonl` con la nueva línea; árbol limpio al cerrar

## NOTAS PARA EL EJECUTOR

- Si el humano pide "nutrir sistema" a mitad de otro trabajo, el ciclo corre sobre HEAD tal cual (mide el estado real, incluida la suciedad del árbol: se reporta).
- Rollback de un ciclo = revertir su commit: el historial JSONL vuelve con él, el TEMP se regenera solo.
- Este archivo es el contrato: mejorarlo también es "actuar" (con aprobación).
