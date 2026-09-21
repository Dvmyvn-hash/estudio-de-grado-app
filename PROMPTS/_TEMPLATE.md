# PROMPT NNN — [[TÍTULO CORTO DEL CAMBIO]]

> **Versión:** v1.0 · **Fecha:** [[AAAA-MM-DD]] · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** [[#001 o "ninguno"]]

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

[[Objetivo en 2-4 frases concretas, medibles y verificables. Qué debe pasar, quién lo usa y qué percepción tiene el usuario final.]]

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (tabla de endpoints 6.2, IDs del DOM, Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión [[vX.Y]]).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

[[Transcripción fiel + intención del usuario, aunque sea informal. Útil para que el ejecutor entienda el "porqué".]]

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

[[Archivos, funciones, identificadores del DOM, endpoints y flujos existentes que tocan este cambio.]]

## CAMBIOS A IMPLEMENTAR

### PARTE A — [[Capa 1]] (v. ej. `server.py`)
[[Contrato exacto, validaciones, códigos HTTP, acciones sobre éxito, idempotencia.]]

### PARTE B — [[Capa 2]] (v. ej. `generate_clean_notes_data.py`)
[[Reglas de parsing/índice, esquema de datos, edge cases.]]

### PARTE C — [[Capa 3]] (v. ej. `index.html` + `js/app.js`)
[[IDs del DOM nuevos, métodos nuevos, flujo de usuario, estados de carga/error, retrocompatibilidad.]]

### PARTE D — SEGURIDAD (recordatorio obligatorio)
[[Guardrails específicos de esta feature.]]

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)
[[Casos de prueba E2E nuevos (códigos HTTP, casos límite, idempotencia), suites a ejecutar, secciones de CONTEXT.md a actualizar.]]

## DEFINITION OF DONE

- [ ] [[Criterios verificables, uno por línea, en checklist.]]

## NOTAS PARA EL EJECUTOR

- [[Restricciones, decisiones abiertas, sugerencias de implementación.]]