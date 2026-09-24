# PROMPT 024 — Protocolo de Crecimiento del Canon (nuevo apunte sin romper suites)

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 008, 016, 019

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que agregar un apunte a `fuentes/` sea rutina sin heridos: el canon crece (103 + N), el orden temario se preserva, **ninguna suite queda en rojo por conteos hardcodeados** y `CONTEXT.md` refleja los rangos nuevos. El pipeline ya indexa solo (008/016); este prompt cierra la brecha de mantenimiento.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 2.5 rangos por materia, Sección 8 y Bitácora Sección 9 → próxima versión `v7.30`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "el canon va aumentando según los archivos que se suban, ¿eso está así? Si no, especifiquémoslo como tarea."
>
> **Veredicto del orquestador:** el crecimiento automático existe (`build_files_config()` + auto-ubicación + CI), pero tres cosas son manuales y hoy romperían el verde: (1) suites con `103` hardcodeado, (2) registro fijo de choques en `FILES_CONFIG`, (3) rangos de `CONTEXT.md` §2.5. Este prompt las convierte en protocolo repetible.

## ESTADO ACTUAL RELEVANTE (levantar en ejecución, no asumir)

| Elemento | Qué mapear |
|----------|------------|
| Suites | Todas las aserciones con conteos fijos (103, 34/59/10, rangos `indexCode`) en `test_deduplication_flow.cjs` y `test_e2e_case_flow.cjs` |
| `scripts/lint_fuentes.py` | Guía existente para choques (mensaje de registro) |
| `CONTEXT.md` §2.5 | Rangos documentados por materia a reescribir |

## CAMBIOS A IMPLEMENTAR

### PARTE A — Conteos derivados, no hardcodeados (suites)

- Centraliza el total esperado: cada suite calcula `CANON_ESPERADO` regenerando o leyendo `all_afg_topics.json` + conteo por materia, en vez del literal `103`.
- Mantiene invariantes duros (los que sí deben fallar siempre): cero `indexCode` duplicados, continuidad `N.M` sin huecos por materia, unicidad de tupla natural, orden temario (Discusión→Prueba→Sentencia verificado por rangos relativos, no absolutos).
- Los rangos absolutos por materia pasan a tabla derivada del temario (misma fuente que `TEMARIO_CANONICO`), no a literales.

### PARTE B — Registro de choques (una sola vía)

- Si `lint_fuentes.py` reporta `colision-canon`, el apunte se registra fijo en `FILES_CONFIG` con capítulos propios (precedente v7.13/v7.14) y se documenta el porqué en una línea de `CONTEXT.md` §3.1. Prohibido "arreglarlo" tocando el canon existente.

### PARTE C — Cierre documental por cada apunte nuevo

- `CONTEXT.md` §2.5 (rangos), §8 si hay archivos nuevos, bitácora patch (ej. `v7.30.1 SUCESIONES`) con fecha y conteo nuevo por materia.
- `git push` dispara CI (lint → regen → diff → Vault); el diff debe salir sin ERROR.

### PARTE D — SEGURIDAD

- Sin cambios de superficie: el apunte nuevo pasa por el mismo lint y las mismas validaciones; nada aquí relaja `max_uses`, sesiones ni CORS.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Prueba del protocolo con fixture temporal (estilo `SUCESIONES.md`): agregarlo sube el total, todo sigue verde, quitarlo lo restaura (las suites deben pasar en ambos estados sin editar literales).
- Suites 4/4 al 100% + `CONTEXT.md` actualizado.

## DEFINITION OF DONE

- [ ] Cero literales `103`/`34`/`59`/`10` como verdad en suites (derivado o tabla temario)
- [ ] Invariantes duros intactos y verificados (unicidad, continuidad, orden relativo)
- [ ] Fixture de crecimiento pasa en ambos estados sin tocar código de tests
- [ ] Choque documentado solo vía `FILES_CONFIG`, jamás tocando canon
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- No cambies el pipeline de ingesta (008/016/019): solo cómo las suites y docs absorben el crecimiento.
- Si el 022/023 siguen pendientes, no los toques ni los esperes: este prompt es ortogonal.
- Rollback = revertir suites y docs: el canon y el pipeline no se enteran.
