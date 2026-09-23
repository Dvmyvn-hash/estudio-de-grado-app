# PROMPT 015 — Visibilidad Restringida a Administrador para las Preguntas de Verificación de Cédula (Modo Perfeccionamiento)

> **Versión:** v2.0 (Edición de Ingeniería Avanzada) · **Fecha:** 2026-09-23 · **Autor:** puente (dpint)
> **Estado:** ✅ Implementado (v7.18) · **Depende de:** 010 (contrato estructural 4×5 del `QuestionDeveloper`), 013 (roles admin/docente en `LicenseService`) y 014 (preguntas simples de combinación I–IV y modelos estructurales)

---

## ROL

Actúa como **ingeniero de software senior y arquitecto de producto** en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de alta exigencia para el Examen de Grado en Derecho en Chile (Derecho Civil, Procesal y Constitucional). Implementa de forma integral y rigurosa la siguiente directiva técnica, respetando la arquitectura *vanilla*, el contrato de ciberseguridad, las reglas canónicas del repositorio y la inmutabilidad de `CONTEXT.md`.

---

## MISIÓN Y VISIÓN ESTRATÉGICA

### 1. El Fundamento Pedagógico y de Producto
El Examen de Grado de Derecho en Chile es una instancia académica de máxima rigurosidad dogmática y forense. En la versión v7.17 se implementó con éxito el perfil simple de combinación clásica I–IV y la infraestructura compiladora de `MODELOS_DE_PRUEBA/`. No obstante, el generador de preguntas aún se encuentra en una etapa básica de extracción sintáctica que requiere maduración, ajuste fino de distractores y calibración doctrinaria antes de ofrecer una experiencia pedagógica impecable al postulante.

Exponer a los alumnos preguntas que aún no retraten con máxima precisión y profundidad los contenidos esenciales de cada apunte puede inducir a confusión, devaluar la percepción de calidad del workbench o generar falsas sensaciones de dominio.

### 2. El Objetivo Técnico
**Suprimir de forma absoluta del DOM público** el contenedor de preguntas de verificación (`#section-quiz-developer`) al final de cada cédula en el visor de temas (`renderTopicViewer()` en `js/app.js`), de modo que **ningún alumno regular, postulante en versión demo ni usuario con Pase Activo** visualice el cuestionario.

El cuestionario debe quedar **restringido y visible exclusivamente para sesiones con rol de administración activo** (`LicenseService.isAdminMode() === true`), funcionando como un **Laboratorio Interno de Perfeccionamiento (Admin Lab Mode)**. Allí, el administrador podrá auditar, responder y calibrar las preguntas de cada cédula en caliente con una insignia visual distintiva, mientras el motor evoluciona en privado hasta alcanzar el estándar de excelencia definitivo.

---

## REGLAS INMUTABLES DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad (*Single Source of Truth*):** Al finalizar la implementación, actualizar correlativamente las Secciones 1.2 (visión funcional del quiz), 7.3 (contratos y aserciones de la nueva Sección 27 de la suite E2E), 8 (mapa de archivos y responsabilidades para `js/app.js` y `test_e2e_case_flow.cjs`) y 9 (Bitácora de Versiones formalizando la versión **v7.18**).
2. **100 % PASS en todas las suites de prueba:**
   - `node test_unlock_auth_flow.cjs` (132/132 pruebas).
   - `node test_e2e_case_flow.cjs` (incorporar Sección 27 y certificar 100% PASS).
   - `node test_deduplication_flow.cjs` (8/8 pruebas).
   - `node test_mobile_header_theme.cjs` (20/20 pruebas).
3. **Cero Exposición y Cero Residuos en el DOM:** No se permite ocultar el cuestionario mediante `display: none` o clases CSS que dejen el marcado o las respuestas expuestas al inspector web del navegador. Para usuarios no-admin, el bloque HTML del cuestionario **no debe existir en el DOM**.
4. **Preservación Total del Avance y Funcionalidad del Temario:**
   - El botón manual de marcado de dominio (`#btn-toggle-mastery` en header y `#btn-bottom-mastery` al pie del apunte) continúa siendo el mecanismo canónico para que los estudiantes acrediten su estudio, incrementen su avance porcentual y sincronicen su progreso en la base de datos vía `GET/POST /api/user/topic-mastery`.
   - El motor `QuestionDeveloper` (`js/question-developer.js`), sus contratos estructurales v7.11 (4 preguntas × 5 alternativas, soluciones dogmáticas ≥ 150 caracteres con `"Conclusión:"`, citas subconjunto estricto y PRNG determinista) y la infraestructura de `MODELOS_DE_PRUEBA/` se conservan 100% operativos en el repositorio.

---

## CONTEXTO DE LA IDEA ORIGINAL (en palabras del creador)

> *"Suprimamos el apartado de preguntas al final de cada sección de momento, necesitamos perfeccionar el modelo para preguntas que retraten bien los conocimientos y contenidos, el modelo aún está básico, una vez funcione mejor lo dejamos visible para todos, de momento que solo lo pueda ver yo desde el acceso de admin que poseo."*

---

## ESTADO ACTUAL DEL CÓDIGO (Auditoría Técnica)

### 1. Renderizado en el Workbench (`js/app.js`):
- En `renderTopicViewer(topic)` (línea ~889):
  ```javascript
  const isAdmin = LicenseService.isAdminMode();
  ```
- En la línea ~944:
  ```javascript
  let quizHtml = '';
  if (isUnlocked && typeof QuestionDeveloper !== 'undefined') {
    // Genera questionsHtml, solución dogmática, pauta y section#section-quiz-developer
  }
  ```
  *Diagnóstico:* Actualmente basta con que la materia esté desbloqueada (`isUnlocked === true`) para que el cuestionario se inyecte en `quizHtml` y se incruste en `.topic-reading-col` (línea ~1052).
- En las líneas ~1353–1405:
  ```javascript
  const quizContainer = container.querySelector('#section-quiz-developer');
  if (quizContainer) {
    quizContainer.addEventListener('click', (e) => { ... });
  }
  ```
  *Diagnóstico:* El listener click ya posee salvaguarda condicional (`if (quizContainer)`). Si el contenedor no se inyecta en el DOM, el listener no se registra y no se produce ningún error de ejecución.

### 2. Roles y Modos en `LicenseService` (`js/auth-license.js`):
- `LicenseService.isAdminMode()`: Devuelve `true` cuando existe una sesión administrativa activa (tanto para el rol pleno `admin` con clave `almabaltoamial2020` como para la cuenta de presentación `docente` con clave `profesoresafg202602`).
- `LicenseService.isFullAdmin()`: Devuelve `true` únicamente ante el rol pleno `admin`.
- *Criterio de Diseño:* Ambos roles administrativos tienen derecho a visualizar las preguntas en este modo de perfeccionamiento, permitiendo al creador y a los docentes evaluar la calidad de los cuestionarios en privado.

---

## ESPECIFICACIÓN DE LOS CAMBIOS A IMPLEMENTAR

### PARTE A — Gateo Condicional Estricto en `js/app.js`

1. **Condición de Inyección en `renderTopicViewer(topic)`:**
   Refactorizar la condición de generación de `quizHtml` (alrededor de la línea 944) para exigir que el usuario posea modo administrador activo:
   ```javascript
   // =========================================================================
   // DESARROLLADOR DE PREGUNTAS DE GRADO — MODO PERFECCIONAMIENTO ADMIN (v7.18)
   // El cuestionario está suprimido para el público general mientras se calibra
   // la calidad dogmática del modelo. Solo visible para sesión con rol admin.
   // =========================================================================
   let quizHtml = '';
   const canViewQuiz = isAdmin && isUnlocked && typeof QuestionDeveloper !== 'undefined';

   if (canViewQuiz) {
     const questions = QuestionDeveloper.getSectionQuestions(topic);
     // ... construcción del estado y de questionsHtml ...
   ```

2. **Insignia Visual de Laboratorio (Admin Lab Badge):**
   Dentro del encabezado `.quiz-dev-header` de `#section-quiz-developer`, agregar junto al título un badge informativo acorde con la estética *Dark Academy*:
   ```html
   <div class="quiz-dev-title-wrap">
     <h2 class="quiz-dev-main-title">🎓 Verificación de Cédula — Desarrollador de Preguntas del Agente</h2>
     <span class="quiz-admin-lab-badge" title="Cuestionario en desarrollo interno: visible exclusivamente para administradores">
       <i data-lucide="flask-conical" style="width: 12px; height: 12px; vertical-align: middle;"></i> Modo Perfeccionamiento (Solo Admin)
     </span>
     <span id="quiz-nature-badge" ...>
   ```

3. **Estilos en `css/main.css`:**
   Añadir el estilo para `.quiz-admin-lab-badge` asegurando contraste WCAG AA sobre fondo oscuro:
   ```css
   .quiz-admin-lab-badge {
     display: inline-flex;
     align-items: center;
     gap: 5px;
     font-size: 0.72rem;
     font-weight: 600;
     padding: 2px 8px;
     border-radius: 4px;
     background: rgba(217, 119, 6, 0.15);
     color: #fbbf24;
     border: 1px solid rgba(245, 158, 11, 0.35);
     letter-spacing: 0.02em;
     text-transform: uppercase;
   }
   ```

### PARTE B — Garantía del Flujo de Avance del Estudiante

1. **Persistencia del Botón de Dominio Manual:**
   Verificar que el bloque inferior de lectura `.topic-reading-actions` (que aloja `#btn-bottom-mastery`) continúe renderizándose inmediatamente al término del texto del apunte cuando el cuestionario no esté presente, ofreciendo una experiencia de lectura pulcra, directa y libre de distracciones.
2. **Manejo del Auto-Completado 4/4 en Modo Admin:**
   En sesión de administrador, si este resuelve el cuestionario y acierta las 4 preguntas, `StorageService.recordTopicAnswer` y `StorageService.markTopicMastered` continúan operando con normalidad, desplegando `#quiz-completed-banner` y actualizando la barra de progreso.

### PARTE C — Pruebas Automatizadas E2E en `test_e2e_case_flow.cjs`

Crear la nueva sección de pruebas al final de `test_e2e_case_flow.cjs`:

```javascript
// =========================================================================
// 27. GATEO DE VISIBILIDAD DEL CUESTIONARIO POR ROL ADMIN (v7.18, PROMPT 015)
// =========================================================================
```

La suite debe incluir las siguientes aserciones explícitas:
1. `27.1: En sesión de usuario regular (isAdminMode === false), renderTopicViewer NO inyecta #section-quiz-developer en el HTML resultante`.
2. `27.2: En sesión de usuario regular (isAdminMode === false), el marcado generado NO contiene elementos con clase .quiz-question-card`.
3. `27.3: En sesión de usuario regular, el botón manual #btn-bottom-mastery permanece visible y disponible al pie del apunte`.
4. `27.4: En sesión de administrador (isAdminMode === true), renderTopicViewer SÍ inyecta #section-quiz-developer`.
5. `27.5: En sesión de administrador, el cuestionario renderiza exactamente 4 tarjetas .quiz-question-card con sus 5 opciones A-E`.
6. `27.6: En sesión de administrador, la cabecera del cuestionario despliega la insignia .quiz-admin-lab-badge`.
7. `27.7: Al alternar el estado de administrador (setAdminMode(false) -> setAdminMode(true) -> setAdminMode(false)), la presencia de #section-quiz-developer responde de forma reactiva y determinista`.
8. `27.8: Regresión estructural: QuestionDeveloper.getSectionQuestions(topic) sigue generando las 4 preguntas deterministas con soluciones terminadas en "Conclusión:" y citas subconjunto de fuentes reales`.

---

## ACTUALIZACIÓN DE CONTEXT.MD (Single Source of Truth)

Debe actualizarse con el estándar de exactitud habitual:
1. **Sección 1.2 (Filosofía y Arquitectura):** Aclarar en el acápite del Desarrollador de Preguntas que, desde v7.18, la interfaz del cuestionario se encuentra temporalmente gateada al rol administrador (`LicenseService.isAdminMode()`) como Laboratorio de Perfeccionamiento Dogmático, permitiendo a los alumnos enfocarse en la lectura y el marcado manual de avance sin exponer preguntas en calibración.
2. **Sección 7.3 (Contratos y Pruebas Automatizadas):** Documentar la **nueva Sección 27 de `test_e2e_case_flow.cjs`**, especificando las aserciones añadidas y el nuevo conteo total exacto de pruebas al 100% PASS.
3. **Sección 8 (Mapa de Archivos):** Actualizar las filas de `js/app.js` (gateo de `#section-quiz-developer` por rol admin), `css/main.css` (estilo `.quiz-admin-lab-badge`), y `test_e2e_case_flow.cjs` (Sección 27).
4. **Sección 9 (Bitácora de Versiones):** Incorporar la entrada formal de la versión **v7.18**:
   - Título: `v7.18 (Visibilidad Restringida a Administrador de Preguntas de Verificación — Modo Perfeccionamiento — PROMPT 015)`.
   - Detalle de la misión, motivación pedagógica, cambios en `app.js` y `main.css`, salvaguardas de seguridad y conteos de pruebas.
5. **`PROMPTS/README.md`:** Actualizar el estado de la fila 015 a `✅ Implementado (v7.18)`.

---

## DEFINITION OF DONE (Criterios de Aceptación)

- [ ] Un usuario anónimo, en versión demo o con Pase Activo regular que abre una cédula **no ve** `#section-quiz-developer` ni ninguna tarjeta de preguntas.
- [ ] La inspección del código fuente HTML de la página para usuarios no-admin confirma la **ausencia absoluta** de las preguntas (cero exposición DOM).
- [ ] Un usuario con sesión de administrador activa (`almabaltoamial2020` o cuenta docente) **ve** el cuestionario completo con la insignia `.quiz-admin-lab-badge` y puede responder las preguntas con normalidad.
- [ ] El botón `#btn-bottom-mastery` sigue presente y 100% operativo para marcar y desmarcar el avance de cédulas en todos los perfiles de usuario.
- [ ] La suite `node test_e2e_case_flow.cjs` incorpora la Sección 27 y pasa al 100% de éxito.
- [ ] Las suites `node test_unlock_auth_flow.cjs`, `node test_mobile_header_theme.cjs` y `node test_deduplication_flow.cjs` pasan al 100%.
- [ ] `CONTEXT.md` refleja fielmente el cambio en las Secciones 1.2, 7.3, 8 y 9.
- [ ] `PROMPTS/README.md` tiene la fila 015 debidamente registrada y actualizada.
- [ ] Commit y push a `origin/main` completados limpiamente.

---

## HOJA DE RUTA FUTURA (Reapertura en PROMPT 016)

Cuando el equipo concluya la fase de enriquecimiento dogmático (nutrición profunda de extractores de requisitos/elementos, calibración de distractores seductores reales tomados de la jurisprudencia y comisiones de grado de la U. de Chile, PUC, etc.), la reactivación para todo el alumnado se efectuará de forma inmediata simplemente retirando el guard `isAdmin &&` de `canViewQuiz` en `js/app.js`, sin alterar ninguna otra capa del sistema.
