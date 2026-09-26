# PROMPT 042 — Navegación del grafo: zoom a grupo, persistencia de vista y tour

> **Versión:** v1.0 · **Fecha:** 2026-09-26 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 041 verde (clusters por materia)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Convertir el mapa agrupado del 041 en un territorio navegable: clic en etiqueta de grupo → cámara que vuela y encuadra ese territorio; la vista (pan/zoom/filtros/grupo) sobrevive recargas; y un mini-tour inicial de 3 pasos enseña el mapa la primera vez. Todo sin tocar física, datos ni inspector.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión disponible).
2. Suites 4/4 al 100 % PASS; ampliar con la nueva funcionalidad.
3. Vanilla, cero dependencias. Persistencia de vista en `localStorage` aislada de `StorageService` (patrón `_openChapters`/`graph_groups_visible`).
4. Sin regresiones (filtros, foco, mastery, búsqueda, fallback legacy, 360px, targets ≥44px).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "agrupado de manera ordenada y clara, óptima que permita una correcta navegación".
>
> **Intención Nexo:** el 041 ordena el mapa; este lo hace recorrible. Tres mecanismos chicos y componibles: vuelo a grupo, memoria de vista y tour de bienvenida. Nada más.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| `centerNode()` (037) + zoom/pan/reset existentes | Reutilizar la mecánica de cámara (no duplicar easing) |
| Envolventes y toggle del 041 + `localStorage` keys usadas | Dónde guardar `graph_view_state` sin colisionar |
| `switchView`/`renderCurrentView` (re-init completo al entrar) | Punto donde restaurar la vista guardada tras el re-init |
| Primera-visita patterns del repo (si existen) | Cómo se detecta "primera vez" en otras features |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Vuelo a grupo (zoom-to-group)

- Etiquetas de territorio clicables (y botones espejo en la toolbar): animan pan/zoom hasta encuadrar el bounding del grupo con padding (reutilizar easing de `centerNode`; duración ~450 ms, respeta `prefers-reduced-motion` → salto instantáneo).
- Doble-clic en fondo o botón reset → vista completa (comportamiento actual conservado).
- `aria-label` por botón ("Encuadrar Civil, 136 cédulas", conteo derivado).

### PARTE B — Memoria de vista

- Guardar (debounced 500 ms) `{panX, panY, scale, filterSubject, filterChapter, groupsVisible}` en `localStorage['graph_view_state']`; al entrar a la vista Grafo (post re-init), restaurar antes del primer frame.
- Botón "Restablecer vista" limpia también el estado guardado.
- Aislamiento total de `StorageService` (cero fuga a export de avance; test que lo audite).

### PARTE C — Mini-tour de bienvenida (3 pasos, una sola vez)

- Solo primera visita (`localStorage['graph_tour_seen']`): overlay ligero de 3 pasos (1. territorios, 2. búsqueda+filtros, 3. clic en nodo→ficha) con [Siguiente][Omitir]; re-abrible desde botón `?` en toolbar.
- Sin librerías de tour; < 60 líneas de CSS propio; dismiss con Escape; `role="dialog"` + foco gestionado.

### PARTE D — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nueva Sección e2e: vuelo encuadra el grupo (bbox del grupo dentro del viewport tras animación o su estado final calculado); estado persiste y se restaura (round-trip con re-init); reset limpia storage; tour aparece solo primera vez y Omitir/Escape lo cierran persistiendo el flag; cero fuga a `buildUserProgressExportPayload`.
- Suites 4/4 PASS + `CONTEXT.md`.

## DEFINITION OF DONE

- [ ] Clic en territorio → cámara encuadra el grupo
- [ ] Recargo y la vista sigue donde la dejé
- [ ] Tour de 3 pasos solo la primera vez, re-abrible, escapable
- [ ] Sin regresiones; suites 4/4 PASS + `CONTEXT.md`

## NOTAS PARA EL EJECUTOR

- Fuera de alcance: minimapa, rutas de estudio guiadas, edición de layout por el usuario (anotar como futuro en README, sin código).
- Al cerrar 041+042, marcar ciclo grafo-navegación completo en `PROMPTS/README.md`.
