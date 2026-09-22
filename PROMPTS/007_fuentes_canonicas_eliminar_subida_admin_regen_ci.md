# PROMPT 007 — `fuentes/` como Base Canónica de Apuntes, Eliminación de la Subida de Apuntes de Administrador y Regeneración del Índice en CI

> **Versión:** v1.0 · **Fecha:** 2026-09-22 · **Autor:** puente (dpint)
> **Estado:** ✅ Implementado (v7.8) · **Depende de:** supersede a `001_sync_apuntes_admin.md`

> Copia y pega este bloque completo como prompt inicial en tu agente de Antigravity IDE. Está redactado para ejecutarse dentro del repositorio `estudio-de-grado-app` (GRADOMANIACOS) conforme a las reglas de `AGENTS.md`.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa la siguiente refactorización **respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio**.

## MISIÓN

Eliminar la **subida de apuntes desde el servidor** (la opción administrativa que provocó la destrucción del índice temático completo) y consolidar la carpeta **`fuentes/` del repositorio como base canónica única** del temario: el humano deposita o edita archivos `.md` en `fuentes/`, hace `git push`, y la página desplegada (GitHub Pages) se actualiza automáticamente mediante regeneración del índice en CI. **Conservar** el importador local de apuntes (`#btn-admin-manage-notes`, Gestor de Apuntes / NotebookLM → `localStorage`) como funcionalidad exclusiva del cliente.

## REGLAS OBLIGATORIAS DEL REPOSITORIO (ADEMÁS DEL CÓDIGO)

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Secciones 2.5, 3.1, 4.3, tabla de endpoints 6.2, tabla de componentes admin 7.2, Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → **v7.8**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; revisar/reescribir la Sección 9 de `test_e2e_case_flow.cjs`.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, códigos de licencia, flujo demo/desbloqueo).
5. No exponer `CASOS/`, `all_cases.json`, `parse_casos.py`, `db.py`, `estudio_grado.db` ni archivos `.cjs`/`agents.md` (Zero Exposure vigente).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

"Una subida de apunte desde el panel administrativo quedó a medias y borró todo el índice del temario. Quiero que esa opción de subida desaparezca, que la carpeta `fuentes/` del repo sea la base: yo dejo los `.md` ahí, hago `git push`, y la página desplegada se actualiza sola. Déjame también tu convención de prompts (PROMPTS)." Es decir: la publicación del temario debe ser **repo-first** (no servidor-first), con regeneración automática en GitHub Pages y sin ningún camino de escritura de apuntes por el servidor.

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

- **Panel Admin (`index.html`):** `#admin-modal` → `#admin-login-screen` (PIN SHA-256 `almabaltoamial2020`) y `#admin-dashboard-screen`. Existe la tarjeta `.admin-notes-upload-card` (con `#drop-zone-admin-notes`, `#input-admin-notes-file`, `#admin-notes-subject`, `#admin-notes-chapter`, `#admin-notes-chapter-title`, `#admin-notes-category`, `#btn-upload-admin-notes`, `#admin-notes-result`, `#btn-admin-open-advanced-notes`) que envía `POST /api/admin/upload-notes`. El botón `#btn-admin-manage-notes` abre el importador local `#import-modal` (NotebookLM → `localStorage` vía `StorageService`).
- **Backend (`server.py`):** Endpoints `GET /api/admin/notes`, `POST /api/admin/upload-notes` (límite `MAX_NOTES_UPLOAD_SIZE = 8388608`), `POST /api/admin/delete-notes`. Persistencia de metadatos en `apuntes_registry.json`. `GET /api/fuentes` fija `Content-Type` pero no llama `end_headers()` ni escribe cuerpo (bug latente → `ResponseContentLengthMismatchError`).
- **Parser (`generate_clean_notes_data.py`):** `build_files_config()` fusiona `FILES_CONFIG` estático con `apuntes_registry.json`; `extract_sections_from_file()` soporta fuente `admin-upload`; `deduplicate_sections()` da prevalencia a apuntes administrados sobre fijos.
- **Agente (`js/case-generator-agent.js`):** `FUENTES_CORPUS` y `linkedFuentes.file` referencian nombres de stubs (`civil.md`, `procesal.md`, `constitucional.md`, `derecho_de_bienes.md`).
- **`fuentes/`:** contiene stubs `civil.md`, `procesal.md`, `constitucional.md`, `derecho_de_bienes.md`.
- **CI (`deploy-pages.yml`):** no regenera el índice; publica el repo tal cual.
- **Layout móvil / auth / dedup:** suites `test_mobile_header_theme.cjs` (20), `test_unlock_auth_flow.cjs` (105), `test_deduplication_flow.cjs` (6) en verde.

## CAMBIOS A IMPLEMENTAR

### PARTE A — Backend (`server.py`)

1. **Eliminar la subida de apuntes:** Retirar `GET /api/admin/notes`, `POST /api/admin/upload-notes` y `POST /api/admin/delete-notes` y la constante `MAX_NOTES_UPLOAD_SIZE` (y el caso especial de `413` de 8 MB). Dejar comentario explicativo de la negativa de diseño (repo-first). Los tres caminos deben responder **HTTP 404**.
2. **Establecer `fuentes/` como base canónica:** `get_all_synced_topics()` debe derivar los tópicos exclusivamente de los archivos canónicos de `FILES_CONFIG` (contenido leído desde `fuentes/` o fallback Desktop `APUNTES/`). Sin referencias a `apuntes_registry.json` ni `source == "admin-upload"`.
3. **Fix `GET /api/fuentes`:** escribir `end_headers()`, el cuerpo JSON y retornar (evita `ResponseContentLengthMismatchError` y cuelgue de suites E2E).
4. No tocar el flujo de licencias (`/api/admin/codes`, `/api/auth/*`) ni el daemon de purga.

### PARTE B — Parser (`generate_clean_notes_data.py`)

1. `build_files_config()` → **copia fiel y determinista de `FILES_CONFIG`** (sin merge de registro externo; eliminar lógica de `apuntes_registry.json`).
2. `extract_sections_from_file()`: buscar el archivo **primero en `fuentes/`**, luego en Desktop `APUNTES/`. Retirar el manejador de `source == "admin-upload"` de `is_free`.
3. `deduplicate_sections()` simplificada: unicidad por tupla `(subject, chapterNumber, code)`; ante colisión prevalece mayor `charCount`.
4. Regeneración local debe arrojar exactamente **53 tópicos** (34 Civil `1.1..1.34`, 9 Procesal `2.1..2.9`, 10 Constitucional `3.1..3.10`) sin dependencia del Desktop, y actualizar `all_afg_topics.json` + `js/data.js` de forma byte-estable.

### PARTE C — Frontend (`index.html`, `js/app.js`, `js/case-generator-agent.js`)

1. `index.html`: eliminar la tarjeta `.admin-notes-upload-card` y todos sus IDs (listados arriba). Conservar `#admin-dashboard-screen`, el generador de licencias, la tabla `.admin-codes-table`/`#admin-codes-tbody` y el botón `#btn-admin-manage-notes`.
2. `js/app.js`: eliminar métodos `setupAdminNotesUpload`, `handleAdminNoteFileSelection`, `inferAdminNoteMetadata`, `submitAdminNoteUpload` y sus eventos; mantener el manejador de `#btn-admin-manage-notes`. `renderSourcesList()` debe listar los **6 nombres canónicos de `fuentes/`**.
3. `js/case-generator-agent.js`: re-clavear `FUENTES_CORPUS` a los nombres canónicos y remapear `linkedFuentes.file`: `derecho_de_bienes.md` → `LOS BIENES.md`; `civil.md` → `ACTO JURIDICO.md` / `LAS OBLIGACIONES.md` / `CLASE_9_11.md` (según contenido de la sección); `procesal.md` → `PROCESAL.md`; `constitucional.md` → `CONSTITUCIONAL.md`.

### PARTE D — Canónico `fuentes/` y CI (`.github/workflows/deploy-pages.yml`)

1. Copiar los 6 apuntes oficiales desde `Desktop/Fuentes_Grado/APUNTES` a `fuentes/`: `ACTO JURIDICO.md`, `LOS BIENES.md`, `LAS OBLIGACIONES.md`, `CLASE_9_11.md`, `PROCESAL.md`, `CONSTITUCIONAL.md`. Eliminar los stubs `civil.md`, `procesal.md`, `constitucional.md`, `derecho_de_bienes.md`. **NO** copiar `Desktop/Fuentes_Grado/CASOS/` ni el directorio `Desktop/Fuentes_Grado` completo.
   - ⚠️ En Windows (`core.ignorecase=true`) una colisión `procesal.md`/`PROCESAL.md` puede exigir reconstruir el índice: `git rm -r --cached fuentes` + `git add fuentes`.
2. Eliminar `apuntes_registry.json` (obsoleto).
3. `deploy-pages.yml`: añadir antes de `upload-pages-artifact` el paso `run: python3 generate_clean_notes_data.py` («Regenerar índice temático desde fuentes/»). Así `git push` de `fuentes/*.md` actualiza la página.

### PARTE E — SEGURIDAD (recordatorio obligatorio)

- Ningún endpoint público puede exponer contenido crudo de `fuentes/` fuera del procesado vía `/api/sync-topics` y `/api/fuentes`.
- El flujo de licencias, PIN admin y hashing de contraseñas no se modifica.
- Verificar con grep la **cero referencia residual** a `apuntes_registry|MAX_NOTES_UPLOAD|upload-notes|delete-notes|admin/notes|savedTo` en código (fuera de comentarios/bitácora histórica).

### PARTE F — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **Reescribir la Sección 9 de `test_e2e_case_flow.cjs`:** eliminar aserciones de upload/413/path-traversal admin; añadir: endpoints removidos → **404**; `/api/fuentes` expone las **6 fuentes canónicas** con contenido no vacío; los **53 tópicos** derivan exclusivamente de archivos canónicos (sin stubs ni `sourceFile` vacíos) con cobertura estable 34/9/10 e `indexCode` válidos.
2. Ejecutar las 4 suites y dejar **100 % PASS** (resultados v7.8: e2e 651, auth 105, mobile 20, dedup 6; **782 en total**).
3. Actualizar `CONTEXT.md`: Sección 2.5 y 3.1 (base canónica `fuentes/`, sin registro externo), 4.3 (límite uniforme 128 KB), tabla 6.2 (3 endpoints eliminados con 404), tabla 7.2 (panel admin sin subida; conservar `#btn-admin-manage-notes`), Sección 8 (filas `server.py`, `generate_clean_notes_data.py`, `fuentes/`, workflow CI, tests y PROMPTS), y **Bitácora Sección 9 → v7.8**.

## DEFINITION OF DONE

- [ ] La subida de apuntes del panel administrativo ya no existe en la UI ni en el servidor (endpoints → HTTP 404); verificado por grep sin referencias residuales.
- [ ] `fuentes/` contiene exactamente los 6 apuntes canónicos y los stubs fueron eliminados.
- [ ] `apuntes_registry.json` eliminado del repo; `MAX_NOTES_UPLOAD_SIZE` y el caso 413 especial retirados.
- [ ] `generate_clean_notes_data.py` regenera determinísticamente los 53 tópicos (34/9/10) desde `fuentes/`; `all_afg_topics.json` y `js/data.js` byte-estables.
- [ ] `GET /api/fuentes` responde correctamente (2026-09-22: 6 fuentes canónicas).
- [ ] `deploy-pages.yml` regenera el índice en CI antes de publicar → `git push` de `fuentes/*.md` actualiza la página.
- [ ] `#btn-admin-manage-notes` (importador local NotebookLM → `localStorage`) conservado y funcional.
- [ ] Las 4 suites pasan al 100 % (782 pruebas).
- [ ] `CONTEXT.md` actualizado en todas las secciones y Bitácora v7.8 registrada.
- [ ] `PROMPTS/README.md` indexa el 007 y marca el 001 como superseded.

## NOTAS PARA EL EJECUTOR

- No instales dependencias nuevas; el stack es vanilla (`http.server`, `sqlite3`, JS ES6).
- Respeta la nomenclatura jurídica chilena (cédula, capítulo, sección `N.N`, materias `civil|procesal|constitucional`).
- La bitácora histórica de `CONTEXT.md` (v6.8, v7.7) **debe conservarse tal cual**: refleja estados pasados; solo se añade el hito v7.8.