# PROMPT 017 — Vault de Conocimiento con Índice Semántico Estático (sin base vectorial)

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 008, 016

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Construir el **Vault de Conocimiento**: búsqueda semántica sobre las 103 cédulas que responda "¿dónde del apunte está X?" con snippets verificables y citación exacta (`indexCode` + `sourceFile`). Debe funcionar **idéntico en servidor local y en GitHub Pages estático**, sin dependencias nuevas, con latencia de búsqueda < 50 ms y cero alucinaciones (todo resultado cita cédula real).

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (IDs del DOM, Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión `v7.22`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "tengo la idea de implementar un Vault (Base de Conocimiento) donde los documentos se transformen en vectores que la IA puede buscar y entender rápidamente."
>
> Propuesta previa (Gemini, **descartada por el orquestador**): ChromaDB/Qdrant/LangChain en Node.js.
>
> **Por qué se descarta:** (1) es infra con servidor y mata el deploy estático en GitHub Pages (la mitad de la plataforma); (2) viola la regla de stack vanilla sin justificación; (3) duplica lo que ya existe: `all_afg_topics.json` + `DYNAMIC_CORPUS` + `extractCitations()` + `assertCitationIntegrity()` ya son la base de conocimiento con citas verificadas. El Vault correcto es un **índice estático generado en build + buscador vanilla en cliente**, no un servicio nuevo.

## ESTADO ACTUAL RELEVANTE

| Archivo | Función/Sección | Estado |
|---------|-----------------|--------|
| `all_afg_topics.json` | 103 cédulas con `content` íntegro | Base del Vault, ya existe |
| `js/case-generator-agent.js` | `extractCitations()`, `deriveRulesFromSections()`, `DYNAMIC_CORPUS`, `assertCitationIntegrity()` | Scoring/citas reutilizables |
| `generate_clean_notes_data.py` | `TEMARIO_CANONICO` keywords por bloque | Boost temático reutilizable |
| `extract_estructura_pruebas.py` | Precedente: script Python que compila artefacto JS para CI | Patrón a replicar |
| `.github/workflows/deploy-pages.yml` | Regenera datos en CI antes de publicar | Punto de hook del índice |
| `index.html` | Sidebar `#topics-tree-container` | Punto de entrada UI |

## CAMBIOS A IMPLEMENTAR

### PARTE A — `build_vault_index.py` (nuevo, patrón `extract_estructura_pruebas.py`)

Script determinista e idempotente que lee `all_afg_topics.json` y genera `vault_index.json` + `js/vault-index.js` (objeto `VAULT_INDEX`):

- Tokenización ES: minúsculas, sin tildes, stopwords ES mínimo (~40), stemming ligero por sufijos (`-ción/-ciones`, `-mente`, plurales).
- Por cédula: posting list `término → {tf, posiciones[≤8]}` solo para `title + cleanTitle + category + content` (tope 4.000 chars como `populateApuntesIndex`).
- Globales: `df` por término, `docLen`, `avgLen`, `totalDocs = 103`, más `meta` por cédula (`id`, `indexCode`, `subject`, `chapterNumber`, `sourceFile`, `code`).
- Presupuesto: `vault_index.json` ≤ 600 KB; script falla si lo excede (obliga a podar posiciones/stopwords, no a subir el tope).
- Hook CI: agregar su ejecución en `deploy-pages.yml` junto a `generate_clean_notes_data.py`.

### PARTE B — `js/vault-search.js` (nuevo, vanilla, sin estado)

`searchVault(query, {subject, limit=8})` → `[{id, indexCode, title, sourceFile, score, snippet}]`:

- Scoring BM25-lite (`k1=1.2, b=0.75`) + boost ×1.3 si el término matchea keywords de `TEMARIO_CANONICO` del `subject` de la cédula + boost ×1.2 match en `title/cleanTitle`.
- `snippet`: ventana ±140 chars alrededor de la primera posición, con marcas de highlight por offsets (el render escapa con `SecurityShield.escapeHtml` y luego aplica `<mark>` sobre texto ya escapado).
- Sin resultados bajo umbral → retorna `[]` (la UI dice "sin coincidencias en apuntes", jamás inventa).
- Carga perezosa: `index.html` lo incluye después de `js/data.js`; funciona con `INITIAL_DATA.topics` + `VAULT_INDEX` sin backend.

### PARTE C — UI en `index.html` + `js/app.js` (solo índice de Apuntes)

- Input `#vault-search-input` + panel `#vault-search-results` sobre el sidebar (solo vista `topics`; oculto en Casos/Grafo como el resto del sidebar).
- Cada resultado: `§ indexCode` + título + `sourceFile`, click → `App.openTopic(id)` (contrato existente).
- Debounce 200 ms, mínimo 3 caracteres, estado vacío/error explícito. Sin cambios a `#topics-tree-container` ni a su orden (v7.19.1 intacto).

### PARTE D — SEGURIDAD

- Query tratada como texto (nunca `innerHTML` directo); highlight solo sobre offsets del índice.
- `vault_index.json` servido como estático (sin endpoints nuevos en `server.py`; si se agrega alguno, responde 404 fuera de allowlist como el resto).
- Cero secretos, cero fetch externo, cero dependencias.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nuevas aserciones (sección Vault en `test_e2e_case_flow.cjs` o suite dedicada): índice tiene 103 docs; consulta "emplazamiento" devuelve cédula cap 10 primero; "18 días hábiles" resuelve a `procesal-procemayor-5-2`; query inexistente (`zzzqqq`) → `[]`; todo `snippet` es substring verbatim del `content` de su cédula; `vault_index.json` ≤ 600 KB.
- Suites 100% PASS (4/4) + `CONTEXT.md` (Sección 8: `build_vault_index.py`, `js/vault-search.js`, `#vault-search-input`; bitácora v7.22).

## DEFINITION OF DONE

- [ ] `build_vault_index.py` genera `vault_index.json` + `js/vault-index.js` deterministas (2 corridas byte-idénticas)
- [ ] Índice ≤ 600 KB con 103 documentos
- [ ] `searchVault()` BM25-lite + boosts, < 50 ms por query en las 103 cédulas
- [ ] UI busca, muestra snippets con highlight sanitizado y salta a la cédula
- [ ] Cero resultados inventados: todo hit cita `id`/`indexCode` real y snippet verbatim
- [ ] Orden del sidebar v7.19.1 y contratos existentes intactos
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- **Prohibido** ChromaDB/Qdrant/LangChain/cualquier dependencia pip-npm: si crees necesitarla, escribe la justificación que supere el deploy estático y espera aprobación (no la instales).
- Reutiliza `extractCitations()` para validar que los snippets con citas normativas matcheen el corpus.
- Rollback = borrar `build_vault_index.py`, `vault_index.json`, `js/vault-index.js`, `js/vault-search.js` y revertir el bloque UI: el resto del sistema no debe enterarse.
