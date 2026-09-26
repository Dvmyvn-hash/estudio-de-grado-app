# PROMPT 037 — Toolbar del grafo + legibilidad a escala (filtros, foco, rendimiento)

> **Versión:** v1.0 · **Fecha:** 2026-09-25 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 036 verde (inspector cerebro funcional)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Cerrar el "cerebro visual" con la capa de exploración: toolbar propia del grafo (búsqueda local delegada al Vault, filtros por materia/capítulo que atenúan sin amputar, overlay de avance) + legibilidad con 200+ nodos (modo foco por vecindario, cap de aristas visibles, física afinada). Sin tocar el header, el sidebar ni el inspector del 036 más allá de lo necesario.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión `v7.46`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs`, `node test_mobile_header_theme.cjs`; ampliar suites.
3. Stack vanilla, cero dependencias, cero lógica de scoring duplicada (delegar en `VaultSearch`/`QAComposer`).
4. Sanitización en el origen; sin `innerHTML` con queries crudas; rate-limit y debounce como el header (150 ms).
5. No romper contratos (input único `#global-search-input` del header intacto y sin duplicados funcionales; mastery LWW; `aria-*` del 030).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "que sea una especie de cerebro visual de los contenidos que vamos desarrollando".
>
> **Intención Nexo:** con datos vivos (034), canvas vivo (035) y ficha rica (036), falta el movimiento: encontrar un concepto en el mapa, filtrar por materia, ver mi avance de un vistazo y que el mapa siga legible con cientos de nodos. Este prompt es exploración + escala, y cierra el ciclo 034–037.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| `#view-graph` + `.graph-layout` + controles flotantes (035) | Dónde montar la toolbar sin romper zoom/pan/pinch ni la leyenda con conteo |
| `js/vault-search.js` (`VaultSearch.searchVault`), `sinonimos.js` | API exacta a delegar (no re-scoring); filtros por materia/bloque del header (020) como referencia |
| `masteredTopicIds` (011) + clase `is-mastered` (036) | Lectura masiva de estado para overlay |
| `updatePhysics()` + constantes parametrizadas (035) + `visibilitychange` | Punto de partida del afinado; medir FPS antes/después |
| `displayHierCode` + capítulos colapsables del sidebar (032) | Orden `min indexCode` (Discusión→Prueba→Sentencia) a reutilizar en el selector de capítulos |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Toolbar del grafo (solo dentro de `#view-graph`)

- `#graph-search-input` (con `maxlength="200"`, debounce 150 ms, purga de control chars como el header): delega en `VaultSearch.searchVault(q)`; el top-1 con nodo existente lo centra (`panX/panY`) + abre su inspector; si no hay match canónico, empty honesto (cero invención). Enter = primer resultado, Escape = limpiar+desenfocar.
- `#graph-filter-pills` [Todas|Civil|Procesal|Const.] + `#graph-filter-chapter` (orden min-`indexCode`, patrón 020/032): **filtran atenuando** (nodos fuera de filtro a opacity 0.12, aristas a 0.05), jamás eliminan ni reordenan ranking.
- `#graph-toggle-mastery-overlay` (switch): nodos dominados con halo verde + contador `Dominadas X/N` derivado (no hardcodeado).
- IDs nuevos con prefijo `graph-` (cero colisión con `vault-*`/`qa-*`/`global-*` del header).

### PARTE B — Legibilidad a escala (modo foco + caps)

- **Modo foco:** con nodo seleccionado, solo su vecindario a 1 salto a opacidad 1; resto a 0.1; aristas del seleccionado en dorado con `type` rotulado (extiende el highlight existente, no lo reemplaza). Al cerrar inspector, vuelve la vista completa.
- **Cap de aristas:** máx 400 visibles (priorizar inter-materia/transversales examen, luego grado de hubs); contador `mostrando X/Y nexos` en la leyenda.
- **Física afinada:** con las constantes del 035, ajustar `kRepel`/`targetDist` para N real con prueba de FPS (`performance.now`, muestreo en test): objetivo 60fps en PC y ≥30fps en móvil medio; pausar simulación con tab oculta o vista no-grafo (ya iniciado en 035, completar aquí).

### PARTE C — Móvil 360px y accesibilidad

- Toolbar en fila propia con wrap, touch targets ≥44px, sin `overflow-x`; canvas con `touch-action: none` intacto.
- `aria-live="polite"` en contador de resultados/foco; `aria-pressed` en pills y toggle mastery; contraste AA intacto.

### PARTE D — SEGURIDAD

- Query truncada + purgada antes de delegar; resultados validados contra allowlist de nodos (si el Vault devuelve un ID sin nodo, se ignora + conteo); `escapeHtml` en todo render de resultados.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nueva Sección 36 en `test_e2e_case_flow.cjs`: búsqueda local centra el nodo correcto (5 queries de muestra, ej. `emplazamiento`, `18 días hábiles`); filtro por materia solo atenúa (nº de nodos en DOM intacto); toggle mastery muestra conteo derivado correcto; modo foco deja exactamente vecindario a opacidad 1; cap de aristas respeta `mostrando X/Y`.
- `test_mobile_header_theme.cjs`: toolbar a 360px sin overflow ni solape con controles flotantes.
- Suites 4/4 PASS + `CONTEXT.md` (§8 toolbar+foco + §9 v7.46 con métricas FPS antes/después).

## DEFINITION OF DONE

- [ ] Búsqueda local encuentra y centra (delegando al Vault, sin duplicar scoring)
- [ ] Filtros atenúan sin amputar; overlay de avance con conteo derivado
- [ ] Modo foco + cap de aristas + contador en leyenda
- [ ] 60fps PC / ≥30fps móvil, simulación pausada en background
- [ ] 360px limpio, targets ≥44px, `aria-*` correctos
- [ ] Header/sidebar/inspector sin regresiones; suites 4/4 PASS + `CONTEXT.md` (§8 + §9 v7.46)

## NOTAS PARA EL EJECUTOR

- Este prompt **cierra el ciclo 034–037**: al terminar, actualizar en `PROMPTS/README.md` los 4 como ✅ y anotar en CONTEXT §9 v7.46 el estado "cerebro visual completo".
- Futuro explícitamente fuera de alcance (no programar): clustering colapsable por capítulo, minimapa, rutas de estudio guiadas, edición manual de aristas. Si sobra holgura, dejarlas como sección `## FUTURO` en el prompt 037 del README, sin código.
