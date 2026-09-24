# PROMPT 023 — Buscador Global del Header con Modos Semántico y Q&A

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 017 y 020 VERDES (Fase 0 de conformancia primero; 021 en curso: no duplicar ni pisar)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

El buscador global del header (`#global-search-input` + `#search-results-dropdown`, atajo Ctrl+K) incorpora un **selector de modo [Semántico | Q&A]**, cada modo con identidad visual propia (color + icono), reutilizando los mismos motores del sidebar sin duplicar ni bifurcar lógica: el modo Semántico lista cédulas y el modo Q&A compone respuestas extractivas, ambos sobre las 103 cédulas.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (IDs del DOM, Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión `v7.29`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: "unificar el buscador al que está en la barra superior, pero que sea diferente según la funcionalidad, e identificar Q&A y SEMÁNTICO con un color o un icono que lo distinga."
>
> **Decisión del orquestador:** no se crea un buscador nuevo ni se mueve el del sidebar: se extiende el `#global-search-input` existente con un segmentador de modo. Un solo controlador delega en `searchVault()` (017/020) o `composeAnswer()` (021); la identidad visual distingue los modos en input, resultados y estados.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué levantar del código real |
|----------|------------------------------|
| `#global-search-input` + `#search-results-dropdown` + `kbd.shortcut-key` | Implementación actual del buscador global en `js/app.js` (qué filtra hoy, dónde renderiza, atajo Ctrl+K) |
| Motores | Firmas reales de `searchVault()` y `composeAnswer()`, forma de sus resultados y sus gates de vacío |
| Sidebar Vault/Q&A | Render existente de resultados y respuestas a reutilizar (no copiar) |
| Tokens CSS | `--info-text: #0284c7` (Semántico, icono lupa) y dorado `--gold-primary` (Q&A, icono `help-circle`) sobre Dark Academy inmutable |
| Gateo v7.2 | Sidebar solo vive en vista `topics`; definir qué hace el header search fuera de ella |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Conformancia (obligatoria primero)

1. Verifica 017/020 verdes; si el 021 sigue en curso, lee su estado real y NO dupliques su UI ni sus funciones.
2. Mapea la implementación vigente del buscador global y escribe la tabla delta asumido-vs-real.
3. Recién entonces ejecuta A→B→C→D en orden.

### PARTE A — Segmentador de modo en el header (`index.html` + CSS)

- Junto a `#global-search-input`: pills `#search-mode-semantic` (lupa, azul info) y `#search-mode-qa` (help-circle, dorado), `role="radiogroup"`, persistiendo el último modo en `localStorage` (key propia, default Semántico).
- El input y el borde del dropdown adoptan el color del modo activo; cada resultado/respuesta lleva badge con icono+color de su modo. Cero texto nuevo en móvil (solo iconos, targets ≥ 44×44 px, sin romper `@media 768px`).

### PARTE B — Un solo controlador (`js/app.js`, sin lógica duplicada)

- El controlador del buscador global delega: modo Semántico → pipeline de resultados del sidebar; modo Q&A → `composeAnswer()` con su gate de vacío y disclaimer. Cambiar de modo re-ejecuta la query actual por el otro motor.
- Atajos: Ctrl+K enfoca, Enter abre el primer resultado, Esc cierra y limpia. Click en resultado → `App.openTopic(id, {highlight})` existente.
- Fuera de vista `topics`: ejecutar navega primero a `topics` (coherente con el gateo v7.2) y luego muestra resultados.

### PARTE C — SEGURIDAD Y ACCESIBILIDAD

- Mismo sanitizado de origen que sidebar (escape + `<mark>` post-escape); queries como texto siempre.
- `aria-label`s por modo, `aria-live="polite"` en el dropdown, foco visible con el color del modo.

### PARTE D — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Aserciones: pills conmutan modo y persisten; misma query por ambos motores da formatos distintos (lista vs respuesta) sobre las mismas cédulas; Enter/Esc/Ctrl+K; click navega con highlight; móvil ≥ 44 px sin overflow a 360 px; no-regresión del buscador global previo, sidebar Vault/Q&A y gateo v7.2.
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8: `#search-mode-*`; bitácora v7.29).

## DEFINITION OF DONE

- [ ] FASE 0: tabla delta escrita antes de programar; 021 no duplicado ni pisado
- [ ] Un controlador, dos modos con identidad azul/dorado + iconos en input, pills y resultados
- [ ] Cero scoring/render duplicado respecto al sidebar; gates y disclaimers intactos
- [ ] Móvil, teclado, ARIA y gateo de vistas verificados por tests
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR (anti-interferencia con 021 en curso)

- **Prohibido tocar:** `js/qa-composer.js`, `js/vault-search.js`, `js/vault-index.js`, `sinonimos.*`, `build_vault_index.py`, bloques `#qa-*` / `#vault-search-*` del sidebar salvo lectura.
- Staging solo con paths explícitos; en `CONTEXT.md` anexar sin reescribir entradas ajenas.
- Rollback = revertir el bloque del header a su buscador previo: sidebar y motores intactos.
