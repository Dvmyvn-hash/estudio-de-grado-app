# PROMPT 031 — Cruces Dogmáticos Nutridos por Vault + Agentes (citas reales, cero alucinación)

> **Versión:** v1.0 · **Fecha:** 2026-09-25 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 027 verde (Vault+QA en header), 026 (gate anclaje ≥3 bigramas). No pisar 029/030 (visor + shell cerrados).

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que el apartado **Cruces Dogmáticos** de cada cédula (`#btn-toggle-connections-aside`, pill `Cruces Dogmáticos (N)`, panel `Cruces Dogmáticos e Instituciones Vinculadas`) deje de depender del mapa estático manual + fallback genérico ("Materia Afín" con texto plantilla) y pase a nutrirse del conocimiento real: **Vault BM25-lite + `sinonimos.json` + citas verbatim del QA + overlap de `linkedApuntes` del generador**, con gate anti-alucinación. Cada cruce muestra *por qué* (cita textual + salto con highlight) y *para qué* (aplicación práctica de examen). Sin regresiones de canon 103, buscador único, auth ni deploy estático.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión `v7.38`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs`, `node test_mobile_header_theme.cjs`; ampliar suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias (nada de ChromaDB/Qdrant/LangChain/LLM en runtime).
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, input único `#global-search-input`, sidebar solo temario, canon 103 con `indexCode` único y continuo).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "me podrías dar un prompt para nutrir el apartado de cruces dogmáticos con el vault y los agentes con conocimientos".
>
> **Intención Nexo:** hoy los cruces viven en `build_dogmatic_connections.py → CONNECTIONS_MAP → dogmatic_connections.json → generate_clean_notes_data.py → all_afg_topics.json (sec.connections) → js/app.js (richConnections / fallbackRelated)`; el fallback es texto genérico sin citas y el mapa manual no escala ni se verifica contra el corpus. El grafo (`js/concept-graph.js`, canvas) visualiza instituciones pero no consume la misma evidencia. La mejora: derivar y validar cruces desde el índice vivo, con agentes deterministas (sin LLM) y citas clicables como el QA.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|----------|-------------------------------|
| `build_dogmatic_connections.py` (`CONNECTIONS_MAP`) + `dogmatic_connections.json` | Cuántas cédulas tienen cruces reales vs vacías; taxonomía `crossoverType` abierta (normalizar a cerrada) |
| `generate_clean_notes_data.py` (línea ~1010 `sec["connections"]`) + `server.py` (~546) + `.github/workflows/deploy-pages.yml` | Dónde inyectar el paso de enriquecimiento para que CI/local/Pages queden idénticos |
| `js/app.js` (~1053 `richConnections`, ~1070 `fallbackRelated`, ~1248/1275/1295/1415 panel) | Render actual, IDs del DOM, sanitizado, navegación a `targetTopicId` |
| `js/vault-search.js` (`VaultSearch.searchVault`), `js/sinonimos.js`, `js/qa-composer.js` (`composeAnswer`, `App.openTopic(id,{highlight})`) | APIs exactas a reutilizar (no duplicar scoring) |
| `js/case-generator-agent.js` (`linkedApuntes`, `assertCitationIntegrity`, gate ≥3 bigramas v7.32) | Overlap real + validación de citas a reutilizar |
| `js/concept-graph.js` (nodos/links, filtros, inspector) | Si ya consume `connections` o construye links propios; no romper física canvas ni touch |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Auditoría (obligatoria primero)

- Métricas: % cédulas con `connections` vacías, top `crossoverType` usados, % `targetTopicId` que resuelven al canon vivo, nº de fallbacks genéricos disparados en 10 cédulas muestra (una por bloque temático).
- Lista cerrada de ≤10 defectos (ej. "cruce X→Y sin bigramas comunes", "target huérfano", "fallback sin cita"). Sin esto no se programa.

### PARTE A — Motor determinista offline (Python, sin LLM)

- Nuevo `scripts/build_cross_connections.py` (o extiende `build_dogmatic_connections.py` sin romper su CLI): por cada cédula del canon, propone candidatos con `VaultSearch` equivalente Python (reusar `normalize_text` + `sinonimos.json` + BM25 del `build_vault_index.py`, no un scorer nuevo):
  - Señales: (1) overlap de bigramas con gate **≥3 bigramas reales** (hereda 026); (2) co-citación en `linkedApuntes` del generador; (3) par civil↔procesal / sustantivo↔adjetivo priorizado (max-coverage como 025).
  - Prioriza inter-materia (transversal examen) sin excluir intra-materia fuerte.
- Reglas duras: nunca auto-link, nunca duplicado A↔B, `targetTopicId` debe existir en el canon vivo (si no, se descarta, no se inventa), `crossoverType` de taxonomía **cerrada** (ej. `Genero-Especie | Sustantivo-Procesal | Fundamento-Constitucional | Excepcion-Procesal | Efecto-Patrimonial | Materia-Afin` — documentar en CONTEXT), `whyConnected` con **cita verbatim ≤140 chars + § indexCode** obligatoria, `practicalApplication` redactada solo desde la cita (plantilla, cero invención).
- Merge: el mapa manual `CONNECTIONS_MAP` queda como **override autoritativo** (lo manual gana); lo derivado solo rellena vacíos o añade hasta tope N=3 por cédula. Salida: `dogmatic_connections.json` regenerado + reporte `cruces_report.json` (cobertura, descartes por gate, huérfanos).

### PARTE B — Pipeline e integración (CI + local + Pages idénticos)

- `generate_clean_notes_data.py` y `server.py` consumen el JSON regenerado sin cambios de esquema (`sec["connections"]` intacto); si se añade script nuevo, engancharlo en `deploy-pages.yml` **antes** de `generate_clean_notes_data.py` (documentar orden).
- Presupuesto: `vault_index.json` ≤600 KB intacto; `dogmatic_connections.json` con tope documentado (ej. ≤300 KB) para no inflar Pages.

### PARTE C — UI del panel Cruces (`js/app.js` + CSS existente, sin rebrand)

- Cada tarjeta de cruce: `crossoverType` (badge cerrado), `whyConnected` + **cita verbatim con `<mark class="vault-highlight">`** y botón salto (`App.openTopic(targetId,{highlight:snippet})`, mismo patrón QA v7.27), `practicalApplication`, disciplina + `§ indexCode` del destino. Todo por `escapeHtml`.
- Fallback: si una cédula queda sin cruces validados, **no usar texto plantilla** — mostrar `empty-state` honesto ("Sin cruces validados aún — prueba en el buscador global") + top-3 Vault en vivo como sugerencias marcadas `sugerencia no validada` (sin guardarlas como cruces).
- `concept-graph.js`: si ya dibuja links propios, hacerlo consumir `connections` validadas cuando existan (mismo `targetTopicId`); si no, dejarlo intacto y documentar divergencia. No romper canvas, zoom, pan, pinch ni inspector.
- Móvil 360px: tarjetas sin overflow-x, targets ≥44px, `aria-current`/`aria-expanded` del 030 intactos.

### PARTE D — SEGURIDAD Y ACCESIBILIDAD

- `escapeHtml` en `whyConnected`, citas, títulos y `crossoverType`; `targetTopicId` validado contra allowlist del canon (anti open-redirect interno); payload del JSON con tope; `tabindex="0"`+`aria-label` en áreas con scroll; contraste AA intacto.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nuevas aserciones (extender `test_e2e_case_flow.cjs` o sección análoga + `test_mobile_header_theme.cjs` para layout): 100% `targetTopicId` resuelven al canon vivo; 0 auto-links; 0 duplicados; todo `whyConnected` con cita verbatim resoluble + gate ≥3 bigramas; `crossoverType` dentro de taxonomía cerrada; fallback genérico eliminado (grep `Materia Afín` con texto plantilla = 0 en render); salto con highlight funciona; cobertura ≥X% documentada (ej. ≥90% cédulas con ≥1 cruce validado o justificación).
- Suites 4/4 al 100% + `CONTEXT.md` (§8 mapa + §9 v7.38) con taxonomía, topes, pipeline y cobertura.

## DEFINITION OF DONE

- [ ] Auditoría Fase 0 con cobertura real + lista ≤10 defectos
- [ ] Builder determinista con gate ≥3 bigramas, merge manual-gana, reporte de cobertura/descartes
- [ ] CI/local/Pages regeneran idéntico; presupuestos (vault ≤600 KB, cruces ≤300 KB) cumplidos
- [ ] Panel Cruces con citas verbatim + salto highlight; cero texto plantilla; grafo sin regresión
- [ ] 100% targets vivos, 0 auto/duplicados, taxonomía cerrada, XSS blindado, móvil 360px limpio
- [ ] Suites 4/4 al 100% + `CONTEXT.md` (§8+§9 v7.38) + commit convencional con paths explícitos

## NOTAS PARA EL EJECUTOR

- `git pull` + `git status` primero (Anti trabaja en paralelo); parte de `main` verde (v7.37).
- No tocar `server.py` auth/licencias, `db.py`, `vault_index.json`, `sinonimos.json`, tablas del 029 ni tokens del 030 salvo overflow heredado.
- Prohibido LLM en runtime y en builder (solo overlap/citas deterministas); lo manual siempre puede vetar lo derivado.
- Staging con paths explícitos (nunca `-A`); corridas largas en background a archivos + grep `FAIL`/conteos; PowerShell sin `&&` ni `grep/tail`.
- Rollback = revertir JSON generado + `app.js` panel: el canon y el Vault no se enteran.
