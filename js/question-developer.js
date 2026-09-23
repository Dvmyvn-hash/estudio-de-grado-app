/**
 * DESARROLLADOR DE PREGUNTAS DEL AGENTE (QuestionDeveloper) - v7.17
 * Motor CONTENIDO-CONDUCTOR de perfil «Simple y Claro» (solo dogmáticas):
 * - Requisitos, características y elementos del concepto en formato COMPARACIÓN
 *   de combinación I-II-III-IV («a) I y II correctas», «Solo IV», «I, II y III»),
 *   con 4 proposiciones cortas (3 verdaderas ancladas al apunte + 1 falsa por
 *   mutación simple, nunca verbatim en la cédula).
 * - Plazos como pregunta NUMÉRICA simple («¿de cuántos días/años es el plazo?»)
 *   con distractores numéricos simples (sin cómputo aritmético de casos).
 * - Definiciones cortas (correcta ≤ 155 chars) como relleno, con distractores
 *   cortos: versión incompleta, institución afín, mezcla o negación evidente.
 * - Los CASOS quedan APARTE: no se emiten preguntas de caso (la taxonomía y el
 *   arquetipo _specCaso se conservan reservados para la próxima etapa).
 * Mantiene el contrato público v7.11 (detectNature, buildSectionQuestions,
 * validateSectionQuestions, getSectionQuestions, natureOf) y el contrato
 * estructural 24.4 (4 preguntas x 5 opciones A-E, solucDogmática >= 150 chars
 * con cierre «Conclusión:», citas subconjunto, determinismo sin Math.random).
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

  // Gramática estructural compilada desde MODELOS_DE_PRUEBA/ (v7.17).
  // Se consume de forma perezosa (en runtime el script js/exam-structure-grammar.js
  // puede cargarse antes o después); si no existe, se usan los valores por defecto.
  function grammarOrDefault(rootRef) {
    const g = (typeof rootRef !== "undefined" && rootRef && rootRef.EXAM_STRUCTURE_GRAMMAR) || null;
    return g && typeof g === "object" ? g : null;
  }

  const QuestionDeveloper = {
    // Taxonomía oficial de naturalezas de preguntas de examen de grado (metadatos;
    // la generación v7.17 es SIEMPRE dogmática; case queda reservado para la etapa de casos).
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

    // Token de absurdos que jamás deben aparecer en opciones/enunciados (perfil «Manejo»)
    _BANNED_ABSURD: [
      "sorteo público", "sorteo publico", "concejo municipal", "multa a beneficio municipal",
      "fisco de chile", "presidio", "prórroga unilateral", "prorroga unilateral", "duplicar el plazo"
    ],

    // Banco de instituciones afines (distractores verosímiles por disciplina)
    _AFIN_BANK: {
      civil: [
        "La propiedad es el derecho real que habilita a gozar y disponer arbitrariamente de la cosa, no siendo contra ley o derecho ajeno.",
        "La posesión inscrita es la que consta en el registro conservatorio mediante la inscripción, otorgando al poseedor las acciones que la ley reconoce."
      ],
      procesal: [
        "La jurisdicción es la facultad de los tribunales para conocer de los negocios civiles y criminales y hacer ejecutar lo juzgado.",
        "La nulidad procesal es la sanción que priva de valor a los actos del procedimiento realizados con infracción de los requisitos legales."
      ],
      constitucional: [
        "El recurso de protección es la acción constitucional que ampara el legítimo ejercicio de los derechos fundamentales frente a actos arbitrarios o ilegales.",
        "El recurso de amparo es la garantía constitucional que resguarda la libertad personal y la seguridad individual."
      ]
    },

    // Banco de ELEMENTOS AJENOS para las proposiciones FALSAS de las preguntas de
    // combinación (mutación simple): son elementos verosímiles pero NO exigidos por
    // la institución de cada materia. Nunca aparecen verbatim en el apunte (guardrail).
    _FALSE_ELEMENTS: {
      civil: [
        "la inscripción en el Registro Conservatorio de Bienes Raíces",
        "la solemnidad de escritura pública en todos los casos",
        "la entrega material de la cosa con indemnización previa"
      ],
      procesal: [
        "la comparecencia personal obligatoria de las partes ante el tribunal",
        "la consignación previa de una caución para toda gestión",
        "la inscripción del acto en el Registro Civil"
      ],
      constitucional: [
        "la aprobación previa del Consejo de Estado para su validez",
        "la declaración jurada ante notario del interesado",
        "la inscripción en el Registro Civil para su perfeccionamiento"
      ]
    },

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
     * Clasificador heurístico ponderado de la naturaleza de la cédula (METADATO).
     * Se conserva v7.11 para el badge del quiz y para la futura etapa de preguntas
     * de caso; la generación v7.17 es siempre dogmática.
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

    // ================================================================
    // NORMALIZACIÓN Y BIGRAMAS (para anclaje al apunte y homogeneidad)
    // ================================================================

    _normalize(s) {
      return (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9áéíóúñ\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    },

    _bigrams(s) {
      const words = this._normalize(s).split(" ").filter(w => w.length > 1);
      const out = new Set();
      for (let i = 0; i < words.length - 1; i++) out.add(`${words[i]} ${words[i + 1]}`);
      return out;
    },

    // ================================================================
    // EXTRACCIÓN DE CONTENIDO DESDE EL TEXTO REAL DEL APUNTE
    // ================================================================

    /**
     * Limpia una oración/enunciado crudo del markdown del apunte.
     * - stripLabel=true  : elimina prefijos "Etiqueta:" (necesario en definiciones).
     * - stripLabel=false : conserva la etiqueta (auxiliar en características).
     */
    _cleanSentence(raw, stripLabel) {
      if (!raw || typeof raw !== "string") return "";
      let s = raw.trim();
      s = s.replace(/^#+\s*/, "").trim();
      s = s.replace(/^[-*•]\s+/, "").trim();
      s = s.replace(/^\*{1,2}\s*/, "").replace(/\s*\*{1,2}$/, "").trim();
      s = s.replace(/[*_]/g, "").trim();
      s = s.replace(/^[„“”""'']+|[„“”""'']+$/g, "").trim();
      s = s.replace(/^(\d+(?:\.\d+)*\.?)\s*/, "").trim();
      if (stripLabel && /^.{1,60}:\s+/.test(s)) {
        s = s.replace(/^.{1,60}?:\s+/, "").trim();
      }
      s = s.replace(/\s*\([^)]*\b(?:art|n[°ºo]|cc|cpc|cot|cpr|ley|inc)\b[^)]*\)/gi, "").trim();
      // Autorra: si queda un cierre de paréntesis sin apertura (fragmento de cita),
      // únicamente se elimina el cierre residual al final de la oración.
      if ((s.match(/\(/g) || []).length < (s.match(/\)/g) || []).length) {
        s = s.replace(/\)+$/, "").trim();
      }
      s = s.replace(/[„“”""']+/g, "").trim();
      s = s.replace(/[.;]\s*$/, "").trim();
      s = s.replace(/\s+/g, " ").trim();
      return s.slice(0, 300);
    },

    _splitSentences(content) {
      if (!content || typeof content !== "string") return [];
      const out = [];
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const tokens = line.split(/\s+/);
        let buf = "";
        for (let i = 0; i < tokens.length; i++) {
          const tok = tokens[i];
          buf = buf ? `${buf} ${tok}` : tok;
          const next = tokens[i + 1];
          const cleanTok = tok.replace(/^[\[(]/, "");
          const isAbbrev = /^(?:Art\.?|Arts?\.?|N(?:°|º|\.)?\d*|inc\.?|(?:p\.)?ej\.?|etc\.?|S\.?S\.?)$/i.test(cleanTok);
          if (!isAbbrev && /[.!?][)"»]?$/.test(tok) && next && /^[A-ZÁÉÍÓÚÑ"“(\d]/.test(next)) {
            out.push(buf.trim());
            buf = "";
          }
        }
        if (buf.trim()) out.push(buf.trim());
      }
      return out.filter(s => s.length >= 24);
    },

    _extractDefinitions(content) {
      if (!content) return [];
      const marker = /\b(?:se define|consiste en|se entiende por|se caracteriza|se concibe|concibe|designa|constituye|es la tenencia de|es el derecho |es el acto |es la relaci[oó]n|es la manifestaci[oó]n|es el conjunto|es la instituci[oó]n|es el instituto|son las |son los |son un |son una |son defensas)\b/i;
      const candidates = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 60 && s.length <= 300 && marker.test(s));
      const unique = [];
      const seen = new Set();
      candidates.sort((a, b) => b.length - a.length);
      candidates.forEach(d => {
        const k = this._normalize(d);
        if (!seen.has(k)) { seen.add(k); unique.push(d); }
      });
      return unique.slice(0, 3);
    },

    _titleRoot(title) {
      const norm = this._normalize(title).replace(/[^\w\s]/g, " ").split(" ").filter(w =>
        w.length >= 4 && !/^(sobre|segun|según|cual|parte|teoria|teoría|regla|reglas|aspecto|aspectos|concepto|definicion|definición)$/.test(w)
      );
      return norm[0] || "";
    },

    _fallbackAnchor(content, root) {
      const sentences = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 80 && s.length <= 300 && !/secci[oó]n|cap[ií]tulo|t[ií]tulo\b/i.test(s));
      if (root) {
        const normRoot = this._normalize(root);
        const withRoot = sentences.find(s => this._normalize(s).includes(normRoot));
        if (withRoot) return withRoot;
      }
      if (sentences.length) return sentences.sort((a, b) => b.length - a.length)[0];
      // Degradación controlada: solo si no existe oración sustantiva (mínimo 50)
      const shorter = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 50 && s.length <= 300);
      if (shorter.length) return shorter.sort((a, b) => b.length - a.length)[0];
      const rough = this._cleanSentence((content || "").slice(0, 300), true);
      return rough.length >= 40 ? rough : "";
    },

    /**
     * Si el ancla/definición es demasiado breve (< 90 caracteres), la extiende
     * con otra oración real del apunte para formar una proposición desarrollada.
     */
    _ensureSubstantive(base, content) {
      if (!base) return base;
      if (base.length >= 90) return base;
      if (!content) return base;
      const candidates = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 50 && s.length <= 300 && this._normalize(s) !== this._normalize(base));
      const pick = candidates.sort((a, b) => b.length - a.length)[0];
      if (pick) {
        const joined = `${base}; ${pick}`;
        if (joined.length > base.length + 30) return this._limitTo(joined, 300);
      }
      return base;
    },

    _extractTraits(content) {
      if (!content) return [];
      const items = [];
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const m = line.match(/^[-*•]\s+(.+)$/) || line.match(/^\d+[.)]\s+(.+)$/) || line.match(/^\*{1,2}\d+\.\*{1,2}\s+(.+)$/) || line.match(/^[a-z][.)]\s+(.+)$/i);
        if (m) {
          const item = this._cleanSentence(m[1], false);
          if (item.length >= 20 && item.length <= 170) items.push(item);
        }
      }
      if (items.length < 3) {
        const marker = /\b(?:se caracteriza|caracter[íi]stic|requisito|elemento|principio|comprende|constituye|postula)\b/i;
        const sentences = this._splitSentences(content).map(s => this._cleanSentence(s, false));
        for (const s of sentences) {
          if (marker.test(s) && s.length >= 40 && s.length <= 170 && items.length < 6) items.push(s);
        }
      }
      const unique = [];
      const seen = new Set();
      items.forEach(i => {
        const k = this._normalize(i);
        if (!seen.has(k)) { seen.add(k); unique.push(i); }
      });
      return unique.slice(0, 6);
    },

    _extractPlazo(content) {
      if (!content) return null;
      const re = /(?:plazo|t[ée]rmino|termino)[^.\n]{0,90}?(\d{1,3})\s*d[ií]as?(?:\s*(h[aá]biles|corridos))?/gi;
      const matches = [];
      let m;
      while ((m = re.exec(content)) !== null) {
        matches.push({ days: parseInt(m[1], 10), unitRaw: m[2] || "" });
      }
      if (!matches.length) return null;
      const hab = matches.filter(x => /h[aá]bil/i.test(x.unitRaw));
      const chosen = hab[0] || matches[0];
      const days = chosen.days;
      if (!Number.isInteger(days) || days <= 0) return null;
      const unit = /corrid/i.test(chosen.unitRaw) ? "corridos" : "hábiles";
      return { days, unit };
    },

    /** Plazo expresado en años o meses (p. ej. prescripción, plazos de fondo). */
    _extractPlazoAnos(content) {
      if (!content) return null;
      const re = /(?:plazo|t[ée]rmino|prescripci[oó]n|duracion|duraci[oó]n)[^.\n]{0,80}?(\d{1,2})\s*(años?|meses?)/gi;
      const matches = [];
      let m;
      while ((m = re.exec(content)) !== null) {
        const value = parseInt(m[1], 10);
        const unitRaw = m[2].toLowerCase();
        if (Number.isInteger(value) && value > 0) {
          matches.push({ value, unit: unitRaw.startsWith("a") ? "años" : "meses" });
        }
      }
      if (!matches.length) return null;
      const pref = matches.find(x => x.unit === "años") || matches[0];
      return { value: pref.value, unit: pref.unit };
    },

    _buildContext(topic) {
      const content = (topic && topic.content) ? String(topic.content) : "";
      const cleanTitle = (topic && (topic.cleanTitle || topic.title)) || "la institución";
      const subject = (topic && topic.subject) || "civil";
      const defs = this._extractDefinitions(content);
      const traits = this._extractTraits(content);
      const t0 = this._titleRoot(cleanTitle);
      const anchor = defs[0] || this._fallbackAnchor(content, t0) || "";
      const def = anchor.length >= 90 ? anchor : (this._ensureSubstantive(anchor, content) || anchor);
      return { content, cleanTitle, subject, def, defs, traits, t0, afines: defs.slice(1) };
    },

    // ================================================================
    // MANIPULACIÓN DE LONGITUD (recorte a cláusulas breves y claras)
    // ================================================================

    _limitTo(s, max) {
      if (!s || s.length <= max) return s || "";
      let cut = s.slice(0, max);
      const lastComma = cut.lastIndexOf(",");
      const lastSpace = cut.lastIndexOf(" ");
      const at = lastComma > max * 0.5 ? lastComma : lastSpace;
      if (at > max * 0.45) cut = cut.slice(0, at);
      return cut.replace(/[,;:\s]+$/, "").trim();
    },

    // Parámetro de formato desde EXAM_STRUCTURE_GRAMMAR (compilado desde
    // MODELOS_DE_PRUEBA/); en ausencia de la gramática se usa el fallback.
    _gparam(key, fallback) {
      const g = grammarOrDefault(root);
      const v = g && g[key];
      return typeof v === "number" && isFinite(v) ? v : fallback;
    },

    _truncateAtComma(s, k) {
      if (!s) return "";
      const positions = [];
      for (let i = 0; i < s.length; i++) if (s[i] === "," || s[i] === ";") positions.push(i);
      if (positions.length) {
        const targetIdx = Math.min(positions.length, k);
        let idx = positions[targetIdx - 1];
        // Evita cláusulas mutiladas: exige un mínimo sustancial antes del corte
        const minSeg = Math.max(25, Math.floor(s.length * 0.24));
        let guard = targetIdx;
        while (idx < minSeg && guard < positions.length) { idx = positions[guard]; guard++; }
        if (idx >= minSeg) return s.slice(0, idx).replace(/[,;\s]+$/, "").trim();
      }
      const frac = k === 1 ? 0.5 : 0.7;
      return s.slice(0, Math.max(20, Math.floor(s.length * frac))).replace(/[,;\s]+$/, "").trim();
    },

    _afinFor(subject) {
      const bank = this._AFIN_BANK[subject] || this._AFIN_BANK.civil;
      return bank[0] || "";
    },

    _afinTailClause(afin) {
      if (!afin) return "sin perjuicio de las reglas particulares que la ley establece para cada caso";
      const main = afin.split(";").map(p => p.trim()).filter(Boolean).pop();
      const pieces = (main || "").split(",").map(p => p.trim()).filter(Boolean);
      const tail = pieces.length >= 2 ? pieces[pieces.length - 1] : (main || "");
      return tail.replace(/\s*\.\s*$/, "").trim() || "sin perjuicio de las reglas particulares que la ley establece para cada caso";
    },

    _plural(n, singular, plural) {
      return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
    },

    // ================================================================
    // FORMATO DE COMBINACIÓN I-II-III-IV (v7.17)
    // ================================================================

    /** Construye el texto canónico de una combinación de proposiciones. */
    _romanCombo(positions) {
      const labels = ["I", "II", "III", "IV"];
      const names = positions.map(p => labels[p] || "").filter(Boolean);
      if (!names.length) return "";
      if (names.length === 1) return `Solo ${names[0]}`;
      if (names.length === 2) return `${names[0]} y ${names[1]}`;
      return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
    },

    /** Extrae los textos de las proposiciones I-IV del enunciado de una pregunta. */
    _statementTexts(questionText) {
      if (!questionText) return [];
      const out = [];
      const lines = String(questionText).split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^([IVX]+)\.\s+(.+)$/);
        if (m && m[2].trim()) out.push(m[2].trim());
      }
      return out;
    },

    /** Pautas mínimas de solución (contrato 24.4: >= 150 chars). */
    _solutionMin(text, min) {
      let s = (text || "").trim();
      const pads = [
        " La combinación correcta se desprende del desarrollo dogmático de la cédula, sin elementos ajenos a ella.",
        " Esta conclusión se verifica confrontando cada proposición con el texto del apunte, descartando cualquier elemento que la cédula no exige."
      ];
      let i = 0;
      while (s.length < min && i < pads.length) { s = s + pads[i]; i++; }
      return s;
    },

    _extractClauseItems(content) {
      if (!content) return [];
      const items = [];
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const m = line.match(/^[-*•]\s+(.+)$/) || line.match(/^\d+[.)]\s+(.+)$/) || line.match(/^\*{1,2}\d+\.\*{1,2}\s+(.+)$/);
        if (!m) continue;
        const raw = m[1];
        // Las cabeceras «**Etiqueta:**» no son cláusulas sustantivas: se descartan
        if (/:$/.test(raw.trim())) continue;
        const clean = this._cleanSentence(raw, true);
        if (clean.length >= 20 && clean.length <= 200) items.push({ raw, clean });
      }
      return items;
    },

    /** Título corto para el enunciado: omite los paréntesis explicativos. */
    _stripParenthetical(s) {
      return String(s || "").replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    },

    /**
     * Requisitos: viñetas/cláusulas del apunte que enuncian requisitos, condiciones,
     * presupuestos o exigencias. Retorna cláusulas cortas (>=3) o [].
     */
    _extractRequisitos(content) {
      if (!content) return [];
      const marker = /\b(?:requisito|presupuesto|condici[oó]n(?:es)? de|se requiere|se exige|es necesario|es indispensable|para su validez|para su existencia|necesario para la (?:validez|existencia)|se debe satisfacer|debe satisfacer)\b/i;
      const fromItems = this._extractClauseItems(content)
        .filter(x => marker.test(x.raw) || marker.test(x.clean))
        .map(x => x.clean)
        .filter(s => s.length >= 20);
      const out = [];
      const seen = new Set();
      for (const i of fromItems) {
        const k = this._normalize(i);
        if (!seen.has(k)) { seen.add(k); out.push(i); }
      }
      if (out.length >= 3) return out.slice(0, 6);
      const fromSentences = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 40 && s.length <= 200 && /\b(?:requisitos|presupuestos|se requiere|se exige|es necesario|debe)\b/i.test(s));
      for (const s of fromSentences) {
        const k = this._normalize(s);
        if (!seen.has(k)) { seen.add(k); out.push(s); }
      }
      return out.slice(0, 6);
    },

    /**
     * Elementos del concepto: cláusulas/enumeraciones que integran el concepto
     * (elementos, constitutivos, componentes, partes). Retorna >=3 o [].
     */
    _extractElementos(content) {
      if (!content) return [];
      const marker = /\b(?:elemento|elementos|constitutiv|componente|integran|se compone de|comprende|constituye|parte del concepto|se integra)\b/i;
      const fromItems = this._extractClauseItems(content)
        .filter(x => marker.test(x.raw) || marker.test(x.clean))
        .map(x => x.clean)
        .filter(s => s.length >= 20);
      const out = [];
      const seen = new Set();
      for (const i of fromItems) {
        const k = this._normalize(i);
        if (!seen.has(k)) { seen.add(k); out.push(i); }
      }
      if (out.length >= 3) return out.slice(0, 6);
      const fromSentences = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 40 && s.length <= 200 && /\b(?:elementos|constitutivos|componentes|integran|se compone de)\b/i.test(s));
      for (const s of fromSentences) {
        const k = this._normalize(s);
        if (!seen.has(k)) { seen.add(k); out.push(s); }
      }
      return out.slice(0, 6);
    },

    /**
     * Fabricación determinista de la proposición FALSA (mutación simple por medio
     * del banco de elementos ajenos). Nunca verbatim en el apunte, nunca duplicada
     * con las verdaderas, cero tokens absurdos. Retorna cláusula corta o null.
     */
    _componentFalsa(tres, ctx) {
      const bank = this._FALSE_ELEMENTS[ctx.subject] || this._FALSE_ELEMENTS.civil;
      const contentNorm = this._normalize(ctx.content || "");
      const rng = mulberry32(fnv1a(`${ctx.content || ""}|falsa|${ctx.cleanTitle}`));
      const shuffled = shuffleArray(bank.slice(), rng);
      for (const f of shuffled) {
        const short = this._limitTo(this._cleanSentence(String(f), true), 70);
        if (!short || short.length < 20) continue;
        const fNorm = this._normalize(short);
        if (!fNorm) continue;
        if (contentNorm.includes(fNorm)) continue;                       // anti-verbatim
        if (this._BANNED_ABSURD.some(b => short.toLowerCase().includes(b))) continue;
        if (tres.some(t => this._normalize(t) === fNorm)) continue;
        return short;
      }
      return null;
    },

    /**
     * Constructor único del arquetipo de COMBINACIÓN I-IV (requisitos,
     * características o elementos del concepto). 3 proposiciones verdaderas + 1
     * falsa; la correcta es la combinación que incluye todas las verdaderas y
     * ninguna falsa; cada distractor incluye la falsa u omite al menos una verdadera.
     */
    _buildCombinacionSpec(ctx, cites, kind, kindFull, questionIntro, clauses, primary) {
      if (!Array.isArray(clauses) || clauses.length < 3) return null;
      const tres = clauses.slice(0, 3)
        .map(c => this._limitTo(this._cleanSentence(String(c), true), 70))
        .filter(s => s && s.length >= 20 && !/:$/.test(s));
      if (tres.length < 3) return null;
      const falsa = this._componentFalsa(tres, ctx);
      if (!falsa) return null;
      const instituto = ctx.cleanTitle;
      const labels = ["I", "II", "III", "IV"];
      const stmts = [tres[0], tres[1], tres[2], falsa];

      // Orden determinista de presentación de las proposiciones (barajado sembrado)
      const rng = mulberry32(fnv1a(`${ctx.content || ""}|${kind}|combo`));
      const order = shuffleArray([0, 1, 2, 3], rng);
      const presented = order.map((origIdx, pos) => ({
        label: labels[pos],
        text: stmts[origIdx],
        isTrue: origIdx < 3
      }));
      const trueLblPos = presented.map((p, i) => (p.isTrue ? i : -1)).filter(i => i >= 0);
      const falsePos = presented.findIndex(p => !p.isTrue);
      const correctCombo = this._romanCombo(trueLblPos.slice().sort((a, b) => a - b));
      const j = trueLblPos.slice(0, 2);

      const combos = new Set([correctCombo]);
      const cands = [
        `Solo ${labels[falsePos]}`,
        this._romanCombo([j[0], falsePos].sort((a, b) => a - b)),
        this._romanCombo([j[1], falsePos].sort((a, b) => a - b)),
        this._romanCombo([j[0], j[1]].sort((a, b) => a - b))
      ];
      const distractors = [];
      for (const c of cands) {
        if (!c || combos.has(c)) continue;
        combos.add(c);
        distractors.push(c);
        if (distractors.length === 4) break;
      }
      while (distractors.length < 4) {
        // Red de seguridad (no debería alcanzarse con 4 proposiciones)
        const r = Math.floor(rng() * [1, 2, 3].length);
        const size = [1, 2, 3][r];
        const pool = [0, 1, 2, 3];
        const picked = shuffleArray(pool, rng).slice(0, size).sort((a, b) => a - b);
        const combo = this._romanCombo(picked);
        if (!combos.has(combo) && combo) {
          combos.add(combo);
          distractors.push(combo);
        }
      }
      // Asegurar que cada distractor incluya la falsa o omita al menos una verdadera
      // (y respete el tope de longitud de opción que dicta la gramática estructural)
      const maxComboOptChars = this._gparam("maxCombinacionOptionChars", 120);
      const validDist = distractors.filter(d => {
        if (d.length > maxComboOptChars) return false;
        const set = this._comboToSet(d, labels.length);
        return set.has(falsePos) || trueLblPos.some(p => !set.has(p));
      });
      if (validDist.length < 4) return null;

      const statementLines = presented.map(p => `${p.label}. ${p.text}`);
      const enunciado = `Según el apunte, ${questionIntro}`;
      const questionText = `${enunciado}\n${statementLines.join("\n")}`;

      const trueLabels = trueLblPos.map(i => labels[i]);
      const falseLabel = labels[falsePos];
      const falseText = presented[falsePos].text;
      const listTrue = trueLabels.join(", ");
      const solucionDogmatica = this._solutionMin(
        `En ${instituto}, el apunte desarrolla los ${kindFull} señalando las proposiciones ${listTrue} como correctas: cada una de ellas se desprende literalmente del texto de la cédula (${tres.join("; ")}). En cambio, la proposición ${falseLabel} es falsa, pues introduce un elemento que la cédula no exige (${falseText}). Conclusión: la alternativa correcta es ${correctCombo}.`,
        150
      );

      return {
        nature: "dogmatic",
        format: "combinacion",
        questionText,
        correctText: correctCombo,
        distractor1: validDist[0],
        distractor2: validDist[1],
        distractor3: validDist[2],
        distractor4: validDist[3],
        solucionDogmatica,
        pauta: `Identificación de los ${kindFull} de ${instituto} conforme a la cédula y descarte de elementos ajenos.`,
        sourceCitations: primary ? cites.primary : cites.secondary
      };
    },

    /** Convierte «Solo I», «I y II», «I, II y III» a conjunto de posiciones. */
    _comboToSet(combo, maxLabels) {
      const set = new Set();
      if (!combo) return set;
      const labels = ["I", "II", "III", "IV"];
      const composite = combo.replace(/^Solo\s+/i, "");
      const parts = composite.split(/[,y\s]+/).filter(Boolean);
      for (const p of parts) {
        const idx = labels.indexOf(p.toUpperCase());
        if (idx >= 0 && idx < maxLabels) set.add(idx);
      }
      return set;
    },

    /** A - Requisitos en formato combinación I-IV. */
    _specCombinacionRequisitos(ctx, cites, clauses) {
      const ref = this._limitTo(this._stripParenthetical(ctx.cleanTitle), 64);
      return this._buildCombinacionSpec(
        ctx, cites, "requisitos", "requisitos",
        `¿cuáles de los siguientes son requisitos de ${ref}?`,
        clauses, true
      );
    },

    /** B - Características en formato combinación I-IV. */
    _specCombinacionCaracteristicas(ctx, cites, clauses) {
      if (!Array.isArray(clauses) || clauses.length < 3) return null;
      const ref = this._limitTo(this._stripParenthetical(ctx.cleanTitle), 64);
      return this._buildCombinacionSpec(
        ctx, cites, "caracteristicas", "características",
        `¿cuáles de las siguientes son características de ${ref}?`,
        clauses, true
      );
    },

    /** C - Elementos del concepto en formato combinación I-IV. */
    _specCombinacionElementos(ctx, cites, clauses) {
      if (!Array.isArray(clauses) || clauses.length < 3) return null;
      const ref = this._limitTo(this._stripParenthetical(ctx.cleanTitle), 64);
      return this._buildCombinacionSpec(
        ctx, cites, "elementos", "elementos",
        `identifica los elementos que integran el concepto de ${ref}:`,
        clauses, false
      );
    },

    /** D - Plazo simple numérico: «¿De cuántos días/años es el plazo?». */
    _specPlazoSimple(ctx, cites) {
      const plaz = this._extractPlazo(ctx.content) || this._extractPlazoAnos(ctx.content);
      if (!plaz) return null;
      // Normalización: `_extractPlazo` expone {days, unit}; `_extractPlazoAnos` expone {value, unit}
      const value = Number.isInteger(plaz.value) ? plaz.value : plaz.days;
      if (!Number.isInteger(value) || value <= 0) return null;
      const instituto = ctx.cleanTitle;
      const isAnual = plaz.unit === "años";
      const isMensual = plaz.unit === "meses";
      const isDiario = !isAnual && !isMensual; // hábiles | corridos
      const unitSingular = { años: "año", meses: "mes" }[plaz.unit] || "día";
      const unitPlural = isAnual ? "años" : (isMensual ? "meses" : "días");
      const periodo = unitPlural; // palabra del enunciado: días | años | meses
      const correct = isDiario
        ? `${this._plural(value, "día", "días")} ${plaz.unit}`
        : this._plural(value, unitSingular, unitPlural);
      const unitLabel = isDiario ? `${unitPlural} ${plaz.unit}` : unitPlural;
      const flip = isDiario
        ? (plaz.unit === "hábiles" ? "corridos" : "hábiles")
        : (isAnual ? "meses" : "años");

      // Distractores numéricos simples y deterministas (número alterado y/o
      // modalidad hábil<->corrida / años<->meses). Siempre != correct.
      const cands = [];
      const add = (num, word) => {
        const text = isDiario
          ? `${this._plural(num, "día", "días")} ${word}`
          : this._plural(num, { años: "año", meses: "mes" }[word] || word, word);
        if (text !== correct) cands.push(text);
      };
      if (isAnual) {
        add(Math.max(1, value - 3), "años");
        add(value, "meses");
        add(value + 5, "años");
        add(value + 1, "años");
        add(Math.max(1, value + 9), "años");
        add(Math.max(1, value + 2), "meses");
      } else if (isMensual) {
        add(Math.max(1, value - 2), "meses");
        add(value, "años");
        add(value + 6, "meses");
        add(value + 1, "meses");
        add(value + 9, "meses");
        add(value + 2, "años");
      } else {
        add(Math.max(2, value - 8), plaz.unit);
        add(value, flip);
        add(value + 12, plaz.unit);
        add(Math.max(2, value - 3), flip);
        add(Math.max(2, value + 20), plaz.unit);
        add(Math.max(2, value - 5), flip);
        add(Math.max(2, value + 25), plaz.unit);
      }

      const seen = new Set([correct]);
      const distractors = [];
      for (const c of cands) {
        if (!c || seen.has(c)) continue;
        seen.add(c);
        distractors.push(c);
        if (distractors.length === 4) break;
      }
      // Red de seguridad OPERATIVA anti-cuelgue: valores crecientes distintos, con
      // tope duro; jamás un bucle sin fin.
      let extra = value + 40;
      let guard = 0;
      while (distractors.length < 4 && guard < 40) {
        const cand = isDiario
          ? `${this._plural(Math.max(2, extra), "día", "días")} ${flip}`
          : this._plural(Math.max(1, extra), unitSingular, unitPlural);
        if (!seen.has(cand)) { seen.add(cand); distractors.push(cand); }
        extra += 7;
        guard++;
      }
      if (distractors.length < 4) return null;

      const solucionDogmatica = this._solutionMin(
        `En materia de ${instituto}, el apunte establece un plazo de ${correct} y esa es la alternativa correcta. Los distractores modifican el número de ${periodo} o reemplazan la modalidad del cómputo (${flip} en lugar de ${unitLabel}), desvirtuando la regla de la cédula. Conclusión: el plazo fijado por el apunte es de ${correct}.`,
        150
      );
      return {
        nature: "dogmatic",
        format: "plazo",
        questionText: `Según el apunte, ¿de cuántos ${periodo} es el plazo de ${instituto}?`,
        correctText: correct,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: `Reconocimiento del plazo literal fijado en la cédula para ${instituto}.`,
        sourceCitations: cites.secondary
      };
    },

    /** E - Definición corta y clara (relleno), correcta <= 155 chars. */
    _specDefinicionSimple(ctx, cites, variant) {
      const defRaw = ctx.def || this._fallbackAnchor(ctx.content, ctx.t0);
      if (!defRaw) return null;
      const maxDefOpt = this._gparam("maxDefinicionOptionChars", 160);
      const def = defRaw.length > 155 ? this._limitTo(defRaw, 155) : defRaw;
      if (!def || def.length < 30) return null;
      const instituto = ctx.cleanTitle;
      const t1 = this._truncateAtComma(def, 1) || def.slice(0, Math.max(30, Math.floor(def.length * 0.6))).replace(/[,;\s]+$/, "").trim();
      const afin = this._limitTo(ctx.afines[0] || this._afinFor(ctx.subject), 130);
      const d3 = this._limitTo(`${t1}, ${this._afinTailClause(afin)}`, maxDefOpt);
      const d4set = [
        `No se trata de ${instituto}: el apunte regula un instituto afín con presupuestos y efectos distintos.`,
        `No constituye ${instituto} en los términos señalados: la cédula regula una figura distinta con régimen propio.`,
        `Carece de toda regulación en el apunte y se rige exclusivamente por la costumbre del foro.`,
        `Abarca una materia completamente ajena a ${instituto}, sin relación con lo desarrollado en la cédula.`
      ];
      const d4 = this._limitTo(d4set[variant % d4set.length], maxDefOpt);
      const v = variant % 4;
      const questionTexts = [
        `¿Qué es ${instituto}?`,
        `Según el apunte, ${instituto} es:`,
        `¿Cuál de las siguientes proposiciones define correctamente ${instituto}?`,
        `Conforme a la cédula, la definición de ${instituto} es:`
      ];
      const solucionDogmatica = `La opción correcta reproduce, de forma sintética pero fiel, la definición que el apunte desarrolla para ${instituto}. Las restantes alternativas omiten cláusulas esenciales, presentan la definición de una institución afín o niegan la regulación que la cédula establece. Conclusión: la proposición que refleja el contenido del apunte es la correcta.`;
      return {
        nature: "dogmatic",
        format: "definicion",
        questionText: questionTexts[v],
        correctText: def,
        distractor1: t1 !== def ? t1 : d3,
        distractor2: afin !== def ? afin : d3,
        distractor3: d3,
        distractor4: d4,
        solucionDogmatica,
        pauta: `Precisión conceptual sobre la definición que desarrolla la cédula para ${instituto}.`,
        sourceCitations: v % 2 === 0 ? cites.primary : cites.secondary
      };
    },

    /**
     * (RESERVADO - Etapa de Casos, "los casos serán aparte").
     * Subsunción práctica: NO se emite en v7.17; se conserva para la próxima etapa.
     */
    _specCaso(ctx, cites, variant) {
      const base = ctx.def || this._fallbackAnchor(ctx.content, ctx.t0);
      if (!base) return null;
      const t1 = this._truncateAtComma(base, 2) || base;
      const afin = ctx.afines[0] || this._afinFor(ctx.subject);
      const dMix = (base.split(/[,.;]/)[0]) + ", " + this._afinTailClause(afin);
      const d2 = "el tribunal debe desestimar la pretensión por no configurarse el supuesto descrito en la cédula";
      const d3 = "la consecuencia jurídica queda diferida indefinidamente hasta el acuerdo posterior de las partes";
      const distractors = this._normalizeLengths(base, [t1, dMix, d2, d3]);
      const questionText = variant === 0
        ? `Caso práctico: en un litigio en que se discute ${ctx.cleanTitle}, conforme a lo desarrollado en el apunte la solución jurídicamente correcta es:`
        : `Supuesto práctico variado: acreditada la configuración de ${ctx.cleanTitle} según la cédula, el efecto jurídico que corresponde reconocer es:`;
      const solucionDogmatica = `El enunciado presenta un supuesto práctico de subsunción de ${ctx.cleanTitle}. La opción correcta aplica la regla de la cédula al caso y conserva sus elementos; los distractores introducen consecuencias ajenas al texto, contradicen el supuesto configurado o difieren la solución sin base en el apunte. Conclusión: la alternativa que subsume el supuesto conforme a la cédula es la correcta.`;
      return {
        nature: "case",
        format: "case",
        questionText,
        correctText: base,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "Capacidad de subsunción dogmática y descarte de soluciones sin respaldo en el apunte.",
        sourceCitations: variant === 0 ? cites.primary : cites.secondary
      };
    },

    /**
     * Construye exactamente 4 preguntas de grado para una cédula específica.
     * Perfil v7.17: mix dogmático simple (requisitos -> características ->
     * elementos -> plazo simple -> definición corta como relleno).
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

      // Generar 4 especificaciones de pregunta (mix dogmático simple v7.17)
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
        const relevantCitations = (spec.sourceCitations || []).filter(c => uniqueCitations.includes(c));

        return {
          id: qId,
          topicId: topicId,
          nature: spec.nature || "dogmatic",
          format: spec.format || "definicion",
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
     * Compone las 4 especificaciones de pregunta del perfil «Simple y Claro»
     * (v7.17): requisitos -> características -> elementos -> plazo simple ->
     * definición corta como relleno. Determinista, sin Math.random.
     */
    _getQuestionSpecsForNature(nature, cleanTitle, uniqueCitations, topic) {
      const ctx = this._buildContext(topic);
      const primaryCite = uniqueCitations.length > 0 ? [uniqueCitations[0]] : [];
      const secondaryCite = uniqueCitations.length > 1 ? [uniqueCitations[1]] : primaryCite;
      const cites = { primary: primaryCite, secondary: secondaryCite };

      // Deduplicación: una cláusula real no se reutiliza en dos preguntas distintas
      const used = new Set();
      const pick = (extractor, max) => {
        const out = [];
        const list = extractor.call(this, ctx.content) || [];
        for (const item of list) {
          const short = this._limitTo(this._cleanSentence(String(item), true), 70);
          if (!short || short.length < 20 || /:$/.test(short)) continue;
          const k = this._normalize(short);
          if (used.has(k)) continue;
          used.add(k);
          out.push(short);
          if (out.length >= (max || 3)) break;
        }
        return out;
      };

      const reqs = pick(this._extractRequisitos, 3);
      const traits = pick(this._extractTraits, 3);
      const elems = pick(this._extractElementos, 3);

      const specs = [];
      const add = (spec) => { if (spec) specs.push(spec); };

      add(this._specCombinacionRequisitos(ctx, cites, reqs));
      add(this._specCombinacionCaracteristicas(ctx, cites, traits));
      add(this._specCombinacionElementos(ctx, cites, elems));
      if (this._extractPlazo(ctx.content) || this._extractPlazoAnos(ctx.content)) {
        add(this._specPlazoSimple(ctx, cites));
      }

      // Relleno determinista: definición corta (variantes de enunciado/distractores)
      const usedTexts = new Set(specs.map(s => s.questionText));
      let guard = 0;
      let v = 0;
      while (specs.length < 4 && guard < 12) {
        const fb = this._specDefinicionSimple(ctx, cites, v);
        if (!fb) break;
        if (usedTexts.has(fb.questionText)) { v++; guard++; continue; }
        usedTexts.add(fb.questionText);
        specs.push(fb);
        v++;
        guard++;
      }

      // Último recurso incondicional (nunca debería alcanzarse con contenido real)
      while (specs.length < 4) {
        const instituto = ctx.cleanTitle;
        specs.push({
          nature: "dogmatic",
          format: "definicion",
          questionText: `Según el apunte, ${instituto} es:`,
          correctText: `La sección de la cédula dedicada a ${instituto} desarrolla su concepto, elementos y régimen conforme a las reglas que en ella se exponen.`,
          distractor1: `La sección de la cédula dedicada a ${instituto} desarrolla una materia distinta y ajena a la institución.`,
          distractor2: `La cédula omite por completo el tratamiento de ${instituto}, derivando su regulación a la costumbre.`,
          distractor3: `El régimen de ${instituto} se agota en una única regla aislada sin elementos ni supuestos.`,
          distractor4: `La cédula regula ${instituto} por el solo arbitrio de los jueces, sin reglas objetivas.`,
          solucionDogmatica: `El contenido de la cédula estructura el tratamiento de ${instituto} en sus elementos, requisitos y efectos. Las demás alternativas niegan esa estructura o la desvirtúan. Conclusión: la proposición que refleja el desarrollo de la sección es la correcta.`,
          pauta: "Dominio del contenido desarrollado en la sección respectiva.",
          sourceCitations: []
        });
      }

      return specs;
    },

    /**
     * Valida la consistencia formal y dogmática de las 4 preguntas generadas.
     * Retorna { valid, errors, warnings }. Los errores de contrato bloquean; las
     * warnings del perfil (absurdos, anclaje y longitudes) no bloquean la renderización.
     */
    validateSectionQuestions(topic, questions) {
      const errors = [];
      const warnings = [];
      if (!Array.isArray(questions) || questions.length !== 4) {
        errors.push(`Se esperaban exactamente 4 preguntas de grado, pero se obtuvieron ${questions ? questions.length : 0}.`);
        return { valid: false, errors, warnings };
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

        // ---- Perfil v7.17: warnings no bloqueantes ----
        if (q.questionText) {
          const lowEnunciado = q.questionText.toLowerCase();
          this._BANNED_ABSURD.forEach(b => {
            if (lowEnunciado.includes(b)) warnings.push(`Pregunta ${qNum}: el enunciado incluye el token prohibido de absurdos '${b}'.`);
          });
        }
        (q.options || []).forEach(o => {
          const lowOpt = (o.text || "").toLowerCase();
          this._BANNED_ABSURD.forEach(b => {
            if (lowOpt.includes(b)) warnings.push(`Pregunta ${qNum}: la alternativa incluye el token prohibido de absurdos '${b}'.`);
          });
        });

        // Anclaje: en combinación se verifica sobre las proposiciones del enunciado;
        // en definición/plazo sobre la alternativa correcta.
        const contentBigrams = this._bigrams(content);
        if (contentBigrams.size) {
          if (q.format === "combinacion") {
            const stmts = this._statementTexts(q.questionText);
            const anchored = stmts.some(s => [...this._bigrams(s)].some(b => contentBigrams.has(b)));
            if (!anchored) warnings.push(`Pregunta ${qNum}: las proposiciones no comparten bigramas con el contenido de la cédula (anclaje débil).`);
          } else {
            const correctOpt = (q.options || []).find(o => o.id === q.correctAnswer);
            if (correctOpt && correctOpt.text) {
              const shared = [...this._bigrams(correctOpt.text)].some(b => contentBigrams.has(b));
              if (!shared) warnings.push(`Pregunta ${qNum}: la alternativa correcta no comparte bigramas con el contenido de la cédula (anclaje débil).`);
            }
          }
        }

        // Longitud de opciones (perfil simple): combinación/plazo muy cortas,
        // definición corta; se advierte si una alternativa excede el tope.
        const maxOpt = q.format === "combinacion" || q.format === "plazo" ? 130 : 165;
        if (Array.isArray(q.options) && q.options.length) {
          const over = q.options.some(o => (o.text || "").length > maxOpt);
          if (over) warnings.push(`Pregunta ${qNum}: alguna alternativa supera los ${maxOpt} caracteres del perfil simple.`);
        }
      });

      return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
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
        console.warn(`[QuestionDeveloper] Errores de validación en cédula ${topicId}:`, val.errors);
      }
      if (val.warnings && val.warnings.length) {
        console.warn(`[QuestionDeveloper] Warning «Manejo» en cédula ${topicId}:`, val.warnings.slice(0, 3));
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