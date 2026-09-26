# PROMPT 034 — Grafo vivo: builder offline desde canon + cruces (solo datos, cero UI)

> **Versión:** v1.0 · **Fecha:** 2026-09-25 · **Autor:** puente (dpint) + Nexo
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 031 verde (cruces validados), 032 (códigos jerárquicos solo-display)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Eliminar la raíz del problema del Grafo: hoy visualiza **14 nodos hardcodeados** (`js/data.js:12098-12136`, IDs inventados como `acto-juridico`) desconectados del canon real. Este prompt construye **solo la capa de datos viva** — un builder determinista que deriva nodos de `all_afg_topics.json` y aristas de `dogmatic_connections.json` — **sin tocar ni un píxel de la UI**. El canvas sigue mostrando lo mismo que hoy; solo queda disponible el dato vivo para el 035.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión `v7.43`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs`, `node test_mobile_header_theme.cjs`.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias (nada de ChromaDB/Qdrant/LangChain/LLM).
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, canon con `indexCode` único y continuo, input único `#global-search-input`, `dogmatic_connections.json` byte-idéntico).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "mejoremos la sección de grafos, junto con el vault, incorporemos ahí los conocimientos, las interconexiones, y que sea una especie de cerebro visual de los contenidos que vamos desarrollando".
>
> **Intención Nexo:** el Grafo actual es un juguete estático de 14 instituciones manuales; el conocimiento real vive en el canon (`all_afg_topics.json`, hoy 205 cédulas y creciendo) y en los cruces validados del 031 (`dogmatic_connections.json`, 3 por cédula con cita verbatim). Antes de dibujar nada nuevo hay que derivar el dato: 1 nodo por cédula + 1 arista por cruce validado, determinista y con reporte. Este prompt es solo eso; la UI viene en 035–037.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|---|---|
| `js/data.js` (~12098 `graph: {nodes, links}`) | 14 nodos fijos, IDs no-canon; es el fallback legacy a conservar intacto |
| `all_afg_topics.json` (canon derivado, conteo dinámico — NO hardcodear 103/205) | Campos por cédula: `id`, `subject`, `indexCode`, `code`, `cleanTitle`/`title`, `chapterTitle`, `chapterNumber` |
| `dogmatic_connections.json` + `cruces_report.json` (031) | Estructura por arista: `targetTopicId`, `crossoverType` (taxonomía cerrada 6 tipos), `quote` verbatim ≤140 chars |
| `generate_clean_notes_data.py` + `server.py` (~546) + `.github/workflows/deploy-pages.yml` | Dónde se generan los artefactos y en qué orden (cruces → clean_notes → vault_index); aquí se inserta el paso grafo |
| `js/concept-graph.js:setupData()` | Lee `StorageService.getData().graph \|\| INITIAL_DATA.graph`; NO modificar en este prompt (solo leer para no romper) |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Builder `scripts/build_graph_data.py` (nuevo, determinista, sin LLM)

- **Input:** `all_afg_topics.json` + `dogmatic_connections.json` (solo lectura, ambos byte-idénticos a la salida).
- **Output 1 — `graph_data.json`** (raíz del repo): `{ "nodes": [...], "links": [...] }`.
  - Nodo por cada cédula del canon, sin excepciones ni filtrados: `{ "id": topic.id, "label": (cleanTitle \|\| title) truncado a 60 chars, "subject": topic.subject, "indexCode": topic.indexCode, "chapter": chapterTitle }`.
  - Arista por cada cruce validado: `{ "source": topicId, "target": targetTopicId, "type": crossoverType, "quote": quote }`.
  - **Reglas duras:** nunca auto-link (`source == target` se descarta y se cuenta); `target` inexistente en el canon se descarta (no se inventa, se cuenta como `orphansDropped`); duplicados A↔B se colapsan a una arista (se cuenta `duplicatesCollapsed`).
  - Determinismo total: ordenar nodos por `(subject, indexCode)` y aristas por `(source, target)`; misma entrada → mismo SHA-256.
- **Output 2 — `js/graph-data.js`:** `window.GRAPH_DATA = {...}` con el mismo contenido (carga estática para GitHub Pages, patrón idéntico a `js/vault-index.js`). Generado por el mismo script, no a mano.
- **Output 3 — `graph_report.json`:** `{ totalNodes, totalLinks, orphansDropped, selfLinksDropped, duplicatesCollapsed, budgetKB, sha256, generatedAt }`.
- **Presupuesto:** `graph_data.json` ≤ `max(600 KB, totalNodos × 3 KB)` (misma fórmula escalable que vault/cruces; documentar el número efectivo en el reporte y en CONTEXT).

### PARTE B — Pipeline idéntico local / CI / Pages

- Enganchar en `.github/workflows/deploy-pages.yml` **después** de `scripts/build_cross_connections.py` y **antes** de `generate_clean_notes_data.py` (documentar el orden en el YAML con comentario).
- Verificar que `server.py` sirve archivos estáticos de raíz sin cambios (si ya sirve `vault_index.json`, `graph_data.json` funciona gratis; si no, ajuste mínimo con el mismo patrón, sin endpoint nuevo).
- El canon (`all_afg_topics.json`, `js/data.js` topics, `vault_index.json`, `dogmatic_connections.json`) queda **byte-idéntico**: este script solo lee.

### PARTE C — Prohibido en este prompt (lo hacen 035–037)

- NO tocar `js/concept-graph.js`, `js/data.js` (graph legacy), `index.html`, CSS ni inspector.
- NO añadir búsqueda, filtros, clustering ni cambios visuales.
- NO modificar suites existentes salvo **añadir** (ver Parte E).

### PARTE D — SEGURIDAD

- `label` truncado en origen (60 chars) + escape en consumo futuro; el builder valida que todo `id`/`target` pertenezca al canon (allowlist, anti open-redirect interno futuro).
- Tope de payload documentado (presupuesto Parte A); el script falla con exit ≠ 0 si lo excede.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nueva **Sección 34** en `test_e2e_case_flow.cjs` (conteo derivado del canon, cero números mágicos):
  1. `graph_data.json` existe y `totalNodes === all_afg_topics.length`.
  2. Todo `link.target` resuelve a un `node.id` del propio `graph_data.json` (0 huérfanos).
  3. 0 auto-links; 0 duplicados `(source,target)`.
  4. Todo `link.type` dentro de la taxonomía cerrada del 031 (leerla de `cruces_report.json` o const compartida, no duplicar lista).
  5. Peso ≤ presupuesto efectivo.
  6. Determinismo: dos ejecuciones seguidas → mismo SHA-256.
- Suites 4/4 al 100 % PASS.
- `CONTEXT.md`: §8 (fila `scripts/build_graph_data.py`, `graph_data.json`, `js/graph-data.js`, `graph_report.json` + orden del pipeline en `deploy-pages.yml`) y §9 bitácora `v7.43`.

## DEFINITION OF DONE

- [ ] `scripts/build_graph_data.py` genera los 3 artefactos con una sola orden documentada
- [ ] `totalNodes` == canon derivado; 0 huérfanos, 0 auto-links, 0 duplicados
- [ ] Presupuesto cumplido y reportado; determinismo SHA-256 verificado
- [ ] CI regenera en el orden correcto; local y Pages idénticos
- [ ] UI intacta al 100 % (el grafo se ve igual que antes — el dato vivo aún no se consume)
- [ ] Suites 4/4 PASS + `CONTEXT.md` (§8 + §9 v7.43)

## NOTAS PARA EL EJECUTOR

- Si el canon creció respecto a lo citado aquí (103 → 205+), es normal: todo conteo se deriva en runtime, nunca hardcodear.
- Ante cualquier duda de esquema de `dogmatic_connections.json`, manda `cruces_report.json` + 1 entrada real del JSON, no la memoria.
- No anticipes el 035: aunque sea tentador cablear `setupData()`, este prompt se verifica con el grafo visualmente intacto.
