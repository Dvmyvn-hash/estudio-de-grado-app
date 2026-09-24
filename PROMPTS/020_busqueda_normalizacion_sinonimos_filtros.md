# PROMPT 020 — Búsqueda que Encuentra: Normalización + Sinónimos + Filtros e Historial

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 017

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que la búsqueda del Vault **encuentre aunque el usuario no escriba el término literal del apunte**: normalización ES idéntica en índice y query (tildes, ruido de copiado), expansión por glosario jurídico curado, filtros por materia/bloque e historial reciente local. Todo puro cliente, sin backend ni dependencias.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (IDs del DOM, Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión `v7.25`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Orquestador (mejoras 3-5 de la Opción A): el índice 017 solo matchea términos literales normalizados básicamente. Un estudiante busca "reivindicatoria" y el apunte dice "acción de dominio"; busca "demanda" sin tilde y el texto trae "demanda" con ruido de OCR. Este prompt cierra esa brecha con normalización contractada, sinónimos curados y UX de filtros, sin embeddings ni servicios.

## ESTADO ACTUAL RELEVANTE

| Archivo | Función/Sección | Estado |
|---------|-----------------|--------|
| PROMPT 017 | `build_vault_index.py`, `js/vault-search.js`, `VAULT_INDEX` | Base que este prompt extiende (ejecutar 017 primero) |
| `TEMARIO_CANONICO` | Keywords por bloque | Fuente de vocabulario para el glosario semilla |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Normalización contractada build ↔ query

- `normalize(text)`: minúsculas, sin tildes, colapsa whitespace, repara artefactos de copiado/OCR (ligaduras `ﬁ/ﬂ`, guiones blandos, comillas raras). Se implementa **una vez en Python** (índice) y **una vez en JS** (query), con contrato documentado y test de paridad sobre pares fixture (`"demanda"` == `"demánda"`, `"posesión inscrita"` == `"posesion  inscrita"`).
- Regla: si la paridad falla en tests, se considera bug del contrato, no de los datos.

### PARTE B — `sinonimos.json` (comprometido, curado, con scope)

- Formato: `[{terminos: [...], subject: "civil"|"procesal"|"constitucional"|null, nota}]`. Semilla ~30 grupos (ej. `reivindicatoria/dominio/acción de dominio`, `emplazamiento/notificación de la demanda`, `casación/...`, `protección/amparo`).
- `searchVault()` expande la query con el glosario; hits por sinónimo puntúan ×0.8 bajo el literal (la expansión suma candidatos, BM25 sigue rankeando).
- Test de recall: cada grupo semilla debe recuperar su cédula objetivo entre top-5; test de precisión: query de un grupo no desplaza al top-1 literal de otro.

### PARTE C — UI: filtros + historial (`index.html` + `js/app.js`)

- Filtros sobre `#vault-search-results`: pills de materia + selector de bloque (`chapterTitle`, ordenado por min `indexCode` como el sidebar v7.19.1). Filtrar nunca reordena el scoring, solo recorta.
- Historial reciente (máx. 10) en `localStorage` bajo key propia, 100% local (no se sincroniza ni se exporta con el avance), con botón limpiar. Mismo debounce y sanitización del 017.

### PARTE D — SEGURIDAD

- Glosario es datos, no código: se parsea como JSON estricto, sin claves ejecutables.
- Historial jamás sale del navegador; las queries con `<script>` se tratan como texto y deben tener test.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Aserciones: paridad de normalización, recall/precisión del glosario semilla, filtros recortan sin reordenar, historial persiste/limpia, query maliciosa como texto.
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8: `sinonimos.json`, `#vault-search-filters`, historial; bitácora v7.25).

## DEFINITION OF DONE

- [ ] PROMPT 017 implementado y verde antes de empezar
- [ ] Paridad de normalización Python↔JS verificada por tests
- [ ] Glosario semilla ~30 grupos con recall top-5 y sin regresión de precisión
- [ ] Filtros + historial funcionando, locales y sanitizados
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- Si el 017 cambió el esquema de `VAULT_INDEX`, adapta este prompt primero y deja constancia en `CONTEXT.md`.
- Rollback = revertir normalización a la del 017, borrar `sinonimos.json`, filtros e historial: la búsqueda base del 017 debe seguir intacta.
