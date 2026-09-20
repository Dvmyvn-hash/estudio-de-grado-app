# Reglas del Repositorio: estudio-de-grado-app

## 1. Regla Inmutable: Actualización Obligatoria de CONTEXT.md
En este repositorio, **`CONTEXT.md` es la única fuente canónica de verdad (*Single Source of Truth*)**.

Cualquier cambio, modificación, adición o refactorización que se realice en el código (frontend, estilos CSS, endpoints en `server.py`, base de datos `db.py`, componentes en `index.html` o pruebas E2E) **DEBE actualizar correlativamente el archivo `CONTEXT.md`** al terminar cada cambio.

### Protocolo para cada tarea:
1. Al implementar un cambio de funcionalidad o flujo, verificar el impacto en la arquitectura general.
2. Ejecutar las pruebas unitarias y de integración (`node test_unlock_google_flow.cjs` y `node test_e2e_case_flow.cjs`).
3. Actualizar la sección correspondiente de `CONTEXT.md` para reflejar con precisión:
   - Nuevos identificadores y clases del DOM.
   - Nuevos flujos de usuario y máquinas de estado.
   - Nuevos endpoints, variables o configuraciones.
   - Nuevas convenciones o guardrails de seguridad.
   - Actualizar la bitácora de versiones en la Sección 9.

Ninguna tarea técnica se considerará completa sin la actualización correspondiente de `CONTEXT.md`.
