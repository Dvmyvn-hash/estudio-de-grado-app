# PROMPT 036 — Inspector cerebro: ficha de conocimiento por nodo (cruces + mastery + QA mínimo)

> **Versión:** v1.0 · **Fecha:** 2026-09-25 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 035 verde (canvas con nodos canon navegables)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Convertir el inspector lateral del grafo (hoy: `desc` genérica + pills + botón buscar) en una **ficha de conocimiento**: cada nodo muestra su cédula (materia, `§ indexCode`, capítulo), sus cruces validados con **cita verbatim + salto con highlight** (mismo patrón del QA v7.27), su estado de dominio y **1 respuesta extractiva** a modo de definición. Es el corazón del "cerebro visual".

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión `v7.45`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs`, `node test_mobile_header_theme.cjs`; ampliar suites.
3. Stack vanilla, cero dependencias nuevas, cero LLM en runtime (el QA es extractivo, ya existe).
4. Sanitización en el origen (`SecurityShield.escapeHtml` en `whyConnected`, citas, títulos, `crossoverType`); `targetTopicId` validado contra allowlist del canon (anti open-redirect interno, patrón 031).
5. No romper contratos (buscador único del header intacto, sidebar solo temario, mastery con LWW multi-dispositivo del 011, gate admin del cuestionario del 015 intacto).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "incorporemos ahí los conocimientos, las interconexiones, y que sea una especie de cerebro visual".
>
> **Intención Nexo:** el nodo deja de ser un círculo con nombre y pasa a ser la puerta de entrada a la cédula: qué es (ficha), con qué se conecta y por qué (cruces con cita), cuánto la domino (mastery) y qué dicen literalmente mis apuntes (QA extractivo). Todo con evidencia clicable, cero texto inventado.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| `js/concept-graph.js:selectNode()` (inspector `#graph-inspector`) | Estructura actual, IDs del DOM, listeners (cerrar, pills, `btn-view-node-topic`) |
| `js/app.js` `renderConnectionCardsHtml(connsList)` (031) | Helper unificado de tarjetas de cruce — **reutilizar, no duplicar** (importarlo o exponerlo si es local) |
| `dogmatic_connections.json` (vía `GRAPH_DATA.links` con `type`+`quote`, o lookup directo) | De dónde saca el inspector `whyConnected`/`practicalApplication` reales |
| `js/qa-composer.js` (`composeAnswer`, modos) + `App.openTopic(id,{highlight})` (021) | APIs exactas para respuesta extractiva y salto con `<mark class="vault-highlight">` |
| `StorageService.toggleTopicMastery` / `masteredTopicIds` (011) | Toggle y lectura de estado de dominio |
| `css/concept-graph.css` + tokens Dark Academy (030) | Dónde añadir estilos del inspector rico sin rebrand |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Ficha de cédula (cabecera del inspector)

- Badge de materia + `§ indexCode` + capítulo (`chapter`) + etiqueta jerárquica `M.C.S` (`displayHierCode`, 032) con tooltip de trazabilidad.
- Título completo (sin truncar; el canvas trunca, el inspector no).
- Botón `Ver cédula` → `App.openTopic(node.id)` (navegación directa, sin pasar por búsqueda).
- Botón `Dominada ✓ / Marcar por repasar` → `toggleTopicMastery(node.id)`; al cambiar, el nodo refleja halo verde (clase `is-mastered`, CSS mínimo) sin re-render completo.

### PARTE B — Cruces validados dentro del inspector (reutilizar 031)

- Renderizar con `renderConnectionCardsHtml()` las conexiones del nodo (fuente: lookup en canon `topic.connections` o `GRAPH_DATA.links` + join — decidir según Fase 0, documentar).
- Cada tarjeta: badge `crossoverType`, `whyConnected` + cita verbatim con `<mark class="vault-highlight">`, botón `.btn-jump-connection` → `App.openTopic(targetId,{highlight:quote})` (mismo patrón QA).
- Clic en tarjeta/nodo vinculado → `selectNode(vecino)` (navegación dentro del grafo, ya existe, conservar).
- Si el nodo no tiene cruces validados: empty-state honesto del 031 (`Sin cruces validados aún`) + top-3 Vault en vivo marcados `sugerencia no validada` (sin guardarlos como cruces).

### PARTE C — QA mínimo extractivo (1 tarjeta, modo `definicion`)

- Botón `Qué dicen mis apuntes` → `QAComposer.composeAnswer(node.label, 'definicion')` y renderiza la primera `.qa-citation-card` dentro del inspector (con su propio botón de salto).
- Gate de salida heredado: si `empty:true`, mostrar mensaje honesto del QA sin inventar texto.

### PARTE D — SEGURIDAD Y ACCESIBILIDAD

- `escapeHtml` en todo string renderizado (ficha, cruces, QA); allowlist de `targetTopicId` antes de cada salto.
- Inspector con `role="complementary"` + `aria-label` con título de la cédula; foco al abrir (`focus()` al heading) y retorno de foco al cerrar; touch targets ≥44px; 360px sin `overflow-x`.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nueva Sección 35 en `test_e2e_case_flow.cjs`: inspector de muestra (10 nodos, uno por bloque) muestra ficha con `indexCode`; nº de tarjetas == cruces validados del nodo; toda cita verbatim resoluble en contenido del target; salto con highlight centra el fragmento; toggle mastery persiste y pinta halo; QA ausente-deriva en empty honesto (query sin cobertura); `Materia Afín` genérica == 0 en render.
- `test_mobile_header_theme.cjs`: inspector a 360px sin overflow, targets ≥44px.
- Suites 4/4 PASS + `CONTEXT.md` (§8 inspector rico + §9 v7.45).

## DEFINITION OF DONE

- [ ] Cada nodo abre ficha con cédula real (materia, §, capítulo, M.C.S)
- [ ] Cruces con cita verbatim + salto highlight funcionales (reutilizando helper 031)
- [ ] Mastery toggle operativo con reflejo visual en el nodo
- [ ] QA extractivo de 1 tarjeta con gate honesto
- [ ] 360px sin overflow, targets ≥44px, foco gestionado
- [ ] Suites 4/4 PASS + `CONTEXT.md` (§8 + §9 v7.45)

## NOTAS PARA EL EJECUTOR

- Si `renderConnectionCardsHtml` es función local de `app.js` no exportada, exponla mínimamente (`window.renderConnectionCardsHtml` o módulo compartido) en vez de copiar el template — duplicar templates fue el defecto que el 031 eliminó.
- No añadas toolbar de búsqueda/filtros aquí: es el 037.
