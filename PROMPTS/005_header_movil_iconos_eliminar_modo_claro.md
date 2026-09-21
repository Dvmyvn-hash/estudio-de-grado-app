# PROMPT — Header Móvil Solo-Íconos + Eliminación Definitiva del Modo Claro
### Proyecto: `estudio-de-grado-app` (GRADOMANÍA/GRADOMANIACOS)

**Contexto:** Evidencia visual (captura del header en móvil): el badge del candado se superpone y corta el logotipo de marca (`h1.brand-title`), y el chip de usuario muestra el nombre completo (`dpintovillaseca`) junto al ícono de logout, saturando el espacio horizontal disponible. Además, el ícono de alternancia de tema (sol/luna) sigue visible pese a que ya no se quiere ofrecer Modo Claro como opción.

## REGLA DE AISLAMIENTO ABSOLUTO
No modificar la lógica de autenticación (registro directo + purga de 48h ya cerrada en v7.0), el `CaseGeneratorAgent`, ni el prompt `PROMPTS/002_mejorar_agente_casos_complejidad_pauta.md` (pendiente de ejecución, no forma parte de esta tarea). Esta tarea es exclusivamente visual/CSS/JS de UI, limitada a `css/main.css` y al JS que controla el header/tema.

---

## Tarea A — Header móvil solo-íconos

1. **Localizar el breakpoint móvil ya definido** en `css/main.css` bajo "header responsive" (documentado desde v5.0) — usar ese mismo breakpoint, no crear uno nuevo.
2. Dentro de ese breakpoint, **ocultar únicamente el texto**, dejando el ícono visible, en:
   * El logotipo/badge de marca: ocultar `h1.brand-title` (o el span de texto que contenga), dejando visible solo el ícono (balanza/candado). Esto resuelve directamente la superposición reportada — no se trata de reducir tamaños de fuente, sino de no mostrar el texto en absoluto en este breakpoint.
   * El chip de usuario: ocultar el `span`/elemento que muestra el nombre o correo (`dpintovillaseca`), dejando visible solo el avatar y el ícono de logout.
3. **Accesibilidad:** cada elemento que quede sin texto visible debe conservar su significado para lectores de pantalla — agregar `aria-label` o `title` explícito (ej. `aria-label="GRADOMANÍA"` en el badge de marca, `aria-label="Cerrar sesión"` en el botón de logout, `aria-label="Menú de usuario"` en el chip/avatar) si no lo tienen ya.
4. El ícono de escudo/administración y el menú hamburguesa ya son solo-ícono — no requieren cambios, solo verificar que no se descuadren al remover el texto de los elementos vecinos.
5. **Fuera de este breakpoint (desktop/tablet):** el header mantiene su apariencia actual con textos completos — el cambio es exclusivo de la vista móvil.

## Tarea B — Eliminación definitiva del Modo Claro

1. Eliminar del DOM el botón/ícono de alternancia de tema (sol/luna) del header, en todos los breakpoints.
2. Eliminar la lógica JS asociada: lectura/escritura de preferencia de tema en `localStorage`, listener de `prefers-color-scheme`, y cualquier aplicación dinámica de `data-theme="light"` sobre `:root` o `<body>`.
3. Fijar **Dark Academy (oscuro) como único tema posible**: declarar `color-scheme: dark;` de forma permanente en `:root` en `css/main.css`, de modo que ningún navegador ni preferencia de sistema operativo pueda forzar un esquema claro nativo (inputs, scrollbars, etc.).
4. Los tokens WCAG AA de Modo Claro incorporados en v5.0 (`--gold-primary: #92400e`, `--danger-text: #b91c1c`, etc., bajo `[data-theme="light"]` o `@media (prefers-color-scheme: light)`) quedan **inalcanzables desde la UI**. No es obligatorio borrarlos del CSS (queda como limpieza opcional), pero si permanecen deben quedar claramente comentados como código muerto para no confundir a futuras revisiones.
5. Verificar visualmente que la app se ve idéntica en Dark Academy sin importar la configuración de tema del sistema operativo o navegador del dispositivo de prueba.

---

## Pruebas y cierre obligatorio (Regla §0 de CONTEXT.md)

1. Verificación visual en viewport móvil (320-390px): confirmar que el logotipo y el chip de usuario ya no se superponen ni se cortan, y que ambos siguen siendo tocables con área mínima de 44×44px.
2. `node test_unlock_auth_flow.cjs` (81/81) y `node test_e2e_case_flow.cjs` (114/114) deben mantenerse en 100% — este cambio no debería afectar ninguna de las dos suites, pero se ejecutan igual como regla de cierre.
3. Registrar hito **v7.2** en la Bitácora §9: simplificación del header móvil a solo-íconos (logotipo y chip de usuario) para eliminar superposición visual, y remoción definitiva del selector de Modo Claro, fijando Dark Academy como tema único e inmutable.
4. Actualizar `CONTEXT.md` si el nombre de clases/IDs cambia respecto a lo aquí descrito (usar los nombres reales encontrados en el código, no forzar los sugeridos si ya existen otros equivalentes).

## Fuera de alcance

No tocar el flujo de autenticación, purga de cuentas, el Agente de IA, ni ejecutar el prompt 002 (mejora del generador de casos) — eso se aborda por separado.
