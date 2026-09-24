/**
 * js/vault-search.js — Motor de Búsqueda Semántica Estática del Vault (v7.22, Prompt 017)
 * =====================================================================================
 * Búsqueda BM25-lite optimizada con boosts temáticos sobre las 103 cédulas del examen.
 * Funciona de forma idéntica en servidor local y en GitHub Pages estático.
 * Cero dependencias externas, cero alucinaciones (todo hit cita cédula real y snippet verbatim).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.searchVault = exports.searchVault;
    root.VaultSearch = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Stopwords mínimas y canónicas en español (sin tildes)
  const RAW_STOPWORDS = [
    'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'aquel', 'aquella', 'aquellas', 'aquellos',
    'aqui', 'arriba', 'abajo', 'asi', 'atras', 'aun', 'aunque', 'bajo', 'bastante', 'bien', 'cabe', 'cada',
    'casi', 'cerca', 'cierto', 'cierta', 'ciertos', 'ciertas', 'como', 'con', 'conmigo', 'consigo', 'contigo',
    'contra', 'cual', 'cuales', 'cualquier', 'cualquiera', 'cualesquiera', 'cuan', 'cuando', 'cuanto', 'cuanta',
    'cuantos', 'cuantas', 'de', 'del', 'demas', 'demasiado', 'demasiada', 'demasiados', 'demasiadas', 'dentro',
    'deprisa', 'desde', 'despues', 'detras', 'donde', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho',
    'nueve', 'diez', 'durante', 'e', 'el', 'ella', 'ellas', 'ello', 'ellos', 'empleo', 'en', 'encima', 'enfrente',
    'enseguida', 'entre', 'era', 'erais', 'eramos', 'eran', 'eras', 'eres', 'es', 'esa', 'esas', 'ese', 'eso',
    'esos', 'esta', 'estaba', 'estabais', 'estabamos', 'estaban', 'estabas', 'estad', 'estada', 'estadas', 'estado',
    'estados', 'estais', 'estamos', 'estan', 'estar', 'estara', 'estaran', 'estaras', 'estare', 'estareis',
    'estaremos', 'estaria', 'estariais', 'estariamos', 'estarian', 'estarias', 'estas', 'este', 'estemos', 'esto',
    'estos', 'estoy', 'estuve', 'estuviera', 'estuvierais', 'estuvieramos', 'estuvieran', 'estuvieras', 'estuvieron',
    'estuviese', 'estuvieseis', 'estuviesemos', 'estuviesen', 'estuvieses', 'estuvimos', 'estuviste', 'estuvisteis',
    'estuvo', 'ex', 'excepto', 'fin', 'final', 'fue', 'fuera', 'fuerais', 'fueramos', 'fueran', 'fueras', 'fueron',
    'fuese', 'fueseis', 'fuesemos', 'fuesen', 'fueses', 'fui', 'fuimos', 'fuiste', 'fuisteis', 'gran', 'grandes',
    'ha', 'habeis', 'habia', 'habiais', 'habiamos', 'habian', 'habias', 'habida', 'habidas', 'habido', 'habidos',
    'habiendo', 'habra', 'habran', 'habras', 'habre', 'habreis', 'habremos', 'habria', 'habriais', 'habriamos',
    'habrian', 'habrias', 'hace', 'haceis', 'hacemos', 'hacen', 'hacer', 'hacera', 'haceran', 'haceras', 'hacere',
    'hacereis', 'haceremos', 'haceria', 'haceriais', 'haceriamos', 'hacerian', 'hacerias', 'haces', 'hacia',
    'haciais', 'haciamos', 'hacian', 'hacias', 'hago', 'han', 'has', 'hasta', 'hay', 'haya', 'hayais', 'hayamos',
    'hayan', 'hayas', 'haye', 'he', 'heis', 'hemos', 'hube', 'hubiera', 'hubierais', 'hubieramos', 'hubieran',
    'hubieras', 'hubieron', 'hubiese', 'hubieseis', 'hubiesemos', 'hubiesen', 'hubieses', 'hubimos', 'hubiste',
    'hubisteis', 'hubo', 'igual', 'incluso', 'indico', 'jamas', 'junto', 'juntos', 'la', 'las', 'le', 'les',
    'lo', 'los', 'mas', 'me', 'mediante', 'menos', 'mi', 'mia', 'mias', 'mientras', 'mio', 'mios', 'misma',
    'mismas', 'mismo', 'mismos', 'momento', 'mucha', 'muchas', 'mucho', 'muchos', 'muy', 'nada', 'nadie', 'ni',
    'ningun', 'ninguna', 'ningunas', 'ninguno', 'ningunos', 'no', 'nos', 'nosotras', 'nosotros', 'nuestra',
    'nuestras', 'nuestro', 'nuestros', 'nunca', 'o', 'os', 'otra', 'otras', 'otro', 'otros', 'para', 'parecer',
    'parte', 'pero', 'poca', 'pocas', 'poco', 'pocos', 'podeis', 'podemos', 'poder', 'podra', 'podran', 'podras',
    'podre', 'podreis', 'podremos', 'podria', 'podriais', 'podriamos', 'podrian', 'podrias', 'poned', 'poneis',
    'ponemos', 'ponen', 'poner', 'ponera', 'poneran', 'poneras', 'ponere', 'ponereis', 'poneremos', 'poneria',
    'poneriais', 'poneriamos', 'ponerian', 'ponerias', 'pones', 'pongo', 'por', 'porque', 'primero', 'primeros',
    'primera', 'primeras', 'propia', 'propias', 'propio', 'propios', 'proximo', 'proximos', 'proxima', 'proximas',
    'pues', 'puesto', 'que', 'quede', 'quien', 'quienes', 'quienquiera', 'quiza', 'quizas', 'sabe', 'sabeis',
    'sabemos', 'saben', 'saber', 'sabera', 'saberan', 'saberas', 'sabere', 'sabereis', 'saberemos', 'saberia',
    'saberiais', 'saberiamos', 'saberian', 'saberias', 'sabes', 'sabiendo', 'sabido', 'sabida', 'sabidos', 'sabidas',
    'salvo', 'se', 'sea', 'seais', 'seamos', 'sean', 'seas', 'segun', 'ser', 'sera', 'seran', 'seras', 'sere',
    'sereis', 'seremos', 'seria', 'seriais', 'seriamos', 'serian', 'serias', 'si', 'sido', 'siempre', 'siendo',
    'sin', 'sino', 'so', 'sobre', 'sois', 'sola', 'solamente', 'solas', 'solo', 'solos', 'somos', 'son', 'soy',
    'su', 'sus', 'suya', 'suyas', 'suyo', 'suyos', 'tal', 'tales', 'tambien', 'tampoco', 'tan', 'tanta', 'tantas',
    'tanto', 'tantos', 'te', 'teneis', 'tenemos', 'tener', 'tengais', 'tengamos', 'tengo', 'tenia', 'teniais',
    'teniamos', 'tenian', 'tenias', 'tenida', 'tenidas', 'tenido', 'tenidos', 'teniendo', 'tenra', 'tenran',
    'tenras', 'tenre', 'tenreis', 'tenremos', 'tenria', 'tenriais', 'tenriamos', 'tenrian', 'tenrias', 'ti',
    'tiene', 'tienen', 'tienes', 'toda', 'todas', 'todavia', 'todo', 'todos', 'tras', 'tu', 'tus', 'tuya',
    'tuyas', 'tuyo', 'tuyos', 'tuve', 'tuviera', 'tuvierais', 'tuvieramos', 'tuvieran', 'tuvieras', 'tuvieron',
    'tuviese', 'tuvieseis', 'tuviesemos', 'tuviesen', 'tuvieses', 'tuvimos', 'tuviste', 'tuvisteis', 'tuvo',
    'un', 'una', 'unas', 'uno', 'unos', 'usa', 'usais', 'usamos', 'usan', 'usar', 'usara', 'usaran', 'usaras',
    'usare', 'usareis', 'usaremos', 'usaria', 'usariais', 'usariamos', 'usarian', 'usarias', 'usas', 'use',
    'usted', 'ustedes', 'va', 'vais', 'valor', 'vamos', 'van', 'varias', 'varios', 'vaya', 'vayamos', 'vayan',
    'vayas', 've', 'veis', 'vemos', 'ven', 'ver', 'vera', 'veran', 'veras', 'vere', 'vereis', 'veremos', 'veria',
    'veriais', 'veriamos', 'verian', 'verias', 'verdad', 'verdadera', 'verdadero', 'ves', 'vez', 'veces', 'via',
    'vosotras', 'vosotros', 'voy', 'y', 'ya', 'yo', 'seccion', 'capitulo', 'numero', 'letra', 'letras', 'inciso',
    'incisos', 'articulo', 'articulos', 'orden', 'tipo', 'tipos', 'clase', 'clases', 'etc', 'md', 'claro', 'tras',
    'punto', 'puntos', 'aspecto', 'aspectos', 'propio', 'propia', 'mismos', 'mismas', 'cabe', 'dar', 'da', 'dan',
    'dado', 'dados', 'dio', 'dicen', 'dicho', 'decir', 'nivel', 'tema', 'temas', 'base', 'bases', 'relacion',
    'sentido', 'ejemplo', 'ejemplos', 'texto', 'textos', 'nota', 'notas', 'apunte', 'apuntes', 'cedula', 'cedulas',
    'modulo', 'modulos', 'unidad', 'unidades', 'etapa', 'etapas', 'fase', 'fases', 'examen', 'examenes', 'grado',
    'grados', 'parrafo', 'parrafos', 'titulo', 'titulos', 'subtitulo', 'subtitulos', 'fuente', 'fuentes', 'archivo',
    'archivos'
  ];

  const STOPWORDS = new Set(RAW_STOPWORDS);

  /**
   * Normaliza texto a minúsculas y sustituye acentos en español.
   */
  function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ü/g, 'u');
  }

  /**
   * Stemming ligero idéntico a build_vault_index.py.
   */
  function stemWord(w) {
    if (!w) return '';
    if (w.length > 6 && w.endsWith('mente')) {
      w = w.slice(0, -5);
    }
    if (w.length > 7 && w.endsWith('ciones')) {
      w = w.slice(0, -6);
    } else if (w.length > 5 && w.endsWith('cion')) {
      w = w.slice(0, -4);
    } else if (w.length > 4 && w.endsWith('es') && 'bcdfghjklmnñprstvz'.includes(w[w.length - 3])) {
      w = w.slice(0, -2);
    } else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && 'aeiou'.includes(w[w.length - 2])) {
      w = w.slice(0, -1);
    }
    return w;
  }

  /**
   * Tokeniza una consulta en tokens lematizados conservando palabras originales para highlight.
   */
  function tokenizeQuery(query) {
    const norm = normalizeText(query);
    const matches = norm.match(/[a-z0-9ñ]{2,}/g) || [];
    const tokens = [];
    const rawTerms = [];

    for (let i = 0; i < matches.length; i++) {
      const w = matches[i];
      if (w.length === 2 && !/^\d+$/.test(w)) continue;
      if (STOPWORDS.has(w)) continue;
      const stem = stemWord(w);
      if (STOPWORDS.has(stem)) continue;

      tokens.push(stem);
      rawTerms.push(w);
    }

    return {
      tokens: Array.from(new Set(tokens)),
      rawTerms: Array.from(new Set(rawTerms))
    };
  }

  /**
   * Obtiene la estructura estándar de posting { tf, pos }.
   */
  function getPosting(val) {
    if (!val) return null;
    if (Array.isArray(val)) {
      return {
        tf: val[0] || 0,
        pos: Array.isArray(val[1]) ? val[1] : val.slice(1)
      };
    }
    return {
      tf: val.tf || 0,
      pos: val.pos || val.posiciones || []
    };
  }

  /**
   * Escapado HTML preventivo contra XSS.
   */
  function escapeHtml(str) {
    if (typeof SecurityShield !== 'undefined' && SecurityShield.escapeHtml) {
      return SecurityShield.escapeHtml(str);
    }
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Resalta los términos buscados en el snippet ya escapado.
   */
  function highlightSafeSnippet(escapedText, terms) {
    if (!escapedText || !terms || terms.length === 0) return escapedText;
    let result = escapedText;

    // Ordenar términos por longitud descendente para evitar colisiones en prefijos
    const sortedTerms = terms.slice().sort((a, b) => b.length - a.length);

    for (const term of sortedTerms) {
      if (!term || term.length < 2) continue;
      // Regex flexible: busca el término preservando tildes en el texto original si existían
      const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(\\b${safeTerm}[a-z0-9ñ]*\\b)`, 'gi');
      result = result.replace(regex, '<mark class="vault-highlight">$1</mark>');
    }
    return result;
  }

  /**
   * Resuelve los datos de un tema desde las fuentes disponibles en memoria.
   */
  function getTopicById(id, options) {
    if (options && options.topics && Array.isArray(options.topics)) {
      const found = options.topics.find(t => t && t.id === id);
      if (found) return found;
    }
    if (typeof window !== 'undefined' && window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA.topics)) {
      const found = window.INITIAL_DATA.topics.find(t => t && t.id === id);
      if (found) return found;
    }
    if (typeof globalThis !== 'undefined' && globalThis.INITIAL_DATA && Array.isArray(globalThis.INITIAL_DATA.topics)) {
      const found = globalThis.INITIAL_DATA.topics.find(t => t && t.id === id);
      if (found) return found;
    }
    return null;
  }

  /**
   * searchVault(query, options)
   * ----------------------------
   * @param {string} query - Consulta de búsqueda libre (ej. "emplazamiento", "18 días hábiles")
   * @param {Object} [options]
   * @param {string} [options.subject] - Filtro opcional por disciplina ('civil', 'procesal', 'constitucional' o 'all')
   * @param {number} [options.limit=8] - Límite máximo de resultados retornados
   * @param {Object} [options.index] - Índice opcional (por defecto VAULT_INDEX global)
   * @param {Array}  [options.topics] - Lista opcional de tópicos con content (por defecto INITIAL_DATA.topics)
   * @returns {Array<Object>} Lista de resultados con citas y snippet verbatim
   */
  function searchVault(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return [];
    }

    const index = options.index ||
      (typeof window !== 'undefined' && window.VAULT_INDEX) ||
      (typeof globalThis !== 'undefined' && globalThis.VAULT_INDEX) ||
      (typeof VAULT_INDEX !== 'undefined' ? VAULT_INDEX : null);

    if (!index || !index.docs || !index.meta) {
      return [];
    }

    const { tokens, rawTerms } = tokenizeQuery(query);
    if (tokens.length === 0) {
      return [];
    }

    const subjectFilter = options.subject && options.subject !== 'all' ? options.subject : null;
    const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 8;

    const N = index.totalDocs || 103;
    const avgLen = index.avgLen || 400;
    const k1 = 1.2;
    const b = 0.75;

    const candidates = [];

    for (const tid of Object.keys(index.docs)) {
      const m = index.meta[tid];
      if (!m) continue;

      if (subjectFilter && m.subject !== subjectFilter) {
        continue;
      }

      const docTerms = index.docs[tid];
      if (!docTerms) continue;

      const dlen = (index.docLen && index.docLen[tid]) || avgLen;
      const temarioKws = (index.temarioKeywords && index.temarioKeywords[`${m.subject}:${m.chapterNumber}`]) || [];
      const normTitle = normalizeText(m.title || '');

      let score = 0;
      let matchedTokensCount = 0;
      let firstPos = null;

      for (const q of tokens) {
        const postingRaw = docTerms[q];
        if (!postingRaw) continue;

        const posting = getPosting(postingRaw);
        if (!posting || posting.tf <= 0) continue;

        matchedTokensCount++;

        // Registrar primera posición positiva en content para anclar el snippet
        if (firstPos === null && posting.pos && posting.pos.length > 0) {
          for (let p of posting.pos) {
            if (p > 0) {
              firstPos = p;
              break;
            }
          }
          if (firstPos === null) {
            firstPos = posting.pos[0];
          }
        }

        const df = (index.df && index.df[q]) || 1;
        // BM25 IDF con Robertson-Spärck Jones (+1 para asegurar positividad)
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1.0);
        // BM25 TF component
        const tfComp = (posting.tf * (k1 + 1.0)) / (posting.tf + k1 * (1.0 - b + b * (dlen / avgLen)));

        let boost = 1.0;
        // Boost x1.3 si el término matchea keywords de TEMARIO_CANONICO
        if (temarioKws.some(kw => kw.includes(q) || q.includes(kw))) {
          boost *= 1.3;
        }
        // Boost x1.2 si el término matchea el title/cleanTitle
        if (normTitle.includes(q)) {
          boost *= 1.2;
        }

        score += idf * tfComp * boost;
      }

      // Descartar si no hubo matches o score insignificante
      if (matchedTokensCount === 0 || score <= 0.1) {
        continue;
      }

      // Bonus de coordinación si coincide con múltiples términos de la consulta
      if (tokens.length > 1 && matchedTokensCount > 1) {
        score *= (1.0 + 0.15 * (matchedTokensCount - 1));
      }

      candidates.push({
        id: tid,
        indexCode: m.indexCode || m.code || '',
        code: m.code || '',
        title: m.title || '',
        sourceFile: m.sourceFile || '',
        subject: m.subject || '',
        chapterNumber: m.chapterNumber || 1,
        score: score,
        firstPos: firstPos
      });
    }

    if (candidates.length === 0) {
      return [];
    }

    // Ordenar por score descendente
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, limit);

    // Resolver snippets verbatim desde los contenidos reales de las cédulas
    return topCandidates.map(cand => {
      const topicObj = getTopicById(cand.id, options);
      const rawContent = (topicObj && typeof topicObj.content === 'string') ? topicObj.content : '';

      let pos0 = cand.firstPos;
      const normContent = normalizeText(rawContent);

      // Si la posición no quedó anclada o fue 0, buscar la primera aparición exacta en content
      if ((pos0 === null || pos0 <= 0) && rawContent.length > 0) {
        for (const term of rawTerms) {
          const idx = normContent.indexOf(term);
          if (idx >= 0) {
            pos0 = idx;
            break;
          }
        }
        if (pos0 === null) pos0 = 0;
      }

      // Ventana ±140 caracteres alrededor de la primera posición
      const winRadius = 140;
      const start = Math.max(0, (pos0 || 0) - winRadius);
      const end = Math.min(rawContent.length, (pos0 || 0) + winRadius);

      // Substring verbatim estricto de content (sin ellipsis añadidas a la cadena base)
      const snippet = rawContent.slice(start, end);

      // Highlight seguro: escapa primero contra XSS y luego aplica <mark>
      const safeEscaped = escapeHtml(snippet);
      const highlightedSnippet = highlightSafeSnippet(safeEscaped, rawTerms.concat(tokens));

      return {
        id: cand.id,
        indexCode: cand.indexCode,
        title: cand.title,
        sourceFile: cand.sourceFile,
        subject: cand.subject,
        chapterNumber: cand.chapterNumber,
        score: Math.round(cand.score * 10000) / 10000,
        snippet: snippet,
        highlightedSnippet: highlightedSnippet,
        snippetStart: start,
        snippetEnd: end,
        hasPrefixEllipsis: start > 0,
        hasSuffixEllipsis: end < rawContent.length
      };
    });
  }

  return {
    searchVault: searchVault,
    normalizeText: normalizeText,
    stemWord: stemWord,
    tokenizeQuery: tokenizeQuery
  };
});
