# PROMPT 028 — Venta Manual Ágil: Lotes, Pre-asignación y Estados (sin pasarela)

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** ninguno (Fase 0 primero)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Reducir la venta manual por Instagram a ~5 minutos: generación de códigos **en lote** (20 de una vez), **pre-asignación al email** del comprador (el código solo le sirve a él) y **filtro por estado** (pendiente/entregado) en el panel admin. Sin pasarela de pago, sin quitar el control humano, sin migraciones de DB.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 y Bitácora Sección 9 → próxima versión `v7.35`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: mantener la venta por Instagram con transferencia directa y control humano; hacerla rápida con stock previo, email atado y estados. Las plantillas DM viven en `VENTAS/plantillas_dm.md` (placeholders, jamás datos reales en el repo).

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear |
|----------|------------|
| `POST /api/admin/create-code` + `db.create_code` (`assigned_email`, `label`) | Campos reutilizables sin migrar |
| `db.link_user_code` | Dónde exigir que el email de la cuenta calce con `assigned_email` si viene seteado |
| Panel admin (`#admin-license-form`, tabla `#admin-codes-tbody`) | Dónde agregar lote + filtro por estado |
| `LINK_CODE_LIMITER` / `ADMIN_LIMITER` | No relajar ante creación masiva propia (lote = 1 llamada, N códigos) |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Conformancia (obligatoria primero)

Tabla delta del panel admin y endpoints reales; si hay trabajo en curso en esos archivos, no pisarlo.

### PARTE A — Endpoint de lote (una llamada, N códigos)

- `POST /api/admin/create-code-batch` (rol `admin` pleno, mismo auth que create-code): `{prefix, count≤50, scope, days, max_uses, label}` → crea N códigos atómicos (transacción: todo o nada) y retorna la lista para copiar/pegar.
- Reutiliza `db.create_code` en loop dentro de una transacción; valida `count`, `scope` y `days` igual que el unitario.

### PARTE B — Pre-asignación email (anti-préstamo de códigos)

- Al crear (unitario o lote): `assigned_email` opcional. En `link_user_code`: si el código trae email asignado y difiere del de la cuenta → rechazo explícito ("código asignado a otro correo").
- Sin email asignado: comportamiento actual intacto (compatibilidad con stock genérico).

### PARTE C — Estados y filtro (convención sobre `label`, cero migración)

- Convención: `label` inicia con `[PENDIENTE]` o `[ENTREGADO]`; acción en la tabla para alternar (edita solo el label vía endpoint existente o uno mínimo dedicado).
- Filtro en `#admin-codes-tbody` (Todos/Pendientes/Entregados) client-side. Sanitizado como todo texto admin.

### PARTE D — SEGURIDAD

- Lote solo rol pleno `admin` (403 a `docente`, como el resto); respetar limiters; jamás exponer códigos en logs ni en respuestas fuera del admin autenticado.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Aserciones: lote de 20 atómico (falla a propósito a mitad → 0 creados); email distinto rechazado, email calzante acepta, sin email acepta; filtro UI; regresión unitaria intacta.
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8, bitácora v7.35). `VENTAS/plantillas_dm.md` sin cambios (ya existe).

## DEFINITION OF DONE

- [ ] Lote atómico de hasta 50 códigos en 1 llamada, solo `admin`
- [ ] Pre-asignación enforced en el link; stock genérico intacto
- [ ] Filtro por estado operativo en el panel
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- Staging con paths explícitos; en `CONTEXT.md` anexar sin reescribir entradas ajenas.
- Rollback = revertir endpoint, enforcement y UI: los códigos ya emitidos siguen válidos.
