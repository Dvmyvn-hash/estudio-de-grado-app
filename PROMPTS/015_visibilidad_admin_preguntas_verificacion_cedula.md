# PROMPT 015 — Visibilidad Restringida a Administrador para las Preguntas de Verificación de Cédula (Modo Perfeccionamiento)

> **Versión:** v1.0 · **Fecha:** 2026-09-23 · **Autor:** puente (dpint)
> **Estado:** 📝 Por ejecutar · **Depende de:** 010 (contrato estructural 4×5 del `QuestionDeveloper`), 013 (roles admin/docente en `LicenseService`) y 014 (preguntas simples de combinación I–IV y modelos estructurales)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Suprimir de la vista pública de alumnos, usuarios en demo y postulantes con Pase Activo el apartado de **4 preguntas de verificación de grado** (`#section-quiz-developer`) al final de cada cédula en el visor de apuntes (`renderTopicViewer()` en `js/app.js`). El modelo de generación de preguntas aún está en fase de perfeccionamiento para retratar con máxima fidelidad los conocimientos y contenidos antes de ser expuesto a la totalidad de los usuarios. La sección de preguntas debe quedar **restringida y visible exclusivamente para el usuario administrador** desde su acceso de administración (`LicenseService.isAdminMode() === true`), con un banner de advertencia técnica («🧪 Modo Perfeccionamiento Admin»). El motor `QuestionDeveloper` (`js/question-developer.js`) y sus pruebas estructurales se conservan intactos.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo correlativamente al terminar (Sección 1.2, Sección 7.3 contratos, Sección 8 mapa de archivos — fila `js/app.js`, `test_e2e_case_flow.cjs` — y Bitácora de Versiones Sección 9 → próxima versión **v7.18**).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs`; incorporar las nuevas pruebas de gateo de visibilidad por rol en `test_e2e_case_flow.cjs`.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. **No romper contratos existentes:** `QuestionDeveloper` sigue existiendo, exportándose y generando sus 4 preguntas deterministas para las 103 cédulas. El botón manual de dominio de cédulas (`#btn-toggle-mastery` / `#btn-bottom-mastery`) permanece 100% operativo para todos los usuarios.

---

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL (en palabras del humano)

> *"Suprimamos el apartado de preguntas al final de cada seccion de momento, necesitamos perfeccionar el modelo para preguntas que retraten bien los conocimientos y contenidos, el modelo aun esta basico, una vez funcione mejor lo dejamos visible para todos, de momento que solo lo pueda ver yo desde el acceso de admin que poseo."*

---

## ESTADO ACTUAL RELEVANTE (levantado del código — no asumir)

1. **Renderizado del Visor de Cédulas (`js/app.js`):**
   - En `renderTopicViewer(topic)` (línea 889): ya se obtiene `const isAdmin = LicenseService.isAdminMode();`.
   - En la línea 944: actualmente se evalúa `if (isUnlocked && typeof QuestionDeveloper !== 'undefined')` para construir el bloque `quizHtml` con el contenedor `<section id="section-quiz-developer">`. Esto hace que **cualquier usuario con la materia desbloqueada vea las preguntas al final de la lectura**.
   - En la línea 1052: `quizHtml` se inyecta al final de la columna de lectura (`.topic-reading-col`).
   - En las líneas 1353–1405: se adjunta el listener click sobre `#section-quiz-developer`. Si dicho contenedor no existe en el DOM (`if (quizContainer)`), no se adjunta nada y la aplicación funciona de forma transparente sin errores.
2. **Servicio de Licencias y Modo Administrador (`js/auth-license.js`):**
   - `LicenseService.isAdminMode()` devuelve `true` cuando hay una sesión activa de administrador (`almabaltoamial2020` o cuenta de presentación docente `profesoresafg202602`).
   - `LicenseService.isFullAdmin()` devuelve `true` exclusivamente para el rol pleno `admin`.
3. **Marcado de Dominio de Cédula:**
   - Todo alumno puede seguir marcando sus cédulas dominadas manualmente a través del botón `#btn-toggle-mastery` en el header o `#btn-bottom-mastery` al final de la lectura, sumando porcentaje a su avance y sincronizándolo entre dispositivos.
   - En modo admin, acertar 4/4 en el cuestionario sigue auto-marcando la cédula vía `StorageService.markTopicMastered()`.

---

## CAMBIOS A IMPLEMENTAR

### PARTE A — Gateo Condicional de Visibilidad en `js/app.js`

1. **Condición de Renderizado en `renderTopicViewer(topic)`:**
   Modificar la condición que genera `quizHtml` para que requiera explícitamente estar en modo administrador:
   ```javascript
   // Desarrollador de Preguntas de Grado — Restringido a Modo Admin (v7.18)
   let quizHtml = '';
   const canViewQuiz = isAdmin && isUnlocked && typeof QuestionDeveloper !== 'undefined';
   if (canViewQuiz) {
     // ... generación del HTML del cuestionario ...
   }
   ```
2. **Insignia Visual de Laboratorio / Perfeccionamiento:**
   Dentro de la cabecera `.quiz-dev-header` de `#section-quiz-developer`, incorporar un badge sutil distintivo que recuerde al administrador el estado de la función:
   ```html
   <span class="quiz-admin-only-badge" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(217, 119, 6, 0.15); color: #d97706; border: 1px solid rgba(217, 119, 6, 0.35); margin-left: 8px;">
     <i data-lucide="lock" style="width: 10px; height: 10px; vertical-align: middle;"></i> Modo Perfeccionamiento (Visible solo para Admin)
   </span>
   ```

### PARTE B — Preservación del Motor y Módulo `QuestionDeveloper`

1. `js/question-developer.js` permanece intacto en su lógica y APIs (`getSectionQuestions`, `detectNature`, `extractCitations`, `validateSectionQuestions`, etc.).
2. No alterar los contratos de generación determinista PRNG ni los formatos I–IV implementados en v7.17.
3. El script `<script src="js/question-developer.js"></script>` sigue cargándose en `index.html` para estar disponible inmediatamente cuando el admin inicie sesión.

### PARTE C — Pruebas Automatizadas en `test_e2e_case_flow.cjs`

Crear una nueva sección de pruebas en `test_e2e_case_flow.cjs`:
**`--- 27. GATEO DE VISIBILIDAD DEL CUESTIONARIO POR ROL ADMIN (v7.18) ---`**
1. **Prueba 27.1:** En sesión de usuario regular (no admin / `isAdminMode() === false`), el renderizado de cualquier cédula (`renderTopicViewer`) **NO** contiene el contenedor `#section-quiz-developer` ni la clase `.quiz-question-card` en el DOM resultante.
2. **Prueba 27.2:** En sesión de administrador (`isAdminMode() === true`), el renderizado de la cédula **SÍ** contiene `#section-quiz-developer`, despliega las 4 preguntas de grado y la insignia `.quiz-admin-only-badge`.
3. **Prueba 27.3:** El cierre de sesión de administrador (`setAdminMode(false)`) oculta reactivamente el cuestionario en posteriores lecturas de cédulas.
4. **Prueba 27.4:** El botón manual de dominio `#btn-bottom-mastery` sigue presente en el DOM y operativo tanto para usuarios no-admin como para admin.
5. **Prueba 27.5:** Regresión: las llamadas directas a `QuestionDeveloper.getSectionQuestions(topic)` siguen respondiendo con las 4 preguntas de selección múltiple según el contrato v7.11/v7.17.

### PARTE D — Actualización Obligatoria de `CONTEXT.md`

Actualizar `CONTEXT.md` como única fuente de verdad:
- **Sección 1.2:** Documentar que el apartado de verificación al pie de la cédula se encuentra en fase de perfeccionamiento y gateado temporalmente al rol administrador.
- **Sección 7.3:** Añadir la especificación de la nueva Sección 27 de la suite `test_e2e_case_flow.cjs` con su conteo exacto de pruebas al 100% PASS.
- **Sección 8:** Actualizar la fila de `js/app.js` y `test_e2e_case_flow.cjs`.
- **Sección 9:** Registrar la versión **v7.18** con la misión, cambios y conteos de pruebas.
- **`PROMPTS/README.md`:** Actualizar la tabla con la fila 015 en estado `✅ Implementado (v7.18)`.

---

## DEFINITION OF DONE

- [ ] Un usuario común, demo o estudiante con Pase Activo sin clave de admin **no ve** `#section-quiz-developer` al final de las cédulas.
- [ ] Un usuario autenticado con clave de administrador (`almabaltoamial2020` o cuenta docente) **sí ve** `#section-quiz-developer` con la insignia de modo perfeccionamiento.
- [ ] El botón de marcado manual `#btn-toggle-mastery` y `#btn-bottom-mastery` sigue visible y funcionando para todos.
- [ ] La suite `node test_e2e_case_flow.cjs` incorpora la Sección 27 y pasa al 100%.
- [ ] Las suites `test_unlock_auth_flow.cjs`, `test_mobile_header_theme.cjs` y `test_deduplication_flow.cjs` pasan al 100%.
- [ ] `CONTEXT.md` y `PROMPTS/README.md` actualizados exhaustivamente.
- [ ] Commit y push a `origin/main` realizados limpiamente.

---

## NOTAS PARA EL EJECUTOR

- En `js/app.js`, la variable `isAdmin` ya se calcula al inicio de `renderTopicViewer(topic)` con `const isAdmin = LicenseService.isAdminMode();`. Basta con condicionar `quizHtml` a `isAdmin`.
- No toques `server.py` ni la base de datos `db.py`; este cambio es de presentación y gateo en la capa de UI.
