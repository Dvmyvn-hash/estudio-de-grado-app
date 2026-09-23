# PROMPT 013 — Cuenta de Administrador de Presentación Docente (Clave `profesoresafg202602`)

> **Versión:** v1.0 · **Fecha:** 2026-09-23 · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** ninguno (independiente; toca el subsistema admin v7.4+)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Crear una **segunda clave de administración de presentación**: `profesoresafg202602`. Al ingresarla, el usuario obtiene la **experiencia visual completa de administrador** (escudo de admin activo, panel de control, estadísticas de cobertura de cédulas, acceso total desbloqueado a las 103 cédulas, casos, preguntas de verificación y herramientas de la plataforma) **pero en modo de solo visualización**: NO puede generar ni revocar códigos de acceso, NO puede abrir el Gestor de Apuntes / NotebookLM, NO puede subir, importar ni descargar archivos. Propósito: que el postulante muestre el desarrollo a sus profesores, quienes podrán **visualizar y probar las herramientas implementadas** (realizar casos, responder preguntas, explorar el grafo, ver cédulas) sin riesgo de mutar la operación (códigos, contenido, archivos).

La clave de administración plena `almabaltoamial2020` (rol `admin`) queda **100% intacta** y con sus permisos actuales.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 6.2 tabla de endpoints, Sección 6.3 variables de entorno, Sección 7.3 contratos de seguridad, Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión **v7.16**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; ampliar las suites con pruebas de la nueva funcionalidad (Sección 16 de `test_unlock_auth_flow.cjs`).
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin **solo como hash SHA-256** (nunca texto plano en el repo), comparación en tiempo constante, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `QuestionDeveloper`, `licenses` en `auth-license.js`). El 401 ante PIN incorrecto/ausente en endpoints admin NO cambia.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

> "quiero que exista una nueva clave de administrador que será (profesoresafg202602) la cual acceda como administrador, pero no genere claves de acceso ni tampoco pueda cargar o descargar archivos ni nada de eso, solo que sea una cuenta visual de administrador con el acceso que tiene la de admin. Para poder mostrar el desarrollo a mis profesores, puedan realizar casos y cosas así pero solo visualizándola desde esa cuenta con acceso para visualizar y probar las herramientas implementadas, no para generar códigos, subir archivos o importarlos."

Interpretación de diseño (aterrizada al código):
- **Sí (cuenta visual de admin):** mismo desbloqueo total de contenido que hoy da `isAdminMode()` (isDemoMode=false), escudo/píldora de sesión admin activa, panel de administrador visible con estadísticas de cobertura de cédulas y filtros de cobertura, más todos los toolboxes: ver cédulas/apuntes, resolver y generar casos (postulante y IA), preguntas de verificación 4×5, grafo interdisciplinario, búsqueda.
- **No (restringido a rol pleno `admin`):** generar/revocar/**listar** códigos de acceso; Gestor de Apuntes y NotebookLM (`#btn-admin-manage-notes`, modal `#import-modal` completo: pegar/subir/arrastrar archivos, pestañas fuentes y casos, exportar JSON); botón de cabecera `#btn-open-import`; opción de índice `#sidebar-footer-admin` («Nuevo Tema / Cédula (Admin)»); y —por ser literalmente "cargar/descargar archivos"— los botones de respaldo `.sidebar-progress-actions` (`#btn-export-progress` / `#btn-import-progress`).

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

### Servidor (`server.py`)
- **Línea 722-736:** constante `ADMIN_PIN_HASH = "75cfc5343b1e254fc0e4f909e980e14cda4d24dc223718749855ba3ec28457d8"` (SHA-256 de `almabaltoamial2020`) y `verify_admin_pin(entered_pin) -> bool` (comparación `hmac.compare_digest`; override por env `ADMIN_PIN`).
- **Endpoints admin (todos verifican `verify_admin_pin` → 401 si falla):**
  - `GET /api/admin/codes` (línea 1121; acepta header `X-Admin-PIN` o query `?pin=`; lista códigos con `times_used`, `linked_emails`, `associated_email`, etc.).
  - `POST /api/admin/create-code` (línea 1188; body `{ pin|X-Admin-PIN, code, label, scope, days, max_uses, canManageNotes, email/assigned_email }`; 400 formato, 409 duplicado).
  - `POST /api/admin/revoke-code` (línea 1240; body `{ pin|X-Admin-PIN, code }`; 404 si no existe).
  - Los endpoints de subida/gestión admin de apuntes (`/api/admin/upload-notes`, `/api/admin/notes`, `/api/admin/delete-notes`) fueron **eliminados en v7.8** (retornan 404; aserción 9.1 de `test_e2e_case_flow.cjs`).
- Helper `send_json_response(payload, status_code=200, headers=None)` disponible.

### Cliente (`js/auth-license.js`)
- **Línea 8:** `ADMIN_PIN_HASH` (misma constante cliente).
- **Línea 16 `verifyAdminPin(enteredPin)`:** SHA-256 con `crypto.subtle`; si coincide guarda el PIN en `sessionStorage[STORAGE_ADMIN_PIN_KEY]`; retorna `true`/`false`.
- **Líneas 12-13:** `STORAGE_ADMIN_KEY = "estudio_grado_admin_session"` y `STORAGE_ADMIN_PIN_KEY = "estudio_grado_admin_pin"` (ambos en sessionStorage).
- **Líneas 41-52:** `isAdminMode()` / `setAdminMode(val)` (marca `STORAGE_ADMIN_KEY = "true"`; al falsear limpia también el PIN).
- **Líneas 55-62 `canManageNotes()`:** retorna `true` si `isAdminMode()` o la licencia tiene `role === 'admin' | 'manager' | canManageNotes`. **Este método gobierna la visibilidad del botón de importar y de la opción admin del índice.**
- **Líneas 188-265 `generateCode(options)`:** genera el código (local) y además hace `POST /api/admin/create-code` con header `X-Admin-PIN: getAdminPin()`.
- **Líneas 268-298 `fetchAdminCodes()`:** `GET /api/admin/codes` con header `X-Admin-PIN`; si el servidor responde ok usa los códigos del servidor (fuente de verdad), si no cae a `getAllIssuedCodes()` (localStorage).
- **Línea 356 `revokeCode(code)`:** `POST /api/admin/revoke-code` con header `X-Admin-PIN`.
- Existe una licencia semilla `GRADO-DOCENTE-2026` con `role: "manager"` (líneas 309-320) — es un **rol de licencia de usuario** (permite gestionar notas a un alumno/profesor). **No confundir ni tocar**: la nueva cuenta docente de admin es lo *opuesto* (visual admin SIN gestión). Dejarla intacta.

### Interfaz (`index.html` + `js/app.js`)
- **Modal admin `#admin-modal`** (líneas 537-666): pantalla `#admin-login-screen` con `#admin-pin-input`, `#btn-admin-login`, `#admin-login-error`, y pantalla `#admin-dashboard-screen` con:
  - Cinta de sesión (líneas 569-584) con `#btn-admin-manage-notes` y `#btn-admin-logout`.
  - Formulario de generación (líneas 586-638): `#admin-student-name`, `#admin-student-email`, `#admin-custom-code`, `#admin-scope-select`, `#admin-days-select`, `#btn-generate-code`, checkbox `#admin-grant-notes-perm`.
  - Tabla `#admin-codes-tbody` con botones `data-revoke-code` por fila (líneas 640-663).
- **Cabecera:** `#admin-mode-pill` (píldora admin activa) y `#btn-open-admin`; botón `#btn-open-import` (visible solo si `canManageNotes()`).
- **Sidebar:** `#sidebar-footer-admin` con `#btn-new-topic` (visible solo si `canManageNotes()`); zona `.sidebar-progress-actions` con `#btn-export-progress` / `#btn-import-progress` / `#input-import-progress` (respaldo usuario).
- **`js/app.js`:**
  - Línea 2227 `btnAdminLogin` handler: `verifyAdminPin(pin)` → `setAdminMode(true)` → `renderAdminIndicator()` → `renderSidebar()` → `renderTopicViewer()` → muestra dashboard → `renderAdminCodesTable()` → toast «👑 Modo Administrador activado…».
  - Líneas 2202-2207 `adminPill` click y 2209-2221 `btnOpenAdmin` click: muestran dashboard + `renderAdminCodesTable()` si `isAdminMode()`.
  - Línea 2290 `renderAdminIndicator()`: alterna `#admin-mode-pill` vs `#btn-open-admin` según `isAdminMode()`; muestra `#btn-open-import` y `#sidebar-footer-admin` según `canManageNotes()`.
  - Línea 2258 `btnAdminManageNotes` → `openImportModal("paste")`; **línea 2109 `openImportModal()` ya rechaza con toast si `!canManageNotes()`** (guard existente).
  - Línea 2264 `btnGenerate` → `LicenseService.generateCode(...)`; línea 2339 `renderAdminCodesTable()` hace `fetchAdminCodes()` y pinta el tbody; línea 2404 delega revocación a `LicenseService.revokeCode`.
  - Estadísticas/filtros de cobertura se activan con `isAdminMode()` (líneas 658, 889: `const isAdmin = LicenseService.isAdminMode()`), por lo que la cuenta docente las hereda automáticamente.

### Suites de prueba
- `test_unlock_auth_flow.cjs` **Sección 16** ya cubre el panel admin (16.1 401 sin PIN/incorrecto; 16.2-16.4 creación; 16.5 convalidación; 16.8 revocación; Sección 17.6 listado con usages). Es el hogar natural de la nueva cobertura de roles.
- `test_e2e_case_flow.cjs` aserción 9.1 verifica que los endpoints de subida admin retornen 404 (no tocar).

## CAMBIOS A IMPLEMENTAR

### PARTE A — Seguridad y autorización por rol (`server.py`)

1. **Hash del rol docente (precalculado, verificado por el puente):**
   `profesoresafg202602` → SHA-256 = `28f5e0c2764fecec65663fe4d72aff9330340a18e02232362c92a07736b808ba`

2. Reemplazar la verificación booleana por un **mapa de roles**:
   ```python
   ADMIN_PIN_HASHES = {
       "admin":   "75cfc5343b1e254fc0e4f909e980e14cda4d24dc223718749855ba3ec28457d8",
       "docente": "28f5e0c2764fecec65663fe4d72aff9330340a18e02232362c92a07736b808ba",
   }

   def verify_admin_pin(entered_pin):     # -> str | None  ("admin" | "docente")
       # respeta override ADMIN_PIN -> "admin"; nuevo override ADMIN_PIN_DOCENTE -> "docente";
       # comparación en tiempo constante con hmac.compare_digest para cada candidato
   ```
   Mantener `verify_admin_pin` devolviendo rol (o `None`) y añadir helper:
   ```python
   def admin_manage_allowed(role):  # -> bool  (solo "admin"; "docente" -> False)
   ```
3. **Semántica HTTP (inmutable):**
   - PIN ausente/incorrecto → **401** (igual que hoy; no cambiar).
   - PIN válido de rol `docente` en `GET /api/admin/codes`, `POST /api/admin/create-code` o `POST /api/admin/revoke-code` → **403** con `{"ok": False, "error": "Modo Presentación Docente: sin permisos de gestión (visualización únicamente)."}`. El rol docente **jamás** puede listar códigos (tampoco lectura).
   - PIN válido de rol `admin` → comportamiento actual intacto (200/201/400/409/404 según el caso).
4. No tocar el resto de endpoints (`/api/auth/*`, `/api/user/*`, `/api/sync-*`, `/api/fuentes`, `/api/casos-files`, `/api/ai/*`): la cuenta docente los consume como usuario desbloqueado.

### PARTE B — Roles en el cliente (`js/auth-license.js`)

1. Nueva constante pública:
   ```js
   DOCENTE_PIN_HASH: "28f5e0c2764fecec65663fe4d72aff9330340a18e02232362c92a07736b808ba",
   STORAGE_ADMIN_ROLE_KEY: "estudio_grado_admin_role",
   ```
2. **`verifyAdminPin(enteredPin)` pasa a retornar el rol** (`"admin"` | `"docente"` | `null`): compara contra `ADMIN_PIN_HASH` y contra `DOCENTE_PIN_HASH` (siempre `crypto.subtle` SHA-256, mismo patrón actual). Al validar guarda el PIN (clave existente) **y** `sessionStorage[STORAGE_ADMIN_ROLE_KEY] = rol`.
   > **Compatibilidad:** toda llamada existente usa el valor como booleano; `"admin"`/`"docente"` son truthy, así que el código actual que hace `if (isValid)` sigue funcionando. Revisar que no exista comparación estricta `=== true` (verificar con grep al implementar).
3. Accesores nuevos (conservar/reforzar los existentes):
   - `isAdminMode()` → **true para ambos roles** (contrato actual intacto: desbloqueo total, píldora, cobertura, dashboard). No cambiar su semántica.
   - `getAdminRole()` → `sessionStorage[STORAGE_ADMIN_ROLE_KEY] || null`.
   - `isFullAdmin()` → `getAdminRole() === "admin"` (permisos de gestión).
   - `isDocente()` → `getAdminRole() === "docente"` (presentación).
   - `setAdminMode(val, role)` → al activar guarda `STORAGE_ADMIN_KEY="true"` + rol; al desactivar limpia **ambos** (rol incluido).
   - `canManageNotes()` → `if (this.isFullAdmin()) return true;` (el resto de la lógica de licencia intacta). Con esto, `#btn-open-import`, `#sidebar-footer-admin` y `openImportModal()` quedan bloqueadas automáticamente para docente (sin tocar más código de UI en esos puntos).
4. **Defensa en profundidad en las llamadas de red** (nunca emitir fetch en modo docente):
   - `generateCode()` → si `isDocente()` retornar `{ success: false, error: "Modo Presentación Docente: sin permisos de gestión." }` sin fetch.
   - `fetchAdminCodes()` → si `isDocente()` retornar `[]` sin fetch.
   - `revokeCode(code)` → si `isDocente()` retornar `{ success: false, error: "..." }` sin fetch.

### PARTE C — UI del panel en modo presentación (`index.html` + `js/app.js`)

1. **`index.html`:**
   - Envolver el formulario de generación (líneas 586-638) en `<div id="admin-license-form">` (sin cambios visuales para admin).
   - Envolver el bloque «Códigos Emitidos Activos» (líneas 640-663) en `<div id="admin-codes-panel">`.
   - Añadir, dentro de la cinta de sesión (líneas 569-584), un banner oculto por defecto:
     `#docente-mode-banner` — «🎓 Modo Presentación Docente — cuenta de visualización para demostración. No genera códigos ni gestiona/importa/exporta archivos.» con estilo acorde a la paleta (borde suave, texto muted).
2. **`js/app.js`:** un método nuevo `applyDocenteRestrictions()` (o integrar en `renderAdminCodesTable`/dashboard) que, cuando `LicenseService.isDocente()`:
   - oculta `#admin-license-form` y `#admin-codes-panel`, muestra `#docente-mode-banner`;
   - **no invoca `fetchAdminCodes()`** (evita la llamada de red);
   - oculta `#btn-admin-manage-notes` (aunque `openImportModal` ya quedó bloqueado por `canManageNotes()`);
   - en `renderAdminIndicator()`: además de lo automático por `canManageNotes()`, ocultar `.sidebar-progress-actions` (`#btn-export-progress`/`#btn-import-progress`) en modo docente (decisión de diseño: "no cargar/descargar archivos" — ver NOTAS).
   Aplicarlo en los 3 puntos de entrada al dashboard: `btnAdminLogin` handler (línea 2227), `adminPill` click (línea 2202) y `btnOpenAdmin` click (línea 2209).
3. **Mensajes diferenciados:** toast en login según rol:
   - `admin` → el actual «👑 Modo Administrador activado: Tienes acceso total y visibilidad de desarrollo de apuntes.»
   - `docente` → «🎓 Modo Presentación Docente activado: puedes visualizar y probar las herramientas; la gestión de códigos y archivos está deshabilitada.» (info/warning).
4. **Guards de clics (cinturón + tirantes):** en `btnGenerate` y en el handler de `data-revoke-code`, `if (LicenseService.isDocente()) { toast("Acción bloqueada en Modo Presentación Docente.", "warning"); return; }` (aunque el form y la tabla estén ocultos).
   `openImportModal()` ya protege por `canManageNotes()` — verificar que ese guard baste (docente → false → rechaza con el toast existente; opcional: mensaje específico para docente).

### PARTE D — SEGURIDAD (recordatorio obligatorio)

- **Nunca** incluir `profesoresafg202602` en texto plano en el repo: solo su hash SHA-256 (constantes cliente y servidor), igual que el patrón v7.4 del PIN admin.
- Comparación en tiempo constante (`hmac.compare_digest`) para ambos hashes; decisión de fallback por env separada: `ADMIN_PIN` (rol admin) y `ADMIN_PIN_DOCENTE` (rol docente) — nunca tratar una como la otra.
- El servidor es la última línea de defensa: aunque alguien manipule el JS del cliente, el rol `docente` recibe **403** en los 3 endpoints de gestión. Los guards del cliente solo mejoran UX.
- No añadir dependencias; no exponer los hashes en logs ni en payloads de error.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **`test_unlock_auth_flow.cjs` — nueva Subsección 16.9 «Cuenta de Presentación Docente»** (≈12-16 aserciones, patrón de las aserciones 16.x con `originalFetch` y `check`):
   - Servidor: `GET /api/admin/codes` con `X-Admin-PIN: profesoresafg202602` → **403** (y con `?pin=` → 403); `POST /api/admin/create-code` docente → **403** (verificar que NO crea el código: `GET codes?pin=admin` no lo contiene); `POST /api/admin/revoke-code` docente → **403**.
   - Servidor (regresión): PIN admin ausente/incorrecto sigue → **401**; PIN admin en `codes`/`create-code`/`revoke-code` sigue 200/201/204 como hoy (las 16.x existentes ya lo cubren; re-ejecutar sin tocar).
   - Cliente (cargando `js/auth-license.js` en el harness, como la Subsección 24.4 carga `js/question-developer.js`): `verifyAdminPin("profesoresafg202602")` → `"docente"`; `verifyAdminPin("almabaltoamial2020")` → `"admin"`; PIN desconocido → `null`; tras login docente `isAdminMode()===true`, `isDocente()===true`, `isFullAdmin()===false`, `isDemoMode()===false` (contenido desbloqueado), `canManageNotes()===false`; `getAdminRole()` persiste en sessionStorage; `setAdminMode(false)` limpia rol; `generateCode`/`fetchAdminCodes`/`revokeCode` en modo docente retornan bloqueo **sin** invocar `fetch` (mock del global fetch contando llamadas).
   - (Si el harness lo permite) mapeo DOM: en modo docente `#admin-license-form` y `#admin-codes-panel` quedan ocultos y `#docente-mode-banner` visible.
2. **Suites completas al 100 % PASS:** las 4 (`test_unlock_auth_flow.cjs`, `test_e2e_case_flow.cjs`, `test_deduplication_flow.cjs`, `test_mobile_header_theme.cjs`).
3. **`CONTEXT.md` a actualizar (versión objetivo v7.16):**
   - Sección 6.2 (tabla de endpoints admin): nueva columna/nota de roles — `admin` 200/201, `docente` 403 (mensaje), sin PIN 401; nuevo hash `ADMIN_PIN_HASHES`.
   - Sección 6.3 (variables de entorno): añadir `ADMIN_PIN_DOCENTE`.
   - Sección 7.3 (contratos de seguridad): rol `docente` = visualización, `isFullAdmin()`/`isDocente()`, `canManageNotes()` solo rol pleno.
   - Sección 8 (mapa de archivos): filas `server.py`, `js/auth-license.js`, `js/app.js`, `index.html`, `test_unlock_auth_flow.cjs` actualizadas con el rol docente; fila `PROMPTS/` → añadir «013 cuenta admin de presentación docente ✅ v7.16».
   - Bitácora Sección 9 → nueva entrada **v7.16** con misión, diseño, 403 semántico y conteos de pruebas actualizados.
   - `PROMPTS/README.md` fila 013 → `✅ Implementado (v7.16)`.
4. Comprobar que la clave docente **no** deja rastro de datos: no crea licencias, no escribe en `access_codes` ni `licenses`, no muta `fuentes/`.

## DEFINITION OF DONE

- [ ] `server.py`: `verify_admin_pin` devuelve rol (`admin`/`docente`/`None`) con hashes `75cf…d8` y `28f5…ba`; los 3 endpoints admin devuelven **403** a rol docente y comportamiento anterior a rol admin.
- [ ] `js/auth-license.js`: `verifyAdminPin` devuelve rol; `STORAGE_ADMIN_ROLE_KEY`; `isFullAdmin()`/`isDocente()`/`getAdminRole()`; `canManageNotes()` false en docente; `setAdminMode` limpia rol; `generateCode`/`fetchAdminCodes`/`revokeCode` bloqueados sin fetch en docente.
- [ ] `index.html` + `js/app.js`: `#admin-license-form`, `#admin-codes-panel`, `#docente-mode-banner`; `applyDocenteRestrictions()` aplicado en login, píldora y botón de apertura; toasts diferenciados; guards en `btnGenerate` y revocación; `.sidebar-progress-actions` ocultos en docente.
- [ ] `test_unlock_auth_flow.cjs`: Subsección 16.9 con 403 docente (3 endpoints), no-creación verificada, regresión 401/200/201 admin, contrato cliente (roles, no-fetch) → todas las aserciones nuevas pasan.
- [ ] Las 4 suites al 100 % PASS.
- [ ] `CONTEXT.md` v7.16 actualizado (6.2, 6.3, 7.3, 8, bitácora 9) y `PROMPTS/README.md` fila 013 ✅ Implementado (v7.16).
- [ ] Commits + push a `main` (código y documentación).

## NOTAS PARA EL EJECUTOR

- **Hashes ya verificados por el puente** (SHA-256): `almabaltoamial2020` → `75cfc5343b1e254fc0e4f909e980e14cda4d24dc223718749855ba3ec28457d8` (idéntico a la constante actual, sanity-check ✓) y `profesoresafg202602` → `28f5e0c2764fecec65663fe4d72aff9330340a18e02232362c92a07736b808ba`. Incrustar tal cual.
- **Decisión abierta (cerrada por defecto):** ocultar `.sidebar-progress-actions` (exportar/importar avance) en modo docente porque el postulante pidió explícitamente "no cargar ni descargar archivos". Si en la demo se desea permitir que el profesor respalde su propio avance, basta con cambiar esa línea del `renderAdminIndicator` — dejar un comentario `// MODE-DOCENTE` para localizarlo fácil.
- La cuenta docente comparte `isAdminMode()===true`, así que **todo** lo que hoy depende de `isAdminMode()` (desbloqueo, píldora, cobertura, filtros) aplica sin tocar: verificar que no haya llamadas de gestión ocultas bajo `isAdminMode()` (grep `isAdminMode()` en `js/` al implementar; las únicas restricciones nuevas deben vivir en `isFullAdmin()`/`isDocente()`).
- No modificar la licencia semilla `GRADO-DOCENTE-2026` (rol `manager` de usuario) ni el rol `manager` de las licencias: son ortogonales a esta cuenta de presentación.
- El PIN docente en `sessionStorage[STORAGE_ADMIN_PIN_KEY]` quedaría guardado; es inofensivo (el servidor lo rechaza con 403) pero si se prefiere, guardar el PIN docente bajo la misma clave y que los guards cliente impidan enviarlo (ya están en PARTE B). Mantener el patrón actual (una sola clave de PIN) salvo que el implementador encuentre una razón concreta para separarlas.