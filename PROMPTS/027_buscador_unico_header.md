# PROMPT 027 — Buscador Único: Todo al Header, Cero Duplicados en Sidebar

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity, con verificación visual) · **Depende de:** 017, 020, 021 y 023 VERDES (Fase 0 primero)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Un solo buscador en la barra superior con todas las funciones: el header alberga el ÚNICO punto de búsqueda (modos Semántico/Q&A + filtros + historial + respuestas + huecos) y el sidebar queda solo con el índice de cédulas. Hoy hay 3 cajas (`#global-search-input`, `#vault-search-box`, `#qa-container`): deben quedar en 1 sin perder ni una función.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (IDs del DOM, Sección 8 y Bitácora Sección 9 → próxima versión `v7.34`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "hay 3 buscadores desplegados; quiero solo 1 en la barra superior con todas las funciones."
>
> **Decisión del orquestador:** no se reescribe ningún motor (`searchVault`, `composeAnswer`, filtros, historial, gaps, blindaje anti-inyección del 023 se heredan tal cual). Es refactor de *presentación*: el dropdown del header absorbe los bloques del sidebar, que se eliminan del DOM (no `display:none`: cero exposición duplicada).

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear |
|----------|------------|
| `#global-search-container` + pills 023 | Controlador, modos, atajos Ctrl+K/Enter/Esc |
| `#vault-search-box` (filtros, historial, resultados) | Render y estados a migrar al dropdown |
| `#qa-container` (3 modos, `#qa-answer`, gaps) | Render y estados a migrar al dropdown |
| Gateo v7.2 + móvil 768px | Dónde puede vivir el dropdown sin romper vistas ni touch targets |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Conformancia (obligatoria primero)

Tabla delta del header, sidebar y motores vigente; screenshots o inspección visual antes/después (el ejecutor SÍ tiene navegador: úsalo).

### PARTE A — Dropdown único del header (única UI de búsqueda)

- El dropdown de `#global-search-container` absorbe, con sus IDs y lógica intactos, filtros (`#vault-filter-*`), historial, resultados, modos Q&A, `#qa-answer` y panel de huecos. Identidad por modo ya definida (azul Semántico / dorado Q&A) se conserva y extiende a los bloques migrados.
- Se eliminan del sidebar `#vault-search-box` y `#qa-container` completos (HTML + CSS huérfano + wiring muerto). El sidebar vuelve a ser solo índice.
- Un solo controlador (el del 023 extendido): cero scoring/render duplicado; atajos y ARIA vigentes.

### PARTE B — Comportamiento y responsive

- Modo persiste (key existente); cambiar de modo re-ejecuta; click navega con highlight; fuera de `topics` navega primero (gateo v7.2 intacto).
- Móvil: el dropdown ocupa overlay de ancho completo bajo el header, targets ≥ 44 px, sin overflow a 360 px, Ctrl+K hint solo desktop.

### PARTE C — SEGURIDAD

- Hereda blindaje 023 (input inerte, tope 200, sin eval/regex cruda, jailbreaks sin efecto) en el único input resultante; quita cualquier handler duplicado que quede huérfano (cero listeners fantasma).

### PARTE D — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Aserciones: un solo input de búsqueda en todo el DOM; las 3 funciones responden desde el header (lista / respuesta / huecos); filtros e historial operan en el dropdown; no-regresión de motores, gates, disclaimers, gateo de vistas y móvil; verificación visual documentada (qué se miró).
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8: IDs retirados y vigentes; bitácora v7.34).

## DEFINITION OF DONE

- [ ] FASE 0 con evidencia visual antes/después
- [ ] Exactamente 1 superficie de búsqueda; sidebar sin cajas; 0 funciones perdidas
- [ ] Cero lógica duplicada; blindaje y gates intactos
- [ ] Móvil, teclado, ARIA y vistas verificados con tests + inspección visual
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- Staging con paths explícitos; en `CONTEXT.md` anexar sin reescribir entradas ajenas.
- Rollback = restaurar los dos bloques del sidebar desde git y revertir el dropdown: motores intactos.
