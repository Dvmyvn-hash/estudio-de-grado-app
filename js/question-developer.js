/**
 * DESARROLLADOR DE PREGUNTAS DEL AGENTE (QuestionDeveloper) - v7.15
 * Motor CONTENIDO-CONDUCTOR de perfil «Manejo»:
 * extrae definiciones, características, condiciones de procedencia, plazos y
 * tribunales del TEXTO REAL de cada cédula y construye arquetipos A-F anclados
 * al apunte (sin plantillas genéricas de relleno ni distractores absurdos).
 * Mantiene el contrato público v7.11 (detectNature, buildSectionQuestions,
 * validateSectionQuestions, getSectionQuestions, natureOf).
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
     * - stripLabel=false : conserva la etiqueta (necesario en características).
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

    _extractProcedenciaSentence(content) {
      if (!content) return null;
      const sentences = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 45 && s.length <= 300 && /\b(?:procede|no procede|se concede|es admisible|se deducir[aá]|se interpone|requiere)\b/i.test(s));
      return sentences.sort((a, b) => b.length - a.length)[0] || null;
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

    _extractTribunals(content) {
      if (!content) return [];
      const re = /\b(?:Juzgado de Letras del Trabajo|Juzgado de Letras|Juzgado de Garant[íi]a|Tribunal Oral en lo Penal|Tribunal de Juicio Oral|Corte de Apelaciones|Corte Suprema|Juzgado de Familia|Juzgado de Polic[íi]a Local|Tribunal de Letras)\b/gi;
      const out = [];
      const seen = new Set();
      let m;
      while ((m = re.exec(content)) !== null) {
        const t = m[0];
        if (!seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); }
      }
      return out;
    },

    _sentenceContaining(content, phrase) {
      if (!content || !phrase) return null;
      const low = phrase.toLowerCase();
      const found = this._splitSentences(content)
        .map(x => this._cleanSentence(x, true))
        .filter(x => x.length >= 60 && x.length <= 300 && x.toLowerCase().includes(low));
      return found.sort((a, b) => b.length - a.length)[0] || null;
    },

    _otherTribunals(main) {
      const bank = ["la Corte de Apelaciones", "la Corte Suprema", "el Juzgado de Letras", "el Juzgado de Familia", "el Tribunal Oral en lo Penal", "el Juzgado de Policía Local"];
      const mainLow = (main || "").toLowerCase();
      return bank.filter(b => {
        const bCore = b.replace(/^(la|el) /, "").toLowerCase();
        return !mainLow.includes(bCore) && !bCore.includes(mainLow);
      }).slice(0, 3);
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
    // MANIPULACIÓN DE LONGITUD (homogeneidad ± banda, correcto = más largo)
    // ================================================================

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

    _limitTo(s, max) {
      if (!s || s.length <= max) return s || "";
      let cut = s.slice(0, max);
      const lastComma = cut.lastIndexOf(",");
      const lastSpace = cut.lastIndexOf(" ");
      const at = lastComma > max * 0.5 ? lastComma : lastSpace;
      if (at > max * 0.45) cut = cut.slice(0, at);
      return cut.replace(/[,;:\s]+$/, "").trim();
    },

    _padTo(s, min) {
      if (!s) s = "";
      if (s.length >= min) return s.trim();
      let out = s.replace(/[.;,]\s*$/, "").trim();
      const pads = [
        " en los términos que desarrolla el apunte.",
        " conforme a las reglas generales expuestas en la cédula.",
        " según el alcance que la doctrina y la ley le reconocen en la materia.",
        " en el sentido que le atribuye el texto de la sección respectiva.",
        " según el desarrollo dogmático que la cédula consigna."
      ];
      let i = 0;
      while (out.length < min) {
        out = `${out} ${pads[i % pads.length].trim()}`.trim();
        i++;
        if (i > 24) break;
      }
      return out.trim();
    },

    /**
     * Ajusta las 4 opciones incorrectas hacia una longitud objetivo dentro de la
     * banda [0.72·L, 0.98·L] respecto de la correcta (L). La correcta queda como
     * la opción más desarrollada y las alternativas mantienen homogeneidad
     * sólida (ratio máx/mín <= ~1.4).
     */
    _normalizeLengths(correct, distractors) {
      const L = (correct || "").length;
      const low = Math.max(46, Math.floor(L * 0.72));
      const high = Math.max(low + 6, Math.floor(L * 0.98));
      const target = Math.max(low, Math.min(high, Math.floor((low + high) / 2)));
      const normC = this._normalize(correct);
      return distractors.map(d => {
        let s = (d || "").trim();
        if (s.length > target) s = this._limitTo(s, target);
        if (s.length < target) s = this._padTo(s, target);
        if (s.length > high) s = this._limitTo(s, high);
        if (s.length < low) s = this._padTo(s, low);
        s = s.replace(/[.,;\s]+$/, "").trim();
        if (this._normalize(s) === normC) s = `${s}, como lo desarrolla el apunte en su sección respectiva.`;
        return s;
      });
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

    _ordinal(n) {
      const map = { 1: "primera", 2: "segunda", 3: "tercera", 4: "cuarta", 5: "quinta", 6: "sexta", 7: "séptima", 8: "octava", 9: "novena", 10: "décima" };
      return map[n] || `${n}ª`;
    },

    /**
     * Cálculo aritmético determinista del vencimiento de un término.
     * Notificación supuesta: un día lunes (día 0). Los días corren desde el
     * día siguiente hábil (martes) excluyendo inhábiles, salvo el modo indicado.
     */
    _plazoOptions(days, unit) {
      const WD = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
      const comp = (mode) => {
        if (mode === "corridos") {
          return { name: WD[days % 7], week: Math.floor(days / 7) + 1 };
        }
        let n = 0;
        let d = mode === "conNotif" ? 0 : 1;
        let endWd = 0;
        let endDay = 0;
        while (n < days) {
          const wd = d % 7;
          const hab = (wd >= 0 && wd <= 4) || (mode === "sabado" && wd === 5);
          if (hab) { n++; endWd = wd; endDay = d; }
          d++;
        }
        return { name: WD[endWd], week: Math.floor(endDay / 7) + 1 };
      };
      const hab = comp("habiles");
      const conNotif = comp("conNotif");
      const sabado = comp("sabado");
      const corridos = comp("corridos");
      const ord = (w) => this._ordinal(w);

      if (unit === "corridos") {
        return {
          correct: `vence el ${corridos.name} de la ${ord(corridos.week)} semana siguiente, computándose ${days} días corridos sin excepción desde la notificación.`,
          d1: `vence el ${hab.name} de la ${ord(hab.week)} semana siguiente, contándose solo los días hábiles.`,
          d2: `vence el ${conNotif.name} de la ${ord(conNotif.week)} semana siguiente, excluyéndose los días inhábiles.`,
          d3: `vence el ${sabado.name} de la ${ord(sabado.week)} semana siguiente, contándose el sábado pero no el domingo.`,
          d4: `se prorroga automáticamente mientras la gestión no se evacue, sin término cierto ni efecto preclusivo.`
        };
      }
      return {
        correct: `vence el ${hab.name} de la ${ord(hab.week)} semana siguiente, computando ${days} días hábiles y descontando domingos y feriados, según la regla fatal del apunte.`,
        d1: `vence un día hábil antes, esto es el ${conNotif.name} de la ${ord(conNotif.week)} semana, porque se contó indebidamente el día de la notificación como primero del término.`,
        d2: `vence el ${corridos.name} de la ${ord(corridos.week)} semana siguiente, computando ${days} días corridos sin excluir sábados, domingos ni feriados.`,
        d3: `vence el ${sabado.name} de la ${ord(sabado.week)} semana siguiente, pues solo se excluyeron los domingos y se contó el sábado como día hábil.`,
        d4: `se prorroga automáticamente y sin término cierto mientras la gestión no se evacue, careciendo su vencimiento de efecto preclusivo alguno.`
      };
    },

    // ================================================================
    // ARQUETIPOS DE PREGUNTA (contenido-conductores)
    // ================================================================

    /**
     * A - Concepto mejor desarrollado: la correcta reproduce íntegramente la
     * definición del apunte; los distractores omiten cláusulas, mutan la
     * institución o le agregan un elemento ajeno.
     */
    _specConcepto(ctx, cites, variant) {
      const def = ctx.def;
      if (!def) return null;
      const instituto = ctx.cleanTitle;
      const t1 = this._truncateAtComma(def, 2) || def;
      const t2 = this._truncateAtComma(def, 1) || def;
      const afin = ctx.afines[0] || this._afinFor(ctx.subject);
      const lastComma = def.lastIndexOf(",");
      const d4 = (lastComma > 30 ? def.slice(0, lastComma) : def) + ", " + this._afinTailClause(afin);
      const distractors = this._normalizeLengths(def, [t1, t2, afin, d4]);
      const questionText = variant === 0
        ? `Según lo desarrollado en el apunte, ¿cuál de las siguientes definiciones de ${instituto} es la más completa y fiel a lo expuesto?`
        : `De acuerdo con la cédula, ¿cuál de las siguientes opciones reproduce correctamente el concepto de ${instituto} desarrollado en el apunte?`;
      const solucionDogmatica = `La opción correcta reproduce la definición de ${instituto} del apunte conservando todos los elementos que la desarrollan (la versión íntegra). Los distractores omiten cláusulas esenciales presentando versiones truncadas, confunden la institución con una afín o le agregan un elemento ajeno al texto de la cédula. Conclusión: la definición más completa, desarrollada y fiel al apunte es la correcta.`;
      return {
        nature: "dogmatic",
        questionText,
        correctText: def,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "El postulante debe reconocer la definición desarrollada del apunte y descartar versiones incompletas, mutadas o con elementos ajenos.",
        sourceCitations: variant === 0 ? cites.primary : cites.secondary
      };
    },

    /**
     * B - Características: la correcta enumera los rasgos reales del apunte;
     * los distractores omiten, reemplazan, alteran el orden o inoculan rasgos ajenos.
     */
    _specCaracteristicas(ctx, cites, variant) {
      const traits = (ctx.traits || []).slice(0, 3).map(t => this._limitTo(t, 120));
      if (traits.length < 2) return null;
      const instituto = ctx.cleanTitle;
      const correct = traits.join("; ");
      const foreign = ctx.afines[0] ? this._truncateAtComma(ctx.afines[0], 1) : this._afinFor(ctx.subject);
      const gen = "cualquier otra manifestación que las partes estipulen en conformidad a la ley";
      const build = (arr) => arr.join("; ");
      const d1 = build(traits.map((t, i) => (i === 1 ? foreign : t)));
      const d2 = build(traits.slice(0, traits.length - 1));
      const d3ts = traits.slice();
      d3ts[0] = gen;
      const d3 = build(d3ts.slice(0, traits.length - 1));
      const d4 = build(traits.slice().reverse());
      const distractors = this._normalizeLengths(correct, [d1, d2, d3, d4]);
      const questionText = variant === 0
        ? `De acuerdo con el desarrollo del apunte, ${instituto} se caracteriza por:`
        : `Conforme a la cédula, los elementos o características propios de ${instituto} son:`;
      const solucionDogmatica = `La opción correcta reúne las características que el apunte atribuye expresamente a ${instituto}. Los distractores omiten alguna de ellas, la reemplazan por un rasgo ajeno o intrascendente, o alteran su contenido y orden. Conclusión: el conjunto de características fiel al texto de la cédula es la opción correcta.`;
      return {
        nature: "dogmatic",
        questionText,
        correctText: correct,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "Dominio de las notas características desarrolladas en la cédula y descarte de rasgos ajenos.",
        sourceCitations: cites.primary
      };
    },

    /**
     * C - Procedencia: la correcta reproduce la condición/hipótesis de procedencia
     * del apunte; los distractores mutan la oportunidad, el agente o la fidelidad.
     */
    _specProcedencia(ctx, cites) {
      const pRaw = this._extractProcedenciaSentence(ctx.content) || ctx.def;
      if (!pRaw) return null;
      const p = this._ensureSubstantive(pRaw, ctx.content) || pRaw;
      const t1 = this._truncateAtComma(p, 2) || p;
      const afin = ctx.afines[0] || this._afinFor(ctx.subject);
      const dMix = (p.split(/[,.;]/)[0]) + ", " + this._afinTailClause(afin);
      const d2 = "la vía resulta procedente de oficio por el tribunal en cualquier estado del juicio y aun sin petición de parte";
      const d3 = "procede únicamente si las partes lo pactaron expresamente por escrito, careciendo de base legal en otro caso";
      const distractors = this._normalizeLengths(p, [t1, dMix, d2, d3]);
      const solucionDogmatica = `La opción correcta reproduce la condición de procedencia que la cédula fija para ${ctx.cleanTitle}, con sus presupuestos y oportunidad. Los distractores mutan la hipótesis (procedencia de oficio o pactada), la confunden con una institución afín o la presentan incompleta. Conclusión: la hipótesis de procedencia fiel al texto del apunte es la correcta.`;
      return {
        nature: "procedencia",
        questionText: `Según el apunte, ${ctx.cleanTitle} procede:`,
        correctText: p,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "Distinción entre admisibilidad formal y procedencia de fondo conforme a la cédula.",
        sourceCitations: cites.primary
      };
    },

    /**
     * D - Cómputo de plazos: supuesto aritmético real (días del apunte) con
     * alternativas de vencimiento calculadas determinísticamente.
     */
    _specPlazosCalculo(ctx, cites) {
      const plaz = this._extractPlazo(ctx.content);
      if (!plaz) return null;
      const { days, unit } = plaz;
      const opts = this._plazoOptions(days, unit);
      const distractors = this._normalizeLengths(opts.correct, [opts.d1, opts.d2, opts.d3, opts.d4]);
      const unitLabel = unit === "corridos" ? "corridos" : "hábiles";
      const reglaLabel = unit === "corridos" ? "contados por días corridos" : "sábados, domingos y feriados no corren";
      const solucionDogmatica = `El cómputo del término de ${days} días ${unitLabel} se rige por la regla del apunte: ${unit === "corridos" ? "se cuentan todos los días seguidos desde la notificación" : "no se cuenta el día de la notificación y corren solo los días hábiles, descontando domingos y feriados"}. Aplicando la regla al supuesto, el vencimiento recae en el día hábil y la semana indicados como correctos; los distractores alteran el punto de partida, el carácter hábil del cómputo o suponen prórrogas inexistentes. Conclusión: la alternativa correcta computa el plazo con la regla fatal del apunte.`;
      return {
        nature: "plazos",
        questionText: `Supuesto práctico conforme al régimen del apunte: notificada una resolución un día lunes, con un término de ${days} días ${unitLabel} (${reglaLabel}), el plazo:`,
        correctText: opts.correct,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "Destreza en el cómputo de plazos fatales con exclusión de días inhábiles.",
        sourceCitations: cites.secondary
      };
    },

    /**
     * D-bis - Regla de cómputo: la correcta es la regla textual del apunte sobre
     * cómo corre el término; los distractores la alteran o la niegan.
     */
    _specPlazosRegla(ctx, cites) {
      const ruleRaw = this._plazosRuleSentence(ctx.content) || ctx.def;
      if (!ruleRaw) return null;
      const rule = this._ensureSubstantive(ruleRaw, ctx.content) || ruleRaw;
      const t1 = this._truncateAtComma(rule, 2) || rule;
      const d2 = "los términos procesales se computan siempre de momento a momento sin excluir ningún día inhábil";
      const d3 = (rule.split(/[,.;]/)[0]) + " sin que medie plazo fatal alguno, pudiendo evacuarse la gestión en cualquier tiempo";
      const d4 = "todo plazo de días puede prorrogarse a voluntad de una sola de las partes sin intervención del tribunal";
      const distractors = this._normalizeLengths(rule, [t1, d2, d3, d4]);
      const solucionDogmatica = `La opción correcta reproduce la regla de cómputo del apunte para ${ctx.cleanTitle}, incluyendo el punto de partida, los días que corren y su carácter fatal. Los distractores alteran el cómputo (días corridos o de momento a momento), niegan la fatalidad del término o admiten prórrogas unilaterales inexistentes. Conclusión: la regla de cómputo fiel al apunte es la correcta.`;
      return {
        nature: "plazos",
        questionText: `Según la regla de cómputo desarrollada en el apunte, el término aplicable en ${ctx.cleanTitle}:`,
        correctText: rule,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "Manejo del cómputo, la fatalidad y la exclusión de días inhábiles.",
        sourceCitations: cites.primary
      };
    },

    _plazosRuleSentence(content) {
      if (!content) return null;
      const cleaned = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 45 && s.length <= 300 && !/(?:secci[oó]n|cap[ií]tulo|t[ií]tulo)\b/i.test(s));
      const long = (arr) => arr.sort((a, b) => b.length - a.length)[0];
      const tier1 = cleaned.filter(s => /\b(?:c[oó]mputo de|se computa|computado)\b/i.test(s));
      if (tier1.length) return long(tier1);
      const tier2 = cleaned.filter(s => /\b(?:t[ée]rmino|plazo)\b/i.test(s) && /d[ií]as h[aá]biles|d[ií]as corridos/i.test(s));
      if (tier2.length) return long(tier2);
      const tier3 = cleaned.filter(s => /\bfatal\b/i.test(s));
      if (tier3.length) return long(tier3);
      const anyHits = cleaned.filter(s => /\b(?:plazo|t[ée]rmino|termino|c[oó]mputo|h[aá]biles?)\b/i.test(s));
      return long(anyHits) || null;
    },

    /**
     * F - Competencia: la correcta es la oración de la cédula que identifica al
     * tribunal; los distractores atribuyen el conocimiento a tribunales diversos.
     */
    _specCompetencia(ctx, cites) {
      const tribs = this._extractTribunals(ctx.content);
      if (!tribs.length) return null;
      const baseRaw = this._sentenceContaining(ctx.content, tribs[0]);
      if (!baseRaw) return null;
      const base = this._ensureSubstantive(baseRaw, ctx.content) || baseRaw;
      const others = this._otherTribunals(tribs[0]);
      const distractors = this._normalizeLengths(base, [
        `el asunto se radica en ${others[0] || "un tribunal diverso"}, aun tratándose de la misma materia y cuantía`,
        `${others[1] || "el tribunal de alzada"} conoce siempre del asunto con prescindencia del fuero y la jerarquía`,
        `la elección del tribunal queda entregada a la voluntad exclusiva del demandante en su libelo`,
        `el conocimiento se somete forzosamente a ${others[2] || "un tribunal arbitral"}, sin sujeción a las reglas de la cédula`
      ]);
      const solucionDogmatica = `La opción correcta reproduce la regla de competencia del apunte para ${ctx.cleanTitle}, identificando el tribunal investido de jurisdicción para el asunto. Los distractores atribuyen el conocimiento a tribunales diversos, dejan su elección a la voluntad de las partes o prescinden de las reglas de radicación y fuero. Conclusión: la alternativa que fija el tribunal natural conforme a la cédula es la correcta.`;
      return {
        nature: "competencia",
        questionText: `En materia de ${ctx.cleanTitle}, el tribunal naturalmente competente señalado por la cédula es:`,
        correctText: base,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "Identificación del tribunal natural y las reglas de competencia absoluta.",
        sourceCitations: cites.primary
      };
    },

    /**
     * E2 - Reclamo de incompetencia (respaldado en una oración real del apunte).
     */
    _specCompetenciaAlt(ctx, cites) {
      const sentRaw = this._extractCompetenciaSentence(ctx.content);
      if (!sentRaw || sentRaw.length < 80) return null;
      const sent = this._ensureSubstantive(sentRaw, ctx.content) || sentRaw;
      const t1 = this._truncateAtComma(sent, 2) || sent;
      const afin = ctx.afines[0] || this._afinFor(ctx.subject);
      const dMix = (sent.split(/[,.;]/)[0]) + ", " + this._afinTailClause(afin);
      const ines = "el litigante afectado debe abstenerse de comparecer, operando la incompetencia de pleno derecho sin pronunciamiento judicial";
      const d4 = "la incompetencia solo puede alegarse una vez fallada la litis en segunda instancia";
      const distractors = this._normalizeLengths(sent, [t1, dMix, ines, d4]);
      const solucionDogmatica = `La opción correcta reproduce la vía que la cédula señala para reclamar la incompetencia en materia de ${ctx.cleanTitle}. Los distractores omiten el procedimiento (inhibitoria o declinatoria), mutan la institución o difieren la alegación a momentos procesales en que ya no cabe. Conclusión: la vía de reclamo de incompetencia fiel al apunte es la correcta.`;
      return {
        nature: "competencia",
        questionText: `Para reclamar la incompetencia del tribunal en una controversia relativa a ${ctx.cleanTitle}, el litigante afectado, según la cédula:`,
        correctText: sent,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "Conocimiento de las vías inhibitoria y declinatoria y su oportunidad procesal.",
        sourceCitations: cites.secondary
      };
    },

    _extractCompetenciaSentence(content) {
      if (!content) return null;
      const sentences = this._splitSentences(content)
        .map(s => this._cleanSentence(s, true))
        .filter(s => s.length >= 45 && s.length <= 300 && /\b(?:inhibitoria|declinatoria|incompetencia|pr[oó]rroga|radicaci[oó]n)\b/i.test(s));
      return sentences.sort((a, b) => b.length - a.length)[0] || null;
    },

    /**
     * Case - Subsunción práctica: la correcta aplica la regla del apunte al caso;
     * los distractores contradicen o difieren la consecuencia sin base.
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
     * E - Definición directa (respaldo robusto): correcta fiel al texto del apunte
     * con distractores truncados, afines, adicionados o vagos.
     */
    _specDefinicionDirecta(ctx, cites, variant) {
      const base = ctx.def || this._fallbackAnchor(ctx.content, ctx.t0);
      if (!base) return null;
      const v = variant % 2;
      const t1 = this._truncateAtComma(base, 1) || base;
      const afin = ctx.afines[0] || this._afinFor(ctx.subject);
      const dAdd = `${base}, ${this._afinTailClause(afin)}`;
      const distractors = this._normalizeLengths(base, [
        t1,
        afin,
        dAdd,
        "Es el instituto que regula la materia respectiva conforme al desarrollo de la cédula y las reglas generales del ordenamiento"
      ]);
      const questionText = v === 0
        ? `Según el apunte, ${ctx.cleanTitle} es:`
        : `Tratándose de ${ctx.cleanTitle}, ¿cuál de las siguientes proposiciones se ajusta a la cédula?`;
      const solucionDogmatica = `La opción correcta reproduce la formulación del apunte acerca de ${ctx.cleanTitle}. Los distractores presentan versiones truncadas o vagas, instituciones afines o elementos agregados que no constan en la cédula. Conclusión: la proposición fiel al texto del apunte es la correcta.`;
      return {
        nature: "dogmatic",
        questionText,
        correctText: base,
        distractor1: distractors[0],
        distractor2: distractors[1],
        distractor3: distractors[2],
        distractor4: distractors[3],
        solucionDogmatica,
        pauta: "Precisión conceptual directa sobre el contenido de la cédula.",
        sourceCitations: v === 0 ? cites.primary : cites.secondary
      };
    },

    _archetypeQueue(nature) {
      switch (nature) {
        case "procedencia":
          return ["_specProcedencia", "_specConcepto", "_specCaracteristicas", "_specDefinicionDirecta", "_specConceptoAlt"];
        case "competencia":
          return ["_specCompetencia", "_specConcepto", "_specCaracteristicas", "_specDefinicionDirecta", "_specCompetenciaAlt"];
        case "plazos":
          return ["_specPlazosCalculo", "_specPlazosRegla", "_specConcepto", "_specCaracteristicas", "_specDefinicionDirecta"];
        case "case":
          return ["_specCaso", "_specConcepto", "_specCasoAlt", "_specDefinicionDirecta", "_specCaracteristicas"];
        default:
          return ["_specConcepto", "_specCaracteristicas", "_specConceptoAlt", "_specDefinicionDirecta", "_specDefinicionDirectaAlt"];
      }
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
     * Compone las 4 especificaciones de pregunta (arquetipos A-F) a partir del
     * contenido real de la cédula, con rellenos deterministas de seguridad.
     */
    _getQuestionSpecsForNature(nature, cleanTitle, uniqueCitations, topic) {
      const ctx = this._buildContext(topic);
      const primaryCite = uniqueCitations.length > 0 ? [uniqueCitations[0]] : [];
      const secondaryCite = uniqueCitations.length > 1 ? [uniqueCitations[1]] : primaryCite;
      const cites = { primary: primaryCite, secondary: secondaryCite };

      const queue = this._archetypeQueue(nature);
      const specs = [];
      for (let i = 0; i < queue.length && specs.length < 4; i++) {
        const name = queue[i];
        let fn = this[name];
        let variant = 0;
        // Las variantes «Alt» se resuelven como el método base con variant=1,
        // salvo que exista un método propio con ese nombre exacto.
        if (typeof fn !== "function" && name.endsWith("Alt")) {
          const base = name.slice(0, -3);
          fn = this[base];
          variant = 1;
        }
        if (typeof fn !== "function") continue;
        let spec = null;
        try {
          spec = fn.call(this, ctx, cites, variant);
        } catch (e) {
          spec = null;
        }
        if (spec) {
          spec.sourceCitations = (spec.sourceCitations || []).filter(c => uniqueCitations.includes(c));
          specs.push(spec);
        }
      }

      // Relleno determinista de seguridad: definición directa (def o ancla real),
      // alternando con la pregunta de concepto cuando existe definición.
      let guard = 0;
      while (specs.length < 4 && guard < 8) {
        let fb = null;
        if (specs.length % 2 === 1 && ctx.def) {
          fb = this._specConcepto(ctx, cites, 1);
        }
        if (!fb) fb = this._specDefinicionDirecta(ctx, cites, specs.length % 2);
        if (!fb) break;
        specs.push(fb);
        guard++;
      }

      // Último recurso incondicional (nunca debería alcanzarse con contenido real)
      while (specs.length < 4) {
        const instituto = ctx.cleanTitle;
        specs.push({
          nature: "dogmatic",
          questionText: `Según el apunte, la regulación de ${instituto} comprende la materia que la sección respectiva desarrolla.`,
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
     * Retorna { valid, errors, warnings }.
     * Las warnings del perfil «Manejo» (absurdos, anclaje y homogeneidad) no
     * bloquean la renderización; solo los errores de contrato lo hacen.
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

        // ---- Perfil «Manejo»: warnings no bloqueantes ----
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
        const correctOpt = (q.options || []).find(o => o.id === q.correctAnswer);
        const contentBigrams = this._bigrams(content);
        if (correctOpt && correctOpt.text && contentBigrams.size) {
          const correctBigrams = this._bigrams(correctOpt.text);
          const shared = [...correctBigrams].some(b => contentBigrams.has(b));
          if (!shared) warnings.push(`Pregunta ${qNum}: la alternativa correcta no comparte bigramas con el contenido de la cédula (anclaje débil).`);
        }
        if (Array.isArray(q.options) && q.options.length) {
          const lens = q.options.map(o => (o.text || "").length);
          const lo = Math.min(...lens);
          const hi = Math.max(...lens);
          if (lo > 0 && hi / lo > 1.6) {
            warnings.push(`Pregunta ${qNum}: opciones de longitud muy heterogénea (ratio ${(hi / lo).toFixed(2)}).`);
          }
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