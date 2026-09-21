/**
 * CASE SOLVER - TALLER METODOLÓGICO DE RESOLUCIÓN DE CASOS
 * Implementa de manera estricta el Protocolo de Rendición de Examen de Grado (AIME 2026-20)
 * y la RÚBRICA OFICIAL PARTE I: Prueba objetiva con componente argumentativo (5.0 pts máx por pregunta):
 * - Alternativa correcta: 1.0 pto (Criterio Excluyente: si es incorrecta, Justificación = 0.0 pts)
 * - Dimensión 1: Marco Jurídico Pertinente (0.5 pts)
 * - Dimensión 2: Hechos Relevantes (1.0 pto)
 * - Dimensión 3: Subsunción y Razonamiento Jurídico (2.0 pts)
 * - Dimensión 4: Claridad y Precisión Técnica (0.5 pts)
 */

var CaseSolver = {
  currentCaseId: null,
  activeFilter: "all",
  currentQuestionIndex: 0,
  activeStep: 1, // Para compatibilidad con casos en formato clásico
  mobileView: "list",

  escapeText(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  async init(containerEl) {
    this.container = containerEl;
    let data = StorageService.getData();

    // Sincronizar únicamente casos creados por IA (los modelos de entrenamiento oficiales permanecen confidenciales en el servidor)
    try {
      const res = await fetch("/api/sync-cases");
      if (res.ok) {
        const resJson = await res.json();
        const serverAiCases = (resJson.cases || []).filter(c => c.isGeneratedByAI || (c.id && c.id.startsWith("caso-ia-")));
        const existingMap = new Map((data.cases || []).filter(c => c.isGeneratedByAI || (c.id && c.id.startsWith("caso-ia-"))).map(c => [c.id, c]));
        serverAiCases.forEach(sc => existingMap.set(sc.id, { ...(existingMap.get(sc.id) || {}), ...sc }));
        data.cases = Array.from(existingMap.values());
        StorageService.saveData(data);
      }
    } catch (e) {
      console.warn("CaseSolver: Error sincronizando casos de práctica IA", e);
    }

    data = StorageService.getData();
    const aiCases = (data.cases || []).filter(c => c.isGeneratedByAI || (c.id && c.id.startsWith("caso-ia-")));
    if (aiCases.length > 0) {
      if (!this.currentCaseId || !aiCases.some(c => c.id === this.currentCaseId)) {
        this.currentCaseId = aiCases[0].id;
      }
    } else {
      this.currentCaseId = null;
    }
    if (window.innerWidth <= 1024) {
      this.mobileView = "list";
    }
    this.render();
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.currentQuestionIndex = 0;
    this.render();
  },

  selectCase(caseId) {
    this.currentCaseId = caseId;
    this.currentQuestionIndex = 0;
    this.activeStep = 1;
    this.mobileView = "workbench";
    this.render();
  },

  setQuestionIndex(index) {
    this.currentQuestionIndex = index;
    this.render();
  },

  render() {
    const data = StorageService.getData();
    // Banco público visible: EXCLUSIVAMENTE casos creados por IA (modelos oficiales 100% reservados)
    const cases = (data.cases || []).filter(c => c.isGeneratedByAI || (c.id && c.id.startsWith("caso-ia-")));

    // Filtrar casos
    const filteredCases = cases.filter(c => {
      if (this.activeFilter === "all" || this.activeFilter === "generado_ia") return true;
      return c.subjects && c.subjects.includes(this.activeFilter);
    });

    const activeCase = cases.find(c => c.id === this.currentCaseId) || filteredCases[0] || null;

    if (!activeCase && filteredCases.length > 0) {
      this.currentCaseId = filteredCases[0].id;
    } else if (cases.length === 0) {
      this.currentCaseId = null;
    }

    const draft = activeCase ? (StorageService.getCaseDraft(activeCase.id) || {}) : {};

    this.container.innerHTML = `
      <div class="cases-layout ${this.mobileView === 'workbench' ? 'view-workbench' : 'view-list'}">
        
        <!-- PANEL IZQUIERDO: BANCO DE CASOS CREADOS -->
        <aside class="cases-list-panel">
          <div class="cases-list-header">
            <div class="cases-header-title">
              <h2><i data-lucide="briefcase"></i> Banco de Casos</h2>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button id="btn-open-ai-generator" class="btn btn-primary btn-sm" title="Crear caso inédito con IA y reglas dogmáticas" style="background: linear-gradient(135deg, var(--gold-primary), #b8860b); color: var(--text-inverse); border: none; font-weight: 700; box-shadow: 0 2px 8px var(--gold-glow);">
                  <i data-lucide="sparkles"></i> Crear con IA
                </button>
              </div>
            </div>
            <div class="cases-filters-row" style="flex-wrap: wrap;">
              <button class="filter-pill ${this.activeFilter === 'all' || this.activeFilter === 'generado_ia' ? 'active' : ''}" data-case-filter="all">Todos (${cases.length})</button>
              <button class="filter-pill filter-civil ${this.activeFilter === 'civil' ? 'active' : ''}" data-case-filter="civil">Civil</button>
              <button class="filter-pill filter-procesal ${this.activeFilter === 'procesal' ? 'active' : ''}" data-case-filter="procesal">Procesal</button>
              <button class="filter-pill filter-constitucional ${this.activeFilter === 'constitucional' ? 'active' : ''}" data-case-filter="constitucional">Const.</button>
              ${cases.length > 0 ? `
                <button id="btn-purge-ai-cases" class="filter-pill" style="border-color: rgba(239, 68, 68, 0.35); color: #f87171; background: rgba(239, 68, 68, 0.08); margin-left: auto;" title="Limpiar todos los casos de práctica IA para liberar espacio y optimizar BD">
                  <i data-lucide="trash-2" style="width: 11px; height: 11px; display: inline-block; vertical-align: middle;"></i> Limpiar IA
                </button>
              ` : ''}
            </div>
          </div>

          <div class="cases-cards-scroll">
            ${filteredCases.map(c => {
              const isCaseUnlocked = LicenseService.isContentUnlocked(c, 'case');
              const cDraft = StorageService.getCaseDraft(c.id) || {};
              const questionsCount = (c.questions && c.questions.length) || 0;
              const evaluatedCount = Object.keys(cDraft.evaluations || {}).length;

              return `
              <div class="case-item-card ${activeCase && activeCase.id === c.id ? 'active' : ''} ${!isCaseUnlocked ? 'locked' : ''}" data-case-id="${c.id}">
                <div class="case-card-meta">
                  <div class="case-subject-tags">
                    ${(c.subjects || []).map(s => `<span class="case-sub-tag ${s}">${s}</span>`).join('')}
                    <span class="case-source-tag" title="Generado por Agente IA (Protocolo AFG 2026-20)" style="background: rgba(212, 160, 23, 0.12); color: var(--gold-primary); border-color: rgba(212, 160, 23, 0.3);">
                      <i data-lucide="sparkles" style="width: 10px; height: 10px; display: inline-block;"></i> Práctica IA
                    </span>
                    <span class="case-source-tag" title="Caso de práctica activo con vigencia limitada" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa; border-color: rgba(59, 130, 246, 0.25);">
                      <i data-lucide="clock" style="width: 10px; height: 10px; display: inline-block;"></i> Activo
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${!isCaseUnlocked ? `<i data-lucide="lock" style="width: 12px; height: 12px; color: #f87171;" title="Caso bloqueado"></i>` : ''}
                    <span class="case-difficulty-badge ${c.difficulty ? c.difficulty.toLowerCase() : ''}">
                      ${c.difficulty || 'Grado'}
                    </span>
                  </div>
                </div>
                <h3 class="case-card-title">${c.title}</h3>
                <p class="case-card-snippet">${c.summary || c.facts}</p>
                ${questionsCount > 0 ? `
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; font-size: 0.73rem; color: var(--text-muted);">
                    <span><i data-lucide="help-circle" style="width: 12px; height: 12px; vertical-align: middle;"></i> ${questionsCount} ${questionsCount === 1 ? 'pregunta' : 'preguntas'}</span>
                    ${evaluatedCount > 0 ? `<span style="color: var(--success); font-weight: 600;">✓ ${evaluatedCount}/${questionsCount} evaluadas</span>` : ''}
                  </div>
                ` : ''}
              </div>
              `;
            }).join('')}
            ${filteredCases.length === 0 ? `
              <div class="empty-cases-notice" style="padding: 32px 16px; text-align: center; color: var(--text-muted);">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(212, 160, 23, 0.12); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; color: var(--gold-primary);">
                  <i data-lucide="sparkles" style="width: 24px; height: 24px;"></i>
                </div>
                <h4 style="color: var(--text-primary); font-size: 14px; font-weight: 700; margin-bottom: 6px;">Banco de Casos Inéditos con IA</h4>
                <p style="font-size: 12px; line-height: 1.5; margin-bottom: 16px; color: var(--text-secondary);">
                  Los modelos oficiales de examen nutren internamente al Agente. Para comenzar tu práctica, genera un caso inédito ajustado al protocolo de grado.
                </p>
                <button class="btn btn-primary btn-sm btn-create-first-ai-case" style="width: 100%; font-weight: 700; background: linear-gradient(135deg, var(--gold-primary), #b8860b); color: var(--text-inverse); box-shadow: 0 2px 8px var(--gold-glow); border: none; padding: 8px 12px;">
                  <i data-lucide="sparkles"></i> Crear Primer Caso con IA
                </button>
              </div>
            ` : ''}
          </div>
        </aside>

        <!-- PANEL DERECHO: ESPACIO METODOLÓGICO DE TRABAJO -->
        <div class="case-workbench-panel ${!activeCase ? 'empty-workbench' : ''}">
          ${activeCase ? this.renderActiveCaseWorkspace(activeCase, draft) : `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 520px; padding: 40px 20px;">
              <div style="max-width: 580px; text-align: center; padding: 44px 32px; background: var(--surface-primary); border: 1px solid var(--border-color); border-radius: 14px; box-shadow: var(--shadow-md);">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(212, 160, 23, 0.12); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--gold-primary);">
                  <i data-lucide="sparkles" style="width: 32px; height: 32px;"></i>
                </div>
                <h2 style="font-size: 21px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px;">Taller de Casos Prácticos de Grado (IA)</h2>
                <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px;">
                  Los casos oficiales y pautas de examen nutren confidencialmente a nuestro Agente para crear problemas inéditos y rigurosos.
                  <br><br>
                  Cada caso incluye preguntas de alternativas (A-E), distractores técnicos y evaluación según la <strong>Rúbrica Oficial de 4 Dimensiones</strong> con Criterio Excluyente.
                </p>
                <button class="btn btn-primary btn-lg btn-create-first-ai-case" style="background: linear-gradient(135deg, var(--gold-primary), #b8860b); color: var(--text-inverse); font-weight: 700; padding: 12px 28px; font-size: 15px; box-shadow: 0 4px 14px var(--gold-glow); border: none; cursor: pointer;">
                  <i data-lucide="sparkles"></i> Crear Caso Inédito con IA
                </button>
              </div>
            </div>
          `}
        </div>

      </div>
    `;

    if (typeof window !== "undefined" && window.lucide) {
      window.lucide.createIcons();
    }

    this.bindEvents(activeCase);
  },

  renderActiveCaseWorkspace(activeCase, draft) {
    const isUnlocked = LicenseService.isContentUnlocked(activeCase, 'case');

    const mobileHeaderHtml = `
      <div class="case-mobile-header-bar">
        <button id="btn-back-to-cases" class="btn btn-secondary btn-sm" title="Volver al banco de casos">
          <i data-lucide="arrow-left"></i>
          <span>Volver a Casos</span>
        </button>
        <span class="case-mobile-title">${activeCase.title}</span>
      </div>
    `;

    if (!isUnlocked) {
      return `
        <div class="case-workspace-inner">
          ${mobileHeaderHtml}
          <div class="paywall-container">
            <div class="paywall-icon-wrap">
              <i data-lucide="lock"></i>
            </div>
            <h2 class="paywall-title">Caso Práctico de Nivel Grado</h2>
            <p class="paywall-subtitle">
              Este caso práctico y su evaluación con rúbrica oficial en 4 dimensiones requieren el <strong>Pase de Grado</strong>.
            </p>
            <div class="paywall-activation-box">
              <div class="activation-input-row">
                <input type="text" id="inline-case-license-code" placeholder="Pega aquí tu código de activación..." autocomplete="off">
                <button id="btn-inline-case-activate" class="btn btn-primary">
                  <i data-lucide="unlock"></i>
                  <span>Activar</span>
                </button>
              </div>
            </div>
            <a href="https://www.instagram.com/gradomaniacos?stkn=MXNtMDF1OHBhMmRhcA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-buy btn-instagram-buy">
              <i data-lucide="instagram"></i>
              <span>Solicitar mi Pase por Instagram</span>
            </a>
          </div>
        </div>
      `;
    }

    // Comprobar si el caso posee preguntas estructuradas en formato Protocolo 2026-20 (objetos con opciones)
    const hasStructuredQuestions = Array.isArray(activeCase.questions) &&
      activeCase.questions.length > 0 &&
      typeof activeCase.questions[0] === 'object';

    if (hasStructuredQuestions) {
      return this.renderProtocolo2026Workspace(activeCase, draft, mobileHeaderHtml);
    } else {
      // Fallback a modo clásico metodológico (4 dimensiones en texto abierto)
      return this.renderClassicWorkspace(activeCase, draft, mobileHeaderHtml);
    }
  },

  /**
   * Renderiza el taller de acuerdo estricto al Protocolo 2026-20 (Parte I: Preguntas con alternativas y justificación)
   */
  renderProtocolo2026Workspace(activeCase, draft, mobileHeaderHtml) {
    const isDemo = (typeof LicenseService !== 'undefined' && typeof LicenseService.isDemoMode === 'function') 
      ? LicenseService.isDemoMode() 
      : false;
    const questions = activeCase.questions || [];
    const qIndex = Math.min(Math.max(0, this.currentQuestionIndex), questions.length - 1);
    const currentQ = questions[qIndex];

    const answers = draft.answers || {};
    const justifications = draft.justifications || {};
    const evaluations = draft.evaluations || {};

    const selectedOption = answers[currentQ.id] || null;
    const justificationText = justifications[currentQ.id] || "";
    const evaluation = evaluations[currentQ.id] || null;
    const isEvaluated = Boolean(evaluation && evaluation.isEvaluated);

    return `
      <div class="case-workspace-inner">
        ${mobileHeaderHtml}

        <!-- TARJETA DE HECHOS DEL CASO -->
        <div class="case-fact-card">
          <div class="case-fact-header">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <h1 class="case-fact-title">${activeCase.title}</h1>
              ${activeCase.sourceFile ? `
                <div class="case-source-file-info">
                  <i data-lucide="file-text" style="width: 12px; height: 12px;"></i>
                  <span><strong>${activeCase.sourceCategoryLabel || 'Carpeta CASOS'}:</strong> ${activeCase.sourceFile}</span>
                </div>
              ` : ''}
            </div>
            <div class="case-subject-tags">
              ${(activeCase.subjects || []).map(s => `<span class="case-sub-tag ${s}">${s}</span>`).join('')}
            </div>
          </div>

          <div class="case-fact-text">
            ${activeCase.facts.replace(/\n\n/g, '<br><br>')}
          </div>

          <!-- VINCULACIÓN CON APUNTES DEL TEMARIO Y CARPETA FUENTES -->
          ${(activeCase.linkedTopics && activeCase.linkedTopics.length > 0) || (activeCase.linkedApuntes && activeCase.linkedApuntes.length > 0) || activeCase.linkedFuentes ? `
            <div class="case-linked-sources-card">
              <div class="linked-sources-header">
                <i data-lucide="book-open"></i>
                <span>Cédulas del Temario & Fuentes Dogmáticas Vinculadas</span>
              </div>
              <div class="linked-topics-pills">
                ${(activeCase.linkedTopics || []).map(t => {
                  const dispCode = t.indexCode || t.code || '';
                  const safeCode = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(dispCode) : dispCode;
                  const safeTitle = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(t.title || '') : (t.title || '');
                  return `
                  <button type="button" class="btn-linked-topic" data-goto-topic="${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(t.id) : t.id}" title="Estudiar apunte oficial: ${safeTitle}">
                    <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
                    <span>§ ${safeCode} ${safeTitle}</span>
                  </button>
                `;}).join('')}
              </div>
              ${activeCase.linkedApuntes && activeCase.linkedApuntes.length > 0 ? `
                <div class="linked-apuntes-section" style="margin-top: 8px;">
                  <div class="linked-sources-subheader" style="font-size: 0.8rem; color: var(--text-muted, #94a3b8); margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="bookmark" style="width: 12px; height: 12px;"></i>
                    <span>Apuntes de Grado Nutridos (${activeCase.linkedApuntes.length})</span>
                  </div>
                  <div class="linked-topics-pills">
                    ${activeCase.linkedApuntes.map(ap => {
                      const safeCode = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(ap.code || '') : (ap.code || '');
                      const safeTitle = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(ap.title || '') : (ap.title || '');
                      const safeFile = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(ap.sourceFile || '') : (ap.sourceFile || '');
                      return `
                        <button type="button" class="btn-linked-topic btn-linked-apunte" data-goto-topic="${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(ap.id) : ap.id}" title="Apunte oficial: ${safeTitle} (${safeFile})">
                          <i data-lucide="file-check" style="width: 12px; height: 12px;"></i>
                          <span>§ ${safeCode} ${safeTitle} <small style="opacity: 0.75;">(${safeFile})</small></span>
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : ''}
              ${activeCase.linkedFuentes ? `
                <div class="linked-fuentes-row">
                  <i data-lucide="file-text" style="width: 13px; height: 13px;"></i>
                  <span>Fuente doctrinal: <strong>fuentes/${activeCase.linkedFuentes.file}</strong> (${activeCase.linkedFuentes.section}) — <em>${activeCase.linkedFuentes.rules}</em></span>
                </div>
              ` : ''}
              ${activeCase.dogmaticPrinciples ? `
                <div class="linked-dogma-quote">
                  <i data-lucide="quote" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i>
                  ${activeCase.dogmaticPrinciples}
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- ACORDEÓN PAUTA DE HECHOS (PAUTA 2026) -->
          ${activeCase.factsBreakdown ? `
            <details class="case-facts-breakdown-details">
              <summary class="case-facts-breakdown-summary">
                <i data-lucide="chevron-right" class="chevron-icon" style="width: 16px; height: 16px;"></i>
                <i data-lucide="clipboard-list" style="width: 16px; height: 16px;"></i>
                <span>Pauta de Análisis de Hechos (Pauta 2026) — Desglose de Hechos, Partes e Instituciones</span>
              </summary>
              <div class="facts-breakdown-content">
                ${activeCase.factsBreakdown.principales && activeCase.factsBreakdown.principales.length > 0 ? `
                  <div class="fact-box-card">
                    <div class="fact-box-header principales">
                      <i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i>
                      <span>Hechos Jurídicamente Principales</span>
                    </div>
                    <ul class="fact-box-list">
                      ${activeCase.factsBreakdown.principales.map(h => `<li>${h}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}

                ${activeCase.factsBreakdown.secundarios && activeCase.factsBreakdown.secundarios.length > 0 ? `
                  <div class="fact-box-card">
                    <div class="fact-box-header secundarios">
                      <i data-lucide="info" style="width: 14px; height: 14px;"></i>
                      <span>Hechos Secundarios</span>
                    </div>
                    <ul class="fact-box-list">
                      ${activeCase.factsBreakdown.secundarios.map(h => `<li>${h}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}

                ${activeCase.factsBreakdown.distractores && activeCase.factsBreakdown.distractores.length > 0 ? `
                  <div class="fact-box-card">
                    <div class="fact-box-header distractores">
                      <i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i>
                      <span>Hechos Distractores</span>
                    </div>
                    <ul class="fact-box-list">
                      ${activeCase.factsBreakdown.distractores.map(h => `<li>${h}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}

                ${activeCase.factsBreakdown.partes ? `
                  <div class="fact-box-card">
                    <div class="fact-box-header partes">
                      <i data-lucide="users" style="width: 14px; height: 14px;"></i>
                      <span>Partes Involucradas</span>
                    </div>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0; line-height: 1.5;">
                      <strong>Principales:</strong> ${activeCase.factsBreakdown.partes.principales || 'No especificadas'}<br>
                      <strong>Secundarias:</strong> ${activeCase.factsBreakdown.partes.secundarias || 'No especificadas'}
                    </p>
                  </div>
                ` : ''}

                ${activeCase.factsBreakdown.instituciones && activeCase.factsBreakdown.instituciones.length > 0 ? `
                  <div class="fact-box-card">
                    <div class="fact-box-header instituciones">
                      <i data-lucide="scale" style="width: 14px; height: 14px;"></i>
                      <span>Instituciones Jurídicas Relevantes</span>
                    </div>
                    <ul class="fact-box-list">
                      ${activeCase.factsBreakdown.instituciones.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </details>
          ` : ''}
        </div>

        <!-- BARRA NAVEGADORA DE PREGUNTAS -->
        <div class="case-questions-nav-bar">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-right: 6px; text-transform: uppercase;">
            Parte I — Preguntas:
          </span>
          ${questions.map((q, idx) => {
            const qEval = evaluations[q.id];
            let statusIcon = "";
            let statusClass = "";
            const isLockedByDemo = isDemo && idx > 0;

            if (isLockedByDemo) {
              statusClass = "locked-demo";
              statusIcon = "🔒 Pase Activo";
            } else if (qEval && qEval.isEvaluated) {
              if (qEval.isDemoEvaluation) {
                if (qEval.isCorrect) {
                  statusClass = "completed";
                  statusIcon = "✓ 1.0/1.0";
                } else {
                  statusClass = "incorrect-badge";
                  statusIcon = "✕ 0.0/1.0";
                }
              } else if (qEval.isCorrect) {
                statusClass = "completed";
                statusIcon = `✓ ${qEval.totalScore.toFixed(1)}/5.0`;
              } else {
                statusClass = "incorrect-badge";
                statusIcon = `✕ 0.0/5.0`;
              }
            } else if (answers[q.id]) {
              statusIcon = `Opción ${answers[q.id].toUpperCase()}`;
            }

            return `
              <button class="question-nav-btn ${idx === qIndex ? 'active' : ''} ${statusClass}" data-q-index="${idx}" ${isLockedByDemo ? 'data-is-locked="true"' : ''}>
                <span class="question-nav-badge">${isLockedByDemo ? '🔒' : `P${idx + 1}`}</span>
                <span>Pregunta ${idx + 1}</span>
                ${statusIcon ? `<span style="font-size: 0.72rem; font-family: var(--font-mono); opacity: 0.9;">${statusIcon}</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>

        ${isDemo && qIndex > 0 ? `
          <!-- TARJETA DE BLOQUEO DEMO: VENTAJAS EXCLUSIVAS DEL PASE DE GRADO -->
          <div class="case-demo-locked-card" id="demo-locked-card">
            <div class="demo-locked-header">
              <div class="demo-locked-icon-badge">
                <i data-lucide="lock"></i>
              </div>
              <h2 class="demo-locked-title">Pregunta ${qIndex + 1} Reservada para Pase de Grado</h2>
              <p class="demo-locked-description">
                En la <strong>Versión Demo</strong> puedes resolver y validar la primera pregunta de este caso. Para desbloquear las preguntas avanzadas, el análisis procesal correlativo y la retroalimentación argumentativa completa con IA, activa tu Pase de Grado con tu código de acceso.
              </p>
            </div>

            <div class="demo-advantages-header">
              <i data-lucide="sparkles"></i>
              <span>Ventajas Exclusivas de la Versión con Código de Acceso</span>
            </div>

            <div class="demo-advantages-grid">
              <div class="advantage-item-card">
                <div class="advantage-icon-wrap">
                  <i data-lucide="layers"></i>
                </div>
                <div class="advantage-info">
                  <h4>Resolución Integral del Caso (Todas las Preguntas)</h4>
                  <p>Acceso irrestricto a las 3 a 5 preguntas de alternativas de cada caso práctico, cubriendo todo el espectro de la litis civil y procesal.</p>
                </div>
              </div>

              <div class="advantage-item-card">
                <div class="advantage-icon-wrap">
                  <i data-lucide="scale"></i>
                </div>
                <div class="advantage-info">
                  <h4>Evaluación Argumentativa con Rúbrica Oficial AIME 2026-20</h4>
                  <p>Justifica jurídicamente cada opción con retroalimentación en 4 dimensiones: Marco Jurídico, Hechos Relevantes, Subsunción y Precisión Técnica (hasta 5.0 pts por pregunta).</p>
                </div>
              </div>

              <div class="advantage-item-card">
                <div class="advantage-icon-wrap">
                  <i data-lucide="bot"></i>
                </div>
                <div class="advantage-info">
                  <h4>Generador Inédito de Casos con IA Ilimitado</h4>
                  <p>Crea infinitos casos prácticos inéditos adaptados a tu cédula o materia de interés con pauta de corrección y desglose dogmático en tiempo real.</p>
                </div>
              </div>

              <div class="advantage-item-card">
                <div class="advantage-icon-wrap">
                  <i data-lucide="check-circle-2"></i>
                </div>
                <div class="advantage-info">
                  <h4>Soluciones Dogmáticas de Nivel Grado</h4>
                  <p>Consulta las soluciones estratégicas modelo, normas de fondo/forma aplicables y jurisprudencia doctrinaria de respaldo para cada caso.</p>
                </div>
              </div>
            </div>

            <div class="demo-locked-cta-bar">
              <button type="button" class="btn btn-secondary btn-back-to-q1" data-goto-q1="true">
                <i data-lucide="arrow-left"></i>
                <span>Volver a Pregunta 1 (Disponible en Demo)</span>
              </button>
              <button type="button" class="btn btn-primary btn-trigger-convalidate">
                <i data-lucide="key"></i>
                <span>Convalidar mi Código de Acceso</span>
              </button>
            </div>
          </div>
        ` : `
          <!-- TARJETA PRINCIPAL DE LA PREGUNTA ACTIVA -->
          <div class="mc-question-wrapper" id="question-card-${currentQ.id}">
            <div class="mc-question-header">
              <div>
                <span class="mc-area-badge">
                  <i data-lucide="bookmark"></i>
                  ${currentQ.area || 'Pregunta de Grado'}
                </span>
                <h2 class="mc-question-title">
                  Pregunta ${qIndex + 1}: ${currentQ.questionText}
                </h2>
              </div>
            </div>

            <!-- LISTA DE ALTERNATIVAS A, B, C, D, E -->
            <div class="mc-options-list">
              ${(currentQ.options || []).map(opt => {
                const isSelected = selectedOption === opt.id;
                let cardClass = isSelected ? "selected" : "";
                let iconHtml = "";

                if (isEvaluated) {
                  cardClass += " evaluated";
                  if (opt.id === currentQ.correctAnswer) {
                    cardClass += " correct";
                    iconHtml = '<i data-lucide="check-circle" style="color: var(--success); width: 20px; height: 20px;"></i>';
                  } else if (isSelected && !evaluation.isCorrect) {
                    cardClass += " incorrect";
                    iconHtml = '<i data-lucide="x-circle" style="color: var(--danger); width: 20px; height: 20px;"></i>';
                  }
                }

                return `
                  <div class="mc-option-card ${cardClass}" data-option-id="${opt.id}">
                    <div class="mc-option-letter">${opt.id.toUpperCase()}</div>
                    <div class="mc-option-text">${opt.text}</div>
                    <div class="mc-option-status-icon">${iconHtml}</div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- ÁREA DE JUSTIFICACIÓN -->
            ${isDemo ? `
              <!-- MODO DEMO: JUSTIFICACIÓN BLOQUEADA / NOTIFICACIÓN EXPLICATIVA -->
              <div class="demo-justification-notice">
                <div class="demo-justification-notice-header">
                  <div class="demo-justification-notice-title">
                    <i data-lucide="lock"></i>
                    <span>Redacción Argumentativa Reservada para Pase de Grado</span>
                  </div>
                  <span class="demo-justification-pill">Modo Demo</span>
                </div>
                <p class="demo-justification-notice-text">
                  En la <strong>Versión Demo</strong> la evaluación se concentra exclusivamente en acertar la alternativa correcta (+1.0 pto). La redacción argumentativa y la calificación en 4 dimensiones según la Rúbrica Oficial AIME 2026-20 están disponibles con tu <button type="button" class="btn-link-convalidate">Pase de Acceso</button>.
                </p>
              </div>
            ` : `
              <div class="mc-justification-section">
                <div class="mc-justification-header">
                  <div class="mc-justification-title">
                    <i data-lucide="align-left"></i>
                    <span>Justificación Técnico-Jurídica (Componente Argumentativo)</span>
                  </div>
                  <div class="rubric-weights-pills">
                    <span class="rubric-mini-pill" title="Dimensión 1: Marco Jurídico">Marco: <strong>0.5 pt</strong></span>
                    <span class="rubric-mini-pill" title="Dimensión 2: Hechos Relevantes">Hechos: <strong>1.0 pt</strong></span>
                    <span class="rubric-mini-pill" title="Dimensión 3: Subsunción y Razonamiento">Subsunción: <strong>2.0 pts</strong></span>
                    <span class="rubric-mini-pill" title="Dimensión 4: Claridad Técnica">Claridad: <strong>0.5 pt</strong></span>
                  </div>
                </div>

                <!-- Guía oficial de argumentación -->
                <div class="justification-guidance-box">
                  <div class="guidance-box-title">
                    <i data-lucide="compass"></i>
                    Estructura de la Justificación según Rúbrica de la Universidad:
                  </div>
                  <ol class="guidance-steps-list">
                    <li><strong>1. Marco Jurídico:</strong> Identifica con precisión la regla, garantía o principio positivo aplicable.</li>
                    <li><strong>2. Hechos Relevantes:</strong> Selecciona los hechos precisos del caso que activan la norma identificada.</li>
                    <li><strong>3. Subsunción y Razonamiento:</strong> Desarrolla el silogismo jurídico que explica por qué tu opción es la correcta y descarta las demás.</li>
                    <li><strong>4. Precisión Técnica:</strong> Redacta con lenguaje técnico riguroso, sin ambigüedades.</li>
                  </ol>
                </div>

                <textarea 
                  id="input-mc-justification" 
                  class="mc-justification-textarea" 
                  placeholder="Escribe aquí tu justificación técnico-jurídica fundamentando la alternativa marcada..."
                >${this.escapeText(justificationText)}</textarea>
              </div>
            `}

            <!-- BARRA DE ACCIONES -->
            <div class="mc-actions-bar">
              ${isDemo ? `
                ${isEvaluated ? `
                  <button id="btn-reset-evaluation" class="btn btn-secondary btn-sm" title="Reintentar esta pregunta">
                    <i data-lucide="rotate-ccw"></i>
                    <span>Reintentar Alternativa</span>
                  </button>
                ` : ''}
                <button id="btn-evaluate-question" class="btn btn-primary">
                  <i data-lucide="check-circle-2"></i>
                  <span>${isEvaluated ? 'Reevaluar Alternativa (Modo Demo)' : 'Evaluar Alternativa (Modo Demo)'}</span>
                </button>
              ` : `
                <button id="btn-save-mc-draft" class="btn btn-secondary">
                  <i data-lucide="save"></i>
                  <span>Guardar Borrador</span>
                </button>

                <div style="display: flex; gap: 10px; align-items: center;">
                  ${isEvaluated ? `
                    <button id="btn-reset-evaluation" class="btn btn-secondary btn-sm" title="Reintentar esta pregunta">
                      <i data-lucide="rotate-ccw"></i>
                      <span>Reintentar</span>
                    </button>
                  ` : ''}
                  <button id="btn-evaluate-question" class="btn btn-primary">
                    <i data-lucide="award"></i>
                    <span>${isEvaluated ? 'Recalcular Evaluación' : 'Evaluar según Rúbrica Oficial (AIME 2026-20)'}</span>
                  </button>
                </div>
              `}
            </div>

            <!-- RESULTADO DE LA EVALUACIÓN SEGÚN RÚBRICA OFICIAL -->
            ${isEvaluated ? this.renderEvaluationResult(currentQ, evaluation) : ''}

          </div>
        `}
      </div>
    `;
  },

  /**
   * Renderiza el resultado de la evaluación aplicando el Criterio Excluyente o la Rúbrica Oficial de 4 Dimensiones
   */
  renderEvaluationResult(question, evaluation) {
    if (evaluation.isDemoEvaluation) {
      const isCorrect = Boolean(evaluation.isCorrect);
      return `
        <div class="demo-eval-result-card ${isCorrect ? 'correct' : 'incorrect'}">
          <div class="demo-eval-badge-row">
            <div class="demo-eval-result-badge ${isCorrect ? 'correct' : 'incorrect'}">
              <i data-lucide="${isCorrect ? 'check-circle-2' : 'x-circle'}"></i>
              <span>${isCorrect ? '¡Alternativa Correcta! (+1.0 pto)' : 'Alternativa Incorrecta (0.0 pts)'}</span>
            </div>
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">
              Modo Demo: Alternativa ${isCorrect ? '1.0 / 1.0 pt' : '0.0 / 1.0 pt'}
            </span>
          </div>

          <div class="demo-eval-explanation">
            <h4><i data-lucide="book-open"></i> Fundamentación Dogmática Oficial (Opción ${question.correctAnswer.toUpperCase()}):</h4>
            <p>${question.explanation}</p>
          </div>

          <div class="demo-eval-upsell-box">
            <div class="demo-eval-upsell-header">
              <i data-lucide="lock"></i>
              <span>¿Deseas justificar tus respuestas y ser evaluado con la Rúbrica Oficial?</span>
            </div>
            <p class="demo-eval-upsell-text">
              Con el <strong>Pase de Grado</strong> puedes redactar tu justificación jurídica y recibir calificación cuantitativa en 4 dimensiones (Marco Jurídico, Hechos, Subsunción y Precisión Técnica) hasta 5.0 puntos por pregunta, además de desbloquear todas las preguntas restantes del caso.
            </p>
            <button type="button" class="btn btn-primary btn-sm btn-trigger-convalidate" style="margin-top: 8px;">
              <i data-lucide="key"></i>
              <span>Convalidar Pase de Grado</span>
            </button>
          </div>
        </div>
      `;
    }

    const isCorrect = evaluation.isCorrect;
    const isExclusionary = evaluation.isExclusionary || !isCorrect;

    // INCIDENTE DE SEGURIDAD: Inyección de prompt, comandos de override o payloads maliciosos detectados
    if (evaluation.securityIncident) {
      return `
        <!-- BANNER DE INCIDENTE DE INTEGRIDAD Y CIBERSEGURIDAD -->
        <div class="criterio-excluyente-banner" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.08);">
          <div class="criterio-excluyente-header" style="color: #f59e0b;">
            <i data-lucide="shield-alert" style="width: 22px; height: 22px;"></i>
            <span>Alerta de Integridad Académica y Ciberseguridad</span>
          </div>
          <div class="criterio-excluyente-body">
            Se detectaron patrones de manipulación adversarial, inyección de comandos o código ajeno a una fundamentación jurídica en el texto analizado:
            <div style="margin: 8px 0; font-weight: 600; color: #fbbf24;">
              ${this.escapeText(evaluation.securityReason || 'Intento de inyección de prompt o manipulación de rúbrica')}
            </div>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 6px;">
              El protocolo oficial de examen de grado exige fundamentar exclusivamente mediante reglas positivas (CC, CPC, COT, CPR), hechos acreditados y razonamiento silogístico. Las instrucciones o comandos dirigidos al evaluador no tienen valor dogmático y reciben 0.0 puntos.
            </p>
            <strong>Puntaje Obtenido: ${evaluation.totalScore.toFixed(1)} / 5.0 pts (Alt: +${evaluation.scoreAlternative.toFixed(1)} | Just: 0.0/4.0)</strong>
          </div>

          <div class="official-explanation-card" style="border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.05);">
            <div class="official-explanation-header" style="color: #fbbf24;">
              <i data-lucide="info"></i>
              <span>Fundamentación Dogmática Oficial: Opción ${question.correctAnswer.toUpperCase()}</span>
            </div>
            <div class="official-explanation-text">
              ${this.escapeText(question.explanation)}
            </div>
          </div>
          ${this.renderQuestionPautaAndFatalError(question)}
        </div>
      `;
    }

    if (isExclusionary) {
      return `
        <!-- BANNER DE CRITERIO EXCLUYENTE -->
        <div class="criterio-excluyente-banner">
          <div class="criterio-excluyente-header">
            <i data-lucide="alert-octagon" style="width: 22px; height: 22px;"></i>
            <span>Criterio Excluyente Aplicado (0.0 Puntos en Justificación)</span>
          </div>
          <div class="criterio-excluyente-body">
            Has seleccionado la alternativa <strong>Opción ${evaluation.selectedOption ? evaluation.selectedOption.toUpperCase() : 'Ninguna'}</strong>, la cual es <strong>INCORRECTA</strong>.
            <br><br>
            De acuerdo con el <strong>Protocolo de Rendición de Examen de Grado (Plan D.U. 11-2022)</strong> y la <strong>Rúbrica Oficial Parte I</strong>:
            <blockquote style="margin: 10px 0; padding: 10px 14px; background: rgba(0,0,0,0.25); border-left: 3px solid var(--danger); font-style: italic; border-radius: 4px;">
              "Si el/la estudiante marca una alternativa errónea, la justificación recibe automáticamente 0 PUNTOS, con total prescindencia de los argumentos técnicos que hubiere desarrollado."
            </blockquote>
            <strong>Puntaje Obtenido en esta Pregunta: 0.0 / 5.0 pts.</strong>
          </div>

          <div class="official-explanation-card" style="border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05);">
            <div class="official-explanation-header" style="color: #f87171;">
              <i data-lucide="info"></i>
              <span>Alternativa Correcta: Opción ${question.correctAnswer.toUpperCase()}</span>
            </div>
            <div class="official-explanation-text">
              ${question.explanation}
            </div>
          </div>
          ${this.renderQuestionPautaAndFatalError(question)}
        </div>
      `;
    }

    // ALTERNATIVA CORRECTA: Desplegar Rúbrica Oficial en 4 Dimensiones
    const rScores = evaluation.rubricScores || { criterio1: 0.5, criterio2: 1.0, criterio3: 2.0, criterio4: 0.5 };
    const justScore = (rScores.criterio1 + rScores.criterio2 + rScores.criterio3 + rScores.criterio4);
    const totalScore = 1.0 + justScore; // 1.0 por alternativa correcta

    const rubric = question.officialRubric || {
      criterio1Marco: { name: "Marco Jurídico Pertinente", maxPoints: 0.5, guidingQuestion: "¿Qué norma o principio sustenta la respuesta?", outstanding: "Cita con precisión las normas aplicables.", sufficient: "Identifica la institución.", basic: "Mención genérica.", insufficient: "Norma errónea." },
      criterio2Hechos: { name: "Hechos Jurídicamente Relevantes", maxPoints: 1.0, guidingQuestion: "¿Qué hechos específicos activan la regla?", outstanding: "Identifica con exactitud los hechos fácticos.", sufficient: "Identifica los hechos principales.", basic: "Mención imprecisa.", insufficient: "No identifica hechos." },
      criterio3Subsuncion: { name: "Subsunción y Razonamiento", maxPoints: 2.0, guidingQuestion: "¿Cómo encajan los hechos en la hipótesis normativa?", outstanding: "Silogismo jurídico impecable descartando distractores.", sufficient: "Explica la aplicación de la norma.", basic: "Argumentación incompleta.", insufficient: "Contradicción o error inexcusable." },
      criterio4Precision: { name: "Claridad y Precisión Técnica", maxPoints: 0.5, guidingQuestion: "¿Uso riguroso del lenguaje jurídico?", outstanding: "Vocabulario técnico impecable.", sufficient: "Redacción clara.", basic: "Errores menores.", insufficient: "Lenguaje coloquial o confuso." }
    };

    return `
      <!-- TARJETA DE EVALUACIÓN Y RÚBRICA OFICIAL -->
      <div class="rubric-evaluation-panel">
        <div class="rubric-evaluation-header">
          <div class="rubric-header-title">
            <i data-lucide="award"></i>
            <span>Evaluación Oficial: Rúbrica de Justificación (AIME 2026-20)</span>
          </div>
          <div class="rubric-total-badge" id="live-rubric-total">
            <i data-lucide="check-circle" style="color: var(--success); width: 16px; height: 16px;"></i>
            <span>PUNTAJE TOTAL: <strong>${totalScore.toFixed(1)} / 5.0 pts</strong> (Alt: +1.0 | Just: ${justScore.toFixed(1)}/4.0)</span>
          </div>
        </div>

        <div class="rubric-dimensions-container">
          
          <!-- Dimensión 1: Marco Jurídico (0.5 pts) -->
          ${this.renderRubricDimension(
            "criterio1", 
            rubric.criterio1Marco.name, 
            0.5, 
            rubric.criterio1Marco.guidingQuestion, 
            rScores.criterio1,
            [
              { level: "destacado", name: "Destacado", pts: 0.5, desc: rubric.criterio1Marco.outstanding },
              { level: "suficiente", name: "Suficiente", pts: 0.4, desc: rubric.criterio1Marco.sufficient },
              { level: "basico", name: "Básico", pts: 0.2, desc: rubric.criterio1Marco.basic },
              { level: "insuficiente", name: "Insuficiente", pts: 0.0, desc: rubric.criterio1Marco.insufficient }
            ]
          )}

          <!-- Dimensión 2: Hechos Relevantes (1.0 pto) -->
          ${this.renderRubricDimension(
            "criterio2", 
            rubric.criterio2Hechos.name, 
            1.0, 
            rubric.criterio2Hechos.guidingQuestion, 
            rScores.criterio2,
            [
              { level: "destacado", name: "Destacado", pts: 1.0, desc: rubric.criterio2Hechos.outstanding },
              { level: "suficiente", name: "Suficiente", pts: 0.7, desc: rubric.criterio2Hechos.sufficient },
              { level: "basico", name: "Básico", pts: 0.3, desc: rubric.criterio2Hechos.basic },
              { level: "insuficiente", name: "Insuficiente", pts: 0.0, desc: rubric.criterio2Hechos.insufficient }
            ]
          )}

          <!-- Dimensión 3: Subsunción y Razonamiento (2.0 pts) -->
          ${this.renderRubricDimension(
            "criterio3", 
            rubric.criterio3Subsuncion.name, 
            2.0, 
            rubric.criterio3Subsuncion.guidingQuestion, 
            rScores.criterio3,
            [
              { level: "destacado", name: "Destacado", pts: 2.0, desc: rubric.criterio3Subsuncion.outstanding },
              { level: "suficiente", name: "Suficiente", pts: 1.3, desc: rubric.criterio3Subsuncion.sufficient },
              { level: "basico", name: "Básico", pts: 0.7, desc: rubric.criterio3Subsuncion.basic },
              { level: "insuficiente", name: "Insuficiente", pts: 0.0, desc: rubric.criterio3Subsuncion.insufficient }
            ]
          )}

          <!-- Dimensión 4: Claridad y Precisión Técnica (0.5 pts) -->
          ${this.renderRubricDimension(
            "criterio4", 
            rubric.criterio4Precision.name, 
            0.5, 
            rubric.criterio4Precision.guidingQuestion, 
            rScores.criterio4,
            [
              { level: "destacado", name: "Destacado", pts: 0.5, desc: rubric.criterio4Precision.outstanding },
              { level: "suficiente", name: "Suficiente", pts: 0.4, desc: rubric.criterio4Precision.sufficient },
              { level: "basico", name: "Básico", pts: 0.2, desc: rubric.criterio4Precision.basic },
              { level: "insuficiente", name: "Insuficiente", pts: 0.0, desc: rubric.criterio4Precision.insufficient }
            ]
          )}

          <!-- EXPLICACIÓN Y SOLUCIÓN OFICIAL MODELO -->
          <div class="official-explanation-card">
            <div class="official-explanation-header">
              <i data-lucide="check-circle-2"></i>
              <span>Fundamento Técnico y Criterio de Corrección Oficial:</span>
            </div>
            <div class="official-explanation-text">
              ${question.explanation}
            </div>
          </div>

          ${this.renderQuestionPautaAndFatalError(question)}

        </div>
      </div>
    `;
  },

  /**
   * Renderiza la Pauta de Corrección Oficial y el Error Fatal de Grado
   */
  renderQuestionPautaAndFatalError(question) {
    if (!question) return '';
    let html = '';
    if (question.pauta) {
      const safePauta = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(question.pauta) : question.pauta;
      html += `
        <div class="question-pauta-card" style="margin-top: 12px; padding: 12px 16px; background: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; border-radius: 6px;">
          <div style="font-size: 0.85rem; font-weight: 700; color: #60a5fa; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="target" style="width: 15px; height: 15px;"></i>
            <span>Pauta de Corrección Oficial (Criterio Examen de Grado)</span>
          </div>
          <div style="font-size: 0.88rem; line-height: 1.5; color: var(--text-primary, #e2e8f0);">
            ${safePauta}
          </div>
        </div>
      `;
    }
    if (question.errorFatalDeGrado) {
      const safeFatal = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(question.errorFatalDeGrado) : question.errorFatalDeGrado;
      html += `
        <div class="question-fatal-error-card" style="margin-top: 10px; padding: 12px 16px; background: rgba(239, 68, 68, 0.10); border-left: 4px solid #ef4444; border-radius: 6px;">
          <div style="font-size: 0.85rem; font-weight: 700; color: #f87171; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="alert-triangle" style="width: 15px; height: 15px;"></i>
            <span>Error Fatal de Grado (Causal Inmediata de Reprobación)</span>
          </div>
          <div style="font-size: 0.88rem; line-height: 1.5; color: var(--text-primary, #e2e8f0);">
            ${safeFatal}
          </div>
        </div>
      `;
    }
    return html;
  },

  renderRubricDimension(critKey, title, maxPts, guidingQuestion, currentVal, levels) {
    return `
      <div class="rubric-dimension-card" data-crit-key="${critKey}">
        <div class="dimension-card-header">
          <div class="dimension-name-wrap">
            <i data-lucide="check-square" style="width: 15px; height: 15px; color: var(--gold-primary);"></i>
            <span>${title}</span>
          </div>
          <span class="dimension-max-badge">Máx: ${maxPts.toFixed(1)} pts</span>
        </div>
        ${guidingQuestion ? `<div class="dimension-guiding-question">${guidingQuestion}</div>` : ''}

        <div class="dimension-levels-grid">
          ${levels.map(lvl => {
            const isSelected = Math.abs(currentVal - lvl.pts) < 0.05;
            return `
              <button type="button" class="dimension-level-btn ${isSelected ? 'selected' : ''}" data-crit="${critKey}" data-pts="${lvl.pts}">
                <div class="level-top-row">
                  <span class="level-name ${lvl.level}">${lvl.name}</span>
                  <span class="level-pts">${lvl.pts.toFixed(1)}</span>
                </div>
                <div class="level-descriptor">${lvl.desc}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Renderiza el modo clásico (para casos personalizados creados manualmente)
   */
  renderClassicWorkspace(activeCase, draft, mobileHeaderHtml) {
    const isModelVisible = draft.isModelRevealed || false;

    return `
      <div class="case-workspace-inner">
        ${mobileHeaderHtml}
        <!-- STEPPER DE METODOLOGÍA -->
        <div class="methodology-stepper">
          <div class="step-item ${this.activeStep === 1 ? 'active' : ''} ${draft.conflict ? 'completed' : ''}" data-step="1">
            <span class="step-number">1</span>
            <span>Hechos & Conflicto</span>
          </div>
          <div class="step-connector"></div>
          <div class="step-item ${this.activeStep === 2 ? 'active' : ''} ${draft.normative ? 'completed' : ''}" data-step="2">
            <span class="step-number">2</span>
            <span>Fundamento Normativo</span>
          </div>
          <div class="step-connector"></div>
          <div class="step-item ${this.activeStep === 3 ? 'active' : ''} ${draft.reasoning ? 'completed' : ''}" data-step="3">
            <span class="step-number">3</span>
            <span>Subsunción & Razonamiento</span>
          </div>
          <div class="step-connector"></div>
          <div class="step-item ${this.activeStep === 4 ? 'active' : ''} ${draft.dogmatic ? 'completed' : ''}" data-step="4">
            <span class="step-number">4</span>
            <span>Dogmática Aplicada</span>
          </div>
        </div>

        <!-- PLANTEAMIENTO DEL CASO Y PREGUNTAS -->
        <div class="case-fact-card">
          <div class="case-fact-header">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <h1 class="case-fact-title">${activeCase.title}</h1>
              ${activeCase.sourceFile ? `
                <div class="case-source-file-info">
                  <i data-lucide="file-text" style="width: 12px; height: 12px;"></i>
                  <span><strong>${activeCase.sourceCategoryLabel || 'Carpeta CASOS'}:</strong> ${activeCase.sourceFile}</span>
                </div>
              ` : ''}
            </div>
            <div class="case-subject-tags">
              ${(activeCase.subjects || []).map(s => `<span class="case-sub-tag ${s}">${s}</span>`).join('')}
            </div>
          </div>

          <div class="case-fact-text">
            ${activeCase.facts.replace(/\n\n/g, '<br><br>')}
          </div>

          ${activeCase.pautaDocente ? `
            <div class="pauta-docente-callout">
              <div class="pauta-docente-callout-header">
                <i data-lucide="clipboard-check"></i>
                <span>Pauta de Evaluación & Criterios del Docente (Documento de Origen)</span>
              </div>
              <div class="pauta-docente-callout-body">
                ${activeCase.pautaDocente.replace(/\n\n/g, '<br><br>')}
              </div>
            </div>
          ` : ''}

          ${activeCase.questions && activeCase.questions.length > 0 ? `
            <div class="case-questions-box">
              <div class="case-questions-title">
                <i data-lucide="help-circle" style="display: inline; width: 14px; vertical-align: middle;"></i>
                Preguntas Clave del Tribunal de Grado:
              </div>
              <ol class="case-question-list">
                ${activeCase.questions.map(q => `<li>${typeof q === 'string' ? q : q.questionText}</li>`).join('')}
              </ol>
            </div>
          ` : ''}
        </div>

        <!-- FORMULARIO DE RESOLUCIÓN ACTIVA (4 DIMENSIONES) -->
        <div class="methodology-work-grid">
          
          <div class="method-block" id="block-step-1">
            <div class="method-block-header">
              <div class="method-block-title">
                <i data-lucide="target"></i>
                <span>1. Hechos Relevantes y Conflicto Jurídico Central</span>
              </div>
              <span class="method-badge-pill">¿Qué se controvierte?</span>
            </div>
            <textarea class="method-textarea" id="input-conflict" placeholder="Define con precisión la litis o conflicto de intereses con relevancia jurídica...">${this.escapeText(draft.conflict || '')}</textarea>
          </div>

          <div class="method-block" id="block-step-2">
            <div class="method-block-header">
              <div class="method-block-title">
                <i data-lucide="book-marked"></i>
                <span>2. Fundamento Normativo (Códigos, Leyes y CPR)</span>
              </div>
              <span class="method-badge-pill">Artículos e Instituciones Positivas</span>
            </div>
            <textarea class="method-textarea" id="input-normative" placeholder="Cita las normas aplicables (ej. Art. 1454 CC, Art. 309 CPC, Art. 19 N° 24 CPR...)...">${this.escapeText(draft.normative || '')}</textarea>
          </div>

          <div class="method-block" id="block-step-3">
            <div class="method-block-header">
              <div class="method-block-title">
                <i data-lucide="scale"></i>
                <span>3. Razonamiento Jurídico y Subsunción de los Hechos</span>
              </div>
              <span class="method-badge-pill">¿Cómo se encajan los hechos en la norma?</span>
            </div>
            <textarea class="method-textarea" id="input-reasoning" style="min-height: 120px;" placeholder="Desarrolla el silogismo jurídico y argumentación técnica paso a paso...">${this.escapeText(draft.reasoning || '')}</textarea>
          </div>

          <div class="method-block" id="block-step-4">
            <div class="method-block-header">
              <div class="method-block-title">
                <i data-lucide="feather"></i>
                <span>4. Tipo de Dogmática y Doctrina Aplicada</span>
              </div>
              <span class="method-badge-pill">Teorías, Principios y Criterios</span>
            </div>
            <textarea class="method-textarea" id="input-dogmatic" placeholder="Ej: Teoría de los actos propios, eficacia horizontal (Drittwirkung), principio de congruencia, buena fe objetiva...">${this.escapeText(draft.dogmatic || '')}</textarea>
          </div>

        </div>

        <!-- BARRA DE ACCIONES -->
        <div class="case-actions-bar">
          <button id="btn-save-draft" class="btn btn-secondary">
            <i data-lucide="save"></i>
            <span>Guardar Mis Respuestas</span>
          </button>
          
          <button id="btn-toggle-model" class="btn btn-primary">
            <i data-lucide="${isModelVisible ? 'eye-off' : 'check-circle'}"></i>
            <span>${isModelVisible ? 'Ocultar Solución Modelo' : 'Comparar con Solución de Examen'}</span>
          </button>
        </div>

        ${isModelVisible && activeCase.methodology ? `
          <div class="model-solution-card">
            <div class="model-solution-header">
              <div class="model-solution-title">
                <i data-lucide="award"></i>
                <span>Criterio de Corrección & Solución Dogmática Modelo</span>
              </div>
              <span class="badge-count">Nivel Grado</span>
            </div>
            <div class="model-solution-body">
              <div class="solution-dimension-item">
                <div class="dimension-label"><i data-lucide="target"></i> Conflicto Central</div>
                <div class="dimension-content">${activeCase.methodology.conflict}</div>
              </div>
              <div class="solution-dimension-item">
                <div class="dimension-label"><i data-lucide="book-marked"></i> Fundamento Normativo</div>
                <div class="dimension-content">
                  <ul>${(activeCase.methodology.legalBasis || []).map(norm => `<li>${norm}</li>`).join('')}</ul>
                </div>
              </div>
              <div class="solution-dimension-item">
                <div class="dimension-label"><i data-lucide="scale"></i> Subsunción y Desarrollo</div>
                <div class="dimension-content">${(activeCase.methodology.applicationReasoning || '').replace(/\n\n/g, '<br><br>')}</div>
              </div>
              <div class="solution-dimension-item">
                <div class="dimension-label"><i data-lucide="feather"></i> Dogmática y Doctrina Jurídica</div>
                <div class="dimension-content">${(activeCase.methodology.dogmaticFramework || '').replace(/\n\n/g, '<br><br>')}</div>
              </div>
              ${activeCase.modelSolution ? `
                <div class="solution-dimension-item" style="border-left-color: var(--success);">
                  <div class="dimension-label" style="color: var(--success);"><i data-lucide="check"></i> Solución Estratégica Sugerida</div>
                  <div class="dimension-content">${activeCase.modelSolution.replace(/\n/g, '<br>')}</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  },

  bindEvents(activeCase) {
    // --- 1. EVENTOS GLOBALES DEL BANCO DE CASOS (Disponibles siempre) ---

    // Volver a la lista de casos en móvil
    const btnBack = this.container.querySelector('#btn-back-to-cases');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        this.mobileView = 'list';
        this.render();
      });
    }

    // Filtros de materias y origen
    this.container.querySelectorAll('[data-case-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('[data-case-filter]');
        if (filterBtn) {
          this.setFilter(filterBtn.dataset.caseFilter);
        }
      });
    });

    // Seleccionar caso
    this.container.querySelectorAll('[data-case-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.caseId;
        this.selectCase(id);
      });
    });

    // Navegación directa a cédulas del temario vinculadas
    this.container.querySelectorAll('[data-goto-topic]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const topicId = btn.dataset.gotoTopic;
        if (typeof App !== 'undefined' && typeof App.openTopic === 'function') {
          App.openTopic(topicId);
          if (App.showToast) {
            App.showToast("Cédula del temario abierta para profundización teórica", "info");
          }
        }
      });
    });

    const triggerAiModal = (e) => {
      if (e) e.preventDefault();
      const agent = (typeof CaseGeneratorAgent !== 'undefined') ? CaseGeneratorAgent : (window.CaseGeneratorAgent || (typeof globalThis !== 'undefined' ? globalThis.CaseGeneratorAgent : null));
      if (agent && typeof agent.openModal === 'function') {
        agent.openModal();
      } else {
        console.error("[CaseSolver] CaseGeneratorAgent no está disponible:", agent);
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast("El Agente de IA se está inicializando, intenta nuevamente en un momento.", "warning");
        }
      }
    };

    // Botón principal "Crear con IA"
    const btnAiGen = this.container.querySelector('#btn-open-ai-generator');
    if (btnAiGen) {
      btnAiGen.addEventListener('click', triggerAiModal);
    }

    // Botones de estado vacío "Crear Primer Caso con IA" (Sidebar y Workbench)
    this.container.querySelectorAll('.btn-create-first-ai-case').forEach(btn => {
      btn.addEventListener('click', triggerAiModal);
    });

    // Delegación de eventos en contenedor para robustez total
    if (!this._hasDelegatedAiClick) {
      this.container.addEventListener('click', (e) => {
        const btn = e.target.closest('#btn-open-ai-generator, .btn-create-first-ai-case');
        if (btn) {
          triggerAiModal(e);
        }
      });
      this._hasDelegatedAiClick = true;
    }

    // Botón purgar casos de práctica IA para liberar espacio y optimizar BD
    const btnPurgeAi = this.container.querySelector('#btn-purge-ai-cases');
    if (btnPurgeAi) {
      btnPurgeAi.addEventListener('click', async () => {
        const confirmed = confirm("¿Deseas purgar los casos de práctica generados por IA para liberar memoria y optimizar el sistema?");
        if (!confirmed) return;

        // 1. Limpieza en cliente (StorageService)
        const localRes = StorageService.clearAllAiPracticeCases();

        // 2. Limpieza en backend físico
        try {
          await fetch("/api/ai/clean-practice-cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}"
          });
        } catch (e) {
          console.warn("Aviso: Limpieza remota no disponible, limpiado en local:", e);
        }

        const data = StorageService.getData();
        if (data.cases && data.cases.length > 0) {
          this.currentCaseId = data.cases[0].id;
        } else {
          this.currentCaseId = null;
        }
        this.currentQuestionIndex = 0;
        this.activeFilter = "all";
        this.render();
        App.showToast(`Se han purgado ${localRes.deletedCount} caso(s) de práctica IA. Base de datos optimizada.`, "success");
      });
    }

    // Botón agregar nuevo caso (manual)
    const btnAdd = this.container.querySelector('#btn-add-case');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.promptNewCase();
      });
    }

    // --- 2. EVENTOS DEL CASO ACTIVO (Requieren activeCase) ---
    if (!activeCase) return;

    // Navegar preguntas (P1, P2, P3...)
    this.container.querySelectorAll('[data-q-index]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qBtn = e.target.closest('[data-q-index]');
        if (qBtn) {
          this.saveMcDraft(activeCase.id);
          this.setQuestionIndex(parseInt(qBtn.dataset.qIndex, 10));
        }
      });
    });

    // Seleccionar alternativa A, B, C, D, E
    this.container.querySelectorAll('.mc-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const optId = card.dataset.optionId;
        const qIndex = this.currentQuestionIndex;
        const currentQ = (activeCase.questions || [])[qIndex];
        if (!currentQ) return;

        const draft = StorageService.getCaseDraft(activeCase.id) || {};
        if (!draft.answers) draft.answers = {};
        draft.answers[currentQ.id] = optId;
        StorageService.saveCaseDraft(activeCase.id, draft);

        // Actualizar visualmente la selección
        this.container.querySelectorAll('.mc-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    // Guardar borrador en preguntas de alternativas
    const btnSaveMc = this.container.querySelector('#btn-save-mc-draft');
    if (btnSaveMc) {
      btnSaveMc.addEventListener('click', () => {
        this.saveMcDraft(activeCase.id);
        App.showToast("Borrador guardado con éxito", "success");
      });
    }

    // Evaluar pregunta con Rúbrica Oficial
    const btnEval = this.container.querySelector('#btn-evaluate-question');
    if (btnEval) {
      btnEval.addEventListener('click', () => {
        this.evaluateCurrentQuestion(activeCase);
      });
    }

    // Reintentar / Resetear pregunta evaluada
    const btnReset = this.container.querySelector('#btn-reset-evaluation');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        const qIndex = this.currentQuestionIndex;
        const currentQ = (activeCase.questions || [])[qIndex];
        if (!currentQ) return;

        const draft = StorageService.getCaseDraft(activeCase.id) || {};
        if (draft.evaluations && draft.evaluations[currentQ.id]) {
          delete draft.evaluations[currentQ.id];
          StorageService.saveCaseDraft(activeCase.id, draft);
        }
        this.render();
        App.showToast("Pregunta reiniciada para un nuevo intento", "info");
      });
    }

    // Click en botones de nivel de rúbrica interactiva (Destacado, Suficiente, Básico, Insuficiente)
    this.container.querySelectorAll('.dimension-level-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.dimension-level-btn');
        const critKey = targetBtn.dataset.crit;
        const pts = parseFloat(targetBtn.dataset.pts);
        this.updateRubricScore(activeCase, critKey, pts);
      });
    });

    // Guardar borrador en modo clásico
    const btnSaveClassic = this.container.querySelector('#btn-save-draft');
    if (btnSaveClassic) {
      btnSaveClassic.addEventListener('click', () => {
        this.saveClassicDraft(activeCase.id);
        App.showToast("Respuestas del caso guardadas con éxito", "success");
      });
    }

    // Toggle solución modelo clásico
    const btnModel = this.container.querySelector('#btn-toggle-model');
    if (btnModel) {
      btnModel.addEventListener('click', () => {
        const draft = StorageService.getCaseDraft(activeCase.id) || {};
        draft.isModelRevealed = !draft.isModelRevealed;
        this.saveClassicDraft(activeCase.id, draft.isModelRevealed);
        this.render();
      });
    }

    // Activación inline en caso bloqueado
    const btnInlineCase = this.container.querySelector('#inline-case-license-code');
    const btnInlineCaseAct = this.container.querySelector('#btn-inline-case-activate');
    if (btnInlineCaseAct) {
      btnInlineCaseAct.addEventListener('click', () => {
        const code = this.container.querySelector('#inline-case-license-code')?.value || '';
        App.processActivation(code);
      });
    }

    // Convalidar desde CTA de ventajas demo o notice
    this.container.querySelectorAll('.btn-trigger-convalidate, .btn-link-convalidate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof App !== 'undefined' && typeof App.openUnlockModal === 'function') {
          App.openUnlockModal();
        }
      });
    });

    // Volver a la pregunta 1 desde el bloqueo de preguntas demo
    this.container.querySelectorAll('.btn-back-to-q1, [data-goto-q1]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.setQuestionIndex(0);
      });
    });

    // Navegar a cédula o apunte oficial del temario
    this.container.querySelectorAll('[data-goto-topic]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetBtn = e.target.closest('[data-goto-topic]');
        const topicId = targetBtn ? targetBtn.dataset.gotoTopic : null;
        if (topicId && typeof App !== 'undefined' && typeof App.openTopic === 'function') {
          App.openTopic(topicId);
        }
      });
    });
  },

  /**
   * Guarda el borrador de la pregunta activa (opción y texto de justificación)
   */
  saveMcDraft(caseId) {
    const draft = StorageService.getCaseDraft(caseId) || {};
    if (!draft.answers) draft.answers = {};
    if (!draft.justifications) draft.justifications = {};

    const activeCase = (StorageService.getData().cases || []).find(c => c.id === caseId);
    if (!activeCase || !activeCase.questions) return;

    const currentQ = activeCase.questions[this.currentQuestionIndex];
    if (!currentQ) return;

    const textarea = this.container.querySelector('#input-mc-justification');
    if (textarea) {
      const rawText = textarea.value || '';
      const cleanText = (typeof SecurityShield !== 'undefined') ? SecurityShield.sanitizeText(rawText) : rawText;
      draft.justifications[currentQ.id] = cleanText;
    }

    StorageService.saveCaseDraft(caseId, draft);
  },

  /**
   * Ejecuta la evaluación oficial aplicando las dos compuertas:
   * 1. Criterio Excluyente: si la opción es incorrecta -> 0.0 pts.
   * 2. Rúbrica Oficial de 4 Dimensiones: si es correcta -> +1.0 pto + evaluación de justificación (4.0 pts máx).
   */
  evaluateCurrentQuestion(activeCase) {
    this.saveMcDraft(activeCase.id);
    const draft = StorageService.getCaseDraft(activeCase.id) || {};
    const questions = activeCase.questions || [];
    const currentQ = questions[this.currentQuestionIndex];
    if (!currentQ) return;

    const isDemo = (typeof LicenseService !== 'undefined' && typeof LicenseService.isDemoMode === 'function') 
      ? LicenseService.isDemoMode() 
      : false;

    const selectedOption = (draft.answers && draft.answers[currentQ.id]) || null;

    if (!selectedOption) {
      App.showToast("Debes marcar una alternativa antes de evaluar", "warning");
      return;
    }

    // FLUJO EXCLUSIVO MODO DEMO:
    // Solo permite responder la pregunta 1 (índice 0), sin justificación obligatoria y califica solo la alternativa (+1.0 / 0.0 pt).
    if (isDemo) {
      if (this.currentQuestionIndex > 0) {
        App.showToast("En Modo Demo solo puedes responder la Pregunta 1. Activa tu Pase de Grado para desbloquear el caso completo.", "warning");
        return;
      }

      const isCorrect = selectedOption.toLowerCase() === currentQ.correctAnswer.toLowerCase();
      if (!draft.evaluations) draft.evaluations = {};

      draft.evaluations[currentQ.id] = {
        isEvaluated: true,
        isDemoEvaluation: true,
        isCorrect: isCorrect,
        isExclusionary: !isCorrect,
        selectedOption,
        scoreAlternative: isCorrect ? 1.0 : 0.0,
        rubricScores: { criterio1: 0.0, criterio2: 0.0, criterio3: 0.0, criterio4: 0.0 },
        totalScore: isCorrect ? 1.0 : 0.0,
        evaluatedAt: new Date().toISOString()
      };

      StorageService.saveCaseDraft(activeCase.id, draft);
      this.render();

      if (isCorrect) {
        App.showToast("¡Alternativa Correcta! (+1.0 pto en Modo Demo)", "success");
      } else {
        App.showToast("Alternativa Incorrecta (0.0 pts en Modo Demo)", "error");
      }

      const evalResult = this.container.querySelector('.demo-eval-result-card');
      if (evalResult) {
        evalResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const rawJustification = (draft.justifications && draft.justifications[currentQ.id]) || "";
    const justificationText = (typeof SecurityShield !== 'undefined') 
      ? SecurityShield.sanitizeText(rawJustification) 
      : rawJustification.trim();

    if (!justificationText.trim()) {
      App.showToast("Debes ingresar una justificación para ser calificada por la rúbrica", "warning");
      return;
    }

    const isCorrect = selectedOption.toLowerCase() === currentQ.correctAnswer.toLowerCase();
    if (!draft.evaluations) draft.evaluations = {};

    // BLINDAJE DE CIBERSEGURIDAD: Detección y supresión de Prompt Injection / Jailbreaks / XSS
    if (typeof SecurityShield !== 'undefined') {
      const securityCheck = SecurityShield.inspectPromptInjection(justificationText);
      if (securityCheck.isInjected) {
        draft.evaluations[currentQ.id] = {
          isEvaluated: true,
          isCorrect: isCorrect,
          isExclusionary: false,
          selectedOption,
          scoreAlternative: isCorrect ? 1.0 : 0.0,
          rubricScores: { criterio1: 0.0, criterio2: 0.0, criterio3: 0.0, criterio4: 0.0 },
          totalScore: isCorrect ? 1.0 : 0.0,
          securityIncident: true,
          securityReason: securityCheck.reason,
          securitySnippet: securityCheck.snippet,
          evaluatedAt: new Date().toISOString()
        };
        StorageService.saveCaseDraft(activeCase.id, draft);
        this.render();
        App.showToast("⚠️ Integridad Académica: Se detectaron comandos o código no permitido (0.0 pts en justificación)", "warning");
        const evalResult = this.container.querySelector('.rubric-evaluation-panel, .criterio-excluyente-banner');
        if (evalResult) {
          evalResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
    }

    if (!isCorrect) {
      // COMPUERTA 1: CRITERIO EXCLUYENTE
      draft.evaluations[currentQ.id] = {
        isEvaluated: true,
        isCorrect: false,
        isExclusionary: true,
        selectedOption,
        scoreAlternative: 0.0,
        rubricScores: { criterio1: 0.0, criterio2: 0.0, criterio3: 0.0, criterio4: 0.0 },
        totalScore: 0.0,
        evaluatedAt: new Date().toISOString()
      };
      App.showToast("Criterio Excluyente: 0.0 pts (Alternativa Incorrecta)", "error");
    } else {
      // COMPUERTA 2: ALTERNATIVA CORRECTA (+1.0 pto + Rúbrica 4.0 pts)
      const existingEval = draft.evaluations[currentQ.id];
      const initialRubric = existingEval && existingEval.rubricScores ? existingEval.rubricScores : this.calculateAssistedRubricScore(justificationText, currentQ);
      const justScore = initialRubric.criterio1 + initialRubric.criterio2 + initialRubric.criterio3 + initialRubric.criterio4;

      draft.evaluations[currentQ.id] = {
        isEvaluated: true,
        isCorrect: true,
        isExclusionary: false,
        selectedOption,
        scoreAlternative: 1.0,
        rubricScores: initialRubric,
        totalScore: 1.0 + justScore,
        evaluatedAt: new Date().toISOString()
      };
      App.showToast(`¡Alternativa Correcta! Calificación: ${(1.0 + justScore).toFixed(1)}/5.0 pts`, "success");
    }

    StorageService.saveCaseDraft(activeCase.id, draft);
    this.render();

    // Scroll suave hacia los resultados de la evaluación
    const evalResult = this.container.querySelector('.rubric-evaluation-panel, .criterio-excluyente-banner');
    if (evalResult) {
      evalResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /**
   * Asistente de calificación de justificación según las 4 dimensiones de la Rúbrica Oficial
   */
  calculateAssistedRubricScore(text, question) {
    const lower = text.toLowerCase();
    const wordCount = text.trim().split(/\s+/).length;

    // 1. Dimensión 1: Marco Jurídico (0.5 máx)
    // Busca citas de normas (art, artículo, ley, cpr, cot, cpc, cc, principios)
    let c1 = 0.2; // Básico
    const hasArticle = /art(\.|ículo|iculos)?\s*\d+/i.test(text);
    const hasLegalBasis = /código|ley|cpr|cot|cpc|constitución|jurisdicción|imparcialidad|posesión|tradición/i.test(text);
    if (hasArticle && hasLegalBasis && wordCount > 35) {
      c1 = 0.5; // Destacado
    } else if (hasArticle || hasLegalBasis) {
      c1 = 0.4; // Suficiente
    }

    // 2. Dimensión 2: Hechos Relevantes (1.0 máx)
    // Busca si cita los hechos y sujetos fácticos del caso
    let c2 = 0.3; // Básico
    if (wordCount > 60) {
      c2 = 1.0; // Destacado
    } else if (wordCount > 30) {
      c2 = 0.7; // Suficiente
    }

    // 3. Dimensión 3: Subsunción y Razonamiento (2.0 máx)
    // Conectores argumentativos y silogismo
    let c3 = 0.7; // Básico
    const hasConnectors = /porque|debido a|puesto que|en consecuencia|toda vez que|por ende|configura|subsume|por tanto/i.test(lower);
    if (hasConnectors && wordCount > 70) {
      c3 = 2.0; // Destacado
    } else if (hasConnectors || wordCount > 40) {
      c3 = 1.3; // Suficiente
    }

    // 4. Dimensión 4: Claridad y Precisión Técnica (0.5 máx)
    let c4 = 0.4; // Suficiente
    if (wordCount > 50 && !/creo que|me parece|onda|cosa/i.test(lower)) {
      c4 = 0.5; // Destacado
    }

    return { criterio1: c1, criterio2: c2, criterio3: c3, criterio4: c4 };
  },

  /**
   * Permite al estudiante o evaluador ajustar manualmente cualquier dimensión de la rúbrica
   */
  updateRubricScore(activeCase, critKey, pts) {
    const draft = StorageService.getCaseDraft(activeCase.id) || {};
    const currentQ = (activeCase.questions || [])[this.currentQuestionIndex];
    if (!currentQ || !draft.evaluations || !draft.evaluations[currentQ.id]) return;

    const evaluation = draft.evaluations[currentQ.id];
    if (!evaluation.rubricScores) {
      evaluation.rubricScores = { criterio1: 0.5, criterio2: 1.0, criterio3: 2.0, criterio4: 0.5 };
    }

    evaluation.rubricScores[critKey] = pts;
    const justScore = (
      evaluation.rubricScores.criterio1 +
      evaluation.rubricScores.criterio2 +
      evaluation.rubricScores.criterio3 +
      evaluation.rubricScores.criterio4
    );
    evaluation.totalScore = evaluation.scoreAlternative + justScore;
    StorageService.saveCaseDraft(activeCase.id, draft);

    // Actualizar visualmente la tarjeta de la dimensión
    const dimCard = this.container.querySelector(`.rubric-dimension-card[data-crit-key="${critKey}"]`);
    if (dimCard) {
      dimCard.querySelectorAll('.dimension-level-btn').forEach(btn => {
        const btnPts = parseFloat(btn.dataset.pts);
        if (Math.abs(btnPts - pts) < 0.05) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });
    }

    // Actualizar live total badge
    const liveBadge = this.container.querySelector('#live-rubric-total');
    if (liveBadge) {
      liveBadge.innerHTML = `
        <i data-lucide="check-circle" style="color: var(--success); width: 16px; height: 16px;"></i>
        <span>PUNTAJE TOTAL: <strong>${evaluation.totalScore.toFixed(1)} / 5.0 pts</strong> (Alt: +${evaluation.scoreAlternative.toFixed(1)} | Just: ${justScore.toFixed(1)}/4.0)</span>
      `;
      if (window.lucide) window.lucide.createIcons();
    }

    // Actualizar badge en la barra de navegación
    const navBtn = this.container.querySelector(`.question-nav-btn[data-q-index="${this.currentQuestionIndex}"] span:last-child`);
    if (navBtn) {
      navBtn.textContent = `✓ ${evaluation.totalScore.toFixed(1)}/5.0`;
    }
  },

  /**
   * Guarda borrador del formulario clásico
   */
  saveClassicDraft(caseId, isModelRevealed = null) {
    const prevDraft = StorageService.getCaseDraft(caseId) || {};
    const draft = {
      conflict: this.container.querySelector('#input-conflict')?.value || '',
      normative: this.container.querySelector('#input-normative')?.value || '',
      reasoning: this.container.querySelector('#input-reasoning')?.value || '',
      dogmatic: this.container.querySelector('#input-dogmatic')?.value || '',
      isModelRevealed: isModelRevealed !== null ? isModelRevealed : prevDraft.isModelRevealed
    };
    StorageService.saveCaseDraft(caseId, draft);
  },

  promptNewCase() {
    const title = prompt("Título del caso práctico:");
    if (!title) return;

    const facts = prompt("Hechos del caso (puedes pegar el planteamiento):");
    if (!facts) return;

    const data = StorageService.getData();
    const newCase = {
      id: `case-custom-${Date.now()}`,
      title,
      subjects: ["civil"],
      difficulty: "Grado",
      summary: facts.slice(0, 120) + "...",
      facts,
      questions: [
        "¿Cuáles son los problemas jurídicos principales?",
        "¿Qué normas de fondo y procesales son aplicables?",
        "¿Cuál es la solución dogmática correcta?"
      ],
      methodology: {
        conflict: "Por definir",
        legalBasis: ["Artículos a determinar"],
        applicationReasoning: "Desarrollo del caso por completar.",
        dogmaticFramework: "Doctrina por analizar."
      },
      modelSolution: "Caso ingresado por el usuario."
    };

    data.cases.push(newCase);
    StorageService.saveData(data);
    this.currentCaseId = newCase.id;
    this.render();
    App.showToast("Nuevo caso práctico creado", "success");
  }
};

// Exposición global para compatibilidad con navegador y módulos
if (typeof window !== "undefined") {
  window.CaseSolver = CaseSolver;
}
if (typeof globalThis !== "undefined") {
  globalThis.CaseSolver = CaseSolver;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CaseSolver;
}
