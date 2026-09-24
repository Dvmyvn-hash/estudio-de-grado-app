# PROMPT 029 — Repaso Visual de Apuntes: Tablas e Interlineado en PC y Móvil

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity, con verificación visual) · **Depende de:** ninguno (Fase 0 primero; no pisar trabajo en curso)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que tablas e interlineado de la sección Apuntes se vean impecables en PC y móvil: tablas sin cortes ni desbordes (scroll horizontal propio en móvil, layout íntegro en PC), interlineado legible y consistente, sin regresiones de Dark Academy ni del gateo de vistas.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 y Bitácora Sección 9 → próxima versión `v7.36`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano (reporte de usuaria con clave de visualización): "hay tablas que se ven mal en PC y en móvil en la sección de apuntes, como también hay problemas de interlineado."
>
> **Pistas del orquestador (verificadas en código):** `MarkdownParser.renderSingleTable` envuelve en `.table-responsive > table.reading-table`; `topic-viewer.css` tiene `overflow-x: hidden` en el bloque móvil (~línea 1377, sospechoso de recortar el scroll interno) e interlineados dispares (1.25–1.85 según selector). El fix va sobre estos dos archivos, no sobre los datos.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear con screenshots antes/después (PC 1440px + móvil 360px) |
|----------|---------------------------------------------------------------------|
| Tablas anchas de apuntes reales | Dónde se cortan/desbordan y qué contenedor las recorta |
| `.table-responsive` / `.reading-table` | Reglas vigentes y su cascada móvil |
| Interlineados 1.25–1.85 | Qué selectores rompen el ritmo de lectura y su valor objetivo |
| Dark Academy + gateo v7.2 | No-regresión visual general |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Auditoría visual (obligatoria primero)

Capturas antes/después en 2-3 cédulas con tablas reales (una por materia si es posible), PC + móvil. Lista cerrada de defectos con selector responsable cada uno. Sin esta evidencia no se programa.

### PARTE A — Tablas (`css/topic-viewer.css` + `js/markdown-parser.js` si aplica)

- Ningún contenedor ancestro con `overflow-x: hidden` sobre `.table-responsive` (el scroll horizontal vive en el wrapper, no en la página).
- En móvil: `display: block` + scroll-x con indicador visual, `min-width` por celda legible, header repetido/sticky opcional, celdas sin wrap roto (`overflow-wrap`, `hyphens` donde ayude).
- En PC: ancho completo sin compresión absurda, zebra/hover ya existentes intactos, celdas numéricas/arts sin quiebres (`white-space: nowrap` donde corresponda).
- Sanitizado intacto: el parser sigue escapando antes de etiquetar.

### PARTE B — Interlineado y ritmo (`css/topic-viewer.css`, `css/main.css` si aplica)

- Escala única documentada (ej. cuerpo 1.7, tablas 1.6, títulos 1.25-1.3, denso 1.5): unificar los ~15 valores actuales a la escala, sin tocar tipografías ni tokens de color.
- Párrafos, listas, callouts y citas con espaciado vertical consistente; citas largas sin compresión.

### PARTE C — SEGURIDAD Y ACCESIBILIDAD

- Contraste WCAG AA intacto en celdas/header; foco visible en scroll areas (`tabindex="0"` + `aria-label` donde el scroll sea por teclado); touch sin zonas muertas.

### PARTE D — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Extender `test_mobile_header_theme.cjs` o nuova sección análoga: a 360px cero overflow-x de página con tabla ancha, wrapper con scroll propio, `line-height` corporal ≥ 1.6, y regresión desktop (ancho completo, sin scroll interno innecesario).
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8, bitácora v7.36) con la escala tipográfica adoptada.

## DEFINITION OF DONE

- [ ] Auditoría con capturas y lista cerrada de defectos antes de programar
- [ ] Tablas íntegras en PC y con scroll propio en móvil (360px verificado)
- [ ] Escala de interlineado única, documentada y aplicada
- [ ] Cero regresión Dark Academy, gateo de vistas y suites 4/4 al 100%
- [ ] `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- Si hay trabajo en curso en `index.html`/`js/app.js`/header (023), no tocarlo: este prompt vive en visor de cédulas + CSS.
- Staging con paths explícitos; en `CONTEXT.md` anexar sin reescribir entradas ajenas.
- Rollback = revertir CSS/parser: los datos y motores no se enteran.
