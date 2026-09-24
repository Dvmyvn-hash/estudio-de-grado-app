# PROMPT 022 — Persistencia de Sesión: Sin Cuenta Ni Código Nuevos por Refresh

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** ninguno (no tocar archivos del 021 en curso)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que refrescar la página **no cierre sesión ni exija cuenta/código nuevos**: la cookie de sesión debe persistir en local (`http://localhost`), en Render (HTTPS) y en Pages→Render (cross-site); las cuentas vinculadas quedan guardadas (ya lo hace SQLite + purga selectiva) y las no vinculadas se purgan (política 48h vigente, no tocar).

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión `v7.28`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "cada vez que actualizo la página se debe crear una cuenta nueva y generar un nuevo código de acceso. Quiero que las cuentas vinculadas queden guardadas y las no vinculadas se eliminen."
>
> **Diagnóstico del orquestador (verificado en código, no asumir otra cosa):**
> 1. `server.py:832` emite `Secure; SameSite=Lax` siempre: en `http://localhost` el navegador la descarta (cada refresh = sin sesión) y en Pages→Render (cross-site) `Lax` + fetch la bloquea. Los tests no lo ven porque su cookie-jar manual ignora `Secure`.
> 2. Códigos `max_uses=1` (`db.py:104`): al quedar sin sesión el usuario re-registra (mismo correo → 409 → cuenta nueva) y el código ya consumido obliga a generar otro. El re-link mismo-usuario-mismo-código ya es idempotente (`db.py:785`, endpoint `/api/auth/link-code` → `db.link_user_code`).
> 3. `js/auth-service.js:130-149` (`checkSession`): ante 401 cae al fallback de `localStorage` ("cuenta fantasma" local sin validez en servidor).
> 4. Descartado como causa: la persistencia en disco existe (`render.yaml`: disco `/var/data` + `DB_PATH`) y la purga 48h solo toca no-vinculadas (política deseada, no tocar).

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

| Archivo | Función/Sección | Estado |
|---------|-----------------|--------|
| `server.py:830-836` | `make_session_cookie` / `make_logout_cookie` | Flags fijos, sin contexto de request |
| `server.py:951-962` | `send_json_response` | Sin CORS; sin `do_OPTIONS` en el handler |
| `server.py:1058-1068` | `/api/sync-check` manual | Sin CORS |
| `server.py:1398-1619` | 6 emisores de cookie (register/login/link-code/test) + logout `:1249` | Cambiar a helper por-request |
| `server.py:1201,1275,1327` | PIN admin por header `X-Admin-PIN` | Incluir en `Access-Control-Allow-Headers` |
| `js/auth-service.js:92,280,375,502,629` | fetch auth sin `credentials` | Agregar `credentials: "include"` |
| `js/storage.js:330,347,412,432,497` | fetch progress/mastery sin `credentials` | Agregar `credentials: "include"` |
| `db.py:781-841` | `link_user_code` idempotente mismo usuario | Verificar vía endpoint, no cambiar default `max_uses=1` |

## CAMBIOS A IMPLEMENTAR

### PARTE A — `server.py`: cookie dual-mode + CORS con allowlist

- `Secure` solo si `X-Forwarded-Proto: https`; `SameSite=None` solo si cross-site + `Origin` en allowlist (env `ALLOWED_ORIGINS` + defecto = `authorizedOrigins` de `auth-config.js`); en otro caso `Lax` sin `Secure` en http. Logout espeja flags (si no, el navegador conserva la vieja).
- Helper por-request (`self._session_cookie(token)` / `self._logout_cookie()`) y migrar los 7 emisores; mantener `make_session_cookie(token)` compatible para tests.
- CORS solo en `/api/*` con `Origin` allowlisted (jamás `*`): `Allow-Origin` eco + `Vary: Origin` + `Allow-Credentials: true` + métodos/headers (incluir `X-Admin-PIN`); `do_OPTIONS` → 204; agregar CORS al bloque manual de `/api/sync-check`.

### PARTE B — Cliente: `credentials` + fin de la cuenta fantasma

- `credentials: "include"` en los 10 fetch listados arriba (auth + progress/mastery; los GET públicos no se tocan).
- `checkSession`: 401 del servidor → limpiar `grado_auth_user` y pasar a Demo (confiar en servidor); fallback a caché **solo** si el fetch lanzó excepción (backend inalcanzable / Pages estático).

### PARTE C — Códigos: verificar, no cambiar política

- Probar re-link mismo-usuario-mismo-código vía endpoint: debe dar `ok:true` sin mover `times_used`. No cambiar `max_uses=1` por defecto ni la purga 48h.

### PARTE D — SEGURIDAD

- `SameSite=None` jamás para orígenes fuera de allowlist; limiters (`LINK_CODE_LIMITER`, `ADMIN_LIMITER`, lockout) intactos; sin nuevos secretos.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nueva sección en `test_unlock_auth_flow.cjs`: cookie sin `Secure` en http / con `Secure` en https / `None`+ACAO solo con Origin allowlisted / nada con Origin maligno / preflight 204 / refresh simulado con cookie (me→me 200/200) / re-link idempotente.
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8, bitácora v7.28).

## DEFINITION OF DONE

- [ ] Refresh en localhost conserva sesión (cookie sin `Secure`, `Lax`, Max-Age 30d)
- [ ] Refresh en Pages→Render conserva sesión (`None; Secure` + CORS con credenciales)
- [ ] 401 limpia caché local; offline usa caché (modos verificados por separado)
- [ ] Re-login restaura Pase sin código nuevo; re-link mismo código no descuenta
- [ ] Origin maligno: sin ACAO y con `Lax` (sin CSRF regresivo)
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR (anti-interferencia con 021 en curso)

- **Prohibido tocar:** `js/qa-composer.js`, `js/vault-*`, `sinonimos.*`, regiones UI del 021 en `index.html`/`css/*`/`js/app.js`.
- Antes de commitear: `git status` y `git diff --stat`; staging solo con paths explícitos de este prompt; si `CONTEXT.md` trae entradas ajenas sin commitear, anexar sin reescribirlas.
- Si el 021 aún no está verde, igual se puede avanzar A+B con los contratos citados (no dependen de él).
