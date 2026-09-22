/**
 * DESARROLLADOR DE PREGUNTAS DEL AGENTE (QuestionDeveloper) - v7.11
 * Genera 4 preguntas de verificación de grado al cierre de cada cédula (canónicas o dinámicas).
 * Clasifica la naturaleza de la sección (dogmatic, case, procedencia, competencia, plazos),
 * formula preguntas A-E con solución dogmática oficial revelable y audita citas corpus-driven.
 */

(function(root) {
  'use strict';

  // PRNG Determinista (mulberry32 + fnv1a) para orden y reproducibilidad UX (no criptográfico)
  function fnv1a(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let s = seed;
    return function() {
      s |= 0;
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleArray(array, rng) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  const QuestionDeveloper = {
    // Taxonomía oficial de naturalezas de preguntas de examen de grado
    NATURE_TAXONOMY: {
      dogmatic: {
        id: "dogmatic",
        label: "Pregunta Dogmática",
        color: "#3b82f6",
        description: "Análisis conceptual, requisitos de validez, clasificaciones y contrapuntos doctrinales."
      },
      case: {
        id: "case",
        label: "Pregunta de Caso",
        color: "#10b981",
        description: "Subsunción fáctica, supuestos de laboratorio forense y resolución de conflictos prácticos."
      },
      procedencia: {
        id: "procedencia",
        label: "Pregunta de Procedencia",
        color: "#8b5cf6",
        description: "Vías adjetivas, recursos, acciones constitucionales y presupuestos de admisibilidad."
      },
      competencia: {
        id: "competencia",
        label: "Pregunta de Competencia",
        color: "#f59e0b",
        description: "Tribunales competentes, reglas absolutas/relativas, radicación y prórroga."
      },
      plazos: {
        id: "plazos",
        label: "Pregunta de Plazos/Cómputo",
        color: "#06b6d4",
        description: "Cómputo de términos procesales/civiles, fatalidad, días hábiles y caducidad."
      }
    },

    // Caché en memoria para evitar re-computación innecesaria en re-renders
    _cache: new Map(),

    /**
     * Helper defensivo de extracción de citas normativas chilenas.
     * Reutiliza CaseGeneratorAgent.extractCitations si está disponible en runtime.
     */
    extractCitations(text) {
      if (typeof CaseGeneratorAgent !== "undefined" && typeof CaseGeneratorAgent.extractCitations === "function") {
        return CaseGeneratorAgent.extractCitations(text);
      }
      if (!text || typeof text !== "string") return [];
      const citationRegex = /\b(?:Arts?\.?|Artículos?)\s+([0-9]+(?:\s*(?:N[°oº]|número)\s*[0-9]+)?(?:\s*inc(?:\.|iso)?\s*[0-9]+)?(?:(?:\s*,\s*|\s+y\s+)[0-9]+(?:\s*(?:N[°oº]|número)\s*[0-9]+)?(?:\s*inc(?:\.|iso)?\s*[0-9]+)?)*)\s*(?:del\s+)?(CC|CPC|COT|CPR|Código\s+Civil|Código\s+de\s+Procedimiento\s+Civil|Código\s+Orgánico\s+de\s+Tribunales|Constitución(?:\s+Política)?)/gi;
      const matches = [];
      let match;
      while ((match = citationRegex.exec(text)) !== null) {
        const raw = match[0];
        const articleStr = match[1].trim();
        const codeStr = match[2].trim();
        matches.push({ raw, article: articleStr, code: codeStr });
      }
      return matches;
    },

    /**
     * Clasificador heurístico ponderado de la naturaleza de la cédula.
     * Orden de precedencia estricto ante empates:
     * procedencia > competencia > plazos > case > dogmatic (fallback)
     */
    detectNature(topic) {
      if (!topic) return "dogmatic";
      const title = (topic.cleanTitle || topic.title || "").toLowerCase();
      const content = (topic.content || "").toLowerCase();
      const combined = `${title} ${content}`;

      if (!combined.trim()) return "dogmatic";

      // Palabras clave por familia
      const procedenciaKeys = [
        "recurso de apelación", "recurso de apelacion", "recurso de casación", "recurso de casacion",
        "recurso de protección", "recurso de proteccion", "recurso de amparo", "recurso de queja",
        "recurso de reposición", "recurso de reposicion", "requisitos de admisibilidad", "admisibilidad",
        "procedencia", "excepción dilatoria", "excepcion dilatoria", "excepción perentoria", "excepcion perentoria",
        "medida prejudicial", "medida cautelar", "nulidad procesal", "interponer", "deducir", "inadmisibil",
        "incidente"
      ];

      const competenciaKeys = [
        "tribunal competente", "reglas de competencia", "prórroga de competencia", "prorroga de competencia",
        "juzgado de letras", "corte de apelaciones", "corte suprema", "competencia", "radicación", "radicacion",
        "acumulación", "acumulacion", "inhibitoria", "declinatoria", "prevención", "prevencion", "cuantía", "cuantia"
      ];

      const plazosKeys = [
        "días hábiles", "dias habiles", "días corridos", "dias corridos", "contados desde", "estado diario",
        "cómputo", "computo", "caducidad", "perención", "perencion", "fatal", "suspende", "interrumpe",
        "plazo", "término", "termino", "notificación", "notificacion", "hábiles", "habiles", "de días", "de dias",
        "de meses", "de años", "de anos"
      ];

      const caseKeys = [
        "aplicación práctica", "aplicacion practica", "en la práctica", "en la practica",
        "operación aritmética", "operacion aritmetica", "cálculo", "calculo", "supuesto",
        "ejemplo", "ilustra", "ejemplifica", "caso"
      ];

      const countOccurrences = (text, keys) => {
        let score = 0;
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          let pos = 0;
          while ((pos = text.indexOf(k, pos)) !== -1) {
            score++;
            pos += k.length;
          }
        }
        return score;
      };

      const scoreProc = countOccurrences(combined, procedenciaKeys);
      const scoreComp = countOccurrences(combined, competenciaKeys);
      let scorePlaz = countOccurrences(combined, plazosKeys);
      const scoreCase = countOccurrences(combined, caseKeys);

      // Filtro estricto para plazos: solo si la cédula gira sobre tiempo
      const titleHasPlazo = title.includes("plazo") || title.includes("término") || title.includes("termino") || title.includes("cómputo") || title.includes("computo");
      if (!titleHasPlazo && scorePlaz < 3) {
        scorePlaz = 0;
      }

      // Evaluar orden de precedencia y puntuación más alta
      const scores = [
        { nature: "procedencia", score: scoreProc },
        { nature: "competencia", score: scoreComp },
        { nature: "plazos", score: scorePlaz },
        { nature: "case", score: scoreCase }
      ];

      let maxScore = 0;
      let winner = "dogmatic";

      for (let i = 0; i < scores.length; i++) {
        if (scores[i].score > maxScore) {
          maxScore = scores[i].score;
          winner = scores[i].nature;
        }
      }

      return winner;
    },

    /**
     * Construye exactamente 4 preguntas de grado para una cédula específica.
     * Cumple con la Regla Maestra de mix según la naturaleza detectada.
     */
    buildSectionQuestions(topic) {
      if (!topic) return [];
      const topicId = topic.id || "topic-unknown";
      const subject = topic.subject || "civil";
      const cleanTitle = topic.cleanTitle || topic.title || "Institución Jurídica";
      const content = topic.content || "";
      const nature = this.detectNature(topic);

      // Citas reales extraídas del contenido (guardrail anti-alucinación)
      const extracted = this.extractCitations(content);
      const uniqueCitations = [];
      const seenRaw = new Set();
      extracted.forEach(c => {
        const clean = c.raw.trim();
        if (!seenRaw.has(clean)) {
          seenRaw.add(clean);
          uniqueCitations.push(clean);
        }
      });

      // Normalizar identificadores de pregunta
      const codeClean = (topic.indexCode || topic.code || "1-1").replace(/[^a-zA-Z0-9]/g, "-");
      const stem = (topic.sourceFile || cleanTitle)
        .replace(/\.md$/i, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .slice(0, 15) || "cedula";

      // RNG determinista basado en el ID del tópico
      const seed = fnv1a(topicId);

      // Generar 4 especificaciones de pregunta según el mix de la naturaleza
      const specs = this._getQuestionSpecsForNature(nature, cleanTitle, uniqueCitations, topic);

      const questions = specs.map((spec, idx) => {
        const qNum = idx + 1;
        const qId = `qv-${subject}-${stem}-${codeClean}-${qNum}`;

        // Barajar alternativas deterministamente con el PRNG
        const qPrng = mulberry32(seed + (qNum * 997));
        const rawOptions = [
          { text: spec.correctText, isCorrect: true },
          { text: spec.distractor1, isCorrect: false },
          { text: spec.distractor2, isCorrect: false },
          { text: spec.distractor3, isCorrect: false },
          { text: spec.distractor4, isCorrect: false }
        ];

        const shuffled = shuffleArray(rawOptions, qPrng);
        const letters = ["a", "b", "c", "d", "e"];
        let correctLetter = "a";

        const options = shuffled.map((opt, oIdx) => {
          const letter = letters[oIdx];
          if (opt.isCorrect) correctLetter = letter;
          return { id: letter, text: opt.text };
        });

        // Asegurar que las sourceCitations de la pregunta sean subconjunto de las citas reales
        const relevantCitations = spec.sourceCitations.filter(c => uniqueCitations.includes(c));

        return {
          id: qId,
          topicId: topicId,
          nature: spec.nature || nature,
          number: qNum,
          questionText: spec.questionText,
          options: options,
          correctAnswer: correctLetter,
          solucionDogmatica: spec.solucionDogmatica,
          pauta: spec.pauta,
          sourceCitations: relevantCitations
        };
      });

      return questions;
    },

    /**
     * Plantillas de generación de preguntas por naturaleza respetando la Regla Maestra.
     */
    _getQuestionSpecsForNature(nature, cleanTitle, uniqueCitations, topic) {
      const citeStr = uniqueCitations.length > 0 ? ` (conforme a ${uniqueCitations[0]})` : "";
      const primaryCite = uniqueCitations.length > 0 ? [uniqueCitations[0]] : [];
      const secondaryCite = uniqueCitations.length > 1 ? [uniqueCitations[1]] : primaryCite;

      if (nature === "procedencia") {
        return [
          {
            nature: "procedencia",
            questionText: `Respecto a la procedencia y naturaleza jurídica de ${cleanTitle}, ¿en qué hipótesis es jurídicamente procedente su interposición o alegación?`,
            correctText: `Procede únicamente concurriendo agravio manifiesto o vulneración procesal tipificada, dentro de la oportunidad legal y ante el tribunal investido de potestad resolutiva${citeStr}.`,
            distractor1: `Es procedente en cualquier estado de la causa, incluso de oficio por el tribunal arbitral sin mediar petición de parte ni perjuicio reparable.`,
            distractor2: `Procede exclusivamente como recurso extraordinario de derecho estricto ante el tribunal de casación, prescindiendo del principio de trascendencia.`,
            distractor3: `Basta la simple disconformidad de hecho del litigante, operando con efecto suspensivo automático e inderogable en toda instancia.`,
            distractor4: `Procede únicamente si las partes han celebrado un pacto de arbitraje previo que renuncie expresamente a las instancias ordinarias.`,
            solucionDogmatica: `La procedencia procesal de ${cleanTitle} exige la concurrencia copulativa de legitimación activa, oportunidad procesal y agravio sustancial. Los distractores confunden la vía con potestades de oficio inexistentes o con la renuncia a recursos ordinarios. Conclusión: La procedencia queda subordinada a la afectación jurídica tipificada y deducida tempestivamente ante el órgano con jurisdicción.`,
            pauta: `Comisión evalúa distinción nítida entre admisibilidad formal y procedencia de fondo, con apego a la regla adjetiva.`,
            sourceCitations: primaryCite
          },
          {
            nature: "procedencia",
            questionText: `En cuanto a los requisitos de admisibilidad formal para impetrar ${cleanTitle}, la doctrina y la ley exigen:`,
            correctText: `Interposición fundada por escrito dentro de plazo legal fatal, patrocinio habilitado y mención clara de las peticiones concretas sometidas a fallo.`,
            distractor1: `Consignación pecuniaria previa equivalente al 20% de la cuantía controvertida bajo sanción de tenerlo por no interpuesto de plano.`,
            distractor2: `Audiencia previa y verbal ante el pleno del tribunal superior antes de resolver sobre el examen de admisibilidad formal.`,
            distractor3: `Comparecencia personalísima de la parte material, prohibiéndose de manera absoluta la representación por mandato judicial.`,
            distractor4: `Ratificación por escritura pública suscrita ante notario público titular con asiento en la comuna de asiento de la Corte.`,
            solucionDogmatica: `El examen de admisibilidad de ${cleanTitle} verifica presupuestos formales: plazo fatal, legitimación, patrocinio y peticiones concretas. Se descartan de plano exigencias arcaicas como consignaciones sin texto expreso o ratificaciones notariales solemnes. Conclusión: La admisibilidad formal depende del cumplimiento estricto del plazo fatal y la postulación procesal técnica.`,
            pauta: `Precisión en los presupuestos de admisibilidad del examen de cuenta del tribunal adjetivo.`,
            sourceCitations: secondaryCite
          },
          {
            nature: "procedencia",
            questionText: `Respecto a los efectos y alcance procesal una vez acogida o declarada admisible la vía de ${cleanTitle}:`,
            correctText: `Genera efectos vinculantes limitados a la cuestión controvertida, rigiendo la regla general de que los incidentes y recursos no suspenden el curso del litigio salvo orden de no innovar o causal legal expresa.`,
            distractor1: `Produce de pleno derecho la nulidad refleja e inmediata de todo lo obrado en el juicio principal desde la notificación de la demanda.`,
            distractor2: `Extingue retroactivamente la acción sustantiva deducida, impidiendo su renovación aun cuando se subsanen los defectos formales.`,
            distractor3: `Convierte el procedimiento ordinario en un juicio de hacienda sumario tramitado ante el Consejo de Defensa del Estado.`,
            distractor4: `Obliga al tribunal a suspender indefinidamente todas las causas en tabla del tribunal superior hasta que el fallo quede ejecutoriado.`,
            solucionDogmatica: `El principio de continuidad procesal prescribe que la admisión de ${cleanTitle} no paraliza el negocio principal a menos que la ley prevea efecto suspensivo o se decrete ONI. Los distractores incurren en exageraciones de nulidad refleja o mutación injustificada de procedimientos. Conclusión: El alcance procesal se circumscribe al objeto del debate y su efecto suspensivo requiere mandato legal o concesión judicial expresa.`,
            pauta: `Dominio del efecto suspensivo vs. devolutivo y el alcance de las órdenes de no innovar.`,
            sourceCitations: primaryCite
          },
          {
            nature: "dogmatic",
            questionText: `Doctrinalmente, ¿cuál es la naturaleza jurídica y el fundamento sustancial de ${cleanTitle}?`,
            correctText: `Constituye un instrumento de tutela efectiva del debido proceso destinado a restablecer el imperio del derecho o la correcta aplicación de la ley procesal.`,
            distractor1: `Es un contrato procesal bilateral de carácter innominado regulado exclusivamente por el principio de la autonomía de la voluntad.`,
            distractor2: `Constituye una sanción civil punitiva que transfiere la titularidad del crédito litigioso a favor del Fisco de Chile.`,
            distractor3: `Es una mera formalidad optativa cuya omisión no genera preclusión ni afectación alguna a la validez de los actos judiciales.`,
            distractor4: `Es un acto administrativo reglamentario regido supletoriamente por la Ley N° 19.880 de bases de los procedimientos administrativos.`,
            solucionDogmatica: `La dogmática califica a ${cleanTitle} como una manifestación del derecho al debido proceso y tutela judicial efectiva. Desvirtuarlo como contrato procesal o acto administrativo desconoce la función pública de la jurisdicción. Conclusión: La naturaleza dogmática de la institución reside en la garantía del debido proceso y la regularidad del ejercicio de la función judicial.`,
            pauta: `Explicación conceptual de nivel de grado sobre la ratio iuris de la vía procesal.`,
            sourceCitations: []
          }
        ];
      }

      if (nature === "competencia") {
        return [
          {
            nature: "competencia",
            questionText: `En relación con las reglas de competencia aplicables a ${cleanTitle}, ¿qué tribunal resulta naturalmente competente para conocer del asunto?`,
            correctText: `El tribunal señalado expresamente por las reglas de competencia absoluta (fuero, materia y cuantía), sin perjuicio de la radicación de la causa una vez fijada la relación procesal.`,
            distractor1: `El tribunal que el demandante designe unilateralmente en su libelo, con prescindencia del fuero y la jerarquía de los juzgados.`,
            distractor2: `Siempre y en todo caso la Corte Suprema en única instancia en virtud de sus facultades conservadoras y de superintendencia.`,
            distractor3: `El tribunal arbitral arbitrador de la jurisdicción, operando un arbitraje forzoso de pleno derecho sin excepción.`,
            distractor4: `Cualquier juzgado de policía local de la comuna donde se haya suscrito el contrato o ejecutado el hecho.`,
            solucionDogmatica: `Las reglas de orden público procesal que informan la competencia absoluta (materia, fuero y cuantía) son irrenunciables e inderogables por las partes. Concurriendo un asunto sobre ${cleanTitle}, la ley orgánica determina inexcusablemente el tribunal del grado. Conclusión: La determinación del tribunal competente emana de las normas de orden público de competencia absoluta y las reglas de radicación.`,
            pauta: `Identificación certera de los factores de competencia absoluta y su carácter irrenunciable.`,
            sourceCitations: primaryCite
          },
          {
            nature: "competencia",
            questionText: `Respecto a la prórroga de la competencia en el marco de ${cleanTitle}, ¿cuál de las siguientes afirmaciones es correcta?`,
            correctText: `Solo es jurídicamente admisible en materias contenciosas civiles, en primera o única instancia, entre tribunales ordinarios de igual jerarquía y exclusivamente respecto del factor territorio.`,
            distractor1: `Las partes pueden prorrogar válidamente el factor fuero y materia siempre que conste por instrumento público firmado ante notario.`,
            distractor2: `La prórroga opera de pleno derecho en los tribunales penales y en los juicios de menores sin requerir voluntad de las partes.`,
            distractor3: `La prórroga tácita se perfecciona por el hecho de interponer una excepción de incompetencia por vía inhibitoria.`,
            distractor4: `Puede prorrogarse la competencia de un tribunal ordinario a favor de un órgano administrativo del Poder Ejecutivo.`,
            solucionDogmatica: `La prórroga de competencia es de derecho estricto: procede solo respecto del factor territorio, en asuntos contenciosos civiles de primera o única instancia. Jamás puede prorrogarse la materia, el fuero o la jerarquía. Conclusión: La prórroga de competencia se restringe indefectiblemente al elemento territorial en sede civil contenciosa.`,
            pauta: `Distinción categórica entre factores disponibles (territorio) e indisponibles (fuero, materia, cuantía).`,
            sourceCitations: secondaryCite
          },
          {
            nature: "competencia",
            questionText: `En virtud del principio de radicación y las reglas generales de la competencia, una vez trabada válidamente la litis sobre ${cleanTitle}:`,
            correctText: `El tribunal queda fijado de modo irrevocable para conocer del negocio hasta su total conclusión, sin que las alteraciones sobrevinientes modifiquen su potestad.`,
            distractor1: `Cualquiera de las partes puede exigir que la causa sea transferida a otro tribunal de similar cuantía mediante simple solicitud verbal.`,
            distractor2: `Si el demandado cambia de domicilio durante el juicio, la causa se remite automáticamente al juzgado del nuevo domicilio.`,
            distractor3: `El tribunal pierde competencia de pleno derecho si transcurren más de 30 días sin que se dicte una resolución de mera sustanciación.`,
            distractor4: `La radicación se extingue si fallece una de las partes, debiendo iniciarse un juicio completamente nuevo ante el tribunal sucesorio.`,
            solucionDogmatica: `La regla de la radicación (fijeza) consagra que fijada con arreglo a la ley la competencia de un juez, no se alterará por causa sobreviniente alguna. Ni la mutación de domicilio ni la muerte extinguen la radicación radicada en el tribunal original. Conclusión: La radicación asegura la invariabilidad del tribunal legalmente investido hasta la total ejecución del fallo.`,
            pauta: `Manejo preciso de las reglas generales de la competencia del Código Orgánico de Tribunales.`,
            sourceCitations: []
          },
          {
            nature: "procedencia",
            questionText: `Para reclamar la incompetencia del tribunal en una controversia relativa a ${cleanTitle}, el litigante afectado debe:`,
            correctText: `Deducir la excepción de incompetencia en tiempo y forma, sea por vía inhibitoria (ante el que cree competente) o declinatoria (ante el que estima incompetente), sin emplear ambas conjuntamente.`,
            distractor1: `Interponer directamente un recurso de queja disciplinario prescindiendo de toda alegación previa ante el juez de la causa.`,
            distractor2: `Promover un juicio sumario de jactancia procesal en contra del juez titular para suspender sus atribuciones judiciales.`,
            distractor3: `Negarse a comparecer en el juicio, operando la incompetencia de pleno derecho sin necesidad de pronunciamiento judicial.`,
            distractor4: `Acudir a la Contraloría General de la República para que dirima la contienda de jurisdicción entre tribunales.`,
            solucionDogmatica: `Las vías adjetivas idóneas para reclamar la incompetencia son la declinatoria y la inhibitoria. El litigante debe optar por una de ellas, quedando vedado el ejercicio simultáneo o sucesivo de ambas. Conclusión: El control de la competencia se ejerce privativamente por vía declinatoria o inhibitoria dentro del término de emplazamiento.`,
            pauta: `Conocimiento de los incidentes de incompetencia y la prohibición de uso coetáneo de vías adjetivas.`,
            sourceCitations: []
          }
        ];
      }

      if (nature === "plazos") {
        return [
          {
            nature: "plazos",
            questionText: `En el cómputo y régimen de plazos aplicable a ${cleanTitle}, si la ley o el tribunal fija un término de días, ¿cómo opera su decurso temporal?`,
            correctText: `Se suspende durante los días feriados si se trata de un plazo de días previsto en el Código de Procedimiento Civil, siendo fatal para ejercer el derecho respectivo${citeStr}.`,
            distractor1: `Se computa invariablemente de momento a momento, sin admitir prórroga ni exclusión de días inhábiles en ninguna circunstancia.`,
            distractor2: `Los plazos de días procesales son siempre continuos y no se suspenden jamás por la concurrencia de feriados legales.`,
            distractor3: `El término corre únicamente en horario matutino de 09:00 a 12:00 horas, feneciendo automáticamente en los meses de receso estival.`,
            distractor4: `Todo plazo de días puede extenderse unilateralmente por voluntad del notificador judicial sin autorización del juez.`,
            solucionDogmatica: `En materia procesal civil (art. 66 CPC), los términos de días son discontinuos, suspendiéndose durante los feriados, y revisten carácter fatal de pleno derecho. En el Código Civil, la regla general son los días corridos (art. 50 CC). Conclusión: La naturaleza procesal del plazo impone el cómputo de días hábiles y su extinción por el solo ministerio de la ley.`,
            pauta: `Examen de grado evalúa la antinomia fundamental entre días corridos del CC vs. días hábiles del CPC.`,
            sourceCitations: primaryCite
          },
          {
            nature: "case",
            questionText: `Supuesto práctico de cómputo en ${cleanTitle}: Notificada una resolución que confiere un plazo fatal de 5 días hábiles un día martes (siendo inhábil el sábado y feriado el jueves):`,
            correctText: `El plazo comienza a correr el miércoles, se suspende el jueves (feriado) y el sábado/domingo (inhábiles), venciendo a la medianoche del miércoles de la semana siguiente.`,
            distractor1: `El plazo vence el día domingo inmediatamente posterior a la notificación por aplicación del cómputo natural del Código Civil.`,
            distractor2: `El plazo vence el viernes de la misma semana porque los feriados no inciden en los plazos judiciales breves.`,
            distractor3: `El término no empieza a correr hasta que la contraparte confirme verbalmente su recepción en el tribunal.`,
            distractor4: `El plazo se prorroga indefinidamente hasta el primer día hábil del mes calendario siguiente.`,
            solucionDogmatica: `Notificado el martes, el primer día es el miércoles (día 1). Jueves inhábil por feriado (no corre). Viernes (día 2). Sábado y domingo inhábiles (no corren). Lunes (día 3). Martes (día 4). Miércoles (día 5). El cómputo correcto excluye feriados e inhábiles rigiendo la preclusión al término de la jornada. Conclusión: El cómputo en días hábiles procesales excluye feriados y fines de semana hasta el fenecimiento del último día útil.`,
            pauta: `Destreza práctica en el cómputo de plazos con interposición de días feriados legales.`,
            sourceCitations: []
          },
          {
            nature: "dogmatic",
            questionText: `Respecto a la fatalidad y caducidad de los plazos en relación con ${cleanTitle}:`,
            correctText: `El derecho o facultad procesal se extingue por el solo ministerio de la ley al vencimiento del plazo, sin necesidad de acusar rebeldía previa ni dictar resolución declarativa.`,
            distractor1: `El derecho permanece vigente de manera indefinida hasta que la contraparte presente una fianza de resultas en el expediente.`,
            distractor2: `La fatalidad solo opera si el juez certifica por resolución notificada personalmente la desidia del litigante.`,
            distractor3: `Todo plazo fatal puede revivirse pagando una multa a beneficio municipal en la cuenta corriente del juzgado.`,
            distractor4: `La caducidad del plazo requiere siempre la prueba fehaciente del dolo o culpa levísima del requirente.`,
            solucionDogmatica: `La regla del art. 64 del CPC consagra que los plazos fatales extinguen la facultad respectiva ipso iure una vez fenecidos. La perención o pérdida del trámite opera de pleno derecho sin requerir evacuación de rebeldía formal. Conclusión: La fatalidad legal acarrea la caducidad objetiva y automática de la facultad procesal.`,
            pauta: `Identificación de la evolución histórica desde las rebeldías acusadas a la fatalidad de pleno derecho.`,
            sourceCitations: secondaryCite
          },
          {
            nature: "case",
            questionText: `En una situación de fuerza mayor o caso fortuito sobreviniente que impide evacuar una gestión en el término de ${cleanTitle}:`,
            correctText: `El afectado puede impetrar la rescisión o entorpecimiento dentro del término fatal legalmente fijado desde que cesó el impedimento, justificando el hecho impeditivo.`,
            distractor1: `El procedimiento queda nulo de pleno derecho sin necesidad de justificar el entorpecimiento alegado.`,
            distractor2: `La parte perjudicada puede unilateralmente duplicar el plazo sin solicitar pronunciamiento del tribunal.`,
            distractor3: `La fuerza mayor no produce efecto alguno en el derecho chileno, rigiendo una responsabilidad procesal objetiva e inexcusable.`,
            distractor4: `El secretario del tribunal está obligado a dictar sentencia favorable a la parte impedida como indemnización de perjuicios.`,
            solucionDogmatica: `El entorpecimiento procesal (art. 79 CPC) ampara al litigante ante eventos de fuerza mayor imprevistos e insuperables, otorgándole el plazo residual siempre que se reclame inmediatamente tras el cese del óbice. Conclusión: El entorpecimiento por fuerza mayor permite rescatar la oportunidad procesal mediante justificación oportuna ante el juez.`,
            pauta: `Aplicación armónica del caso fortuito procesal y el incidente de entorpecimiento.`,
            sourceCitations: []
          }
        ];
      }

      if (nature === "case") {
        return [
          {
            nature: "case",
            questionText: `Caso práctico de subsunción sobre ${cleanTitle}: En un supuesto de hecho donde concurren los presupuestos base de la institución y una de las partes alega falta de eficacia jurídica:`,
            correctText: `El tribunal debe acoger la pretensión amparada en ${cleanTitle}, toda vez que se configuran copulativamente el título legítimo, la capacidad y los requisitos de oponibilidad frente a terceros${citeStr}.`,
            distractor1: `El tribunal debe desestimar la acción de plano aplicando una presunción de mala fe procesal que no admite prueba en contrario.`,
            distractor2: `La pretensión se extingue si no se acompañan simultáneamente tres testimonios notariales de testigos domiciliados en el lugar.`,
            distractor3: `Debe declararse la nulidad de todo lo actuado por falta de comparecencia del Ministerio Público en sede civil patrimonial.`,
            distractor4: `El caso debe ser derivado a arbitraje obligatorio de seguros comerciales con prescindencia del estatuto común.`,
            solucionDogmatica: `En el análisis de casos sobre ${cleanTitle}, la configuración de los elementos constitutivos impone otorgar el amparo sustantivo peticionado. Los distractores introducen formalidades procesales impertinentes o presunciones de mala fe contrarias al principio rector del derecho civil. Conclusión: La concurrencia de los requisitos constitutivos legitima la pretensión de fondo deducida.`,
            pauta: `Capacidad de subsunción dogmática y descarte de excepciones puramente dilatorias.`,
            sourceCitations: primaryCite
          },
          {
            nature: "case",
            questionText: `Alteración del supuesto fáctico en ${cleanTitle}: ¿Qué efecto sustantivo sobreviene si se comprueba que el requirente incurrió en dolo o actuó a sabiendas de un vicio invalidante?`,
            correctText: `Carece de legitimación para solicitar la nulidad fundada en dicho vicio y no puede repetir lo dado o pagado en virtud de causa ilícita a sabiendas.`,
            distractor1: `Mantiene incólume la facultad de invocar su propio dolo para obtener la restitución íntegra del patrimonio transferido.`,
            distractor2: `El vicio queda saneado de pleno derecho por el simple transcurso de 24 horas contadas desde el acto doloso.`,
            distractor3: `El juez debe imponerle una condena penal de presidio sin necesidad de juicio penal previo ante el tribunal oral.`,
            distractor4: `Se produce una novación automática del negocio, transformándose en una donación irrevocable a favor del demandado.`,
            solucionDogmatica: `El principio que prohíbe aprovecharse del propio dolo (nemo auditur propriam turpitudinem allegans) y la regla del art. 1468 del Código Civil impiden alegar la nulidad a quien conocía o debía conocer el vicio. Conclusión: El dolo o ciencia del vicio inhabilita la legitimación anulatoria y enerva la acción de repetición.`,
            pauta: `Manejo del principio de buena fe y las sanciones sustantivas a la conducta contraria a derecho.`,
            sourceCitations: secondaryCite
          },
          {
            nature: "case",
            questionText: `En un conflicto práctico donde colisionan los derechos emanados de ${cleanTitle} frente a un tercero adquirente de buena fe a título oneroso:`,
            correctText: `El ordenamiento tutela la seguridad del tráfico jurídico y protege al tercero amparado en la apariencia registral o posesoria legítima.`,
            distractor1: `El tercero sucumbe en toda hipótesis, rigiendo un principio absoluto de reivindicación sin indemnización alguna.`,
            distractor2: `El negocio se anula retroactivamente sin permitir al tercero oponer excepciones reales ni prescripción adquisitiva.`,
            distractor3: `El tercero queda obligado a pagar las costas del juicio primitivo en calidad de fiador solidario judicial.`,
            distractor4: `La disputa debe ser resuelta exclusivamente por sorteo público efectuado ante el secretario del tribunal de alzada.`,
            solucionDogmatica: `La colisión entre el titular originario y el tercero de buena fe se resuelve ponderando la función social del dominio y la protección de la confianza legítima en el tráfico registral/posesorio. Conclusión: La buena fe registral y la onerosidad consolidan la posición del adquirente frente a nulidades inoponibles.`,
            pauta: `Ponderación de derechos concurrentes y protección del tráfico jurídico en el examen de grado.`,
            sourceCitations: []
          },
          {
            nature: "dogmatic",
            questionText: `Síntesis doctrinal de clausura: La ratio iuris fundamental que inspira la regulación de ${cleanTitle} en el derecho sustantivo chileno es:`,
            correctText: `Garantizar la certidumbre jurídica, el equilibrio patrimonial entre las partes y la estabilidad de las relaciones jurídicas constituidas.`,
            distractor1: `Impedir el ejercicio de la actividad económica privada mediante un intervencionismo absoluto del Estado.`,
            distractor2: `Fomentar la litigiosidad recurrente como mecanismo de financiamiento de los tribunales de justicia.`,
            distractor3: `Subordinar la validez de los acuerdos privados a la aprobación previa del concejo municipal respectivo.`,
            distractor4: `Crear privilegios crediticios hereditarios e imprescriptibles a favor de determinadas corporaciones gremiales.`,
            solucionDogmatica: `El ordenamiento civil y procesal se asienta sobre la certeza del derecho y la salvaguarda de la buena fe objetiva en el tráfico. ${cleanTitle} materializa este principio rector tutelando el equilibrio negocial. Conclusión: La institución procura la seguridad jurídica y la preservación del orden público patrimonial.`,
            pauta: `Articulación de los principios generales del derecho privado chileno.`,
            sourceCitations: []
          }
        ];
      }

      // Default: DOGMATIC
      return [
        {
          nature: "dogmatic",
          questionText: `En relación con el concepto, naturaleza jurídica y elementos esenciales de ${cleanTitle}, ¿cuál de las siguientes proposiciones es dogmáticamente correcta?`,
          correctText: `Requiere para su perfeccionamiento la concurrencia copulativa de los requisitos de existencia y validez instituidos por el ordenamiento sustantivo${citeStr}.`,
          distractor1: `Basta el mero consentimiento verbal aun cuando la ley imponga expresamente una solemnidad por vía de existencia o ad probationem.`,
          distractor2: `Se configura de pleno derecho por la sola voluntad de un tercero ajeno a la relación jurídica sin requerir manifestación de voluntad alguna.`,
          distractor3: `Es una figura derogada tácitamente que subsiste únicamente como norma consuetudinaria sin eficacia ante los tribunales de justicia.`,
          distractor4: `Constituye una ficción procesal que solo produce consecuencias jurídicas cuando es autorizada por un tribunal colegiado en acuerdo pleno.`,
          solucionDogmatica: `La dogmática de ${cleanTitle} exige la concurrencia armónica de los presupuestos de validez y eficacia. Desconocer la exigencia de solemnidades o asumir efectos sin voluntad contraría los axiomas fundamentales de los actos jurídicos. Conclusión: La institución exige la concurrencia copulativa de sus elementos esenciales de existencia y validez.`,
          pauta: `Criterio de grado evalúa la precisión conceptual y la distinción entre requisitos de existencia y de validez.`,
          sourceCitations: primaryCite
        },
        {
          nature: "dogmatic",
          questionText: `En cuanto a la clasificación, modalidades y elementos constitutivos que estructuran ${cleanTitle}:`,
          correctText: `Se distingue entre elementos de la esencia (generales y específicos), de la naturaleza y accidentales, incorporándose estos últimos por estipulación expresa.`,
          distractor1: `Todos sus elementos son invariablemente de orden público, estando vedado a las partes introducir cualquier modalidad, plazo o condición.`,
          distractor2: `Carece de elementos accidentales, rigiéndose únicamente por cláusulas de estilo estandarizadas e inmodificables.`,
          distractor3: `La condición resolutoria tácita y la representación constituyen elementos de la esencia específicos que no admiten renuncia.`,
          distractor4: `Los elementos de la naturaleza requieren mención expresa por escritura pública para entenderse incorporados al acto.`,
          solucionDogmatica: `El tripartito dogmático (art. 1444 Código Civil) clasifica las cosas de los actos en esenciales, de la naturaleza (que la ley suple en silencio) y accidentales (agregados por voluntad de las partes). Conclusión: La estructura de ${cleanTitle} integra elementos esenciales inderogables y cláusulas accidentales nacidas de la autonomía negocial.`,
          pauta: `Aplicación impecable de la teoría de los elementos del acto jurídico consagrada en el art. 1444 CC.`,
          sourceCitations: secondaryCite
        },
        {
          nature: "dogmatic",
          questionText: `Respecto a los efectos y consecuencias jurídicas fundamentales que genera ${cleanTitle} válidamente constituido:`,
          correctText: `Engendra derechos y obligaciones correlativos entre las partes, produciendo el efecto relativo que limita su oponibilidad directa frente a terceros extraños.`,
          distractor1: `Genera una obligación universal indivisible que vincula de manera forzosa a todas las personas naturales de la República.`,
          distractor2: `Produce la inoponibilidad absoluta del acto frente a las propias partes que concurrieron a su celebración con conocimiento de causa.`,
          distractor3: `Extingue retroactivamente todas las deudas tributarias y previsionales contraídas por el sujeto activo con anterioridad a su nacimiento.`,
          distractor4: `Impide de manera perpetua el ejercicio de cualquier acción judicial resolutoria, rescisoria o de cumplimiento forzado.`,
          solucionDogmatica: `El principio del efecto relativo de los actos y contratos circunscribe sus efectos jurídicos a los otorgantes o partes contratantes, sin perjuicio de la oponibilidad como hecho objetivo frente a terceros. Conclusión: La eficacia jurídica vincula directamente a las partes en virtud de la ley del contrato y el efecto relativo negocial.`,
          pauta: `Comprensión de la ley del contrato y el alcance exacto del efecto relativo de los actos jurídicos.`,
          sourceCitations: []
        },
        {
          nature: "dogmatic",
          questionText: `Al contrastar ${cleanTitle} con instituciones dogmáticas afines y analizar sus causales de ineficacia o extinción:`,
          correctText: `La ineficacia puede sobrevenir por vicios coetáneos a su celebración (nulidad) o por hechos sobrevinientes (resolución, revocación o resciliación).`,
          distractor1: `La nulidad y la resolución son figuras idénticas que operan siempre por causales originarias previas a la formación del vínculo.`,
          distractor2: `Una vez nacido el acto, este se vuelve indestructible, no admitiendo resciliación mutua por acuerdo de voluntades.`,
          distractor3: `La rescisión por lesión enorme opera de manera uniforme en todos los contratos bilaterales y unilaterales del derecho privado.`,
          distractor4: `Toda causal de ineficacia sobreviniente debe ser declarada exclusivamente por sentencia dictada en juicio sumarial penal.`,
          solucionDogmatica: `Es cardinal distinguir las causales de ineficacia intrínsecas u originarias (nulidad absoluta y relativa) de aquellas sobrevinientes o extrínsecas (resolución por incumplimiento, resciliación, caducidad o revocación). Conclusión: La ineficacia reconoce dos grandes categorías: vicios de origen sancionados con nulidad e ineficacias sobrevinientes emanadas de la inejecución o mutuo disenso.`,
          pauta: `Claridad dogmática en el cuadro comparativo de ineficacias del acto jurídico en el Examen de Grado.`,
          sourceCitations: []
        }
      ];
    },

    /**
     * Valida la consistencia formal y dogmática de las 4 preguntas generadas.
     * Retorna { valid: boolean, errors: string[] }.
     */
    validateSectionQuestions(topic, questions) {
      const errors = [];
      if (!Array.isArray(questions) || questions.length !== 4) {
        errors.push(`Se esperaban exactamente 4 preguntas de grado, pero se obtuvieron ${questions ? questions.length : 0}.`);
        return { valid: false, errors };
      }

      const content = (topic && topic.content) || "";
      const extracted = this.extractCitations(content);
      const allowedCitations = new Set(extracted.map(c => c.raw.trim()));

      questions.forEach((q, idx) => {
        const qNum = idx + 1;
        if (!q.id || typeof q.id !== "string") {
          errors.push(`Pregunta ${qNum}: id inválido o ausente.`);
        }
        if (!Array.isArray(q.options) || q.options.length !== 5) {
          errors.push(`Pregunta ${qNum}: debe contener exactamente 5 opciones (A-E).`);
        }
        if (!["a", "b", "c", "d", "e"].includes(q.correctAnswer)) {
          errors.push(`Pregunta ${qNum}: correctAnswer debe ser una de las letras 'a'..'e'.`);
        }
        if (!q.solucionDogmatica || q.solucionDogmatica.length < 150) {
          errors.push(`Pregunta ${qNum}: solucionDogmatica debe ser explicativa y sustancial (mínimo 150 caracteres).`);
        }
        if (!q.solucionDogmatica || !q.solucionDogmatica.includes("Conclusión:")) {
          errors.push(`Pregunta ${qNum}: solucionDogmatica debe culminar con el cierre explícito 'Conclusión:'.`);
        }
        if (Array.isArray(q.sourceCitations)) {
          q.sourceCitations.forEach(c => {
            if (!allowedCitations.has(c.trim())) {
              errors.push(`Pregunta ${qNum}: la cita '${c}' no existe en el contenido de la cédula.`);
            }
          });
        }
      });

      return {
        valid: errors.length === 0,
        errors: errors
      };
    },

    /**
     * Obtiene las 4 preguntas de una cédula con memoización en memoria.
     */
    getSectionQuestions(topic) {
      if (!topic) return [];
      const topicId = topic.id || "unknown";
      const content = topic.content || "";
      const contentHash = fnv1a(content).toString(16);
      const cacheKey = `${topicId}:${contentHash}`;

      if (this._cache.has(cacheKey)) {
        return this._cache.get(cacheKey);
      }

      const questions = this.buildSectionQuestions(topic);
      const val = this.validateSectionQuestions(topic, questions);
      if (!val.valid) {
        console.warn(`[QuestionDeveloper] Advertencias de validación en cédula ${topicId}:`, val.errors);
      }

      this._cache.set(cacheKey, questions);
      return questions;
    },

    /**
     * Consulta rápida de la naturaleza de una cédula por ID o topic.
     */
    natureOf(topicOrId) {
      if (typeof topicOrId === "object" && topicOrId !== null) {
        return this.detectNature(topicOrId);
      }
      if (typeof topicOrId === "string" && typeof StorageService !== "undefined") {
        try {
          const data = StorageService.getData();
          const t = (data.topics || []).find(item => item.id === topicOrId);
          if (t) return this.detectNature(t);
        } catch (e) {}
      }
      return "dogmatic";
    }
  };

  // Exposición del módulo
  if (typeof module !== "undefined" && module.exports) {
    module.exports = QuestionDeveloper;
  }
  if (typeof window !== "undefined") {
    window.QuestionDeveloper = QuestionDeveloper;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.QuestionDeveloper = QuestionDeveloper;
  }

})(typeof window !== "undefined" ? window : global);
