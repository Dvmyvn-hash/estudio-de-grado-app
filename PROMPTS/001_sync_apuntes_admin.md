# PROMPT 001 — Subida de Apuntes desde Panel de Administrador con Sincronización Inmediata al Índice de Apuntes

> **Versión:** v1.0 · **Fecha:** 2026-09-21 · **Autor:** puente (dpint)
> **Estado:** ✅ Implementado (v6.8) · **Depende de:** ninguno

> Copia y pega este bloque completo como prompt inicial en tu agente de Antigravity IDE. Está redactado para ejecutarse dentro del repositorio `estudio-de-grado-app` (GRADOMANIACOS) conforme a las reglas de `AGENTS.md`.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa la siguiente funcionalidad **respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio**.

## MISIÓN

Implementar la capacidad de que el **administrador suba archivos de apuntes (Markdown/texto) directamente desde el Panel de Administrador** (`#admin-modal`) y que dichos archivos **se sincronicen de inmediato a la Sección de Apuntes** (`view.topics` + visor de apuntes), **generando automáticamente la(s) sección(es) correspondiente(s) y su vínculo con el índice temático del sidebar** (agrupación por disciplina → capítulo → cédula), con su `sourceFile`, breadcrumb de ubicación, etiquetas de cobertura (`✅ Con Apunte`), y actualización propagada a **todos los clientes conectados en ≤ 3.5 s** a través del polling vivo existente.

## REGLAS OBLIGATORIAS DEL REPOSITORIO (ADEMÁS DEL CÓDIGO)

1. **`CONTEXT.md` es la única fuente canónica de verdad.** Todo cambio de código, UI, endpoints, esquemas o pruebas DEBE quedar documentado en `CONTEXT.md` al terminar la tarea (endpoints nuevos en la tabla 6.2, identificadores del DOM nuevos, cambio de responsabilidades en el mapa de archivos de la Sección 8 y nuevo hito en la Bitácora de Versiones de la Sección 9, propuesto como **v6.8**).
2. Ejecutar y dejar en verde las suites: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; **agregar** pruebas nuevas para esta funcionalidad.
3. No romper la compatibilidad de los identificadores, clases y contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `CaseGeneratorAgent`, `AuthService`, `licenses` en `auth-license.js`, etc.).
4. Toda entrada de usuario debe sanitizarse en el origen (`SecurityShield.escapeHtml` / `textContent`) y todo endpoint debe replicar los guardrails de seguridad del servidor (anti path traversal, `MAX_PAYLOAD_SIZE`, validaciones canónicas, PIN admin vía SHA-256).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

"Quiero que al subir archivos desde la interfaz de administrador se actualice inmediatamente en la sección de apuntes, creando la respectiva sección con su vínculo con el índice y todo lo demás." Es decir: lo que hoy se importa solo en el navegador (`localStorage`) debe pasar a ser canónico en el servidor y propagarse a todos los alumnos/dispositivos al instante, con su lugar correcto en el temario.

## DIAGNÓSTICO DEL ESTADO ACTUAL (levantado del código — no asumir)

- **Panel Admin:** `index.html` → `#admin-modal` con `#admin-login-screen` (PIN) y `#admin-dashboard-screen`. La sesión admin guarda el PIN en `sessionStorage` (`LicenseService.getAdminPin()`, clave `estudio_grado_admin_pin` en `js/auth-license.js`) y lo envía como header `X-Admin-PIN` (o body `pin`) a los endpoints `/api/admin/*`. Existe el botón `#btn-admin-manage-notes` que solo abre el modal de importación `#import-modal` (Gestor de Apuntes y NotebookLM), el cual hoy **persiste únicamente en localStorage** del navegador (`StorageService.saveTopic`) — no es una sincronización real con el servidor y no propaga a otros dispositivos.
- **Sincronización servidor/cliente (ya funcional):**
  - `server.py` vigila carpetas (`fuentes/`, `CASOS/`, `~/Desktop/Fuentes_Grado/APUNTES`, etc.) y expone `GET /api/sync-check` (`get_files_hash()` → firma `file_count_mtime`), `GET /api/sync-topics` (`get_all_synced_topics()` → extrae secciones en vivo y regenera `all_afg_topics.json`), `GET /api/sync-cases`.
  - `js/app.js` → `App.startLiveSync()` sondea `/api/sync-check` cada 3500 ms y, si cambia el hash, llama `App.syncWithServer()`, que hace fetch a `/api/sync-topics` y fusiona los topics en `StorageService` (preservando `mastered`), luego `renderSidebar()` y `renderTopicViewer()`.
  - El parser es `generate_clean_notes_data.py` → `extract_sections_from_file(cfg)` + `FILES_CONFIG` **estático** (lista fija de nombres de archivo como `ACTO JURIDICO.md`, `LOS BIENES.md`, `PROCESAL.md`, `CONSTITUCIONAL.md`...). Divide por encabezados `Sección N.N` y genera el esquema: `{id, subject, discipline, sectionName, chapterNumber, chapterTitle, category, code, title, cleanTitle, sourceFile, userSourceFiles, hasUserNotes, tags, isFree, content, charCount, connections}`.
- **Índice del sidebar:** `App.renderSidebar()` (en `js/app.js`) agrupa `data.topics` por `subject`/`discipline`, luego por `chapterTitle`/`chapterNumber` y ordena por `code` (1.1, 1.2…). La cédula lista `§ N.N` + `cleanTitle`, badge `✅/⚠️` de cobertura (solo admin) y estado de bloqueo por `LicenseService.isContentUnlocked(t,'topic')`. El clic abre `renderTopicViewer()` (breadcrumbs con `sourceFile`, contenido con `MarkdownParser`, filtro por materia y búsqueda).

## CAMBIOS A IMPLEMENTAR

### PARTE A — BACKEND (`server.py`)

1. **Nuevo endpoint `POST /api/admin/upload-notes` (protegido por PIN admin):**
   - Autenticación idéntica a `/api/admin/create-code`: header `X-Admin-PIN` o body `pin`, validado con `verify_admin_pin()` (SHA-256). Sin PIN válido → **HTTP 401**.
   - Contrato de body (JSON):
     ```json
     {
       "pin": "opcional-si-va-en-body",
       "filename": "MI NUEVO APUNTE.md",
       "subject": "civil | procesal | constitucional",
       "chapterNumber": 4,
       "chapterTitle": "Teoría de los Contratos",
       "category": "Contratos en Particular",
       "content": "texto completo UTF-8 del archivo",
       "replace": true
     }
     ```
   - **Validaciones estrictas de seguridad:**
     - `filename` = `Path(filename).name` (nunca rutas), regex canónica tipo `^[0-9A-Za-zÀ-ÿñÑ_\-\. ()]{1,120}\.(md|markdown|txt)$`, y extensión dentro de `SUPPORTED_EXTENSIONS`. Filename inválido → **HTTP 400**.
     - Blindaje anti path traversal: la ruta destino resuelta debe ser relativa al directorio autorizado (`target.resolve().is_relative_to(APUNTES_DIR.resolve())`); escritura siempre con `Path(...).name`.
     - Tamaño máximo **dedicado** `MAX_NOTES_UPLOAD_SIZE = 8388608` (8 MB) para este endpoint (revisar el chequeo de `content_length` existente; no debe aplicar el `MAX_PAYLOAD_SIZE` global de 128 KB a la subida de apuntes). Superado → **HTTP 413**.
     - Rechazar contenido con bytes nulos (`\x00`) o vacío → **HTTP 400**.
   - **Acción sobre éxito (HTTP 201):**
     - Escribir el archivo en `APUNTES_DIR` (carpeta canónica vigilada) **y espejarlo** en `FUENTES_DIR` (persistencia en el repo, queda disponible `/api/fuentes`).
     - Registrar metadatos en un nuevo archivo canónico `apuntes_registry.json` (raíz del repo, git-trackeable), de modo que el parser pueda construir la configuración de forma dinámica. Formato sugerido:
       ```json
       {
         "files": [
           { "file": "MI NUEVO APUNTE.md", "subject": "civil", "discipline": "I. Derecho Civil",
             "defaultCategory": "…", "defaultChapterNum": 4, "chapterTitle": "…", "source": "admin-upload",
             "uploadedAt": 1774… }
         ]
       }
       ```
     - Regenerar `all_afg_topics.json` llamando a la nueva lógica del parser (Parte B).
     - Respuesta: `{ "ok": true, "filename": "...", "savedTo": ["APUNTES", "fuentes"], "sectionsCreated": N, "topics": [ {id, code, title, subject, chapterNumber} ... ] }`.
   - **Idempotencia:** si `replace=true` o ya existe el archivo, reescribir y **no duplicar** entradas en `apuntes_registry.json` (clave única por `file`).

2. (Opcional, recomendado) **`GET /api/admin/notes`** para listar los apuntes registrados (nombre, sujeto, capítulo, fecha, nº secciones) y **`POST /api/admin/delete-notes`** para eliminar un apunte subido (borra archivo de `APUNTES_DIR` y `FUENTES_DIR`, quita el registro y regenera el índice). Ambos con PIN admin. Si decides implementarlos, documentarlos igual en `CONTEXT.md`.

### PARTE B — PARSER DINÁMICO (`generate_clean_notes_data.py`)

1. Refactorizar para que la configuración ya no sea estática:
   - Nueva función `build_files_config()` que retorna `FILES_CONFIG` (los fijos actuales, sin duplicados) **fusionado** con los registros de `apuntes_registry.json`. Si el archivo registrado no existe en `APUNTES_DIR`, no romper; loguear y continuar.
   - La fuente (`source: "admin-upload"` vs "bundled") no debe alterar el esquema de salida.
2. Robustecer `extract_sections_from_file(cfg)`:
   - Conservar el patrón actual `^#{1,4}\s*\*{0,2}|\*{2})\s*Secci[oó]n\s*(\d+\.\d+)\s*[:–\-—]...`.
   - **Caso sin encabezados `Sección N.N`:** generar **una sola sección** con el archivo completo: `code = "1.1"` o un código seguro derivado del nombre (documentar la decisión en CONTEXT.md), `cleanTitle` desde el primer heading `#` del documento o desde el nombre del archivo.
   - `id` único y estable con patrón `{subject}-{slug-del-archivo}-{code-sin-puntos}` (reutilizar la lógica existente limpiando el nombre de archivo; asegurar que no colisione con los ids estáticos).
   - `tags`: reutilizar la detección actual por palabras clave; si no hay match usar `["Examen de Grado", "Derecho"]`.
   - `isFree` coherente: por defecto `false` para apuntes subidos por admin (salvo que el código sea `1.1` o `2.1` del capítulo 1, manteniendo la regla existente).
   - `userSourceFiles: [filename]`, `hasUserNotes: true`, `charCount`, `connections: []` (o las conexiones dogmáticas disponibles por id).
3. `main()` y la regeneración de `js/data.js` deben seguir funcionando con el nuevo `build_files_config()`. No perder el contenido de `cases` y `graph` de `data.js`.

### PARTE C — FRONTEND (`index.html` + `js/app.js`)

1. **UI en `index.html` (dentro de `#admin-dashboard-screen`, entre el banner superior y la sección de licencias):**
   - Nueva tarjeta: **"📤 Subir Apuntes y Sincronizar al Instante"** con:
     - Zona de arrastrar y soltar: `#drop-zone-admin-notes` (estilo consistente con `#drop-zone-notebooklm`) + `<input type="file">` oculto `#input-admin-notes-file` (accept `.md,.markdown,.txt`).
     - Selects/inputs de metadatos: `#admin-notes-subject` (civil/procesal/constitucional), `#admin-notes-category` (módulo), `#admin-notes-chapter` (número de capítulo), `#admin-notes-chapter-title` (título de capítulo), y botón `#btn-upload-admin-notes` ("Subir y Sincronizar") + contenedor de resultado/progreso `#admin-notes-result` (aria-live).
     - Considerar un enlace "Abrir Gestor Avanzado" que dispare el mismo flujo que `#btn-admin-manage-notes`.
     - Añadir los IDs nuevos a la tabla de componentes de `CONTEXT.md` (Sección 6 o 7), documentando el rol de cada uno.

2. **Lógica en `js/app.js`:**
   - Nuevo método `App.setupAdminNotesUpload()` (o integrarlo en `setupAdminModal`):
     - En el `drop`/`change` del file input: leer el archivo (`FileReader.readAsText`), **prellenar** `#admin-notes-*` (sujeto vacío o inferido del contenido; categoría/capítulo por defecto del sujeto) y mostrar el nombre del archivo en la zona.
     - En `#btn-upload-admin-notes`: validar `LicenseService.isAdminMode()` (si no → toast de acceso restringido), sanitizar metadatos, construir `{ filename, subject, chapterNumber, chapterTitle, category, content }`, y hacer `POST /api/admin/upload-notes` con header `"X-Admin-PIN": LicenseService.getAdminPin()`.
     - Estados UX: botón deshabilitado + spinner mientras sube; toast `"Apuntes sincronizados: N secciones creadas y vinculadas al índice"` en éxito; en error mostrar mensaje sanitizado en `#admin-notes-result` (nunca `innerHTML` con datos sin escapar).
     - **Tras éxito: `await this.syncWithServer()` + `renderSidebar()` + `renderTopicViewer()`** (si la vista activa es `topics`) para actualización **inmediata** del índice y del visor; cerrar o mantener el modal con el resultado visible.
   - Mantener la retrocompatibilidad: el flujo antiguo de `#import-modal` sigue existiendo para usuarios con `canManageNotes()` sin modal admin.

3. **Propagación a otros clientes:** no requiere cambio adicional: al escribir en una carpeta vigilada, `get_files_hash()` cambia y todos los clientes con `startLiveSync` hacen `syncWithServer()` en ≤ 3.5 s. Verificarlo en el render: tras el merge, las secciones nuevas aparecen agrupadas por disciplina → capítulo → `§ N.N` con su `cleanTitle`, badge `✅`, y al hacer clic, el breadcrumb muestra `sourceFile`.

### PARTE D — SEGURIDAD (recordatorio obligatorio al implementar)

- El PIN admin: solo comparación SHA-256 (`verify_admin_pin`), nunca loguear el PIN, nunca incluirlo en respuestas.
- Escapar cualquier dato del archivo subido antes de insertarlo en el DOM (`SecurityShield.escapeHtml` o `textContent`) en el visor, breadcrumbs, listas y mensajes.
- No exponer los archivos subidos crudos en endpoints públicos; el contenido solo se sirve procesado/parseado vía `/api/sync-topics` y `/api/fuentes` (mismo criterio Zero Exposure de pautas).
- Respeta el bloqueo de archivos sensibles de `SuperBlocker` y `BLOCKED_EXTENSIONS` existentes.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **Ampliar `test_e2e_case_flow.cjs`** (sección nueva, p. ej. sección 22) con casos E2E del endpoint:
   - `POST /api/admin/upload-notes` sin PIN → 401.
   - Filename con path traversal (`../../etc/passwd.md`) → 400.
   - Filename con extensión no permitida (`.exe`) → 400.
   - Payload que excede el límite (cuando aplique) → 413.
   - Upload válido de un `.md` con encabezados `Sección 1.1/1.2` → 201, `sectionsCreated ≥ 2`, y verificar que `GET /api/sync-topics` incluye las secciones nuevas con su `id`, `subject`, `chapterNumber` y `sourceFile`.
   - Upload válido de un `.md` **sin** encabezados `Sección` → 201 con **1 sección** generada.
   - Idempotencia: re-subir el mismo archivo no duplica secciones en el índice.
   - (Si se implementa) `POST /api/admin/delete-notes` elimina el registro y las secciones desaparecen de `/api/sync-topics`.
2. **Ampliar `test_unlock_auth_flow.cjs`** con pruebas del flujo admin→upload si toca la capa de licencias/permisos (p. ej. el rol `manager`/`canManageNotes` puede abrir el gestor; demo no puede).
3. Ejecutar ambas suites y dejar **100 % PASS**. Si hay tests existentes que asumen el `MAX_PAYLOAD_SIZE` global de 128 KB, asegurar que el nuevo límite dedicado no rompa sus aserciones.
4. **Actualizar `CONTEXT.md` SIEMPRE:** Sección 3.1 (flujo de subida→sincronización), tabla 6.2 (endpoint(s) nuevos con códigos HTTP y contrato), Sección 5.2 si cambian convenciones, Sección 8 (mapa de archivos: añadir `apuntes_registry.json` y la responsabilidad ampliada de `generate_clean_notes_data.py`), y Bitácora v6.8 con fecha, alcance, archivos modificados y nº de pruebas aprobadas.

## DEFINITION OF DONE

- [ ] El admin autenticado por PIN sube un `.md`/`.txt` desde `#admin-modal` y el archivo queda persistido en el servidor (APUNTES + fuentes) y registrado en `apuntes_registry.json`.
- [ ] `POST /api/admin/upload-notes` responde 201 con las secciones creadas y el cliente las renderiza **al instante** en la vista de apuntes: la(s) sección(es) aparece(n) en el **índice del sidebar** agrupada(s) en su disciplina/capítulo con `§ N.N`, título, `✅ Con Apunte` (modo admin) y al hacer clic se abre el visor con breadcrumb `sourceFile`.
- [ ] Un segundo navegador/dispositivo conectado observa el cambio automáticamente en ≤ 3.5 s sin recargar (validado en la prueba E2E de sync-check).
- [ ] Los guardrails de seguridad (PIN admin, path traversal, extensiones, tamaño, XSS) están implementados y cubiertos por tests.
- [ ] `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs` pasan al 100 %.
- [ ] `CONTEXT.md` refleja exactamente el estado final (endpoints, DOM IDs, archivos, bitácora v6.8).
- [ ] No se rompe ningún flujo existente (importación localStorage de NotebookLM, casos IA, candado/licencias, sincronización de casos).

## NOTAS PARA EL EJECUTOR

- No instales dependencias nuevas de Python ni de Node si no es estrictamente necesario (el stack es vanilla: `http.server`, `sqlite3`, JS ES6 sin bundlers).
- El `FileReader` sube el contenido como texto UTF-8 dentro del JSON; no se requiere multipart.
- Respeta el estilo del repo: código documentado, mensajes de toast en español, nomenclatura jurídica chilena (cédula, capítulo, sección, materia `civil|procesal|constitucional`).