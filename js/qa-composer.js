/**
 * js/qa-composer.js — Motor de Q&A Extractivo Puro (v7.27, PROMPT 021)
 * ====================================================================
 * Compone respuestas a partir de citas textuales (verbatim) de las 103 cédulas
 * canónicas del Examen de Grado chileno, sin generación generativa de texto (cero LLM).
 * 
 * Modos:
 *  - 'definicion': mejor snippet relevante para la pregunta.
 *  - 'panorama': snippets representativos agrupados por disciplina (Civil, Procesal, Constitucional).
 *  - 'comparativa': yuxtapone dos cédulas de distinta disciplina o bloque sin redactar contraste.
 * 
 * Filosofía: Para un examen de grado, una respuesta alucinada es peor que ninguna.
 * Cero backend, cero librerías externas, determinismo absoluto y latencia < 100 ms.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.QAComposer = exports;
    root.composeAnswer = exports.composeAnswer;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Sanitización HTML defensiva anti-XSS
   */
  function escapeHtml(str) {
    if (typeof SecurityShield !== 'undefined' && typeof SecurityShield.escapeHtml === 'function') {
      return SecurityShield.escapeHtml(str);
    }
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Vocabulario temático para sugerir disciplina cuando no hay cobertura
   */
  const SUBJECT_KEYWORDS = {
    procesal: [
      'proceso', 'juicio', 'demanda', 'recurso', 'apelacion', 'casacion', 'queja', 'reposicion',
      'notificacion', 'emplazamiento', 'plazo', 'tribunal', 'juez', 'corte', 'competencia',
      'jurisdiccion', 'excepcion', 'prueba', 'testigo', 'perito', 'confesion', 'sentencia',
      'resolucion', 'ejecutivo', 'embargo', 'cautelar', 'precautoria', 'incidente', 'terceria',
      'desistimiento', 'abandono', 'sobreseimiento', 'cpc', 'cot', 'comparecencia'
    ],
    constitucional: [
      'constitucion', 'constitucional', 'cpr', 'derecho fundamental', 'garantia', 'proteccion',
      'amparo', 'inaplicabilidad', 'tribunal constitucional', 'tc', 'presidente', 'congreso',
      'senado', 'diputados', 'ley', 'decreto', 'reglamento', 'contraloria', 'bases', 'soberania',
      'nacionalidad', 'ciudadania', 'estado de excepcion', 'reforma constitucional', 'tratado'
    ],
    civil: [
      'contrato', 'obligacion', 'dominio', 'propiedad', 'posesion', 'prescripcion', 'reivindicatoria',
      'responsabilidad', 'perjuicio', 'daño', 'daño moral', 'compraventa', 'arrendamiento', 'arriendo',
      'mandato', 'hipoteca', 'prenda', 'fianza', 'sociedad', 'cuasicontrato', 'pago', 'novacion',
      'remision', 'compensacion', 'nulidad', 'rescilacion', 'rescision', 'acto juridico', 'voluntad',
      'consentimiento', 'capacidad', 'objeto', 'causa', 'lesion enorme', 'bienes', 'tradicion',
      'ocupacion', 'accesion', 'usufructo', 'servidumbre', 'sucesion', 'testamento', 'herencia'
    ]
  };

  /**
   * Infiere la disciplina más afín a una consulta sin resultados
   */
  function inferSuggestedSubject(query) {
    if (!query || typeof query !== 'string') return 'Derecho Civil';
    const norm = query.toLowerCase();

    let scores = { civil: 0, procesal: 0, constitucional: 0 };
    for (const [subj, kws] of Object.entries(SUBJECT_KEYWORDS)) {
      for (const kw of kws) {
        if (norm.includes(kw)) {
          scores[subj] += 1;
        }
      }
    }

    if (scores.procesal > scores.civil && scores.procesal >= scores.constitucional) {
      return 'Derecho Procesal';
    }
    if (scores.constitucional > scores.civil && scores.constitucional > scores.procesal) {
      return 'Derecho Constitucional';
    }
    return 'Derecho Civil';
  }

  /**
   * Resuelve el array de tópicos disponibles para validación del gate de salida
   */
  function resolveTopicsList(options) {
    if (options && Array.isArray(options.topics)) {
      return options.topics;
    }
    if (typeof INITIAL_DATA !== 'undefined' && Array.isArray(INITIAL_DATA.topics)) {
      return INITIAL_DATA.topics;
    }
    if (typeof window !== 'undefined' && window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA.topics)) {
      return window.INITIAL_DATA.topics;
    }
    if (typeof globalThis !== 'undefined' && globalThis.INITIAL_DATA && Array.isArray(globalThis.INITIAL_DATA.topics)) {
      return globalThis.INITIAL_DATA.topics;
    }
    if (typeof require !== 'undefined') {
      try {
        const d = require('./data.js');
        if (d && Array.isArray(d.topics)) return d.topics;
        if (d && d.INITIAL_DATA && Array.isArray(d.INITIAL_DATA.topics)) return d.INITIAL_DATA.topics;
      } catch (e1) {
        try {
          const allAf = require('../all_afg_topics.json');
          if (Array.isArray(allAf)) return allAf;
        } catch (e2) {}
      }
    }
    return [];
  }

  /**
   * Función de búsqueda delegada al Vault de Conocimiento
   */
  function executeVaultSearch(query, searchOptions) {
    if (searchOptions && typeof searchOptions.searchVault === 'function') {
      return searchOptions.searchVault(query, searchOptions);
    }
    if (typeof VaultSearch !== 'undefined' && typeof VaultSearch.searchVault === 'function') {
      return VaultSearch.searchVault(query, searchOptions);
    }
    if (typeof searchVault === 'function') {
      return searchVault(query, searchOptions);
    }
    if (typeof require !== 'undefined') {
      try {
        const vs = require('./vault-search.js');
        if (typeof vs.searchVault === 'function') {
          return vs.searchVault(query, searchOptions);
        }
      } catch (e) {}
    }
    return [];
  }

  /**
   * Formatea el nombre legible de la materia
   */
  function formatSubjectName(subj) {
    if (subj === 'procesal') return 'Derecho Procesal';
    if (subj === 'constitucional') return 'Derecho Constitucional';
    return 'Derecho Civil';
  }

  /**
   * Genera el HTML de una cita extractiva verbatim
   */
  function renderCitationBlock(cand, label = null) {
    const safeTitle = escapeHtml(cand.title || '');
    const safeIndexCode = escapeHtml(cand.indexCode || '');
    const safeSourceFile = escapeHtml(cand.sourceFile || '');
    const safeSubject = escapeHtml(formatSubjectName(cand.subject));
    const safeSnippet = cand.highlightedSnippet || escapeHtml(cand.snippet || '');
    const rawSnippet = cand.snippet || '';

    const labelHtml = label ? `<div class="qa-block-perspective-badge">${escapeHtml(label)}</div>` : '';

    return `
      <div class="qa-citation-card" data-topic-id="${escapeHtml(cand.id)}">
        ${labelHtml}
        <div class="qa-citation-header">
          <div class="qa-citation-meta">
            <span class="qa-citation-code">§ ${safeIndexCode}</span>
            <span class="qa-citation-title">${safeTitle}</span>
          </div>
          <span class="qa-citation-source" title="Archivo de procedencia">${safeSourceFile} · ${safeSubject}</span>
        </div>
        <div class="qa-citation-snippet">
          <span class="qa-quote-glyph">“</span>
          <span class="qa-snippet-body">${safeSnippet}</span>
          <span class="qa-quote-glyph">”</span>
        </div>
        <div class="qa-citation-footer">
          <button type="button" class="qa-action-jump-btn" data-jump-topic="${escapeHtml(cand.id)}" data-snippet="${escapeHtml(rawSnippet)}">
            <i data-lucide="external-link"></i> Ver fragmento en el apunte
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Compone la respuesta extractiva estructurada
   * @param {string} query - Pregunta o consulta del postulante
   * @param {Object} options - { mode: 'definicion' | 'panorama' | 'comparativa', searchVault, topics, index, sinonimos }
   * @returns {Object} { empty, mode, query, results, citations, html, disclaimer, suggestedSubject }
   */
  function composeAnswer(query, options = {}) {
    const rawQuery = (query || '').trim();
    const mode = options.mode || 'definicion';

    if (!rawQuery || rawQuery.length < 2) {
      return {
        empty: true,
        reason: 'empty_query',
        query: rawQuery,
        mode: mode,
        message: 'Por favor ingresa una pregunta o concepto para consultar tus apuntes.',
        html: `
          <div class="qa-empty-state">
            <p class="qa-empty-title">Escribe una pregunta sobre tus apuntes</p>
            <p class="qa-empty-sub">El sistema buscará los fragmentos literales de tus 103 cédulas para responder con precisión forense.</p>
          </div>
        `
      };
    }

    const topicsList = resolveTopicsList(options);
    const searchLimit = mode === 'definicion' ? 5 : 10;
    const rawResults = executeVaultSearch(rawQuery, Object.assign({}, options, { limit: searchLimit }));

    // Si no hubo resultados o el score fue insuficiente
    if (!rawResults || rawResults.length === 0) {
      const suggested = inferSuggestedSubject(rawQuery);
      const safeQuery = escapeHtml(rawQuery);
      const safeSuggested = escapeHtml(suggested);

      return {
        empty: true,
        reason: 'no_coverage',
        query: rawQuery,
        mode: mode,
        suggestedSubject: suggested,
        message: 'Tus apuntes no cubren esto aún',
        html: `
          <div class="qa-uncovered-box">
            <div class="qa-uncovered-icon"><i data-lucide="book-x"></i></div>
            <div class="qa-uncovered-content">
              <h4 class="qa-uncovered-title">Tus apuntes no cubren esto aún</h4>
              <p class="qa-uncovered-desc">
                No encontramos referencias verbatim a <strong>"${safeQuery}"</strong> en las 103 cédulas canónicas activas.
              </p>
              <div class="qa-uncovered-suggestion">
                <span class="qa-suggestion-label">Materia sugerida según Temario Canónico:</span>
                <span class="qa-suggestion-pill">${safeSuggested}</span>
              </div>
              <p class="qa-uncovered-hint">Esta consulta ha quedado registrada en tu ranking local de temas pendientes para futuras incorporaciones.</p>
            </div>
          </div>
        `
      };
    }

    // GATE DE SALIDA ESTRICTO (Regla de Seguridad):
    // Cada candidato citado debe existir y resolverse en los tópicos canónicos
    if (topicsList.length > 0) {
      const validIdsSet = new Set(topicsList.map(t => t.id));
      const allValid = rawResults.every(r => validIdsSet.has(r.id));
      if (!allValid) {
        return {
          empty: true,
          reason: 'gate_failed',
          query: rawQuery,
          mode: mode,
          error: 'Cita no verificable en el canon',
          message: 'Una o más citas no pudieron verificarse en el canon de apuntes.',
          html: `<div class="qa-uncovered-box"><p class="text-muted">Error de integridad: Cita no verificable en el canon de apuntes.</p></div>`
        };
      }
    }

    const DISCLAIMER_TEXT = 'Respuesta extractiva compuesta exclusivamente a partir de fragmentos verbatim de tus apuntes oficiales. No constituye asesoría jurídica ni redacción generativa.';

    // 1. MODO DEFINICIÓN: Mejor snippet directo
    if (mode === 'definicion') {
      const topCand = rawResults[0];
      const citations = [{
        id: topCand.id,
        indexCode: topCand.indexCode,
        title: topCand.title,
        sourceFile: topCand.sourceFile,
        subject: topCand.subject,
        chapterNumber: topCand.chapterNumber
      }];

      const html = `
        <div class="qa-answer-container" data-qa-mode="definicion">
          <div class="qa-answer-header">
            <span class="qa-answer-tag"><i data-lucide="quote"></i> Esto dicen tus apuntes:</span>
          </div>
          <div class="qa-answer-body">
            ${renderCitationBlock(topCand)}
          </div>
          <div class="qa-answer-footer">
            <span class="qa-answer-disclaimer"><i data-lucide="info"></i> ${escapeHtml(DISCLAIMER_TEXT)}</span>
          </div>
        </div>
      `;

      return {
        empty: false,
        mode: 'definicion',
        query: rawQuery,
        results: [topCand],
        citations: citations,
        html: html,
        disclaimer: DISCLAIMER_TEXT
      };
    }

    // 2. MODO PANORAMA: Agrupado por disciplina
    if (mode === 'panorama') {
      const bySubject = new Map();
      for (const res of rawResults) {
        const subj = res.subject || 'civil';
        if (!bySubject.has(subj)) {
          bySubject.set(subj, res);
        }
      }

      // Ordenar disciplinas canónicamente: civil -> procesal -> constitucional
      const orderKeys = ['civil', 'procesal', 'constitucional'];
      const panoramaList = [];
      for (const k of orderKeys) {
        if (bySubject.has(k)) {
          panoramaList.push(bySubject.get(k));
        }
      }
      // Agregar cualquier otra disciplina que hubiere
      for (const [k, v] of bySubject.entries()) {
        if (!orderKeys.includes(k)) {
          panoramaList.push(v);
        }
      }

      const citations = panoramaList.map(cand => ({
        id: cand.id,
        indexCode: cand.indexCode,
        title: cand.title,
        sourceFile: cand.sourceFile,
        subject: cand.subject,
        chapterNumber: cand.chapterNumber
      }));

      const blocksHtml = panoramaList.map(cand => renderCitationBlock(cand, formatSubjectName(cand.subject))).join('');

      const html = `
        <div class="qa-answer-container" data-qa-mode="panorama">
          <div class="qa-answer-header">
            <span class="qa-answer-tag"><i data-lucide="layers"></i> Esto dicen tus apuntes (Panorama por Disciplina):</span>
          </div>
          <div class="qa-answer-body qa-panorama-grid">
            ${blocksHtml}
          </div>
          <div class="qa-answer-footer">
            <span class="qa-answer-disclaimer"><i data-lucide="info"></i> ${escapeHtml(DISCLAIMER_TEXT)}</span>
          </div>
        </div>
      `;

      return {
        empty: false,
        mode: 'panorama',
        query: rawQuery,
        results: panoramaList,
        citations: citations,
        html: html,
        disclaimer: DISCLAIMER_TEXT
      };
    }

    // 3. MODO COMPARATIVA: Dos cédulas de distinta materia o bloque temático
    if (mode === 'comparativa') {
      let candA = rawResults[0];
      let candB = null;

      // Buscar candidato B con distinta disciplina
      for (let i = 1; i < rawResults.length; i++) {
        if (rawResults[i].subject !== candA.subject) {
          candB = rawResults[i];
          break;
        }
      }

      // Si no hay de distinta disciplina, buscar de distinto capítulo
      if (!candB) {
        for (let i = 1; i < rawResults.length; i++) {
          if (rawResults[i].chapterNumber !== candA.chapterNumber) {
            candB = rawResults[i];
            break;
          }
        }
      }

      // Si todos son del mismo capítulo, tomar el segundo mejor si existe
      if (!candB && rawResults.length > 1) {
        candB = rawResults[1];
      }

      const compResults = candB ? [candA, candB] : [candA];
      const citations = compResults.map(cand => ({
        id: cand.id,
        indexCode: cand.indexCode,
        title: cand.title,
        sourceFile: cand.sourceFile,
        subject: cand.subject,
        chapterNumber: cand.chapterNumber
      }));

      const blockAHtml = renderCitationBlock(candA, 'Perspectiva A: ' + formatSubjectName(candA.subject));
      const blockBHtml = candB ? renderCitationBlock(candB, 'Perspectiva B: ' + formatSubjectName(candB.subject)) : '';

      const html = `
        <div class="qa-answer-container" data-qa-mode="comparativa">
          <div class="qa-answer-header">
            <span class="qa-answer-tag"><i data-lucide="git-compare"></i> Esto dicen tus apuntes (Cotejo de Instituciones):</span>
          </div>
          <div class="qa-answer-body qa-comparativa-grid">
            ${blockAHtml}
            ${blockBHtml}
          </div>
          <div class="qa-answer-footer">
            <span class="qa-answer-disclaimer"><i data-lucide="info"></i> ${escapeHtml(DISCLAIMER_TEXT)}</span>
          </div>
        </div>
      `;

      return {
        empty: false,
        mode: 'comparativa',
        query: rawQuery,
        results: compResults,
        citations: citations,
        html: html,
        disclaimer: DISCLAIMER_TEXT
      };
    }

    // Fallback defensivo
    return composeAnswer(rawQuery, Object.assign({}, options, { mode: 'definicion' }));
  }

  /**
   * Gestión del ranking local de huecos (uncovered queries)
   */
  const GAPS_STORAGE_KEY = 'vault_uncovered_queries';

  function getUncoveredGaps(storageObj) {
    const store = storageObj || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return [];
    try {
      const raw = store.getItem(GAPS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function recordUncoveredGap(query, suggestedSubject, storageObj) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) return [];
    const store = storageObj || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return [];

    try {
      const cleanQ = query.trim();
      const lowerQ = cleanQ.toLowerCase();
      let gaps = getUncoveredGaps(store);

      const existingIdx = gaps.findIndex(g => g.query && g.query.toLowerCase() === lowerQ);
      if (existingIdx >= 0) {
        gaps[existingIdx].count = (gaps[existingIdx].count || 1) + 1;
        gaps[existingIdx].lastAsked = Date.now();
        if (suggestedSubject) gaps[existingIdx].suggestedSubject = suggestedSubject;
        // Mover al principio
        const item = gaps.splice(existingIdx, 1)[0];
        gaps.unshift(item);
      } else {
        gaps.unshift({
          query: cleanQ,
          count: 1,
          lastAsked: Date.now(),
          suggestedSubject: suggestedSubject || 'Derecho Civil'
        });
      }

      // Límite estricto de 30 elementos
      if (gaps.length > 30) {
        gaps = gaps.slice(0, 30);
      }

      store.setItem(GAPS_STORAGE_KEY, JSON.stringify(gaps));
      return gaps;
    } catch (e) {
      return [];
    }
  }

  function clearUncoveredGaps(storageObj) {
    const store = storageObj || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return;
    try {
      store.removeItem(GAPS_STORAGE_KEY);
    } catch (e) {}
  }

  return {
    composeAnswer: composeAnswer,
    inferSuggestedSubject: inferSuggestedSubject,
    getUncoveredGaps: getUncoveredGaps,
    recordUncoveredGap: recordUncoveredGap,
    clearUncoveredGaps: clearUncoveredGaps,
    escapeHtml: escapeHtml
  };
});
