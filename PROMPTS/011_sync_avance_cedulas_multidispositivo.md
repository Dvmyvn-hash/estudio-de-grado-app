# PROMPT 011 — Sincronización Multi-Dispositivo del Avance de Cédulas: la Cédula "Completada" en el Celular se Refleja en el PC (dentro de las Limitaciones Técnicas de la Arquitectura Dual)

> **Versión:** v1.0 · **Fecha:** 2026-09-22 · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** `010_desarrollador_preguntas_verificacion_cedulas.md` (✅ Implementado en **v7.11** — este PROMPT es incremental, no debe repetir sus cambios)

> Copia y pega este bloque completo como prompt inicial en tu agente de Antigravity IDE. Está redactado para ejecutarse dentro del repositorio `estudio-de-grado-app` (GRADOMANIACOS) conforme a las reglas de `AGENTS.md`.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa la funcionalidad descrita **respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio**, y **dentro de las limitaciones técnicas reales de la arquitectura dual** (Render con servidor Python/SQLite + modo autónomo estático GitHub Pages/file:).

## MISIÓN

Que el marcado de **cédula completada/dominada** (`masteredTopicIds` en `StorageService.userProgress`) **viaje entre los dispositivos del mismo usuario**: si marcas una cédula como completada en el **celular**, al abrir en el **PC** (mismo correo/Pase de Grado, mismo modo servidor) el avance debe aparecer sincronizado. Concretamente:

1. **Backend:** nueva tabla `user_topic_mastery` + endpoints autenticados `GET`/`POST /api/user/topic-mastery` (mismo patrón de `/api/user/progress` que hoy solo sincroniza borradores de casos — **esta es la brecha**: `mastered` no se sincroniza y por eso el celular y el PC pierden el marcado).
2. **Cliente:** servicio de sincronización del avance con **fusión LWW por cédula** (timestamps por tópico), disparado desde los ciclos existentes (`startLiveSync`, `syncWithServer`, `handleMasteryClick` y el auto-cierre 4/4 del PROMPT 010). Pull al arrancar/sincronizar, push al marcar/desmarcar, reconciliación silenciosa.
3. **Limitación técnica honesta (modo estático):** cuando la página corre en **GitHub Pages o `file:`**, `startLiveSync()` **no llama a `/api/*`** y no hay sesión real de servidor → la sincronización automática es **imposible por diseño** en ese modo. Como puente dentro de esa limitación, se añade **Exportar/Importar manual del progreso del usuario** (funciona en cualquier modo, incluido estático) para que el usuario pueda mover su avance entre dispositivos con un toque.
4. **Cero regresión:** las 4 suites al 100 % PASS; demo, estático y flujo local actual quedan **idénticos** cuando no hay sesión de servidor (degradación elegante, cero ruido de red).

## REGLAS OBLIGATORIAS DEL REPOSITORIO (ADEMÁS DEL CÓDIGO)

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Secciones 2.5, 3.1, 6.2 tabla de endpoints, Sección 7.3, Sección 8 mapa de archivos y Bitácora Sección 9 → **v7.12**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; **ampliar la Sección 25 de `test_e2e_case_flow.cjs`** (autenticación + endpoints + LWW + purga) y reforzar `test_unlock_auth_flow.cjs` solo si el senderismo de sesión lo requiere.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. **No romper contratos existentes:** `POST/GET /api/user/progress` y `syncPushCaseDraft` (drafts de casos) **intactos**; `StorageService.toggleTopicMastery`, `isTopicMasteredByUser`, `calculateProgress`, `getUserMasteredTopics`, `getActiveUserKey` intactos (solo se añaden campos/métodos); `AuthService`, `LicenseService`, `CaseGeneratorAgent`, `INITIAL_DATA`, flujo demo/desbloqueo intactos; `topicQuizzes` del PROMPT 010 **permanece local por diseño** (este PROMPT no lo sincroniza).
5. Guardrails de seguridad vigentes: endpoints autenticados con cookie de sesión HttpOnly (cero tokens por query string), validación estricta de `topicId`, sanitización XSS en el origen, `MAX_PAYLOAD_SIZE` (128 KB) respetado, SQLite con la robustez de v7.6 (WAL/busy timeout), purga de filas huérfanas.

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

"Estoy implementando el 010; para después necesito un prompt que refuerce y solucione que, cuando daba cédula completada en el celular, al acceder desde el navegador del PC no se reflejaba lo marcado; quiero que podamos sincronizar eso dentro de las limitaciones técnicas de cómo está montada la página."

Es decir: **el problema real es que `masteredTopicIds` vive solo en `localStorage` de cada navegador**. El celular y el PC comparten cuenta (mismo Pase de Grado), pero cada navegador tiene su propio `localStorage`; como el estado de "completada" nunca sale del cliente, no hay forma de que un dispositivo entere al otro. Los borradores de casos ya se sincronizan vía `/api/user/progress` cuando hay sesión de servidor; el **avance de cédulas no** — esa es exactamente la pieza que falta.

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

- **`js/storage.js`:**
  - `userProgress[key] = { masteredTopicIds: [], lastActivity }` (clave = código de licencia vía `getActiveUserKey()` ~119, o `"demo_student"`).
  - `toggleTopicMastery(topicId)` (~137): toggle en `masteredTopicIds`; retorna `{ isMastered, masteredCount }`. `isTopicMasteredByUser` (~161), `calculateProgress` (~167), `getUserMasteredTopics` (~128).
  - `syncPushCaseDraft(caseId, draftData)` (~203): `POST /api/user/progress` **solo si `AuthService.currentUser` existe**; `catch` silencioso (offline). *Este es el patrón cliente→servidor que hay que replicar para `mastered`.*
  - `getData()` (~10): migra/auto-cura `topics` desde `INITIAL_DATA`; `userProgress` se copia intacto (los nuevos campos persistirán sin fricción).
- **`js/app.js`:**
  - `startLiveSync()` (~255): **detecta `github.io` o `file:` y retorna temprano → modo autónomo, nunca llama `/api/*`**. En modo servidor: poll `sync-check` cada 3,5 s; si cambia `version` → `syncWithServer()` (~317), que reemplaza `localData.topics` fusionando el estado `mastered` del cliente (ids + clave natural) — *ahí mismo vive el merge que ya respeta `mastered`*.
  - `renderTopicViewer()` (~837) y `handleMasteryClick` (~1188): `StorageService.toggleTopicMastery(topic.id)` + re-render + toast. El PROMPT 010 añade `markTopicMastered()`/`recordTopicAnswer()` (auto-cierre 4/4) — ambos terminan tocando `masteredTopicIds`; este PROMPT los engancha sin modificarlos.
- **`server.py`:**
  - `do_GET` (~940) — "API 7" `/api/user/progress` (~1101): autentica con `get_authenticated_user()` (~922) y responde `db.get_all_user_progress(user["id"])`.
  - `do_POST` (~1140) — `/api/user/progress` (~1541): autentica, lee body con límite `MAX_PAYLOAD_SIZE` (128 KB), valida `caseId` (regex `^[a-zA-Z0-9_\-]{1,64}$`) y `data` dict, `db.upsert_user_progress(...)`.
  - `send_json_response` (~909) y `end_headers` (~901, encabezados de seguridad HTTP).
- **`db.py`:**
  - `user_progress` con migración idempotente (v7.7); `get_all_user_progress` (~879) y `upsert_user_progress` (~902, `ON CONFLICT(user_id, case_id) DO UPDATE`).
  - `purge_unvalidated_accounts` (~554): elimina usuarios demo >48h y **sus filas en `user_progress`** (línea ~585) para no dejar huérfanos — el mismo cuidado debe extenderse a la tabla nueva.
  - Conexiones con `get_db_connection` (robustez WAL/busy de v7.6).
- **Harness de pruebas:** `test_e2e_case_flow.cjs` levanta `server.py` (spawn con `ALLOW_TEST_AUTH=1`) y usa `assert(cond, msg)` con contador (Sección 24 la añade el PROMPT 010). `test_unlock_auth_flow.cjs` mockea `localStorage`/`sessionStorage`, requiere los módulos JS (`SecurityShield`, `AuthService`, `LicenseService`) y mantiene un `cookieJar` real contra el servidor — patrón reutilizable para probar el merge del cliente.
- **Topología de despliegue (clave para las "limitaciones técnicas"):** `render.yaml` (servicio `gradomania-app` con SQLite en disco) + `.github/workflows/deploy-pages.yml` (GitHub Pages estático con `js/data.js` regenerado). `README.md` §Arquitectura Dual documenta ambos modos; `startLiveSync` separa el comportamiento en runtime.

## CAMBIOS A IMPLEMENTAR

### PARTE A — Backend de avance (`db.py` + `server.py`)

1. **Nueva tabla `user_topic_mastery`** (crearla con el patrón idempotente de `init_db`, respetando el estilo DDL existente):
   ```sql
   CREATE TABLE IF NOT EXISTS user_topic_mastery (
     user_id INTEGER NOT NULL,
     topic_id TEXT NOT NULL,
     mastered INTEGER NOT NULL DEFAULT 1,
     updated_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, topic_id),
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );
   ```
   (Si el archivo usa `PRAGMA foreign_keys`, confirmar que el patrón de borrado en cascada/limpio aplica; en cualquier caso añadir el DELETE explícito en la purga.)
2. **Funciones en `db.py`** (mismo estilo de `get_all_user_progress`/`upsert_user_progress`):
   - `get_user_topic_mastery(user_id)` → `{ topic_id: { mastered: bool, updatedAt: ms } }` (ORDER BY `updated_at` ASC para determinismo).
   - `upsert_user_topic_mastery(user_id, topic_id, mastered, updated_at=None)` → upsert **LWW server-side**:
     ```sql
     INSERT ... ON CONFLICT(user_id, topic_id) DO UPDATE SET
       mastered = excluded.mastered, updated_at = excluded.updated_at
       WHERE excluded.updated_at >= user_topic_mastery.updated_at
     ```
     (una escritura con timestamp más viejo **no sobrescribe** una más nueva — protege contra mensajes fuera de orden).
   - `upsert_many_user_topic_mastery(user_id, changes, now_ms)` → lote atómico (una transacción con el mismo `WHERE` LWW) retornando el nº real de filas afectadas.
   - **Purga:** en `purge_unvalidated_accounts` (~585), añadir junto al DELETE de `user_progress`: `DELETE FROM user_topic_mastery WHERE user_id IN (...)`.
3. **Endpoints en `server.py`:**
   - **`GET /api/user/topic-mastery`** (en `do_GET`, junto a la API 7): `get_authenticated_user()` → 401 si no hay sesión; si hay → `{ "ok": true, "mastery": {...} }`.
   - **`POST /api/user/topic-mastery`** (en `do_POST`, junto al progress): autenticado; body JSON (respetar límite `MAX_PAYLOAD_SIZE` y el patrón de lectura de `content_length`). Acepta **dos formas**:
     - single: `{ "topicId": "civil-losbienes-1-4", "mastered": true, "ts": 1774... }`
     - bulk: `{ "changes": [ {topicId, mastered, ts}, ... ] }` (máx **500** por request).
   - **Validaciones estrictas (400):** `topicId` → regex `^[a-z0-9_\-]{1,64}$` (convención `{subject}-{stem}-{code-sin-puntos}`); `mastered` → booleano estricto (`isinstance(bool)`); `ts` → entero > 0 (si falta, `int(time.time()*1000)`); bulk → array de objetos válidos, rechazar el lote completo si alguno es inválido (todo-o-nada). Respuesta: `{ "ok": true, "upserted": n, "updatedAt": ms }`.
   - **No** tocar `/api/user/progress`, `send_json_response` ni `end_headers`.

### PARTE B — Cliente: sincronización del avance (`js/storage.js`)

1. **Esquema:** al crear `userProgress[key]` (líneas ~132 y ~141) añadir `masteredTimestamps: {}` (mapa `topicId → ms`). `getData()` lo preserva automáticamente (se copia `userProgress` intacto).
2. **`isServerSyncAvailable()`:** `typeof AuthService !== "undefined" && AuthService.currentUser && AuthService.currentUser.isDemo === false` (sincroniza solo usuarios con **Pase Activo**; las cuentas demo se purgan a las 48 h y sus datos se vaporizan — documentarlo en CONTEXT §2.5). Sin sesión → `false` y se conserva el comportamiento 100 % local de hoy.
3. **`toggleTopicMastery` (modificar sin romper contrato):** tras el toggle, fijar `masteredTimestamps[topicId] = Date.now()` y disparar `_pushMasteryChange(topicId, isMastered)` (fire-and-forget, `catch` silencioso). Retorno se mantiene `{ isMastered, masteredCount }` (se puede añadir `timestamp` como campo extra, sin romper asserts).
4. **`markTopicMastered(topicId)`** (contrato del PROMPT 010 si ya existe; si no existe al ejecutar, crearlo idempotente): misma regla — stamp + push cuando `isServerSyncAvailable()`.
5. **`_pushMasteryChange(topicId, mastered)`:** si no hay sincronización disponible → return; `POST /api/user/topic-mastery` con `{ topicId, mastered, ts }`; si la resposta es 401 o hay error de red → silencioso (local-first, equivalencia con `syncPushCaseDraft`).
6. **`pullMasteryFromServer()` → `Promise<{ changed: boolean, reason?: string }>`:**
   - Sin sesión/servicio → `{ changed: false, reason: "no-server-sync" }` **sin fetch** (cero ruido en estático).
   - `GET /api/user/topic-mastery`; fallo de red/401 → `{ changed: false }` silencioso.
   - **Merge LWW por cédula:** para cada `topic_id` remoto: `localTs = masteredTimestamps[topic_id] || 0`; si `remoteTs > localTs` → aplicar estado remoto (mastered=true → añadir id si falta; mastered=false → quitarlo) y escribir `masteredTimestamps[topic_id] = remoteTs`; si `localTs > remoteTs` y el local está masterado → **reconciliar** enviando push local (el remoto está desactualizado); si `localTs === remoteTs` → nada. Marcar `changed` si hubo mutación del array o de timestamps, guardar con `saveData`.
   - Devolver `{ changed }` para que la UI decida re-render.
7. **Cero cambios a** `syncPushCaseDraft`, `calculateProgress`, `isTopicMasteredByUser`, `getUserMasteredTopics`, `getActiveUserKey`.

### PARTE C — Disparadores y respaldo manual (`js/app.js` + `index.html`)

1. **Pull al arranque (modo servidor):** en `startLiveSync()` (rama servidor, tras `check()` inicial) invocar `StorageService.pullMasteryFromServer()` de forma no bloqueante. En la rama estática **no** invocar nada (limitación técnica documentada).
2. **Pull en `syncWithServer()`:** al final del merge de topics (después de preservar el `mastered` existente y guardar datos), `const syncRes = await StorageService.pullMasteryFromServer(); if (syncRes.changed) { this.renderSidebar(); this.showToast("🔄 Progreso sincronizado con tus otros dispositivos", "success"); }` — con guarda de re-entrancia (reutilizar un flag propio `_isPullingMastery`; NUNCA llamar pull dentro de pull ni dentro de `renderTopicViewer` re-entrante).
3. **Push:** ya ocurre dentro de `toggleTopicMastery`/`markTopicMastered` (PARTE B); `handleMasteryClick` y el auto-cierre 4/4 del 010 **no cambian de contrato**.
4. **Respaldo manual (todas las modalidades, incluido GitHub Pages/file):** dos botones discretos en el pie del sidebar cerca de las estadísticas:
   - `#btn-export-progress` → descarga `gradomania-progreso-{YYYY-MM-DD}.json` con el `userProgress[key]` del usuario activo (`masteredTopicIds`, `masteredTimestamps`, `lastActivity`, `topicQuizzes` si existe). `download` vía Blob, sin dependencias.
   - `#btn-import-progress` (+ `<input type="file" id="input-import-progress" accept="application/json" hidden>`) → `FileReader` → `JSON.parse` en try/catch → **validar estructura** (que `masteredTopicIds` sea array de strings y `masteredTimestamps` objeto de números; rechazar cualquier otra raíz) → **merge por unión/LWW con timestamps** sobre el progreso local (jamás tocar `topics`, `auth`, `cases`, `userProgress` de otros usuarios) → `saveData` + `renderSidebar()` + toast "✅ Avance importado y fusionado". Límite de archivo local: 512 KB (rechazo silencioso con toast de error).
   - Sanitización: el contenido del archivo **nunca** se inyecta al DOM con `innerHTML` (solo se usa para poblar memoria), y se valida tipo/campos antes de guardar.
5. **Estilos:** clases CSS nuevas mínimas en `css/` (reutilizar variables `--bg-surface`, `--border-subtle`, `--gold-primary`; sin frameworks). Botones poco intrusivos (`.btn-progress-backup`).

### PARTE D — SEGURIDAD (recordatorio obligatorio)

- **Autenticación real en los endpoints:** cookie de sesión HttpOnly vía `get_authenticated_user()`; **prohibido** aceptar códigos de acceso / tokens por query string o header para estas rutas (el acceso de código es para convalidación de Pase; no se usa como bearer de datos de usuario).
- **Validación estricta:** `topicId` por regex whitelist (cero inyección SQL — además se usa siempre parámetros `?`), `mastered` booleano estricto, `ts` entero, bulk ≤ 500 y ≤ `MAX_PAYLOAD_SIZE`.
- **Minimización de datos:** las respuestas solo contienen `topic_id` + `mastered` + `updated_at` (estado de estudio). Nunca se exponen correos, contraseñas, códigos, `CASOS/` ni drafts.
- **Cliente defensivo:** catch completo en push/pull; en modo estático/sin-sesión no se ejecuta ninguna llamada de red de esta feature.
- **Purga sin huérfanos:** `purge_unvalidated_accounts` elimina también `user_topic_mastery`.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

1. **Sección 25 de `test_e2e_case_flow.cjs` (tras la Sección 24 del PROMPT 010; reutilizar el flujo de registro/login del harness o `ALLOW_TEST_AUTH`):**
   a. `POST /api/user/topic-mastery` sin cookie → **401**; con sesión → **200**.
   b. `GET` inicial → `{ ok: true, mastery: {} }` (aislamiento por usuario: marcar como usuario A no aparece en usuario B).
   c. `POST` single (`civil-losbienes-1-4`, mastered=true) → `GET` lo refleja con `updatedAt`.
   d. `POST` bulk con 3 cédulas → `GET` devuelve las 3.
   e. **LWW:** mismo topic con `ts=100` y luego `ts=200` → queda `ts=200`; reintentar `ts=150` → **no** sobrescribe (condición `excluded.updated_at >= ...`).
   f. **Validación:** `topicId` con `../` o `;` → **400**; `mastered: "true"` (string) → **400**; payload > 128 KB → **413**; bulk con un elemento inválido → **400** todo-o-nada.
   g. **Purga:** crear usuario demo expirado (via `db`) con filas en `user_topic_mastery` → `purge_unvalidated_accounts()` las elimina (assert con `get_user_topic_mastery`).
   h. **Cliente (módulos JS con `LocalStorageMock` + fetch simulado/real, patrón de `test_unlock_auth_flow.cjs`):** `pullMasteryFromServer()` con `AuthService.currentUser = null` → **sin fetch**, `changed: false`; `toggleTopicMastery` sella timestamp y dispara `POST` (verificado por spy de fetch); merge remoto más nuevo se aplica (id añadido/quitado); local más nuevo se conserva y reconcilia (push al servidor).
2. Ejecutar las 4 suites y dejar **100 % PASS** (los totales previos intactos — 009 §23, 010 §24 — más las aserciones nuevas). Registrar total en la bitácora.
3. **Actualizar `CONTEXT.md`:** Sección 2.5 (campo `masteredTimestamps`, política LWW por cédula y **limitación técnica**: sincroniza solo con Pase Activo en modo servidor; demo/estático local-only; `topicQuizzes` del 010 permanece local), 3.1 (disparadores de pull/push, botones `#btn-export-progress`/`#btn-import-progress`), 6.2 (tabla de endpoints con `GET/POST /api/user/topic-mastery`, métodos de validación y códigos HTTP; nueva tabla `user_topic_mastery` en la sección de BD), Sección 7.3 (Sección 25), Sección 8 (filas `db.py`, `server.py`, `js/storage.js`, `js/app.js`), y **Bitácora Sección 9 → v7.12** con fecha, alcance, archivos y nº de pruebas.

## DEFINITION OF DONE

- [ ] Tabla `user_topic_mastery` creada idempotentemente; `get_user_topic_mastery`, `upsert_user_topic_mastery` (LWW server-side), `upsert_many_user_topic_mastery` y purga sin huérfanos implementados en `db.py`.
- [ ] `GET/POST /api/user/topic-mastery` operativos (401/400/413/200 correctos, bulk ≤ 500, validación estricta de `topicId`/`mastered`/`ts`); `/api/user/progress` intacto.
- [ ] `js/storage.js`: `masteredTimestamps` por usuario, `isServerSyncAvailable()`, `_pushMasteryChange`, `pullMasteryFromServer()` con **merge LWW por cédula** y reconciliación; `toggleTopicMastery`/`markTopicMastered` sella timestamp y dispara push; cero cambios en contrato de métodos existentes.
- [ ] `js/app.js`: pull al arranque del modo servidor y al cierre de `syncWithServer()` (re-render + toast solo si `changed`); guards anti re-entrancia; modo estático con **cero llamadas** nuevas.
- [ ] Exportar/Importar manual del progreso (`#btn-export-progress`/`#btn-import-progress`) operativo en todas las modalidades, con validación de estructura y merge sin tocar `topics`/`auth`/`cases`.
- [ ] Simulación manual (o E2E): marcar completada en "celular" (sesión A) → `pullMasteryFromServer` en "PC" (misma cuenta) refleja el marcado; desmarcar en PC refleja en celular.
- [ ] Las 4 suites al 100 % PASS con la Sección 25 añadida y totales previos intactos (009 §23 y 010 §24).
- [ ] `CONTEXT.md` actualizado (2.5, 3.1, 6.2, 7.3, 8) y Bitácora **v7.12** registrada; `PROMPTS/README.md` indexa el 011 como ✅ Implementado (v7.12) al cierre.

## NOTAS PARA EL EJECUTOR

- **Ejecución recomendada:** el PROMPT 010 debe estar implementado (v7.11); este PROMPT es incremental y avanza la bitácora a **v7.12** ("Sincronización multi-dispositivo del avance de cédulas"). Si `markTopicMastered` del 010 no existiera al ejecutar (rama en paralelo), créalo idempotente en `StorageService` según la PARTE B.
- **"Dentro de las limitaciones técnicas" — resumen honesto para `CONTEXT.md`:** (1) la sincronización automática requiere **modo servidor con sesión real** (`AuthService.currentUser` con Pase Activo) porque `startLiveSync` se desconecta de la API en GitHub Pages/`file:`; (2) en modo estático el puente es **Exportar/Importar manual**; (3) cuentas demo (sin Pase) quedan local-only y se purgan a las 48 h; (4) dos dispositivos editando **la misma cédula** casi en simultáneo se resuelven por **LWW (última escritura gana)** — el push lleva `ts = Date.now()` del dispositivo.
- **No** introducir latencia en la UI: push y pull son async no bloqueantes, sin spinners, sin `alert`; toasts solo cuando realmente hubo cambios.
- No instalar dependencias nuevas; Blob/FileReader/`fetch` son del navegador y `sqlite3`/`http.server` del stack Python.
- Respeta la nomenclatura jurídica chilena y los mensajes/toasts en español; mantén los botones poco intrusivos y alineados con la estética Dark Academy (variables CSS existentes).
- El `GET` debe ser idempotente y el `POST` idempotente por `(user_id, topic_id, ts)`; no gaste rondas de red innecesarias (pull máximo 1 por ciclo de 3,5 s y 1 al arranque).