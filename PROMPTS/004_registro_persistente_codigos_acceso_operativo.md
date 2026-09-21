# PROMPT 004 — Registro Persistente y Operativo de Códigos de Acceso Usados (Cuentas Operativas desde Cualquier Plataforma)

> **Versión:** v1.0 · **Fecha:** 2026-09-21 · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** ninguno

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Primero **revisa y diagnostica** el problema real de persistencia de códigos de acceso, y luego **implementa de forma completa** la solución respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Resolver el problema reportado por el operador: *"ayer creé una cuenta, ingresé el código de acceso y hoy me aparece en Versión Demo"*. Dejar **operativo y persistente el registro de códigos de acceso usados** de modo que:

1. Todo código convalidado **quede registrado** (código + email + timestamp) en un registro central duradero que sobreviva reinicios, purgas y cambios de dispositivo.
2. Cuando el postulante **ingrese desde cualquier plataforma/dispositivo** (mismo correo y contraseña), su cuenta se restablezca automáticamente como **Pase Activo (`isDemo: false`)**, sin tener que reconvalidar ni perder la licencia.
3. La purga automática de 48h **nunca** elimine ni degrade cuentas que tengan un código registrado como usado.
4. El diagnóstico quede documentado en `CONTEXT.md` (Sección 9) con la causa raíz confirmada.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (tabla de endpoints 6.2, IDs del DOM, Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión **v7.3**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad (persistencia, restauración multi-dispositivo y no-purga de cuentas con código registrado).
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

> "Ayer creé una cuenta, ingresé el respectivo código de acceso, pero ahora me sale en versión demo. Quiero que revisemos eso y dejemos operativo el sistema de registro de códigos de acceso usados, quedando en el registro para que luego ingresen y ya esté la cuenta operativa desde cualquier plataforma."

**Intención:** El operador ya entregó un código a un postulante y lo vio convalidarse ayer. Hoy, al volver a ingresar, la cuenta aparece como Demo. El objetivo no es solo "arreglar una cuenta": es que **el registro de códigos usados sea la fuente de verdad persistente** y que *cualquier* login posterior (cualquier navegador, cualquier dispositivo) restaure automáticamente el estado de Pase Activo.

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

### Flujo de convalidación y estados (backend)
- `server.py:73`: `DB_PATH = BASE_DIR / "estudio_grado.db"` (SQLite local al repositorio).
- `server.py:122`: `db.init_db(DB_PATH)` al arrancar.
- `POST /api/auth/register` (`server.py:144x`): crea usuario con `access_code = NULL`, `is_verified = 1`, `created_at = now_ms`, emite cookie `session_token` y responde 201 con `isDemo: true`.
- `POST /api/auth/login` (`server.py:1499`): verifica PBKDF2 y lockout (15 min tras 5 fallos); responde `isDemo: not bool(user["access_code"])` (línea 1572).
- `GET /api/auth/me` (`server.py:1023`): responde `isDemo: not bool(user["access_code"])` (línea 1033). **El servidor ya es la verdad** sobre el estado de licencia.
- `POST /api/auth/link-code` y `/api/auth/convalidate` (`server.py:1579`): llama `db.link_user_code(uid, code)`.
- `db.link_user_code` (`db.py:639`): descuenta atómicamente `access_codes.times_used` (solo si `active = 1`, `times_used < max_uses` y no expirado) y luego `UPDATE users SET access_code = ?`.
- `db.purge_unvalidated_accounts` (`db.py:468`): deletes `users WHERE access_code IS NULL AND created_at < (now - 48h)` + `user_progress` huérfano.
- Daemon `run_auto_purge_daemon` (`server.py:1963`): corre al arranque y cada 30 min.
- `db.list_access_codes` (`db.py:285`): obtiene `linked_emails` vía `GROUP_CONCAT(users.email)` — **depende de que la fila en `users` siga viva**.
- `EXTRA_ACCESS_CODES` (env): siembra códigos al arranque con `INSERT OR IGNORE` (README/CONTEXT §6.3).

### Cliente (doble autoridad de verdad)
- `js/auth-service.js:90` `checkSession()`: consulta `/api/auth/me`; si responde, `currentUser = {...data.user, isDemo: !data.user.access_code}`. Si el backend no responde, cae a `localStorage` (`grado_auth_user`).
- `js/auth-service.js:459` `convalidateAccount(code)`: primero `POST /api/auth/link-code`; si falla, cae al modo estático `LicenseService.activateCode` (registro en `localStorage`).
- `js/auth-license.js:65` `getCurrentLicense()`: lee `localStorage["estudio_grado_user_license"]` **primero**; si no existe (navegador nuevo) recién entonces usa `AuthService.currentUser.access_code`.
- `js/auth-license.js:99` `isDemoMode()`: deriva de `getCurrentLicense()`; una licencia en `localStorage` con `expiresAt` vencido devuelve `expired = true` → obliga a Demo **aunque el servidor diga que hay Pase Activo**.

### Despliegue (producción)
- `render.yaml`: **plan free**, variables `DB_PATH` y `EXTRA_ACCESS_CODES` declaradas (`sync: false`), pero **no existe bloque `disk:`**. El filesystem del contenedor es **efímero**: cualquier deploy/recycle en Render Free borra `estudio_grado.db` por completo (usuarios, códigos, `times_used` y progreso).
- No hay workflow `.github/` → el despliegue es únicamente el backend de Render (no GitHub Pages activo para esta funcionalidad).

## DIAGNÓSTICO PROBABLE (confirmar en revisión antes de tocar código)

**Causa raíz #1 (más probable):** `render.yaml` no monta un Persistent Disk → `estudio_grado.db` vive en el filesystem efímero de Render Free. Al reciclarse/redeployearse el contenedor (o tras el spin-down de Free), se pierden la cuenta y el registro de códigos. El postulante se vuelve a registrar → cuenta nueva → Versión Demo, y el código con `max_uses = 1` puede quedar agotado en el siguiente arranque si se consumió de nuevo.

**Causa raíz #2 (posible):** Si en algún momento el backend no respondió (caída, deploy, GitHub Pages estático), `convalidateAccount` convalidó en el `localStorage` del navegador (`estudio_grado_issued_licenses`). Ese registro es **local a un solo navegador/plataforma** y no persiste como "código usado" para el servidor ni para otros dispositivos.

**Causa raíz #3 (restauración inexistente):** No existe ningún mecanismo que, al iniciar sesión, **restaure** la licencia de un correo que ya consumió un código pero cuya fila de `users` fue purgada o perdida. `linked_emails` depende de `users` viva, por lo que el "registro de usados" muere junto con la tabla `users`.

## CAMBIOS A IMPLEMENTAR

### PARTE 0 — DIAGNÓSTICO Y VERIFICACIÓN PREVIA (no tocar código hasta completar esto)

1. Levantar el servidor localmente y **inspeccionar `estudio_grado.db`** (tablas `users`, `access_codes`, `user_progress`): verificar si la cuenta del operador existe, si `access_code` está asignado o si fue purgada.
2. Consultar `GET /api/admin/codes` con el PIN admin: confirmar el estado real del código entregado (`active`, `times_used`, `max_uses`, `linked_emails`).
3. Probar el ciclo completo en un navegador (registro → convalidar → cerrar → volver a entrar y/o entrar desde **otro navegador/incógnito**): replicar el síntoma y anotar dónde se corta (¿respuesta del servidor? ¿reseteo de contenedor? ¿licencia vencida en `localStorage`?).
4. Documentar la causa raíz confirmada en `CONTEXT.md` §9.

### PARTE A — Persistencia durable en producción (`render.yaml`, `server.py`, `db.py`)

1. **Montar Persistent Disk en Render:** añadir bloque `disk:` en `render.yaml` (p. ej. `name: data`, `mountPath: /var/data`, `sizeGB: 1`) y apuntar `DB_PATH: /var/data/estudio_grado.db` en las variables de entorno. Garantizar que `server.py` **cree el directorio padre** de `DB_PATH` si no existe (`mkdir -p`), para que el arranque no falle en disco nuevo.
2. **Verificar al boot** que el `DB_PATH` resuelto sea persistente y loguear la ruta real en consola (p. ej. `[DB] Archivo SQLite en <ruta>`) para diagnóstico.
3. Mantener `EXTRA_ACCESS_CODES` como *seed only* (nunca debe sobrescribir `times_used` existentes — ya `INSERT OR IGNORE`; verificar que un código ya usado no se resiembre con contadores en cero).

### PARTE B — Registro durable de códigos usados (fuente de verdad independiente de `users`)

El defecto estructural: el "registro de códigos usados" hoy vive en `users.access_code` + `access_codes.times_used`, y **ambos se pierden si la fila de `users` muere**. Crear un registro de auditoría indestructible:

1. **Nueva tabla `access_code_usages`** en `db.py init_db()` (auto-migración idempotente):
   ```
   code TEXT NOT NULL,
   email TEXT NOT NULL,
   consumed_at INTEGER NOT NULL,
   PRIMARY KEY (code, email)
   ```
2. Escribir en ella dentro de `link_user_code` (misma transacción, atómica): al consumir un código, insertar `(clean_code, email, now_ms)` con `INSERT OR IGNORE`.
3. Endpoints/reglas nuevas:
   - **Restauración en login/register:** si al iniciar sesión la cuenta no existe (purgada o pérdida de DB → solo aplica dentro del mismo entorno de DB persistente) **o** existe sin `access_code`, consultar `access_code_usages` por `email`: si hay registro, asignar automáticamente el código (`UPDATE users SET access_code` o re-crear la cuenta con licencia) y responder `isDemo: false` **sin** re-descontar `times_used`.
   - **NO re-consumir:** la restauración no debe volver a incrementar `times_used` ni fallar por `max_uses=1` agotado.
   - `GET /api/admin/codes`: incluir en cada código los `usages` (emails + timestamp) leídos de `access_code_usages` como complemento de `linked_emails`.
4. **Purga a prueba de balas:** `purge_unvalidated_accounts` sigue eliminando solo `users.access_code IS NULL`; confirmar que jamás toca `access_code_usages` (esa tabla es inmune, es el registro contable). Una cuenta cuyo email tenga un registro en `access_code_usages` **nunca** vuelve a quedar en Demo tras login.

### PARTE C — Cliente: que el servidor mande sobre el `localStorage` (`js/auth-service.js`, `js/auth-license.js`)

1. `LicenseService.getCurrentLicense()` y `isDemoMode()`: **dar prioridad absoluta a `AuthService.currentUser.access_code`** (verdad del servidor, sincronizada por `/api/auth/me` en cada carga y por login). Una licencia en `localStorage` solo debe actuar como caché cuando **no** hay sesión de servidor, y un `expiresAt` vencido de caché **nunca** debe degradar a Demo si el servidor dice que hay Pase Activo.
2. `AuthService.convalidateAccount`: al convalidar contra backend, **sincronizar** la licencia del servidor (código, email, estado) y guardarla en `localStorage` solo como caché; al iniciar sesión en un dispositivo nuevo con el mismo correo, `/api/auth/me` debe restaurar el Pase Activo (ver Parte B) y el cliente debe reflejarlo sin pedir reconvalidación.
3. Consolidar el registro de códigos emitidos del admin: `fetchAdminCodes()` ya sincroniza desde `/api/admin/codes`; asegurar que tras una convalidación de postulante, el panel **refleje el uso** (`times_used`, emails) sin depender del `localStorage` del navegador admin.

### PARTE D — SEGURIDAD (recordatorio obligatorio)

- La nueva tabla/endpoints deben validar email y código con los mismos patrones canónicos (`^[A-Z0-9_\-]{4,36}$`, `normalize_access_code`, normalización de email a minúsculas).
- El endpoint de restauración debe autenticarse (cookie `session_token`) y **nunca** devolver datos del registro de usados a cuentas no autorizadas; el admin sigue protegido por PIN SHA-256.
- No exponer `access_code_usages` en endpoints públicos distintos de `/api/admin/*`.
- SQL parametrizado en todas las consultas (sin interpolación de strings del usuario).

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

Ampliar `test_unlock_auth_flow.cjs` (y si aplica `test_e2e_case_flow.cjs`) con:

1. **Restauración multi-dispositivo:** registrar → convalidar → "iniciar sesión" de nuevo (nuevo cliente/sin caché) → `/api/auth/me` y login devuelven `isDemo: false` sin re-consumir `times_used`.
2. **Persistencia del registro de usados:** tras convalidar, borrar la fila de `users` (simulando purga) y verificar que `access_code_usages` conserva `(code, email)` y que el login restaura la cuenta en Pase Activo.
3. **Purga inmune:** cuenta con `access_code`; correr `purge_unvalidated_accounts` y verificar que ni la cuenta ni su registro de uso se eliminan.
4. **No-resiembra corruptora:** con `EXTRA_ACCESS_CODES` activo, verificar que un código ya usado no se resiembre con `times_used = 0`.
5. **Admin:** `GET /api/admin/codes` incluye los usos registrados (emails y fechas) tras una convalidación.
6. Ejecutar **ambas** suites al 100 % PASS y actualizar `CONTEXT.md` (tabla §6.2 si hay endpoints nuevos, §4.4/§6.1 para la política de purga/registro, §8 mapa de archivos, Bitácora §9 → v7.3).

## DEFINITION OF DONE

- [ ] Parte 0 completada: causa raíz confirmada y documentada en `CONTEXT.md` §9 (v7.3).
- [ ] `render.yaml` monta un Persistent Disk y `DB_PATH` apunta a él; el arranque crea el directorio y loguea la ruta real de SQLite.
- [ ] Tabla `access_code_usages` auto-migrada y poblada atómicamente en cada convalidación.
- [ ] Login/`/api/auth/me` restauran Pase Activo (`isDemo: false`) desde el registro de usados sin re-descontar el código, en cualquier dispositivo/navegador.
- [ ] La licencia de `localStorage` nunca degrada a Demo si el servidor reporta Pase Activo.
- [ ] `purge_unvalidated_accounts` no elimina cuentas con código y jamás borra `access_code_usages`.
- [ ] `GET /api/admin/codes` muestra los usos registrados (emails + fechas).
- [ ] `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs` al 100 % PASS (con nuevas aserciones de las Partes B y C).
- [ ] `CONTEXT.md` actualizado (endpoints, política de persistencia, Sección 8 y Bitácora v7.3) y `PROMPTS/README.md` con el estado ✅ Implementado.

## NOTAS PARA EL EJECUTOR

- Respeta los nombres técnicos internos (`AuthService`, `LicenseService`, `db.py`, `access_codes`, `users`, `user_progress`); no renombrar contratos.
- La restauración debe ser **idempotente** (un email solo puede consumir un código X; repetir login no duplica registros ni descontadores).
- Si la causa raíz confirmada es solo el disco efímero (Parte A) y el flujo ya restaura correctamente con un disco persistente, la Parte B queda como robustez: evaluar en revisión si se implementa completa o en su versión mínima (sin romper la suite).
- Mantener la política de purga 48h para cuentas genuinamente demo (sin ningún registro de uso); no desactivarla.