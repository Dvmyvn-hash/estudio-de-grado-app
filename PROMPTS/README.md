# PROMPTS/ — Puente entre Ideas ↔ Agente Antigravity IDE

> **Rol de este puente:** el humano (dpint) expresa ideas en bruto; este puente las traduce a **prompts de ingeniería completos**, aterrizados en el código real de `estudio-de-grado-app` (GRADOMANIACOS), listos para pegar en el agente de **Antigravity IDE**.

## Protocolo de trabajo (para el humano)

1. **Cuenta tu idea** tal cual sale de tu cabeza (no hace falta que esté bien redactada).
2. El puente **mapea la idea sobre el código real** del repo (idiomas, IDs del DOM, endpoints, parser, suites de tests).
3. El puente **genera un prompt técnico completo** (ver plantilla `_TEMPLATE.md`) y lo guarda aquí con numeración `NNN_<slug>.md`.
4. **Copia el archivo `NNN_<slug>.md`** en Antigravity IDE como prompt inicial (o apunta a la ruta del archivo) y ejecútalo.
5. Cuando un prompt se ejecute y se revise, se marca en el índice de abajo como `✅ Implementado` (o `🔄 Revisión`).

## Índice de prompts

| # | Archivo | Descripción | Estado |
| :-: | :--- | :--- | :--- |
| 001 | `001_sync_apuntes_admin.md` | Subida de apuntes desde el Panel de Administrador con sincronización inmediata a la Sección de Apuntes e índice temático. | 📝 Por ejecutar |

## Reglas transversales para cualquier prompt (las heredan todos)

- `CONTEXT.md` es la única fuente canónica de verdad; todo cambio de código DEBE actualizarlo (Sección 9 → Bitácora v6.8+).
- Las suites `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs` deben quedar al 100 % PASS tras la implementación.
- Stack vanilla: Python `http.server`/`sqlite3` y JavaScript ES6 sin bundlers; no añadir dependencias nuevas sin justificación.
- Sanitización en el origen (`SecurityShield.escapeHtml` / `textContent`), PIN admin vía SHA-256, anti path-traversal y límites de payload en `server.py`.
- Nomenclatura jurídica chilena: materias `civil | procesal | constitucional`, "cédula", "capítulo", "sección N.N".