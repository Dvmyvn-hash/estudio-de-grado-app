---
name: Verificación total y release
description: Verificación completa pre-publicación de la plataforma (regenerar datos, 4 suites al 100%, commit convencional, push y deploy en GitHub Pages)
---

# Verificación total y release

Usa este skill antes de dar por terminado cualquier cambio funcional.

## Workflow

1. Regenera datos: `python generate_clean_notes_data.py` (sin errores).
2. Corre las 4 suites, todas al 100%:
   - `node test_deduplication_flow.cjs` → 11/11
   - `node test_e2e_case_flow.cjs` → 100% (el total varía, ~790-840, porque
     los presets generan 3-4 preguntas; lo que importa es 0 FAIL)
   - `node test_unlock_auth_flow.cjs` → 132/132
   - `node test_mobile_header_theme.cjs` → 20/20
   - Si un run E2E da 1-2 FAIL en citas y el rerun da 100%, es flaky
     conocido: reejecuta y registra el rerun verde.
3. Actualiza `CONTEXT.md` (única fuente de verdad): secciones afectadas +
   bitácora 9 con fecha, alcance y archivos.
4. Commit convencional (`feat|fix|docs(scope): ...`) y `git push origin main`.
5. Espera 2-3 min al deploy de Pages y verifica en incógnito / Ctrl+F5
   (el navegador cachea `js/data.js`).

## Prohibido

- Dar por terminada una tarea sin actualizar `CONTEXT.md`.
- Pushear con alguna suite en rojo.
- Editar a mano archivos generados (`all_afg_topics.json`, `js/data.js`).
