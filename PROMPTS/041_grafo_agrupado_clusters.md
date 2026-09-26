# PROMPT 041 — Grafo agrupado por materia: layout clustered legible al abrir

> **Versión:** v1.0 · **Fecha:** 2026-09-26 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** v7.46.1 (hotfix estabilidad) commiteado

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que el grafo **se entienda al primer vistazo**: 3 territorios visuales (Civil, Procesal, Constitucional) con nodos de cada materia gravitanto a su centro de grupo, envolvente sutil + etiqueta por grupo, y posiciones iniciales deterministas (adiós dispersión aleatoria). Las aristas inter-materia se vuelven puentes dorados entre territorios. El modo foco, filtros, inspector y toolbar del 036–037 quedan intactos.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión disponible).
2. Suites 4/4 al 100 % PASS; ampliar con la nueva funcionalidad.
3. Vanilla, cero dependencias, cero cambios de datos (nodos/links idénticos; solo posiciones y render).
4. `escapeHtml` en etiquetas de grupo; `MAX_VELOCITY` y guarda anti-NaN (v7.46.1) intactos.
5. No romper contratos (filtros que atenúan, modo foco, mastery overlay, fallback legacy, buscador único del header).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "me gustaría que estuviese agrupado de manera ordenada y clara, óptima que permita una correcta navegación".
>
> **Intención Nexo:** el force-layout puro con 205 nodos converge pero amontonado: todo tiende al centro y las materias se mezclan. La fix es gravedad por grupo (3 centros) + layout inicial determinista por grupo + envolventes que nombran cada territorio. Navegación del 042 encima de esta base.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| `js/concept-graph.js` (`setupData`, `updatePhysics`, `draw`, constantes `K_*`, `MAX_VELOCITY`, `CENTER_STRENGTH`) | Dónde vive la gravedad única al centro y el jitter aleatorio inicial |
| Filtros/modo foco/leyenda (037) | Interacción con opacidades por grupo; leyenda con conteo vivo |
| `graph-data.js` (subjects por nodo) | `civil/procesal/constitucional/cross`: a qué grupo va cada `cross` (decidir y documentar: p. ej. al centro global como puentes) |
| Suites Sección 38–39 | Qué asserts de física/posiciones existen para no romperlos |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Gravedad por grupo + layout inicial determinista

- 3 centros de grupo en triángulo (Civil izq., Procesal der., Constitucional abajo o según viewport; posiciones relativas al tamaño del canvas, no píxeles fijos).
- En `updatePhysics()`: reemplazar la gravedad única al centro por gravedad al centro de su grupo (`GROUP_GRAVITY`, constante nombrada; nodos `cross` gravitan al centro global con fuerza menor — puentes visuales).
- En `setupData()`: posición inicial determinista = centro de grupo + espiral/grid por índice dentro del grupo (cero `Math.random`; misma entrada → mismo mapa inicial, testeable).
- Conservar resortes Hooke corregidos, repulsión con cap, damping, `MAX_VELOCITY` y guarda anti-NaN.

### PARTE B — Envolventes y etiquetas de territorio (solo display)

- Por frame (o cada N frames por rendimiento): calcular bounding-hull por grupo (caja redondeada con padding sobre sus nodos basta; no se exige convex-hull exacto) + etiqueta fija con nombre de materia y conteo (`Civil · 136`).
- Estilo Dark Academy sutil (borde tenue del color de materia, fondo casi transparente); no tapa nodos ni aristas (dibujar primero, `globalAlpha` bajo).
- Toggle `#graph-toggle-groups` (default ON) con `aria-pressed`; estado persistido en `localStorage['graph_groups_visible']` (aislado de `StorageService`, patrón `_openChapters` del 032).

### PARTE C — Puentes inter-materia

- Aristas con extremos en distintos grupos se dibujan en dorado tenue + levemente más gruesas (las transversales de examen se ven como puentes entre territorios); intra-grupo conserva gris actual.
- Leyenda: añadir conteo de puentes (`X puentes transversales`) derivado, no hardcodeado.

### PARTE D — SEGURIDAD Y ACCESIBILIDAD

- Sin strings nuevos sin escapar (nombres de grupo desde const cerrada, no desde datos).
- Grupos anunciados a lectores (`role="group"`, `aria-label` por territorio en toolbar); 360px sin overflow; targets ≥44px.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nueva Sección en e2e: tras N frames, distancia media intra-grupo < distancia media inter-grupos (clusters reales, no mezcla); layout inicial byte-determinista (dos `setupData()` → mismas x/y exactas); envolventes dibujadas para los 3 grupos; toggle persiste en localStorage; puentes dorados == aristas inter-materia del dataset; 0 NaN y velocidades bajo cap (regresión v7.46.1 intacta).
- Suites 4/4 PASS + `CONTEXT.md`.

## DEFINITION OF DONE

- [ ] Al abrir: 3 territorios distinguibles con etiquetas y conteos
- [ ] Layout inicial determinista (recargas idénticas)
- [ ] Puentes inter-materia visibles como tales
- [ ] Toggle con persistencia; filtros/foco/inspector sin regresiones
- [ ] Suites 4/4 PASS + `CONTEXT.md`

## NOTAS PARA EL EJECUTOR

- No implementar zoom-to-group ni minimapa aquí: es el 042.
- Si un grupo queda gigante (Civil 136 vs Const. 10), escalar su radio de dispersión inicial por √N para que no se empaste (documentar la fórmula).
