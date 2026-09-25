# PROMPT 032 — Índice Jerárquico Visual: etiqueta materia.capítulo.sección + capítulos colapsables (sin tocar datos)

> **Versión:** v1.0 · **Fecha:** 2026-09-25 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** v7.40 verde (canon 205). No toca parser, Vault, QA, cruces ni auth.

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho. Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que el sidebar se vea ordenado con 205 cédulas: cada ítem muestra etiqueta jerárquica `materia.capítulo.sección` (ej. Acto Jurídico `1.1.1`, Bienes `1.2.1`, Comodato cap 13 `1.13.1`) derivada solo para نمایش, agrupada bajo cabeceras de capítulo colapsables con conteo. El `indexCode` plano continuo (`1.40`, `1.41`…`1.141`) y todos los datos quedan intactos. Cero regresiones de Vault, QA, cruces (031), mastery y suites.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa + Sección 9 → próxima versión `v7.41`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs`, `node test_mobile_header_theme.cjs`; ampliar suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (JS ES6 sin bundlers); no añadir dependencias.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`).
5. No romper contratos existentes (`indexCode` único y continuo por disciplina, `INITIAL_DATA`, `StorageService` mastery por topic id, `LicenseService`, `CaseGeneratorAgent`, input único `#global-search-input`, orden sidebar por min `indexCode` v7.19.1).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "en comodato, mutuo, mandato, hipoteca se subdividió mucho más de lo estipulado en el índice inicial; si existe un índice inicial en los md, él determina la subdivisión. Aparte, quiero el índice numerado jerárquico, ejemplo acto jurídico 1.1.1, bienes 1.2.1, para una subdivisión más ordenada y mejor estructura general."
>
> **Diagnóstico Nexo (verificado en código, no asumido):** los 5 contratos coinciden 100 % índice-inicial vs cédulas (comodato 27/27, mutuo 24/24, mandato 28/28, hipoteca 18/18, arrendamiento 5/5) — el parser ya respeta `Sección N.N` explícita y el índice manda en la práctica. Fusionar a 4 cédulas por capítulo NO es óptimo: rompería Vault (snippets), QA (citas), `QuestionDeveloper` (4 preguntas por cédula), cruces 031 (309 refs por id) y el progreso guardado de usuarios (mastery por topic id → se perdería). Decisión: granularidad intacta, orden visual jerárquico.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|----------|-------------------------------|
| `js/app.js` `renderSidebar()` (~778, `category-group`, `chapTitle`, `displayCode = t.indexCode \|\| t.code`, tooltip `Cédula ${indexCode} · Sección ${code}`) | Agrupación por capítulo, orden por min `indexCode`, badge actual |
| `css/sidebar.css` (`.category-group`, `.topic-item-right`, `content-visibility`, 030) | Dónde añadir estilos de cabecera colapsable y badge jerárquico sin layout-shift |
| `all_afg_topics.json` campos `subject`, `chapterNumber`, `code`, `indexCode`, `chapterTitle` | Fuente para derivar etiqueta `M.C.S` (ej. comodato cap 13 sec 1.1 → `1.13.1`) |
| `scripts/lint_fuentes.py` severidades ERROR/WARN | Dónde añadir chequeo índice-vs-cuerpo como WARN + reporte |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Auditoría (obligatoria primero)

- Confirmar en los 5 contratos + 3 archivos base que `subject/chapterNumber/code/indexCode` permiten derivar etiqueta única `M.C.S` sin colisiones visuales (reportar duplicados si los hay; ej. dos archivos con mismo capítulo).
- Lista cerrada de ≤8 defectos visuales del sidebar con 205 ítems (scroll, colapso, conteos). Sin esto no se programa.

### PARTE A — Etiqueta jerárquica visual (`js/app.js` + `css/sidebar.css`, solo display)

- Helper puro `displayHierCode(topic)` → `"M.C.S"` donde M = nº materia (civil 1, procesal 2, constitucional 3), C = `chapterNumber`, S = `code` (sección `N.N` tal cual, ej. `1.1` → etiqueta `1.13.1`). Si falta algún campo, fallback a `indexCode` (nunca vacío, nunca inventado).
- El badge del ítem muestra la etiqueta jerárquica; el tooltip conserva `Cédula ${indexCode} · Sección ${code} (archivo)` para trazabilidad. `aria-label` del ítem incluye ambas.
- Ancho fijo del badge (anti layout-shift, hereda 030); `escapeHtml` en todo.

### PARTE B — Capítulos colapsables con conteo (sidebar)

- Cabecera de cada `category-group`: `Capítulo C · Título (N cédulas)` + chevron, colapsable con estado en memoria (no en `localStorage` de progreso; si se persiste, clave propia aislada de la exportación de `StorageService`).
- Todo colapsado excepto el capítulo de la cédula activa al abrir (`aria-current`), que se expande y hace scroll al ítem. `aria-expanded` sincronizado (hereda 030).
- Móvil 360px: cero overflow-x, targets ≥44px, `overscroll-behavior` y `content-visibility` intactos.

### PARTE C — Blindaje "el índice manda" (`scripts/lint_fuentes.py`, WARN no bloqueante)

- Nuevo chequeo: en archivos con bloque `**Índice**` inicial, contar bullets `Capítulo/Sección` vs headings `##/###` del cuerpo; descalce → `WARN indice-descalce` con diff en reporte (no ERROR: el cuerpo manda al publicar, el índice es decorativo; decisión Nexo a pedido "haz lo que estimes").
- Documentar la regla en el reporte del lint.

### PARTE D — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Nuevas aserciones: etiqueta `M.C.S` presente en cada ítem y única por capítulo; `indexCode` en datos intacto (byte-idéntico `all_afg_topics.json` salvo nada — este prompt NO regenera datos); colapso/expanso + `aria-expanded`; capítulo activo auto-expandido; WARN de lint ante fixture con índice descalzado; móvil 360px sin overflow.
- Suites 4/4 al 100% + `CONTEXT.md` (§8+§9 v7.41) con formato de etiqueta y decisión de granularidad.

## DEFINITION OF DONE

- [ ] Auditoría Fase 0 con unicidad `M.C.S` verificada + lista ≤8 defectos
- [ ] Sidebar con etiquetas jerárquicas, capítulos colapsables con conteo y capítulo activo expandido
- [ ] `all_afg_topics.json`, `js/data.js`, `vault_index.json`, `dogmatic_connections.json` byte-idénticos (cero regeneración)
- [ ] Vault/QA/cruces/mastery/tests sin regresión; suites 4/4 al 100%
- [ ] Lint con WARN `indice-descalce` documentado
- [ ] `CONTEXT.md` (§8+§9 v7.41) + commit convencional con paths explícitos

## NOTAS PARA EL EJECUTOR

- `git pull` + `git status` primero (Anti trabaja en paralelo); parte de `main` verde.
- Prohibido: cambiar `indexCode`, `code`, `id`, `chapterNumber`, regenerar datos o reindexar; tocar `server.py`/`db.py`/auth/ventas.
- Staging con paths explícitos (nunca `-A`); corridas largas en background a archivos + grep `FAIL`/conteos; PowerShell sin `&&` ni `grep/tail`.
- Rollback = revertir `app.js`/`sidebar.css`/`lint_fuentes.py`: datos y motores no se enteran.
