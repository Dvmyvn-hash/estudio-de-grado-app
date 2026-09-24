/**
 * CASE GENERATOR AGENT - AGENTE DE IA GENERADOR DE CASOS PRÁCTICOS DE GRADO
 * Genera casos prácticos inéditos de nivel examen de grado con base estricta en el
 * Protocolo AFG 2026-20, Pauta de Análisis de Hechos 2026 y Rúbrica Oficial de Justificación.
 * 
 * Incorpora:
 * 1. Catálogo estructurado de Instituciones Jurídicas (Civil, Procesal, Constitucional).
 * 2. Motor de Incompatibilidad Dogmática con descarte automático y justificación técnica.
 * 3. 10 Arquetipos Dogmáticos de Alta Fidelidad basados en las Pautas Universitarias (AFG 2026).
 * 4. Motor Mutador Dinámico (cero repetición): nombres, lugares, montos, fechas y juzgados aleatorios.
 * 5. Barajado Aleatorio de Alternativas (A a E): la opción correcta nunca está fija en 'A'.
 * 6. Motor de Afinidad Ponderada para selecciones específicas y fallback inteligente a examen simulado.
 * 7. Pauta 2026 de Hechos (principales, secundarios, distractores, partes e instituciones) y Rúbrica de 4 Dimensiones.
 */

var CaseGeneratorAgent = {
  selectedInstitutions: new Set(),
  activeMode: "manual", // "manual" | "preset"
  selectedPresetId: null,
  isGenerating: false,

  // 0. CORPUS DOGMÁTICO DE FUENTES OFICIALES (fuentes/*.md) Y APUNTES (103 CÉDULAS)
  FUENTES_CORPUS: {
    "ACTO JURIDICO.md": {
      title: "Derecho Civil - Teoría del Acto Jurídico (Apunte Canónico)",
      sections: [
        { name: "Teoría del Acto Jurídico", rules: "Arts. 1444-1458, 1681-1691 CC", doctrine: "Requisitos de existencia y validez. Error esencial y sustancial. Fuerza grave y determinante. Dolo coetáneo y determinante (reticencia). Lesión enorme como vicio objetivo taxativo. Nulidad absoluta (orden público, 10 años) vs Nulidad relativa (4 años)." }
      ]
    },
    "LOS BIENES.md": {
      title: "Derecho Civil: Teoría de los Bienes y Derechos Reales",
      sections: [
        { name: "La Posesión y sus Elementos", rules: "Arts. 700, 714 CC", doctrine: "Corpus y animus. Posesión regular e irregular. Posesión viciosa. Mera tenencia que reconoce dominio ajeno." },
        { name: "Modos de Adquirir y Posesión Inscrita", rules: "Arts. 670, 686, 724, 728, 2505 CC", doctrine: "Tradición de inmuebles por competente inscripción conservatoria. Garantía de posesión inscrita contra apoderamiento material y prescripción adquisitiva sin título (Art. 2505 CC)." },
        { name: "Protección del Dominio", rules: "Arts. 889, 895 CC", doctrine: "Acción reivindicatoria privativa del dueño no poseedor contra el poseedor no dueño." }
      ]
    },
    "LAS OBLIGACIONES.md": {
      title: "Derecho Civil - Teoría General de las Obligaciones",
      sections: [
        { name: "Teoría General de las Obligaciones", rules: "Arts. 1489, 1535, 1544, 1551, 1552 CC", doctrine: "Incumplimiento y condición resolutoria tácita. La mora purga la mora (exceptio non adimpleti contractus). Cláusula penal enorme y reducción legal al duplo del principal (Art. 1544 CC)." },
        { name: "Responsabilidad Civil Extracontractual", rules: "Arts. 2314-2334 CC", doctrine: "Capacidad delictual, culpa y dolo, daño cierto, causalidad adecuada. Presunciones de culpa y responsabilidad solidaria de coautores (Art. 2317 CC)." }
      ]
    },
    "CLASE_9_11.md": {
      title: "Derecho Civil: Responsabilidad Extracontractual y Contratos (Promesa y Compraventa)",
      sections: [
        { name: "Responsabilidad Civil Extracontractual", rules: "Arts. 2314-2334 CC", doctrine: "Modelos de imputabilidad subjetiva y objetiva. Presunciones por hecho ajeno y de las cosas. Daño patrimonial y moral. Causalidad y eximentes." },
        { name: "Contrato de Promesa y Compraventa", rules: "Arts. 1438, 1444, 1545, 1554, 1793-1896 CC", doctrine: "Requisitos de validez del Art. 1554 CC. Eficacia obligacional de hacer vs título traslaticio. Compraventa, cosa, precio y rescisión por lesión enorme." }
      ]
    },
    "PROCESAL.md": {
      title: "Derecho Procesal - Apunte Canónico",
      sections: [
        { name: "Jurisdicción y Competencia", rules: "Arts. 76 CPR, Arts. 1, 108-114, 134-187, 529 COT", doctrine: "Momentos jurisdiccionales. Reglas generales de competencia (radicación, grado, extensión, prevención, inexcusabilidad). Fuero general del demandado en acciones muebles. Perpetuidad del mandato judicial constituido a favor de abogados frente a la muerte del mandante (Art. 529 COT)." },
        { name: "Juicio Ordinario y Medidas Cautelares", rules: "Arts. 254, 279, 290, 298, 303, 309, 310 CPC", doctrine: "Período de discusión. Excepciones dilatorias y mixtas. Medidas prejudiciales y precautorias sujetas a proporcionalidad estricta y limitación a bienes necesarios (Art. 298 CPC)." },
        { name: "Recursos Procesales", rules: "Arts. 767, 768 CPC", doctrine: "Apelación ordinaria, casación en la forma (vicios in procedendo, ultra petita, falta de fundamentos) y casación en el fondo (errores in iudicando de derecho sustantivo)." }
      ]
    },
    "CONSTITUCIONAL.md": {
      title: "Derecho Constitucional - Apunte Canónico",
      sections: [
        { name: "Bases de la Institucionalidad y Juridicidad", rules: "Arts. 1, 6, 7 CPR", doctrine: "Supremacía constitucional, vinculación directa, servicialidad del Estado y sanción de nulidad de derecho público." },
        { name: "Garantías Fundamentales", rules: "Art. 19 N° 1, 2, 3, 21, 24 CPR", doctrine: "Debido proceso, tribunal natural, orden público económico, derecho de propiedad y expropiación por daño patrimonial efectivamente causado." },
        { name: "Acciones Constitucionales", rules: "Arts. 20, 21, 93 N° 6 CPR", doctrine: "Recurso de protección como tutela urgente del statu quo posesorio frente a vías de hecho y actos de autotutela. Inaplicabilidad por inconstitucionalidad ante el Tribunal Constitucional." }
      ]
    }
  },

  corpusSeed: null, // Semilla canónica de fuentes (respaldo de FUENTES_CORPUS)
  DYNAMIC_CORPUS: {}, // Corpus dinámico alimentado por auto-descubrimiento en tiempo real
  corpusSources: null, // Listado ordenado de fuentes activas desde /api/fuentes
  validCitationsIndex: null, // Set de citas pre-computadas O(1) [NORM:ART]

  async syncFuentesFromServer() {
    try {
      const res = await fetch("/api/fuentes");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.fuentes) {
          this.serverFuentes = data.fuentes;
          this.corpusSources = data.fuentes
            .map(f => (f.file || f.filename || "").replace(/^.*[\\\/]/, "").trim())
            .filter(Boolean);
        }
      }
    } catch (e) {}
  },

  /**
   * Helper central de extracción de citas jurídicas en normativa chilena.
   * Tolerante a formatos singulares, plurales y desglosados (ej. Arts. 686, 724 CC; Art. 19 N° 24 CPR).
   */
  extractCitations(text) {
    if (!text || typeof text !== "string") return [];
    const citationRegex = /\b(?:Arts?\.?|Artículos?)\s+([0-9]+(?:\s*(?:N[°oº]|número)\s*[0-9]+)?(?:\s*inc(?:\.|iso)?\s*[0-9]+)?(?:(?:\s*,\s*|\s+y\s+)[0-9]+(?:\s*(?:N[°oº]|número)\s*[0-9]+)?(?:\s*inc(?:\.|iso)?\s*[0-9]+)?)*)\s*(?:del\s+)?(CC|CPC|COT|CPR|Código\s+Civil|Código\s+de\s+Procedimiento\s+Civil|Código\s+Orgánico\s+de\s+Tribunales|Constitución(?:\s+Política)?)/gi;
    const matches = [];
    let match;
    while ((match = citationRegex.exec(text)) !== null) {
      const raw = match[0];
      const articleStr = match[1].trim();
      const codeStr = match[2].trim();

      let normGroup = "CC";
      const uCode = codeStr.toUpperCase();
      if (uCode.includes("PROCEDIMIENTO") || uCode === "CPC") normGroup = "CPC";
      else if (uCode.includes("ORGÁNICO") || uCode.includes("ORGANICO") || uCode === "COT") normGroup = "COT";
      else if (uCode.includes("CONSTITUCIÓN") || uCode.includes("CONSTITUCION") || uCode === "CPR") normGroup = "CPR";

      const artTokens = articleStr.split(/(?:,|\by\b)/i);
      const artNums = [];
      artTokens.forEach(tok => {
        const m = tok.match(/(\d+)/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && !artNums.includes(num)) {
            artNums.push(num);
          }
        }
      });

      const firstArtMatch = articleStr.match(/^\s*(\d+)/);
      const primaryArtNum = firstArtMatch ? parseInt(firstArtMatch[1], 10) : (artNums[0] || parseInt(articleStr.replace(/[^0-9]/g, ""), 10));

      matches.push({
        raw,
        article: articleStr,
        code: codeStr,
        normGroup,
        artNum: primaryArtNum,
        artNums: artNums.length > 0 ? artNums : (isNaN(primaryArtNum) ? [] : [primaryArtNum])
      });
    }
    return matches;
  },

  /**
   * Deriva reglas normativas y síntesis dogmática a partir del contenido real de las cédulas de un archivo.
   */
  deriveRulesFromSections(sourceFile, cedulas) {
    const cleanFile = (sourceFile || "").replace(/^.*[\\\/]/, "").trim();
    if (!Array.isArray(cedulas) || cedulas.length === 0) {
      return {
        file: cleanFile,
        title: cleanFile,
        sections: [{ name: "General", rules: "", doctrine: "" }],
        cedulas: []
      };
    }

    const fullText = cedulas.map(c => [c.cleanTitle || c.title || "", c.content || ""].join(" ")).join(" ");
    const citations = this.extractCitations(fullText);

    const seenCits = new Set();
    const uniqueRules = [];
    citations.forEach(c => {
      (c.artNums || [c.artNum]).forEach(num => {
        const key = `${c.normGroup}:${num}`;
        if (!seenCits.has(key)) {
          seenCits.add(key);
          uniqueRules.push(`Art. ${num} ${c.normGroup}`);
        }
      });
    });

    const firstCedula = cedulas[0];
    const sectionName = firstCedula.cleanTitle || firstCedula.title || firstCedula.sectionName || "General";
    const fileTitle = firstCedula.chapterTitle || firstCedula.category || cleanFile.replace(/\.md$/i, "");
    
    const doctrineSnippets = cedulas.map(c => (c.cleanTitle || c.title || "").trim()).filter(Boolean);
    const doctrineSummary = doctrineSnippets.slice(0, 5).join(". ") + (doctrineSnippets.length > 0 ? "." : "");

    return {
      file: cleanFile,
      title: fileTitle,
      sections: [
        {
          name: sectionName,
          rules: uniqueRules.join("; "),
          doctrine: doctrineSummary
        }
      ],
      cedulas: cedulas.map(c => ({
        id: c.id,
        code: c.code,
        indexCode: c.indexCode,
        title: c.cleanTitle || c.title || "",
        subject: c.subject || ""
      }))
    };
  },

  /**
   * Pre-computa el índice O(1) de citas jurídicas válidas en 3 capas:
   * Capa 1: Corpus semilla canónico (FUENTES_CORPUS)
   * Capa 2: Corpus dinámico (DYNAMIC_CORPUS derivado de contenidos reales)
   * Capa 3: Whitelist canónico histórico (validNorms)
   */
  buildValidCitationsIndex() {
    const index = new Set();

    // Capa 3: Whitelist canónico histórico (validNorms)
    const validNorms = {
      CC: [
        44, 45, 580, 581, 670, 686, 688, 700, 714, 724, 728, 882, 889, 894, 895, 
        1438, 1439, 1444, 1445, 1446, 1447, 1448, 1449, 1450, 1451, 1452, 1453, 1454, 1455, 1456, 1457, 1458, 1459, 1460, 1461, 1462, 1463, 1464, 1465, 1466, 1467, 1468, 1469, 1470,
        1489, 1490, 1491, 1535, 1537, 1544, 1545, 1546, 1547, 1550, 1551, 1552, 1553, 1554, 1555, 1557, 
        1681, 1682, 1683, 1684, 1687, 1689, 1691, 1693, 1700, 1702, 1713, 1793, 1815, 1817, 1824, 1826, 1828, 1873, 1877, 1878, 1879, 1888, 1889, 1890, 1891, 1915, 
        2116, 2118, 2129, 2158, 2163, 2174, 2196, 2314, 2317, 2320, 2329, 2330, 2446, 2460, 2465, 2468, 2505, 2510, 2511
      ],
      CPC: [
        6, 7, 17, 38, 40, 41, 44, 48, 50, 54, 55, 59, 60, 61, 64, 65, 66, 79, 80, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 
        113, 114, 119, 125, 148, 149, 150, 151, 152, 153, 154, 155, 158, 170, 174, 175, 176, 177, 181, 182, 186, 187, 189, 194, 
        254, 262, 263, 279, 280, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 309, 310, 327, 432, 434, 464, 530, 532, 533, 709, 766, 767, 768, 775, 795, 810
      ],
      COT: [
        1, 76, 108, 109, 110, 111, 112, 113, 114, 115, 130, 134, 138, 178, 181, 182, 187, 195, 196, 199, 227, 528, 529
      ],
      CPR: [
        1, 5, 6, 7, 19, 20, 21, 76, 93
      ]
    };
    for (const [norm, arts] of Object.entries(validNorms)) {
      arts.forEach(a => index.add(`${norm}:${a}`));
    }

    // Capa 1: Corpus semilla canónico (FUENTES_CORPUS)
    const seedCorpus = this.corpusSeed || this.FUENTES_CORPUS || {};
    for (const fileObj of Object.values(seedCorpus)) {
      if (fileObj && Array.isArray(fileObj.sections)) {
        fileObj.sections.forEach(sec => {
          const pool = `${sec.rules || ""} ${sec.doctrine || ""}`;
          const cits = this.extractCitations(pool);
          cits.forEach(c => {
            (c.artNums || [c.artNum]).forEach(num => {
              if (num && !isNaN(num)) index.add(`${c.normGroup}:${num}`);
            });
          });
        });
      }
    }

    // Capa 2: Corpus dinámico (DYNAMIC_CORPUS) derivado del contenido real
    if (this.DYNAMIC_CORPUS && typeof this.DYNAMIC_CORPUS === "object") {
      for (const dynObj of Object.values(this.DYNAMIC_CORPUS)) {
        if (dynObj && Array.isArray(dynObj.sections)) {
          dynObj.sections.forEach(sec => {
            const pool = `${sec.rules || ""} ${sec.doctrine || ""}`;
            const cits = this.extractCitations(pool);
            cits.forEach(c => {
              (c.artNums || [c.artNum]).forEach(num => {
                if (num && !isNaN(num)) index.add(`${c.normGroup}:${num}`);
              });
            });
          });
        }
      }
    }

    this.validCitationsIndex = index;
    return this.validCitationsIndex;
  },

  /**
   * Resuelve la referencia de fuente vinculada con prioridad viva:
   * 1. Coincidencia directa en corpus semilla (FUENTES_CORPUS).
   * 2. Coincidencia insensible a mayúsculas/stem en semilla.
   * 3. Coincidencia contra DYNAMIC_CORPUS (rules derivadas del contenido real).
   * 4. Coincidencia contra serverFuentes.
   * 5. Warning defensivo y retorno seguro de null.
   */
  resolveLinkedFuente(fuenteRef) {
    if (!fuenteRef) return null;
    const file = typeof fuenteRef === "string" ? fuenteRef : (fuenteRef.file || "");
    if (!file) return null;

    const cleanFile = file.replace(/^.*[\\\/]/, "").trim();
    const seedCorpus = this.corpusSeed || this.FUENTES_CORPUS || {};

    // 1. Coincidencia directa en FUENTES_CORPUS canónico (semilla)
    if (seedCorpus[cleanFile]) {
      return {
        file: cleanFile,
        section: fuenteRef.section || "",
        rules: fuenteRef.rules || ""
      };
    }

    // 2. Coincidencia best-effort insensible a mayúsculas y extensiones (.md) en semilla
    const targetStem = cleanFile.toLowerCase().replace(/\.md$/i, "").trim();
    for (const [key, val] of Object.entries(seedCorpus)) {
      const keyStem = key.toLowerCase().replace(/\.md$/i, "").trim();
      if (keyStem === targetStem || key.toLowerCase() === cleanFile.toLowerCase()) {
        return {
          file: key,
          section: fuenteRef.section || "",
          rules: fuenteRef.rules || ""
        };
      }
    }

    // 3. Coincidencia contra DYNAMIC_CORPUS (archivos auto-descubiertos con rules derivadas en vivo)
    if (this.DYNAMIC_CORPUS && typeof this.DYNAMIC_CORPUS === "object") {
      let dynMatch = this.DYNAMIC_CORPUS[cleanFile];
      if (!dynMatch) {
        for (const [key, val] of Object.entries(this.DYNAMIC_CORPUS)) {
          const kStem = key.toLowerCase().replace(/\.md$/i, "").trim();
          if (kStem === targetStem || key.toLowerCase() === cleanFile.toLowerCase()) {
            dynMatch = val;
            break;
          }
        }
      }
      if (dynMatch) {
        const sec = (dynMatch.sections && dynMatch.sections[0]) ? dynMatch.sections[0] : null;
        return {
          file: dynMatch.file || cleanFile,
          section: fuenteRef.section || (sec ? sec.name : "") || dynMatch.title || "",
          rules: (sec && sec.rules) ? sec.rules : (fuenteRef.rules || "")
        };
      }
    }

    // 4. Coincidencia contra fuentes descubiertas en el servidor si están cargadas
    if (this.serverFuentes && Array.isArray(this.serverFuentes)) {
      const serverMatch = this.serverFuentes.find(f => {
        const fname = (f.file || f.filename || "").replace(/^.*[\\\/]/, "").toLowerCase();
        return fname === cleanFile.toLowerCase() || fname.replace(/\.md$/i, "") === targetStem;
      });
      if (serverMatch) {
        return {
          file: serverMatch.file || cleanFile,
          section: fuenteRef.section || "",
          rules: fuenteRef.rules || ""
        };
      }
    }

    // 5. Tolerancia defensiva para archivos desconocidos: omitir vínculo con warning sin romper nutrición
    if (typeof console !== "undefined" && console.warn) {
      console.warn(`[CaseGeneratorAgent] Fuente desconocida omitida de la nutrición: '${cleanFile}'`);
    }
    return null;
  },

  TOPICS_INDEX: null,
  APUNTES_INDEX: null,

  async syncApuntesFromServer() {
    let synced = false;
    try {
      if (typeof window !== "undefined" && window.INITIAL_DATA && window.INITIAL_DATA.topics) {
        this.populateApuntesIndex(window.INITIAL_DATA.topics);
        synced = true;
      }
      if (typeof fetch === "function") {
        const url = (typeof window !== "undefined" && window.location) ? "/api/sync-topics" : (typeof baseUrl !== "undefined" ? `${baseUrl}/api/sync-topics` : "/api/sync-topics");
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.topics) {
            this.populateApuntesIndex(data.topics);
            synced = true;
          }
        }
      }
    } catch (e) {
      // Fallback para entornos Node.js o sin conexión
    }

    if (!synced && typeof require !== "undefined") {
      try {
        const fs = require("fs");
        const path = require("path");
        const candidates = [
          path.resolve(__dirname, "../all_afg_topics.json"),
          path.resolve(__dirname, "all_afg_topics.json"),
          path.resolve(process.cwd(), "all_afg_topics.json")
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
            const list = Array.isArray(raw) ? raw : (raw.topics || []);
            if (list.length > 0) {
              this.populateApuntesIndex(list);
              synced = true;
              break;
            }
          }
        }
      } catch (err) {}
    }
    return this.APUNTES_INDEX;
  },

  /**
   * Puebla el índice de apuntes y construye el corpus dinámico en memoria derivando reglas de cada fuente.
   */
  populateApuntesIndex(topicsList) {
    if (!Array.isArray(topicsList)) return;
    const map = new Map();
    const bySourceFile = new Map();

    topicsList.forEach(t => {
      if (t && t.id) {
        const cleanFile = t.sourceFile ? t.sourceFile.replace(/^.*[\\\/]/, '').trim() : "";
        const entry = {
          id: t.id,
          code: t.code || t.indexCode || "",
          indexCode: t.indexCode || t.code || "",
          title: t.cleanTitle || t.title || "",
          subject: t.subject || "",
          chapterNumber: t.chapterNumber || 1,
          chapterTitle: t.chapterTitle || "",
          category: t.category || "",
          sourceFile: cleanFile,
          content: typeof t.content === "string" ? t.content.slice(0, 4000) : ""
        };
        map.set(t.id, entry);

        if (cleanFile) {
          if (!bySourceFile.has(cleanFile)) {
            bySourceFile.set(cleanFile, []);
          }
          bySourceFile.get(cleanFile).push(entry);
        }
      }
    });

    this.APUNTES_INDEX = Array.from(map.values());
    this.TOPICS_INDEX = this.APUNTES_INDEX;

    // Construir / aumentar DYNAMIC_CORPUS con las cédulas reales por archivo
    this.DYNAMIC_CORPUS = {};
    for (const [sourceFile, fileCedulas] of bySourceFile.entries()) {
      this.DYNAMIC_CORPUS[sourceFile] = this.deriveRulesFromSections(sourceFile, fileCedulas);
    }

    // Reconstruir el índice O(1) de citas válidas integrando semilla, dinámico y whitelist
    this.buildValidCitationsIndex();
  },

  invalidateApuntes() {
    this.APUNTES_INDEX = null;
    this.TOPICS_INDEX = null;
    return this.syncApuntesFromServer();
  },

  /**
   * Resuelve cédulas vinculadas para un arquetipo por ID primario o clave secundaria (subject, indexCode|code).
   */
  getLinkedApuntesForArchetype(arch) {
    if (!this.APUNTES_INDEX) {
      this.syncApuntesFromServer();
    }
    const indexList = this.APUNTES_INDEX || [];
    const indexMap = new Map(indexList.map(a => [a.id, a]));
    
    // Mapeo secundario tolerante por (subject, indexCode) y (subject, code)
    const secondaryMap = new Map();
    indexList.forEach(a => {
      const subj = (a.subject || "civil").toLowerCase();
      if (a.indexCode) secondaryMap.set(`${subj}:${a.indexCode}`, a);
      if (a.code) secondaryMap.set(`${subj}:${a.code}`, a);
    });

    const archSubject = (arch.subjects && arch.subjects[0]) ? arch.subjects[0].toLowerCase() : "civil";
    const linked = [];

    (arch.linkedTopics || []).forEach(lt => {
      // 1. Búsqueda por ID exacto
      let match = indexMap.get(lt.id);

      // 2. Búsqueda por clave secundaria (subject, indexCode) o (subject, code)
      if (!match) {
        const ltSubj = (lt.subject || archSubject).toLowerCase();
        const codeKey1 = `${ltSubj}:${lt.indexCode || lt.code || ""}`;
        const codeKey2 = `${ltSubj}:${lt.code || lt.indexCode || ""}`;
        match = secondaryMap.get(codeKey1) || secondaryMap.get(codeKey2);
      }

      if (match) {
        linked.push({
          id: match.id,
          indexCode: match.indexCode || lt.code || "",
          title: match.title || lt.title || "",
          subject: match.subject || archSubject,
          sourceFile: (match.sourceFile || "").replace(/^.*[\\\/]/, '')
        });
      } else {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(`[CaseGeneratorAgent] Cédula no encontrada en índice temático: '${lt.id || lt.title}'`);
        }
        linked.push({
          id: lt.id,
          indexCode: lt.code || lt.indexCode || "",
          title: lt.title || "",
          subject: archSubject,
          sourceFile: ""
        });
      }
    });
    return linked;
  },

  /**
   * GATE DE ANCLAJE DOGMÁTICO (v7.32, PROMPT 026).
   * Mide si cada explicación comparte vocabulario real con su cédula vinculada
   * (≥ ANCHOR_MIN_BIGRAMS bigramas, estándar 24.5.1 del QuestionDeveloper).
   * Puro y determinista: sin Math.random, sin red. Si no hay contenido
   * disponible en APUNTES_INDEX, el gate se abstiene (sin flags).
   */
  ANCHOR_MIN_BIGRAMS: 3,
  ANCHOR_EXPLANATION_CHARS: 600,

  // Normalización idéntica a QuestionDeveloper._normalize/_bigrams (24.5):
  // una sola definición de "anclado" en toda la app. Paridad verificada en tests.
  normalizeAnchorText(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9áéíóúñ\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  extractAnchorBigrams(text) {
    const words = this.normalizeAnchorText(text).split(" ").filter(w => w.length > 1);
    const out = new Set();
    for (let i = 0; i < words.length - 1; i++) {
      out.add(words[i] + " " + words[i + 1]);
    }
    return out;
  },

  countSharedAnchorBigrams(setA, setB) {
    let n = 0;
    for (const g of setA) if (setB.has(g)) n++;
    return n;
  },

  assertExplanationAnchored(explanation, content, minBigrams) {
    const umbral = (typeof minBigrams === "number") ? minBigrams : this.ANCHOR_MIN_BIGRAMS;
    const qSet = this.extractAnchorBigrams((explanation || "").slice(0, this.ANCHOR_EXPLANATION_CHARS));
    const cSet = this.extractAnchorBigrams(content || "");
    const shared = this.countSharedAnchorBigrams(qSet, cSet);
    return { anchored: shared >= umbral, shared: shared, threshold: umbral };
  },

  /**
   * Reordena linkedApuntes por overlap máximo con las preguntas (estable:
   * empate conserva orden de arquetipo) y anota cada pregunta con
   * anchorShared + needsReview. No cambia el conjunto de IDs: contratos intactos.
   */
  applyAnchorGate(caseObj) {
    const questions = Array.isArray(caseObj.questions) ? caseObj.questions : [];
    const linked = Array.isArray(caseObj.linkedApuntes) ? caseObj.linkedApuntes.slice() : [];
    const indexList = Array.isArray(this.APUNTES_INDEX) ? this.APUNTES_INDEX : [];
    if (questions.length === 0 || linked.length === 0 || indexList.length === 0) {
      return { linkedApuntes: linked, questions: questions, abstained: true };
    }
    const contentById = new Map(indexList.map(a => [a.id, a.content || ""]));
    const scored = linked.map((entry, origIdx) => {
      const content = contentById.get(entry.id) || "";
      let best = 0;
      for (const q of questions) {
        const r = this.assertExplanationAnchored(q.explanation || "", content);
        if (r.shared > best) best = r.shared;
      }
      return { entry, best, origIdx };
    });
    scored.sort((x, y) => (y.best - x.best) || (x.origIdx - y.origIdx));
    const annotatedQuestions = questions.map(q => {
      let best = 0;
      for (const s of scored) {
        const content = contentById.get(s.entry.id) || "";
        const r = this.assertExplanationAnchored(q.explanation || "", content);
        if (r.shared > best) best = r.shared;
      }
      return Object.assign({}, q, {
        anchorShared: best,
        needsReview: best < this.ANCHOR_MIN_BIGRAMS
      });
    });
    return {
      linkedApuntes: scored.map(s => s.entry),
      questions: annotatedQuestions,
      abstained: false
    };
  },

  /**
   * LOTE DE REPASO (v7.33): genera hasta 10 casos con cobertura guiada + reporte.
   * Selección determinista por semilla (fnv1a+mulberry32 locales, mismo algoritmo
   * que QuestionDeveloper): greedy max-coverage que prefiere pares novedosos
   * (fuera de presets), cruzados civil↔procesal e instituciones raras.
   * Durante la síntesis Math.random se sustituye por el PRNG semillado para
   * reproducibilidad total (restaurado en finally). Tope 10 = FIFO de la plataforma.
   */
  REVIEW_LOT_SIZE: 10,

  lotFnv1a(str) {
    let h = 0x811c9dc5;
    const s = String(str == null ? "" : str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  },

  lotMulberry32(seed) {
    let a = seed >>> 0;
    return function() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  listLotCandidates() {
    const list = Array.isArray(this.INSTITUTIONS) ? this.INSTITUTIONS : [];
    const usable = list.filter(i => i && i.id && !i.isDoctrinalOnly);
    const byId = new Map(usable.map(i => [i.id, i]));
    const presetPairs = new Set();
    const uses = {};
    (Array.isArray(this.TOPIC_PRESETS) ? this.TOPIC_PRESETS : []).forEach(p => {
      const inst = ((p && p.institutions) || []).filter(id => byId.has(id)).slice().sort();
      inst.forEach(id => { uses[id] = (uses[id] || 0) + 1; });
      for (let a = 0; a < inst.length; a++) for (let b = a + 1; b < inst.length; b++) {
        presetPairs.add(inst[a] + "||" + inst[b]);
      }
    });
    const ids = usable.map(i => i.id);
    const out = [];
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      const A = byId.get(ids[a]), B = byId.get(ids[b]);
      if ((A.incompatibleWith || []).includes(B.id) || (B.incompatibleWith || []).includes(A.id)) continue;
      const sa = A.subject || "civil", sb = B.subject || "civil";
      const key = [A.id, B.id].sort().join("||");
      out.push({
        pair: [A.id, B.id],
        cross: sa !== sb,
        novel: !presetPairs.has(key),
        rarity: (1 / (1 + (uses[A.id] || 0))) + (1 / (1 + (uses[B.id] || 0)))
      });
    }
    return { candidates: out, byId: byId };
  },

  pickLotPairs(seed, count) {
    const built = this.listLotCandidates();
    const rng = this.lotMulberry32(this.lotFnv1a("lote:" + String(seed)));
    const covered = new Set();
    const picked = [];
    const pool = built.candidates.slice();
    const want = Math.max(1, Math.min(count || this.REVIEW_LOT_SIZE, this.REVIEW_LOT_SIZE));
    for (let n = 0; n < want && pool.length > 0; n++) {
      let bestIdx = 0, bestScore = -1;
      for (let i = 0; i < pool.length; i++) {
        const c = pool[i];
        const fresh = (covered.has(c.pair[0]) ? 0 : 1) + (covered.has(c.pair[1]) ? 0 : 1);
        const score = fresh * 100 + (c.cross ? 10 : 0) + (c.novel ? 5 : 0) + c.rarity + rng() * 0.001;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
      const chosen = pool.splice(bestIdx, 1)[0];
      covered.add(chosen.pair[0]); covered.add(chosen.pair[1]);
      picked.push(chosen.pair);
    }
    return { pairs: picked, byId: built.byId };
  },

  summarizeCaseReasoning(caseObj) {
    const m = caseObj.methodology || {};
    const fb = caseObj.factsBreakdown || {};
    return {
      id: caseObj.id,
      title: caseObj.title,
      institutions: Array.isArray(fb.instituciones) ? fb.instituciones.slice(0, 6) : [],
      linkedIndexCodes: (caseObj.linkedApuntes || []).map(a => a.indexCode).filter(Boolean),
      conflicto: m.conflict || "",
      baseLegal: Array.isArray(m.legalBasis) ? m.legalBasis.slice(0, 6) : [],
      subsuncion: m.applicationReasoning || "",
      marco: m.dogmaticFramework || "",
      preguntas: (caseObj.questions || []).map((q, i) => ({
        n: i + 1,
        texto: (q.questionText || "").slice(0, 140),
        correcta: q.correctAnswer || null,
        necesitaRevision: q.needsReview === true
      }))
    };
  },

  generateReviewLot(seed, count) {
    const want = Math.max(1, Math.min(count || this.REVIEW_LOT_SIZE, this.REVIEW_LOT_SIZE));
    const picked = this.pickLotPairs(seed, want);
    const rng = this.lotMulberry32(this.lotFnv1a("sintesis:" + String(seed)));
    const origRandom = Math.random;
    const cases = [];
    try {
      Math.random = rng;
      for (const pair of picked.pairs) {
        cases.push(this.synthesizeCase(pair));
      }
    } finally {
      Math.random = origRandom;
    }
    const coveredIds = [];
    picked.pairs.forEach(pr => pr.forEach(id => { if (!coveredIds.includes(id)) coveredIds.push(id); }));
    const bySubject = {};
    coveredIds.forEach(id => {
      const s = (picked.byId.get(id) || {}).subject || "civil";
      bySubject[s] = (bySubject[s] || 0) + 1;
    });
    const report = cases.map(c => {
      const v = this.validateGeneratedCase(c);
      const ci = this.assertCitationIntegrity(c);
      const s = this.summarizeCaseReasoning(c);
      s.valido = !!(v && v.valid);
      s.citasVerificadas = !!(ci && ci.valid);
      return s;
    });
    return {
      seed: String(seed),
      count: cases.length,
      pairs: picked.pairs,
      coverage: { institutions: coveredIds.sort(), bySubject: bySubject },
      report: report,
      cases: cases
    };
  },

  /**
   * Validación corpus-driven de citas en 3 capas con resolución O(1) vía validCitationsIndex.
   */
  assertCitationIntegrity(caseObj) {
    if (!caseObj) return { valid: false, errors: ["Caso nulo o indefinido"] };
    const textPool = [
      caseObj.title || "",
      caseObj.facts || "",
      caseObj.dogmaticPrinciples || "",
      caseObj.modelSolution || "",
      ...(caseObj.questions || []).flatMap(q => [
        q.questionText || "",
        q.explanation || "",
        q.pauta || "",
        q.errorFatalDeGrado || "",
        ...(q.options || []).map(o => o.text || "")
      ])
    ].join(" ");

    const matches = this.extractCitations(textPool);

    if (!this.validCitationsIndex) {
      this.buildValidCitationsIndex();
    }

    const errors = [];
    matches.forEach(c => {
      const artNumsToCheck = (c.artNums && c.artNums.length > 0) ? c.artNums : [c.artNum];
      artNumsToCheck.forEach(num => {
        if (isNaN(num) || !this.validCitationsIndex.has(`${c.normGroup}:${num}`)) {
          errors.push(`Cita legal no verificada en fuentes oficiales: ${c.raw} (Art. ${num} en ${c.normGroup})`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      citationsCount: matches.length,
      citations: matches,
      errors
    };
  },

  validateGeneratedCase(caseObj) {
    const errors = [];
    if (!caseObj) return { valid: false, errors: ["El caso generado es nulo o indefinido"] };
    if (!caseObj.id || typeof caseObj.id !== "string") errors.push("Falta 'id' válido del caso");
    if (!caseObj.title || caseObj.title.length < 15) errors.push("El 'title' del caso es demasiado breve o inexistente");
    if (!caseObj.facts || caseObj.facts.length < 200) errors.push("Los 'facts' del caso deben tener al menos 200 caracteres");
    if (!caseObj.factsBreakdown) {
      errors.push("Falta 'factsBreakdown'");
    } else {
      const fb = caseObj.factsBreakdown;
      if (!Array.isArray(fb.principales) || fb.principales.length === 0) errors.push("Faltan hechos principales");
      if (!Array.isArray(fb.secundarios)) errors.push("Faltan hechos secundarios");
      if (!Array.isArray(fb.distractores) || fb.distractores.length === 0) errors.push("Faltan distractores en factsBreakdown");
      if (!fb.partes || !fb.partes.principales) errors.push("Falta desglose de partes principales");
      if (!Array.isArray(fb.instituciones) || fb.instituciones.length === 0) errors.push("Faltan instituciones en factsBreakdown");
    }

    if (!Array.isArray(caseObj.questions) || caseObj.questions.length < 3 || caseObj.questions.length > 4) {
      errors.push(`El caso debe contener 3 o 4 preguntas (actual: ${caseObj.questions ? caseObj.questions.length : 0})`);
    } else {
      caseObj.questions.forEach((q, idx) => {
        const qNum = idx + 1;
        if (!q.questionText || q.questionText.length < 30) errors.push(`Pregunta ${qNum}: questionText muy breve`);
        if (!Array.isArray(q.options) || q.options.length !== 5) errors.push(`Pregunta ${qNum}: debe tener exactamente 5 alternativas`);
        if (!["a", "b", "c", "d", "e"].includes((q.correctAnswer || "").toLowerCase())) {
          errors.push(`Pregunta ${qNum}: correctAnswer inválida ('${q.correctAnswer}')`);
        }
        if (!q.explanation || q.explanation.length < 80) {
          errors.push(`Pregunta ${qNum}: explanation debe tener al menos 80 caracteres`);
        }
        if (!q.explanation || !q.explanation.includes("Conclusión:")) {
          errors.push(`Pregunta ${qNum}: explanation debe terminar con un enunciado que comience con 'Conclusión:'`);
        }
        if (!q.pauta || typeof q.pauta !== "string" || q.pauta.trim().length === 0) {
          errors.push(`Pregunta ${qNum}: falta 'pauta' de corrección oficial`);
        }
        if (!q.errorFatalDeGrado || typeof q.errorFatalDeGrado !== "string" || q.errorFatalDeGrado.trim().length === 0) {
          errors.push(`Pregunta ${qNum}: falta 'errorFatalDeGrado'`);
        }
        if (!q.officialRubric) {
          errors.push(`Pregunta ${qNum}: falta 'officialRubric'`);
        } else {
          const rub = q.officialRubric;
          const c1 = rub.criterio1Marco || rub.comprension_dogmatica;
          const c2 = rub.criterio2Hechos || rub.subsunccion_normativa;
          const c3 = rub.criterio3Subsuncion || rub.vias_adjetivas;
          const c4 = rub.criterio4Precision || rub.tecnica_ponderacion;
          if (!c1 || !c2 || !c3 || !c4) {
            errors.push(`Pregunta ${qNum}: officialRubric incompleta (debe contener las 4 dimensiones)`);
          } else {
            const sum = (c1.maxPoints || 0) + (c2.maxPoints || 0) + (c3.maxPoints || 0) + (c4.maxPoints || 0);
            if (Math.abs(sum - 4.0) > 0.01) {
              errors.push(`Pregunta ${qNum}: la suma de maxPoints de la rúbrica debe ser 4.0 (actual: ${sum})`);
            }
          }
        }
      });
    }

    if (!caseObj.modelSolution || typeof caseObj.modelSolution !== "string" || caseObj.modelSolution.length < 400) {
      errors.push(`El caso debe incluir una 'modelSolution' desarrollada de al menos 400 caracteres (actual: ${caseObj.modelSolution ? caseObj.modelSolution.length : 0})`);
    }
    if (caseObj.modelSolution && caseObj.modelSolution.includes("Revisar la justificación y desglose oficial")) {
      errors.push("La 'modelSolution' contiene un placeholder genérico prohibido");
    }

    if (!Array.isArray(caseObj.linkedTopics) || caseObj.linkedTopics.length === 0) {
      errors.push("El caso debe contener al menos una cédula vinculada en 'linkedTopics'");
    } else if (this.APUNTES_INDEX && this.APUNTES_INDEX.length > 0) {
      const knownIds = new Set(this.APUNTES_INDEX.map(a => a.id));
      const knownCodes = new Set(this.APUNTES_INDEX.flatMap(a => [
        `${(a.subject || 'civil').toLowerCase()}:${a.indexCode}`,
        `${(a.subject || 'civil').toLowerCase()}:${a.code}`
      ]));

      caseObj.linkedTopics.forEach(lt => {
        const subj = (lt.subject || (caseObj.subjects ? caseObj.subjects[0] : "civil")).toLowerCase();
        const codeKey1 = `${subj}:${lt.indexCode || lt.code || ""}`;
        const codeKey2 = `${subj}:${lt.code || lt.indexCode || ""}`;
        if (!knownIds.has(lt.id) && !knownCodes.has(codeKey1) && !knownCodes.has(codeKey2)) {
          errors.push(`linkedTopics: la cédula '${lt.id || lt.title}' no existe en el índice temático activo`);
        }
      });
    } else {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[CaseGeneratorAgent] APUNTES_INDEX vacío; omitiendo validación estricta de linkedTopics");
      }
    }

    if (caseObj.linkedFuentes && caseObj.linkedFuentes.file) {
      if (caseObj.linkedFuentes.file.includes("/") || caseObj.linkedFuentes.file.includes("\\")) {
        errors.push(`linkedFuentes: file contiene separadores de directorio prohibidos ('${caseObj.linkedFuentes.file}')`);
      }
    }

    if (!Array.isArray(caseObj.linkedApuntes)) {
      errors.push("El caso debe incluir el array 'linkedApuntes'");
    } else {
      caseObj.linkedApuntes.forEach((ap, idx) => {
        if (ap.sourceFile && (ap.sourceFile.includes("/") || ap.sourceFile.includes("\\"))) {
          errors.push(`linkedApuntes[${idx}]: sourceFile contiene separadores de directorio prohibidos ('${ap.sourceFile}')`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // 1. CATÁLOGO GENERAL DE INSTITUCIONES JURÍDICAS DE EXAMEN DE GRADO
  INSTITUTIONS: [
    // --- DERECHO CIVIL: BIENES & DERECHOS REALES ---
    {
      id: "civ_tradicion_posesion",
      name: "Tradición y Posesión Inscrita",
      subject: "civil",
      category: "Bienes & Derechos Reales",
      rules: "Arts. 686, 724, 728, 2505 Código Civil",
      desc: "Teoría de la posesión inscrita, inscripción como requisito, garantía y prueba de posesión sobre inmuebles.",
      incompatibleWith: ["civ_prescripcion_extraordinaria_sin_titulo"],
      incompatibilityReasons: {
        civ_prescripcion_extraordinaria_sin_titulo: "Contra título inscrito no procede el apoderamiento material ni la prescripción adquisitiva extraordinaria sin previa cancelación (Art. 2505 CC)."
      }
    },
    {
      id: "civ_prescripcion_extraordinaria_sin_titulo",
      name: "Prescripción Adquisitiva Extraordinaria",
      subject: "civil",
      category: "Bienes & Derechos Reales",
      rules: "Arts. 2510, 2511 Código Civil",
      desc: "Posesión irregular de 10 años sin título alguno para adquirir el dominio de bienes.",
      isDoctrinalOnly: true,
      doctrinalRationale: "Hipótesis descartada frente a régimen conservatorio: la garantía del Art. 2505 CC prohíbe ganar por prescripción contra título inscrito salvo nueva inscripción. Es objeto de evaluación como distractor dogmático.",
      incompatibleWith: ["civ_tradicion_posesion"],
      incompatibilityReasons: {
        civ_tradicion_posesion: "El régimen conservatorio de posesión inscrita prohíbe la prescripción adquisitiva contra título registrado sin previa cancelación (Art. 2505 CC)."
      }
    },
    {
      id: "civ_reivindicatoria",
      name: "Acción Reivindicatoria",
      subject: "civil",
      category: "Bienes & Derechos Reales",
      rules: "Arts. 889, 895 Código Civil",
      desc: "Acción del dueño no poseedor contra el poseedor no dueño para obtener la restitución material de la cosa.",
      incompatibleWith: ["civ_mera_tenencia_arriendo"],
      incompatibilityReasons: {
        civ_mera_tenencia_arriendo: "Contra el mero tenedor procede la acción contractual de restitución o comodato precario, no la reivindicatoria que exige poseedor demandado (Art. 895 CC)."
      }
    },
    {
      id: "civ_mera_tenencia_arriendo",
      name: "Mera Tenencia y Restitución Contractual",
      subject: "civil",
      category: "Bienes & Derechos Reales",
      rules: "Arts. 714, 1915 y ss. Código Civil",
      desc: "Tenencia de una cosa reconociendo dominio ajeno y restitución según la causa contractual.",
      incompatibleWith: ["civ_reivindicatoria"],
      incompatibilityReasons: {
        civ_reivindicatoria: "La mera tenencia no constituye posesión; se ejerce acción contractual de terminación o precario, no reivindicatoria ordinaria."
      }
    },

    // --- DERECHO CIVIL: ACTO JURÍDICO & CONTRATOS ---
    {
      id: "civ_lesion_enorme",
      name: "Lesión Enorme en Compraventa de Inmuebles",
      subject: "civil",
      category: "Acto Jurídico & Contratos",
      rules: "Arts. 1888, 1889, 1890 Código Civil",
      desc: "Desproporción objetiva grave en el justo precio al tiempo del contrato (no procede por plusvalía sobreviniente).",
      incompatibleWith: ["civ_rescision_muebles"],
      incompatibilityReasons: {
        civ_rescision_muebles: "La lesión enorme solo procede en compraventa voluntaria de bienes raíces y partición; no aplica a muebles (Art. 1891 CC)."
      }
    },
    {
      id: "civ_dolo_vicio_consentimiento",
      name: "Dolo como Vicio del Consentimiento (Reticencia)",
      subject: "civil",
      category: "Acto Jurídico & Contratos",
      rules: "Arts. 44 inc. final, 1458 Código Civil",
      desc: "Maquinación fraudulenta de una parte que induce a contratar (dolo determinante y coetáneo al acto).",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "civ_mandato_civil",
      name: "Mandato Civil y Obligación de Medios del Abogado",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 2116, 2118, 2129, 2158 Código Civil",
      desc: "Contrato consensual y oneroso; obligación de medios profesional y responsabilidad por culpa leve.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "civ_clausula_penal_enorme",
      name: "Cláusula Penal Enorme y Reducción al Duplo",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1535, 1544 Código Civil",
      desc: "Límite de orden público económico: en obligaciones de suma determinada la pena no puede exceder el duplo del principal.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "civ_pacto_comisorio_calificado",
      name: "Pacto Comisorio Calificado en la Compraventa",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1877, 1879 Código Civil",
      desc: "Estipulación de resolución por no pago del precio con plazo de 24 horas tras notificación judicial para enervar.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "civ_nulidad_absoluta",
      name: "Nulidad Absoluta por Causa / Objeto Ilícito",
      subject: "civil",
      category: "Acto Jurídico",
      rules: "Arts. 1681, 1682, 1683 Código Civil",
      desc: "Sanción de orden público por infracción de normas prohibitivas o causa/objeto ilícito. Saneable solo por 10 años.",
      incompatibleWith: ["civ_ratificacion_saneamiento_4anos"],
      incompatibilityReasons: {
        civ_ratificacion_saneamiento_4anos: "La nulidad absoluta es de orden público; no se sanea por ratificación ni en el plazo breve de 4 años, requiere 10 años (Art. 1683 CC)."
      }
    },
    {
      id: "civ_ratificacion_saneamiento_4anos",
      name: "Rescisión y Saneamiento (Nulidad Relativa)",
      subject: "civil",
      category: "Acto Jurídico",
      rules: "Arts. 1684, 1691, 1693 Código Civil",
      desc: "Nulidad relativa por vicios del consentimiento o incapacidad relativa, saneable por 4 años o ratificación.",
      incompatibleWith: ["civ_nulidad_absoluta"],
      incompatibilityReasons: {
        civ_nulidad_absoluta: "La rescisión o saneamiento en 4 años solo opera para la nulidad relativa; no aplica a causales de nulidad absoluta."
      }
    },
    {
      id: "civ_resolucion_1489",
      name: "Resolución Contractual (Art. 1489)",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1489, 1873 Código Civil",
      desc: "Condición resolutoria tácita ante incumplimiento en contrato bilateral con indemnización de perjuicios.",
      incompatibleWith: ["civ_cumplimiento_acumulado_resolucion"],
      incompatibilityReasons: {
        civ_cumplimiento_acumulado_resolucion: "El art. 1489 CC consagra remedios principales incompatibles: cumplimiento o resolución, no ambos de forma simultánea."
      }
    },
    {
      id: "civ_cumplimiento_acumulado_resolucion",
      name: "Cumplimiento Forzado Simultáneo a Resolución",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Art. 1489 Código Civil",
      desc: "Pretensión contradictoria de exigir la ejecución forzada y la extinción resolutoria del contrato a la vez.",
      isDoctrinalOnly: true,
      doctrinalRationale: "Hipótesis de incompatibilidad procesal y sustantiva: el acreedor no puede acumular en lo principal dos pretensiones contradictorias (Art. 1489 CC), salvo en subsidio (Art. 17 CPC). Se utiliza para evaluar la detección de vicios de pretensión.",
      incompatibleWith: ["civ_resolucion_1489"],
      incompatibilityReasons: {
        civ_resolucion_1489: "Dogmáticamente existe incompatibilidad de pretensiones: no es posible solicitar que el contrato se extinga y subsista a la vez."
      }
    },
    {
      id: "civ_excepcion_1552",
      name: "Excepción de Contrato No Cumplido",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Art. 1552 Código Civil ('La mora purga la mora')",
      desc: "Defensa del deudor en contrato bilateral cuando el demandante tampoco ha cumplido ni está llano a cumplir su prestación.",
      incompatibleWith: ["civ_unilateral_mutuo"],
      incompatibilityReasons: {
        civ_unilateral_mutuo: "El art. 1552 CC exige obligaciones correlativas recíprocas (contrato bilateral); es inaplicable a contratos unilaterales."
      }
    },
    {
      id: "civ_unilateral_mutuo",
      name: "Contrato Unilateral (Mutuo / Comodato)",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1439, 2174, 2196 Código Civil",
      desc: "Contrato en que solo una de las partes resulta obligada desde su perfeccionamiento.",
      isDoctrinalOnly: true,
      doctrinalRationale: "Hipótesis de confrontación dogmática: ilustra la inaplicabilidad de la exceptio non adimpleti contractus (Art. 1552 CC) a contratos unilaterales por falta de sinalagma recíproco.",
      incompatibleWith: ["civ_excepcion_1552"],
      incompatibilityReasons: {
        civ_excepcion_1552: "En los contratos unilaterales no opera la reciprocidad sinalagmática de la exceptio non adimpleti contractus."
      }
    },
    {
      id: "civ_caso_fortuito",
      name: "Caso Fortuito y Teoría de los Riesgos",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 45, 1547, 1550 Código Civil",
      desc: "Imposibilidad sobreviniente imprevisible e irresistible que extingue la obligación sin culpa del deudor.",
      incompatibleWith: ["civ_culpa_mora_deudor"],
      incompatibilityReasons: {
        civ_culpa_mora_deudor: "El caso fortuito no exime de responsabilidad si el deudor se encontraba en mora culpable o asumió el riesgo (Art. 1547 inc. 2 CC)."
      }
    },
    {
      id: "civ_culpa_mora_deudor",
      name: "Mora Culpable del Deudor",
      subject: "civil",
      category: "Obligaciones & Contratos",
      rules: "Arts. 1551, 1557 Código Civil",
      desc: "Retardo imputable en el cumplimiento de la obligación con constitución en mora.",
      incompatibleWith: ["civ_caso_fortuito"],
      incompatibilityReasons: {
        civ_caso_fortuito: "La mora culpable pone los riesgos a cargo del deudor, impidiéndole invocar el caso fortuito."
      }
    },

    // --- DERECHO CIVIL: RESPONSABILIDAD EXTRACONTRACTUAL ---
    {
      id: "civ_resp_extracontractual",
      name: "Responsabilidad Extracontractual por Culpa",
      subject: "civil",
      category: "Responsabilidad Civil",
      rules: "Arts. 2314, 2329 Código Civil",
      desc: "Estatuto general por hecho ilícito generador de daño patrimonial y moral.",
      incompatibleWith: ["civ_cumulo_responsabilidades"],
      incompatibilityReasons: {
        civ_cumulo_responsabilidades: "Principio de no cúmulo: mediando vínculo contractual previo válido, rige el estatuto contractual y no puede deducirse libremente la vía aquiliana."
      }
    },
    {
      id: "civ_cumulo_responsabilidades",
      name: "Cúmulo Irrestricto de Responsabilidades",
      subject: "civil",
      category: "Responsabilidad Civil",
      rules: "Arts. 1545, 2314 Código Civil",
      desc: "Pretensión improcedente de demandar simultáneamente bajo ambos estatutos por el mismo incumplimiento.",
      incompatibleWith: ["civ_resp_extracontractual"],
      incompatibilityReasons: {
        civ_resp_extracontractual: "El contrato es ley para los contratantes (Art. 1545 CC); pretender eludir los términos contractuales vía extracontractual vulnera el principio de especialidad."
      }
    },
    {
      id: "civ_perdida_chance",
      name: "Pérdida de la Chance / Nexo Causal",
      subject: "civil",
      category: "Responsabilidad Civil",
      rules: "Arts. 2314, 2329 CC, Doctrina Barros Bourie",
      desc: "Frustración de una expectativa legítima de ganancia o curación por conducta negligente: daño cierto e indemnizable.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },

    // --- DERECHO PROCESAL: ORGÁNICO & BASES ---
    {
      id: "proc_imparcialidad_prejuzgamiento",
      name: "Imparcialidad Judicial y Prejuzgamiento",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Art. 19 N° 3 CPR, Arts. 195, 196 N° 10 COT",
      desc: "Garantía de neutralidad del tribunal e implicancia/recusación por emitir opinión previa sobre la litis.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_prorroga_competencia",
      name: "Prórroga de la Competencia Territorial",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 181, 182, 187 Código Orgánico de Tribunales",
      desc: "Acuerdo expreso o tácito para alterar el factor territorio en negocios civiles contenciosos de primera instancia.",
      incompatibleWith: ["proc_competencia_absoluta_fuero", "proc_arbitraje_forzoso"],
      incompatibilityReasons: {
        proc_competencia_absoluta_fuero: "La competencia absoluta (materia, fuero y cuantía) es de orden público irrenunciable y jamás admite prórroga (Art. 182 COT).",
        proc_arbitraje_forzoso: "Las materias de arbitraje forzoso (Art. 227 COT) no admiten prórroga voluntaria ante tribunales ordinarios."
      }
    },
    {
      id: "proc_competencia_absoluta_fuero",
      name: "Incompetencia Absoluta por Fuero / Materia",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 108, 115, 130 COT, Art. 303 N° 1 CPC",
      desc: "Falta de atribución del tribunal por factores de orden público, declarable de oficio en cualquier estado del juicio.",
      incompatibleWith: ["proc_prorroga_competencia"],
      incompatibilityReasons: {
        proc_prorroga_competencia: "Las reglas de competencia absoluta son de orden público; el consentimiento de las partes es ineficaz para prorrogarlas."
      }
    },
    {
      id: "proc_competencia_accion_mueble",
      name: "Competencia en Acciones Personales Muebles",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 580, 581 CC, Art. 138 Código Orgánico de Tribunales",
      desc: "La indemnización por inejecución de obra es acción mueble (Art. 581 CC); a falta de estipulación rige el domicilio del demandado.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_regla_radicacion",
      name: "Regla General de Radicación (Inmodificabilidad)",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 109, 178 Código Orgánico de Tribunales",
      desc: "Radicado el conocimiento de un negocio con arreglo a la ley, no se alterará la competencia por causa sobreviniente (demanda tras prejudicial).",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_mandato_judicial_muerte",
      name: "Mandato Judicial y Muerte del Mandante",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Arts. 528, 529 COT, Art. 2163 N° 5 CC",
      desc: "Excepción procesal expresa: el mandato judicial de los abogados NO termina por la muerte del mandante.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_momentos_jurisdiccionales",
      name: "Momentos de la Jurisdicción",
      subject: "procesal",
      category: "Orgánico & Bases",
      rules: "Art. 76 CPR, Art. 1 Código Orgánico de Tribunales",
      desc: "Conocimiento (notio), juzgamiento (iudicium) y ejecución o imperio (executio) de las sentencias judiciales.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },

    // --- DERECHO PROCESAL: JUICIO ORDINARIO, MEDIDAS Y EXCEPCIONES ---
    {
      id: "proc_capacidad_ius_postulandi",
      name: "Capacidad Procesal e Ius Postulandi",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 1 y 2 Ley 18.120, Arts. 6 y ss. CPC",
      desc: "Requisitos de patrocinio por abogado habilitado y mandato judicial idóneo para comparecer en juicio.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_excepcion_dilatoria_incompetencia",
      name: "Excepción Dilatoria de Incompetencia",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 303 N° 1, 305 Código de Procedimiento Civil",
      desc: "Defensa previa antes de contestar la demanda que reclama la falta de competencia del juez.",
      incompatibleWith: ["proc_contestacion_sin_reserva"],
      incompatibilityReasons: {
        proc_contestacion_sin_reserva: "Si el demandado contesta el fondo de la demanda sin oponer la excepción de incompetencia relativa, se produce la prórroga tácita (Art. 187 N° 2 COT)."
      }
    },
    {
      id: "proc_contestacion_sin_reserva",
      name: "Contestación al Fondo sin Reclamar Incompetencia",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Art. 187 N° 2 COT, Art. 309 CPC",
      desc: "Acto de defensa de fondo que convalida el territorio y prorroga tácitamente la competencia.",
      incompatibleWith: ["proc_excepcion_dilatoria_incompetencia"],
      incompatibilityReasons: {
        proc_excepcion_dilatoria_incompetencia: "Al contestar al fondo sin formular reserva ni deducir excepción dilatoria previa, opera de pleno derecho la prórroga tácita."
      }
    },
    {
      id: "proc_medidas_precautorias",
      name: "Medidas Prejudiciales Precautorias y Proporcionalidad",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 279, 289, 290, 298 Código de Procedimiento Civil",
      desc: "Aseguramiento del resultado del juicio; requisito de proporcionalidad estricta entre el monto demandado y el bien gravado.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_transaccion_metodos",
      name: "Transacción Extrajudicial y Excepción Mixta",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 2446, 2460 CC, Arts. 304, 310 CPC",
      desc: "Contrato autocompositivo bilateral con efecto de cosa juzgada; oponible como excepción mixta, perentoria o anómala.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_juicio_ejecutivo_excepciones",
      name: "Excepciones en Juicio Ejecutivo (Art. 464 N° 7)",
      subject: "procesal",
      category: "Procedimiento & Comparecencia",
      rules: "Arts. 434, 464 N° 7 Código de Procedimiento Civil",
      desc: "Falta de fuerza ejecutiva del título respecto del exceso o iliquidez de la deuda demandada.",
      incompatibleWith: [],
      incompatibilityReasons: {}
    },
    {
      id: "proc_recurso_apelacion",
      name: "Recurso de Apelación en Sentencia Definitiva",
      subject: "procesal",
      category: "Recursos Procesales",
      rules: "Arts. 186, 189, 194 Código de Procedimiento Civil",
      desc: "Recurso ordinario que persigue la enmienda conforme a derecho de resolución agraviante.",
      incompatibleWith: ["proc_reposicion_ordinaria_definitiva"],
      incompatibilityReasons: {
        proc_reposicion_ordinaria_definitiva: "El recurso de reposición ordinario es legalmente improcedente contra sentencias definitivas (Art. 181 CPC)."
      }
    },
    {
      id: "proc_reposicion_ordinaria_definitiva",
      name: "Reposición Ordinaria contra Definitiva",
      subject: "procesal",
      category: "Recursos Procesales",
      rules: "Art. 181 Código de Procedimiento Civil",
      desc: "Error técnico consistente en deducir reposición ordinaria contra sentencia definitiva (desasimiento del tribunal).",
      isDoctrinalOnly: true,
      doctrinalRationale: "Hipótesis de error técnico procesal: las sentencias definitivas causan desasimiento del tribunal (Art. 182 CPC); la reposición ordinaria es inadmisible y constituye causal de rechazo in limine.",
      incompatibleWith: ["proc_recurso_apelacion"],
      incompatibilityReasons: {
        proc_recurso_apelacion: "Las sentencias definitivas causan desasimiento del tribunal (Art. 182 CPC); no pueden ser revocadas por reposición ordinaria."
      }
    },

    // --- DERECHO CONSTITUCIONAL ---
    {
      id: "const_recurso_proteccion",
      name: "Recurso de Protección y Proscripción de Autotutela",
      subject: "constitucional",
      category: "Garantías Constitucionales",
      rules: "Arts. 19 N° 3 inc. 5, 19 N° 24, Art. 20 CPR",
      desc: "Acción cautelar de urgencia frente a vías de hecho o actos arbitrarios que vulneran el derecho de propiedad y debido proceso.",
      incompatibleWith: ["const_derechos_litigiosos_dudosos"],
      incompatibilityReasons: {
        const_derechos_litigiosos_dudosos: "El recurso de protección es de urgencia y exige derecho indubitado; es improcedente para declarar derechos contractuales litigiosos de lato conocimiento."
      }
    },
    {
      id: "const_derechos_litigiosos_dudosos",
      name: "Protección sobre Derechos Contractuales Litigiosos",
      subject: "constitucional",
      category: "Garantías Constitucionales",
      rules: "Art. 20 CPR, Jurisprudencia Corte Suprema",
      desc: "Pretensión improcedente de utilizar la vía de protección como sustituto del juicio ordinario civil de cobro o resolución.",
      incompatibleWith: ["const_recurso_proteccion"],
      incompatibilityReasons: {
        const_recurso_proteccion: "Jurisprudencia uniforme de la Corte Suprema declara inadmisible el recurso de protección cuando el conflicto versa sobre derechos controvertidos nacidos de un contrato."
      }
    }
  ],

  // 2. PRESETS PARA MODO TÓPICO GENERAL / CASO SORPRESA DE GRADO
  TOPIC_PRESETS: [
    {
      id: "preset_examen_aleatorio",
      title: "🎲 Simulación Real de Examen de Grado (Aleatorio)",
      tagline: "El algoritmo selecciona instituciones interdisciplinarias armónicas de Civil y Procesal.",
      subjects: ["civil", "procesal"],
      institutions: ["civ_tradicion_posesion", "civ_resolucion_1489", "proc_prorroga_competencia"]
    },
    {
      id: "preset_lesion_dolo_mandato",
      title: "🏛️ Caso Evaluación Diagnóstica AFG: Lesión Enorme & Dolo",
      tagline: "Justo precio en compraventa de inmuebles, dolo reticente y obligaciones profesionales del abogado.",
      subjects: ["civil"],
      institutions: ["civ_lesion_enorme", "civ_dolo_vicio_consentimiento", "civ_mandato_civil"]
    },
    {
      id: "preset_cautelares_radicacion",
      title: "🛡️ Caso Evaluación Diagnóstica AFG: Medidas Cautelares & Competencia",
      tagline: "Acción mueble, medidas prejudiciales desproporcionadas, regla de radicación y mandato judicial.",
      subjects: ["procesal"],
      institutions: ["proc_medidas_precautorias", "proc_competencia_accion_mueble", "proc_regla_radicacion", "proc_mandato_judicial_muerte"]
    },
    {
      id: "preset_clausula_penal_ejecutivo",
      title: "📉 Cláusula Penal Enorme & Juicio Ejecutivo",
      tagline: "Confección de obra, límite de la pena al duplo (Art. 1544 CC) y excepción del Art. 464 N° 7 CPC.",
      subjects: ["civil", "procesal"],
      institutions: ["civ_clausula_penal_enorme", "proc_juicio_ejecutivo_excepciones"]
    },
    {
      id: "preset_responsabilidad_medica",
      title: "🏥 Responsabilidad Médica, Pérdida de la Chance & Solidaridad",
      tagline: "Falla diagnóstica contra la lex artis, certeza del daño probabilístico y responsabilidad por dependientes.",
      subjects: ["civil"],
      institutions: ["civ_resp_extracontractual", "civ_perdida_chance"]
    },
    {
      id: "preset_transaccion_metodos",
      title: "🤝 Taller Procesal: Transacción Extrajudicial & Excepciones",
      tagline: "Contrato autocompositivo bilateral, cosa juzgada y articulación como excepción dilatoria mixta o anómala.",
      subjects: ["procesal", "civil"],
      institutions: ["proc_transaccion_metodos", "civ_resolucion_1489"]
    },
    {
      id: "preset_imparcialidad_momentos",
      title: "⚖️ Taller Procesal: Imparcialidad Judicial & Momentos de la Jurisdicción",
      tagline: "Prejuzgamiento en audiencia de conciliación, causal de recusación y prórroga tácita de competencia.",
      subjects: ["procesal"],
      institutions: ["proc_imparcialidad_prejuzgamiento", "proc_momentos_jurisdiccionales", "proc_prorroga_competencia"]
    },
    {
      id: "preset_resolucion_pacto_comisorio",
      title: "📑 Resolución Contractual & Pacto Comisorio Calificado",
      tagline: "Sinalagma contractual, mora purga la mora (Art. 1552 CC) y plazo fatal de 24 horas del Art. 1879 CC.",
      subjects: ["civil"],
      institutions: ["civ_resolucion_1489", "civ_excepcion_1552", "civ_pacto_comisorio_calificado"]
    },
    {
      id: "preset_nulidad_simulacion",
      title: "🔍 Nulidad Absoluta por Causa Ilícita & Simulación",
      tagline: "Enajenación fraudulenta, legitimación activa de acreedores y efectos contra terceros poseedores.",
      subjects: ["civil"],
      institutions: ["civ_nulidad_absoluta", "civ_ratificacion_saneamiento_4anos"]
    },
    {
      id: "preset_proteccion_propiedad",
      title: "📜 Recurso de Protección: Autotutela vs Vía Contractual",
      tagline: "Corte arbitrario de suministros, derecho de propiedad y delimitación frente a juicios declarativos.",
      subjects: ["constitucional"],
      institutions: ["const_recurso_proteccion", "const_derechos_litigiosos_dudosos"]
    },
    {
      id: "preset_resp_competencia_cautelar",
      title: "🚗 Responsabilidad Extracontractual, Fuero & Cautelares",
      tagline: "Accidente en ruta, fuero del demandado (Art. 138 COT), proporcionalidad cautelar (Art. 298 CPC) y excepción dilatoria.",
      subjects: ["civil", "procesal"],
      institutions: ["civ_resp_extracontractual", "proc_competencia_accion_mueble", "proc_medidas_precautorias", "proc_excepcion_dilatoria_incompetencia"]
    },
    {
      id: "preset_promesa_penal_ejecutivo",
      title: "📝 Contrato de Promesa, Cláusula Penal & Ejecución de Hacer",
      tagline: "Suscripción forzada de compraventa por el juez (Art. 532 CPC), tope al duplo (Art. 1544 CC) y excepción del Art. 464 N° 7 CPC.",
      subjects: ["civil", "procesal"],
      institutions: ["civ_resolucion_1489", "civ_clausula_penal_enorme", "proc_juicio_ejecutivo_excepciones"]
    },
    {
      id: "preset_dominio_proteccion_apelacion",
      title: "🏔️ Dominio Registral, Protección y Apelación ante la Suprema",
      tagline: "Despojo material por mano propia, recurso de protección, apelación en 5 días y reserva de juicio ordinario.",
      subjects: ["constitucional", "procesal", "civil"],
      institutions: ["const_recurso_proteccion", "civ_tradicion_posesion", "civ_reivindicatoria", "proc_recurso_apelacion"]
    }
  ],

  // 3. BANCO DE VARIABLES ALEATORIAS PARA EL MUTADOR DE CASOS (GARANTÍA CERO REPETICIÓN)
  MUTATOR_DATA: {
    partiesA: [
      { name: "MATÍAS HORMAZÁBAL", desc: "empresario agrícola" },
      { name: "ROBERTO VIAL", desc: "inversionista particular" },
      { name: "FERNANDO CASAS", desc: "comerciante del rubro maderero" },
      { name: "BERNARDO SALGADO", desc: "propietario particular" },
      { name: "IGNACIO BULNES", desc: "constructor independiente" },
      { name: "SEBASTIÁN GAETE", desc: "ingeniero civil y contratista" },
      { name: "PATRICIO SOTO", desc: "pequeño agricultor vitivinícola" },
      { name: "CLAUDIO FUENZALIDA", desc: "empresario del transporte" }
    ],
    partiesB: [
      { name: "INMOBILIARIA BUENOS AIRES SPA", desc: "empresa de desarrollo urbano" },
      { name: "CONSTRUCTORA E INMOBILIARIA HORIZONTE LTDA.", desc: "empresa de edificación habitacional" },
      { name: "CONSTRUCTORA BOSQUES VERDES S.A.", desc: "empresa de obras civiles" },
      { name: "SERVICIOS MÉDICOS Y QUIRÚRGICOS DEL SUR S.A.", desc: "entidad hospitalaria privada" },
      { name: "COMERCIALIZADORA AGRÍCOLA LOS RÍOS SPA", desc: "empresa agroindustrial" },
      { name: "TRANSPORTES INTERANDINOS S.A.", desc: "empresa de logística y carga" },
      { name: "DESARROLLOS COMERCIALES DEL VALLE LTDA.", desc: "empresa de proyectos comerciales" }
    ],
    thirdParties: [
      { name: "CAMILA EYZAGUIRRE", desc: "segunda adquirente con título inscrito" },
      { name: "VALENTINA ARRAU", desc: "compradora de buena fe inscrita" },
      { name: "MARÍA JOSÉ OSSA", desc: "adquirente particular del predio" },
      { name: "ANDRÉS SCHMIDT", desc: "tercer poseedor del bien" },
      { name: "CAROLINA VALDÉS", desc: "cesionaria de los derechos registrales" }
    ],
    attorneys: [
      { name: "abogado ERNESTO VALLADARES", desc: "abogado habilitado para el ejercicio" },
      { name: "abogado RODRIGO PEÑALOZA", desc: "abogado litigante con patente al día" },
      { name: "abogado CRISTIÁN ALDUNATE", desc: "abogado patrocinante de la parte actora" },
      { name: "abogada MARCELA LARRAÍN", desc: "abogada mandataria de la parte demandada" }
    ],
    locations: [
      { city: "Santiago", court: "2° Juzgado de Letras en lo Civil de Santiago", comm: "Quilicura" },
      { city: "Viña del Mar", court: "1° Juzgado Civil de Viña del Mar", comm: "Casablanca" },
      { city: "Concepción", court: "3° Juzgado de Letras en lo Civil de Concepción", comm: "San Pedro de la Paz" },
      { city: "Temuco", court: "2° Juzgado de Letras en lo Civil de Temuco", comm: "Pucón" },
      { city: "Antofagasta", court: "1° Juzgado de Letras de Antofagasta", comm: "Mejillones" },
      { city: "Rancagua", court: "2° Juzgado de Letras de Rancagua", comm: "Machalí" },
      { city: "Talca", court: "1° Juzgado de Letras de Talca", comm: "San Clemente" },
      { city: "Valdivia", court: "2° Juzgado Civil de Valdivia", comm: "Panguipulli" },
      { city: "La Serena", court: "1° Juzgado de Letras de La Serena", comm: "Coquimbo" }
    ],
    amounts: [
      { clp: "$120.000.000", uf: "7.000 UF", partial: "$40.000.000", excess: "$200.000.000", penaltyDaily: "$10.000.000", totalPenalty: "$600.000.000", baseContract: "$500.000.000" },
      { clp: "$180.000.000", uf: "9.500 UF", partial: "$60.000.000", excess: "$280.000.000", penaltyDaily: "$15.000.000", totalPenalty: "$750.000.000", baseContract: "$600.000.000" },
      { clp: "$95.000.000", uf: "5.500 UF", partial: "$31.600.000", excess: "$160.000.000", penaltyDaily: "$8.000.000", totalPenalty: "$480.000.000", baseContract: "$400.000.000" },
      { clp: "$250.000.000", uf: "12.000 UF", partial: "$83.300.000", excess: "$380.000.000", penaltyDaily: "$20.000.000", totalPenalty: "$900.000.000", baseContract: "$700.000.000" }
    ],
    dates: [
      { contract: "12 de marzo de 2023", breach: "15 de mayo de 2023", lawsuit: "20 de julio de 2023", hearing: "18 de noviembre de 2023" },
      { contract: "18 de abril de 2024", breach: "10 de junio de 2024", lawsuit: "22 de agosto de 2024", hearing: "30 de noviembre de 2024" },
      { contract: "5 de enero de 2023", breach: "28 de febrero de 2023", lawsuit: "14 de abril de 2023", hearing: "5 de octubre de 2023" },
      { contract: "14 de julio de 2023", breach: "30 de septiembre de 2023", lawsuit: "12 de diciembre de 2023", hearing: "24 de abril de 2024" }
    ]
  },

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  shuffleQuestionOptions(q) {
    const originalCorrectText = q.options.find(o => o.id.toLowerCase() === q.correctAnswer.toLowerCase())?.text;
    
    const shuffled = [...q.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const letters = ["a", "b", "c", "d", "e"];
    let newCorrectLetter = "a";

    const newOptions = shuffled.map((opt, idx) => {
      const letter = letters[idx] || "a";
      if (opt.text === originalCorrectText) {
        newCorrectLetter = letter;
      }
      return {
        id: letter,
        text: opt.text
      };
    });

    return {
      ...q,
      options: newOptions,
      correctAnswer: newCorrectLetter
    };
  },

  openModal() {
    this.selectedInstitutions.clear();
    this.activeMode = "manual";
    this.selectedPresetId = null;
    this.renderModal();
  },

  closeModal() {
    const modal = document.getElementById("ai-case-generator-modal");
    if (modal) {
      if (typeof modal.remove === "function") {
        modal.remove();
      } else if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }
  },

  getIncompatibilitiesFor(instId) {
    const inst = this.INSTITUTIONS.find(i => i.id === instId);
    if (!inst) return [];
    return inst.incompatibleWith || [];
  },

  getIncompatibility(instId) {
    const inst = this.INSTITUTIONS.find(i => i.id === instId);
    if (!inst) return null;

    for (const selId of this.selectedInstitutions) {
      if (selId === instId) continue;
      const selInst = this.INSTITUTIONS.find(i => i.id === selId);
      if (!selInst) continue;

      if (inst.incompatibleWith && inst.incompatibleWith.includes(selId)) {
        return {
          culpritId: selId,
          culpritName: selInst.name,
          reason: inst.incompatibilityReasons?.[selId] || `Dogmáticamente incompatible con ${selInst.name}.`
        };
      }
      if (selInst.incompatibleWith && selInst.incompatibleWith.includes(instId)) {
        return {
          culpritId: selId,
          culpritName: selInst.name,
          reason: selInst.incompatibilityReasons?.[instId] || `Dogmáticamente incompatible con ${selInst.name}.`
        };
      }
    }
    return null;
  },

  toggleInstitution(instId) {
    if (this.selectedInstitutions.has(instId)) {
      this.selectedInstitutions.delete(instId);
      this.updatePillsUI();
      return;
    }

    // Si existe una institución previamente seleccionada que sea incompatible,
    // se descarta automáticamente la incompatible para admitir la nueva selección
    const incomp = this.getIncompatibility(instId);
    if (incomp && incomp.culpritId) {
      this.selectedInstitutions.delete(incomp.culpritId);
      if (typeof App !== "undefined" && App.showToast) {
        App.showToast(`Se descartó automáticamente "${incomp.culpritName}" por incompatibilidad dogmática`, "info");
      }
    }

    if (this.selectedInstitutions.size >= 4) {
      if (typeof App !== "undefined" && App.showToast) {
        App.showToast("Has alcanzado el límite óptimo de 4 instituciones para mantener el realismo de examen", "warning");
      }
      return;
    }

    this.selectedInstitutions.add(instId);
    this.updatePillsUI();
  },

  updatePillsUI() {
    if (typeof document === "undefined") return;
    const modal = document.getElementById("ai-case-generator-modal");
    if (!modal) return;

    this.INSTITUTIONS.forEach(inst => {
      const btn = modal.querySelector(`[data-inst-id="${inst.id}"]`);
      if (!btn) return;

      const isSelected = this.selectedInstitutions.has(inst.id);
      const incomp = !isSelected ? this.getIncompatibility(inst.id) : null;

      btn.classList.toggle("selected", isSelected);
      btn.classList.toggle("disabled-incompatible", Boolean(incomp));

      const badgeEl = btn.querySelector(".inst-incomp-badge");
      if (badgeEl) {
        if (incomp) {
          badgeEl.textContent = `⚠️ Incompatible con ${incomp.culpritName}`;
          badgeEl.style.display = "inline-block";
          btn.title = incomp.reason;
        } else {
          badgeEl.style.display = "none";
          btn.title = inst.desc;
        }
      }
    });

    const count = this.selectedInstitutions.size;
    const counterEl = modal.querySelector("#inst-selection-counter");
    if (counterEl) {
      counterEl.textContent = `${count} / 4 seleccionadas`;
      counterEl.className = `inst-selection-badge ${count >= 1 ? 'ready' : ''}`;
    }

    const btnGenerate = modal.querySelector("#btn-do-generate-case");
    if (btnGenerate) {
      btnGenerate.disabled = false;
    }
  },

  applyPreset(presetId) {
    const preset = this.TOPIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.selectedPresetId = presetId;
    this.selectedInstitutions.clear();
    preset.institutions.forEach(id => this.selectedInstitutions.add(id));

    const modal = document.getElementById("ai-case-generator-modal");
    if (modal) {
      modal.querySelectorAll(".preset-card").forEach(c => {
        c.classList.toggle("active", c.dataset.presetId === presetId);
      });
      const btnGenerate = modal.querySelector("#btn-do-generate-case");
      if (btnGenerate) btnGenerate.disabled = false;
    }
  },

  renderModal() {
    this.closeModal();

    const modalEl = document.createElement("div");
    modalEl.id = "ai-case-generator-modal";
    modalEl.className = "ai-gen-modal-overlay";

    const civilInsts = this.INSTITUTIONS.filter(i => i.subject === "civil");
    const procInsts = this.INSTITUTIONS.filter(i => i.subject === "procesal");
    const constInsts = this.INSTITUTIONS.filter(i => i.subject === "constitucional");

    modalEl.innerHTML = `
      <div class="ai-gen-modal-container">
        
        <!-- HEADER -->
        <div class="ai-gen-header">
          <div class="ai-gen-header-title">
            <div class="ai-gen-badge-sparkle">
              <i data-lucide="sparkles"></i>
            </div>
            <div>
              <h2>Generador Metodológico de Casos con IA</h2>
              <p>Creación de casos de nivel examen de grado ajustados al Protocolo 2026-20 y Rúbrica de 4 Dimensiones</p>
            </div>
          </div>
          <button id="btn-close-ai-gen" class="icon-btn" title="Cerrar modal">
            <i data-lucide="x"></i>
          </button>
        </div>

        <!-- BANNER DE NUTRICIÓN DOGMÁTICA Y FUENTES -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin: 12px 24px 0 24px; padding: 8px 14px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-secondary);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="shield-check" style="width: 15px; height: 15px; color: #60a5fa;"></i>
            <span>Agente nutrido con la carpeta <strong>FUENTES</strong> y los <strong>Apuntes Oficiales (103 Cédulas)</strong></span>
          </div>
          <span style="color: #60a5fa; font-weight: 600; font-size: 0.75rem;">Protocolo AFG 2026-20</span>
        </div>

        <!-- PESTAÑAS DE MODO -->
        <div class="ai-gen-mode-tabs">
          <button class="ai-gen-tab-btn ${this.activeMode === 'manual' ? 'active' : ''}" data-tab-mode="manual">
            <i data-lucide="check-square"></i>
            <span>1. Selección por Instituciones Jurídicas</span>
          </button>
          <button class="ai-gen-tab-btn ${this.activeMode === 'preset' ? 'active' : ''}" data-tab-mode="preset">
            <i data-lucide="dices"></i>
            <span>2. Tópico General / Simulación Sorpresa</span>
          </button>
        </div>

        <!-- CUERPO -->
        <div class="ai-gen-body">
          
          <!-- MODO 1: SELECCIÓN MANUAL DE INSTITUCIONES -->
          <div id="ai-gen-view-manual" style="display: ${this.activeMode === 'manual' ? 'block' : 'none'};">
            
            <div class="ai-gen-helper-banner">
              <i data-lucide="info" style="color: var(--gold-primary); min-width: 18px;"></i>
              <div>
                <strong>Reglas de Armonía Dogmática:</strong> Selecciona entre <strong>1 y 4 instituciones</strong> para estructurar el conflicto. El motor descartará y bloqueará automáticamente cualquier institución incompatible con tus selecciones.
              </div>
              <div id="inst-selection-counter" class="inst-selection-badge">
                0 / 4 seleccionadas
              </div>
            </div>

            <!-- GRUPO CIVIL -->
            <div class="inst-category-section">
              <h3 class="inst-category-title civil">
                <i data-lucide="book-open"></i> Derecho Civil (Acto Jurídico, Bienes, Contratos y Responsabilidad)
              </h3>
              <div class="inst-pills-grid">
                ${civilInsts.map(inst => this.renderInstPill(inst)).join('')}
              </div>
            </div>

            <!-- GRUPO PROCESAL -->
            <div class="inst-category-section">
              <h3 class="inst-category-title procesal">
                <i data-lucide="scale"></i> Derecho Procesal (Orgánico, Juicio Ordinario, Medidas y Recursos)
              </h3>
              <div class="inst-pills-grid">
                ${procInsts.map(inst => this.renderInstPill(inst)).join('')}
              </div>
            </div>

            <!-- GRUPO CONSTITUCIONAL -->
            <div class="inst-category-section">
              <h3 class="inst-category-title constitucional">
                <i data-lucide="shield"></i> Derecho Constitucional & Garantías
              </h3>
              <div class="inst-pills-grid">
                ${constInsts.map(inst => this.renderInstPill(inst)).join('')}
              </div>
            </div>

          </div>

          <!-- MODO 2: PRESETS DE TÓPICOS GENERALES / CASO SORPRESA -->
          <div id="ai-gen-view-preset" style="display: ${this.activeMode === 'preset' ? 'block' : 'none'};">
            
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">
              Ideal para estudiantes que desean simular la incertidumbre del examen de grado sin elegir instituciones previas. Haz clic en un tópico para preparar el caso:
            </p>

            <div class="presets-grid">
              ${this.TOPIC_PRESETS.map(preset => `
                <div class="preset-card ${this.selectedPresetId === preset.id ? 'active' : ''}" data-preset-id="${preset.id}">
                  <div class="preset-card-title">${preset.title}</div>
                  <div class="preset-card-tagline">${preset.tagline}</div>
                  <div class="preset-card-insts">
                    ${preset.institutions.map(id => {
                      const inst = this.INSTITUTIONS.find(i => i.id === id);
                      return `<span class="preset-inst-tag">${inst ? inst.name : id}</span>`;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>

          </div>

        </div>

        <!-- FOOTER Y BOTONES DE ACCIÓN -->
        <div class="ai-gen-footer">
          <div class="ai-gen-footer-options">
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              Preguntas generadas: <strong>3 de alternativas (A-E)</strong> con justificación oficial y pauta de hechos.
            </span>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="btn-cancel-ai-gen" class="btn btn-secondary">
              Cancelar
            </button>
            <button id="btn-do-generate-case" class="btn btn-primary">
              <i data-lucide="sparkles"></i>
              <span>Generar Caso Práctico & Rúbricas</span>
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modalEl);
    if (window.lucide) window.lucide.createIcons();
    this.bindModalEvents(modalEl);
  },

  renderInstPill(inst) {
    return `
      <div class="inst-pill" data-inst-id="${inst.id}" title="${inst.desc}">
        <div class="inst-pill-header">
          <span class="inst-pill-name">${inst.name}</span>
          <span class="inst-pill-rules">${inst.rules}</span>
        </div>
        <div class="inst-incomp-badge" style="display: none;"></div>
      </div>
    `;
  },

  bindModalEvents(modalEl) {
    modalEl.querySelector("#btn-close-ai-gen")?.addEventListener("click", () => this.closeModal());
    modalEl.querySelector("#btn-cancel-ai-gen")?.addEventListener("click", () => this.closeModal());
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) this.closeModal();
    });

    modalEl.querySelectorAll("[data-tab-mode]").forEach(tab => {
      tab.addEventListener("click", () => {
        const mode = tab.dataset.tabMode;
        this.activeMode = mode;
        modalEl.querySelectorAll("[data-tab-mode]").forEach(t => t.classList.toggle("active", t === tab));
        modalEl.querySelector("#ai-gen-view-manual").style.display = mode === "manual" ? "block" : "none";
        modalEl.querySelector("#ai-gen-view-preset").style.display = mode === "preset" ? "block" : "none";
        this.updatePillsUI();
      });
    });

    modalEl.querySelectorAll(".inst-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        const id = pill.dataset.instId;
        this.toggleInstitution(id);
      });
    });

    modalEl.querySelectorAll(".preset-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.dataset.presetId;
        this.applyPreset(id);
      });
    });

    const btnGenerate = modalEl.querySelector("#btn-do-generate-case");
    if (btnGenerate) {
      btnGenerate.addEventListener("click", () => {
        this.executeGeneration();
      });
    }
  },

  /**
   * Ejecuta el proceso de generación con feedback animado y lo guarda en el banco de casos
   */
  async executeGeneration() {
    if (this.selectedInstitutions.size === 0) {
      if (this.activeMode === "preset" && this.selectedPresetId) {
        this.applyPreset(this.selectedPresetId);
      } else {
        this.applyPreset("preset_examen_aleatorio");
        if (typeof App !== "undefined" && App.showToast) {
          App.showToast("Iniciando simulación aleatoria de Examen de Grado...", "info");
        }
      }
    }

    const modal = document.getElementById("ai-case-generator-modal");
    if (!modal) return;

    const selectedList = Array.from(this.selectedInstitutions)
      .map(id => this.INSTITUTIONS.find(i => i.id === id))
      .filter(Boolean);

    modal.querySelector(".ai-gen-body").innerHTML = `
      <div class="generator-loading-state">
        <div class="loading-spinner"></div>
        <h3 style="font-family: var(--font-display); color: var(--gold-primary); margin-top: 18px;">
          El Agente de IA está redactando el caso de examen de grado...
        </h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); max-width: 500px; text-align: center; line-height: 1.6;">
          Estructurando hechos circunstanciados según la Pauta 2026, preguntas de alternativas A-E con barajado dinámico y rúbricas oficiales de 4 dimensiones.
        </p>
        <div class="loading-quote">
          <em>"La premisa mayor es la regla positiva; la premisa menor, el hecho comprobado; la conclusión, la solución dogmática irrevocable."</em>
        </div>
      </div>
    `;

    const btnFooter = modal.querySelector(".ai-gen-footer");
    if (btnFooter) btnFooter.style.display = "none";

    setTimeout(async () => {
      const newCase = this.synthesizeCase(selectedList);

      // 1. Guardar en StorageService local aplicando límite FIFO de 10 casos de práctica
      const data = StorageService.getData();
      if (!data.cases) data.cases = [];
      data.cases.unshift(newCase);
      StorageService.saveData(data);
      StorageService.pruneOldAiCases(10);

      // 2. Persistir en servidor físico y sincronizar retención de disco
      try {
        const res = await fetch("/api/ai/save-generated-case", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCase)
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.prunedCount > 0) {
            console.log(`[Storage] Retención FIFO activa: ${resData.prunedCount} caso(s) antiguo(s) purgado(s) del servidor.`);
          }
        }
      } catch (err) {
        console.warn("Aviso: No se pudo guardar en disco servidor, conservado en local:", err);
      }

      this.closeModal();

      // 3. Configurar CaseSolver para mostrar de inmediato el nuevo caso sin filtros excluyentes
      if (typeof CaseSolver !== "undefined") {
        CaseSolver.activeFilter = "all";
        CaseSolver.searchTerm = "";
        CaseSolver.currentCaseId = newCase.id;
        CaseSolver.currentQuestionIndex = 0;
        CaseSolver.mobileView = "workbench";
      }

      // 4. Conmutar a la vista de casos si no estamos en ella
      if (typeof App !== "undefined" && typeof App.switchView === "function") {
        App.switchView("cases");
      }

      if (typeof CaseSolver !== "undefined" && typeof CaseSolver.render === "function") {
        CaseSolver.render();
      }

      if (typeof App !== "undefined" && App.showToast) {
        App.showToast(`¡Caso "${newCase.title.slice(0, 38)}..." generado exitosamente!`, "success");
      }
    }, 1200);
  },

  /**
   * SINTETIZADOR JURÍDICO DE ALTA FIDELIDAD:
   * Evalúa la afinidad dogmática de las instituciones seleccionadas, selecciona el arquetipo óptimo,
   * muta las variables fácticas (para garantizar cero repetición) y baraja las alternativas de cada pregunta.
   */
  synthesizeCase(selectedInstitutions) {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
    const instIds = selectedInstitutions.map(i => i.id);

    // Muestreo dinámico de variables fácticas (Mutador)
    const partyA = this.pickRandom(this.MUTATOR_DATA.partiesA);
    const partyB = this.pickRandom(this.MUTATOR_DATA.partiesB);
    const thirdParty = this.pickRandom(this.MUTATOR_DATA.thirdParties);
    const attorney = this.pickRandom(this.MUTATOR_DATA.attorneys);
    const loc = this.pickRandom(this.MUTATOR_DATA.locations);
    const amt = this.pickRandom(this.MUTATOR_DATA.amounts);
    const dates = this.pickRandom(this.MUTATOR_DATA.dates);

    // DEFINICIÓN DE LOS 10 ARQUETIPOS DE EXAMEN DE GRADO
    const archetypes = [
      // ARQUETIPO 1: BIENES, POSESIÓN REGISTRAL Y DOBLE VENTA INMOBILIARIA
      {
        id: "bienes_posesion_doble_venta",
        subjects: ["civil"],
        targetInsts: ["civ_tradicion_posesion", "civ_reivindicatoria", "civ_mera_tenencia_arriendo"],
        linkedFuentes: { file: "LOS BIENES.md", section: "La Posesión y Modos de Adquirir", rules: "Arts. 686, 700, 724, 728, 1817 CC" },
        linkedTopics: [
          { id: "civil-losbienes-1-3", code: "1.3", title: "El Modo de Adquirir Tradición (Arts. 670 y ss. CC)" },
          { id: "civil-losbienes-1-4", code: "1.4", title: "La Posesión y la Teoría de la Posesión Inscrita" },
          { id: "civil-losbienes-1-6", code: "1.6", title: "Protección del Dominio y de la Posesión (Acción Reivindicatoria)" }
        ],
        dogmaticPrinciples: "La inscripción conservatoria es requisito, prueba y garantía de la posesión sobre inmuebles (Arts. 686 y 724 CC). La entrega material no transfiere el dominio ni desvirtúa la preferencia del Art. 1817 CC.",
        build: () => {
          const title = `Caso Práctico: Compraventa de Inmueble, Posesión Registral y Acción Reivindicatoria (${partyA.name} c/ ${partyB.name})`;
          const facts = `Con fecha ${dates.contract}, ${partyA.name} celebró por escritura pública ante Notario de ${loc.city} un contrato de compraventa con ${partyB.name}, respecto del inmueble ubicado en la comuna de ${loc.comm}, por un precio total de ${amt.clp}, pagadero en tres cuotas iguales de ${amt.partial}.\n\n` +
            `En la misma fecha, ${partyB.name} efectuó la entrega material del predio a ${partyA.name}, pero este último omitió requerir de inmediato la inscripción en el Conservador de Bienes Raíces respectivo. Dos meses después, el día ${dates.breach}, ${partyB.name} vendió nuevamente el mismo inmueble a ${thirdParty.name}, por escritura pública que fue competentemente inscrita en el Registro de Propiedad del Conservador de Bienes Raíces el día 25 del mismo mes.\n\n` +
            `Al enterarse de la inscripción, ${partyA.name} suspendió el pago de la segunda cuota. Ante ello, ${partyB.name} dedujo demanda ordinaria de cumplimiento forzado con indemnización de perjuicios ante el ${loc.court}. ${partyA.name} compareció oponiendo la excepción de contrato no cumplido (Art. 1552 CC) y dedujo demanda reconvencional reivindicatoria contra ${thirdParty.name}, alegando ser el dueño exclusivo por haber adquirido con anterioridad mediante entrega material.`;
          
          const breakdown = {
            principales: [
              `Compraventa por escritura pública entre ${partyA.name} y ${partyB.name} sobre inmueble en ${loc.comm} con entrega material sin inscripción registral.`,
              `Segunda venta del mismo inmueble por ${partyB.name} a ${thirdParty.name} con competente inscripción en el Registro de Propiedad del Conservador.`,
              `Falta de pago de la segunda cuota de ${amt.partial} por ${partyA.name} al constatar la inscripción de un tercero.`,
              `Demanda de cumplimiento deducida ante el ${loc.court} y reconvención reivindicatoria contra el poseedor inscrito.`
            ],
            secundarios: [
              `Domicilio de las partes en ${loc.city} y desglose del pago en cuotas.`,
              `Mención a la buena o mala fe subjetiva de los compradores al momento de la suscripción.`
            ],
            distractores: [
              "La entrega material efectuada al primer comprador (en Chile la tradición del dominio sobre bienes raíces solo se efectúa por la inscripción conservatoria, Arts. 686 y 724 CC).",
              "La alegación de que la segunda compraventa es nula por venta de cosa ajena (en el derecho chileno la venta de cosa ajena es válida y eficaz entre las partes, Art. 1815 CC)."
            ],
            partes: {
              principales: `${partyA.name} (Primer comprador con entrega material / Reconviniente), ${partyB.name} (Vendedor demandante principal) y ${thirdParty.name} (Segunda compradora con título inscrito).`,
              secundarias: `Juez titular del ${loc.court}, Notario de ${loc.city} y Conservador de Bienes Raíces.`
            },
            instituciones: [
              "Teoría de la Posesión Inscrita y Tradición de Inmuebles (Arts. 686, 724 y 728 CC)",
              "Doble venta de una misma cosa a distintas personas (Art. 1817 CC)",
              "Acción Reivindicatoria y requisitos de titularidad (Arts. 889 y 895 CC)",
              "Excepción de Contrato No Cumplido (Art. 1552 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Bienes y Tradición)",
              questionText: `Frente a la concurrencia de la entrega material en favor de ${partyA.name} y la posterior inscripción en favor de ${thirdParty.name}, ¿quién ostenta la calidad jurídica de dueño del inmueble?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `${thirdParty.name}, pues sobre los bienes raíces la tradición del dominio y la posesión inscrita solo se perfeccionan mediante la competente inscripción en el Registro del Conservador de Bienes Raíces (Arts. 686 y 724 CC).` },
                { id: "b", text: `${partyA.name}, porque la entrega material previa le confirió posesión regular y el dominio indiscutible por principio de prelación cronológica contractual.` },
                { id: "c", text: `Ambas partes adquieren una comunidad hereditaria o cuasicontractual sobre el inmueble hasta que un juez árbitro liquide la propiedad.` },
                { id: "d", text: `Ninguno de los dos, puesto que la doble venta acarrea la nulidad absoluta e inexistencia de ambos contratos de pleno derecho.` },
                { id: "e", text: `${partyB.name} conserva el dominio fiduciario mientras no se dicte sentencia firme en el juicio ordinario de mayor cuantía.` }
              ],
              explanation: "En el derecho civil chileno rige el principio dual de título y modo. Tratándose de bienes raíces, la tradición del dominio y demás derechos reales sobre inmuebles se efectúa única y exclusivamente por la inscripción del título en el Registro de Propiedad del Conservador de Bienes Raíces (Art. 686 CC). La mera entrega material no transfiere el dominio ni confiere posesión regular inscrita (Arts. 724 y 728 CC). Se refutan los distractores: (b) la entrega material previa no confiere dominio ni preferencia cronológica frente a la tradición formal del Art. 1817 CC; (d) la venta de cosa ajena es plenamente válida en el ordenamiento chileno (Art. 1815 CC) y no adolece de nulidad de pleno derecho. Conclusión: En el régimen conservatorio chileno de bienes raíces, la tradición y posesión jurídica se adquieren únicamente por la inscripción conservatoria (Arts. 686 y 724 CC), prefiriendo al comprador inscrito conforme al Art. 1817 CC.",
              pauta: "La comisión evalúa que el postulante aplique el sistema dual de título y modo; que identifique la solemnidad de la inscripción en el Registro del Conservador como única forma de tradición del dominio sobre inmuebles (Art. 686 CC); y que descarte que la posesión material sin título inscrito pueda sobreponerse a la regla de preferencia del Art. 1817 CC.",
              errorFatalDeGrado: "Sostener que la tradición de un bien raíz se perfecciona mediante la simple entrega material o posesión fáctica, desconociendo la teoría de la posesión inscrita y el tenor perentorio del Art. 686 del Código Civil.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la tradición sobre inmuebles?", outstanding: "Cita con exactitud los arts. 686, 724, 728 y 1817 del Código Civil y el principio de dualidad título-modo.", sufficient: "Identifica que se requiere inscripción conservatoria para transferir el dominio.", basic: "Menciona genéricamente el Código Civil.", insufficient: "Confunde entrega material con tradición conservatoria." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hechos fácticos determinan la titularidad?", outstanding: "Identifica la inscripción de la segunda compradora en el Conservador versus la mera entrega material del primer comprador.", sufficient: "Menciona que la segunda compradora inscribió en el Conservador.", basic: "Alude solo a los contratos celebrados.", insufficient: "No identifica los actos traslaticios ni las fechas registrales." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué prevalece el título inscrito sobre la posesión material?", outstanding: "Razona que el contrato solo engendra derechos personales. Al no existir inscripción en favor del primer comprador, el vendedor conservó el dominio para enajenar válidamente a un tercero.", sufficient: "Explica que la inscripción en el Conservador prevalece sobre la entrega material.", basic: "Subsunción incompleta.", insufficient: "Afirma erróneamente que el primer comprador es dueño por haber comprado antes." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Uso riguroso de lenguaje técnico?", outstanding: "Uso impecable de 'dualidad título y modo', 'posesión inscrita', 'tradición conservatoria' y 'garantía registral'.", sufficient: "Redacción técnica ordenada y coherente.", basic: "Errores menores de redacción.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Remedios Contractuales)",
              questionText: `¿Es procedente que ${partyA.name} oponga la excepción de contrato no cumplido (Art. 1552 CC) frente a la demanda de cobro del precio deducida por ${partyB.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `Sí, porque ${partyB.name} incumplió su obligación esencial de proporcionar la posesión jurídica y amparar al comprador en el dominio, por lo que su mora culpable purga la mora del comprador.` },
                { id: "b", text: "No, porque el comprador tiene el deber de pagar el precio en la fecha pactada sin formular reparo alguno, debiendo demandar después en juicio separado." },
                { id: "c", text: "No, porque el Art. 1552 CC solo es aplicable a contratos unilaterales y gratuitos según la doctrina tradicional." },
                { id: "d", text: `Sí, pero únicamente si ${partyA.name} deposita judicialmente el total del precio insoluto al momento de evacuar la contestación.` },
                { id: "e", text: "No, porque la mora en el pago de la cuota extinguió todos los derechos contractuales del comprador automáticamente." }
              ],
              explanation: "La compraventa es un contrato bilateral en que la obligación capital del vendedor consiste en entregar la cosa vendida (Arts. 1793 y 1824 CC). Tratándose de inmuebles, dicha entrega exige la tradición mediante la competente inscripción y la entrega material pacífica que permita al comprador poseer como señor y dueño. Al haber transferido e inscrito el bien en favor de un tercero, el vendedor se colocó en situación de incumplimiento culpable definitivo, lo que faculta plenamente al comprador para enervar el cobro mediante la excepción del Art. 1552 CC ('la mora purga la mora'). Se refutan los distractores: (b) el deudor no está obligado a pagar en fecha cuando la contraparte incumplió definitivamente la entrega, pues la exceptio opera precisamente como defensa suspensiva; (c) el Art. 1552 CC exige reciprocidad sinalagmática, siendo aplicable a contratos bilaterales y no unilaterales. Conclusión: El incumplimiento culpable del vendedor al enajenar e inscribir a nombre de un tercero purga la mora del comprador, tornando inexigible el cobro del precio insoluto conforme al Art. 1552 del Código Civil.",
              pauta: "La comisión exige que el examinado identifique la interdependencia de las prestaciones en los contratos bilaterales (sinalagma funcional); constate que la obligación esencial de entrega jurídica fue vulnerada definitivamente por el vendedor; y fundamente la procedencia de la exceptio non adimpleti contractus del Art. 1552 CC.",
              errorFatalDeGrado: "Afirmar que en los contratos bilaterales el deudor demandado está obligado a pagar el precio convenido aun cuando el vendedor haya transferido e inscrito el bien raíz a favor de un tercero de forma irrevocable.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué norma ampara la exceptio non adimpleti contractus?", outstanding: "Cita el Art. 1552 CC, el sinalagma contractual y los Arts. 1824 y 1826 CC sobre la obligación de entrega del vendedor.", sufficient: "Identifica la regla de 'la mora purga la mora' del Art. 1552 CC.", basic: "Menciona genéricamente el incumplimiento.", insufficient: "Cita normas impertinentes." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho configura el incumplimiento del vendedor?", outstanding: "Identifica la segunda venta e inscripción registral en favor de un tercero que privó al comprador de adquirir la posesión jurídica.", sufficient: "Menciona que el vendedor vendió dos veces la propiedad.", basic: "Alude solo al no pago de la cuota.", insufficient: "Desconoce los hechos del caso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo se neutraliza la exigibilidad del precio?", outstanding: "Articula el silogismo demostrando que la exigibilidad del precio presupone que el vendedor esté llano a cumplir; al transferir el dominio a otra persona, su mora neutraliza la del comprador.", sufficient: "Razona que el vendedor no puede exigir el precio si ya enajenó el bien a otra persona.", basic: "Argumentación superficial.", insufficient: "Sostiene que el comprador está en mora inexcusable." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal y sustantivo adecuado?", outstanding: "Uso exacto de 'sinalagma funcional', 'excepción de contrato no cumplido', 'mora purgada' y 'prestaciones recíprocas'.", sufficient: "Redacción comprensible y estructurada.", basic: "Imprecisiones terminológicas.", insufficient: "Lenguaje vulgar." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Acciones Reales)",
              questionText: `¿Es jurídicamente viable la demanda reconvencional reivindicatoria interpuesta por ${partyA.name} en contra de ${thirdParty.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `No, porque la acción reivindicatoria corresponde privativamente al dueño no poseedor contra el poseedor no dueño (Art. 889 CC), y ${partyA.name} nunca adquirió el dominio sobre el inmueble.` },
                { id: "b", text: `Sí, porque la entrega material previa le otorgó un dominio natural protegido por el Art. 894 CC con preferencia absoluta.` },
                { id: "c", text: `Sí, porque la acción reivindicatoria puede ser deducida por cualquier interesado en el bien raíz sin acreditar derecho real alguno.` },
                { id: "d", text: `Solo si ${thirdParty.name} es condenada previamente en sede penal por el delito de apropiación indebida.` },
                { id: "e", text: `Sí, pero únicamente si el tribunal decreta de oficio la partición forzosa del inmueble.` }
              ],
              explanation: "Conforme al Art. 889 del Código Civil, la reivindicación o acción de dominio es la que tiene el dueño de una cosa singular, de que no está en posesión, para que el poseedor de ella sea condenado a restituírsela. Por tanto, el primer presupuesto indispensable para accionar es la titularidad del derecho real de dominio. Dado que el primer comprador solo tuvo la entrega material sin título inscrito, carece de dominio y de posesión regular inscrita (Arts. 724 y 728 CC), resultando manifiestamente improcedente la acción reivindicatoria. Se refutan los distractores: (b) la entrega material sin inscripción no confiere dominio natural ni habilita la acción publiciana del Art. 894 CC contra el verdadero dueño con título inscrito vigente; (c) la acción reivindicatoria no es una acción popular ni puede deducirla un mero interesado contractual sin derecho real de dominio. Conclusión: La acción reivindicatoria corresponde exclusivamente al dueño no poseedor contra el poseedor no dueño (Art. 889 CC); al carecer el actor reconvencional de derecho real de dominio por falta de competente inscripción conservatoria, carece absolutamente de legitimación activa.",
              pauta: "Se exige enunciar los presupuestos copulativos de la acción reivindicatoria (cosa singular reivindicable, demandante dueño no poseedor y demandado poseedor no dueño); y concluir la falta de legitimación activa del comprador sin título inscrito.",
              errorFatalDeGrado: "Conceder legitimación activa para deducir acción reivindicatoria a quien carece absolutamente de la calidad de dueño del inmueble, confundiendo la entrega material fáctica con el derecho real de dominio (Art. 889 CC).",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Cuáles son los requisitos del Art. 889 CC?", outstanding: "Cita con exactitud el Art. 889 CC y enumera los requisitos de la acción reivindicatoria (cosa susceptible de reivindicación, actor dueño y demandado poseedor).", sufficient: "Identifica que se debe ser dueño para reivindicar.", basic: "Menciona el Código Civil en general.", insufficient: "Desconoce los requisitos del Art. 889 CC." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué calidad jurídica ostenta el actor reconvencional?", outstanding: "Identifica que el primer comprador únicamente recibió la tenencia/entrega material y carece de inscripción en el Conservador de Bienes Raíces.", sufficient: "Menciona que el demandante no tiene título inscrito.", basic: "Alude al contrato de compraventa.", insufficient: "No advierte la falta de dominio." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué fracasa la pretensión reivindicatoria?", outstanding: "Desarrolla el razonamiento demostrando que al carecer el actor del derecho real de dominio, adolece de falta de legitimación activa para reivindicar, debiendo rechazar la acción sin necesidad de ponderar la posesión de la demandada.", sufficient: "Explica que al no ser dueño no puede pedir la reivindicación.", basic: "Subsunción básica.", insufficient: "Afirma que el poseedor material puede reivindicar contra el dueño inscrito." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Lenguaje jurídico apropiado?", outstanding: "Uso riguroso de 'legitimación activa', 'acción de dominio', 'dueño no poseedor' y 'presupuestos de procedencia'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO DOBLE VENTA Y POSESIÓN REGISTRAL:\n\n` +
            `1. Titularidad del Dominio: En el derecho civil chileno la compraventa es un mero título traslaticio de dominio que solo engendra derechos personales (Art. 1815 CC). La adquisición del derecho real de dominio sobre bienes raíces exige de manera inexcusable el modo de adquirir tradición mediante la inscripción en el Registro de Propiedad del Conservador de Bienes Raíces (Arts. 686 y 724 CC). Habiendo inscrito su título ${thirdParty.name}, adquirió la posesión inscrita y el dominio preferente conforme a la regla del Art. 1817 CC, mientras que ${partyA.name} detenta únicamente la posesión material.\n\n` +
            `2. Defensa Contractual: Frente a la demanda de cobro del saldo de precio deducida por ${partyB.name}, ${partyA.name} puede oponer con éxito la excepción de contrato no cumplido (Art. 1552 CC), por cuanto el vendedor ha colocado a la cosa en imposibilidad jurídica de ser entregada y amparada, incurriendo en mora que purga la del comprador.\n\n` +
            `3. Reconvención Reivindicatoria: La demanda reconvencional reivindicatoria debe ser rechazada, ya que según el Art. 889 CC la acción de dominio corresponde privativamente al dueño no poseedor contra el poseedor no dueño; al no haberse inscrito el predio a nombre de ${partyA.name}, este carece de legitimación activa para reivindicar, quedándole a salvo exclusivamente las acciones contractuales indemnizatorias o resolutorias contra ${partyB.name}.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 2: LESIÓN ENORME, DOLO RETICENTE Y OBLIGACIONES DEL ABOGADO (Caso A AFG 2026-20)
      {
        id: "lesion_enorme_dolo_mandato",
        subjects: ["civil"],
        targetInsts: ["civ_lesion_enorme", "civ_dolo_vicio_consentimiento", "civ_mandato_civil"],
        linkedFuentes: { file: "ACTO JURIDICO.md", section: "Teoría del Acto Jurídico - Vicios del Consentimiento", rules: "Arts. 1458, 1888, 1889, 2116, 2129 CC" },
        linkedTopics: [
          { id: "civil-clase911-4-4", code: "4.4", title: "Rescisión por Lesión Enorme y Pactos Accesorios" },
          { id: "civil-actojuridi-1-4", code: "1.4", title: "Requisitos de Validez: Vicios del Consentimiento y Capacidad" },
          { id: "civil-clase911-4-2", code: "4.2", title: "Contratos en Particular: Compraventa y Mandato" }
        ],
        dogmaticPrinciples: "La lesión enorme es un vicio objetivo taxativo: el justo precio se refiere exclusivamente al tiempo del contrato (Art. 1889 CC). Las fluctuaciones posteriores de plusvalía integran el riesgo normal del adquirente.",
        build: () => {
          const title = `Caso Práctico: Compraventa de Terreno, Lesión Enorme y Mandato Profesional (${partyA.name} c/ ${partyB.name})`;
          const facts = `En diciembre de 2024, ${partyB.name} compró a ${partyA.name} un sitio ubicado en la comuna de ${loc.comm} por la suma única de ${amt.uf}. En la compraventa se pactó que la entrega material del inmueble se haría dentro del plazo de 6 meses contados desde la suscripción del contrato. En el mismo mes de la suscripción se practicó la inscripción conservatoria a nombre de la compradora.\n\n` +
            `En marzo de 2025, ${partyA.name} se enteró, a través de un inserto publicitario y prensa local, que los terrenos de ${loc.comm} habían triplicado su valor comercial, debido al anuncio gubernamental de ampliación de la red de transporte público (Metro) hacia esa zona, cuyas obras comenzarían el año 2026.\n\n` +
            `Ante ello, ${partyA.name} acudió al ${attorney.name} con el propósito de rescindir o revertir la operación alegando haber sufrido lesión enorme y haber sido engañado por la compradora al haber ésta supuestamente omitido información relevante sobre el proyecto. El profesional constató que, en efecto, el precio de mercado había subido y que la empresa estatal comunicó oficialmente su plan de expansión recién en enero de 2025. ${partyA.name} y su abogado suscribieron una carta de honorarios para que el profesional realice el estudio de los antecedentes y la evaluación de eventuales acciones judiciales.`;

          const breakdown = {
            principales: [
              `Compraventa e inscripción de inmueble en ${loc.comm} por ${amt.uf} a precio de mercado corriente en diciembre de 2024.`,
              `Aumento sobreviniente del valor comercial a más del triple por anuncio de expansión de obras públicas en enero de 2025.`,
              `Pretensión del vendedor de rescindir la venta alegando lesión enorme y dolo por omisión (reticencia).`,
              `Suscripción de carta de honorarios con abogado para evaluación de antecedentes y viabilidad judicial.`
            ],
            secundarios: [
              "Pacto de entrega material a 6 meses de la suscripción.",
              "Publicación en inserto publicitario y prensa en marzo de 2025."
            ],
            distractores: [
              "El aumento sobreviniente del precio a más del triple tras el contrato (la lesión enorme exige que el desequilibrio del justo precio exista al tiempo del contrato, Art. 1889 CC).",
              "La afirmación de dolo por reticencia de la compradora (el anuncio de transporte fue oficial con posterioridad a la firma)."
            ],
            partes: {
              principales: `${partyA.name} (Vendedor disconforme), ${partyB.name} (Compradora con título inscrito) y ${attorney.name} (Mandatario consultor).`,
              secundarias: "Empresa de Transporte Público y Notario autorizante."
            },
            instituciones: [
              "Lesión Enorme en la Compraventa de Bienes Raíces (Arts. 1888, 1889 y 1890 CC)",
              "Dolo como Vicio del Consentimiento y Reticencia (Arts. 44 y 1458 CC)",
              "Contrato de Mandato Civil y Obligaciones del Abogado (Arts. 2116, 2118, 2129 y 2158 CC)",
              "Fuerza Obligatoria del Contrato (Art. 1545 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Acto Jurídico y Lesión Enorme)",
              questionText: `En cuanto al contrato celebrado entre ${partyA.name} y ${partyB.name}, ¿puede calificarse la situación descrita como constitutiva de lesión enorme conforme al Código Civil?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "No, porque la calificación del justo precio de la operación descrita debe considerarse estrictamente al tiempo del contrato (Art. 1889 CC) y no por circunstancias sobrevinientes." },
                { id: "b", text: "Sí, porque el valor comercial del terreno efectivamente se triplicó, provocando un perjuicio evidente y desproporcionado al patrimonio del vendedor." },
                { id: "c", text: "Sí, constituye lesión enorme y faculta al vendedor para exigir de inmediato la restitución del predio sin opción para la compradora." },
                { id: "d", text: "No, por cuanto la institución de la lesión enorme no es aplicable a la compraventa voluntaria de bienes inmuebles según el Código Civil." },
                { id: "e", text: "Sí, pero únicamente si el tribunal califica la plusvalía como una fuerza moral irresistible." }
              ],
              explanation: "Conforme al Art. 1889 del Código Civil: 'El justo precio se refiere al tiempo del contrato'. En el caso planteado, el valor comercial del predio aumentó con posterioridad en virtud del anuncio oficial de la red de transporte comunicado en enero de 2025. Al momento de contratar (diciembre de 2024), el precio convenido correspondía al valor de mercado, por lo que no existió desproporción coetánea. Se refutan los distractores: (b) el alza sobreviniente de valor no vicia el acto ya que el alea económico posterior pertenece al comprador; (c) la lesión enorme jamás autoriza la resolución inmediata sin otorgar a la demandada la opción de completar el justo precio (Art. 1890 CC). Conclusión: La lesión enorme es un vicio objetivo que debe concurrir coetáneamente al tiempo del contrato (Art. 1889 CC), siendo ineficaces las fluctuaciones o plusvalías sobrevinientes para rescindir la venta.",
              pauta: "El postulante debe distinguir con precisión la conmutatividad genética de la sobreviniente, citando el Art. 1889 CC ('el justo precio se refiere al tiempo del contrato') y explicando que el riesgo del valor futuro del suelo lo asume el adquirente.",
              errorFatalDeGrado: "Sostener que la lesión enorme puede configurarse por aumentos de precio o plusvalías ocurridas con posterioridad a la celebración del contrato, ignorando el Art. 1889 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿En qué momento debe apreciarse el justo precio?", outstanding: "Cita el Art. 1889 CC señalando con precisión que el justo precio se evalúa al tiempo del contrato y cita el Art. 1890 CC.", sufficient: "Identifica que el justo precio se calcula a la fecha del contrato.", basic: "Menciona genéricamente la lesión enorme.", insufficient: "Afirma que procede por hechos posteriores." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué fechas demuestran la falta de lesión?", outstanding: "Identifica que el contrato se suscribió en diciembre de 2024 y el anuncio de Metro ocurrió en enero de 2025.", sufficient: "Menciona que la subida de precio fue posterior a la firma.", basic: "Alude al valor comercial.", insufficient: "Desconoce la cronología del caso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué una plusvalía sobreviniente no vicia el contrato?", outstanding: "Razona que la lesión enorme es un vicio objetivo coetáneo al perfeccionamiento negocial; las fluctuaciones de mercado sobrevinientes integran el riesgo normal del adquirente y no autorizan la rescisión.", sufficient: "Explica que la subida del precio ocurrió después y no vicia el contrato firmado.", basic: "Subsunción débil.", insufficient: "Sostiene que la triplicación del precio vicia la venta." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática precisa?", outstanding: "Uso de 'justo precio al tiempo del contrato', 'desequilibrio objetivo', 'rescisión por lesión enorme' y 'principio de conmutatividad'.", sufficient: "Redacción ordenada.", basic: "Errores menores.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Vicios del Consentimiento)",
              questionText: `Respecto de la actuación de la compradora ${partyB.name} y conforme a Derecho, ¿se configura una hipótesis de dolo como vicio del consentimiento?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "No, porque de la información disponible para las partes no se aprecia engaño ni maquinación al momento de contratar, habiendo sido el anuncio oficial posterior a la suscripción." },
                { id: "b", text: "Sí, porque la compradora omitió información sobre proyectos futuros, lo cual configura de pleno derecho dolo por reticencia contractual." },
                { id: "c", text: "No, pero el vendedor puede anular el contrato por error sustancial en la sustancia o calidad esencial de la cosa vendida (Art. 1454 CC)." },
                { id: "d", text: "Sí, porque en el Código Civil chileno todo negocio con plusvalía sobreviniente se presume ejecutado de mala fe." },
                { id: "e", text: "No, porque el dolo solo puede cometerse a través de hechos físicos y jamás mediante omisiones o silencios." }
              ],
              explanation: "Conforme a los Arts. 44 y 1458 del Código Civil, el dolo como vicio del consentimiento requiere que sea obra de una de las partes y que aparezca claramente que sin él no se hubiera contratado. Si bien la doctrina admite el dolo por reticencia (silencio deliberado sobre un hecho que la otra parte tenía derecho a conocer), en la especie no existió ocultamiento culpable coetáneo, puesto que la empresa de transporte hizo público su plan de expansión en enero de 2025, un mes después de firmado el contrato. Se refutan los distractores: (b) no hay reticencia culpable sobre hechos futuros no consolidados al contratar; (c) el error sustancial (Art. 1454 CC) atañe a la materia o cualidades esenciales de la cosa y no al valor económico fluctuante de mercado. Conclusión: El dolo como vicio del consentimiento debe ser determinante y coetáneo a la convención (Art. 1458 CC); la divulgación posterior de obras de infraestructura pública no constituye maquinación fraudulenta ni reticencia culpable.",
              pauta: "La comisión busca que el alumno examine la coetaneidad del vicio subjetivo y determine que un anuncio estatal posterior a la venta no puede ser imputado como reticencia dolosa coetánea de la compradora.",
              errorFatalDeGrado: "Calificar como dolo vicio del consentimiento una circunstancia fáctica nacida con posterioridad al perfeccionamiento del contrato, desconociendo los presupuestos de coetaneidad del Art. 1458 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Cuáles son los presupuestos del Art. 1458 CC?", outstanding: "Cita los Arts. 44 inc. final y 1458 CC y distingue con precisión entre dolo positivo y dolo negativo (reticencia).", sufficient: "Identifica los requisitos del dolo del Art. 1458 CC.", basic: "Mención genérica de los vicios del consentimiento.", insufficient: "Desconoce el concepto de dolo." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué antecedentes descartan el engaño?", outstanding: "Identifica que el plan de transporte no era información reservada ni conocida al momento del contrato, pues se publicó en enero de 2025.", sufficient: "Menciona que el comprador no engañó porque la noticia salió después.", basic: "Alude al precio del predio.", insufficient: "No utiliza las fechas del caso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué no concurre dolo determinante?", outstanding: "Explica que para viciar el consentimiento, la maquinación debe ser coetánea e inducir al error al contratar. Al no existir conocimiento exclusivo ni engaño anterior al contrato, la imputación de dolo carece de sustento fáctico y legal.", sufficient: "Razona que no hubo maquinación fraudulenta para hacerle vender.", basic: "Subsunción básica.", insufficient: "Afirma que la inmobiliaria actuó con dolo por ser empresa comercial." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Lenguaje jurídico apropiado?", outstanding: "Uso riguroso de 'dolo determinante', 'reticencia', 'deber de información' y 'coetaneidad negocial'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Contrato de Mandato y Obligaciones)",
              questionText: `En la convención celebrada entre ${partyA.name} y su abogado para el estudio del caso y evaluación de acciones, ¿qué calificación de la obligación del profesional es la correcta conforme al Código Civil?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "La obligación del abogado es de carácter personal, de medios y contractual, debiendo emplear la debida diligencia profesional sin garantizar la obtención de un resultado judicial favorable." },
                { id: "b", text: "La obligación del abogado es de resultado, obligándose legalmente a obtener la rescisión judicial del contrato o la devolución del predio." },
                { id: "c", text: "La convención es un contrato unilateral y gratuito mientras no se dicte sentencia de término favorable." },
                { id: "d", text: "La obligación del abogado es de orden público legal y no surge del contrato sino de una cuasidelito civil de patrocinio." },
                { id: "e", text: "Es una obligación solidaria en que el abogado asume como deudor conjunto de las deudas del cliente." }
              ],
              explanation: "El encargo profesional entre el cliente y su abogado se rige por las normas del contrato de mandato civil (Arts. 2116 y ss. CC). La obligación que asume el letrado es típicamente personal (debe ejecutar personalmente el encargo según el Art. 2129 CC), de carácter contractual y de medios: consiste en desplegar su ciencia, diligencia y prudencia conforme a la lex artis, respondiendo de la culpa leve en un mandato oneroso (Arts. 2118 y 2129 CC), sin que jamás esté legalmente comprometido a asegurar un resultado judicial favorable específico. Se refutan los distractores: (b) el abogado jamás contrae una obligación de resultado que asegure ganar el pleito; (c) el mandato de servicios profesionales se presume remunerado (Art. 2118 CC) y es bilateral. Conclusión: En el mandato civil y la prestación de servicios profesionales del abogado rige una obligación de medios y no de resultado, respondiendo de culpa leve por la diligencia empleada (Arts. 2118 y 2129 CC).",
              pauta: "El estudiante debe clasificar la obligación profesional como de medios, sujeta al estándar de prudencia y diligencia de la lex artis profesional, descartando la obligación de resultado.",
              errorFatalDeGrado: "Afirmar que el abogado asume legalmente una obligación de resultado que garantiza al cliente la obtención de una sentencia favorable en juicio ordinario.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la prestación de servicios del abogado?", outstanding: "Cita los Arts. 2116, 2118 y 2129 del Código Civil y clasifica con precisión la obligación como de medios y no de resultado.", sufficient: "Identifica que la relación con el abogado es un mandato civil.", basic: "Menciona que el abogado debe hacer su trabajo.", insufficient: "Sostiene que el abogado debe garantizar el resultado." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué convención suscribieron las partes?", outstanding: "Identifica la suscripción de la carta de honorarios para el encargo específico de estudio de antecedentes y evaluación de acciones.", sufficient: "Menciona que firmaron una carta de honorarios.", basic: "Alude a la consulta con el abogado.", insufficient: "Desconoce la naturaleza del encargo." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué la obligación profesional es de medios?", outstanding: "Distingue dogmáticamente entre obligación de medios y de resultado, demostrando que el profesional responde de su diligencia y lex artis en el análisis de los antecedentes, sin responder del éxito de una pretensión que adolece de sustento.", sufficient: "Explica que el abogado cobra por estudiar y litigar, no por asegurar que van a ganar.", basic: "Subsunción básica.", insufficient: "Confunde mandato con fianza de resultados." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología jurídica correcta?", outstanding: "Manejo impecable de 'obligación de medios', 'lex artis', 'mandato remunerado', 'culpa leve' y 'estándar de diligencia'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO LESIÓN ENORME Y MANDATO PROFESIONAL:\n\n` +
            `1. Inviabilidad de la Lesión Enorme: De acuerdo con el Art. 1889 del Código Civil, el justo precio en la compraventa se refiere estrictamente al tiempo de celebración del contrato. En la especie, el precio pactado de ${amt.uf} correspondía al valor de mercado en diciembre de 2024. Las fluctuaciones económicas y la plusvalía derivada de obras públicas anunciadas en enero de 2025 constituyen riesgos ordinarios del tráfico inmobiliario que benefician al comprador y no autorizan la rescisión contractual.\n\n` +
            `2. Descarte de Dolo como Vicio del Consentimiento: Conforme al Art. 1458 CC, el dolo exige ser determinante y coetáneo al negocio jurídico. No existiendo maquinación previa ni ocultamiento culpable por parte de ${partyB.name} al momento de suscribir el acto, no se configura dolo por reticencia.\n\n` +
            `3. Régimen de Responsabilidad del Abogado: La convención suscrita entre ${partyA.name} y el ${attorney.name} constituye un contrato de mandato civil remunerado (Arts. 2116 y 2118 CC), en virtud del cual el letrado contrae una obligación de medios. El estándar exigible es el de culpa leve (Art. 2129 CC) evaluado conforme a la lex artis profesional, debiendo asesorar con lealtad y rigor sobre la falta de mérito de las acciones rescisorias pretendidas.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 3: MEDIDAS PREJUDICIALES PRECAUTORIAS, ACCIÓN MUEBLE, RADICACIÓN Y MANDATO (Caso B AFG 2026-20)
      {
        id: "cautelares_radicacion_mandato",
        subjects: ["procesal"],
        targetInsts: ["proc_medidas_precautorias", "proc_competencia_accion_mueble", "proc_regla_radicacion", "proc_mandato_judicial_muerte", "proc_capacidad_ius_postulandi", "proc_excepcion_dilatoria_incompetencia"],
        linkedFuentes: { file: "PROCESAL.md", section: "Disposiciones Comunes y Juicio Ordinario", rules: "Arts. 580, 581 CC, Arts. 109, 138, 178, 529 COT, Arts. 279, 298 CPC" },
        linkedTopics: [
          { id: "procesal-procesal-1-3", code: "1.3", title: "La Competencia Judicial y sus Reglas" },
          { id: "procesal-procesal-2-2", code: "2.2", title: "Comparecencia en Juicio (Patrocinio y Mandato)" },
          { id: "procesal-procesal-2-6", code: "2.6", title: "Medidas Cautelares y Precautorias (Proporcionalidad)" }
        ],
        dogmaticPrinciples: "La indemnización por defectos de obra es acción personal y mueble (Art. 581 CC), rigiendo el domicilio del deudor. El mandato judicial constituido en favor de abogados no termina por la muerte del mandante (Art. 529 COT).",
        build: () => {
          const title = `Caso Práctico: Medidas Prejudiciales Precautorias, Competencia y Mandato Judicial (${partyA.name} c/ ${partyB.name})`;
          const facts = `${partyA.name} pretende demandar en juicio declarativo de mayor cuantía a la constructora ${partyB.name}, por la defectuosa edificación de cuatro cabañas en un predio de su propiedad ubicado en la comuna de ${loc.comm}, avaluadas en un total de ${amt.clp}, solicitando una indemnización de perjuicios por dicho monto. Las partes tienen su domicilio en ${loc.city} y celebraron el contrato de obra en ${loc.comm}.\n\n` +
            `${partyA.name}, conocedor de la insolvencia de la constructora, solicitó y obtuvo prejudicialmente la medida de prohibición de celebrar actos y contratos sobre un inmueble de propiedad de la demandada avaluado en ${amt.excess}. Dicha solicitud cautelar se presentó ante el ${loc.court} y en ella contó con el patrocinio y poder del ${attorney.name}.\n\n` +
            `Posteriormente, ${partyA.name} presentó en tiempo y forma la demanda ordinaria ante el mismo tribunal que conoció de la medida prejudicial, manteniéndola el juez. Notificada de la demanda y de la cautelar, ${partyB.name} se opuso a ambas alegando que la medida era desproporcionada. El juicio continuó adelante, fijándose la audiencia de prueba testimonial para el día ${dates.hearing}, pero dos días antes de dicha fecha ${partyA.name} falleció imprevistamente, dejando cónyuge y herederos.`;

          const breakdown = {
            principales: [
              `Demanda de indemnización de perjuicios por inejecución/defecto de obra material por la suma de ${amt.clp} (acción mueble, Art. 581 CC).`,
              `Medida prejudicial de prohibición de celebrar actos y contratos trabada sobre bien de ${amt.excess}, excediendo con creces la cuantía del juicio.`,
              `Presentación oportuna de la demanda ante el mismo tribunal que conoció de la prejudicial, radicando la competencia conforme a los Arts. 109 y 178 COT.`,
              `Fallecimiento imprevisto del actor antes de la audiencia de prueba y debate sobre la vigencia del patrocinio y poder del abogado (Art. 529 COT).`
            ],
            secundarios: [
              `Ubicación de las cabañas en ${loc.comm} y domicilio de las partes en ${loc.city}.`,
              `Estado de insolvencia alegado por el actor.`
            ],
            distractores: [
              "El lugar material donde se construyeron las cabañas (la acción indemnizatoria es personal y mueble conforme al Art. 581 CC, por lo que el tribunal competente es el del domicilio del demandado, Art. 138 COT).",
              "La alegación de que la medida se decretó sin previa audiencia (las medidas prejudiciales pueden válidamente decretarse sin audiencia según el Art. 289 CPC)."
            ],
            partes: {
              principales: `${partyA.name} (Actor mandante fallecido), ${partyB.name} (Constructora demandada) y ${attorney.name} (Abogado apoderado).`,
              secundarias: `Herederos de ${partyA.name} y Juez del ${loc.court}.`
            },
            instituciones: [
              "Competencia Territorial en Acciones Personales Muebles (Arts. 580 y 581 CC, Art. 138 COT)",
              "Requisito de Proporcionalidad en Medidas Precautorias (Art. 298 CPC)",
              "Regla General de Competencia de la Radicación (Arts. 109 y 178 COT)",
              "Subsistencia del Mandato Judicial frente a la Muerte del Mandante (Art. 529 COT)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Procesal Orgánico (Competencia Relativa)",
              questionText: `¿Qué tribunal es naturalmente competente según la ley procesal para conocer de la acción indemnizatoria y de la solicitud prejudicial de ${partyA.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `Un Juzgado de Letras en lo Civil de ${loc.city}, pues la acción para exigir resarcimiento de perjuicios por inejecución de obra se reputa mueble (Arts. 580 y 581 CC) y rige la regla del domicilio del demandado (Art. 138 COT).` },
                { id: "b", text: `El Juzgado de Letras de ${loc.comm}, por ser el lugar exclusivo de ubicación física de las cabañas construidas.` },
                { id: "c", text: `Cualquier tribunal de la República a libre elección del actor, por tratarse de materias de orden público absoluto.` },
                { id: "d", text: "La Corte de Apelaciones respectiva en única instancia de pleno derecho." },
                { id: "e", text: "Un tribunal arbitral forzoso designado por el Conservador de Bienes Raíces." }
              ],
              explanation: "El Art. 580 del Código Civil dispone que los derechos y acciones se reputan muebles o inmuebles según lo sea la cosa en que han de ejercerse o que se debe; y el Art. 581 CC previene expresamente que 'los hechos que se deben se reputan muebles', de modo que la acción para que se resarzan perjuicios por la inejecución o cumplimiento imperfecto de una obra es mueble. A su turno, el Art. 138 del COT establece que respecto de las acciones que se reputan muebles, a falta de estipulación de las partes, es competente el juez del domicilio del demandado. Se refutan los distractores: (b) el lugar de construcción de las cabañas es irrelevante porque no se deduce acción real sobre el inmueble sino acción personal de cobro de dinero; (c) la competencia territorial en acciones civiles no es de libre elección caprichosa del demandante. Conclusión: La acción indemnizatoria por inejecución o vicios de construcción es personal y mueble (Arts. 580 y 581 CC), quedando radicada la competencia en el tribunal del domicilio del deudor conforme al Art. 138 del COT.",
              pauta: "Distinguir acción real sobre inmueble de acción personal indemnizatoria que la ley califica como mueble (Art. 581 CC), aplicando el fuero general del domicilio del demandado (Art. 138 COT).",
              errorFatalDeGrado: "Confundir la acción personal indemnizatoria con una acción real inmueble, declarando erróneamente competente al juez de ubicación del predio en contravención a los Arts. 581 CC y 138 COT.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas determinan la naturaleza de la acción y el tribunal competente?", outstanding: "Cita con precisión los Arts. 580 y 581 del CC en relación con el Art. 138 del Código Orgánico de Tribunales.", sufficient: "Identifica la regla del domicilio del demandado del Art. 138 COT.", basic: "Menciona las reglas generales de competencia.", insufficient: "Sostiene que manda el lugar del inmueble sin distinguir la acción." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hechos fácticos determinan la competencia?", outstanding: "Identifica que se demanda indemnización de perjuicios en dinero por defectos de obra y que el demandado está domiciliado en la ciudad del tribunal.", sufficient: "Menciona el domicilio del demandado y el cobro de dinero.", basic: "Alude a las cabañas en el predio.", insufficient: "Desconoce los domicilios de las partes." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué no rige el tribunal del inmueble?", outstanding: "Demuestra que no se ejercita una acción real sobre el inmueble sino una acción personal indemnizatoria; al ser el objeto la suma de dinero, la acción es mueble y se radica en el fuero general del deudor.", sufficient: "Explica que al pedir indemnización en plata la acción es mueble y rige el domicilio de la demandada.", basic: "Subsunción básica.", insufficient: "Concluye erróneamente que la competencia es inmueble." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología procesal adecuada?", outstanding: "Uso riguroso de 'acción mueble', 'factor territorio', 'domicilio del demandado' y 'fuero general'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal (Medidas Cautelares)",
              questionText: `¿Cuál es el fundamento jurídico que puede hacer valer válidamente la constructora demandada para oponerse a la medida prejudicial cautelar decretada?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `Que la medida es desproporcionada, pues grava un inmueble de ${amt.excess} para caucionar una demanda de ${amt.clp}, vulnerando la exigencia del Art. 298 inc. 1 CPC de limitarse a los bienes necesarios.` },
                { id: "b", text: "Que la medida es nula de pleno derecho por haberse decretado sin previa audiencia ni traslado a la demandada." },
                { id: "c", text: "Que las medidas precautorias solo proceden en juicios sumarios y jamás en juicios ordinarios de mayor cuantía." },
                { id: "d", text: "Que la prohibición de celebrar actos y contratos solo recae sobre bienes corporales muebles." },
                { id: "e", text: "Que el actor no acompañó boleta de fianza por el 100% de la tasación fiscal." }
              ],
              explanation: "El Art. 298 inc. 1 del CPC indica categóricamente que las medidas precautorias 'se limitarán a los bienes necesarios para responder por los resultados del juicio'. En el caso planteado, la deuda reclamada por perjuicios asciende a ${amt.clp}, mientras que la cautelar se trabó sobre un bien de ${amt.excess}, excediendo con creces el monto necesario para asegurar las resultas. Se refutan los distractores: (b) el Art. 289 CPC autoriza expresamente a conceder medidas prejudiciales sin oír previamente a la contraparte en casos graves y urgentes; (c) las medidas precautorias son de aplicación general a todo juicio declarativo ordinario conforme a las disposiciones comunes a todo procedimiento. Conclusión: Las medidas precautorias deben limitarse estrictamente a los bienes necesarios para responder por los resultados del juicio (Art. 298 CPC), procediendo la oposición o sustitución por desproporción manifiesta.",
              pauta: "Aplicar el principio de proporcionalidad y adecuación cautelar del Art. 298 CPC contrastando la cuantía de la pretensión con el avalúo del bien gravado.",
              errorFatalDeGrado: "Sostener que el actor tiene derecho a solicitar medidas precautorias sobre la totalidad del patrimonio del deudor sin sujeción al límite de bienes necesarios fijado por el Art. 298 CPC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué norma exige la proporcionalidad de las precautorias?", outstanding: "Cita el Art. 298 inc. 1 CPC y descarta con el Art. 289 CPC la necesidad de audiencia previa.", sufficient: "Identifica el Art. 298 CPC sobre limitación a bienes necesarios.", basic: "Menciona genéricamente el CPC.", insufficient: "Cita normas equivocadas." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué cifras demuestran el exceso cautelar?", outstanding: "Contrasta con precisión la suma demandada versus el valor del bien gravado, constatando el exceso patrimonial.", sufficient: "Compara el monto de la deuda con el valor del terreno embargado.", basic: "Alude solo a que el bien es caro.", insufficient: "No utiliza los valores del caso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué procede la oposición o sustitución?", outstanding: "Razona que el principio de proporcionalidad cautelar prohíbe el gravamen excesivo e injustificado del patrimonio del demandado, habilitando la oposición por desproporción manifiesta para alzarla o limitar su alcance.", sufficient: "Explica que la medida es abusiva al trabar un bien que vale casi el doble de la deuda.", basic: "Subsunción superficial.", insufficient: "Sostiene que la medida es nula por falta de audiencia previa." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal cautelar adecuado?", outstanding: "Uso de 'proporcionalidad cautelar', 'fumus boni iuris', 'periculum in mora' y 'adecuación de la medida'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Procesal Orgánico (Mandato Judicial)",
              questionText: `Tras el fallecimiento imprevisto del actor ${partyA.name}, ¿podrá el ${attorney.name} asistir a la audiencia de prueba para representar válidamente sus derechos?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, porque por expresa disposición del Art. 529 del COT el mandato judicial constituido a favor de los abogados no termina por la muerte del mandante." },
                { id: "b", text: "No, porque el mandato civil se extingue indefectiblemente por la muerte del mandante según el Art. 2163 N° 5 CC sin admitir excepción alguna." },
                { id: "c", text: "Sí, pero exclusivamente bajo la figura provisional de la agencia oficiosa del Art. 6 inc. 3 CPC." },
                { id: "d", text: "No, el juicio queda suspendido de pleno derecho y debe esperarse que los herederos confieran nuevo poder notarial." },
                { id: "e", text: "Solo si el juez titular autoriza verbalmente la comparecencia mediante fianza de ratificación." }
              ],
              explanation: "Si bien el mandato civil general se extingue por la muerte del mandante conforme al Art. 2163 N° 5 del Código Civil, el mandato judicial presenta una regla especial y de orden público consagrada en el Art. 529 del Código Orgánico de Tribunales: 'El mandato constituido a favor de los abogados no termina por la muerte del mandante'. Por tanto, el abogado conserva su plena capacidad de postulación para comparecer a la audiencia de prueba y ejecutar todos los actos procesales ordinarios del juicio. Se refutan los distractores: (b) el Art. 2163 N° 5 CC cede ante la norma especial orgánica del Art. 529 COT; (c) la agencia oficiosa procesal del Art. 6 CPC opera para quien no tiene poder constituido y no para quien detenta mandato judicial vigente. Conclusión: Por regla especial y de orden público procesal orgánico, el mandato judicial conferido a abogados no termina por la muerte del mandante (Art. 529 COT).",
              pauta: "Fundamentar la primacía de la ley orgánica especial (Art. 529 COT) sobre la regla común de terminación del mandato civil del Art. 2163 N° 5 CC para asegurar la continuidad de la defensa en juicio.",
              errorFatalDeGrado: "Sostener que el patrocinio y poder judicial del abogado se extinguen con el fallecimiento del cliente, paralizando el proceso por aplicación del Código Civil con olvido del Art. 529 del COT.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué norma consagra la subsistencia del mandato judicial?", outstanding: "Cita con exactitud el Art. 529 del COT y explica cómo hace excepción al Art. 2163 N° 5 del Código Civil.", sufficient: "Identifica la norma especial del COT que mantiene vivo el poder del abogado.", basic: "Menciona el Código Civil general.", insufficient: "Afirma que el poder murió con el mandante." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho procesal concurre?", outstanding: "Identifica que el abogado contaba con patrocinio y poder judicial formalmente constituido previo a la muerte del actor.", sufficient: "Menciona que el actor le había dado poder legal a su abogado.", basic: "Alude a la muerte del demandante.", insufficient: "Confunde mandato judicial con agencia oficiosa." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué prima la regla orgánica sobre la civil?", outstanding: "Aplica el principio de especialidad normativa (Arts. 4 y 13 CC), demostrando que la necesidad de no paralizar intempestivamente los litigios justifica la perpetuación legal del mandato judicial en favor de los letrados.", sufficient: "Explica que la ley protege el juicio para que no se detenga ante la muerte del cliente.", basic: "Subsunción incompleta.", insufficient: "Concluye que el juicio es nulo si el cliente falleció." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Lenguaje procesal riguroso?", outstanding: "Uso impecable de 'postulación procesal', 'principio de especialidad', 'ius postulandi' y 'mandato ad litem'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje no técnico." }
              }
            },
            {
              id: `q-ia-${timestamp}-4`,
              number: 4,
              area: "Derecho Procesal Orgánico (Reglas de Competencia)",
              questionText: `¿Qué efecto procesal produjo la concesión de la medida prejudicial precautoria ante el ${loc.court} respecto de la competencia para conocer de la demanda posterior?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: `Radicó de forma definitiva e inmodificable el conocimiento del juicio ordinario en dicho tribunal, conforme a las reglas de los Arts. 109 y 178 del Código Orgánico de Tribunales.` },
                { id: "b", text: "Ningún efecto, pues la demanda principal debe ser distribuida nuevamente por turno o sorteo ante la Corte de Apelaciones." },
                { id: "c", text: "Extinguió la competencia de los tribunales ordinarios forzando a someter el pleito a arbitraje de derecho." },
                { id: "d", text: "Prorrogó la competencia hacia los tribunales del lugar donde se ubican materialmente las cabañas construidas." },
                { id: "e", text: "Inhabilitó al juez que decretó la prejudicial para conocer del pleito de fondo por haber emitido opinión." }
              ],
              explanation: "El Art. 178 del Código Orgánico de Tribunales prescribe expresamente que no se someterán al turno ni sorteo de distribución de causas el ejercicio de acciones que tengan su origen en gestiones prejudiciales, debiendo entablarse la demanda ante el juez que conoció de las mismas. Esto consagra el principio de radicación del Art. 109 COT, en cuya virtud radicado con arreglo a la ley el conocimiento de un negocio ante un juez, no se alterará esta competencia por causa sobreviniente. Se refutan los distractores: (b) el Art. 178 COT exceptúa explícitamente de distribución a la demanda tras una prejudicial; (e) decretar una cautelar legalmente solicitada no constituye prejuzgamiento ni inhabilita al magistrado. Conclusión: La tramitación de la medida prejudicial precautoria radica la competencia del juicio definitivo en el tribunal que la conoció (Arts. 109 y 178 COT), tornando improcedente un nuevo turno o distribución.",
              pauta: "Explicar el efecto de radicación que produce la gestión prejudicial previa en virtud de los Arts. 109 y 178 del COT, garantizando la continuidad del conocimiento ante el mismo tribunal.",
              errorFatalDeGrado: "Sostener que tras haberse concedido una medida prejudicial precautoria, la demanda ordinaria posterior debe distribuirse a sorteo a un tribunal distinto, desconociendo el Art. 178 del COT.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la radicación tras prejudicial?", outstanding: "Cita con precisión los Arts. 109 y 178 del COT y explica la radicación como regla general de competencia.", sufficient: "Identifica la regla de radicación del Art. 109 COT.", basic: "Menciona que el tribunal sigue conociendo.", insufficient: "Desconoce el efecto de radicación." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hito procesal activó la radicación?", outstanding: "Identifica la solicitud y otorgamiento de la medida prejudicial precautoria ante el juzgado civil respectivo.", sufficient: "Menciona la presentación prejudicial previa.", basic: "Alude al juicio en trámite.", insufficient: "No vincula la cautelar con la demanda." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué no procede nueva distribución?", outstanding: "Demuestra que por disposición expresa del Art. 178 COT las demandas nacidas de actos prejudiciales quedan exentas de distribución, vinculándose funcionalmente al mismo juez de origen.", sufficient: "Explica que la ley manda presentar la demanda ante el mismo juez que dio la precautoria.", basic: "Subsunción superficial.", insufficient: "Afirma que debe sortearse de nuevo el juicio." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Uso de categorías orgánicas procesales?", outstanding: "Uso riguroso de 'regla de radicación', 'competencia funcional', 'gestión prejudicial' y 'turno o distribución'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO MEDIDAS CAUTELARES, COMPETENCIA Y MANDATO:\n\n` +
            `1. Factor Territorial de Competencia: La acción ejercida por ${partyA.name} persigue indemnización de perjuicios en dinero por defectos de construcción. De acuerdo con los Arts. 580 y 581 del Código Civil, los derechos y acciones sobre hechos que se deben se reputan muebles. Tratándose de acciones personales muebles, el tribunal naturalmente competente según el Art. 138 del COT es el del domicilio del demandado (${loc.city}), y no el del lugar donde se construyeron físicamente las cabañas.\n\n` +
            `2. Proporcionalidad Cautelar: La medida prejudicial de prohibición de celebrar actos y contratos decretada sobre un bien de ${amt.excess} resulta abiertamente desproporcionada para asegurar un crédito de ${amt.clp}. El Art. 298 inc. 1 del CPC consagra el principio de limitación a los bienes estrictamente necesarios, facultando a ${partyB.name} para oponerse al gravamen o solicitar su reducción o sustitución.\n\n` +
            `3. Radicación: Por aplicación de los Arts. 109 y 178 del COT, la interposición y concesión de la prejudicial radicó de pleno derecho la competencia en el ${loc.court}, impidiendo la redistribución de la demanda ordinaria.\n\n` +
            `4. Ultraactividad del Mandato Judicial: Frente a la muerte imprevista del demandante, rige la excepción de orden público del Art. 529 del COT, en cuya virtud el mandato judicial constituido en favor del ${attorney.name} no termina por el fallecimiento del mandante, conservando el letrado plenas facultades para comparecer a la audiencia de prueba.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 4: CLÁUSULA PENAL ENORME Y JUICIO EJECUTIVO (PLANTILLA_CASO.md)
      {
        id: "clausula_penal_ejecutivo",
        subjects: ["civil", "procesal"],
        targetInsts: ["civ_clausula_penal_enorme", "proc_juicio_ejecutivo_excepciones", "civ_resolucion_1489"],
        linkedFuentes: { file: "LAS OBLIGACIONES.md", section: "Teoría General de las Obligaciones", rules: "Arts. 1535, 1537, 1544 CC, Art. 464 N° 7 CPC" },
        linkedTopics: [
          { id: "civil-lasobligac-1-6", code: "1.6", title: "El Incumplimiento Contractual y Responsabilidad" },
          { id: "civil-lasobligac-1-7", code: "1.7", title: "Factores de Imputabilidad, Mora, Cláusula Penal y Perjuicios" },
          { id: "procesal-procesal-2-5", code: "2.5", title: "Teoría General de los Incidentes y Juicio Ejecutivo" }
        ],
        dogmaticPrinciples: "La cláusula penal enorme en obligaciones dinerarias no puede exceder el duplo de la obligación principal (Art. 1544 CC), siendo su sanción la reducción legal al tope conmutativo y no la nulidad.",
        build: () => {
          const title = `Caso Práctico: Incumplimiento de Obra Material y Reducción de Cláusula Penal Enorme (${partyB.name} c/ ${partyA.name})`;
          const facts = `En enero de 2024, ${partyA.name} celebró un contrato de confección de obra material con ${partyB.name} para la edificación de un centro logístico comercial en ${loc.city}, por un precio total alzado de ${amt.baseContract}. En el contrato se pactó una cláusula penal moratoria en los siguientes términos: 'Por cada día de retardo injustificado en la entrega de la obra, el contratista pagará una pena de ${amt.penaltyDaily} a título de avaluación anticipada de perjuicios'.\n\n` +
            `La obra debía entregarse el 30 de junio de 2024. Sin embargo, debido a dificultades operativas imputables al contratista, la entrega se verificó con 60 días de retraso. ${partyB.name} dedujo demanda ejecutiva ante el ${loc.court}, cobrando la suma de ${amt.totalPenalty} exclusivamente por concepto de pena moratoria devengada, superando con creces el valor íntegro de la obra contratada.\n\n` +
            `${partyA.name} concurre a su estudio jurídico solicitando representación legal para enervar la ejecución o rebajar el monto exorbitante cobrado.`;

          const breakdown = {
            principales: [
              `Contrato conmutativo de confección de obra con monto determinado (${amt.baseContract}).`,
              `Estipulación de pena moratoria diaria de ${amt.penaltyDaily} por retraso.`,
              `Entrega verificada con 60 días de retraso imputable.`,
              `Demanda ejecutiva cobrando ${amt.totalPenalty} a título de pena, superando el duplo de la obligación principal.`
            ],
            secundarios: [
              "Causas de suministro que motivaron el retardo.",
              "Lugar de edificación del centro logístico."
            ],
            distractores: [
              "La pretensión de alegar la nulidad absoluta de la cláusula penal por objeto ilícito (error fatal de grado: la sanción dogmática del Art. 1544 CC no es la nulidad sino la reducción judicial al límite legal).",
              "La invocación absoluta del pacta sunt servanda (Art. 1545 CC) frente a normas de orden público protectoras contra la usura."
            ],
            partes: {
              principales: `${partyB.name} (Acreedor demandante ejecutivo) y ${partyA.name} (Contratista deudor ejecutado).`,
              secundarias: `Juez titular del ${loc.court} y Receptor judicial.`
            },
            instituciones: [
              "Cláusula Penal Enorme y Reducción al Duplo (Arts. 1535 y 1544 CC)",
              "Límites a la Autonomía de la Voluntad y Orden Público Económico",
              "Excepciones en Juicio Ejecutivo (Art. 464 N° 7 del CPC)",
              "Fuerza Obligatoria atenuada de los Contratos (Arts. 1544 y 1545 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Obligaciones y Cláusula Penal)",
              questionText: `¿Qué institución civil puede oponer el ejecutado ${partyA.name} para controvertir el monto exorbitante cobrado por concepto de pena?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "La reducción de la cláusula penal enorme al duplo de la obligación principal (Art. 1544 CC), por ser una norma de orden público que limita la desproporción lesiva." },
                { id: "b", text: "La nulidad absoluta de todo el contrato por adolecer de objeto ilícito usuario de pleno derecho." },
                { id: "c", text: "La rescisión por vicio de fuerza moral irresistible conforme al Art. 1456 del Código Civil." },
                { id: "d", text: "Ninguna, porque en virtud del Art. 1545 CC el contrato es ley intocable y el juez carece de facultades moderadoras." },
                { id: "e", text: "La compensación judicial con el impuesto al valor agregado fiscal." }
              ],
              explanation: "El Código Civil chileno regula la institución de la cláusula penal enorme en el Art. 1544. Tratándose de contratos bilaterales conmutativos en que una de las partes se obliga a pagar una cantidad determinada, la pena no puede exceder del duplo de la obligación principal. El exceso sobre dicho tope adolece de ineficacia relativa, autorizando al deudor para pedir su reducción judicial hasta el límite legal máximo permitido. No acarrea la nulidad de la cláusula sino su rebaja forzosa. Se refutan los distractores: (b) la sanción legal no es la nulidad absoluta sino la reducción conmutativa al límite legal; (d) el principio del Art. 1545 CC cede ante normas imperativas de orden público como el Art. 1544 CC. Conclusión: En las obligaciones de cantidad determinada, la cláusula penal no puede exceder el duplo de la obligación principal, reduciéndose judicialmente al exceso conforme al Art. 1544 del Código Civil.",
              pauta: "Citar el límite imperativo de orden público económico del Art. 1544 CC que modera la autonomía contractual e impide el enriquecimiento sin causa del acreedor.",
              errorFatalDeGrado: "Afirmar que los tribunales carecen de facultades para reducir la cláusula penal desproporcionada por aplicación ciega del Art. 1545 CC, ignorando la regla expresa del Art. 1544 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué artículo regula la reducción de la pena?", outstanding: "Cita con precisión el Art. 1544 inc. 1 CC y explica el límite del duplo de la obligación principal.", sufficient: "Identifica la figura de la cláusula penal enorme del Art. 1544 CC.", basic: "Menciona genéricamente la cláusula penal.", insufficient: "Afirma que la cláusula es nula absolutamente." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué cifras configuran la pena enorme?", outstanding: "Contrasta el monto total de la obra con los montos cobrados a título de pena por retraso.", sufficient: "Compara el valor de la obra con el monto cobrado de multa.", basic: "Alude solo a los días de retraso.", insufficient: "Desconoce los montos del caso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cuál es el efecto jurídico del exceso?", outstanding: "Demuestra que la sanción legal no es la nulidad absoluta del pacto sino su reducción judicial al límite del duplo, ponderando la tensión entre autonomía contractual y orden público económico.", sufficient: "Explica que el juez debe rebajar la pena al máximo legal y no anular el contrato.", basic: "Subsunción básica.", insufficient: "Sostiene que la pena debe pagarse íntegra por pacta sunt servanda." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso exacto de 'cláusula penal enorme', 'reducción al duplo', 'avaluación convencional' e 'ineficacia parcial'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal (Juicio Ejecutivo)",
              questionText: `¿A través de qué excepción del Art. 464 del Código de Procedimiento Civil debe encauzarse la defensa de ${partyA.name} en el juicio ejecutivo?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Mediante la excepción del Art. 464 N° 7 del CPC (falta de fuerza ejecutiva del título respecto del exceso por sobre el límite legal del Art. 1544 CC)." },
                { id: "b", text: "Mediante la excepción de incompetencia absoluta por cuantía (Art. 464 N° 1 CPC)." },
                { id: "c", text: "A través de la excepción de falsedad material del título ejecutivo (Art. 464 N° 6 CPC)." },
                { id: "d", text: "Por la vía de una querella de amparo posesorio civil." },
                { id: "e", text: "Mediante recurso de queja disciplinario directo ante la Corte Suprema." }
              ],
              explanation: "En el juicio ejecutivo rige el principio de taxatividad de las excepciones del Art. 464 del CPC. Frente al cobro de una cláusula penal que excede el límite del Art. 1544 CC, el título carece de liquidez y fuerza ejecutiva por la porción que sobrepasa el máximo legalmente exigible. Dicha defensa se canaliza técnicamente bajo la excepción del Art. 464 N° 7 del CPC: 'La falta de cualquiera de los requisitos establecidos por las leyes para que dicho título tenga fuerza ejecutiva, sea absolutamente, sea con relación al ejecutado'. Se refutan los distractores: (b) no hay incompetencia del juez civil que despachó ejecución en su jurisdicción; (c) la falsedad material del N° 6 atañe a la adulteración física de la escritura y no a la desproporción sustantiva de la obligación. Conclusión: En el juicio ejecutivo, el ejecutado debe oponer la excepción de falta de fuerza ejecutiva del Art. 464 N° 7 del CPC respecto del exceso cobrado que infringe el límite del Art. 1544 del Código Civil.",
              pauta: "Identificar la excepción del Art. 464 N° 7 CPC como el cauce adjetivo exclusivo para cuestionar la liquidez y exigibilidad del monto ejecutado que excede el máximo permitido por la ley.",
              errorFatalDeGrado: "Pretender deducir demanda reconvencional dentro de un juicio ejecutivo, contraviniendo la estructura sumaria del juicio de apremio que prohíbe la reconvención.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué excepción del catálogo taxativo corresponde?", outstanding: "Cita el Art. 464 N° 7 del CPC y explica la noción de falta de fuerza ejecutiva por iliquidez o exceso legal.", sufficient: "Identifica la excepción del N° 7 del Art. 464 CPC.", basic: "Menciona genéricamente el juicio ejecutivo.", insufficient: "Cita excepciones impertinentes." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué defecto presenta el libelo ejecutivo?", outstanding: "Identifica que la demanda ejecutiva despacha mandamiento por una suma que desborda el límite vinculante de orden público.", sufficient: "Menciona que se cobran más millones de los que la ley permite.", basic: "Alude al cobro de la pena.", insufficient: "Desconoce el mecanismo de defensa." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo opera la excepción frente al exceso?", outstanding: "Explica que la excepción del Art. 464 N° 7 permite controvertir la eficacia del título respecto de la porción excesiva sin desconocer la obligación principal adeudada hasta el tope legal.", sufficient: "Razona que el demandado puede pedir que se declare que el título no permite cobrar el exceso.", basic: "Subsunción superficial.", insufficient: "Afirma que debe pedirse el sobreseimiento penal." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal ejecutivo pulcro?", outstanding: "Uso riguroso de 'fuerza ejecutiva', 'título ejecutivo imperfecto', 'excepción perentoria' y 'mandamiento de ejecución'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Teoría General del Contrato)",
              questionText: "¿Por qué la doctrina civil chilena califica la reducción de la cláusula penal enorme como una limitación de orden público a la autonomía de la voluntad?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Porque busca evitar la usura y el enriquecimiento sin causa del acreedor, prohibiendo estipulaciones lesivas que desborden los topes imperativos que la ley fija." },
                { id: "b", text: "Porque priva a las personas jurídicas del derecho de contratar válidamente en Chile." },
                { id: "c", text: "Porque transforma las obligaciones mercantiles en contratos administrativos del Estado." },
                { id: "d", text: "Porque la ley presume de derecho que todo deudor moroso es incapaz relativo." },
                { id: "e", text: "Porque deroga las facultades jurisdiccionales de los tribunales civiles de instancia." }
              ],
              explanation: "El principio de autonomía privada (Art. 1545 CC) no es absoluto y encuentra fronteras infranqueables en las leyes prohibitivas y el orden público económico. La cláusula penal tiene por objeto avaluar anticipadamente los perjuicios, no convertirse en una herramienta de expoliación o enriquecimiento indebido. Por ello, el Art. 1544 CC tiene naturaleza imperativa y de orden público: las partes no pueden renunciar anticipadamente a solicitar la reducción de la pena exorbitante. Se refutan los distractores: (b) no priva de capacidad de goce ni ejercicio a las partes; (c) la moderación judicial civil no convierte el negocio en derecho administrativo. Conclusión: El Art. 1544 del Código Civil es una norma imperativa de orden público económico que prohíbe el enriquecimiento sin causa, facultando la reducción judicial de la pena aun mediando renuncia convencional en el contrato.",
              pauta: "Explicar el fundamento teleológico del orden público económico en la conmutatividad contractual frente al abuso de poder negocial del acreedor.",
              errorFatalDeGrado: "Sostener que la cláusula penal puede ser pactada por cualquier monto sin límite legal alguno, desconociendo el carácter de orden público del Art. 1544 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Por qué el Art. 1544 CC prima sobre la autonomía privada?", outstanding: "Fundamenta en el orden público económico, el Art. 1544 CC y la prohibición del enriquecimiento injustificado.", sufficient: "Identifica que la ley protege contra la usura.", basic: "Menciona el Código Civil.", insufficient: "Afirma que el contrato no puede modificarse por ningún motivo." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho demuestra la ruptura de la conmutatividad?", outstanding: "Identifica que una multa que supera el duplo de la obligación quiebra la correlación patrimonial básica del negocio.", sufficient: "Menciona la diferencia de montos desproporcionada.", basic: "Alude al contrato.", insufficient: "No utiliza los datos del caso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo se resuelve la pugna Art. 1544 vs Art. 1545?", outstanding: "Articula que el Art. 1545 CC somete la fuerza obligatoria a los límites legales del ordenamiento; el Art. 1544 CC actúa como norma correctiva de ineficacia del exceso.", sufficient: "Explica que los contratos tienen límites fijados por la ley.", basic: "Subsunción débil.", insufficient: "Confunde orden público con ilicitud penal." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Precisión técnico-jurídica?", outstanding: "Uso riguroso de 'orden público económico', 'enriquecimiento sin causa' y 'norma imperativa'.", sufficient: "Vocabulario claro.", basic: "Lenguaje impreciso.", insufficient: "Desconocimiento léxico." }
              }
            }
          ];

          const modelSolution = `MINUTA DE RESOLUCIÓN JURÍDICA INTEGRAL - EXAMEN DE GRADO\n\n` +
            `I. IDENTIFICACIÓN Y CONFIGURACIÓN DEL CASO:\n` +
            `Nos encontramos ante un contrato bilateral y conmutativo en que se pactó una cláusula penal que infringe flagrantemente el límite imperativo fijado por el Art. 1544 del Código Civil chileno.\n\n` +
            `II. PROBLEMA DE FONDO Y APLICACIÓN DEL ART. 1544 CC:\n` +
            `La ley civil prohíbe que la pena exceda el duplo de la obligación principal. El exceso de la cláusula penal deviene en ineficaz y adolece de inoponibilidad parcial por contravenir normas de orden público económico. La renuncia convencional contenida en el contrato es ineficaz de pleno derecho por importar condonación anticipada o renuncia de derechos indisponibles de protección legal.\n\n` +
            `III. ESTRATEGIA ADJETIVA EN JUICIO EJECUTIVO:\n` +
            `Demandado ejecutivamente el deudor por el monto total desproporcionado, la defensa procesal adecuada consiste en deducir oportunamente la excepción perentoria del Art. 464 N° 7 del Código de Procedimiento Civil (falta de fuerza ejecutiva del título respecto del exceso demandado), impidiendo que se despache ejecución o mandamiento de embargo por la suma exorbitante que excede el duplo legal.\n\n` +
            `IV. CONCLUSIÓN DOGMÁTICA Y FORENSE:\n` +
            `El tribunal debe acoger parcialmente la excepción del N° 7 del Art. 464 CPC, reduciendo la ejecución al límite legal del Art. 1544 CC y rechazando el cobro del exceso por enriquecimiento sin causa.`;

          return {
            title,
            facts,
            breakdown,
            modelSolution,
            questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q))
          };
        }
      },
      // ARQUETIPO 5: RESPONSABILIDAD MÉDICA, PÉRDIDA DE LA CHANCE Y SOLIDARIDAD (Examen 2023)
      {
        id: "responsabilidad_medica_chance",
        subjects: ["civil"],
        targetInsts: ["civ_resp_extracontractual", "civ_perdida_chance", "civ_cumulo_responsabilidades"],
        linkedFuentes: { file: "CLASE_9_11.md", section: "Responsabilidad Civil Extracontractual", rules: "Arts. 2314, 2317, 2320 inc. 4, 2329 CC" },
        linkedTopics: [
          { id: "civil-clase911-1-1", code: "1.1", title: "Fundamentos y Principios de la Responsabilidad Extracontractual" },
          { id: "civil-clase911-1-3", code: "1.3", title: "Requisitos Constitutivos: Culpa, Causalidad y Daño" },
          { id: "civil-clase911-1-4", code: "1.4", title: "Responsabilidad por el Hecho Ajeno y Solidaridad Pasiva" }
        ],
        dogmaticPrinciples: "La omisión diagnóstica inexcusable conculca la lex artis destruyendo la chance real y fundada de sobrevida del paciente. Constituye un daño actual y autónomo (Arts. 2314 y 2329 CC) que habilita la indemnización proporcional, respondiendo solidariamente el facultativo y la clínica privada conforme a los Arts. 2320 inc. 4 y 2317 CC.",
        build: () => {
          const title = `Caso Práctico: Responsabilidad Médica, Pérdida de la Chance y Daño Moral por Rebote (${partyA.name} c/ ${partyB.name})`;
          const facts = `El día ${dates.breach}, ${partyA.name}, de 46 años, ingresó al Servicio de Urgencia de la clínica privada ${partyB.name} en ${loc.city}, presentando dolor torácico agudo opresivo y dificultad respiratoria severa. Fue atendido por el médico de turno, quien omitió practicar un electrocardiograma de urgencia y desestimó la sospecha coronaria, diagnosticando un espasmo muscular y prescribiendo analgésicos orales con alta inmediata.\n\n` +
            `${partyA.name} regresó a su domicilio acatando la indicación profesional y 7 horas después sufrió un infarto agudo de miocardio transmural masivo. Fue reingresado de extrema urgencia a la clínica, falleciendo a las pocas horas. Informes periciales del Servicio Médico Legal y peritos cardiólogos acreditaron de forma unánime que un diagnóstico oportuno y tratamiento trombolítico dentro de las primeras dos horas habría otorgado al paciente un 75% de probabilidades estadísticas reales de sobrevida con secuelas mínimas.\n\n` +
            `La cónyuge sobreviviente y sus hijos mayores de edad dedujeron demanda de indemnización de perjuicios por responsabilidad extracontractual solidaria en contra del médico tratante y de ${partyB.name} ante el ${loc.court}, solicitando reparación del daño emergente, lucro cesante, pérdida de la chance y daño moral propio (iure propio). En su contestación, la clínica alegó que la chance es un daño conjetural no indemnizable y opuso la compensación de culpas del Art. 2330 CC, afirmando que el paciente debió haber reconsultado de inmediato ante la persistencia de los síntomas.`;

          const breakdown = {
            principales: [
              `Ingreso del paciente a urgencia de ${partyB.name} con sintomatología cardíaca aguda evidente y alta negligente.`,
              "Omisión inexcusable de exámenes protocolarios (falta de electrocardiograma) contra la lex artis ad hoc.",
              "Muerte del paciente a las pocas horas por infarto agudo al miocardio masivo.",
              "Acreditación pericial unánime de un 75% de probabilidad de sobrevida de haberse aplicado tratamiento oportuno.",
              "Demanda extracontractual solidaria de la familia invocando pérdida de chance y daño moral por rebote."
            ],
            secundarios: [
              "Prescripción de analgésicos para patología muscular.",
              `Lugar de los hechos en la clínica privada de ${loc.city}.`
            ],
            distractores: [
              "La alegación de la clínica de compensación de culpas (el paciente se limitó a acatar la indicación del facultativo tratante).",
              "La afirmación de que la pérdida de la chance constituye un daño meramente hipotético o conjetural (la doctrina y jurisprudencia unánime reconocen su autonomía y certeza)."
            ],
            partes: {
              principales: `Familiares sobrevivientes (Demandantes iure propio / víctimas por repercusión), Médico de turno y ${partyB.name} (Demandados solidarios).`,
              secundarias: `Peritos del Servicio Médico Legal y Juez del ${loc.court}.`
            },
            instituciones: [
              "Responsabilidad Extracontractual por Culpa contra la Lex Artis (Arts. 2314 y 2329 CC)",
              "Doctrina de la Pérdida de la Chance como Daño Autónomo y Cierto",
              "Responsabilidad por el Hecho de los Dependientes (Art. 2320 inc. 4 CC)",
              "Solidaridad Pasiva en Delitos y Cuasidelitos (Art. 2317 CC)",
              "Legitimación Activa por Daño Moral Propio de Víctimas por Rebote"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Responsabilidad Extracontractual y Causalidad)",
              questionText: "Frente a la omisión diagnóstica y la certeza pericial de un 75% de probabilidad de curación frustrada, ¿cómo califica la doctrina civil moderna el daño indemnizable?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Bajo la figura de la pérdida de la chance (pérdida de oportunidad), constituyendo un daño actual, autónomo y cierto consistente en la desaparición de la probabilidad de sobrevida debiendo indemnizarse de forma proporcional." },
                { id: "b", text: "Como un daño eventual e hipotético que no cumple la exigencia de certeza legal del daño civil y debe ser desestimado íntegramente." },
                { id: "c", text: "Como una hipótesis de caso fortuito de fuerza mayor médica absoluta que exonera de toda responsabilidad al equipo de salud." },
                { id: "d", text: "Como una responsabilidad objetiva del médico sin exigencia de culpa ni prueba de nexo causal en sede extracontractual." },
                { id: "e", text: "Como un enriquecimiento sin causa exclusivo de la entidad aseguradora de salud previsional." }
              ],
              explanation: "La doctrina moderna (Barros Bourie, Diez Schwerter, Pizarro Wilson) y la jurisprudencia uniforme de la Corte Suprema reconocen que la pérdida de la chance es un daño actual, autónomo y cierto en sí mismo. No se indemniza la totalidad de la vida como si la curación hubiera sido 100% segura, sino la pérdida de una oportunidad seria, real y fundada de sobrevida destruida irrevocablemente por la culpa médica, avaluándose de manera proporcional a dicha probabilidad frustrada (75%). Se refutan los distractores: (b) la chance no es un daño meramente hipotético o conjetural, pues la probabilidad de ganancia o sobrevida era estadísticamente fundada y fue suprimida por el acto culpable; (c) no concurre caso fortuito cuando medió infracción culpable y flagrante a la lex artis ad hoc. Conclusión: La pérdida de la chance constituye un daño actual, autónomo y cierto indemnizable en proporción a la probabilidad de sobrevida destruida por la infracción de la lex artis (Arts. 2314 y 2329 CC).",
              pauta: "La comisión evalúa que el postulante aplique los requisitos de certeza del daño indemnizable; que identifique la pérdida de la chance como daño autónomo y no como problema exclusivo de causalidad incierta; y fundamente su liquidación proporcional al porcentaje pericialmente acreditado.",
              errorFatalDeGrado: "Afirmar que la pérdida de la chance es un daño conjetural que no puede indemnizarse bajo ningún concepto en el derecho civil chileno, o confundirla con la indemnización íntegra del daño derivado de la muerte segura.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué doctrina reconoce la certeza del daño en la chance médica?", outstanding: "Cita los Arts. 2314 y 2329 CC, la doctrina de la pérdida de la chance y distingue la probabilidad real del daño meramente hipotético.", sufficient: "Identifica la doctrina de la pérdida de la chance médica.", basic: "Menciona genéricamente el daño.", insufficient: "Afirma que el daño es eventual y no puede indemnizarse." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué antecedentes acreditan la oportunidad perdida?", outstanding: "Identifica la omisión del ECG de urgencia y el informe pericial unánime que acreditó un 75% de probabilidad de sobrevida.", sufficient: "Menciona la falta de exámenes y el porcentaje de probabilidades de sobrevida.", basic: "Alude solo a la muerte del paciente.", insufficient: "Desconoce los antecedentes periciales." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo se formula la relación causal probabilística?", outstanding: "Articula el silogismo demostrando que la negligencia médica fue causa directa de la destrucción de la oportunidad fundada que el paciente tenía de sanar, satisfaciendo el presupuesto de certeza del daño indemnizable.", sufficient: "Explica que el médico le quitó al paciente la oportunidad real de salvarse.", basic: "Subsunción básica.", insufficient: "Sostiene que al haber muerto de infarto la culpa no influyó." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática de responsabilidad?", outstanding: "Uso riguroso de 'daño autónomo', 'certeza del daño', 'pérdida de la chance', 'lex artis ad hoc' e 'imputación objetiva'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Legitimación Activa y Daño Moral)",
              questionText: "¿Tienen la cónyuge sobreviviente y los hijos legitimación activa para demandar daño moral en sede extracontractual por el fallecimiento?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, en calidad de víctimas por repercusión o rebote, ejerciendo una acción propia (iure propio) fundada en el dolor y aflicción directa que les causa la muerte del familiar (Arts. 2314 y 2329 CC)." },
                { id: "b", text: "No, porque el daño moral es personalísimo del occiso y solo se puede reclamar válidamente transmitido por causa de muerte (iure hereditatis)." },
                { id: "c", text: "Solo si acreditan que el médico de turno fue condenado previamente en un juicio penal por homicidio culposo ejecutoriado." },
                { id: "d", text: "No, porque el Código Civil chileno prohíbe la indemnización del daño moral en sede de responsabilidad extracontractual." },
                { id: "e", text: "Únicamente si la clínica privada se encuentra formalmente declarada en liquidación concursal." }
              ],
              explanation: "En el derecho de daños chileno se distingue con total nitidez entre la acción deducida iure hereditatis (heredada de la víctima por su sufrimiento antes de morir) y la acción deducida iure propio por las víctimas por repercusión o rebote. La cónyuge y los hijos experimentan un padecimiento extrapatrimonial directo y originario (pretium doloris) como consecuencia inmediata del hecho ilícito que privó de la vida a su familiar, legitimándolos activamente al amparo del principio de reparación integral del daño (Arts. 2314 y 2329 CC). Se refutan los distractores: (b) la acción iure propio no requiere transmisión mortis causa ni posesión efectiva; (c) la responsabilidad civil extracontractual es autónoma e independiente de la persecución penal. Conclusión: La cónyuge e hijos están legitimados activamente como víctimas por repercusión para demandar el daño moral propio (iure propio) derivado de la muerte del familiar en virtud de los Arts. 2314 y 2329 del Código Civil.",
              pauta: "Se exige distinguir con precisión la acción iure propio de las víctimas por repercusión frente a la acción iure hereditatis transmitida; y fundar la legitimación en la afectación moral directa y el principio de reparación integral.",
              errorFatalDeGrado: "Sostener que el daño moral por la muerte de una persona solo puede reclamarse a título hereditario (iure hereditatis), desconociendo la acción directa e independiente que asiste a las víctimas por rebote (iure propio).",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué preceptos fundan la titularidad iure propio?", outstanding: "Cita los Arts. 2314 y 2329 CC, distinguiendo con maestría la acción iure propio de la iure hereditatis y citando el principio de reparación integral.", sufficient: "Identifica la titularidad por daño moral de los familiares cercanos.", basic: "Menciona el Código Civil en general.", insufficient: "Niega la indemnización del daño moral por rebote." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Quiénes son los demandantes y qué reclaman?", outstanding: "Identifica la condición de cónyuge e hijos mayores y el dolor moral directo derivado de la muerte intempestiva del padre y cónyuge.", sufficient: "Menciona a la esposa e hijos del paciente fallecido.", basic: "Alude genéricamente a la familia.", insufficient: "Confunde a las víctimas del hecho." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué el daño moral es propio e independiente?", outstanding: "Demuestra que el hecho ilícito lesiona directamente la integridad psíquica y afectiva de los familiares cercanos, engendrando una pretensión originaria no supeditada a la aceptación de herencia.", sufficient: "Explica que la familia sufre dolor propio e independiente.", basic: "Subsunción débil.", insufficient: "Confunde sucesión hereditaria con acción propia." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Lenguaje procesal y civil?", outstanding: "Uso de 'víctimas por repercusión o rebote', 'pretium doloris', 'legitimación activa', 'iure propio' e 'iure hereditatis'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Responsabilidad por Hecho Ajeno y Solidaridad)",
              questionText: `¿En base a qué estatuto y normas responde civilmente la clínica privada ${partyB.name} frente a la negligencia de su médico de urgencia?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Por responsabilidad por el hecho ajeno del dependiente (Art. 2320 inc. 4 CC) y falta de servicio u organización interna, existiendo solidaridad pasiva con el facultativo dependiente (Art. 2317 CC)." },
                { id: "b", text: "No responde bajo ninguna circunstancia, pues los médicos en clínicas privadas gozan de fuero de irresponsabilidad patronal absoluto." },
                { id: "c", text: "A través de una fianza comercial tácita que se liquida exclusivamente en la Tesorería General de la República." },
                { id: "d", text: "Solo si el paciente celebró previamente un contrato de mediación ante la Superintendencia de Salud." },
                { id: "e", text: "Únicamente por la vía disciplinaria del recurso de queja judicial ante la Corte de Apelaciones." }
              ],
              explanation: "Las instituciones de salud privadas responden civilmente tanto por culpa propia en la organización y supervisión del servicio médico (Art. 2314 CC) como por la responsabilidad por el hecho de sus dependientes (médicos de turno y personal de urgencia) conforme al Art. 2320 inc. 4 del Código Civil. Al concurrir un cuasidelito civil imputable al dependiente en ejercicio de sus funciones, se genera solidaridad pasiva entre la clínica y el médico en virtud de la regla general del Art. 2317 del Código Civil. Se refutan los distractores: (b) no existe fuero patronal en medicina privada; (d) la mediación prejudicial en el sector privado no altera la procedencia sustantiva de la responsabilidad extracontractual. Conclusión: La clínica privada responde como principal por los hechos culposos de sus dependientes bajo el Art. 2320 inc. 4 del Código Civil, generándose solidaridad pasiva conforme al Art. 2317 del mismo cuerpo de leyes.",
              pauta: "Se exige fundamentar la responsabilidad del establecimiento asistencial en el Art. 2320 inc. 4 CC (hecho ajeno de dependientes) y vincularla con la regla imperativa de solidaridad del Art. 2317 CC.",
              errorFatalDeGrado: "Exonerar de responsabilidad a la clínica privada argumentando que el médico actúa con total autonomía técnica y que el empleador nunca responde por actos profesionales de su personal médico.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué artículos regulan la dependencia y la solidaridad?", outstanding: "Cita con exactitud los Arts. 2320 inc. 4 y 2317 del Código Civil, explicando la responsabilidad vicaria y la culpa in eligendo e in vigilando.", sufficient: "Cita el Art. 2320 CC sobre hechos de los dependientes y el Art. 2317 CC.", basic: "Menciona el Código Civil.", insufficient: "Afirma que la clínica no responde." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿En qué contexto actuó el facultativo?", outstanding: "Identifica que el médico era facultativo de turno del Servicio de Urgencia institucional actuando en horario, recinto y subordinación funcional de la clínica.", sufficient: "Menciona que el doctor trabajaba de turno en la clínica privada.", basic: "Alude a la urgencia médica.", insufficient: "Desconoce el vínculo de servicio." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo se atribuye responsabilidad vicaria?", outstanding: "Desarrolla los presupuestos del Art. 2320 CC (relación de dependencia, ilícito en ejercicio funcional y vínculo directo), justificando que frente a la víctima ambos responden solidariamente según el Art. 2317 CC.", sufficient: "Explica que la clínica debe responder solidariamente por el personal que contrata en su urgencia.", basic: "Subsunción superficial.", insufficient: "Sostiene que la clínica está exenta de responsabilidad." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal y sustantivo?", outstanding: "Uso de 'responsabilidad vicaria', 'solidaridad pasiva', 'dependiente', 'culpa in eligendo', 'culpa in vigilando' y 'falta de organización'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-4`,
              number: 4,
              area: "Derecho Civil (Compensación de Culpas y Causalidad)",
              questionText: `¿Es jurídicamente admisible la excepción de compensación de culpas (Art. 2330 CC) opuesta por la clínica, fundada en que el paciente no reconsultó de inmediato ante la persistencia del dolor?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "No, porque el paciente se limitó a acatar las instrucciones profesionales del médico tratante que descartó patología cardíaca y ordenó reposo con analgésicos, no existiendo exposición imprudente al daño imputable a la víctima." },
                { id: "b", text: "Sí, porque el Código Civil exige que todo paciente asuma el deber de autodiagnóstico técnico frente a cualquier molestia física sobreviniente." },
                { id: "c", text: "Sí, porque la aplicación del Art. 2330 CC es automática y obligatoria en todo juicio de responsabilidad médica sin ponderación fáctica." },
                { id: "d", text: "Solo si se demuestra que el paciente era médico colegiado o perito forense en ejercicio." },
                { id: "e", text: "No, porque el Art. 2330 CC solo se aplica en accidentes de tránsito terrestre." }
              ],
              explanation: "El Art. 2330 del Código Civil dispone que la apreciación del daño está sujeta a reducción si el que lo sufrió se expuso a él imprudentemente. Para que proceda esta causal de atenuación, se requiere culpa o imprudencia efectiva de la propia víctima que opere como concausa del perjuicio. En el caso examinado, el paciente no incurrió en negligencia alguna: confió legítimamente en el diagnóstico del facultativo que descartó el infarto y le prescribió analgésicos, regresando a su hogar bajo prescripción médica. Se refutan los distractores: (b) no es exigible a un paciente lego desconfiar del facultativo ni poseer conocimientos médicos para autodiagnosticarse; (c) el Art. 2330 CC jamás opera de pleno derecho sino mediante prueba concluyente de imprudencia culpable de la víctima. Conclusión: No resulta aplicable la reducción de perjuicios del Art. 2330 del Código Civil cuando la conducta del paciente consistió en cumplir de buena fe el reposo y prescripción indicada por el médico tratante.",
              pauta: "Se exige evaluar los requisitos de la compensación de culpas del Art. 2330 CC; descartar la imprudencia de la víctima cuando su comportamiento es consecuencia directa de la confianza legítima depositada en el diagnóstico del médico tratante.",
              errorFatalDeGrado: "Acoger la compensación de culpas del Art. 2330 CC imputando negligencia al paciente por haber seguido las instrucciones de reposo dadas por el propio médico negligente que descartó la gravedad de su estado.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Cuáles son los presupuestos de la compensación de culpas?", outstanding: "Cita el Art. 2330 CC y define los presupuestos de la concausalidad culpable y exposición imprudente de la víctima al daño.", sufficient: "Identifica la norma de reducción de daños por imprudencia de la víctima del Art. 2330 CC.", basic: "Menciona genéricamente la culpa de la víctima.", insufficient: "Afirma que el paciente siempre tiene culpa." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué conducta desplegó el paciente tras la atención médica?", outstanding: "Identifica que el paciente acató el alta médica y la prescripción de analgésicos para dolor muscular impartida por el profesional de turno.", sufficient: "Menciona que el paciente siguió las instrucciones dadas por el doctor.", basic: "Alude a que el paciente volvió a su casa.", insufficient: "Desconoce los hechos de la atención médica." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué no concurre exposición imprudente al daño?", outstanding: "Demuestra que la confianza legítima en la lex artis excluye la culpa del paciente lego, imputándose la demora exclusivamente al diagnóstico erróneo del facultativo que desactivó la alarma coronaria.", sufficient: "Explica que el paciente no es culpable por haber creído lo que el doctor le dijo en la clínica.", basic: "Subsunción superficial.", insufficient: "Sostiene erróneamente que el paciente debió saber que le daría un infarto." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Rigor dogmático en el análisis de imputabilidad?", outstanding: "Uso exacto de 'exposición imprudente al daño', 'compensación de culpas', 'confianza legítima', 'estándar de diligencia' y 'concausa'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje vulgar." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO RESPONSABILIDAD MÉDICA, PÉRDIDA DE LA CHANCE Y SOLIDARIDAD:\n\n` +
            `1. Tipología y Certeza del Daño Indemnizable: En el caso sub lite, la omisión del electrocardiograma de urgencia por parte del médico de turno importó una infracción grave e inexcusable a la lex artis ad hoc. Conforme a la doctrina nacional (Barros, Pizarro, Diez Schwerter) y la jurisprudencia de la Corte Suprema, la falta de diagnóstico oportuno destruyó la probabilidad estadística fundada de sobrevida (75% acreditada pericialmente), configurando el daño autónomo y cierto de 'pérdida de la chance'. Dicho perjuicio debe ser indemnizado en proporción al porcentaje de probabilidad frustrada al amparo de los Arts. 2314 y 2329 del Código Civil.\n\n` +
            `2. Legitimación Activa por Daño Moral Propio (Iure Propio): La cónyuge e hijos mayores de edad se encuentran plenamente legitimados activamente para demandar el daño moral propio en su calidad de víctimas por repercusión o rebote (iure propio). El sufrimiento y aflicción espiritual (pretium doloris) experimentado por la pérdida intempestiva del cónyuge y padre constituye un daño directo, cierto y personalísimo que emana del hecho ilícito cuasidelictual, no dependiendo de la aceptación de la herencia ni requiriéndose condena penal previa.\n\n` +
            `3. Responsabilidad Institucional y Solidaridad Pasiva: La clínica privada ${partyB.name} responde vicariamente por el hecho de su dependiente en virtud del Art. 2320 inc. 4 del Código Civil, toda vez que el facultativo actuó en horario de turno y dentro de las instalaciones del establecimiento asistencial. En mérito del Art. 2317 del mismo cuerpo legal, la clínica y el médico de turno resultan solidariamente responsables del pago íntegro de las indemnizaciones que el tribunal determine.\n\n` +
            `4. Descarte de la Compensación de Culpas (Art. 2330 CC): Debe desestimarse la excepción de reducción de perjuicios deducida por la demandada, por cuanto no existió exposición imprudente imputable a la víctima. El paciente regresó a su domicilio en cumplimiento estricto de las instrucciones y del diagnóstico de 'espasmo muscular' emitido por el propio médico negligente, operando a su favor el principio de confianza legítima frente al profesional de la salud.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 6: TRANSACCIÓN EXTRAJUDICIAL, EQUIVALENTE JURISDICCIONAL Y EXCEPCIÓN MIXTA (Taller Procesal Caso B)
      {
        id: "transaccion_equivalente_excepcion",
        subjects: ["procesal", "civil"],
        targetInsts: ["proc_transaccion_metodos", "civ_resolucion_1489", "proc_capacidad_ius_postulandi"],
        linkedFuentes: { file: "PROCESAL.md", section: "Juicio Ordinario - Excepciones", rules: "Arts. 2446, 2460 CC, Arts. 304, 309, 310 CPC" },
        linkedTopics: [
          { id: "procesal-procesal-2-3", code: "2.3", title: "Actos Procesales y Cosa Juzgada" },
          { id: "civil-clase911-2-2", code: "2.2", title: "Contratos y Equivalentes Jurisdiccionales" }
        ],
        dogmaticPrinciples: "La transacción es una autocomposición extrajudicial bilateral con concesiones recíprocas que produce el efecto sustantivo de cosa juzgada en última instancia (Arts. 2446 y 2460 CC). Procesalmente puede hacerse valer antes de la contestación como excepción dilatoria mixta (Art. 304 CPC), en la contestación como perentoria (Art. 309 CPC) o con posterioridad como excepción anómala (Art. 310 CPC).",
        build: () => {
          const title = `Caso Práctico: Transacción Extrajudicial, Efecto de Cosa Juzgada y Oportunidades Procesales (${partyA.name} c/ ${partyB.name})`;
          const facts = `${partyA.name} celebró un contrato de prestación de servicios y conferencia técnica con ${partyB.name} en ${loc.city}. Sin embargo, ${partyB.name} no compareció a prestar los servicios el día convenido. Para precaver un litigio eventual y futuro, el día ${dates.contract}, ambas partes suscribieron un contrato por instrumento privado en que acordaron poner término total al conflicto. En dicho acuerdo, ${partyB.name} se obligó a pagar el 80% de los perjuicios ocasionados y ${partyA.name} se obligó expresamente a no accionar judicialmente por el 20% restante ni por daño moral.\n\n` +
            `No obstante lo acordado, transcurridas dos semanas, ${partyA.name} estimó que el pacto había sido desfavorable para sus intereses y dedujo demanda ordinaria de indemnización de perjuicios por responsabilidad contractual ante el ${loc.court}, reclamando el 100% de los daños.\n\n` +
            `La demanda fue notificada válidamente a ${partyB.name} en un lugar de libre acceso público entregándole copia íntegra de la demanda y resolución. ${partyB.name} acude a su consulta jurídica para hacer valer el acuerdo extintivo frente a la demanda deducida.`;

          const breakdown = {
            principales: [
              `Contrato autocompositivo extrajudicial bilateral con recíprocas concesiones (pago del 80% y renuncia del 20%).`,
              `Acuerdo celebrado con la finalidad declarada de precaver un litigio futuro y eventual (contrato de transacción, Art. 2446 CC).`,
              "Demanda ordinaria posterior desconociendo la transacción y cobrando el 100% de los perjuicios.",
              "Notificación en lugar de libre acceso público y necesidad de hacer valer la transacción en el proceso."
            ],
            secundarios: [
              `Lugar de celebración y domicilio de las partes en ${loc.city}.`,
              "Materia original sobre conferencia y servicios técnicos."
            ],
            distractores: [
              "La notificación en lugar de libre acceso público (plenamente válida conforme al Art. 41 del CPC si se entrega copia íntegra).",
              "La calificación errónea del acuerdo como avenimiento judicial o desistimiento unilateral."
            ],
            partes: {
              principales: `${partyA.name} (Demandante que desconoce el acuerdo) y ${partyB.name} (Demandado transigente).`,
              secundarias: `Receptor judicial y Juez del ${loc.court}.`
            },
            instituciones: [
              "Contrato de Transacción y Concesiones Recíprocas (Arts. 2446 y 2460 CC)",
              "Equivalente Jurisdiccional y Eficacia de Cosa Juzgada",
              "Excepciones Mixtas y Anómalas en el Juicio Ordinario (Arts. 304, 309 y 310 CPC)",
              "Validez de la Notificación en Lugares de Libre Acceso (Art. 41 CPC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Procesal (Métodos de Solución de Conflictos)",
              questionText: "¿Qué método de solución de conflictos constituye jurídicamente el acuerdo celebrado para precaver el litigio futuro mediante concesiones recíprocas?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Autocomposición extrajudicial y bilateral, correspondiente al contrato de transacción reglamentado en los Arts. 2446 y siguientes del Código Civil." },
                { id: "b", text: "Autocomposición judicial mediante avenimiento procesal aprobado en audiencia por el tribunal de la causa." },
                { id: "c", text: "Un mecanismo de heterocomposición arbitral forzosa de única instancia y de derecho." },
                { id: "d", text: "Un acto de autotutela privada sancionado civilmente por la ley procesal común." },
                { id: "e", text: "Un contrato unilateral de renuncia gratuita que carece de eficacia obligacional." }
              ],
              explanation: "Conforme al Art. 2446 del Código Civil: 'La transacción es un contrato en que las partes terminan extrajudicialmente un litigio pendiente, o precaven un litigio eventual'. Sus dos elementos dogmáticos copulativos son la existencia de un derecho dudoso o litigioso y la realización de sacrificios o concesiones recíprocas (en este caso, aceptar pagar el 80% y renunciar al 20%). Al haberse perfeccionado fuera del proceso judicial, clasifica como una autocomposición extrajudicial bilateral. Se refutan los distractores: (b) el avenimiento exige gestión y acta dentro de un proceso judicial pendiente; (c) la heterocomposición arbitral requiere la decisión de un tercero árbitro y no un acuerdo directo entre partes. Conclusión: El acuerdo de concesiones recíprocas para precaver un litigio futuro constituye un contrato de transacción regulado en los Arts. 2446 y siguientes del Código Civil, calificándose como autocomposición extrajudicial bilateral.",
              pauta: "La comisión evalúa que el estudiante distinga los modos de solución de controversias (autotutela, autocomposición y heterocomposición); reconozca los dos elementos de la transacción (derecho dudoso y concesiones recíprocas); y cite el Art. 2446 CC.",
              errorFatalDeGrado: "Calificar la transacción extrajudicial privada como una sentencia judicial ejecutoriada o como un avenimiento judicial, ignorando que la transacción nace de una convención extraprocesal bilateral.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué artículo define la transacción civil?", outstanding: "Cita el Art. 2446 CC y define con precisión los dos requisitos de la transacción (litigio pendiente/eventual y concesiones recíprocas).", sufficient: "Identifica que el acuerdo es una transacción civil.", basic: "Menciona genéricamente el arreglo de las partes.", insufficient: "Confunde transacción con avenimiento judicial." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hechos demuestran las concesiones recíprocas?", outstanding: "Identifica que el deudor asumió pagar el 80% y el acreedor renunció al 20% para precaver un juicio ordinario.", sufficient: "Menciona los porcentajes pactados en el acuerdo extrajudicial.", basic: "Alude al contrato firmado.", insufficient: "Desconoce los términos del acuerdo." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo se clasifica dogmáticamente este método?", outstanding: "Clasifica con exactitud el acuerdo como autocomposición extrajudicial y bilateral, distinguiéndolo de figuras judiciales como la conciliación o el avenimiento procesal.", sufficient: "Explica que es un acuerdo privado entre las partes sin intervención del juez.", basic: "Subsunción superficial.", insufficient: "Afirma que es una sentencia arbitral." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática adecuada?", outstanding: "Uso de 'autocomposición bilateral', 'concesiones recíprocas', 'precaver litigio eventual' y 'equivalente jurisdiccional'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje vulgar." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal (Oportunidades Procesales de Alegación)",
              questionText: `Frente a la demanda ordinaria deducida en su contra, ¿en qué oportunidades procesales puede ${partyB.name} alegar la transacción conforme a derecho?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Antes de la contestación como excepción dilatoria mixta (Art. 304 CPC), en la contestación como perentoria (Art. 309 CPC), o después de contestada la demanda como excepción anómala hasta antes de citación para sentencia (Art. 310 CPC)." },
                { id: "b", text: "Únicamente en el escrito de contestación de la demanda dentro del plazo fatal de emplazamiento, bajo sanción de preclusión definitiva." },
                { id: "c", text: "Solo después de dictada la sentencia definitiva mediante un recurso de aclaración o rectificación de fallo." },
                { id: "d", text: "Exclusivamente antes de contestar la demanda como excepción dilatoria simple dentro del término de emplazamiento." },
                { id: "e", text: "En cualquier momento del juicio, incluso después de citadas las partes para oír sentencia o durante la ejecución incidental." }
              ],
              explanation: "La transacción es una excepción dotada de tratamiento procesal privilegiado en el juicio ordinario de mayor cuantía: 1) Puede oponerse como excepción mixta antes de contestar la demanda para ser tramitada y resuelta como dilatoria si está fundada en antecedente escrito (Art. 304 CPC); 2) Como excepción perentoria de fondo en la contestación de la demanda (Art. 309 CPC); y 3) Como excepción anómala en cualquier estado del juicio, desde que se contestó hasta antes de la citación para oír sentencia en primera instancia o hasta la vista de la causa en segunda instancia (Art. 310 CPC). Se refutan los distractores: (b) no precluye con la contestación pues goza del régimen privilegiado del Art. 310 CPC; (e) no puede alegarse tras la citación para oír sentencia en primera instancia sin quebrantar la preclusión formal. Conclusión: La excepción de transacción puede promoverse como mixta antes de contestar (Art. 304 CPC), como perentoria en la contestación (Art. 309 CPC) o como anómala en cualquier estado del juicio hasta la citación para oír sentencia (Art. 310 CPC).",
              pauta: "Se exige detallar las tres compuertas procesales del CPC para hacer valer la transacción (Arts. 304, 309 y 310 CPC), destacando su naturaleza de excepción mixta y anómala fundada en antecedente escrito.",
              errorFatalDeGrado: "Sostener que la excepción de transacción solo puede oponerse en la contestación de la demanda so pena de caducidad, desconociendo por completo las instituciones de las excepciones mixtas (Art. 304 CPC) y anómalas (Art. 310 CPC).",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan las excepciones mixtas y anómalas?", outstanding: "Cita con precisión los Arts. 304, 309 y 310 del Código de Procedimiento Civil y explica los requisitos de cada oportunidad procesal.", sufficient: "Identifica que se puede oponer antes o después de la contestación según el CPC.", basic: "Menciona el Código de Procedimiento Civil.", insufficient: "Limita erróneamente la alegación solo a la contestación." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿De qué instrumento dispone el demandado?", outstanding: "Identifica que el demandado cuenta con el contrato de transacción por escrito suscrito entre las partes para fundar su excepción mixta del Art. 304 CPC.", sufficient: "Menciona que existe un documento escrito del acuerdo para acompañar.", basic: "Alude a la demanda notificada.", insufficient: "Desconoce los antecedentes probatorios." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo opera la excepción de transacción en las distintas etapas?", outstanding: "Detalla con claridad las tres compuertas: excepción mixta previa (Art. 304), excepción perentoria (Art. 309) y excepción anómala posterior (Art. 310), explicando sus ventajas estratégicas.", sufficient: "Explica que puede presentarse antes de contestar o durante el juicio como excepción anómala.", basic: "Subsunción básica.", insufficient: "Afirma que precluyó el derecho por no contestar de inmediato." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal exacto?", outstanding: "Uso riguroso de 'excepción mixta', 'excepción anómala', 'citación para oír sentencia', 'antecedente escrito' y 'preclusión'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil y Procesal (Eficacia Jurídica de la Transacción)",
              questionText: "Conforme al Código Civil, ¿qué efecto sustantivo y procesal produce la transacción válidamente celebrada entre las partes respecto del conflicto?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Produce el efecto de cosa juzgada en última instancia entre las partes conforme al Art. 2460 del Código Civil, extinguiendo definitivamente la acción para reclamar las materias transigidas." },
                { id: "b", text: "Produce un efecto meramente moral y orientador para el juez, quien puede desestimarlo a su libre arbitrio de equidad." },
                { id: "c", text: "No produce efecto alguno mientras no sea ratificada por una sentencia penal condenatoria ejecutoriada." },
                { id: "d", text: "Transforma la obligación civil contractual en un delito de estafa procesal de orden público." },
                { id: "e", text: "Genera la incompetencia absoluta de todos los tribunales de la República para futuros negocios." }
              ],
              explanation: "El Art. 2460 del Código Civil consagra uno de los principios axiales de la teoría general de la transacción: 'La transacción produce el efecto de cosa juzgada en última instancia'. En consecuencia, la transacción es un equivalente jurisdiccional que reviste la misma fuerza obligatoria y extintiva que una sentencia judicial firme, dotando al demandado de una defensa perentoria inexpugnable frente a cualquier intento de revivir la controversia en sede declarativa. Se refutan los distractores: (b) la transacción tiene fuerza de cosa juzgada sustancial vinculante y no es una mera sugerencia; (c) no requiere homologación judicial penal para producir sus efectos civiles. Conclusión: Conforme al Art. 2460 del Código Civil, la transacción válidamente celebrada produce el efecto de cosa juzgada en última instancia, extinguiendo definitivamente la acción deducida.",
              pauta: "Se exige enunciar la noción de equivalente jurisdiccional y fundamentar la eficacia de cosa juzgada sustancial de la transacción al tenor literal del Art. 2460 CC.",
              errorFatalDeGrado: "Sostener que un contrato privado de transacción carece de efecto de cosa juzgada hasta que un juez civil dicte una sentencia que lo homologue, contraviniendo el texto expreso del Art. 2460 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué artículo atribuye efecto de cosa juzgada a la transacción?", outstanding: "Cita con exactitud el Art. 2460 del Código Civil y define la noción dogmática de equivalente jurisdiccional.", sufficient: "Identifica que la transacción produce efecto de cosa juzgada en última instancia.", basic: "Menciona el Código Civil.", insufficient: "Niega el efecto vinculante del contrato de transacción." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Sobre qué materias recayó el acuerdo?", outstanding: "Identifica que las partes acordaron regular la totalidad de los perjuicios derivados del incumplimiento del contrato de conferencia.", sufficient: "Menciona que pactaron resolver el conflicto de la conferencia por un porcentaje.", basic: "Alude al problema contractual.", insufficient: "Desconoce el objeto transigido." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué el demandante no puede volver a demandar?", outstanding: "Razona que la eficacia de cosa juzgada en última instancia extingue la acción ordinaria nacida del contrato original, enervando de raíz la nueva pretensión indemnizatoria por haber operado la excepción de cosa juzgada.", sufficient: "Explica que al haber firmado un acuerdo con cosa juzgada el demandante ya no tiene derecho a demandar de nuevo.", basic: "Subsunción básica.", insufficient: "Afirma que el demandante puede arrepentirse libremente." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología técnica?", outstanding: "Uso de 'equivalente jurisdiccional', 'cosa juzgada en última instancia', 'excepción de cosa juzgada' y 'extinción de pretensiones'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-4`,
              number: 4,
              area: "Derecho Procesal (Recursos Procesales)",
              questionText: `Si el tribunal de primera instancia desecha la excepción de transacción promovida como dilatoria mixta (Art. 304 CPC), ¿qué recurso procesal y en qué efecto procede deducir en contra de dicha resolución?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Recurso de apelación en el solo efecto devolutivo (Arts. 187 y 194 N° 2 CPC), por tratarse de una sentencia interlocutoria de primera instancia que no pone término al juicio ni hace imposible su prosecución." },
                { id: "b", text: "Recurso de casación en el fondo directo ante la Corte Suprema por infracción de ley sustantiva." },
                { id: "c", text: "Recurso de apelación en ambos efectos (suspensivo y devolutivo) paralizando el juicio de pleno derecho." },
                { id: "d", text: "Recurso de queja disciplinario directo ante el tribunal pleno de la Corte Suprema." },
                { id: "e", text: "Ninguno, porque las resoluciones sobre excepciones dilatorias son absolutamente inapelables por mandato legal." }
              ],
              explanation: "La resolución que falla una excepción dilatoria desechándola es una sentencia interlocutoria de primera instancia de aquellas que no ponen término al juicio ni hacen imposible su prosecución (Art. 158 CPC). Conforme a la regla general del Art. 187 del CPC, es impugnable por la vía del recurso de apelación dentro del plazo de 5 días. En cuanto a sus efectos, el Art. 194 N° 2 del CPC dispone expresamente que se concede la apelación en el solo efecto devolutivo contra las resoluciones que desechen excepciones dilatorias, continuando la tramitación del pleito principal. Se refutan los distractores: (b) la casación en el fondo solo procede contra sentencias definitivas o interlocutorias que pongan término al juicio o hagan imposible su continuación; (c) la apelación en ambos efectos está excluida expresamente por el Art. 194 N° 2 CPC. Conclusión: Procede el recurso de apelación en el solo efecto devolutivo (Arts. 187 y 194 N° 2 CPC) por tratarse de una sentencia interlocutoria que desecha una excepción dilatoria sin poner término al pleito.",
              pauta: "Se evalúa la clasificación de resoluciones judiciales (Art. 158 CPC), la procedencia de la apelación (Art. 187 CPC) y la regla de concesión en el solo efecto devolutivo según el Art. 194 N° 2 CPC.",
              errorFatalDeGrado: "Sostener que la resolución que desecha una excepción dilatoria es apelable en ambos efectos, suspendiendo la tramitación del proceso en abierta contravención al Art. 194 N° 2 del CPC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la apelación de excepciones dilatorias?", outstanding: "Cita con precisión los Arts. 158, 187 y 194 N° 2 del CPC, calificando la resolución como interlocutoria.", sufficient: "Identifica el recurso de apelación y el efecto devolutivo del Art. 194 N° 2 CPC.", basic: "Menciona el recurso de apelación.", insufficient: "Afirma que es una sentencia definitiva o que procede casación." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué resolvió el juez sobre la excepción de transacción?", outstanding: "Identifica que el tribunal rechazó la excepción mixta previa, ordenando seguir adelante con la contestación de la demanda.", sufficient: "Menciona que el tribunal desestimó la excepción dilatoria opuesta.", basic: "Alude a la resolución del juez.", insufficient: "Desconoce el contenido de la resolución." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué solo se concede en efecto devolutivo?", outstanding: "Desarrolla el razonamiento demostrando que al no poner término al juicio, la ley procesal privilegia la celeridad concediendo la apelación en el solo efecto devolutivo para no paralizar el procedimiento ordinario.", sufficient: "Explica que el juicio no se detiene mientras la Corte de Apelaciones revisa la resolución.", basic: "Subsunción superficial.", insufficient: "Sostiene que se suspende el procedimiento de pleno derecho." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Lenguaje recursivo impecable?", outstanding: "Uso exacto de 'sentencia interlocutoria', 'efecto devolutivo', 'suspensión de procedimiento' y 'recurso de apelación ordinario'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje vulgar." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO TRANSACCIÓN EXTRAJUDICIAL Y EXCEPCIÓN MIXTA:\n\n` +
            `1. Naturaleza Jurídica del Acuerdo Extrajurisdiccional: El instrumento privado suscrito por las partes configura un contrato de transacción regulado en los Arts. 2446 y siguientes del Código Civil. Concurren sus dos elementos dogmáticos estructurales: la existencia de un conflicto o litigio patrimonial eventual derivado del incumplimiento en la prestación de servicios, y la realización de concesiones recíprocas expresas, consistentes en obligarse el deudor a pagar el 80% de los perjuicios y renunciar correlativamente el acreedor al 20% restante y al daño moral. Constituye, por tanto, una autocomposición extrajudicial bilateral con carácter de equivalente jurisdiccional.\n\n` +
            `2. Oportunidades Procesales para Hacer Valer la Transacción: En el juicio ordinario de mayor cuantía, la transacción goza de una triple vía procesal de alegación en favor del demandado: a) Como excepción dilatoria mixta (Art. 304 CPC) antes de contestar la demanda y dentro del término de emplazamiento, fundada en el documento escrito que la acredita; b) Como excepción perentoria en el cuerpo del escrito de contestación de la demanda (Art. 309 CPC); y c) Como excepción anómala (Art. 310 CPC) en cualquier estado del juicio con posterioridad a la contestación, hasta antes de la citación para oír sentencia en primera instancia o hasta la vista de la causa en segunda instancia.\n\n` +
            `3. Efecto Sustantivo de Cosa Juzgada: Al tenor imperativo del Art. 2460 del Código Civil, la transacción produce el efecto de cosa juzgada en última instancia. En consecuencia, la demanda ordinaria que pretende cobrar el 100% de los perjuicios desconociendo el pacto previo debe ser desestimada con costas, en virtud de la eficacia extintiva que el equivalente jurisdiccional genera sobre las pretensiones transigidas.\n\n` +
            `4. Régimen Recursivo Adjetivo: Si el tribunal desestimare la excepción de transacción deducida como dilatoria mixta, la resolución constituye una sentencia interlocutoria impugnable mediante recurso de apelación (Art. 187 CPC), el cual debe concederse en el solo efecto devolutivo por aplicación expresa del Art. 194 N° 2 del CPC, continuando la sustanciación de la causa principal.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 7: IMPARCIALIDAD JUDICIAL, PREJUZGAMIENTO Y MOMENTOS JURISDICCIONALES (Taller Procesal Caso A y C)
      {
        id: "imparcialidad_prejuzgamiento_momentos",
        subjects: ["procesal"],
        targetInsts: ["proc_imparcialidad_prejuzgamiento", "proc_momentos_jurisdiccionales", "proc_prorroga_competencia"],
        linkedFuentes: { file: "PROCESAL.md", section: "Jurisdicción y Competencia", rules: "Art. 19 N° 3 CPR, Arts. 181, 182, 187 N° 2, 196 N° 10 COT" },
        linkedTopics: [
          { id: "procesal-procesal-1-2", code: "1.2", title: "La Función Jurisdiccional: Imparcialidad y Bases Orgánicas" },
          { id: "procesal-procesal-1-3", code: "1.3", title: "Reglas Generales de Competencia y Prórroga" }
        ],
        dogmaticPrinciples: "El deber de imparcialidad del juez es manifestación esencial del debido proceso (Art. 19 N° 3 CPR); el prejuzgamiento previo da lugar a recusación (Art. 196 N° 10 COT). La incompetencia territorial relativa se sanea por prórroga tácita si el demandado hace cualquiera gestión tras apersonarse sin reclamar la incompetencia (Art. 187 N° 2 COT).",
        build: () => {
          const title = `Caso Práctico: Imparcialidad Judicial, Prórroga Tácita y Momentos Jurisdiccionales (${partyA.name} c/ ${partyB.name})`;
          const facts = `Ante el ${loc.court} se tramita un juicio ordinario de mayor cuantía seguido entre ${partyA.name} y ${partyB.name}, derivado de un contrato de suministro ejecutado en ${loc.city}.\n\n` +
            `En el contrato, las partes habían pactado una cláusula de prórroga expresa de competencia territorial que disponía: 'Cualquier controversia se someterá privativamente a los juzgados de Santiago'. No obstante, el actor dedujo su demanda en ${loc.city}. Notificada la demandada, compareció al juicio y presentó un escrito solicitando la suspensión de la causa por encontrarse su abogado en reposo médico, sin formular cuestionamiento alguno a la competencia del tribunal ni reservar derechos.\n\n` +
            `Posteriormente, durante una audiencia de exhibición de documentos y conciliación, la jueza titular manifestó a viva voz ante los apoderados: 'He examinado detenidamente los antecedentes y la posición de la parte demandada es insostenible en derecho, por lo que le aconsejo categóricamente allanarse de inmediato para evitar mayores costas'.`;

          const breakdown = {
            principales: [
              "Pacto contractual de prórroga expresa de competencia territorial a favor de Santiago.",
              `Demanda entablada ante juez de ${loc.city} donde se ejecutó la convención.`,
              "Comparecencia de la demandada realizando una gestión procesal de suspensión sin oponer la excepción de incompetencia territorial (prórroga tácita).",
              "Declaración formal de la jueza en audiencia adelantando juicio categórico de mérito de fondo en contra de la demandada."
            ],
            secundarios: [
              "Motivo de suspensión por reposo médico del letrado.",
              "Instancia de conciliación y exhibición documental."
            ],
            distractores: [
              "La estipulación previa de prórroga expresa a favor de Santiago (en negocios civiles disponibles prima la prórroga tácita posterior por apersonamiento, Art. 187 N° 2 COT).",
              "La facultad del juez de proponer bases de arreglo en conciliación (dicha facultad no autoriza a emitir juicio de fondo categórico prejuzgando la causa)."
            ],
            partes: {
              principales: `${partyA.name} (Demandante) y ${partyB.name} (Demandada).`,
              secundarias: `Jueza titular del ${loc.court} y Abogados apoderados.`
            },
            instituciones: [
              "Garantía Constitucional y Orgánica de la Imparcialidad Judicial (Art. 19 N° 3 CPR)",
              "Causal de Recusación por Prejuzgamiento o Dictamen Anticipado (Art. 196 N° 10 COT)",
              "Prórroga Tácita de la Competencia Territorial (Arts. 181, 182 y 187 N° 2 COT)",
              "Momentos de la Jurisdicción: Fase de Conocimiento vs Juzgamiento (Art. 76 CPR y Art. 1 COT)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Procesal Orgánico (Bases de la Jurisdicción)",
              questionText: "Frente a las declaraciones categóricas emitidas por la jueza en la audiencia, ¿qué garantía orgánica fue vulnerada y qué mecanismo procesal procede activar?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Fue vulnerada la Imparcialidad Judicial por prejuzgamiento formal, correspondiendo interponer un incidente de recusación conforme al Art. 196 N° 10 del COT." },
                { id: "b", text: "Fue vulnerada la Inexcusabilidad judicial, procediendo un recurso de casación en el fondo de inmediato ante la Corte Suprema." },
                { id: "c", text: "No se vulneró garantía alguna, pues los jueces tienen la obligación legal de compeler al allanamiento forzoso en audiencia de conciliación." },
                { id: "d", text: "Se vulneró el principio de Territorialidad, debiendo anularse el juicio de pleno derecho." },
                { id: "e", text: "Procede una demanda sumaria de indemnización de perjuicios contra el actuario del tribunal civil." }
              ],
              explanation: "La Imparcialidad judicial es base esencial de la jurisdicción y exigencia ineludible del debido proceso (Art. 19 N° 3 inc. 6 CPR). Si bien en la conciliación el juez puede proponer bases de arreglo sin que sus opiniones le inhabiliten para fallar (Art. 263 CPC), emitir juicios anticipados de mérito categóricos calificando la defensa de 'insostenible' y conminando al allanamiento antes de recibir la causa a prueba excede las facultades legales y destruye la neutralidad subjetiva. Dicha conducta tipifica la causal legal de recusación por manifestar dictamen sobre la cuestión pendiente (Art. 196 N° 10 COT). Se refutan los distractores: (b) la inexcusabilidad prohíbe negarse a juzgar por falta de ley pero no se refiere al dictamen anticipado; (c) el Art. 263 CPC protege las bases de arreglo pero prohíbe el prejuzgamiento coercitivo. Conclusión: Emitir dictamen categórico sobre el mérito de la causa en audiencia vulnera la imparcialidad judicial y tipifica la causal de recusación del Art. 196 N° 10 del Código Orgánico de Tribunales.",
              pauta: "Se evalúa la distinción entre proponer bases de conciliación amigable (Art. 263 CPC) y el prejuzgamiento indebido; citando la garantía del Art. 19 N° 3 CPR y la causal de recusación del Art. 196 N° 10 COT.",
              errorFatalDeGrado: "Sostener que la advertencia del juez conminando al allanamiento constituye una facultad ordinaria amparada en la conciliación que no admite cuestionamiento procesal alguno.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué norma consagra la causal de recusación por prejuzgamiento?", outstanding: "Cita con precisión el Art. 19 N° 3 CPR, el Art. 196 N° 10 del COT y deslinda las facultades de conciliación del Art. 263 CPC.", sufficient: "Identifica la base de imparcialidad y el Art. 196 N° 10 COT.", basic: "Menciona el debido proceso.", insufficient: "Confunde recusación con inexcusabilidad." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho fáctico lesionó la imparcialidad?", outstanding: "Identifica la afirmación literal de la jueza calificando de 'insostenible' la defensa y exigiendo allanarse antes de la prueba.", sufficient: "Menciona que la jueza dio su opinión categórica en la audiencia.", basic: "Alude a la audiencia del tribunal.", insufficient: "No identifica las palabras de la jueza." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué las palabras configuran prejuzgamiento?", outstanding: "Razona que calificar el mérito de fondo de una parte antes de recibir la causa a prueba excede las bases amigables y destruye la neutralidad subjetiva, tipificando el supuesto del Art. 196 N° 10 COT.", sufficient: "Explica que el juez no puede decir quién va a perder antes de dictar sentencia.", basic: "Subsunción superficial.", insufficient: "Sostiene que el actuar del juez es intachable." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal adecuado?", outstanding: "Uso riguroso de 'imparcialidad subjetiva', 'prejuzgamiento', 'motivo de recusación' y 'bases de conciliación'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal Orgánico (Competencia Relativa)",
              questionText: "Habiendo existido una cláusula contractual de prórroga expresa previa a favor de Santiago, ¿quedó válidamente prorrogada la competencia ante el tribunal donde se demandó?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, operó la prórroga tácita de la competencia territorial conforme al Art. 187 N° 2 del COT, pues la demandada realizó una gestión procesal de suspensión antes de oponer la incompetencia del juez." },
                { id: "b", text: "No, porque la prórroga expresa previa convenida por escrito en el contrato es de orden público absoluto y jamás puede alterarse." },
                { id: "c", text: "No, porque en el ordenamiento procesal civil chileno las reglas del territorio jamás admiten prórroga tácita en juicio ordinario." },
                { id: "d", text: "Sí, pero únicamente si el tribunal decreta una fianza especial de arraigo procesal para garantizar las resultas." },
                { id: "e", text: "No, la causa debió ser remitida de oficio e inmediatamente a la Corte Suprema de Justicia." }
              ],
              explanation: "La competencia territorial en negocios civiles contenciosos de primera instancia entre personas capaces es de derecho privado y admite prórroga voluntaria (Arts. 181 y 182 COT). Conforme al Art. 187 N° 2 del COT, se entiende prorrogada tácitamente la competencia por el demandado: 'Por el hecho de hacer, después de apersonado en el juicio, cualquiera gestión que no sea la de reclamar la incompetencia del juez'. La solicitud de suspensión de la causa sin deducir excepción dilatoria previa de incompetencia convalidó definitivamente la competencia territorial del juez requerido, primando la voluntad procesal tácita coetánea por sobre la prórroga expresa previa del contrato. Se refutan los distractores: (b) el fuero territorial es renunciable y disponible por las partes capaces; (c) la prórroga tácita está plenamente consagrada en los Arts. 186 y 187 COT. Conclusión: Conforme al Art. 187 N° 2 del COT, la comparecencia de la demandada realizando una gestión distinta de reclamar la incompetencia opera la prórroga tácita de la competencia territorial, prevaleciendo sobre estipulaciones contractuales anteriores.",
              pauta: "Se evalúan los presupuestos de disponibilidad de la competencia territorial en materias civiles contenciosas (Arts. 181-182 COT) y la configuración de la prórroga tácita por apersonamiento del Art. 187 N° 2 COT.",
              errorFatalDeGrado: "Afirmar que las reglas de competencia relativa por factor territorio son de orden público irrenunciable y que no admiten prórroga voluntaria de las partes en negocios civiles contenciosos.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué norma consagra la prórroga tácita del demandado?", outstanding: "Cita con precisión los Arts. 181, 182 y 187 N° 2 del Código Orgánico de Tribunales, distinguiendo la competencia absoluta de la relativa.", sufficient: "Identifica el Art. 187 COT sobre prórroga tácita.", basic: "Menciona el COT en general.", insufficient: "Afirma que el territorio es indelegable de orden público." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho concreto configuró la prórroga?", outstanding: "Identifica la presentación del escrito de suspensión por reposo médico del abogado sin formular reclamo de incompetencia territorial.", sufficient: "Menciona que la empresa demandada compareció pidiendo suspensión sin alegar incompetencia.", basic: "Alude a la notificación de la demanda.", insufficient: "Desconoce los hechos del proceso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué prima la prórroga tácita sobre la expresa previa?", outstanding: "Explica que la voluntad procesal contemporánea de las partes en el litigio deroga la convención previa de territorio, radicando válidamente la causa ante el tribunal requerido.", sufficient: "Razona que el actuar de la demandada en el juicio fijó definitivamente el tribunal.", basic: "Subsunción débil.", insufficient: "Concluye erróneamente que la cláusula del contrato no puede modificarse en el juicio." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Lenguaje procesal exacto?", outstanding: "Uso de 'competencia relativa', 'disponibilidad del territorio', 'prórroga tácita', 'apersonamiento' y 'radicación'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Procesal Orgánico (Momentos de la Jurisdicción)",
              questionText: "Al celebrarse la audiencia de exhibición de documentos y conciliación previa a la prueba, ¿en qué momento de la jurisdicción se encuentra el proceso?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "En la fase de conocimiento (notio), que comprende toda la etapa de discusión, conciliación y recepción o examen de las alegaciones y probanzas de las partes (Art. 76 CPR y Art. 1 COT)." },
                { id: "b", text: "En el momento de juzgamiento formal (iudicium) con efecto de cosa juzgada sustancial ejecutoriada." },
                { id: "c", text: "En la fase de imperio o ejecución coactiva forzada (executio) de la sentencia de fondo." },
                { id: "d", text: "En el estadio de inavocabilidad administrativa previa de única instancia." },
                { id: "e", text: "En la fase de casación extraordinaria de única instancia ante el tribunal superior." }
              ],
              explanation: "La jurisdicción se desenvuelve a través de tres momentos fundamentales consagrados en el Art. 76 de la Constitución y Art. 1 del Código Orgánico de Tribunales: conocimiento (notio), juzgamiento (iudicium) y ejecución (executio). La fase de conocimiento comprende la interposición de pretensiones, contestación, la audiencia obligatoria de conciliación (Art. 262 CPC) y la rendición de prueba. El juzgamiento se inicia formalmente con la citación para oír sentencia (Art. 432 CPC), y la ejecución tras la ejecutoriedad del fallo. Se refutan los distractores: (b) el juzgamiento formal se produce con la deliberación y dictación de la sentencia; (c) la ejecución presupone un título ejecutivo o sentencia de condena firme inexistente en la etapa de conciliación. Conclusión: La audiencia de exhibición y conciliación integra la fase de conocimiento (notio) de la jurisdicción conforme al Art. 76 de la CPR y Art. 1 del COT.",
              pauta: "Se evalúa el dominio de las fases del ejercicio jurisdiccional (notio, iudicium, executio) al amparo del Art. 76 CPR y Art. 1 COT, situando correctamente los trámites de discusión y prueba en la fase de conocer.",
              errorFatalDeGrado: "Confundir la etapa de conciliación y discusión probatoria con la fase de juzgamiento o ejecución forzada, desconociendo los tres momentos clásicos de la jurisdicción.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué preceptos consagran los momentos de la jurisdicción?", outstanding: "Cita el Art. 76 CPR y Art. 1 COT, identificando los tres momentos clásicos (notio, iudicium, executio) y sus hitos procesales.", sufficient: "Identifica la fase de conocimiento en la ley procesal orgánica.", basic: "Menciona los momentos en general.", insufficient: "Cita normas impertinentes." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿En qué trámite específico se encuentra la causa?", outstanding: "Identifica la audiencia de conciliación y exhibición documental previa a la recepción de la causa a prueba y sentencia.", sufficient: "Menciona que se celebró la audiencia de conciliación.", basic: "Alude al juicio ordinario.", insufficient: "Desconoce la etapa del proceso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué la conciliación integra el momento de conocer?", outstanding: "Explica que mientras no se cite a las partes para oír sentencia, el tribunal continúa en el estadio de conocer los hechos litigiosos y pretensiones, no habiendo ingresado al juzgamiento ni a la ejecución forzada.", sufficient: "Razona que el juez aún está reuniendo antecedentes y conociendo el asunto.", basic: "Subsunción básica.", insufficient: "Afirma que la conciliación es parte de la ejecución." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Lenguaje procesal orgánico?", outstanding: "Uso riguroso de 'momentos de la jurisdicción', 'notio', 'fase de conocimiento', 'citación para sentencia' e 'imperio judicial'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje vulgar." }
              }
            },
            {
              id: `q-ia-${timestamp}-4`,
              number: 4,
              area: "Derecho Procesal Orgánico (Tramitación de la Recusación)",
              questionText: `¿Ante qué tribunal y en qué oportunidad debe interponerse formalmente el incidente de recusación en contra de la jueza civil (Art. 113 CPC y Art. 114 COT)?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Debe interponerse ante el propio tribunal de la jueza inhabilitada antes de hacer cualquier gestión que importe entrar en el fondo del negocio, debiendo el tribunal superior (Corte de Apelaciones respectiva) conocer y fallar el incidente (Arts. 114 COT y 113 CPC)." },
                { id: "b", text: "Debe deducirse directamente ante el Ministerio de Justicia y Derechos Humanos dentro de las 48 horas siguientes a la audiencia." },
                { id: "c", text: "Únicamente en el recurso de casación en el fondo que se deduzca contra la sentencia definitiva que ponga término al juicio." },
                { id: "d", text: "Ante un juez árbitro arbitrador designado de común acuerdo por las partes en la misma audiencia." },
                { id: "e", text: "Directamente ante la Corte Suprema en única instancia y sin ulterior recurso." }
              ],
              explanation: "El régimen procesal de las recusaciones de jueces letrados se encuentra estructurado en el Código Orgánico de Tribunales y en el Código de Procedimiento Civil: 1) Conforme al Art. 113 del CPC, la recusación debe promoverse antes de hacer cualquier gestión que no tenga por objeto reclamar la inhabilidad, o dentro de quinto día desde que se tuvo conocimiento del hecho en que se funda; 2) Según el Art. 114 del COT y Art. 119 del CPC, la solicitud se presenta ante el tribunal cuya inhabilidad se reclama y debe remitirse de inmediato a la Corte de Apelaciones respectiva, que es el tribunal competente para conocer y fallar el incidente de recusación de un juez de letras. Se refutan los distractores: (b) el Ministerio de Justicia carece de jurisdicción disciplinaria o judicial; (c) no puede reservarse la causal de recusación conocida para alegarla sorpresivamente en casación si no se reclamó oportunamente el vicio formal. Conclusión: El incidente de recusación debe presentarse ante el tribunal del juez recusado antes de gestionar en el fondo, correspondiendo a la Corte de Apelaciones respectiva conocer y fallar el incidente (Arts. 114 COT y 113 CPC).",
              pauta: "Se exige identificar el tribunal competente para conocer la recusación de un juez de letras (la Corte de Apelaciones respectiva conforme al Art. 114 COT) y la oportunidad preclusiva del Art. 113 CPC.",
              errorFatalDeGrado: "Sostener que la recusación de un juez de letras civil es conocida y fallada por el mismo juez inhabilitado sin intervención de la Corte de Apelaciones, o que puede interponerse libremente al término del juicio.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la competencia para conocer de la recusación?", outstanding: "Cita con exactitud el Art. 114 del COT (competencia de la Corte de Apelaciones) y el Art. 113 del CPC sobre oportunidad preclusiva de alegación.", sufficient: "Identifica que la Corte de Apelaciones conoce la recusación del juez de letras.", basic: "Menciona las reglas de recusación.", insufficient: "Afirma que resuelve el mismo juez recusado." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Cuándo se conoció la causal de recusación?", outstanding: "Identifica que la causal se originó en la audiencia pública de conciliación requiriendo ser alegada antes de efectuar cualquier nueva gestión en el proceso.", sufficient: "Menciona que la causal surgió en la audiencia frente a las partes.", basic: "Alude a lo dicho por la jueza.", insufficient: "Desconoce cuándo se produjo la causal." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué precluye si no se alega de inmediato?", outstanding: "Razona que el legislador impone cargas perentorias para evitar la litigación de mala fe con inhabilidades sobrevenidas, exigiendo promover el incidente antes de ingresar al fondo para suspender o radicar el pleito ante el subrogante legal.", sufficient: "Explica que la parte debe reclamar la inhabilidad de inmediato y no seguir tramitando como si nada.", basic: "Subsunción superficial.", insufficient: "Sostiene que puede guardarse la causal para cuando salga la sentencia." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal orgánico?", outstanding: "Uso exacto de 'tribunal que conoce del incidente', 'Corte de Apelaciones', 'preclusión por apersonamiento', 'incompetencia accidental' y 'subrogación legal'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO IMPARCIALIDAD JUDICIAL, PRÓRROGA TÁCITA Y RECUSACIÓN:\n\n` +
            `1. Prórroga Tácita de la Competencia Territorial: En materia civil contenciosa entre personas capaces rige el principio de disponibilidad del fuero territorial (Arts. 181 y 182 COT). Habiéndose apersonado la parte demandada en el juicio sustanciado en ${loc.city} para solicitar la suspensión por motivos médicos de su letrado, sin formular la excepción dilatoria previa de incompetencia del Art. 303 N° 1 del CPC, operó la prórroga tácita de la competencia territorial consagrada en el Art. 187 N° 2 del COT, derogando tácitamente la cláusula de prórroga expresa previa a favor de Santiago.\n\n` +
            `2. Vulneración a la Imparcialidad y Configuración de Recusación: La actuación de la jueza titular al calificar la defensa de 'insostenible' y conminar al allanamiento antes de recibir la causa a prueba quebranta la garantía constitucional y orgánica de la imparcialidad del juzgador (Art. 19 N° 3 inc. 6 CPR). Si bien el Art. 263 del CPC ampara las proposiciones de conciliación amigable, emitir un dictamen conclusivo de mérito sobre el fondo destruye la neutralidad del tribunal y tipifica de manera flagrante la causal de recusación del Art. 196 N° 10 del COT ('haber manifestado dictamen sobre la cuestión pendiente').\n\n` +
            `3. Calificación del Momento Jurisdiccional: Las gestiones de discusión, exhibición de documentos y audiencia de conciliación integran con claridad la fase de conocimiento (notio) de la jurisdicción (Art. 76 CPR y Art. 1 COT). El proceso no ha ingresado al juzgamiento (iudicium), el cual solo comienza formalmente con la citación para oír sentencia (Art. 432 CPC), ni a la etapa de ejecución forzada (executio).\n\n` +
            `4. Tramitación Adjetiva del Incidente: La recusación debe ser presentada por escrito ante el tribunal del juez recusado antes de hacer cualquiera gestión sobre el fondo del negocio (Art. 113 CPC), debiendo elevarse de inmediato los antecedentes ante la Corte de Apelaciones respectiva, órgano jurisdiccional al que corresponde privativamente conocer y fallar el incidente de recusación de los jueces letrados conforme al Art. 114 del COT.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 8: RESOLUCIÓN CONTRACTUAL, MORA PURGA LA MORA Y PACTO COMISORIO CALIFICADO
      {
        id: "resolucion_pacto_comisorio",
        subjects: ["civil"],
        targetInsts: ["civ_resolucion_1489", "civ_excepcion_1552", "civ_pacto_comisorio_calificado", "civ_culpa_mora_deudor"],
        linkedFuentes: { file: "LAS OBLIGACIONES.md", section: "Efectos del Incumplimiento Sinalagmático", rules: "Arts. 1489, 1552, 1877, 1879 CC" },
        linkedTopics: [
          { id: "civil-lasobligac-1-6", code: "1.6", title: "Incumplimiento Contractual y Condición Resolutoria" },
          { id: "civil-clase911-4-4", code: "4.4", title: "Pacto Comisorio Calificado en la Compraventa" }
        ],
        dogmaticPrinciples: "En contratos bilaterales, la mora de una de las partes purga la mora de la contraparte (Art. 1552 CC). El pacto comisorio calificado en la compraventa por no pago del precio exige demanda y concede 24 horas para enervar (Art. 1879 CC).",
        build: () => {
          const title = `Caso Práctico: Compraventa Comercial, Pacto Comisorio Calificado y Excepción de Contrato No Cumplido (${partyA.name} c/ ${partyB.name})`;
          const facts = `Con fecha ${dates.contract}, ${partyA.name} vendió a ${partyB.name} maquinaria industrial de alta tecnología para faenas mineras en ${loc.city} por un valor de ${amt.clp}. En la escritura de compraventa se incluyó un pacto comisorio calificado con la siguiente redacción literal: 'Si el comprador no pagare el saldo del precio en el plazo estipulado, el contrato se resolverá ipso facto en el acto de pleno derecho sin necesidad de declaración judicial alguna'.\n\n` +
            `Al momento de la entrega de la maquinaria, ${partyB.name} constató que los equipos carecían de los certificados técnicos de calibración e inspección internacional comprometidos en las especificaciones técnicas del contrato, impidiendo su puesta en marcha segura. Por esta razón, ${partyB.name} retuvo el pago de la última cuota pendiente de ${amt.partial}.\n\n` +
            `${partyA.name} demandó la resolución del contrato ante el ${loc.court}, sosteniendo que por el pacto comisorio calificado la compraventa quedó resuelta de pleno derecho al vencer el plazo. Notificada judicialmente de la demanda el día ${dates.lawsuit}, ${partyB.name} consignó en la cuenta corriente del tribunal la totalidad de la cuota insoluta dentro de las 20 horas subsiguientes y opuso la excepción de contrato no cumplido (Art. 1552 CC).`;

          const breakdown = {
            principales: [
              "Contrato de compraventa con pacto comisorio calificado por no pago del precio.",
              "Entrega de maquinaria sin certificaciones técnicas convenidas indispensables para su operación.",
              "Retención justificada del pago de la cuota final por el comprador frente al defecto técnico.",
              "Consignación íntegra del precio dentro de las 24 horas siguientes a la notificación judicial de la demanda resolutoria."
            ],
            secundarios: [
              `Valor total de la maquinaria (${amt.clp}) y cuota retenida (${amt.partial}).`,
              `Lugar de entrega en ${loc.city}.`
            ],
            distractores: [
              "La redacción 'se resolverá ipso facto de pleno derecho' (en la compraventa por no pago del precio el Art. 1879 CC otorga siempre un plazo de 24 horas tras la notificación para hacer subsistir el contrato).",
              "La mora del comprador (la falta de entrega de las certificaciones técnicas pone al vendedor en mora previa, purgando la del adquirente según el Art. 1552 CC)."
            ],
            partes: {
              principales: `${partyA.name} (Vendedor demandante resolutorio) y ${partyB.name} (Comprador que consigna y opone exceptio).`,
              secundarias: `Juez titular del ${loc.court} y Receptor judicial.`
            },
            instituciones: [
              "Pacto Comisorio Calificado en la Compraventa por no pago del precio (Arts. 1877 y 1879 CC)",
              "Plazo de 24 horas subsiguientes a la notificación judicial para enervar la resolución",
              "Excepción de Contrato No Cumplido y Mora Recíproca (Art. 1552 CC)",
              "Condición Resolutoria Tácita vs Ordinaria vs Pacto Comisorio (Arts. 1489 y 1878 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Obligaciones y Pacto Comisorio)",
              questionText: `¿Operó de pleno derecho la resolución inmediata del contrato de compraventa al vencer el plazo de pago, en virtud del pacto comisorio calificado estipulado?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "No, porque por mandato imperativo del Art. 1879 del Código Civil, en la compraventa por no pago del precio el comprador puede hacer subsistir el contrato pagando dentro de las 24 horas subsiguientes a la notificación judicial de la demanda." },
                { id: "b", text: "Sí, porque la autonomía de la voluntad del Art. 1545 CC prevalece sobre cualquier norma legal supletoria o dispositiva de forma absoluta." },
                { id: "c", text: "Sí, pero únicamente si el tribunal decreta una medida prejudicial precautoria de secuestro judicial de los bienes." },
                { id: "d", text: "No, porque los pactos comisorios calificados adolecen de nulidad absoluta en todo contrato de compraventa civil." },
                { id: "e", text: "Sí, pero se requiere que la resolución sea ratificada por escritura pública ante el Notario autorizante del contrato." }
              ],
              explanation: "El pacto comisorio calificado en el contrato de compraventa por no pago del precio se encuentra expresamente regulado en el Art. 1879 del Código Civil. Dicho precepto establece que si bien se estipule que por no pagarse el precio se resolverá ipso facto el contrato, el comprador podrá, sin embargo, hacerlo subsistir, pagando el precio, lo más tarde, en las veinticuatro horas subsiguientes a la notificación judicial de la demanda. Por tanto, no opera de pleno derecho al mero vencimiento, requiriendo demanda judicial notificada y concesión del plazo de gracia legal. Se refutan los distractores: (b) la autonomía de la voluntad cede ante normas de orden público protectoras del deudor como el Art. 1879 CC; (d) el pacto comisorio calificado es plenamente válido y legal en el Código Civil chileno. Conclusión: En la compraventa por no pago del precio, el pacto comisorio calificado no resuelve ipso iure el contrato, concediendo la ley al comprador el derecho a enervar la resolución pagando dentro de las 24 horas siguientes a la notificación judicial de la demanda (Art. 1879 CC).",
              pauta: "Se exige citar el Art. 1879 CC y explicar que la cláusula resolutoria de pleno derecho en la compraventa por no pago del precio está sujeta a la interposición de demanda judicial y al plazo fatal de 24 horas para enervar.",
              errorFatalDeGrado: "Afirmar que en la compraventa por no pago del precio el pacto comisorio calificado opera de pleno derecho al vencimiento del plazo sin requerir notificación judicial ni otorgar plazo de enervación, desconociendo el Art. 1879 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué artículo regula el plazo de enervación en la compraventa?", outstanding: "Cita con precisión el Art. 1879 CC y distingue el pacto comisorio calificado en la compraventa respecto de otros contratos.", sufficient: "Identifica el plazo de 24 horas del Art. 1879 CC.", basic: "Menciona el pacto comisorio general.", insufficient: "Afirma que resuelve de pleno derecho de forma irrevocable." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿En qué plazo consignó el demandado?", outstanding: "Identifica que el comprador depositó el saldo insoluto en la cuenta corriente del tribunal dentro de las 20 horas de notificado, antes de expirar el plazo de 24 horas.", sufficient: "Menciona que pagó antes de que pasaran las 24 horas de la notificación.", basic: "Alude a que el demandado pagó el dinero.", insufficient: "Desconoce los plazos del caso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cuál es el efecto jurídico del pago en 24 horas?", outstanding: "Demuestra que la consignación oportuna enerva definitivamente la pretensión resolutoria, extinguiendo la obligación de pago y haciendo subsistir plenamente la compraventa por mandato legal.", sufficient: "Explica que al pagar dentro de las 24 horas el contrato no se resuelve.", basic: "Subsunción básica.", insufficient: "Sostiene erróneamente que el vendedor puede rechazar el pago." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso exacto de 'pacto comisorio calificado', 'plazo de enervación del Art. 1879', 'resolución ipso facto' y 'consignación judicial'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Remedios Contractuales)",
              questionText: `¿Es jurídicamente admisible la excepción de contrato no cumplido (Art. 1552 CC) formulada por ${partyB.name} frente a la demanda resolutoria de ${partyA.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, porque la obligación de entrega del vendedor abarca no solo el traspaso material sino la conformidad con las especificaciones técnicas estipuladas, por lo que su incumplimiento previo purga la mora del comprador (Art. 1552 CC)." },
                { id: "b", text: "No, porque en los pactos comisorios calificados queda absolutamente prohibido por ley oponer cualquier excepción de fondo." },
                { id: "c", text: "No, porque la falta de certificados técnicos es un hecho accesorio irrelevante que no autoriza a retener pago alguno." },
                { id: "d", text: "Solo si el comprador acredita haber iniciado una querella criminal por estafa mercantil previa." },
                { id: "e", text: "No, porque el Art. 1552 CC fue derogado tácitamente por la Ley de Protección al Consumidor." }
              ],
              explanation: "En los contratos bilaterales las obligaciones son interdependientes (sinalagma funcional). El Art. 1828 del Código Civil dispone que el vendedor debe entregar lo que reza el contrato. Al entregar maquinaria industrial carente de los certificados técnicos de calibración expresamente pactados, el vendedor incumplió una especificación sustancial requerida para el funcionamiento seguro de los bienes. Conforme al Art. 1552 CC, ninguno de los contratantes está en mora dejando de cumplir lo pactado, mientras el otro no lo cumple por su parte. Se refutan los distractores: (b) el pacto comisorio no priva al demandado de sus excepciones sustantivas de fondo; (c) la falta de certificación técnica indispensable hace que la cosa no sea apta para su destino comercial pactado. Conclusión: La falta de entrega conforme a las especificaciones técnicas acordadas coloca al vendedor en mora, autorizando la suspensión legítima del pago del precio en virtud del Art. 1552 del Código Civil.",
              pauta: "Se exige vincular la obligación de entrega íntegra del Art. 1828 CC con el principio de mora recíproca del Art. 1552 CC, descartando que el comprador esté en mora culpable.",
              errorFatalDeGrado: "Sostener que la falta de certificados técnicos esenciales no constituye incumplimiento contractual del vendedor, o que el pacto comisorio impide oponer excepciones de fondo.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué preceptos regulan la correlatividad sinalagmática?", outstanding: "Cita el Art. 1552 CC en relación con los Arts. 1824 y 1828 CC sobre la integridad y conformidad de la entrega vendida.", sufficient: "Identifica la regla de 'la mora purga la mora' del Art. 1552 CC.", basic: "Menciona el Código Civil.", insufficient: "Niega la aplicación del Art. 1552 CC." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho material configura el incumplimiento del vendedor?", outstanding: "Identifica la omisión de los certificados de calibración e inspección técnica convenidos para la maquinaria minera.", sufficient: "Menciona que la maquinaria no venía con los papeles técnicos requeridos.", basic: "Alude a que los equipos fallaron.", insufficient: "Desconoce los defectos de la entrega." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué se justifica la retención del precio?", outstanding: "Razona que la excepción del Art. 1552 CC es un mecanismo de tutela preventiva que autoriza la suspensión legítima de la propia prestación mientras la contraparte no sanee su incumplimiento correlativo.", sufficient: "Explica que el comprador no está en mora si el vendedor no le entregó todo lo pactado.", basic: "Subsunción superficial.", insufficient: "Sostiene que el comprador está en mora inexcusable." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática de obligaciones?", outstanding: "Uso de 'sinalagma funcional', 'exceptio non adimpleti contractus', 'mora purga la mora' e 'integridad del pago'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Clasificación de Condiciones Resolutorias)",
              questionText: "¿En qué se diferencia sustancialmente la condición resolutoria tácita (Art. 1489 CC) del pacto comisorio calificado en la compraventa por no pago del precio (Art. 1879 CC)?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "En la condición resolutoria tácita el deudor puede enervar la acción pagando durante todo el juicio hasta antes de la citación para oír sentencia (Art. 310 CPC), mientras que en el pacto comisorio calificado del Art. 1879 CC solo puede enervar dentro del plazo fatal de 24 horas tras la notificación de la demanda." },
                { id: "b", text: "En que la condición tácita exige escritura pública y el pacto comisorio es un acuerdo verbal meramente testimonial." },
                { id: "c", text: "En que el pacto comisorio calificado jamás requiere intervención de un tribunal de justicia ordinario." },
                { id: "d", text: "En que la condición del Art. 1489 CC solo opera en contratos unilaterales y el pacto comisorio en bilaterales." },
                { id: "e", text: "No existe diferencia alguna, ambas instituciones son absolutamente idénticas en tramitación, plazos y efectos." }
              ],
              explanation: "En la condición resolutoria tácita del Art. 1489 CC, la resolución se declara judicialmente en la sentencia definitiva y el demandado puede enervar válidamente la acción pagando en cualquier momento antes de la citación para oír sentencia en primera instancia o hasta la vista de la causa en segunda instancia (Art. 310 CPC). En cambio, en el pacto comisorio calificado de la compraventa por no pago del precio, el legislador restringió drásticamente la posibilidad de pago al plazo fatal y perentorio de 24 horas subsiguientes a la notificación judicial (Art. 1879 CC). Se refutan los distractores: (b) la condición resolutoria tácita va envuelta por la ley en todo contrato bilateral sin solemnidad especial; (c) el pacto comisorio del Art. 1879 CC requiere necesariamente demanda judicial notificada para abrir el plazo de 24 horas. Conclusión: Mientras que en la condición resolutoria tácita del Art. 1489 CC el deudor puede enervar pagando hasta la citación para oír sentencia (Art. 310 CPC), en el pacto comisorio del Art. 1879 CC la enervación está restringida al plazo fatal de 24 horas tras la notificación.",
              pauta: "Se evalúa la distinción dogmática entre la CRT y el pacto comisorio calificado en cuanto a la oportunidad preclusiva de pago para enervar la resolución judicial.",
              errorFatalDeGrado: "Afirmar que en el pacto comisorio calificado del Art. 1879 CC el comprador puede enervar la acción pagando en cualquier momento del juicio hasta antes de la sentencia, desconociendo el plazo perentorio de 24 horas.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué artículos sustentan la distinción de plazos?", outstanding: "Compara el Art. 1489 CC y Art. 310 CPC (excepción anómala de pago) frente al régimen especial del Art. 1879 CC.", sufficient: "Identifica la diferencia en el plazo para pagar entre ambas figuras.", basic: "Menciona el Código Civil.", insufficient: "Afirma que operan de forma idéntica." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Cómo impacta la cláusula en la posición de las partes?", outstanding: "Identifica que al haber pactado cláusula comisoria calificada, el comprador estaba forzado a consignar dentro de las 24 horas y no en el término ordinario.", sufficient: "Menciona la regla de las 24 horas.", basic: "Alude al contrato.", insufficient: "Desconoce los plazos." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué el legislador restringe el plazo en el Art. 1879?", outstanding: "Explica que el pacto comisorio calificado agrava la posición del deudor contractual en virtud de la estipulación expresa de las partes, reduciendo el término amplio de pago ordinario al lapso legal de gracia de 24 horas.", sufficient: "Razona que el pacto comisorio apura el plazo para pagar a solo 24 horas.", basic: "Subsunción elemental.", insufficient: "Confunde ambas instituciones." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Precisión técnico-jurídica?", outstanding: "Uso de 'condición resolutoria tácita', 'pacto comisorio calificado', 'enervación de la acción', 'plazo perentorio' y 'anomalía procesal'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje vulgar." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO PACTO COMISORIO CALIFICADO Y RESOLUCIÓN:\n\n` +
            `1. Eficacia del Pacto Comisorio Calificado en la Compraventa: El pacto comisorio calificado por no pago del precio en el contrato de compraventa está regido imperativamente por el Art. 1879 del Código Civil. Aunque las partes estipulen que la resolución operará 'ipso facto' o de pleno derecho, dicha cláusula no extingue automáticamente el vínculo al mero vencimiento, sino que exige la interposición y notificación judicial de la demanda resolutoria, otorgando al comprador el derecho legal de hacer subsistir el contrato pagando dentro de las 24 horas subsiguientes a dicha notificación.\n\n` +
            `2. Consignación Oportuna y Enervación: Constatado en autos que ${partyB.name} consignó en la cuenta corriente del ${loc.court} el saldo insoluto de ${amt.partial} a las 20 horas de notificada la demanda, la acción resolutoria quedó formalmente enervada de pleno derecho. El pago extinguió la obligación correlativa y obligó al tribunal a declarar subsistente la convención con costas a cargo del acreedor demandante.\n\n` +
            `3. Procedencia de la Excepción del Art. 1552 CC: La retención previa del precio por el comprador se encontraba dogmáticamente justificada al amparo de la excepción de contrato no cumplido (Art. 1552 CC). El vendedor incumplió la obligación sustantiva de entrega conforme al Art. 1828 CC al omitir los certificados técnicos de calibración indispensables para la faena minera convenida, de suerte que su propia mora purgaba la del comprador, impidiendo calificar a este último como deudor culpable moroso.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 9: NULIDAD ABSOLUTA POR CAUSA ILÍCITA, SIMULACIÓN Y TERCEROS POSEEDORES
      {
        id: "nulidad_absoluta_simulacion",
        subjects: ["civil"],
        targetInsts: ["civ_nulidad_absoluta", "civ_ratificacion_saneamiento_4anos", "civ_reivindicatoria"],
        linkedFuentes: { file: "ACTO JURIDICO.md", section: "Requisitos de Validez y Sanciones de Ineficacia", rules: "Arts. 1467, 1682, 1683, 1689 CC" },
        linkedTopics: [
          { id: "civil-actojuridi-1-5", code: "1.5", title: "Objeto Lícito y Causa Lícita" },
          { id: "civil-actojuridi-1-6", code: "1.6", title: "Ineficacias del Acto Jurídico (Nulidad Absoluta)" }
        ],
        dogmaticPrinciples: "La nulidad absoluta protege el orden público; puede ser alegada por todo el que tenga interés actual en ella (Art. 1683 CC). Declarada judicialmente, da acción reivindicatoria contra terceros poseedores de buena o mala fe (Art. 1689 CC).",
        build: () => {
          const title = `Caso Práctico: Simulación Negocial, Nulidad Absoluta por Causa Ilícita y Efectos frente a Terceros (${partyA.name} c/ ${partyB.name})`;
          const facts = `En conocimiento de inminentes embargos y demandas ejecutivas por parte de acreedores bancarios, ${partyA.name} otorgó escritura pública de compraventa en ${loc.city}, mediante la cual transfirió a su amigo de confianza ${partyB.name} el dominio de un inmueble comercial avaluado en ${amt.excess}, fijando como precio simulado la suma irrisoria de $15.000.000, declarando falsamente haberlo recibido al contado con anterioridad.\n\n` +
            `Días después de inscribir en el Conservador de Bienes Raíces, ${partyB.name} vendió y transfirió materialmente el mismo inmueble a ${thirdParty.name}, quien pagó el precio de mercado corriente (${amt.clp}) desconociendo completamente las deudas del primer vendedor y el fraude urdido.\n\n` +
            `Los acreedores de ${partyA.name} descubrieron la maniobra defraudatoria e interpusieron demanda ordinaria de simulación ilícita y nulidad absoluta por causa ilícita ante el ${loc.court}, solicitando que declarada la nulidad, se ordene la restitución del inmueble directamente contra la tercera poseedora ${thirdParty.name}.`;

          const breakdown = {
            principales: [
              "Venta ostensiblemente simulada de inmueble con causa ilícita (fraude a los acreedores).",
              "Enajenación posterior a título oneroso a una tercera adquirente de buena fe que inscribe el predio.",
              "Demanda de simulación y nulidad absoluta ejercida por acreedores que ostentan interés pecuniario actual.",
              "Acción reivindicatoria dirigida contra la tercera poseedora tras la eventual sentencia de nulidad."
            ],
            secundarios: [
              "Relación de amistad entre los contratantes simulados.",
              "Diferencia abismal entre el precio declarado ($15M) y el valor real del inmueble."
            ],
            distractores: [
              "La alegación de que la nulidad se sanea en 4 años (la causal es nulidad absoluta por causa ilícita, saneable únicamente en 10 años, Art. 1683 CC).",
              "La protección del tercero de buena fe (en la nulidad civil judicialmente declarada, el Art. 1689 CC da acción reivindicatoria contra terceros sin distinguir si están de buena o mala fe, a diferencia de la resolución de los Arts. 1490 y 1491 CC)."
            ],
            partes: {
              principales: `Acreedores demandantes (con interés pecuniario), ${partyA.name} (Deudor simulado), ${partyB.name} (Adquirente simulado) y ${thirdParty.name} (Tercera poseedora de buena fe).`,
              secundarias: `Juez del ${loc.court}, Notario y Conservador de Bienes Raíces.`
            },
            instituciones: [
              "Causa Ilícita y Nulidad Absoluta (Arts. 1467, 1681 y 1682 CC)",
              "Legitimación Activa del Art. 1683 CC: todo el que tenga interés pecuniario actual",
              "Plazo de Saneamiento de la Nulidad Absoluta (10 años, no admite ratificación)",
              "Efectos de la Nulidad contra Terceros Poseedores (Art. 1689 CC vs Arts. 1490-1491 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Acto Jurídico y Nulidad)",
              questionText: "¿Tienen los acreedores de una de las partes legitimación activa para demandar la nulidad absoluta de la compraventa simulada?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, porque el Art. 1683 del Código Civil faculta expresamente para demandar la nulidad absoluta a 'todo el que tenga interés en ello', bastando acreditar un interés pecuniario actual derivado del fraude a sus créditos." },
                { id: "b", text: "No, porque la acción de nulidad es de ejercicio personalísimo y solo puede deducirse por las partes firmantes del contrato impugnado." },
                { id: "c", text: "Solo si cuentan con autorización previa expedida por el Ministerio Público en causa penal ejecutoriada." },
                { id: "d", text: "No, porque los acreedores únicamente pueden ejercer la acción de liquidación concursal forzosa." },
                { id: "e", text: "Únicamente si la deuda consta en pagaré suscrito ante dos testigos presenciales y ratificado judicialmente." }
              ],
              explanation: "El Art. 1683 del Código Civil establece que la nulidad absoluta puede alegarse 'por todo el que tenga interés en ello'. La doctrina y jurisprudencia uniforme de la Corte Suprema interpretan de manera pacífica que dicho interés debe ser pecuniario y actual al momento de interponerse la demanda. Los acreedores del enajenante perjudicados por el desprendimiento ficticio de bienes tienen un interés patrimonial directo en que el bien reingrese al patrimonio del deudor para hacer efectivo su derecho de prenda general (Art. 2465 CC). Se refutan los distractores: (b) la acción de nulidad absoluta no es privativa de las partes, pues resguarda el orden público; (c) no requiere prejudicialidad penal previa para reclamar el fraude civil. Conclusión: Los acreedores perjudicados por la enajenación simulada tienen legitimación activa para demandar la nulidad absoluta conforme al Art. 1683 del Código Civil al ostentar un interés pecuniario actual en reconstituir el patrimonio del deudor.",
              pauta: "Se exige evaluar los presupuestos de la legitimación activa del Art. 1683 CC en la nulidad absoluta, caracterizando el interés como patrimonial, pecuniario y coetáneo al acto.",
              errorFatalDeGrado: "Limitar la titularidad de la acción de nulidad absoluta exclusivamente a las partes otorgantes del contrato, desconociendo que el Art. 1683 CC otorga legitimación a todo tercero con interés pecuniario actual.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Quiénes pueden demandar la nulidad absoluta?", outstanding: "Cita el Art. 1683 CC y define con precisión los presupuestos del interés (pecuniario, directo y actual).", sufficient: "Identifica que los acreedores con interés pueden demandar la nulidad.", basic: "Menciona el Código Civil.", insufficient: "Limita erróneamente la acción solo a las partes." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué interés lesiona la enajenación fingida?", outstanding: "Identifica que la venta a precio irrisorio merma el derecho de prenda general de los bancos acreedores dejándolos sin garantía patrimonial.", sufficient: "Menciona que los acreedores quedan sin cobrar sus deudas.", basic: "Alude a las deudas del deudor.", insufficient: "Desconoce los hechos del caso." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué se cumple el requisito de interés actual?", outstanding: "Articula que el interés de los acreedores nace coetáneamente al acto simulado, pues la enajenación fraudulenta provoca la insolvencia o disminuye el patrimonio ejecutable, configurando la legitimación activa del Art. 1683 CC.", sufficient: "Explica que los acreedores tienen derecho a pedir la nulidad para poder embargar la casa.", basic: "Subsunción superficial.", insufficient: "Sostiene que un tercero jamás puede entrometerse en un contrato ajeno." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso de 'legitimación activa', 'interés pecuniario actual', 'derecho de prenda general' y 'titularidad de la acción'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Civil (Efectos de la Nulidad frente a Terceros)",
              questionText: `Pronunciada judicialmente la nulidad absoluta de la compraventa simulada, ¿qué efecto produce respecto de la tercera adquirente ${thirdParty.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Da acción reivindicatoria contra la tercera poseedora conforme al Art. 1689 del Código Civil, sin distinguir si adquirió de buena o de mala fe." },
                { id: "b", text: "No produce efecto alguno, pues la buena fe registral del tercero purga y sanea automáticamente cualquier vicio anterior de pleno derecho." },
                { id: "c", text: "La sentencia de nulidad solo obliga a indemnizar perjuicios en dinero pero jamás permite recuperar materialmente el bien raíz." },
                { id: "d", text: "Produce la extinción de todos los derechos de los acreedores por haber intervenido un tercero ajeno a la simulación." },
                { id: "e", text: "Obliga a la tercera poseedora a pagar solidariamente las deudas del deudor original ante la Tesorería." }
              ],
              explanation: "El Art. 1689 del Código Civil consagra una de las diferencias más drásticas entre la nulidad y la resolución contractual: 'La nulidad judicialmente pronunciada da acción reivindicatoria contra terceros poseedores; sin perjuicio de las excepciones legales'. A diferencia de lo que ocurre en la resolución (Arts. 1490 y 1491 CC, que exigen mala fe del tercero adquirente), en materia de nulidad la ley civil protege de forma radical el principio de restablecimiento al estado anterior, procediendo la reivindicación contra el tercero aunque haya adquirido a título oneroso y de buena fe. Se refutan los distractores: (b) el sistema registral chileno no consagra la fe pública registral convalidante frente a títulos nulos absolutamente; (c) la acción real persecutoria recae directamente sobre el inmueble corporal. Conclusión: Al tenor del Art. 1689 del Código Civil, la nulidad judicialmente declarada confiere acción reivindicatoria contra terceros poseedores sin distinguir si están de buena o de mala fe.",
              pauta: "Se exige contrastar los efectos de la nulidad respecto de terceros (Art. 1689 CC, que no ampara la buena fe) con los efectos de la resolución (Arts. 1490 y 1491 CC, que sí protegen al tercer adquirente de buena fe).",
              errorFatalDeGrado: "Aplicar a la nulidad absoluta las reglas de la resolución de los Arts. 1490 y 1491 CC, sosteniendo erróneamente que la buena fe del tercero poseedor impide el ejercicio de la acción reivindicatoria del Art. 1689 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué norma regula los efectos de la nulidad contra terceros?", outstanding: "Cita con exactitud el Art. 1689 CC y lo contrasta rigurosamente con los Arts. 1490 y 1491 CC de la resolución.", sufficient: "Identifica el Art. 1689 CC sobre acción reivindicatoria contra terceros.", basic: "Menciona los efectos de la nulidad.", insufficient: "Confunde nulidad con resolución y buena fe de terceros." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿En qué situación se encuentra la tercera adquirente?", outstanding: "Identifica que la tercera adquirió a título oneroso e inscribió con desconocimiento del fraude (buena fe subjetiva).", sufficient: "Menciona que la compradora no sabía del engaño previo.", basic: "Alude a la compra del inmueble.", insufficient: "Desconoce los hechos de la transferencia." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué la buena fe no detiene la acción reivindicatoria del Art. 1689?", outstanding: "Desarrolla el silogismo demostrando que la nulidad judicial destruye retroactivamente el título del tradente (nemo plus iuris ad alium transferre potest quam ipse habet), despojándolo de la calidad de dueño y haciendo procedente la acción reivindicatoria frente a cualquier tercero poseedor.", sufficient: "Explica que la nulidad deja sin efecto todo lo obrado y permite recuperar el predio aunque el tercero sea inocente.", basic: "Subsunción básica.", insufficient: "Afirma erróneamente que la buena fe impide restituir el inmueble." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática de bienes y nulidad?", outstanding: "Uso impecable de 'eficacia retroactiva', 'acción reivindicatoria contra terceros', 'restablecimiento al estado anterior' y 'nemo plus iuris'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Saneamiento y Ratificación)",
              questionText: "¿Cuál es el plazo de saneamiento de la nulidad absoluta por causa ilícita y procede su ratificación por las partes contratantes?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Solo se sanea por el transcurso de 10 años contados desde la celebración del acto (Art. 1683 CC) y no puede sanearse por la ratificación de las partes por ser de orden público." },
                { id: "b", text: "Se sanea en el plazo breve de 4 años y puede ser ratificada por las partes mediante instrumento privado protocolizado." },
                { id: "c", text: "Prescribe en 2 años desde que los acreedores tomaron conocimiento del negocio fraudulento." },
                { id: "d", text: "No prescribe jamás, subsistiendo de forma perpetua e imprescriptible durante 100 años." },
                { id: "e", text: "Se sanea en 6 meses mediante la publicación de tres avisos en el Diario Oficial." }
              ],
              explanation: "El Art. 1683 del Código Civil dispone perentoriamente que la nulidad absoluta: 'no puede sanearse por la ratificación de las partes, ni por un lapso de tiempo que no pase de diez años'. Al tratarse de una sanción establecida en resguardo de la moral, el orden público y la ley prohibitiva, la voluntad privada es ineficaz para convalidarla o ratificarla, operando únicamente la prescripción extraordinaria decenal de diez años. Se refutan los distractores: (b) el plazo cuatrienal y la ratificación corresponden a la nulidad relativa o rescisión (Arts. 1684 y 1691 CC); (d) la acción de nulidad absoluta no es imprescriptible, saneándose a los 10 años. Conclusión: La nulidad absoluta por causa ilícita no admite ratificación de las partes y únicamente se sanea por el transcurso de 10 años conforme al Art. 1683 del Código Civil.",
              pauta: "Se exige citar el Art. 1683 CC, destacar el plazo de 10 años de saneamiento y argumentar la irratificabilidad por la naturaleza de orden público de la nulidad absoluta.",
              errorFatalDeGrado: "Sostener que la nulidad absoluta prescribe en 4 años o que puede ser saneada mediante la ratificación o confirmación voluntaria de las partes otorgantes.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿En qué plazo se sanea la nulidad absoluta según el Art. 1683 CC?", outstanding: "Cita el Art. 1683 CC señalando con exactitud el plazo de 10 años y la irrenunciabilidad por ratificación.", sufficient: "Identifica el plazo de 10 años de la nulidad absoluta.", basic: "Menciona que prescribe por el tiempo.", insufficient: "Confunde el plazo decenal con el cuatrienio de la nulidad relativa." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Cuánto tiempo ha transcurrido desde la firma?", outstanding: "Constata que la venta simulada es reciente (días o semanas) encontrándose plenamente vigente la acción sin asomo de prescripción.", sufficient: "Menciona que el contrato fue firmado hace poco tiempo.", basic: "Alude a la fecha del negocio.", insufficient: "Desconoce los plazos." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué no cabe ratificación?", outstanding: "Explica que la nulidad absoluta protege intereses superiores de la sociedad; las partes no pueden disponer de la validez del acto mediante confirmación, requiriéndose la consolidación del lapso de 10 años.", sufficient: "Razona que al ser nulidad absoluta las partes no pueden perdonar el vicio.", basic: "Subsunción superficial.", insufficient: "Afirma que las partes pueden ratificar libremente." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso de 'prescripción adquisitiva/extintiva decenal', 'orden público', 'irratificabilidad' y 'sanción legal'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO SIMULACIÓN NEGOCIAL Y NULIDAD ABSOLUTA:\n\n` +
            `1. Legitimación Activa de Terceros Acreedores: En mérito del Art. 1683 del Código Civil, la nulidad absoluta puede ser alegada por todo el que tenga interés en ello. Dicho interés debe ser de carácter pecuniario y actual. Los acreedores bancarios del enajenante ostentan legitimación activa directa para demandar la simulación ilícita y nulidad absoluta de la compraventa fraudulenta, toda vez que el traspaso simulado a precio vil merma gravemente el derecho de prenda general sobre el patrimonio de su deudor (Art. 2465 CC).\n\n` +
            `2. Efectos frente a Terceros Poseedores (Art. 1689 CC): Declarada judicialmente la nulidad absoluta del primer título por causa ilícita, el Art. 1689 del Código Civil confiere acción reivindicatoria directa contra terceros poseedores. A diferencia del régimen resolutorio de los Arts. 1490 y 1491 CC, en materia de nulidad la ley civil no protege la buena fe subjetiva del tercer adquirente ${thirdParty.name}. En virtud de la retroactividad de la nulidad y el principio 'nemo plus iuris ad alium transferre potest quam ipse habet', el tradente carecía de dominio legítimo, debiendo acogerse la restitución del bien raíz.\n\n` +
            `3. Sanción Insanable y Plazos de Prescripción: Al adolecer el contrato de causa ilícita, la sanción aplicable es la nulidad absoluta (Arts. 1467 y 1682 CC). Dicho vicio no es susceptible de saneamiento por ratificación o confirmación de las partes otorgantes y únicamente se extingue por el transcurso de la prescripción extraordinaria de diez años (Art. 1683 CC), encontrándose la acción judicial de los acreedores plenamente vigente.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 10: GARANTÍAS CONSTITUCIONALES: RECURSO DE PROTECCIÓN VS VÍA ORDINARIA CONTRACTUAL
      {
        id: "recurso_proteccion_autotutela",
        subjects: ["constitucional"],
        targetInsts: ["const_recurso_proteccion", "const_derechos_litigiosos_dudosos"],
        linkedFuentes: { file: "CONSTITUCIONAL.md", section: "Acciones Constitucionales - Recurso de Protección", rules: "Arts. 19 N° 24 y 20 CPR" },
        linkedTopics: [
          { id: "constitucional-constituci-1-2", code: "1.2", title: "Acciones Cautelares de Tutela Directa (Protección)" },
          { id: "constitucional-constituci-2-5", code: "2.5", title: "Orden Público Económico y Propiedad" }
        ],
        dogmaticPrinciples: "El recurso de protección cautela el statu quo posesorio frente a actos de autotutela o vías de hecho arbitrarias (como desalojos forzados o corte de suministros), sin resolver sobre derechos contractuales dudosos de lato conocimiento.",
        build: () => {
          const title = `Caso Práctico: Recurso de Protección, Proscripción de Autotutela y Derecho de Propiedad (${partyA.name} c/ ${partyB.name})`;
          const facts = `${partyA.name} explota un local comercial de gastronomía en un inmueble de propiedad de ${partyB.name} en ${loc.city}, en virtud de un contrato de arrendamiento a plazo fijo de tres años. Con motivo de una controversia sobre el cobro de gastos comunes y reparaciones locativas, ${partyA.name} retuvo el pago de dos meses de renta por un total de ${amt.partial}.\n\n` +
            `Frente a dicha mora, el día ${dates.breach}, ${partyB.name}, sin mediar demanda judicial ni orden de tribunal alguno, concurrió al inmueble acompañado de cerrajeros, procedió a cambiar las cerraduras de acceso, cortó el suministro eléctrico y retuvo en el interior el equipamiento de cocina, maquinaria de frío y mercadería perecible avaluada en ${amt.clp}.\n\n` +
            `${partyB.name} justificó su actuar invocando una cláusula del contrato que estipulaba: 'En caso de mora superior a 30 días, el arrendador quedará facultado para recuperar de inmediato la posesión material y retener bienes del arrendatario'. ${partyA.name} interpuso Recurso de Protección ante la Corte de Apelaciones de ${loc.city}, denunciando vulneración a su derecho de propiedad (Art. 19 N° 24 CPR) y a la proscripción de autotutela y comisiones especiales (Art. 19 N° 3 inc. 5 CPR).`;

          const breakdown = {
            principales: [
              "Vía de hecho o autotutela privada consistente en corte de energía, cambio de cerraduras e incautación de bienes muebles sin auxilio de la fuerza pública ni orden judicial.",
              "Vulneración flagrante de garantías constitucionales fundamentales (derecho de propiedad y prohibición de juzgamiento por comisiones especiales).",
              "Invocación de una cláusula contractual que pretendía autorizar la justicia por mano propia.",
              "Interposición de Recurso de Protección de urgencia para restablecer el imperio del derecho y el statu quo posesorio."
            ],
            secundarios: [
              "Existencia de rentas insolutas retenidas por el arrendatario.",
              "Giro gastronómico del local comercial y naturaleza perecible de los insumos."
            ],
            distractores: [
              "La existencia de la deuda impaga de rentas (que debe cobrarse a través del juicio especial de la Ley N° 18.101 y jamás por vías de hecho unilaterales).",
              "La alegación de que el recurso de protección es improcedente por existir un contrato previo (la proscripción de la autotutela ampara la posesión frente a vías de hecho ilícitas independientemente de la validez o terminación contractual)."
            ],
            partes: {
              principales: `${partyA.name} (Arrendatario recurrente afectado) y ${partyB.name} (Arrendador propietario recurrido).`,
              secundarias: `Corte de Apelaciones de ${loc.city} y Notario.`
            },
            instituciones: [
              "Acción Constitucional de Protección (Art. 20 de la Constitución Política)",
              "Garantía del Derecho de Propiedad sobre cosas corporales e incorporales (Art. 19 N° 24 CPR)",
              "Proscripción de la Autotutela y Prohibición de Juzgamiento por Comisiones Especiales (Art. 19 N° 3 inc. 5 CPR)",
              "Límites a la Autonomía Privada: Inoponibilidad y Nulidad de Cláusulas de Autotutela (Arts. 1466 y 1467 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Constitucional (Recurso de Protección y Garantías)",
              questionText: "¿Constituyen el corte de suministros, cambio de cerraduras y retención de bienes actos arbitrarios e ilegales tutelables por la vía del recurso de protección?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Sí, porque configuran actos de autotutela o vías de hecho vedadas por el ordenamiento, vulnerando la garantía del debido proceso y el derecho de propiedad sobre la posesión de los bienes (Art. 19 N° 3 inc. 5 y Art. 19 N° 24 CPR)." },
                { id: "b", text: "No, porque el arrendador es dueño absoluto del inmueble y tiene derecho constitucional a expulsar a cualquier deudor moroso sin juicio previo." },
                { id: "c", text: "No, porque los conflictos derivados de contratos de arrendamiento están expresamente excluidos del recurso de protección por mandato constitucional." },
                { id: "d", text: "Solo si el arrendatario acredita que no tiene antecedentes comerciales negativos en el Boletín Comercial." },
                { id: "e", text: "Únicamente si el Presidente de la República decreta un estado de excepción constitucional previo." }
              ],
              explanation: "El Estado de Derecho se asienta sobre la proscripción absoluta de la autotutela o justicia por mano propia (Art. 19 N° 3 inc. 5 CPR). La jurisprudencia constante y uniforme de la Corte Suprema sostiene que la actuación del arrendador que altera el statu quo cortando suministros, cambiando cerraduras o reteniendo bienes muebles sin orden judicial previa constituye un acto ilegal y arbitrario que amaga directamente la garantía del debido proceso y el derecho de propiedad del recurrente (Art. 19 N° 24 CPR), haciendo plenamente procedente la acción cautelar del Art. 20 CPR para restablecer el imperio del derecho. Se refutan los distractores: (b) el derecho de dominio no confiere facultades de autotutela o violencia privada; (c) la existencia de un contrato no impide deducir protección cuando se cometen vías de hecho manifiestas. Conclusión: Los actos de desalojo y corte de suministros por mano propia constituyen vías de hecho ilegales y arbitrarias que lesionan el Art. 19 N° 3 inc. 5 y Art. 19 N° 24 de la CPR, procediendo el recurso de protección para restablecer el statu quo.",
              pauta: "Se evalúa la comprensión de la garantía del tribunal natural y proscripción de la autotutela (Art. 19 N° 3 inc. 5 CPR), vinculándola con la cautela del statu quo posesorio por vía de protección (Art. 20 CPR).",
              errorFatalDeGrado: "Sostener que el propietario arrendador está facultado para hacer justicia por propia mano y desalojar al inquilino moroso o cortar servicios básicos sin sentencia judicial previa.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué garantías amparan al afectado frente a las vías de hecho?", outstanding: "Cita con precisión los Arts. 19 N° 3 inc. 5, 19 N° 24 y Art. 20 de la Constitución Política y el principio de proscripción de la autotutela.", sufficient: "Identifica la violación al derecho de propiedad y debido proceso.", basic: "Menciona la Constitución en general.", insufficient: "Sostiene que el propietario puede actuar por la fuerza." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué actos materiales ejecutó el recurrido?", outstanding: "Identifica el ingreso unilateral con cerrajeros, el cambio de cerraduras, el corte de luz y la retención de mercaderías e inventario.", sufficient: "Menciona que le cambió las llaves y cortó los suministros sin orden de juez.", basic: "Alude a la disputa por el arriendo.", insufficient: "Desconoce los hechos materiales." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué procede protección pese al vínculo contractual?", outstanding: "Demuestra que la acción cautelar no busca resolver el término del contrato sino cesar una vía de hecho ilícita e intolerable que priva al recurrente de la tenencia legítima sin debido proceso legal previo.", sufficient: "Explica que nadie puede hacer justicia por su propia mano y el juez debe ordenar reabrir el local.", basic: "Subsunción básica.", insufficient: "Concluye erróneamente que la mora autoriza las medidas de fuerza." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario constitucional adecuado?", outstanding: "Uso impecable de 'acto arbitrario e ilegal', 'vía de hecho', 'proscripción de la autotutela', 'imperio del derecho' y 'garantía cautelar'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Constitucional y Civil (Validez de Cláusulas Contractuales)",
              questionText: "¿Qué validez jurídica tiene la cláusula contractual que pretendía facultar al arrendador para ingresar y recuperar por sí mismo la posesión en caso de mora?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Carece de todo valor y es absolutamente nula por adolecer de objeto ilícito (Arts. 1466 y 1682 CC), pues la renuncia al juicio previo y la autorización de autotutela vulneran el orden público constitucional." },
                { id: "b", text: "Es plenamente válida y eficaz, pues la autonomía de la voluntad permite a las partes derogar los tribunales de justicia a su arbitrio." },
                { id: "c", text: "Es válida, pero solo produce efectos si es firmada ante un tribunal arbitral de única instancia." },
                { id: "d", text: "Se transforma automáticamente en una cláusula de fianza solidaria mercantil." },
                { id: "e", text: "Tiene valor de sentencia definitiva ejecutoriada emanada de tribunal superior." }
              ],
              explanation: "El orden público procesal y las garantías constitucionales del debido proceso son inderogables por los particulares. Conforme al Art. 1466 del Código Civil, hay objeto ilícito en todo contrato prohibido por las leyes. Ningún pacto privado puede facultar a una parte para actuar como tribunal de hecho o cometer despojos materiales al margen de la ley. Por tanto, dicha cláusula adolece de nulidad absoluta y resulta absolutamente inoponible para justificar las vías de hecho desplegadas. Se refutan los distractores: (b) el pacta sunt servanda del Art. 1545 CC tiene como límite infranqueable el orden público y las leyes prohibitivas; (c) ni siquiera un árbitro puede validar la comisión de vías de hecho unilaterales. Conclusión: Las cláusulas contractuales que autorizan la autotutela o recuperación forzada privada son nulas absolutamente por objeto ilícito (Arts. 1466 y 1682 CC) al conculcar normas de orden público constitucional.",
              pauta: "Se evalúa la relación entre los límites de la autonomía de la voluntad y el objeto ilícito en estipulaciones que contravienen el orden público procesal y constitucional (Arts. 1466 CC y 19 N° 3 CPR).",
              errorFatalDeGrado: "Declarar válida y vinculante una cláusula contractual de justicia por propia mano fundada en la autonomía de la voluntad irrestricta del Art. 1545 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Por qué una cláusula de autotutela es nula?", outstanding: "Cita los Arts. 1466 y 1682 del Código Civil en concordancia con el Art. 19 N° 3 inc. 5 de la Constitución.", sufficient: "Identifica que la cláusula es ilegal y nula por objeto ilícito.", basic: "Menciona que no se puede pactar eso.", insufficient: "Afirma que el pacto es válido por autonomía privada." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué estipulaba la cláusula invocada?", outstanding: "Identifica el texto literal del contrato que pretendía habilitar la recuperación de posesión material y retención sin proceso judicial.", sufficient: "Menciona la cláusula del contrato de arriendo.", basic: "Alude al contrato.", insufficient: "Desconoce los términos del pacto." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué el Art. 1545 CC no ampara la justicia por mano propia?", outstanding: "Razona que la autonomía privada no puede vulnerar las bases institucionales del Estado de Derecho; al convenir una comisión especial o autotutela privada, el pacto adolece de nulidad absoluta insanable.", sufficient: "Explica que nadie puede pactar en un contrato que se saltará al juez y a la policía.", basic: "Subsunción superficial.", insufficient: "Sostiene que pacta sunt servanda obliga a respetar la cláusula de fuerza." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática?", outstanding: "Uso de 'objeto ilícito', 'orden público procesal', 'inoponibilidad', 'inderogabilidad de garantías' y 'debido proceso'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Procesal y Constitucional (Límites de la Vía de Protección)",
              questionText: "¿Cuál es el criterio uniforme de las Cortes respecto a la alegación de que los conflictos sobre cobro de rentas y restitución deben ventilarse exclusivamente en juicio de la Ley 18.101?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Que si bien la discusión sobre la terminación del contrato y cobro de rentas corresponde a la justicia ordinaria, el recurso de protección es plenamente idóneo para restablecer el imperio del derecho frente a vías de hecho inaceptables." },
                { id: "b", text: "Que el recurso de protección debe rechazarse siempre de plano si existe un contrato escrito entre las partes." },
                { id: "c", text: "Que la Corte de Apelaciones debe fijar en el recurso de protección el monto de las rentas y dictar el lanzamiento definitivo del inquilino." },
                { id: "d", text: "Que los juzgados de policía local son los únicos autorizados para conocer de vías de hecho comerciales." },
                { id: "e", text: "Que la interposición de protección extingue de pleno derecho todas las deudas del arrendatario." }
              ],
              explanation: "Es doctrina pacífica y consolidada de la Corte Suprema y de las Cortes de Apelaciones del país que, si bien la acción cautelar del Art. 20 CPR no es la vía para resolver controversias sobre cumplimiento, terminación o liquidación de contratos (derechos litigiosos de lato conocimiento), ello no obsta a que proceda plenamente cuando una de las partes comete vías de hecho o autotutela. La sentencia de protección restablece el statu quo posesorio vulnerado, ordenando reabrir el local sin perjuicio de que el arrendador deduzca su demanda ordinaria de terminación ante el juez civil competente. Se refutan los distractores: (b) la vía contractual ordinaria no legaliza la fuerza bruta; (c) la Corte en sede de protección no fija rentas ni reemplaza el juicio declarativo especial de la Ley N° 18.101. Conclusión: El recurso de protección no dirime el fondo del contrato de arrendamiento pero es la vía idónea para neutralizar la autotutela y restablecer el statu quo de la tenencia legítima.",
              pauta: "Se evalúa la distinción entre la tutela cautelar de urgencia del recurso de protección y los juicios ordinarios o especiales de lato conocimiento (Ley 18.101).",
              errorFatalDeGrado: "Declarar inadmisible el recurso de protección frente a un desalojo violento por mano propia bajo el argumento simplista de que 'existe un contrato de arrendamiento'.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Cómo deslindan las Cortes la protección cautelar del juicio ordinario?", outstanding: "Cita el Art. 20 CPR y jurisprudencia reiterada de la Corte Suprema sobre tutela del statu quo frente a vías de hecho contractuales.", sufficient: "Identifica que la protección ampara contra vías de hecho aunque haya contrato.", basic: "Menciona el recurso de protección.", insufficient: "Afirma que el recurso reemplaza al juicio ordinario de arriendo." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho atiende la Corte y qué hecho queda para el juicio civil?", outstanding: "Distingue con nitidez el hecho de la deuda de rentas (debatible en juicio de la Ley 18.101) del hecho del desalojo forzado por mano propia (tutelable en protección).", sufficient: "Menciona que la deuda de arriendo se cobra en el juzgado pero el candado puesto es ilegal.", basic: "Alude al conflicto.", insufficient: "Confunde ambas materias." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué la Corte acoge el recurso sin declarar derechos contractuales?", outstanding: "Desarrolla el razonamiento demostrando que el fallo de protección no crea ni extingue derechos contractuales, sino que restablece provisionalmente el imperio de la legalidad frente a un acto arbitrario, remitiendo el fondo a la sede judicial correspondiente.", sufficient: "Explica que la Corte ordena devolver las llaves para que vayan a demandar como corresponde al tribunal.", basic: "Subsunción básica.", insufficient: "Sostiene que la Corte resuelve el término del arriendo." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal constitucional?", outstanding: "Uso riguroso de 'statu quo posesorio', 'derechos indubitados', 'lato conocimiento', 'provisionalidad cautelar' y 'tutela de urgencia'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO RECURSO DE PROTECCIÓN Y PROSCRIPCIÓN DE AUTOTUTELA:\n\n` +
            `1. Tipificación de Vía de Hecho Lesiva de Garantías: La conducta del arrendador recurrido al cambiar cerraduras, cortar suministros de energía e incautar mercaderías perecibles y equipamiento sin orden de juez competente tipifica una vía de hecho proscrita en nuestro ordenamiento institucional. Conforme al Art. 19 N° 3 inc. 5 de la Constitución Política, nadie puede ser juzgado por comisiones especiales ni hacerse justicia por propia mano. Dicha autotutela violenta vulnera de forma directa e inmediata el derecho de propiedad del recurrente (Art. 19 N° 24 CPR) sobre la tenencia de su local y sobre sus bienes corporales muebles retenidos.\n\n` +
            `2. Nulidad Absoluta de Cláusulas de Autotutela: La cláusula contractual que pretendía autorizar la recuperación unilateral del inmueble carece de toda eficacia jurídica. En virtud de los Arts. 1466 y 1682 del Código Civil, el pacto adolece de objeto ilícito por contravenir normas prohibitivas de orden público constitucional, resultando inoponible para amparar las medidas de fuerza desplegadas.\n\n` +
            `3. Deslinde Jurisdiccional y Alcance del Fallo Cautelar: La Corte de Apelaciones de ${loc.city} debe acoger el Recurso de Protección y ordenar el cese inmediato de los actos de fuerza, la restitución de las llaves y el restablecimiento del suministro eléctrico. Dicha tutela restablece el statu quo posesorio vulnerado, sin perjuicio de que el arrendador haga valer sus pretensiones de terminación y cobro de rentas impagas a través del procedimiento especial de la Ley N° 18.101 ante el juzgado civil correspondiente.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 11: RESPONSABILIDAD EXTRACONTRACTUAL, FUERO TERRITORIAL Y MEDIDAS PRECAUTORIAS (NUEVO)
      {
        id: "responsabilidad_extracontractual_competencia_cautelar",
        subjects: ["civil", "procesal"],
        targetInsts: ["civ_resp_extracontractual", "proc_competencia_accion_mueble", "proc_medidas_precautorias", "proc_excepcion_dilatoria_incompetencia"],
        linkedFuentes: { file: "PROCESAL.md", section: "Jurisdicción y Medidas Precautorias", rules: "Arts. 138 COT, Arts. 290, 298, 303 N° 1 CPC, Arts. 2314, 2317 CC" },
        linkedTopics: [
          { id: "civil-clase911-1-1", code: "1.1", title: "Responsabilidad Extracontractual y Elementos de la Acción" },
          { id: "procesal-procesal-1-3", code: "1.3", title: "Reglas Generales y Especiales de Competencia Territorial" },
          { id: "procesal-procesal-2-6", code: "2.6", title: "Medidas Cautelares Prejudiciales y Precautorias" }
        ],
        dogmaticPrinciples: "La indemnización de perjuicios es una acción personal mueble sujeta al fuero del domicilio del demandado (Art. 138 COT). Las medidas precautorias deben limitarse estrictamente a los bienes necesarios para responder (Art. 298 CPC) y la incompetencia territorial se reclama como dilatoria (Art. 303 N° 1 CPC).",
        build: () => {
          const title = `Caso Práctico: Colisión Múltiple, Competencia Territorial y Medida Precautoria Exorbitante (${partyA.name} c/ ${partyB.name})`;
          const facts = `El día ${dates.contract}, se produjo una colisión múltiple de tránsito en la Ruta 5 a la altura de la comuna de ${loc.comm}. Un camión de carga pesada perteneciente a la empresa de transportes ${partyB.name}, domiciliada en ${loc.city}, colisionó por alcance y destruyó totalmente la camioneta y carga comercial perteneciente a ${partyA.name}, domiciliado en una comuna distinta.\n\n` +
            `${partyA.name} interpuso demanda ordinaria de indemnización de perjuicios por responsabilidad extracontractual ante el tribunal de su propio domicilio en ${loc.city}, reclamando ${amt.clp} por daño emergente, lucro cesante y daño moral. Junto con la demanda, el actor solicitó una medida precautoria de retención de dineros sobre todas las cuentas bancarias de ${partyB.name} en el sistema financiero nacional por hasta ${amt.excess}, suma que triplica el valor total de los perjuicios demandados.\n\n` +
            `El tribunal acogió a trámite la demanda y decretó la medida cautelar precautoria sobre todas las cuentas corrientes de ${partyB.name} sin exigir fianza ni limitar la retención al monto disputado. ${partyB.name} comparece ante su estudio solicitando defensa procesal inmediata.`;

          const breakdown = {
            principales: [
              `Accidente de tránsito en ${loc.comm} con destrucción de carga y vehículo de ${partyA.name}.`,
              `Demanda extracontractual interpuesta ante tribunal del domicilio del actor y no del demandado (${loc.court}).`,
              `Decreto de medida cautelar de retención sobre todas las cuentas bancarias por un monto (${amt.excess}) muy superior al demandado (${amt.clp}).`,
              "Necesidad de deducir excepción dilatoria de incompetencia territorial y alzar o limitar la cautelar por desproporcionada."
            ],
            secundarios: [
              "Rubro de transporte de carga pesada.",
              "Fecha del siniestro vial en la Ruta 5."
            ],
            distractores: [
              "La alegación de que el juez del lugar del accidente tiene competencia exclusiva e inderogable en sede civil común (la acción civil indemnizatoria ejercida en juicio ordinario separado sigue las reglas generales del Art. 138 COT).",
              "La afirmación de que el demandante puede pedir embargo cautelar ilimitado sin sujeción a fianza ni proporcionalidad (Art. 298 CPC)."
            ],
            partes: {
              principales: `${partyA.name} (Actor perjudicado / Solicitante de la cautelar) y ${partyB.name} (Empresa transportista demandada / Afectada por la retención).`,
              secundarias: `Juez titular del tribunal y Bancos comerciales retenedores.`
            },
            instituciones: [
              "Regla General de Competencia en Acciones Personales Muebles (Arts. 580-581 CC y Art. 138 COT)",
              "Excepción Dilatoria de Incompetencia Territorial (Art. 303 N° 1 y Art. 305 CPC)",
              "Requisitos y Proporcionalidad de las Medidas Precautorias (Arts. 290, 298 y 301 CPC)",
              "Responsabilidad Extracontractual por Culpa Infraccional y Hecho Ajeno (Arts. 2314 y 2320 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Responsabilidad Extracontractual)",
              questionText: `En sede civil extracontractual, ¿cuál es el factor de imputación y qué presunción de culpabilidad puede invocar la víctima en el accidente de tránsito?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Responsabilidad subjetiva por culpa con presunción de culpabilidad infraccional derivada de la infracción a las normas de la Ley de Tránsito (Art. 2329 CC y Ley N° 18.290)." },
                { id: "b", text: "Responsabilidad objetiva absoluta sin necesidad de nexo causal ni falta alguna." },
                { id: "c", text: "Responsabilidad contractual derivada de un cuasicontrato tácito de carretera." },
                { id: "d", text: "Inimputabilidad civil total del transportista de carga por ser un servicio de utilidad pública." },
                { id: "e", text: "Responsabilidad civil solidaria obligatoria del Ministerio de Obras Públicas." }
              ],
              explanation: "En el sistema chileno la regla general es la responsabilidad subjetiva con base en la culpa (Arts. 2314 y 2329 CC). En accidentes de tránsito, la Ley N° 18.290 establece presunciones de culpabilidad frente a la infracción de reglamentos de tránsito (como conducir a exceso de velocidad o no mantener distancia razonable y prudente), facilitando la carga probatoria del demandante bajo el Art. 2329 del Código Civil. Se refutan los distractores: (b) el régimen general de tránsito en Chile no consagra responsabilidad objetiva pura sino presunciones legales de culpa; (c) la colisión entre vehículos no ligados por vínculo contractual previo genera responsabilidad extracontractual o aquiliana. Conclusión: La acción indemnizatoria se funda en la responsabilidad extracontractual por culpa, beneficiándose la víctima de las presunciones de culpabilidad infraccional establecidas en la Ley de Tránsito y el Art. 2329 del Código Civil.",
              pauta: "Se exige identificar el estatuto extracontractual (Arts. 2314 y 2329 CC) y la eficacia procesal de las presunciones de culpabilidad por infracción a la Ley de Tránsito.",
              errorFatalDeGrado: "Calificar la responsabilidad por accidente de tránsito entre terceros no contratantes como responsabilidad contractual o responsabilidad puramente objetiva sin ley especial que la establezca.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la culpa en accidentes de tránsito?", outstanding: "Cita con precisión los Arts. 2314 y 2329 CC en concordancia con las presunciones de la Ley N° 18.290.", sufficient: "Identifica la responsabilidad extracontractual y las presunciones de culpa.", basic: "Menciona genéricamente el Código Civil.", insufficient: "Confunde responsabilidad contractual con extracontractual." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hecho material originó el daño?", outstanding: "Identifica la colisión por alcance en carretera protagonizada por el camión de la empresa transportista.", sufficient: "Menciona el choque de tránsito entre el camión y la camioneta.", basic: "Alude al accidente.", insufficient: "Desconoce los hechos de la colisión." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo opera la presunción de culpa infraccional?", outstanding: "Desarrolla el razonamiento demostrando que la colisión por alcance activa la presunción de culpabilidad por no mantener distancia razonable, relevando a la víctima de la prueba positiva de la culpa inicial.", sufficient: "Explica que chocar por detrás presume la culpa del conductor del camión.", basic: "Subsunción superficial.", insufficient: "Sostiene que la víctima debe probar dolo directo penal." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso de 'culpa infraccional', 'presunciones de culpa', 'responsabilidad aquiliana' y 'estándar de diligencia'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal Orgánico (Competencia Territorial)",
              questionText: `Tratándose de una acción personal indemnizatoria de perjuicios, ¿cuál es el tribunal competente según el Código Orgánico de Tribunales?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "El tribunal del domicilio del demandado, conforme a la regla general de competencia en acciones personales muebles del Art. 138 del Código Orgánico de Tribunales (Arts. 580 y 581 CC)." },
                { id: "b", text: "El tribunal del domicilio exclusivo del demandante en cualquier circunstancia por principio pro actione." },
                { id: "c", text: "El tribunal de la capital de la República con competencia nacional excluyente." },
                { id: "d", text: "Un juzgado de policía local de turno en Santiago con competencia arbitral." },
                { id: "e", text: "La Corte Suprema en sala especializada de única instancia." }
              ],
              explanation: "Los derechos o acciones personales indemnizatorias tienen por objeto el cobro de una suma de dinero, por lo que se reputan muebles conforme a los Arts. 580 y 581 del Código Civil. En consecuencia, no existiendo estipulación contractual de prórroga expresa, rige la regla general de competencia territorial supletoria del Art. 138 del COT: 'El juez del lugar que las partes hayan estipulado, y a falta de estipulación, el del lugar del domicilio del demandado'. Demandar en el domicilio del actor sin estipulación previa adolece de incompetencia territorial relativa. Se refutan los distractores: (b) el domicilio del demandante jamás es regla general supletoria de competencia en acciones muebles civiles; (c) no existe un tribunal capitalino con fuero excluyente en derecho común. Conclusión: La acción indemnizatoria es personal mueble y debe interponerse ante el juez del domicilio del demandado en virtud del Art. 138 del Código Orgánico de Tribunales.",
              pauta: "Se exige aplicar la clasificación de las acciones en muebles (Arts. 580-581 CC) y fundar la competencia del juez del domicilio del demandado en el Art. 138 del COT.",
              errorFatalDeGrado: "Afirmar que en acciones civiles personales indemnizatorias el actor puede elegir libremente demandar ante el juez de su propio domicilio sin norma especial que lo faculte, vulnerando el Art. 138 COT.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué norma fija la competencia territorial en acciones muebles?", outstanding: "Cita con precisión el Art. 138 del COT en relación con los Arts. 580 y 581 del Código Civil.", sufficient: "Identifica la regla del domicilio del demandado del Art. 138 COT.", basic: "Menciona el Código Orgánico de Tribunales.", insufficient: "Afirma que el demandante elige libremente su tribunal." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Dónde se interpuso la demanda y dónde domicilian las partes?", outstanding: "Identifica que la demanda se dedujo en el tribunal del actor y no en el domicilio de la empresa demandada.", sufficient: "Menciona la diferencia de domicilios entre el actor y la empresa demandada.", basic: "Alude a las ciudades.", insufficient: "Desconoce los domicilios fácticos." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué el tribunal resulta incompetente territorialmente?", outstanding: "Articula el silogismo demostrando que al ser una acción mueble sin pacto de prórroga previa, el tribunal del actor carece de competencia territorial para conocer de la causa frente a la empresa demandada.", sufficient: "Explica que debieron demandar en la ciudad del demandado.", basic: "Subsunción superficial.", insufficient: "Sostiene que la competencia está bien trabada." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal orgánico?", outstanding: "Uso exacto de 'acción mueble', 'fuero territorial del demandado', 'competencia relativa' e 'incompetencia por factor territorio'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Procesal Civil (Medidas Precautorias)",
              questionText: `¿Qué vicio y desproporción presenta la medida precautoria concedida y qué remedio procesal asiste a ${partyB.name}?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Vulnera el principio de proporcionalidad estricta del Art. 298 del CPC al exceder groseramente el monto de los perjuicios demandados, asistiendo al demandado el derecho a solicitar su alzamiento, reducción a bienes estrictamente necesarios o sustitución por caución suficiente (Art. 301 CPC)." },
                { id: "b", text: "Es plenamente inexpugnable, pues el demandante goza de discrecionalidad absoluta para congelar todo el patrimonio del demandado." },
                { id: "c", text: "Genera automáticamente la rescisión de todos los contratos bancarios de la empresa de transportes." },
                { id: "d", text: "Obliga al juez a renunciar a su cargo por prevaricación culposa de pleno derecho." },
                { id: "e", text: "Solo puede reclamarse mediante recurso de reposición ante el Ministerio de Hacienda." }
              ],
              explanation: "El Art. 298 del CPC establece como principio rector que las medidas precautorias 'deberán limitarse a los bienes necesarios para responder a los resultados del juicio'. Congelar y retener todas las cuentas bancarias por una cifra que triplica el valor demandado constituye un exceso manifiesto que paraliza injustificadamente la actividad económica del demandado. El Art. 301 del CPC autoriza expresamente a solicitar el alzamiento de la medida cuando cesan las circunstancias que la motivaron o su sustitución por una caución suficiente. Se refutan los distractores: (b) las medidas cautelares son de interpretación estricta y jamás pueden ser abusivas; (c) la retención judicial no rescinde los contratos de cuenta corriente bancaria. Conclusión: La medida precautoria que grava bienes por un valor sustancialmente mayor al demandado conculca el Art. 298 del CPC, procediendo pedir su alzamiento parcial, reducción o sustitución por caución conforme al Art. 301 del CPC.",
              pauta: "Se exige citar el requisito de proporcionalidad y limitación a bienes necesarios del Art. 298 CPC y las vías de alzamiento y sustitución por caución del Art. 301 CPC.",
              errorFatalDeGrado: "Sostener que las medidas precautorias pueden decretarse sin límite sobre la totalidad del patrimonio del demandado sin atender a la cuantía de lo disputado, desconociendo el Art. 298 CPC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas consagran la proporcionalidad y el alzamiento cautelar?", outstanding: "Cita con precisión los Arts. 290, 298 y 301 del CPC, explicando el periculum in mora, fumus boni iuris y proporcionalidad estricta.", sufficient: "Identifica que las medidas deben limitarse a lo necesario según el Art. 298 CPC.", basic: "Menciona las medidas precautorias.", insufficient: "Afirma que el juez puede retener cualquier monto sin límite." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Cuál es la desproporción entre la pretensión y la cautelar?", outstanding: "Contrasta el monto reclamado en la demanda frente a la retención total decretada que triplica dicho valor paralizando las operaciones de la empresa.", sufficient: "Menciona que se retuvo mucho más dinero del que se estaba cobrando en el juicio.", basic: "Alude a las cuentas bancarias.", insufficient: "Desconoce los montos de la retención." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo se defiende el demandado frente a la cautelar abusiva?", outstanding: "Demuestra que la afectación generalizada quebranta el Art. 298 CPC, facultando al demandado para solicitar reposición con apelación subsidiaria o incidente de sustitución por caución/alzamiento parcial conforme al Art. 301 CPC.", sufficient: "Explica que la empresa puede pedir que le liberen las cuentas ofreciendo una fianza o rebajando el monto.", basic: "Subsunción básica.", insufficient: "Sostiene que no hay nada que hacer hasta la sentencia definitiva." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal cautelar?", outstanding: "Uso exacto de 'proporcionalidad cautelar', 'alzamiento de precautoria', 'sustitución por caución', 'bienes necesarios' y 'caución suficiente'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-4`,
              number: 4,
              area: "Derecho Procesal Civil (Excepciones Dilatorias)",
              questionText: `¿A través de qué mecanismo y en qué plazo debe ${partyB.name} alegar la falta de competencia del tribunal en el juicio ordinario?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Mediante la excepción dilatoria de incompetencia del tribunal (Art. 303 N° 1 CPC), la cual debe interponerse en un mismo escrito dentro del término de emplazamiento y antes de contestar la demanda (Art. 305 CPC)." },
                { id: "b", text: "Exclusivamente en el escrito de contestación de la demanda como excepción perentoria de fondo." },
                { id: "c", text: "Mediante un recurso de queja presentado verbalmente en audiencia ante el Presidente de la República." },
                { id: "d", text: "En cualquier momento del juicio hasta antes de la vista de la causa en la Corte de Apelaciones como excepción anómala." },
                { id: "e", text: "Solo después de dictada la sentencia definitiva mediante casación en el fondo." }
              ],
              explanation: "La incompetencia relativa por el territorio debe ser reclamada en el juicio ordinario antes de entrar a discutir el fondo del asunto. Conforme a los Arts. 303 N° 1 y 305 del CPC, las excepciones dilatorias —entre las que figura en primer término la incompetencia del tribunal— deben oponerse todas juntas en un mismo escrito dentro del término de emplazamiento y antes de contestar la demanda. Si el demandado contesta o realiza cualquier otra gestión previa sin formular la excepción, opera la prórroga tácita de la competencia territorial (Art. 187 N° 2 COT). Se refutan los distractores: (b) no puede oponerse como excepción perentoria sin haber prorrogado previamente la competencia; (d) la incompetencia no figura en el catálogo restringido de excepciones anómalas del Art. 310 CPC. Conclusión: La incompetencia territorial debe promoverse como excepción dilatoria (Art. 303 N° 1 CPC) antes de contestar la demanda y dentro del plazo de emplazamiento conforme al Art. 305 del CPC.",
              pauta: "Se evalúa el carácter previo y formal de las excepciones dilatorias del Art. 303 CPC y la oportunidad fatal del término de emplazamiento del Art. 305 CPC para evitar la prórroga tácita.",
              errorFatalDeGrado: "Sostener que la incompetencia territorial relativa puede oponerse válidamente después de contestada la demanda como excepción anómala, ignorando la preclusión y la prórroga tácita del Art. 187 N° 2 COT.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas regulan la excepción dilatoria de incompetencia?", outstanding: "Cita los Arts. 303 N° 1 y 305 del CPC en concordancia con el Art. 187 N° 2 del COT sobre preclusión y prórroga tácita.", sufficient: "Identifica la excepción dilatoria del Art. 303 N° 1 CPC y el plazo antes de contestar.", basic: "Menciona el Código de Procedimiento Civil.", insufficient: "Confunde dilatoria con excepción anómala." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿En qué etapa procesal debe actuar el abogado de la empresa?", outstanding: "Identifica que la demanda acaba de notificarse encontrándose corriendo el término de emplazamiento sin que la demandada haya contestado aún.", sufficient: "Menciona que la empresa debe defenderse dentro del plazo de la notificación.", basic: "Alude al juicio en curso.", insufficient: "Desconoce los plazos procesales." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué precluye la alegación si no se opone como dilatoria?", outstanding: "Desarrolla el silogismo demostrando que la falta de alegación oportuna antes de la contestación convalida el vicio relativo por apersonamiento tácito, tornando competente definitivamente al juez del actor.", sufficient: "Explica que si no reclama la incompetencia antes de contestar pierde el derecho y el juez queda firme.", basic: "Subsunción básica.", insufficient: "Afirma que puede alegarse en cualquier etapa posterior." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal exacto?", outstanding: "Uso riguroso de 'excepción dilatoria', 'término de emplazamiento', 'preclusión', 'prórroga tácita' y 'competencia relativa'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO RESPONSABILIDAD EXTRACONTRACTUAL, COMPETENCIA Y CAUTELARES:\n\n` +
            `1. Estatuto de Responsabilidad y Presunciones de Culpa: El régimen aplicable al siniestro vial es el de la responsabilidad extracontractual subjetiva por culpa (Arts. 2314 y 2329 CC). En accidentes de tránsito, la Ley N° 18.290 consagra presunciones de culpabilidad que relevan a la víctima de la prueba positiva de la culpa inicial ante infracciones a las reglas del tránsito (colisión por alcance por no mantener distancia reglamentaria). La empresa transportista responde vicariamente por su conductor dependiente conforme al Art. 2320 inc. 4 del Código Civil.\n\n` +
            `2. Incompetencia Territorial Relativa del Tribunal: La acción indemnizatoria de perjuicios es una acción personal mueble (Arts. 580 y 581 CC). Al no mediar prórroga expresa previa, rige la regla general supletoria del Art. 138 del Código Orgánico de Tribunales, en virtud de la cual es competente el tribunal del domicilio del demandado (${partyB.name}). Deducida la demanda ante el juez del domicilio del actor, concurre una manifiesta incompetencia territorial relativa que debe ser opuesta por la demandada como excepción dilatoria del Art. 303 N° 1 del CPC en un mismo escrito dentro del término de emplazamiento y antes de contestar la demanda (Art. 305 CPC), evitando la prórroga tácita del Art. 187 N° 2 del COT.\n\n` +
            `3. Ilegalidad y Desproporción de la Medida Precautoria: La resolución que decretó la retención de todas las cuentas bancarias de la empresa por una suma (${amt.excess}) que triplica con creces el monto reclamado en la demanda quebranta frontalmente el principio de proporcionalidad estricta y limitación cautelar del Art. 298 del CPC. La parte demandada debe deducir reposición con apelación subsidiaria o solicitar de inmediato la sustitución de la precautoria por caución suficiente o su reducción forzosa a los bienes estrictamente necesarios para responder a los resultados del litigio al tenor del Art. 301 del CPC.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 12: CONTRATO DE PROMESA, CLÁUSULA PENAL Y JUICIO EJECUTIVO DE HACER (NUEVO)
      {
        id: "promesa_clausula_penal_ejecutivo_hacer",
        subjects: ["civil", "procesal"],
        targetInsts: ["civ_resolucion_1489", "civ_clausula_penal_enorme", "proc_juicio_ejecutivo_excepciones"],
        linkedFuentes: { file: "CLASE_9_11.md", section: "Contrato de Promesa y Juicio Ejecutivo de Hacer", rules: "Art. 1554 CC, Arts. 1535, 1544 CC, Arts. 464, 532 CPC" },
        linkedTopics: [
          { id: "civil-clase911-4-1", code: "4.1", title: "Contrato de Promesa y Requisitos de Validez (Art. 1554 CC)" },
          { id: "civil-lasobligac-1-7", code: "1.7", title: "Cláusula Penal y Liquidación Convencional de Perjuicios" },
          { id: "procesal-procesal-2-5", code: "2.5", title: "Juicio Ejecutivo de Obligación de Hacer (Art. 532 CPC)" }
        ],
        dogmaticPrinciples: "La promesa de compraventa de inmueble engendra una obligación de hacer (otorgar el contrato definitivo, Art. 1554 CC). En caso de negativa del deudor, el juez suscribe la escritura definitiva a su nombre (Art. 532 CPC) y la cláusula penal compensatoria se modera al duplo del principal (Art. 1544 CC).",
        build: () => {
          const title = `Caso Práctico: Promesa Bilateral de Compraventa, Cláusula Penal y Ejecución de Hacer (${partyA.name} c/ ${partyB.name})`;
          const facts = `Con fecha ${dates.contract}, ${partyA.name} celebró un contrato de promesa bilateral de compraventa por escritura pública ante Notario de ${loc.city} con ${partyB.name}. En virtud de dicho instrumento, ${partyB.name} prometió vender y ${partyA.name} prometió comprar un sitio industrial ubicado en ${loc.comm} por un precio alzado de ${amt.baseContract}.\n\n` +
            `El contrato de promesa cumplió copulativamente con todos los requisitos del Art. 1554 del Código Civil, fijándose como época para celebrar la compraventa definitiva el día ${dates.breach} en la misma Notaría. En el contrato se incluyó una cláusula penal en los siguientes términos: 'Si el promitente vendedor se negare a otorgar la escritura de compraventa definitiva, pagará una pena de ${amt.totalPenalty} y el comprador podrá exigir el cumplimiento forzado con auxilio de la justicia'.\n\n` +
            `Llegado el día pactado, ${partyA.name} concurrió a la notaría con las instrucciones notariales y fondos para el pago del precio, pero ${partyB.name} no se presentó ni suscribió la escritura. ${partyA.name} dedujo demanda ejecutiva de obligación de hacer ante el ${loc.court}, solicitando que se ordene a ${partyB.name} otorgar la escritura definitiva bajo apercibimiento de suscribirla el juez en su representación (Art. 532 CPC), cobrando además conjuntamente la pena de ${amt.totalPenalty}.`;

          const breakdown = {
            principales: [
              `Promesa bilateral de compraventa por escritura pública cumpliendo todos los requisitos del Art. 1554 CC.`,
              `Fijación de época determinada y comparecencia del comprador con fondos para pagar el precio.`,
              `Incomparecencia culpable del promitente vendedor para otorgar la escritura prometida.`,
              `Demanda ejecutiva de obligación de hacer (Art. 532 CPC) acumulando cobro de cláusula penal superior al valor del contrato.`
            ],
            secundarios: [
              `Lugar de comparecencia en Notaría de ${loc.city}.`,
              "Monto del precio pactado para el contrato definitivo."
            ],
            distractores: [
              "La alegación de que la promesa de compraventa de bien raíz transfiere el dominio por sí sola (la promesa solo engendra una obligación de hacer consistente en celebrar el contrato prometido).",
              "La posibilidad de acumular la pena compensatoria con el cumplimiento forzado de la obligación principal sin estipulación expresa (Art. 1537 CC)."
            ],
            partes: {
              principales: `${partyA.name} (Promitente comprador ejecutante) y ${partyB.name} (Promitente vendedor rebelde ejecutado).`,
              secundarias: `Juez titular del ${loc.court} y Notario de ${loc.city}.`
            },
            instituciones: [
              "Requisitos de Validez del Contrato de Promesa (Art. 1554 del Código Civil)",
              "Procedimiento Ejecutivo de Obligación de Hacer (Arts. 530, 531 y 532 CPC)",
              "Suscripción de Escritura Pública por el Juez en Representación del Rebelde (Art. 532 CPC)",
              "Cláusula Penal: Incompatibilidad entre Pena Compensatoria y Cumplimiento (Art. 1537 CC) y Límite al Duplo (Art. 1544 CC)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Civil (Contrato de Promesa y Obligaciones)",
              questionText: `¿Qué tipo de obligación nace del contrato de promesa válidamente celebrado conforme al Art. 1554 del Código Civil?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Una obligación de hacer, consistente en la celebración y otorgamiento del contrato definitivo prometido dentro de la época prefijada (Art. 1554 inc. final CC)." },
                { id: "b", text: "Una obligación de dar que transfiere automáticamente el dominio y la posesión material del inmueble." },
                { id: "c", text: "Una obligación natural que carece de acción de cumplimiento coercitivo forzado." },
                { id: "d", text: "Una obligación indivisible comercial de rendición de cuentas ante la CMF." },
                { id: "e", text: "Un derecho real de hipoteca tácita registrado en el Conservador." }
              ],
              explanation: "El contrato de promesa se encuentra regulado en el Art. 1554 del Código Civil. El inciso final de dicha norma establece de manera categórica que: 'Concurriendo estas circunstancias habrá lugar a lo prevenido en el artículo precedente', remitiendo al Art. 1553 CC sobre la ejecución forzada de las obligaciones de hacer. La promesa es un contrato preparatorio que nunca engendra la obligación de transferir el dominio (dar), sino la prestación personalísima de otorgar el contrato definitivo. Se refutan los distractores: (b) la promesa no es un título traslaticio de dominio ni transfiere posesión registral; (c) la promesa genera una obligación civil perfecta con plena acción de cumplimiento forzado. Conclusión: El contrato de promesa engendra privativamente una obligación de hacer consistente en suscribir y celebrar el contrato definitivo prometido conforme al Art. 1554 del Código Civil.",
              pauta: "Se exige citar el Art. 1554 inc. final CC en relación con el Art. 1553 CC, clasificando la promesa como fuente exclusiva de una obligación de hacer.",
              errorFatalDeGrado: "Sostener que la promesa de compraventa de bien raíz transfiere el dominio sobre el inmueble o genera una obligación de dar directa, desconociendo su naturaleza de obligación de hacer.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué naturaleza tiene la obligación nacida de la promesa?", outstanding: "Cita con precisión el Art. 1554 inc. final y Art. 1553 CC, calificando la obligación como de hacer.", sufficient: "Identifica que la promesa engendra una obligación de hacer.", basic: "Menciona el contrato de promesa.", insufficient: "Afirma que la promesa transfiere el dominio." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué prestación prometió el vendedor en el contrato?", outstanding: "Identifica que el promitente vendedor se comprometió a concurrir a la notaría a otorgar la escritura de compraventa del sitio industrial.", sufficient: "Menciona que prometió vender el inmueble en una fecha dada.", basic: "Alude a la compraventa prometida.", insufficient: "Desconoce los términos del acuerdo." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué no cabe demandar reivindicación fundada en la promesa?", outstanding: "Desarrolla el razonamiento demostrando que el contrato preparatorio solo engendra derechos personales a que se otorgue el acto principal, de modo que el comprador aún no es dueño ni posee título traslaticio inscrito.", sufficient: "Explica que la promesa solo obliga a firmar la escritura y no hace dueño a nadie.", basic: "Subsunción superficial.", insufficient: "Sostiene que la promesa transfiere la propiedad." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso riguroso de 'contrato preparatorio', 'obligación de hacer', 'título traslaticio' y 'otorgamiento de contrato prometido'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal Civil (Juicio Ejecutivo de Obligación de Hacer)",
              questionText: `Frente a la negativa pertinaz del ejecutado a firmar la escritura de compraventa, ¿qué facultad asiste al juez en el juicio ejecutivo conforme al Art. 532 del CPC?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "El juez de la causa suscribirá la escritura pública de compraventa definitiva en representación legal del deudor rebelde (Art. 532 CPC), perfeccionando el contrato." },
                { id: "b", text: "El juez debe decretar el arresto indefinido del deudor sin poder sustituir su voluntad bajo ninguna circunstancia." },
                { id: "c", text: "El juez debe remitir los antecedentes al tribunal arbitral para que redacte un contrato alternativo." },
                { id: "d", text: "El juicio ejecutivo se extingue de plano debiendo demandarse exclusivamente indemnización de perjuicios ordinaria." },
                { id: "e", text: "El tribunal debe expropiar el inmueble en favor del Fisco de Chile." }
              ],
              explanation: "El Código de Procedimiento Civil regula el cumplimiento forzado de las obligaciones de suscripción de instrumentos en el Art. 532. Dicho precepto dispone que si el hecho consiste en la suscripción de un documento o en la constitución de una obligación por parte del deudor, y este no lo hiciere dentro del plazo fijado por el tribunal, el juez procederá a suscribirlo en su nombre y representación. Esta es una de las instituciones más trascendentales del juicio ejecutivo de hacer, pues sustituye legalmente la voluntad del rebelde permitiendo transferir el bien raíz con la posterior inscripción registral. Se refutan los distractores: (b) la prisión por deudas o arresto indefinido para suscribir contratos está proscrita en nuestro ordenamiento civil; (d) el acreedor no pierde la acción de cumplimiento forzado en naturaleza. Conclusión: En el juicio ejecutivo de obligación de hacer, ante la negativa del deudor, el juez suscribe la escritura de compraventa en su representación legal conforme al Art. 532 del Código de Procedimiento Civil.",
              pauta: "Se exige citar el mecanismo de sustitución legal del Art. 532 CPC, donde el tribunal suscribe el documento prometido en rebeldía del ejecutado.",
              errorFatalDeGrado: "Afirmar que los tribunales civiles jamás pueden suscribir un contrato en representación del deudor rebelde y que solo cabe demandar perjuicios monetarios, desconociendo el Art. 532 CPC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué artículo faculta al juez para firmar la escritura?", outstanding: "Cita con exactitud el Art. 532 del CPC y explica el mecanismo de suscripción forzada en juicio ejecutivo de hacer.", sufficient: "Identifica el Art. 532 CPC sobre firma del juez por el rebelde.", basic: "Menciona el juicio ejecutivo de hacer.", insufficient: "Afirma que el juez no puede firmar por las partes." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué actitud adoptó el promitente vendedor?", outstanding: "Identifica la incomparecencia injustificada del vendedor para suscribir la escritura definitiva pese a estar los fondos consignados.", sufficient: "Menciona que el vendedor se negó a firmar la escritura.", basic: "Alude a la negativa del deudor.", insufficient: "Desconoce los hechos del juicio ejecutivo." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo opera la representación judicial supletoria?", outstanding: "Explica que la ley confiere al juez la representación legal forzada del ejecutado para materializar la prestación de hacer cuando el título es perfecto y el deudor no opuso excepciones idóneas.", sufficient: "Razona que el juez actúa en nombre del rebelde para que el comprador no quede desamparado.", basic: "Subsunción básica.", insufficient: "Sostiene que debe iniciarse un nuevo juicio ordinario." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal ejecutivo?", outstanding: "Uso exacto de 'juicio ejecutivo de hacer', 'suscripción judicial forzada', 'rebeldía del ejecutado' y 'mandamiento de requerimiento'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Cláusula Penal y Acumulación)",
              questionText: `¿Es jurídicamente procedente acumular el cumplimiento forzado del contrato de promesa con el cobro íntegro de la cláusula penal compensatoria estipulada?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "No, conforme al Art. 1537 del Código Civil, el acreedor no puede pedir conjuntamente el cumplimiento de la obligación principal y la pena compensatoria, a menos que se haya estipulado la pena por el simple retardo o se haya pactado expresamente la acumulación." },
                { id: "b", text: "Sí, porque en el derecho civil chileno las cláusulas penales siempre se acumulan de pleno derecho a la obligación principal sin excepción." },
                { id: "c", text: "Solo si el ejecutado se declara en quiebra o insolvencia patrimonial." },
                { id: "d", text: "No, porque la cláusula penal adolece de nulidad absoluta insanable en contratos de promesa." },
                { id: "e", text: "Sí, pero únicamente si el monto de la pena no supera las 100 Unidades Tributarias Mensuales." }
              ],
              explanation: "El Art. 1537 del Código Civil consagra la incompatibilidad de principio entre la obligación principal y la pena compensatoria: 'Antes de constituirse el deudor en mora, no puede el acreedor demandar a su arbitrio la obligación principal o la pena, sino solo la obligación principal; ni después de constituido en mora, el cumplimiento de la obligación principal y la pena, sino una de estas dos cosas a su arbitrio; a menos que aparezca haberse estipulado la pena por el simple retardo, o a menos que se haya estipulado que por el pago de la pena no se entienda extinguida la obligación principal'. Acumular el cumplimiento en naturaleza con la pena compensatoria significaría un enriquecimiento sin causa al cobrar dos veces la prestación. Se refutan los distractores: (b) la ley prohíbe la acumulación ordinaria de la pena compensatoria con el cumplimiento; (d) la cláusula penal en la promesa es plenamente lícita. Conclusión: Conforme al Art. 1537 del Código Civil, no es admisible acumular el cumplimiento forzado del contrato definitivo con la cláusula penal compensatoria sin estipulación expresa que autorice dicha acumulación.",
              pauta: "Se exige aplicar la regla de incompatibilidad del Art. 1537 CC entre la obligación principal y la pena compensatoria, distinguiéndola de la pena meramente moratoria.",
              errorFatalDeGrado: "Sostener que el acreedor puede exigir conjuntamente la suscripción del contrato definitivo y el cobro de la pena compensatoria íntegra sin cláusula expresa que lo faculte, quebrantando el Art. 1537 CC.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué artículo regula la incompatibilidad de la pena?", outstanding: "Cita con precisión el Art. 1537 CC y distingue entre cláusula penal compensatoria y moratoria.", sufficient: "Identifica la regla del Art. 1537 CC sobre incompatibilidad de cobro conjunto.", basic: "Menciona la cláusula penal.", insufficient: "Afirma que siempre se cobran ambas cosas." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Cómo fue redactada la cláusula penal en el caso?", outstanding: "Identifica que la cláusula penal sancionaba la negativa a firmar (pena compensatoria) y que el actor demandó la firma forzada más la pena íntegra.", sufficient: "Menciona que se cobró la multa y además se exigió la firma de la venta.", basic: "Alude al cobro de la multa.", insufficient: "Desconoce los términos del libelo." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué se genera un doble cobro lesivo?", outstanding: "Desarrolla el razonamiento demostrando que exigir el inmueble definitivo y la pena compensatoria repara dos veces el mismo interés contractual, contraviniendo el Art. 1537 CC y el enriquecimiento injustificado.", sufficient: "Explica que el comprador recibiría el terreno y además la multa que lo reemplazaba.", basic: "Subsunción básica.", insufficient: "Sostiene que ambas pretensiones son acumulables por pacta sunt servanda." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Terminología dogmática de obligaciones?", outstanding: "Uso exacto de 'pena compensatoria', 'pena moratoria', 'incompatibilidad de pretensiones' y 'avaluación anticipada'.", sufficient: "Redacción ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO PROMESA BILATERAL, EJECUCIÓN DE HACER Y CLÁUSULA PENAL:\n\n` +
            `1. Obligación de Hacer Nacida de la Promesa: El contrato de promesa bilateral celebrado por escritura pública cumplió copulativamente con todas las solemnidades y exigencias del Art. 1554 del Código Civil. Al tenor del inciso final de dicha disposición y del Art. 1553 CC, la promesa engendra exclusivamente una obligación de hacer consistente en el otorgamiento de la escritura pública de compraventa definitiva prometida, no transfiriendo en caso alguno el dominio de forma directa ni constituyendo título traslaticio por sí misma.\n\n` +
            `2. Procedimiento Ejecutivo de Obligación de Hacer (Art. 532 CPC): Frente a la incomparecencia injustificada del promitente vendedor, encontrándose acreditado que el comprador concurrió a la notaría con los fondos para el pago del precio, procede el apremio ejecutivo de hacer. En conformidad con el Art. 532 del CPC, si requerido el ejecutado no suscribiere la escritura de compraventa definitiva dentro del plazo judicial, el juez de la causa la suscribirá en su representación legal forzada, perfeccionando válidamente la tradición con la posterior inscripción en el Conservador de Bienes Raíces.\n\n` +
            `3. Inadmisibilidad de la Acumulación de Pena Compensatoria: La pretensión de cobrar conjuntamente la suscripción forzada del contrato definitivo y la pena de ${amt.totalPenalty} debe ser desestimada. Al tenor del Art. 1537 del Código Civil, la pena compensatoria sustituye la prestación principal; al obtener el comprador el cumplimiento forzado en naturaleza, el cobro simultáneo de la pena importaría un doble pago lesivo y un enriquecimiento injustificado, máxime cuando el monto de la pena desborda el duplo de la obligación principal vedado por el Art. 1544 CC.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      },

      // ARQUETIPO 13: DOMINIO REGISTRAL, PROTECCIÓN CONSTITUCIONAL Y RECURSO DE APELACIÓN (NUEVO)
      {
        id: "constitucional_dominio_proteccion_apelacion",
        subjects: ["constitucional", "procesal", "civil"],
        targetInsts: ["const_recurso_proteccion", "civ_tradicion_posesion", "civ_reivindicatoria", "proc_recurso_apelacion"],
        linkedFuentes: { file: "CONSTITUCIONAL.md", section: "Acciones Constitucionales y Recursos Procesales", rules: "Arts. 19 N° 24, 20 CPR, Auto Acordado CS sobre Tramitación de Recurso de Protección, Arts. 186 y ss. CPC" },
        linkedTopics: [
          { id: "constitucional-constituci-1-2", code: "1.2", title: "Acciones Cautelares de Tutela Directa (Protección)" },
          { id: "civil-losbienes-1-6", code: "1.6", title: "Protección del Dominio Registral y de la Posesión" },
          { id: "procesal-procesal-2-3", code: "2.3", title: "Régimen del Recurso de Apelación y Plazos Fatales" }
        ],
        dogmaticPrinciples: "El despojo material violento de un predio con inscripción registral vigente constituye una vía de hecho lesiva de las garantías del Art. 19 N° 24 y debido proceso (Art. 20 CPR). La sentencia de la Corte de Apelaciones es apelable en plazo perentorio de 5 días hábiles ante la Corte Suprema (Auto Acordado CS).",
        build: () => {
          const title = `Caso Práctico: Despojo de Terreno Rústico, Protección del Dominio Registral y Apelación (${partyA.name} c/ ${partyB.name})`;
          const facts = `${partyA.name} es legítimo dueño y poseedor inscrito de un predio rústico de 10 hectáreas ubicado en la comuna de ${loc.comm}, amparado por inscripción registral vigente en el Conservador de Bienes Raíces desde el año 2015. El día ${dates.breach}, aprovechando la ausencia temporal de los cuidadores, ${partyB.name}, invocando derechos hereditarios y títulos posesorios antiguos no inscritos, ingresó violentamente al predio con maquinaria pesada, destruyó los cercos perimetrales, instaló candados y expulsó a los dependientes de ${partyA.name}.\n\n` +
            `${partyA.name} interpuso Recurso de Protección ante la Corte de Apelaciones de ${loc.city}, solicitando el inmediato desalojo de los ocupantes, la reposición de los cercos y la restitución del predio, denunciando la vulneración a su derecho de propiedad (Art. 19 N° 24 CPR) y a la proscripción de autotutela.\n\n` +
            `La Corte de Apelaciones de ${loc.city} rechazó el recurso de protección argumentando que 'existiría una controversia sobre deslindes y títulos que debe ventilarse en un juicio ordinario de lato conocimiento'. ${partyA.name} concurre a su estudio para impugnar dicha sentencia ante la Corte Suprema de Justicia.`;

          const breakdown = {
            principales: [
              `Despojo material violento por mano propia de predio rústico con posesión inscrita vigente desde 2015.`,
              `Alteración unilateral del statu quo posesorio por ocupante que alega títulos no inscritos sin orden judicial.`,
              `Sentencia de la Corte de Apelaciones de ${loc.city} que rechaza la protección calificando el conflicto como de lato conocimiento.`,
              `Necesidad de interponer recurso de apelación dentro del plazo de 5 días hábiles ante la Corte Suprema conforme al Auto Acordado.`
            ],
            secundarios: [
              "Superficie del predio rústico (10 hectáreas).",
              "Pretexto de derechos hereditarios invocados por el usurpador."
            ],
            distractores: [
              "La afirmación de que el recurso de protección es improcedente por existir acciones reivindicatorias o posesorias civiles (la tutela del statu quo frente a vías de hecho ampara la posesión inscrita con independencia de las acciones ordinarias de fondo).",
              "El plazo de apelación ordinario de 10 días del CPC (el plazo para apelar de la sentencia de protección es especial y fatal de 5 días hábiles conforme al Auto Acordado de la Corte Suprema)."
            ],
            partes: {
              principales: `${partyA.name} (Propietario recurrente con título inscrito) y ${partyB.name} (Usurpador material recurrido).`,
              secundarias: `Corte de Apelaciones de ${loc.city}, Corte Suprema de Justicia y Conservador de Bienes Raíces.`
            },
            instituciones: [
              "Recurso de Protección y Cautela del Statu Quo Posesorio (Art. 20 CPR)",
              "Garantía Constitucional del Derecho de Propiedad sobre el Dominio Registral (Art. 19 N° 24 CPR)",
              "Proscripción de la Autotutela y Vías de Hecho",
              "Recurso de Apelación en el Recurso de Protección: Plazo Fatal de 5 Días (Auto Acordado CS de 1992 y 2015)"
            ]
          };

          const rawQuestions = [
            {
              id: `q-ia-${timestamp}-1`,
              number: 1,
              area: "Derecho Constitucional (Garantías y Protección Posesoria)",
              questionText: "¿Por qué el despojo material de un predio con posesión inscrita constituye una vulneración al Art. 19 N° 24 de la Constitución Política tutelable por vía de protección?",
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Porque el recurso de protección ampara el statu quo posesorio material e inscrito frente a vías de hecho arbitrarias, impidiendo que los particulares se hagan justicia por mano propia aun cuando pretendan tener derechos de dominio." },
                { id: "b", text: "Porque la posesión inscrita transforma al recurrente en soberano absoluto inmune a cualquier control legal." },
                { id: "c", text: "Porque el recurso de protección tiene por objeto dirimir y declarar el dominio definitivo con efecto de cosa juzgada sustancial." },
                { id: "d", text: "Solo si el predio rústico cuenta con una tasación fiscal superior a $500 millones de pesos." },
                { id: "e", text: "Porque la Constitución prohíbe el uso de candados y cercos perimetrales en zonas agrícolas." }
              ],
              explanation: "Es doctrina uniforme y constante de la Tercera Sala de la Corte Suprema que el recurso de protección es la vía idónea para repeler vías de hecho que alteran el statu quo posesorio de quien detenta la tenencia legítima amparada por inscripción registral vigente. El ordenamiento jurídico proscribe de forma terminante que un particular despoje violentamente a otro de la tenencia de un predio alegando supuestos derechos hereditarios sin orden judicial previa. Dicha autotutela lesiona directamente el derecho de propiedad sobre la posesión (Art. 19 N° 24 CPR) y el derecho al debido proceso (Art. 19 N° 3 inc. 5 CPR). Se refutan los distractores: (c) la protección es una tutela cautelar provisional de urgencia que no hace declaración de dominio definitivo; (d) la protección no discrimina por avalúo fiscal. Conclusión: El despojo material violento vulnera el Art. 19 N° 24 de la CPR al destruir arbitrariamente el statu quo posesorio, resultando procedente la acción de protección para restablecer el imperio del derecho.",
              pauta: "Se exige fundamentar la protección de la tenencia y posesión inscrita como expresión del derecho de propiedad del Art. 19 N° 24 CPR frente a vías de hecho y actos de justicia por propia mano.",
              errorFatalDeGrado: "Sostener que el recurso de protección jamás procede frente al despojo violento de un predio por ser privativo del juicio ordinario de reivindicación, validando de facto la justicia por mano propia.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué garantías amparan al poseedor inscrito frente al despojo?", outstanding: "Cita con precisión los Arts. 19 N° 24, 19 N° 3 inc. 5 y 20 de la CPR y la doctrina de protección del statu quo posesorio.", sufficient: "Identifica la violación al derecho de propiedad y la proscripción de vías de hecho.", basic: "Menciona el recurso de protección.", insufficient: "Afirma que el usurpador actúa lícitamente." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué actos de fuerza se ejecutaron en el predio?", outstanding: "Identifica el ingreso violento con maquinaria pesada, destrucción de cercos, instalación de candados y expulsión de cuidadores.", sufficient: "Menciona que se tomaron el terreno y cambiaron los candados.", basic: "Alude a la ocupación del predio.", insufficient: "Desconoce los hechos materiales." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué yerra la Corte al calificarlo de lato conocimiento?", outstanding: "Demuestra que la Corte incurre en error al desestimar el recurso, pues no se pedía resolver el dominio sino amparar la paz pública y la posesión vigente frente a una vía de hecho inadmisible en un Estado de Derecho.", sufficient: "Explica que la Corte debió devolver el terreno porque nadie puede sacarlo a la fuerza.", basic: "Subsunción superficial.", insufficient: "Sostiene que la Corte acertó porque debieron iniciar juicio ordinario." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario dogmático adecuado?", outstanding: "Uso impecable de 'statu quo posesorio', 'posesión inscrita', 'vía de hecho', 'provisionalidad cautelar' y 'proscripción de la autotutela'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-2`,
              number: 2,
              area: "Derecho Procesal Constitucional (Recursos Procesales)",
              questionText: `¿Cuál es el plazo fatal y el tribunal competente para interponer el recurso de apelación en contra de la sentencia definitiva de la Corte de Apelaciones que rechazó el recurso de protección?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Debe interponerse dentro del plazo fatal de 5 días hábiles ante la misma Corte de Apelaciones respectiva para que conozca y resuelva la Corte Suprema (Auto Acordado CS sobre Tramitación de Recurso de Protección)." },
                { id: "b", text: "Debe interponerse dentro del plazo ordinario de 10 días del Código de Procedimiento Civil." },
                { id: "c", text: "Dentro del plazo fatal de 24 horas ante el Tribunal Constitucional de Chile." },
                { id: "d", text: "Es una resolución de única instancia totalmente inapelable ante los tribunales superiores." },
                { id: "e", text: "Dentro de 30 días corridos mediante recurso de casación en la forma." }
              ],
              explanation: "El recurso de protección se rige por las normas del Auto Acordado de la Corte Suprema de 1992 (y sus modificaciones de 2007 y 2015). El numeral 5° del Auto Acordado dispone perentoriamente que contra la sentencia definitiva pronunciada por la Corte de Apelaciones solo procederá el recurso de apelación, el que deberá interponerse dentro del plazo fatal de 5 días hábiles contados desde la notificación por el estado diario de la sentencia, para ante la Corte Suprema. No rige el plazo supletorio general de 10 días del Art. 189 del CPC por primar la reglamentación especial del arbitrio constitucional. Se refutan los distractores: (b) el plazo de 10 días del CPC no rige en protección; (c) el Tribunal Constitucional no es tribunal de apelación de recursos de protección. Conclusión: El recurso de apelación contra la sentencia de protección debe deducirse en el plazo fatal de 5 días hábiles ante la Corte de Apelaciones para ante la Corte Suprema conforme al Auto Acordado de la Corte Suprema.",
              pauta: "Se exige señalar el plazo fatal de 5 días hábiles y el tribunal superior competente (Corte Suprema) conforme al Auto Acordado especial que rige la acción cautelar.",
              errorFatalDeGrado: "Sostener que la sentencia definitiva de la Corte de Apelaciones en un recurso de protección es apelable en el plazo general de 10 días del CPC o que es inapelable, ignorando la regla del Auto Acordado de la Corte Suprema.",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué norma fija el plazo de apelación en protección?", outstanding: "Cita el Auto Acordado de la Corte Suprema sobre Tramitación del Recurso de Protección y especifica el plazo perentorio de 5 días hábiles.", sufficient: "Identifica el plazo de 5 días para apelar ante la Corte Suprema.", basic: "Menciona que se puede apelar.", insufficient: "Aplica erróneamente el plazo de 10 días del CPC o niega la apelación." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué resolución se busca impugnar?", outstanding: "Identifica la sentencia definitiva de la Corte de Apelaciones que desestimó el recurso de protección sobre el predio.", sufficient: "Menciona el fallo de la Corte de Apelaciones que rechazó la protección.", basic: "Alude a la sentencia.", insufficient: "Desconoce el fallo impugnado." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Cómo se tramita la apelación en la Corte Suprema?", outstanding: "Explica que la apelación eleva los antecedentes a la Tercera Sala Constitucional de la Corte Suprema, conociéndose en cuenta o previa vista de la causa según si se formulan peticiones fundadas.", sufficient: "Explica que la Corte Suprema revisará el recurso de protección.", basic: "Subsunción superficial.", insufficient: "Afirma que debe ir a juicio arbitral." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Vocabulario procesal recursivo?", outstanding: "Uso exacto de 'recurso de apelación constitucional', 'Auto Acordado CS', 'plazo fatal de 5 días hábiles' y 'elevación a la Corte Suprema'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            },
            {
              id: `q-ia-${timestamp}-3`,
              number: 3,
              area: "Derecho Civil (Protección de la Posesión Inscrita)",
              questionText: `¿Por qué en el régimen civil chileno la pretensión del ocupante que invoca títulos hereditarios no inscritos no desvirtúa la posesión del recurrente?`,
              requiresJustification: true,
              correctAnswer: "a",
              options: [
                { id: "a", text: "Porque conforme a la teoría de la posesión inscrita (Arts. 724, 728 y 2505 CC), la inscripción en el Conservador es garantía y prueba de posesión, impidiendo que el apoderamiento material sin título inscrito confiera posesión ni prescriba contra título inscrito." },
                { id: "b", text: "Porque la posesión material de hecho prima siempre sobre cualquier registro del Conservador de Bienes Raíces." },
                { id: "c", text: "Porque los títulos hereditarios jamás tienen valor en el derecho sucesorio chileno." },
                { id: "d", text: "Porque la ocupación con maquinaria pesada se considera título traslaticio auténtico de pleno derecho." },
                { id: "e", text: "Porque el Conservador de Bienes Raíces es una institución meramente honorífica y voluntaria." }
              ],
              explanation: "El sistema registral inmobiliario chileno se fundamenta en los principios cardinales de la teoría de la posesión inscrita desarrollada por don Andrés Bello: 1) El Art. 724 CC exige la inscripción para adquirir la posesión sobre inmuebles; 2) El Art. 728 CC establece que para que cese la posesión inscrita es necesario que la inscripción se cancele; y 3) El Art. 2505 CC dispone categóricamente que contra título inscrito no tiene lugar la prescripción adquisitiva de bienes raíces. Por tanto, el apoderamiento fáctico con maquinaria desplegado por el usurpador no es más que una usurpación violenta e injusta tenencia que no lesiona la posesión jurídica del titular inscrito. Se refutan los distractores: (b) la posesión material sin título inscrito no deroga la inscripción conservatoria; (c) los títulos hereditarios requieren trámite de posesión efectiva e inscripciones del Art. 688 CC para disponer de los inmuebles. Conclusión: La inscripción conservatoria vigente constituye la única garantía y prueba de la posesión sobre inmuebles (Arts. 724, 728 y 2505 CC), no viéndose afectada por el mero apoderamiento fáctico material.",
              pauta: "Se evalúa la teoría de la posesión inscrita (Arts. 724, 728 y 2505 CC) y la absoluta ineficacia del apoderamiento material para despojar la posesión jurídica del titular inscrito.",
              errorFatalDeGrado: "Sostener que el apoderamiento material violento de un bien raíz despoja la posesión jurídica del poseedor inscrito permitiendo ganar el dominio por prescripción contra título conservatorio vigente (Art. 2505 CC).",
              officialRubric: {
                criterio1Marco: { name: "Dimensión 1: Comprensión Dogmática e Identificación Normativa", maxPoints: 0.5, guidingQuestion: "¿Qué normas consagran la garantía de la posesión inscrita?", outstanding: "Cita con precisión los Arts. 686, 724, 728 y 2505 del Código Civil y los principios de la teoría de la posesión inscrita.", sufficient: "Identifica que la inscripción en el Conservador ampara la posesión frente a tomas materiales.", basic: "Menciona la posesión inscrita.", insufficient: "Afirma que la toma material hace dueño al ocupante." },
                criterio2Hechos: { name: "Dimensión 2: Subsunción Normativa y Manejo de Hechos Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué títulos ostentan el recurrente y el recurrido?", outstanding: "Contrasta la inscripción conservatoria vigente desde 2015 del actor con la ausencia de títulos inscritos del ocupante violento.", sufficient: "Menciona que el dueño tiene papeles en el Conservador y el otro no.", basic: "Alude al terreno en disputa.", insufficient: "Desconoce los títulos registrales." },
                criterio3Subsuncion: { name: "Dimensión 3: Vías Adjetivas y Razonamiento Jurídico", maxPoints: 2.0, guidingQuestion: "¿Por qué el apoderamiento de hecho no confiere posesión?", outstanding: "Demuestra que la posesión inscrita es una institución jurídica de orden público registral que no se pierde por el hecho del despojo físico, calificando al ocupante como mero usurpador o tenedor vicioso.", sufficient: "Explica que la persona inscrita sigue siendo poseedora por la ley y el que se metió es un usurpador.", basic: "Subsunción superficial.", insufficient: "Concluye erróneamente que se perdió la posesión del inmueble." },
                criterio4Precision: { name: "Dimensión 4: Técnica de Ponderación, Rigor y Precisión Conceptual", maxPoints: 0.5, guidingQuestion: "¿Lenguaje dogmático de bienes?", outstanding: "Uso impecable de 'teoría de la posesión inscrita', 'garantía registral', 'cancelación de inscripción', 'mera usurpación' y 'prescripción contra título'.", sufficient: "Redacción técnica ordenada.", basic: "Imprecisiones.", insufficient: "Lenguaje coloquial." }
              }
            }
          ];

          const modelSolution = `SOLUCIÓN MODELO OFICIAL - CASO DOMINIO REGISTRAL, RECURSO DE PROTECCIÓN Y APELACIÓN:\n\n` +
            `1. Procedencia de la Tutela Constitucional de Urgencia: El ingreso violento con maquinaria pesada, cambio de candados y expulsión de cuidadores perpetrado por ${partyB.name} constituye una vía de hecho inaceptable en un Estado constitucional de Derecho. Conforme a reiterada y uniforme jurisprudencia de la Corte Suprema, el recurso de protección (Art. 20 CPR) es plenamente idóneo para amparar el statu quo posesorio de quien detenta la posesión material e inscrita, impidiendo la autotutela privada. La actuación recurrida vulnera flagrantemente el derecho de propiedad sobre la posesión del predio (Art. 19 N° 24 CPR) y el derecho al juez natural y debido proceso (Art. 19 N° 3 inc. 5 CPR).\n\n` +
            `2. Indemnidad de la Posesión Inscrita (Arts. 724, 728 y 2505 CC): La pretensión del ocupante fundada en supuestos títulos hereditarios carece de toda eficacia posesoria frente a la inscripción vigente desde el año 2015 en favor de ${partyA.name}. La posesión inscrita es prueba y garantía del dominio sobre inmuebles, no cesando por el mero despojo material ni admitiendo prescripción adquisitiva en contra de título inscrito (Art. 2505 CC).\n\n` +
            `3. Régimen Recursivo Especial del Auto Acordado: La sentencia de la Corte de Apelaciones que desestimó la acción cautelar calificándola erradamente como un conflicto de lato conocimiento debe ser apelada ante la Corte Suprema de Justicia. Dicho recurso de apelación debe interponerse dentro del plazo fatal y perentorio de 5 días hábiles contados desde la notificación del fallo por el estado diario, conforme a las reglas especiales del Auto Acordado de la Corte Suprema sobre Tramitación y Fallo del Recurso de Protección.`;

          return { title, facts, breakdown, modelSolution, questions: rawQuestions.map(q => CaseGeneratorAgent.shuffleQuestionOptions(q)) };
        }
      }
    ];

    // MOTOR DE AFINIDAD PONDERADA:
    let scoredArchetypes = archetypes.map(arch => {
      let matchCount = 0;
      let subjectBonus = 0;

      arch.targetInsts.forEach(tId => {
        if (instIds.includes(tId)) {
          matchCount += 15;
        }
      });

      selectedInstitutions.forEach(inst => {
        if (arch.subjects.includes(inst.subject)) {
          subjectBonus += 2;
        }
      });

      return {
        archetype: arch,
        score: matchCount + subjectBonus
      };
    });

    scoredArchetypes.sort((a, b) => b.score - a.score);

    const maxScore = scoredArchetypes[0]?.score || 0;
    const topCandidates = scoredArchetypes.filter(item => item.score >= maxScore && item.score > 0);

    let chosenArchetype;
    if (topCandidates.length > 0) {
      chosenArchetype = this.pickRandom(topCandidates).archetype;
    } else {
      chosenArchetype = this.pickRandom(archetypes);
    }

    const builtCase = chosenArchetype.build();
    const linkedApuntes = this.getLinkedApuntesForArchetype(chosenArchetype);

    const newCase = {
      id: `caso-ia-${timestamp}-${randomSuffix}`,
      title: builtCase.title,
      subjects: chosenArchetype.subjects,
      difficulty: "Nivel Grado",
      summary: builtCase.facts.slice(0, 140).replace(/\n/g, ' ') + "...",
      facts: builtCase.facts,
      isImportedFromCasosFolder: true,
      isGeneratedByAI: true,
      isFree: true,
      sourceCategory: "generado_ia",
      sourceCategoryLabel: "Agente IA (Protocolo AFG 2026-20)",
      sourceFile: `IA-Grado-Caso-${new Date().toISOString().slice(0, 10)}.md`,
      linkedFuentes: this.resolveLinkedFuente(chosenArchetype.linkedFuentes) || chosenArchetype.linkedFuentes || null,
      linkedTopics: chosenArchetype.linkedTopics || [],
      linkedApuntes: linkedApuntes || [],
      dogmaticPrinciples: chosenArchetype.dogmaticPrinciples || "", 
      factsBreakdown: builtCase.breakdown,
      questions: builtCase.questions,
      createdAt: timestamp,
      expiresAt: timestamp + (7 * 24 * 3600 * 1000),
      methodology: {
        conflict: builtCase.breakdown.principales ? builtCase.breakdown.principales.join(" ") : "Conflicto interdisciplinario de nivel examen de grado.",
        legalBasis: builtCase.breakdown.instituciones || ["Normativa sustantiva y procesal oficial"],
        applicationReasoning: "El caso exige discriminar hechos determinantes frente a distractores y subsumir en las hipótesis normativas aplicables de la Rúbrica Oficial AIME.",
        dogmaticFramework: "Doctrina uniforme de examen de grado chileno."
      },
      modelSolution: builtCase.modelSolution || "Revisar la justificación y desglose oficial en cada una de las preguntas de alternativas."
    };

    // Gate de anclaje dogmático (v7.32, PROMPT 026): reordena vinculados por
    // overlap real y anota needsReview donde la explicación deriva del apunte.
    const gated = this.applyAnchorGate({
      questions: newCase.questions,
      linkedApuntes: newCase.linkedApuntes
    });
    newCase.linkedApuntes = gated.linkedApuntes;
    newCase.questions = gated.questions;

    // Validar caso sintetizado e integridad de citas
    this.validateGeneratedCase(newCase);
    this.assertCitationIntegrity(newCase);

    return newCase;
  }
};

if (typeof window !== "undefined") {
  window.CaseGeneratorAgent = CaseGeneratorAgent;
}
if (typeof globalThis !== "undefined") {
  globalThis.CaseGeneratorAgent = CaseGeneratorAgent;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CaseGeneratorAgent;
}
