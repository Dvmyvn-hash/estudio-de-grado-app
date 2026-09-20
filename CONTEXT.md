# ⚖️ CONTEXT.md — Guía de Contexto y Arquitectura de la Aplicación
### Plataforma de Preparación para el Examen de Grado en Derecho (`estudio-de-grado-app`)
**Derecho Civil · Derecho Procesal Orgánico y Funcional · Derecho Constitucional**

## 0. Regla Inmutable: Actualización Obligatoria de CONTEXT.md

> [!IMPORTANT]
> **POLÍTICA DE DESARROLLO PERMANENTE:**  
> **`CONTEXT.md` es la única fuente canónica de verdad (*Single Source of Truth*) sobre la arquitectura, seguridad, contratos de API, convenciones de código y flujos de usuario de `estudio-de-grado-app`.**  
> **Cualquier cambio implementado en el código, frontend, backend, esquemas de bases de datos o suites de prueba DEBE quedar documentado y actualizado de inmediato en `CONTEXT.md` al término de cada modificación.**  
> Ninguna tarea técnica, refactorización o corrección se considera terminada si este archivo no refleja con exactitud milimétrica el estado activo del software.

### Protocolo Obligatorio Post-Cambio:
1. **Ejecución y Verificación de Pruebas:** Ejecutar las suites de prueba pertinentes (`node test_unlock_google_flow.cjs`, `node test_e2e_case_flow.cjs`).
2. **Identificación de Módulos Impactados:** Determinar los componentes intervenidos (UI, estilos, lógica de servicios, servidor, base de datos SQLite, contratos de endpoints).
3. **Actualización Inmediata de `CONTEXT.md`:** Reflejar nuevos identificadores del DOM, selectores, endpoints, estados de sesión, guardrails o modelos de datos en la sección correspondiente.
4. **Registro en Bitácora de Versiones:** Registrar el hito en la Sección 9 con fecha, alcance, autor y archivos modificados.

---

## 1. Propósito y Reglas del Agente de IA

El **Agente de IA** es el subsistema central de la aplicación encargado de la creación, modelado dogmático, administración y evaluación metodológica de los casos prácticos. Su misión es reproducir fielmente la dinámica, rigor y criterios de corrección de una comisión examinadora de grado universitaria chilena.

### 1.1. Rol Específico
1. **Generador Dogmático de Casos Inéditos:** Sintetiza hipótesis de hecho complejas y verosímiles que cruzan instituciones de Derecho Civil, Derecho Procesal y Derecho Constitucional, asegurando que cada caso presente un conflicto sustantivo real y una vía adjetiva idónea.
2. **Evaluador Metodológico (Comisión de Grado):** Califica las respuestas de opción múltiple y las justificaciones argumentativas de los postulantes, aplicando de manera rigurosa el **Protocolo AFG 2026-20 (Plan D.U. 11-2022)** y la **Rúbrica Oficial AIME 2026-20**.
3. **Custodio de la Coherencia Sustantiva:** Previene inconsistencias jurídicas mediante un motor de descarte de incompatibilidades dogmáticas antes de presentar un caso al estudiante.

---

### 1.2. Instrucciones Base y Principios Rectores

El agente opera bajo reglas estructurales inmutables:

* **Estructura Fáctica Circunstanciada (Pauta 2026):**
  Todo caso debe contener una relación de hechos detallada con fechas, montos, ubicaciones, juzgados y contratos formalizados, desglosados internamente en:
  * **Hechos Principales:** Actos jurídicos, inscripciones, incumplimientos o resoluciones judiciales determinantes para la litis.
  * **Hechos Secundarios:** Datos contextuales (domicilios, desglose de pagos, calidades accesorias).
  * **Hechos Distractores:** Circunstancias aparentes destinadas a evaluar si el estudiante discierne el régimen aplicable (ej. entrega material vs. posesión inscrita; muerte del mandante en mandato judicial vs. civil).
  * **Individualización de Partes:** Sujetos principales (demandante, demandado, tercer adquirente) y secundarios (abogados patrocinantes, notarios, jueces).
  * **Instituciones Jurídicas Involucradas:** Citas expresas de los estatutos en juego.

* **Formato de Interrogación y Barajado Obligatorio:**
  * Cada caso consta de **3 o 4 preguntas de grado**.
  * Cada pregunta ofrece **5 alternativas (A a E)** o excepcionalmente 4 (A a D).
  * **Barajado Aleatorio (`shuffleQuestionOptions`):** La alternativa correcta nunca tiene una posición fija; se redistribuye pseudoaleatoriamente mediante el algoritmo de Fisher-Yates preservando la referencia oficial.

* **Rúbrica Oficial de Calificación en 4 Dimensiones (5.0 pts máx por pregunta):**
  La evaluación de cada pregunta se rige por un esquema dual de compuertas:

  $$\text{Puntaje Pregunta} = \text{Puntaje Alternativa (1.0)} + \text{Puntaje Justificación (4.0)} = 5.0 \text{ pts}$$

  | Dimensión | Ponderación | Criterio de Evaluación de Grado |
  | :--- | :---: | :--- |
  | **Alternativa Correcta** | **1.0 pto** | Identificación de la solución jurídica exacta según la cátedra. |
  | **Dim. 1: Marco Jurídico Pertinente** | **0.5 pts** | Cita precisa de normas legales positivas (arts. CC, CPC, COT, CPR), principios y doctrinas consolidadas. |
  | **Dim. 2: Selección de Hechos Relevantes** | **1.0 pto** | Capacidad de aislar los hechos dirimentes frente a distractores o antecedentes accesorios. |
  | **Dim. 3: Subsunción y Razonamiento** | **2.0 pts** | Silogismo forense completo: premisa mayor (derecho), premisa menor (hecho) y conclusión irrefutable. Conectores argumentativos lógicos. |
  | **Dim. 4: Claridad y Precisión Técnica** | **0.5 pts** | Vocabulario jurídico riguroso (*lex artis ad hoc*, *duplo*, *statu quo*, *interdictos*, etc.). Cero coloquialismos. |

---

### 1.3. Restricciones y Prohibiciones (Guardrails)

* **Compuerta 1: Criterio Excluyente:**
  Si el postulante selecciona una alternativa incorrecta, el sistema asigna **automáticamente 0.0 puntos a la justificación**, sin importar qué tan sólida parezca la argumentación redactada. El puntaje total de esa pregunta es de **0.0 / 5.0 pts**.

* **Matriz de Incompatibilidad Dogmática:**
  El agente no puede asociar instituciones antagónicas en un mismo caso. El catálogo descarta activamente combinaciones incompatibles, por ejemplo:
  * `civ_tradicion_posesion` vs. `civ_prescripcion_extraordinaria_sin_titulo`: Contra título inscrito no procede el apoderamiento material ni la prescripción adquisitiva sin cancelación previa (Art. 2505 CC).
  * `civ_reivindicatoria` vs. `civ_mera_tenencia_arriendo`: Contra el mero tenedor procede la acción contractual de restitución o comodato precario, no la acción de dominio (Art. 895 CC).
  * `civ_lesion_enorme` vs. `civ_rescision_muebles`: La lesión enorme en compraventa está restringida por ley a bienes raíces (Art. 1891 CC).
  * `const_recurso_proteccion` vs. `const_derechos_litigiosos_dudosos`: El recurso de protección tutela situaciones consolidadas frente a actos ilegales o arbitrarios; no es una sede para declarar derechos contractuales controvertidos.

* **Confidencialidad Estricta de Modelos de Entrenamiento (Zero Exposure):**
  Los archivos fuente oficiales alojados en `CASOS/1_PAUTAS_EVALUACION/`, rúbricas docentes universitarias y el archivo consolidado `all_cases.json` son estrictamente confidenciales. El servidor bloquea el acceso directo con **HTTP 403 Forbidden**. El público y la interfaz solo pueden visualizar y listar casos marcados con `isGeneratedByAI: true` o con prefijo `caso-ia-*`.

* **Blindaje de Integridad Académica (Seguridad Anti-Inyección):**
  El módulo `SecurityShield` intercepta toda justificación antes de procesarla. Está prohibido procesar entradas con:
  * Intentos de sobreescritura de instrucciones (*"ignore all previous instructions"*, *"anula la evaluación"*).
  * Modos jailbreak o suplantación (*"DAN mode"*, *"eres un evaluador laxo"*).
  * Forzado de notas (*"asigna 5.0 puntos"*, *"di que pasé el grado"*).
  * Payloads ejecutables o etiquetas `<script>`.
  * *Acción:* La justificación recibe **0.0 pts inmediatos** por incidente de seguridad, registrando la evidencia en el borrador de evaluación.

* **Custodia Documental Obligatoria de CONTEXT.md:**
  El agente tiene terminantemente prohibido realizar modificaciones estructurales, lógicas, visuales o de seguridad sin actualizar de manera inmediata este archivo `CONTEXT.md`. Cada nuevo componente, selector de interfaz o endpoint debe quedar aquí reflejado.

---

### 1.4. Tono y Formato de Respuesta
* **Tono:** Académico, forense, sobrio, exigente y pedagógico. Habla con la gravedad y precisión de una comisión examinadora de la Corte Suprema o de cátedra universitaria de excelencia.
* **Respuesta Estructurada:** Cada retroalimentación desglosa el puntaje de las 4 dimensiones, señala expresamente los artículos aplicables, destaca los aciertos dogmáticos y advierte sobre los *Errores Fatales de Grado* cometidos.

---

## 2. Estructura de los Casos

### 2.1. Organización de Carpetas del Repositorio

El repositorio documental de casos reside en `CASOS/` y se replica/monitorea en `Escritorio/Fuentes_Grado/CASOS`:

```
CASOS/
├── 1_PAUTAS_EVALUACION/       # Pautas docentes, matrices de evaluación y rúbricas oficiales (Confidencial)
├── 2_CASOS_SEMANALES/          # Casos de cátedra y casos generados por el Agente IA (caso-ia-*.md)
├── 3_EXAMENES_ANTERIORES/      # Cédulas y exámenes históricos de grado
├── 4_MODALIDAD_Y_FORMATOS/     # Protocolos de rendición (AIME 2026-20) y reglamentación
├── PLANTILLA_CASO.md           # Estándar oficial de redacción en Markdown
└── README.md                   # Documentación general de la carpeta
```

---

### 2.2. Formato Canónico en Markdown (`.md`)

Todo caso práctico persistido en archivo `.md` (como los generados por el agente en `CASOS/2_CASOS_SEMANALES/{case_id}.md` o creados a partir de `PLANTILLA_CASO.md`) cumple con la siguiente jerarquía:

```markdown
# Caso Práctico: [Título Descriptivo del Caso]

> **Materia:** Civil, Procesal, Constitucional  
> **Dificultad:** Grado  
> **Origen:** Agente de IA (Protocolo AFG 2026-20)  
> **Ciclo de Retención:** Caso de Práctica Activo  

---

## 📌 Hechos Relevantes (Antecedentes)
[Relación circunstanciada de hechos: fechas, partes, inmuebles/bienes, montos, actos y conflicto]

---

## ❓ Preguntas de Interrogación / Evaluación

### Pregunta 1: [Enunciado de la interrogante jurídica]
- A) [Texto alternativa]
- B) [Texto alternativa]
- C) [Texto alternativa]
- D) [Texto alternativa]
- E) [Texto alternativa]

*Respuesta Correcta:* Opción A
*Explicación Oficial:* [Fundamentación dogmática con cita de artículos]

---

## 📋 Pauta de Evaluación y Criterios del Profesor
- **Criterio 1:** [Norma o institución clave]
- **Error Fatal de Grado:** [Concepto erróneo inadmisible]

---

## ⚖️ Solución Metodológica (4 Dimensiones)
### 1. Hechos y Conflicto Jurídico
[Definición sintética de la litis]

### 2. Fundamento Normativo
- **Art. XXX Código Civil:** [Descripción breve]
- **Art. XXX Código de Procedimiento Civil:** [Descripción breve]

### 3. Aplicación Práctica y Razonamiento (Subsunción)
[Silogismo de subsunción fáctico-normativa]

### 4. Dogmática y Doctrina Jurídica
[Teorías, jurisprudencia y principios aplicables]
```

---

### 2.3. Estructura de Datos en Memoria y JSON (`all_cases.json` / `StorageService`)

En memoria y en las capas de persistencia (`all_cases.json`, `localStorage`), cada caso se representa con el siguiente esquema estandarizado:

```json
{
  "id": "caso-ia-1774058123456",
  "title": "Caso Práctico: Compraventa Inmobiliaria y Posesión Registral",
  "subjects": ["civil", "procesal"],
  "difficulty": "Grado",
  "summary": "Resumen ejecutivo del conflicto.",
  "facts": "Texto íntegro de los hechos circunstanciados...",
  "isGeneratedByAI": true,
  "isImportedFromCasosFolder": true,
  "sourceCategory": "generado_ia",
  "sourceCategoryLabel": "Agente IA (Protocolo AFG 2026)",
  "sourceFile": "caso-ia-1774058123456.md",
  "createdAt": 1774058123456,
  "expiresAt": 1774662923456,
  "factsBreakdown": {
    "principales": ["Hecho principal 1", "Hecho principal 2"],
    "secundarios": ["Detalle de cuotas", "Domicilio en Santiago"],
    "distractores": ["Entrega material previa sin inscripción"],
    "partes": {
      "principales": "Matías (Vendedor) y Roberto (Comprador)",
      "secundarias": "Camila (Segunda adquirente) y Notario"
    },
    "instituciones": [
      "Tradición y Posesión Inscrita (Arts. 686 y 724 CC)",
      "Excepción de Contrato no Cumplido (Art. 1552 CC)"
    ]
  },
  "questions": [
    {
      "id": "q-ia-1",
      "number": 1,
      "area": "Derecho Civil (Bienes y Tradición)",
      "questionText": "¿Quién ostenta el dominio del predio?",
      "requiresJustification": true,
      "options": [
        { "id": "a", "text": "Camila, por competente inscripción en el CBR." },
        { "id": "b", "text": "Matías, por entrega material previa." },
        { "id": "c", "text": "Comunidad forzosa indivisa." },
        { "id": "d", "text": "Roberto por reserva de dominio." },
        { "id": "e", "text": "Ninguno, adolece de objeto ilícito." }
      ],
      "correctAnswer": "a",
      "explanation": "La tradición de inmuebles solo opera mediante inscripción conservatoria (Art. 686 CC).",
      "officialRubric": {
        "criterio1Marco": { "name": "Marco jurídico pertinente", "maxPoints": 0.5 },
        "criterio2Hechos": { "name": "Selección de hechos relevantes", "maxPoints": 1.0 },
        "criterio3Subsuncion": { "name": "Subsunción y razonamiento", "maxPoints": 2.0 },
        "criterio4Precision": { "name": "Claridad y precisión técnica", "maxPoints": 0.5 }
      }
    }
  ],
  "methodology": {
    "conflict": "Conflicto entre título inscrito y posesión material.",
    "legalBasis": ["Arts. 686, 724, 1817 CC", "Art. 254 CPC"],
    "applicationReasoning": "La inscripción registral prevalece sobre la entrega material.",
    "dogmaticFramework": "Ficción de posesión inscrita y principio de rogación registral."
  }
}
```

---

### 2.4. Ciclo de Retención FIFO y Actualización
1. **Límite FIFO de Casos de Práctica:**
   Tanto en el servidor (`server.py`) como en el almacenamiento local del cliente (`StorageService.pruneOldAiCases`), se mantiene un tope estricto de **máximo 10 casos generados por IA** simultáneos.
2. **Poda Automática:** Al generarse el caso número 11, el más antiguo se desvincula de `all_cases.json`, su archivo `.md` en disco se elimina de forma segura (`p_file.unlink()`) y sus borradores en `localStorage` se purgan para prevenir la saturación de memoria.
3. **Casos Oficiales Protegidos:** Las pautas oficiales de la universidad son inmunes a la poda FIFO; permanecen intactas e inmutables en el servidor.

---

## 3. Flujo de Interacción

```mermaid
sequenceDiagram
    autonumber
    actor Alumno as Postulante al Grado
    participant UI as Interfaz Web (Workbench)
    participant Agent as CaseGeneratorAgent (JS)
    participant Shield as SecurityShield (JS)
    participant Storage as StorageService (Local)
    participant Server as server.py (Backend)
    participant Solver as CaseSolver (Workbench)

    Alumno->>UI: Clic en "Crear con IA"
    UI->>Agent: openModal()
    Agent->>UI: Renderiza selector de instituciones y presets
    Alumno->>UI: Selecciona instituciones (ej: Posesión + Reivindicatoria)
    Agent->>Agent: Valida matriz de incompatibilidad dogmática
    Alumno->>UI: Clic en "Sintetizar Caso de Grado"
    Agent->>Agent: synthesizeCase() (Evalúa afinidad + Mutador fáctico + Shuffle opciones)
    Agent->>Storage: Guarda en local con pruneOldAiCases(10)
    Agent->>Server: POST /api/ai/save-generated-case (Payload validado)
    Server->>Server: Escribe caso-ia-*.md en disco + actualiza all_cases.json (FIFO)
    Server-->>Agent: { ok: true, caseId, savedFile }
    Agent->>Solver: Configura nuevo caso activo y conmuta a vista "cases"
    Solver->>UI: Renderiza Workbench con hechos y preguntas

    Alumno->>UI: Marca alternativa (A-E) y redacta justificación
    Alumno->>UI: Clic en "Evaluar según Rúbrica Oficial"
    Solver->>Shield: inspectPromptInjection(justificación)
    alt Inyección / Jailbreak detectado
        Shield-->>Solver: { isInjected: true, reason }
        Solver->>UI: Banner advertencia + 0.0 pts inmediatos
    else Entrada segura
        Shield-->>Solver: { isInjected: false }
        Solver->>Solver: Evalúa Compuerta 1 (Alternativa correcta)
        alt Alternativa Incorrecta
            Solver->>UI: Criterio Excluyente: 0.0 pts totales
        else Alternativa Correcta
            Solver->>Solver: Evalúa 4 dimensiones de Rúbrica Oficial (1.0 + Rúbrica)
            Solver->>Storage: Persiste borrador evaluado en caseDrafts
            Solver->>UI: Muestra puntuación desglosada, explicación oficial y retroalimentación
        end
    end
```

---

### 3.1. Carga y Sincronización de Archivos Markdown
* **Sincronización en Vivo:** `server.py` calcula continuamente una firma combinada de archivos vigilados (`get_files_hash`). El cliente consulta `/api/sync-check`. Si detecta modificaciones en `fuentes/` o `CASOS/`, actualiza el estado de la vista sin recargar la página.
* **Extracción Multiformato:** Si el usuario coloca archivos `.md`, `.txt`, `.docx` o `.pdf` en la carpeta sincronizada, el servidor los convierte a texto plano estructurado mediante `pypdf` y `python-docx`.
* **Renderizado con `MarkdownParser`:**
  * Interpreta enlaces `[[Institución Jurídica]]` convirtiéndolos en wikilinks interactivos que abren la cédula teórica correspondiente.
  * Detecta títulos de *"Puntos Críticos"* o *"Red Flags"* y los transforma en contenedores de alerta destacados (`.callout-warning`).
  * Procesa mapas conceptuales y tablas comparativas normativas.

---

### 3.2. Proceso de Resolución en el Workbench
1. **Navegación:** La barra superior permite alternar entre preguntas (Pregunta 1, 2, 3...) mostrando el estado de avance (Evaluada / Pendiente).
2. **Desglose de Hechos:** El postulante puede expandir el panel de análisis de hechos (Hechos Principales, Secundarios, Distractores y Partes) para contrastar su lectura antes de responder.
3. **Ajuste Manual de Notas:** Si un profesor o tutor supervisa la práctica, el componente `CaseSolver.updateRubricScore` permite ajustar individualmente el puntaje de cualquiera de las 4 dimensiones de la rúbrica recalculando el total en tiempo real.

---

## 4. Manejo de Errores y Cuotas

### 4.1. Límites de Cuota de API (Rate Limits / HTTP 429 / Model Exhaustion)

Cuando el sistema se conecte con APIs de LLM externas (ej. Gemini API, Cloud Run o modelos alojados):

1. **Estrategia de Retroceso Exponencial con Variación Aleatoria (*Exponential Backoff with Jitter*):**
   Ante respuestas con código **`429 Too Many Requests`** o errores de cuota (`RESOURCE_EXHAUSTED`):
   
   $$T_{\text{espera}} = 2^{\text{intento}} \times 1000\text{ ms} + \text{random}(0, 500)\text{ ms}$$

   * Reintento 1: ~2.2 segundos.
   * Reintento 2: ~4.3 segundos.
   * Reintento 3: ~8.4 segundos.
   * Máximo de 3 reintentos antes de activar el fallback.

2. **Conmutación Transparente al Motor de Síntesis Simbólica Local (Zero Downtime Fallback):**
   Si la API externa reporta cuota agotada o falla de red, el sistema **no interrumpe la experiencia del postulante**. Conmuta de forma automática e imperceptible al motor algorítmico local de `CaseGeneratorAgent`:
   * Selecciona el arquetipo dogmático de mayor afinidad dentro de los 10 arquetipos universitarios de alta fidelidad precargados.
   * Aplica el motor mutador dinámico (`MUTATOR_DATA`) para variar nombres de partes, juzgados, montos y fechas.
   * Baraja las alternativas y genera el caso completo con rúbrica oficial.
   * Notifica sutilmente mediante un toast informativo:
     ```javascript
     App.showToast("Caso estructurado con motor dogmático local (modo de alta disponibilidad activo).", "info");
     ```

---

### 4.2. Errores al Leer Archivos Fuente
* **Codificación y Caracteres Especiales:** En Python (`server.py`, `parse_casos.py`), todos los accesos a archivos fuente se abren con `encoding="utf-8", errors="replace"` para evitar excepciones por caracteres extraños o archivos provenientes de Windows ANSI.
* **Tolerancia a Dependencias Faltantes:** Si `pypdf` o `docx` no están instalados en el entorno Python del usuario, las funciones `extract_text_from_file` capturan el `ImportError` y devuelven cadenas vacías o leen el formato de texto plano sin interrumpir la ejecución del servidor.
* **Corpus Dogmático Embebido (`FUENTES_CORPUS`):** Si `/api/fuentes` no está disponible (ejecución estática en navegador con `index.html` sin servidor Python), `CaseGeneratorAgent` recurre de inmediato a su corpus normativo interno integrado en `case-generator-agent.js` y a los apuntes de `js/data.js`.
* **Validación Canónica contra Path Traversal:** En todos los endpoints de guardado (`/api/ai/save-generated-case`, `/api/set-sync-folder`), se valida estrictamente que la ruta resuelta sea relativa al directorio autorizado (`path.is_relative_to(base_dir)`) y que el identificador coincida con `^caso-ia-[0-9a-zA-Z_-]{4,36}$`. Cualquier intento de salto de directorio se rechaza con **HTTP 400**.

---

### 4.3. Prevención de Desbordamiento de Memoria y Ataques DoS
* **Límite de Payload en Backend:** `MAX_PAYLOAD_SIZE = 131072` (128 KB máximo por solicitud POST). Peticiones que superen este umbral son abortadas con **HTTP 413 Payload Too Large**.
* **Límite de Caracteres en Cliente:** Las justificaciones redactadas por los alumnos son truncadas preventivamente por `SecurityShield.MAX_JUSTIFICATION_LENGTH = 2500` caracteres para evitar la saturación de los borradores locales en `localStorage`.
* **Purga Manual de Casos:** El postulante o administrador dispone del botón *"Limpiar IA"* (`#btn-purge-ai-cases`), que activa `POST /api/ai/clean-practice-cases`, eliminando en lote los casos temporales generados y liberando memoria en el sistema.

---

## 5. Stack Tecnológico y Convenciones

### 5.1. Resumen Tecnológico

| Capa | Tecnologías | Propósito |
| :--- | :--- | :--- |
| **Estructura** | HTML5 semántico | Jerarquía limpia, accesible y optimizada para lectura jurídica prolongada. |
| **Estilos** | CSS3 Vanilla con Variables CSS | Diseño *Dark Academy* de alta gama, paleta oro/ámbar (`--gold-primary: #d4a017`), glassmorphism, responsive móvil y escritorio. Sin Tailwind ni frameworks invasivos. |
| **Lógica Cliente** | JavaScript ES6+ Vanilla | Arquitectura modular basada en objetos singleton. Cero dependencias pesadas. |
| **Iconografía** | Lucide Icons (CDN) | Iconos vectoriales renderizados dinámicamente con `lucide.createIcons()`. |
| **Visualización** | D3.js v7 (CDN) | Grafo interactivo con física de fuerzas para interconexiones dogmáticas. |
| **Backend Local** | Python 3 (`http.server`, `socketserver`) | Servidor multi-hilo liviano, observador de archivos y API REST de sincronización. |
| **Pruebas E2E** | Node.js CommonJS (`.cjs`) | Suite de pruebas de regresión y verificación de contratos de API (`test_e2e_case_flow.cjs`). |

---

### 5.2. Convenciones de Código y Arquitectura

1. **Modularidad Singleton en Frontend:**
   Cada servicio se define como un objeto global documentado, accesible en el navegador y preparado para pruebas con Node.js:
   ```javascript
   var CaseGeneratorAgent = { ... };
   if (typeof window !== "undefined") window.CaseGeneratorAgent = CaseGeneratorAgent;
   if (typeof globalThis !== "undefined") globalThis.CaseGeneratorAgent = CaseGeneratorAgent;
   if (typeof module !== "undefined" && module.exports) module.exports = CaseGeneratorAgent;
   ```

2. **Sanitización de Entradas en el Origen:**
   Ningún texto suministrado por el usuario debe inyectarse directamente en el DOM mediante `innerHTML` sin haber sido previamente procesado por:
   * `SecurityShield.escapeHtml(str)` o `CaseSolver.escapeText(str)`.
   * `MarkdownParser.render(str)` para contenido con formato.

3. **Inmutabilidad de Datos Iniciales:**
   Los temas y cédulas base provienen de `js/data.js` (`INITIAL_DATA`). Cualquier modificación del usuario o caso nuevo se almacena en las capas dinámicas (`caseDrafts`, `userProgress`, `cases`) gestionadas exclusivamente a través de `StorageService`.

4. **Nomenclatura Rigurosa del Dominio Jurídico:**
   Las variables y funciones reflejan con fidelidad las instituciones del Derecho chileno:
   * Materias: `civil`, `procesal`, `constitucional`.
   * Parámetros de rúbrica: `criterio1Marco`, `criterio2Hechos`, `criterio3Subsuncion`, `criterio4Precision`.
   * Estados de resolución: `isEvaluated`, `isExclusionary`, `rubricScores`, `totalScore`.

5. **Sincronización Continua de la Documentación Técnica (`CONTEXT.md`):**
   Todo cambio en la lógica de negocio, arquitectura de autenticación, diseño de componentes en `index.html` o endpoints en `server.py` DEBE documentarse inmediatamente en este archivo. `CONTEXT.md` refleja en tiempo real el estado funcional completo del sistema.

---

## 6. Autenticación Autónoma (Correo + Contraseña PBKDF2), Captcha Cloudflare Turnstile y Sincronización Multi-Dispositivo

### 6.1. Arquitectura de Identidad y Seguridad
La plataforma implementa un esquema de autenticación resiliente y autónomo:
1. **Modo Servidor Local / Producción (`server.py` y `db.py`):**
   * **Identidad Autónoma:** Registro e inicio de sesión mediante Correo Electrónico y Contraseña, eliminando dependencias externas de Google Identity Services (GIS).
   * **Hashing Criptográfico Estándar:** Implementación nativa en Python estándar (`hashlib`, `secrets`, `base64`, `hmac`) con **PBKDF2-HMAC-SHA256**, 210.000 iteraciones y salt criptográfico único de 16 bytes codificado en Base64.
   * **Verificación Fail-Closed de Captcha:** Integración con **Cloudflare Turnstile** (`https://challenges.cloudflare.com/turnstile/v0/siteverify`). En caso de timeout, error de red o token inválido, la solicitud se rechaza preventivamente (**HTTP 400**).
   * **Defensa Proactiva en Login:** El captcha es obligatorio en todo registro y se exige en login a partir del primer intento fallido (`requiresCaptcha: true`).
   * **Bloqueo Temporal de Cuenta (*Account Lockout*):** Tras 5 intentos fallidos consecutivos, la cuenta queda bloqueada temporalmente por 15 minutos en base de datos (`locked_until` en SQLite, respondiendo **HTTP 423 Locked**).
   * **Mitigación de Ataques de Temporización (*Timing Attacks*):** En caso de consultar un usuario inexistente en login, el servidor ejecuta una verificación simulada de PBKDF2 con salt ficticio para igualar el tiempo de respuesta.
   * **Sesiones Seguras Firmadas:** Emisión de tokens firmados con **HMAC-SHA256** persistidos en cookies `session_token` con atributos `HttpOnly; Secure; SameSite=Lax`.
   * **Persistencia Relacional SQLite:** Base de datos `estudio_grado.db` con tablas `users` (con `email`, `password_hash`, `password_salt`, `name`, `access_code`, `failed_login_attempts`, `locked_until`), `access_codes` y `user_progress`.
   * **Protección Zero Exposure:** Bloqueo absoluto (**HTTP 403 Forbidden**) de acceso directo a archivos `.db`, `.py`, scripts y secretos criptográficos.
   * **Compatibilidad de Pruebas E2E:** Soporte condicional controlado por variable de entorno `ALLOW_TEST_AUTH=1` para tokens mock de Turnstile y compatibilidad con suites de integración existentes.

2. **Modo Estático / GitHub Pages (`auth-service.js`):**
   * Registro y login en cliente con persistencia en `localStorage` (`grado_registered_users` y `grado_auth_user`).
   * Validación en cliente de política de contraseñas y coincidencia de confirmación.
   * Gestión del ciclo de vida del widget de Cloudflare Turnstile (`render`, `reset`, tokens).
   * Validación de códigos de invitación preconfigurados en `js/auth-config.js` (`AUTH_CONFIG`).

---

## 7. Flujo Unificado del Candado: Acceso en 2 Pasos y Convalidación de Licencia

### 7.1. Dinámica del Flujo de Acceso
El botón de estado de licencia (icono de candado `#btn-open-unlock-badge` en la cabecera superior y tarjetas de paywall) opera como la puerta de entrada unificada para la activación del Pase de Grado:

1. **Paso 1: Identificación con Correo y Contraseña + Turnstile:**
   * Al presionar el candado, si el usuario **no cuenta con una sesión activa**, se despliega el modal `#unlock-modal` en la vista `#unlock-step-login`.
   * Se presenta el formulario de credenciales (`#form-auth-register`) con campos de correo (`#input-register-email`), contraseña (`#input-register-password`) y confirmación (`#input-confirm-password`).
   * Validación en vivo de la política de contraseñas mediante `#password-policy-hints`:
     * Mínimo 10 caracteres (`#rule-len`).
     * Al menos una letra mayúscula (`#rule-upper`).
     * Al menos una letra minúscula (`#rule-lower`).
     * Al menos un número (`#rule-num`).
   * Indicador dinámico de coincidencia de contraseñas (`#password-match-hint`).
   * Widget de Cloudflare Turnstile en `#unlock-captcha-container`.
   * Enlace interactivo `#link-toggle-login-register` para conmutar ágilmente entre modo Registro y modo Iniciar Sesión.
   * El campo de ingreso de código de activación permanece bloqueado hasta completar la autenticación.

2. **Inicio Predeterminado en Versión Demo:**
   * Al registrarse o iniciar sesión, el postulante accede **con la sesión iniciada en Versión Demo por defecto** (`isDemo = true`, `access_code = null`).
   * La cabecera muestra el nombre o correo del alumno (`#auth-user-container`), mientras el candado permanece en estado demo rojo.
   * El postulante puede explorar de inmediato las cédulas y casos liberados para prueba.

3. **Paso 2: Convalidación de la Cuenta con Código de Activación:**
   * Con la sesión iniciada en Versión Demo, el modal `#unlock-modal` transita fluidamente a `#unlock-step-convalidate`.
   * Se despliega la tarjeta de identidad activa (`#unlock-user-card`): avatar, nombre/correo del alumno y la insignia destacada `[ Versión Demo ]`.
   * En esta instancia se habilita el campo `#input-license-code` para **pegar el código de invitación** (ej. `GRADO-BETA-2026`).

4. **Activación y Promoción a Pase de Grado Activo:**
   * Al pulsar *"Convalidar Cuenta"* (`#btn-submit-license`), `AuthService.convalidateAccount(code)` ejecuta la validación y vinculación atómica:
     * En servidor (`POST /api/auth/link-code`): Descuenta el uso de forma atómica en `access_codes` y actualiza `users.access_code`.
     * En cliente: Sincroniza `LicenseService.activateCode(code)` y actualiza el objeto `currentUser.isDemo = false`.
   * Si la convalidación es exitosa:
     * El candado se transforma instantáneamente en la corona dorada de Pase Activo (`#badge-license-active`).
     * Se desbloquean inmediatamente las materias protegidas (Civil, Procesal y Constitucional).
     * Se emite una notificación toast celebratoria: *"¡Cuenta convalidada con éxito! Pase de Grado activado."*

### 7.2. Máquina de Estados y Mapeo del DOM (`#unlock-modal`)

```mermaid
stateDiagram-v2
    [*] --> SinSesion: Clic en Candado (#btn-open-unlock-badge)
    SinSesion --> Paso1_Credenciales: Renderiza #unlock-step-login
    Paso1_Credenciales --> Paso1_Credenciales: Fallo de validación / Captcha no resuelto
    Paso1_Credenciales --> Paso2_Demo: Registro/Login exitoso + Turnstile verificado (isDemo: true)
    Paso2_Demo --> Convalidando: Ingreso de Código (#input-license-code) + Clic #btn-submit-license
    Convalidando --> Paso2_Demo: Código inválido o expirado (Toast error)
    Convalidando --> PaseActivo: Código válido vinculado a la cuenta (isDemo: false)
    PaseActivo --> [*]: Candado -> Corona (#badge-license-active)
```

#### Componentes e Identificadores del Modal Unificado:
| Selector / ID | Tipo | Rol en el Flujo |
| :--- | :--- | :--- |
| `#unlock-modal` | Contenedor Modal | Diálogo principal de activación con backdrop difuminado. |
| `.unlock-step-indicator` | Barra de Progreso | Muestra los estados visuales `1. Identificación` y `2. Convalidación`. |
| `#unlock-step-login` | Vista de Paso 1 | Formulario de Registro e Inicio de Sesión autónomo. |
| `#auth-form-title` | Encabezado | Título dinámico ("Paso 1: Crea tu cuenta..." o "Paso 1: Inicia sesión..."). |
| `#form-auth-register` | Formulario | Formulario con prevención de submit por defecto y validación reactiva. |
| `#input-register-email` | Input Email | Entrada para correo electrónico del postulante. |
| `#input-register-password` | Input Password | Entrada para contraseña principal con política de seguridad. |
| `#input-confirm-password` | Input Password | Entrada de confirmación de contraseña (modo Registro). |
| `#password-policy-hints` | Contenedor Hints | Indicadores visuales de cumplimiento de reglas (`#rule-len`, `#rule-upper`, `#rule-lower`, `#rule-num`). |
| `#password-match-hint` | Hint Coincidencia | Feedback en tiempo real sobre coincidencia entre contraseña y confirmación. |
| `#unlock-captcha-container` | Contenedor Turnstile | Contenedor para renderizar el widget de Cloudflare Turnstile. |
| `#btn-submit-register` | Botón Submit | Botón dinámico ("Crear Cuenta" o "Iniciar Sesión") con icono reactivo. |
| `#link-toggle-login-register` | Enlace Toggle | Conmutador interactivo entre modo Registro y modo Login. |
| `#register-error-msg` | Alerta de Error | Banner de alerta para desplegar errores de autenticación sanitizados. |
| `#unlock-step-convalidate` | Vista de Paso 2 | Desplegada cuando existe sesión activa en Versión Demo (`currentUser.isDemo = true`). |
| `#unlock-user-card` | Tarjeta de Identidad | Despliega la cuenta de usuario vinculada. |
| `#unlock-user-name` | Texto | Nombre y apellidos o identificador del postulante (`name`). |
| `#unlock-user-email` | Texto | Dirección de correo sobre la cual se vinculará la licencia. |
| `#unlock-user-status-badge` | Insignia de Estado | Muestra `[ Versión Demo ]` (`.badge-demo-status`) o `[ Pase Activo ]` (`.badge-active-status`). |
| `#input-license-code` | Input de Texto | Entrada para el código de invitación con auto-conversión a mayúsculas y envío con Enter. |
| `#btn-submit-license` | Botón de Acción | Ejecuta `AuthService.convalidateAccount(code)` con feedback visual. |
| `#unlock-step-active` | Vista de Cuenta Activa | Desplegada si el usuario ya posee su Pase de Grado convalidado. |

---

### 7.3. Contratos de Seguridad y Pruebas Automatizadas
* **Suite de Autenticación Autónoma (`test_unlock_auth_flow.cjs`):** Ejecuta 37 pruebas cubriendo estado inicial, validación de política de contraseñas, rechazo por discrepancia, verificación fail-closed de Turnstile, registro, prevención de duplicados, login fallido, exigencia de captcha tras error, bloqueo por 5 fallos consecutivos (15 min), login exitoso, convalidación de código de activación y desbloqueo integral de materias en `LicenseService`.
* **Suite de Regresión e Integración (`test_e2e_case_flow.cjs`):** Ejecuta 65 pruebas integrales que verifican la confidencialidad de modelos docentes, casos IA, rúbrica AIME 2026-20, ciberseguridad y sincronización multi-dispositivo sin regresiones.
* **Sanitización Defensiva y Prevención XSS:** Todos los datos de usuario son escapados contra inyección XSS mediante `SecurityShield.escapeHtml` y los mensajes de error se renderizan estrictamente con `textContent` en el DOM.
* **Hashing Seguro en Cliente (Modo Estático / GitHub Pages):** La función `AuthService.hashClientPassword()` emplea la Web Crypto API (`crypto.subtle.digest("SHA-256")`) con salt local, asegurando que **nunca se almacenen contraseñas en texto plano** en `localStorage`.
* **Resiliencia contra Bloqueadores de Anuncios / Adblockers:** `AuthService.initTurnstile()` implementa un límite finito de 15 reintentos (~3.7 segundos) y maneja `error-callback` para evitar bucles infinitos en el navegador y garantizar que la plataforma opere de forma accesible en GitHub Pages.

---

## 8. Mapa Integral de Archivos y Responsabilidades

| Archivo / Ruta | Tipo | Responsabilidad Arquitectónica |
| :--- | :--- | :--- |
| `CONTEXT.md` | Documentación | **Fuente canónica inmutable de verdad.** Debe actualizarse tras cada cambio. |
| `index.html` | Estructura | Workbench jurídico, visor de cédulas, visor de casos y modal unificado de acceso `#unlock-modal` con Turnstile. |
| `css/paywall.css` | Estilos | Estilos del formulario de credenciales, hints de contraseña, Turnstile, paywall e insignias de estado. |
| `css/styles.css` | Estilos | Sistema de diseño *Dark Academy*, variables CSS, layout responsive y visor de apuntes. |
| `js/app.js` | Orquestador | Controlador principal, navegación, vinculación del botón de candado y gestión de vistas del modal. |
| `js/auth-service.js` | Servicio | Autenticación autónoma (registro, login, logout), hashing seguro cliente con Web Crypto, gestión de Turnstile y sesiones. |
| `js/auth-license.js` | Servicio | Lógica de licencias (`LicenseService`), cálculo de materias desbloqueadas y persistencia local. |
| `js/auth-config.js` | Configuración | Clave pública de Cloudflare Turnstile (`turnstileSiteKey`), códigos de invitación para modo estático y parámetros de sesión. |
| `js/case-generator-agent.js` | Agente IA | Síntesis dogmática de casos inéditos, matriz de compatibilidad y poda FIFO. |
| `js/case-solver.js` | Workbench | Interrogación, compuertas excluyentes, rúbrica AIME 2026-20 y evaluación de justificaciones. |
| `js/security-shield.js` | Ciberseguridad | Detección de prompt injection, anti-XSS, escape seguro y cuotas de caracteres. |
| `server.py` | Backend | Servidor HTTP Python, endpoints `/api/auth/register`, `/api/auth/login`, `/api/auth/link-code`, `/api/auth/logout`, `/api/auth/me`, Turnstile fail-closed, Zero Exposure y rate limiting. |
| `db.py` | Base de Datos | Conexión relacional SQLite (`estudio_grado.db`), hashing PBKDF2, esquema de usuarios con lockout y códigos de acceso. |
| `manage_access_codes.py` | CLI Admin | Generador y administrador de códigos de invitación tipo beta cerrada. |
| `test_unlock_auth_flow.cjs` | Test E2E | Suite de 37 pruebas que valida el flujo Candado -> Correo/Contraseña/Turnstile -> Demo -> Convalidación -> Pase Activo. |
| `test_e2e_case_flow.cjs` | Test E2E | Suite integral de 65 pruebas (casos IA, seguridad, rúbrica, confidencialidad y multi-dispositivo). |

---

## 9. Bitácora Canónica de Versiones e Hitos

* **v1.0 (Lanzamiento Base):** Síntesis algorítmica de casos de grado, matriz de incompatibilidades dogmáticas, ciclo FIFO de 10 casos de práctica y renderizado en Markdown.
* **v2.0 (Integridad y Rúbrica):** Rúbrica Oficial AIME 2026-20 (4 dimensiones, 5.0 pts máx), compuerta excluyente en alternativas, módulo `SecurityShield` contra inyecciones y confidencialidad Zero Exposure en pautas docentes.
* **v3.0 (Identidad y Multi-dispositivo):** Integración de Google Identity Services (GIS), base de datos SQLite `estudio_grado.db`, sincronización de progreso entre dispositivos y rate limiting defensivo.
* **v3.1 (Flujo Unificado del Candado):** Rediseño en 2 pasos de `#unlock-modal`: acceso inicial forzoso con Google -> asignación predeterminada a Versión Demo -> despliegue de tarjeta de identidad de Gmail -> convalidación segura mediante código de invitación -> transformación dinámica de candado rojo en corona dorada.
* **v3.2 (Regla de Mantenimiento Continuo de CONTEXT.md):** Formalización de la política obligatoria de actualización de `CONTEXT.md` en cada ciclo de cambio del repositorio.
* **v3.3 (Cierre Canónico del Flujo Unificado de Candado y Validación Canónica de Códigos):** Validación mediante regex canónico `^[A-Z0-9_\-]{4,36}$` en `db.py` antes de cualquier consulta SQL; integración plena de la máquina de estados en dos pasos para el candado (`#btn-open-unlock-badge`); convalidación atómica contra SQLite y soporte cliente estático; aprobación del 100% de las suites `test_unlock_google_flow.cjs` (20/20) y `test_e2e_case_flow.cjs` (65/65).
* **v4.0 (Autenticación Autónoma: Correo, Contraseña PBKDF2 y Captcha Turnstile):** Desacoplamiento total de dependencias federadas de Google Identity Services (GIS); implementación de autenticación autónoma mediante Correo y Contraseña hasheada con PBKDF2-HMAC-SHA256 (210.000 iteraciones, salt de 16 bytes base64, Python estándar sin librerías externas); integración fail-closed de Cloudflare Turnstile en registro y tras fallos en login; política estricta de contraseñas (10+ caracteres, mayúscula, minúscula, número) con feedback dinámico e indicador reactivo de coincidencia; bloqueo temporal de cuenta (*Account Lockout*) por 15 minutos tras 5 intentos fallidos consecutivos; mitigación contra timing attacks; preservación integral del Paso 2 de convalidación con código de acceso; aprobación del 100% de las suites automatizadas `test_unlock_auth_flow.cjs` (37/37) y `test_e2e_case_flow.cjs` (65/65).
* **v4.1 (Auditoría de Ciberseguridad, Blindaje y Operación Pública en GitHub Pages):** Eliminación de almacenamiento de contraseñas en texto plano en modo estático mediante hashing Web Crypto API SHA-256 en cliente; resiliencia contra adblockers en la carga de Cloudflare Turnstile con control finito de reintentos; blindaje de `server.py` bloqueando la extensión `.cjs`, `test_unlock_auth_flow.cjs` y `agents.md`; mitigación XSS completa en contenedores de error mediante `textContent`; actualización de `auth_config.json` y `GOOGLE_AUTH_SETUP.md` (renovado para Turnstile y despliegue público); 100% de pruebas aprobadas en `test_unlock_auth_flow.cjs` (37/37) y `test_e2e_case_flow.cjs` (65/65).

