# PROMPT 035 — Grafo vivo en canvas: consumir GRAPH_DATA (sin UI nueva)

> **Versión:** v1.0 · **Fecha:** 2026-09-25 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 034 verde (`graph_data.json` + `js/graph-data.js` generados y verificados)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Cablear el dato vivo del 034 al canvas existente: `js/concept-graph.js` deja de dibujar los 14 nodos legacy y renderiza **1 nodo por cédula del canon + 1 arista por cruce validado**, con física, zoom, pan, pinch y leyenda intactos. Cero UI nueva (el inspector rico es el 036, la toolbar es el 037). Al terminar, el grafo se ve igual en mecánica pero con el contenido real.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión `v7.44`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs`, `node test_mobile_header_theme.cjs`; ampliar suites con la nueva funcionalidad.
3. Stack vanilla (JS ES6 sin bundlers); no añadir dependencias ni librerías de grafos (D3, vis.js, etc. — el canvas propio se conserva).
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`); `targetTopicId` solo contra allowlist del canon.
5. No romper contratos (`INITIAL_DATA.graph` legacy como fallback, `StorageService`, `LicenseService`, buscador único `#global-search-input`, sidebar solo temario, mastery `masteredTopicIds`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "mejoremos la sección de grafos [...] que sea una especie de cerebro visual de los contenidos que vamos desarrollando".
>
> **Intención Nexo:** con el dato vivo ya generado (034), este es el paso de encendido: el canvas muestra el canon completo. Mecánica idéntica, contenido real. La inteligencia (inspector, búsqueda, filtros) viene después sobre esta base.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| `js/concept-graph.js` (`setupData`, `updatePhysics`, `draw`, `selectNode`, `bindCanvasEvents`) | Fuente actual, constantes físicas (`kRepel`, `kSpring`, `targetDist`), radio por `n.size`, colores por `subject` |
| `js/graph-data.js` (`window.GRAPH_DATA`) + `graph_data.json` (034) | Esquema real de nodo/arista, conteos, peso |
| `js/data.js` `INITIAL_DATA.graph` (14 nodos legacy) | Conservar como fallback con comentario `LEGACY`; prioridad de fuentes a definir |
| `index.html` (línea ~797-807, orden de `<script>`) | Dónde inyectar `js/graph-data.js` antes de `js/concept-graph.js` |
| `js/app.js` (`switchView`, `openTopic`, `searchGlobal`) | Botón `Buscar en Temario` del inspector usa `App.searchGlobal(node.label)` — con IDs canon ya resuelve de verdad |

## CAMBIOS A IMPLEMENTAR

### PARTE A — `setupData()` consume el dato vivo (único cambio funcional)

- Prioridad de fuentes: `window.GRAPH_DATA` → `StorageService.getData().graph` → `INITIAL_DATA.graph` (legacy, con `console.warn` si se cae al fallback).
- Mapeo nodo vivo → nodo canvas: `{ ...n, x, y, vx: 0, vy: 0, radius: 18 + min(12, grado*2) }` donde `grado` = nº de aristas incidentes (los hubs dogmáticos se ven más grandes; determinista, sin `Math.random` en el size — el jitter de posición inicial se conserva).
- Colores existentes intactos (`civil` celeste, `procesal` morado, `constitucional` ámbar, `cross` dorado); nodos sin `subject` conocido → color civil por defecto + conteo en consola (no crash).
- Aristas que referencien IDs ausentes del set de nodos se filtran en silencio + contador (defensa en profundidad aunque el 034 ya garantiza 0 huérfanos).
- Etiqueta canvas: `n.label` truncado a 28 chars con `…` si excede (el canvas no hace wrap; el título completo vive en el inspector del 036).

### PARTE B — Física y render para N real (ajuste, no rewrite)

- Con 200+ nodos y ~600 aristas, la física O(n²) de `updatePhysics()` puede degradarse: introducir **cap de repulsión por distancia** ya existente (320px) + `requestAnimationFrame` con pausa automática cuando la pestaña está oculta (`document.visibilitychange`) y cuando la vista no es `graph` (no quemar CPU en background).
- `targetDist` y `kRepel` parametrizados como constantes nombradas al tope del módulo (para afinar en 037 sin cazar números mágicos).
- Resto (`draw`, zoom, pan, pinch, drag) **intacto**: mismo look, mismos controles flotantes, misma leyenda (añadir a la leyenda el conteo real `N cédulas · M nexos`, derivado, no hardcodeado).

### PARTE C — Compatibilidad y navegación

- `index.html`: `<script src="js/graph-data.js">` antes de `concept-graph.js` (mismo patrón que `vault-index.js`).
- El botón inspector `Buscar en Temario` ahora resuelve porque `node.id` es ID canon: verificar que `App.searchGlobal`/`openTopic(node.id)` navega a la cédula (si `searchGlobal` espera texto libre, preferir `App.openTopic(node.id)` directo; documentar la decisión).
- `StorageService`/`syncWithServer`: el grafo vivo es derivado estático, NO se sincroniza ni se persiste avance aquí (el overlay de mastery es del 037).

### PARTE D — SEGURIDAD Y ACCESIBILIDAD

- `escapeHtml` en todo string del inspector actual (`label`, `desc`, `link.label`); canvas usa `fillText` (inerte por naturaleza, sin cambios).
- `tabindex`/`aria-label` en botones de zoom existentes si les faltan (auditar, no rediseñar).

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Extender Sección 34 (`test_e2e_case_flow.cjs`): nº de nodos renderizados == canon derivado; 0 IDs legacy (`acto-juridico`, etc.) presentes cuando `GRAPH_DATA` existe; fallback legacy solo sin `GRAPH_DATA`; `openTopic(node.id)` resuelve al canon para muestra de 10 nodos (uno por bloque temático); sin regresión de zoom/pan/pinch (simulación de eventos existente).
- Suites 4/4 al 100 % PASS + `CONTEXT.md` (§8 fila `concept-graph.js` vivo + §9 v7.44 con conteos reales).

## DEFINITION OF DONE

- [ ] Con `GRAPH_DATA` presente: grafo dibuja N=canon nodos y M=cruces aristas (verificado en test, no a ojo)
- [ ] Sin `GRAPH_DATA`: fallback legacy de 14 nodos funciona (cero pantallas rotas en Pages si el artefacto falta)
- [ ] Física fluida, zoom/pan/pinch/drag intactos en PC y móvil
- [ ] Clic en nodo → ID canon real navegable al temario
- [ ] Suites 4/4 PASS + `CONTEXT.md` (§8 + §9 v7.44)

## NOTAS PARA EL EJECUTOR

- Si el canvas con 200+ nodos se vuelve ilegible (etiquetas encimadas), NO lo rediseñes aquí: anótalo como hallazgo para el 037 (foco por vecindario + clustering). Este prompt aprueba con el grafo completo aunque denso.
- No toques el inspector más allá del fix de navegación (Parte C); su rediseño es el 036.
