# PROMPT 019 — Ingesta Confiable: Lint Pre-ingesta + Diff Report de Regeneración

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador
> **Estado:** ✅ Implementado (v7.24, ejecución directa del orquestador en paralelo al 017) · **Depende de:** 008, 016

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Hacer la ingesta de apuntes **confiable y auditable**: ningún `.md` entra al canon sin validación previa (fail fast con mensaje legible en vez de mutilación silenciosa por `charCount`), y toda regeneración emite un diff que distingue movimientos legítimos de `indexCode` (cambios de temario) de pérdidas reales (IDs eliminados o `code`/`chapterNumber` alterados).

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión `v7.24`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Orquestador (mejoras 1-2 de la Opción A): hoy una colisión de tupla natural se resuelve en silencio por prevalencia de `charCount` (v7.9) y una regeneración puede mover `indexCode` sin que nadie lo note (lo vivido con Sentencia/Prueba en v7.19.1 se detectó a ojo en la página). Este prompt convierte ambos puntos ciegos en fallos ruidosos y reportes legibles.

## ESTADO ACTUAL RELEVANTE

| Archivo | Función/Sección | Estado |
|---------|-----------------|--------|
| `generate_clean_notes_data.py` | `discover_fuentes_files()`, `deduplicate_sections()`, `assign_index_codes()` | Sin validación previa ni diff posterior |
| `.github/workflows/deploy-pages.yml` | Regenera en CI y publica | Punto de hook (lint antes, diff después) |
| `test_deduplication_flow.cjs` | Fixtures `tempfile`, invariante 103 | Base para aserciones del lint |

## CAMBIOS A IMPLEMENTAR

### PARTE A — `scripts/lint_fuentes.py` (nuevo, determinista, exit codes)

Valida cada `.md` de `fuentes/` con severidades `ERROR` (falla CI) y `WARN` (solo reporta):

- `ERROR`: encoding no UTF-8 decodificable, archivo > 512 KB, cero headings Markdown, colisión de tupla natural contra el canon de `FILES_CONFIG` sin estar registrado fijo (mensaje debe decir exactamente cómo registrarlo, precedente v7.13/v7.14).
- `WARN`: < 3 secciones detectables, headings duplicados textuales, `defaultChapterNum` inferido ambiguo.
- Salida: reporte humano a stdout + `lint_report.json` (machine-readable, mismo esquema siempre). Nunca modifica archivos.

### PARTE B — Diff report en el flujo de regeneración

- Antes de regenerar, snapshot `{id: (indexCode, code, chapterNumber, category)}` del `all_afg_topics.json` vigente; después, compara y clasifica: `added`, `removed`, `index_moved` (mismo id, distinto `indexCode` → INFO, esperado ante cambios de temario), `code_changed` y `chapter_changed` (→ ERROR, rompen progreso y citas).
- El diff se imprime legible en stdout (visible en log de CI) y se guarda como `regen_diff.json` (no comprometido). `removed` o `code_changed`/`chapter_changed` no vacíos → exit non-zero.
- Hook en `deploy-pages.yml`: `lint_fuentes.py` → `generate_clean_notes_data.py` → diff como pasos separados para logs aislados.

### PARTE C — SEGURIDAD

- El lint solo parsea texto (sin `exec`/`eval` sobre contenido de apuntes); tope de lectura 1 MB por archivo aunque el límite de error sea 512 KB.
- `regen_diff.json` y `lint_report.json` no se sirven como endpoints nuevos; si `server.py` los expone por estáticos, quedan fuera de allowlist como el resto de artefactos internos.

### PARTE D — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Aserciones: fixture con colisión deliberada → `ERROR` con mensaje de registro; archivo < 50 chars → ignorado como hoy; corrida que mueve `indexCode` sin tocar ids → solo INFO y exit 0; corrida que elimina un id → exit non-zero.
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 3.1 flujo de ingesta, Sección 8, bitácora v7.24).

## DEFINITION OF DONE

- [ ] `lint_fuentes.py` detecta colisión, encoding, tamaño y vacuidad con severidades correctas
- [ ] Diff clasifica `added/removed/index_moved/code_changed/chapter_changed` sin falsos positivos en regeneración limpia
- [ ] CI ejecuta lint → regen → diff como pasos separados y falla solo ante pérdida real
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- Este prompt NO depende del Vault 017: puede ejecutarse ya.
- Rollback = borrar `scripts/lint_fuentes.py`, el bloque diff y revertir el workflow: la regeneración vuelve a su estado actual.
