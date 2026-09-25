# PROMPT 030 — Mejora General de Interfaz: Shell Óptimo, Jerarquía y Accesibilidad

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (después del 029) · **Depende de:** 029 (no tocar tablas/interlineado del visor hasta que 029 cierre)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que la interfaz general se sienta rápida, ordenada y premium en PC y móvil: mismo Obsidian & Gold (sin rebrand), pero con jerarquía clara, espaciado consistente, navegación fluida por header/sidebar/contenido, estados de carga/vacío/error coherentes, y accesibilidad WCAG AA. Sin regresiones de canon 103, Vault+QA+GB unificado (027), auth dual-mode (022) ni gateo de vistas.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 y Bitácora Sección 9 → próxima versión `v7.37`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar suites con pruebas de la nueva funcionalidad (ideal 4/4 + mobile).
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`, input único `#global-search-input`, sidebar solo temario `#topics-tree-container`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "para luego de la implementación del 029, dame un prompt para una mejora en la interfaz en general, que sea mucho más óptima y mejor, te doy libertad para que implantes lo que creas mejor."
>
> **Intención Nexo:** no rebrand ni dark/light nuevo (005 eliminó modo claro). Pulir el shell: tokens, layout, header, sidebar, feedback, motion y a11y. El 029 ya fija tablas/interlineado del visor — este 030 no los re-toca, solo los hereda.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear antes de programar |
|----------|-------------------------------|
| `css/main.css` tokens `:root` | Colores Obsidian & Gold, radios, sombras, `--transition-*`, escala `clamp()` |
| `index.html` shell `#app-container`, `header.app-header`, `aside#app-sidebar`, tabs `data-view` | Estructura, `Ctrl+K`, dropdown `#search-results-dropdown`, pills `#search-mode-selector` |
| `css/sidebar.css`, `css/modal.css`, `css/paywall.css`, `css/case-workshop.css`, `css/concept-graph.css` | Cascada, z-index, overlays, breakpoints 360px/768px/1440px |
| `test_mobile_header_theme.cjs` | Qué ya cubre de header/móvil para no duplicar |
| Dark Academy + gateo v7.2, Vault/QA en header (027/v7.34) | Contratos que no se pueden romper |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Auditoría visual + métricas (obligatoria primero)

- Capturas PC 1440px + móvil 360px de: header (reposo + dropdown abierto + modo QA), sidebar (temario largo, colapsado), visor de cédula larga, taller de casos, grafo, modal/paywall, estados vacío/error/sin red.
- Lista cerrada de ≤12 defectos con selector responsable cada uno (ej. "header tapa dropdown en 360px: `z-index` de `.app-header` vs `#search-results-dropdown`"). Sin esta lista no se programa.

### PARTE A — Tokens y layout shell (`css/main.css`, `index.html` mínimo)

- Documentar escala de espaciado 8pt (`--space-1..--space-8`), radios, sombras y `z-index` (header < dropdown < modal < toast) como comentarios-token al inicio de `main.css`. Reusar variables existentes, no renombrar colores.
- Shell: header `sticky` con altura fija, contenido con `max-width` de lectura (~72ch) centrado, sidebar con scroll propio (`overscroll-behavior: contain`), sin scroll horizontal de página a 360px.
- `content-visibility: auto` + `contain-intrinsic-size` solo en listas largas del sidebar/índice (no en visor de lectura ni dropdown de búsqueda).
- Respetar `safe-area-inset-*` y targets táctiles ≥44px en header/tabs/pills.

### PARTE B — Header + navegación (`index.html`, `css/main.css`, `js/app.js` si aplica)

- Dropdown `#search-results-dropdown`: no lo tapa el header, cierra con `Esc`, clic fuera y re-apertura con `Ctrl+K`; foco vuelve al `#global-search-input`. No crear segundo input (contrato 027).
- Tabs `Apuntes/Casos/Grafo`: estado activo visible por color + `aria-selected`/`aria-current`, foco visible por teclado, badge `#case-count-badge` sin desplazar layout (ancho reservado).
- Botón `#btn-toggle-sidebar`: en móvil abre/cierra con overlay + `aria-expanded`; en PC colapsa sin perder el temario ni el scroll.

### PARTE C — Sidebar temario (`css/sidebar.css`, `js/app.js` si aplica)

- Jerarquía: materia > bloque > cédula con indentación y `--civil/procesal/constitucional-color` intactos; `indexCode` (§) siempre visible, item activo con borde dorado + `aria-current="true"`.
- Progreso (`masteredTopicIds`): marca visible sin mover texto (icono a la derecha, ancho fijo); acciones Exportar/Importar en `.sidebar-progress-actions` sin overflow a 360px.
- Búsqueda filtrando el árbol: `empty-state` coherente ("Sin resultados en temario — prueba en el buscador global"), sin duplicar input del header.

### PARTE D — Feedback, motion y accesibilidad (todos los CSS, sin rebrand)

- Tres estados unificados con misma voz y estilo: `loading` (skeleton, no spinner gigante), `empty` (icono + texto + acción), `error` (texto + reintentar). Aplicar mínimo a: temario, resultados GB, QA `#qa-answer`, taller de casos.
- Motion: transiciones existentes a `var(--transition-*)`; `prefers-reduced-motion: reduce` desactiva scroll suave/parallax/shimmer. Sin animaciones nuevas pesadas.
- A11y WCAG AA: contraste intacto (no aclarar `--text-muted` sin test), foco visible `:focus-visible` dorado en todo interactivo, `tabindex="0"`+`aria-label` en scroll areas, iconos `lucide` siempre con `aria-hidden` + texto o `aria-label`, touch sin zonas muertas.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Extender `test_mobile_header_theme.cjs` (o sección análoga): a 360px cero overflow-x de página, dropdown sobre header con `Esc`/`Ctrl+K`, sidebar overlay con `aria-expanded`, targets ≥44px, `line-height` heredado del 029 sin regresión.
- E2E: navegar Apuntes→Casos→Grafo por teclado, abrir/cerrar dropdown, colapsar sidebar, forzar estados empty/error y verificar copy + acción.
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8 mapa CSS/DOM, bitácora v7.37) con tokens adoptados y lista de defectos cerrados.

## DEFINITION OF DONE

- [ ] Auditoría Fase 0 con capturas + lista ≤12 defectos antes de programar
- [ ] Shell sin overflow-x a 360px, lectura centrada en PC, sidebar con scroll propio
- [ ] Header/dropdown accesible por teclado (`Ctrl+K`, `Esc`, foco restaurado), un solo input global
- [ ] Sidebar con jerarquía, `aria-current` y progreso sin layout-shift
- [ ] Estados loading/empty/error unificados en temario, GB, QA y casos
- [ ] `prefers-reduced-motion` respetado, foco visible en todo, contraste AA intacto
- [ ] Cero regresión canon/Vault/QA/auth/gateo, suites 4/4 al 100%
- [ ] `CONTEXT.md` actualizado ( §8 + §9 v7.37 ) + commit convencional con paths explícitos

## NOTAS PARA EL EJECUTOR

- Después del 029: hacer `git pull`, `git status` (Anti trabaja en paralelo) y partir de `main` verde. Si el 029 sigue abierto, solo Fase 0.
- No tocar `topic-viewer.css` tablas/interlineado salvo overflow heredado; no tocar `server.py`/`db.py`/`vault_index.json`/`sinonimos.json`.
- Staging con paths explícitos (nunca `-A`); corridas largas en background a archivos + grep `FAIL`/conteos; PowerShell sin `&&` ni `grep/tail`.
- Rollback = revertir CSS/`app.js` shell: datos, índice y motores no se enteran.
