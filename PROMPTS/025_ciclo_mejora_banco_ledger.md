# PROMPT 025 — Ciclo de Mejora: Banco Validado de Combinaciones + Ledger (time-boxed)

> **Versión:** v1.1 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** ✅ Ejecutado (ciclo nocturno Nexo) · **Depende de:** ninguno (solo lectura + TEMP)
>
> **Hallazgo de ejecución:** el piloto midió <0.1 s/10 pares y el barrido completo (655 pares compatibles de 37 instituciones) tomó **0.7 s**: saturación inmediata. El time-box de 4-6 h quedó innecesario; el ciclo vale como **gate rápido por triggers** (nuevo apunte, push, nocturno), no como proceso de horas.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Barrer las combinaciones de instituciones del catálogo (`INSTITUTIONS`, `js/case-generator-agent.js:661`), sintetizar y validar cada par compatible y producir un **ledger de calidad** (qué combinaciones generan casos válidos con justificación nutrida del Vault) más un **reporte de huecos** (pares inválidos o sin cobertura). Time-box 4 h con parada por saturación. Cero escrituras al canon, cero DB, cero puertos.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (bitácora → próxima versión `v7.31`; sin cambios de código no hay otra sección que tocar).
2. Ejecutar y dejar al 100 % PASS las suites que se toquen (este ciclo no modifica código: basta no romper nada verificable).
3. Stack vanilla; no añadir dependencias sin justificación.
4. Sanitización y guardrails vigentes intactos.
5. No romper contratos existentes.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: dejar un ciclo de mejora corriendo 4-6 h para nutrir el sistema.
>
> **Decisión del orquestador:** no loop ciego (el generador usa `Math.random`, pero el contenido sustantivo por preset es fijo: repetir lo mismo no nutre). El valor está en el **espacio no explorado**: pares de instituciones fuera de los 13 presets, respetando `incompatibleWith`. 4 h con parada por saturación (< 2% pares nuevos válidos por ventana de 30 min); 6 h solo si la ventana sigue rindiendo.

## ESTADO ACTUAL RELEVANTE

| Elemento | Realidad |
|----------|----------|
| `synthesizeCase([ids])` | Acepta listas arbitrarias; variación real por `Math.random` (nombres, shuffle, sufijos) |
| `incompatibleWith` por institución | Matriz a respetar: pares incompatibles se registran como `descartado-matriz`, no se sintetizan |
| `validateGeneratedCase` + `assertCitationIntegrity` | Vara de validación (vale lo ya auditado: Conclusión/pauta/fatal/citas/linked) |
| FIFO 10 casos / `all_cases.json` confidencial | El ciclo NO escribe casos a disco ni toca la poda |

## CAMBIOS A IMPLEMENTAR (ejecución, no código)

### FASE 0 — Piloto de throughput (15 min)

Medir: nº instituciones, nº pares compatibles y tiempo de sintetizar+validar 10 pares. Dimensionar N para ~4 h. Si el piloto da < 1 s/par, ampliar a tríos muestreados (los 13 presets + vecindad), jamás barrido exhaustivo de tríos sin recalcular.

### PARTE A — Barrido nocturno (fondo, con parada por saturación)

- Por par compatible: `synthesizeCase` → `validateGeneratedCase` → `assertCitationIntegrity` → checks Conclusión/pauta/fatal/linked-resuelven.
- Ledger por par: `{a, b, valid, cit_ok, q, ms}` en TEMP (`ledger_ciclo.json`); reporte de huecos (pares con `cit_ok=false` o valid=false) top-20.
- Solo lectura del repo + escritura en TEMP; sin servidor (poblar índice en memoria como la auditoría beta); sin tocar DB ni puertos (convive con trabajo paralelo).

### PARTE B — Cierre

- Reporte veredicto (pares válidos %, instituciones débiles, huecos top) + bitácora `CONTEXT.md` v7.31 con los números. El ledger se entrega como artefacto al humano (futura ponderación del generador, no de este ciclo).

## DEFINITION OF DONE

- [ ] Piloto midió y dimensionó el barrido (~4 h)
- [ ] Barrido completo o parado por saturación documentada
- [ ] Ledger + top-20 huecos entregados, cero escrituras al repo salvo bitácora
- [ ] Suites de regresión verdes al cerrar (dedup + mocks al menos; e2e si hubo cambios de código paralelos)

## NOTAS PARA EL EJECUTOR

- Si el workspace tiene trabajo paralelo en curso, no tocar sus archivos ni sus puertos; este ciclo es autocontenido.
- Rollback = borrar artefactos TEMP: el repo no se entera.
