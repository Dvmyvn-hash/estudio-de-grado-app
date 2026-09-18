/**
 * CASE SOLVER - TALLER METODOLÓGICO DE RESOLUCIÓN DE CASOS
 * Implementa la metodología de 4 dimensiones para exámenes de grado:
 * 1. Hechos & Conflicto
 * 2. Fundamento Normativo
 * 3. Aplicación Práctica (Subsunción)
 * 4. Dogmática Jurídica
 */

const CaseSolver = {
  currentCaseId: null,
  activeFilter: "all",
  activeStep: 1,
  mobileView: "list",

  init(containerEl) {
    this.container = containerEl;
    const data = StorageService.getData();
    if (data.cases && data.cases.length > 0) {
      this.currentCaseId = data.cases[0].id;
    }
    if (window.innerWidth <= 1024) {
      this.mobileView = "list";
    }
    this.render();
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.render();
  },

  selectCase(caseId) {
    this.currentCaseId = caseId;
    this.activeStep = 1;
    this.mobileView = "workbench";
    this.render();
  },

  render() {
    const data = StorageService.getData();
    const cases = data.cases || [];
    
    // Filtrar casos
    const filteredCases = cases.filter(c => {
      if (this.activeFilter === "all") return true;
      return c.subjects && c.subjects.includes(this.activeFilter);
    });

    const activeCase = cases.find(c => c.id === this.currentCaseId) || filteredCases[0] || null;

    if (!activeCase && filteredCases.length > 0) {
      this.currentCaseId = filteredCases[0].id;
    }

    // Cargar borrador previo si existe
    const draft = activeCase ? (StorageService.getCaseDraft(activeCase.id) || {}) : {};

    this.container.innerHTML = `
      <div class="cases-layout ${this.mobileView === 'workbench' ? 'view-workbench' : 'view-list'}">
        
        <!-- PANEL IZQUIERDO: BANCO DE CASOS -->
        <aside class="cases-list-panel">
          <div class="cases-list-header">
            <div class="cases-header-title">
              <h2><i data-lucide="briefcase"></i> Banco de Casos</h2>
              <button id="btn-add-case" class="btn btn-secondary btn-sm" title="Agregar nuevo caso">
                <i data-lucide="plus"></i> Nuevo Caso
              </button>
            </div>
            <div class="cases-filters-row">
              <button class="filter-pill ${this.activeFilter === 'all' ? 'active' : ''}" data-case-filter="all">Todos</button>
              <button class="filter-pill filter-civil ${this.activeFilter === 'civil' ? 'active' : ''}" data-case-filter="civil">Civil</button>
              <button class="filter-pill filter-procesal ${this.activeFilter === 'procesal' ? 'active' : ''}" data-case-filter="procesal">Procesal</button>
              <button class="filter-pill filter-constitucional ${this.activeFilter === 'constitucional' ? 'active' : ''}" data-case-filter="constitucional">Const.</button>
            </div>
          </div>

          <div class="cases-cards-scroll">
            ${filteredCases.map(c => {
              const isCaseUnlocked = LicenseService.isContentUnlocked(c, 'case');
              return `
              <div class="case-item-card ${activeCase && activeCase.id === c.id ? 'active' : ''} ${!isCaseUnlocked ? 'locked' : ''}" data-case-id="${c.id}">
                <div class="case-card-meta">
                  <div class="case-subject-tags">
                    ${(c.subjects || []).map(s => `<span class="case-sub-tag ${s}">${s}</span>`).join('')}
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
              </div>
              `;
            }).join('')}
            ${filteredCases.length === 0 ? `<p class="text-muted" style="padding: 20px; text-align: center;">No hay casos para este filtro.</p>` : ''}
          </div>
        </aside>

        <!-- PANEL DERECHO: ESPACIO METODOLÓGICO DE TRABAJO -->
        <div class="case-workbench-panel">
          ${activeCase ? this.renderActiveCaseWorkspace(activeCase, draft) : `
            <div class="empty-state-wrap" style="padding: 60px; text-align: center;">
              <i data-lucide="folder-open" style="width: 48px; height: 48px; color: var(--text-subtle); margin-bottom: 16px;"></i>
              <h3>Selecciona o crea un caso práctico</h3>
              <p class="text-muted">Entrena la subsunción, el marco normativo y la dogmática aplicable para tu examen.</p>
            </div>
          `}
        </div>

      </div>
    `;

    // Re-renderizar iconos de Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.bindEvents(activeCase);
  },

  renderActiveCaseWorkspace(activeCase, draft) {
    const isUnlocked = LicenseService.isContentUnlocked(activeCase, 'case');
    const isModelVisible = draft.isModelRevealed || false;

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
              Este caso práctico y su solución dogmática en 4 dimensiones requieren el <strong>Pase de Grado</strong>.
            </p>

            <div class="paywall-features-list">
              <div class="paywall-feature-item">
                <i data-lucide="check-circle-2"></i>
                <span>Planteamiento completo con preguntas trampa habituales de comisiones de grado.</span>
              </div>
              <div class="paywall-feature-item">
                <i data-lucide="check-circle-2"></i>
                <span>Guía metodológica paso a paso (normas, subsunción y dogmática).</span>
              </div>
              <div class="paywall-feature-item">
                <i data-lucide="check-circle-2"></i>
                <span>Solución y rúbrica modelo explicada para responder oralmente.</span>
              </div>
            </div>

            <div class="paywall-activation-box">
              <div class="activation-input-row">
                <input type="text" id="inline-case-license-code" placeholder="Pega aquí tu código de activación..." autocomplete="off">
                <button id="btn-inline-case-activate" class="btn btn-primary">
                  <i data-lucide="unlock"></i>
                  <span>Activar</span>
                </button>
              </div>
            </div>

            <a href="https://wa.me/?text=Hola!%20Deseo%20adquirir%20el%20Pase%20de%20Grado%20para%20desbloquear%20los%20casos%20pr%C3%A1cticos." target="_blank" class="btn-whatsapp-buy">
              <i data-lucide="message-circle"></i>
              <span>Solicitar mi Pase por WhatsApp</span>
            </a>
          </div>
        </div>
      `;
    }

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
            <h1 class="case-fact-title">${activeCase.title}</h1>
            <div class="case-subject-tags">
              ${(activeCase.subjects || []).map(s => `<span class="case-sub-tag ${s}">${s}</span>`).join('')}
            </div>
          </div>

          <div class="case-fact-text">
            ${activeCase.facts.replace(/\n\n/g, '<br><br>')}
          </div>

          ${activeCase.questions && activeCase.questions.length > 0 ? `
            <div class="case-questions-box">
              <div class="case-questions-title">
                <i data-lucide="help-circle" style="display: inline; width: 14px; vertical-align: middle;"></i>
                Preguntas Clave del Tribunal de Grado:
              </div>
              <ol class="case-question-list">
                ${activeCase.questions.map(q => `<li>${q}</li>`).join('')}
              </ol>
            </div>
          ` : ''}
        </div>

        <!-- FORMULARIO DE RESOLUCIÓN ACTIVA (4 DIMENSIONES) -->
        <div class="methodology-work-grid">
          
          <!-- Dimensión 1: Conflicto Jurídico -->
          <div class="method-block" id="block-step-1">
            <div class="method-block-header">
              <div class="method-block-title">
                <i data-lucide="target"></i>
                <span>1. Hechos Relevantes y Conflicto Jurídico Central</span>
              </div>
              <span class="method-badge-pill">¿Qué se controvierte?</span>
            </div>
            <textarea class="method-textarea" id="input-conflict" placeholder="Define con precisión la litis o conflicto de intereses con relevancia jurídica...">${typeof escapeHTML === 'function' ? escapeHTML(draft.conflict || '') : (draft.conflict || '')}</textarea>
          </div>

          <!-- Dimensión 2: Fundamento Normativo -->
          <div class="method-block" id="block-step-2">
            <div class="method-block-header">
              <div class="method-block-title">
                <i data-lucide="book-marked"></i>
                <span>2. Fundamento Normativo (Códigos, Leyes y CPR)</span>
              </div>
              <span class="method-badge-pill">Artículos e Instituciones Positivas</span>
            </div>
            <textarea class="method-textarea" id="input-normative" placeholder="Cita las normas aplicables (ej. Art. 1454 CC, Art. 309 CPC, Art. 19 N° 24 CPR...)...">${typeof escapeHTML === 'function' ? escapeHTML(draft.normative || '') : (draft.normative || '')}</textarea>
          </div>

          <!-- Dimensión 3: Razonamiento y Subsunción -->
          <div class="method-block" id="block-step-3">
            <div class="method-block-header">
              <div class="method-block-title">
                <i data-lucide="scale"></i>
                <span>3. Razonamiento Jurídico y Subsunción de los Hechos</span>
              </div>
              <span class="method-badge-pill">¿Cómo se encajan los hechos en la norma?</span>
            </div>
            <textarea class="method-textarea" id="input-reasoning" style="min-height: 120px;" placeholder="Desarrolla el silogismo jurídico y argumentación técnica paso a paso...">${typeof escapeHTML === 'function' ? escapeHTML(draft.reasoning || '') : (draft.reasoning || '')}</textarea>
          </div>

          <!-- Dimensión 4: Dogmática y Doctrina Jurídica -->
          <div class="method-block" id="block-step-4">
            <div class="method-block-header">
              <div class="method-block-title">
                <i data-lucide="feather"></i>
                <span>4. Tipo de Dogmática y Doctrina Aplicada</span>
              </div>
              <span class="method-badge-pill">Teorías, Principios y Criterios</span>
            </div>
            <textarea class="method-textarea" id="input-dogmatic" placeholder="Ej: Teoría de los actos propios, eficacia horizontal (Drittwirkung), principio de congruencia, buena fe objetiva...">${typeof escapeHTML === 'function' ? escapeHTML(draft.dogmatic || '') : (draft.dogmatic || '')}</textarea>
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

        <!-- SOLUCIÓN MODELO Y CRITERIOS DE CORRECCIÓN -->
        ${isModelVisible ? `
          <div class="model-solution-card">
            <div class="model-solution-header">
              <div class="model-solution-title">
                <i data-lucide="award"></i>
                <span>Criterio de Corrección & Solución Dogmática Modelo</span>
              </div>
              <span class="badge-count">Nivel Grado</span>
            </div>
            
            <div class="model-solution-body">
              
              <!-- Conflicto -->
              <div class="solution-dimension-item">
                <div class="dimension-label">
                  <i data-lucide="target"></i> Conflicto Central
                </div>
                <div class="dimension-content">${activeCase.methodology.conflict}</div>
              </div>

              <!-- Fundamento Normativo -->
              <div class="solution-dimension-item">
                <div class="dimension-label">
                  <i data-lucide="book-marked"></i> Fundamento Normativo
                </div>
                <div class="dimension-content">
                  <ul>
                    ${activeCase.methodology.legalBasis.map(norm => `<li>${norm}</li>`).join('')}
                  </ul>
                </div>
              </div>

              <!-- Razonamiento y Subsunción -->
              <div class="solution-dimension-item">
                <div class="dimension-label">
                  <i data-lucide="scale"></i> Subsunción y Desarrollo
                </div>
                <div class="dimension-content">
                  ${activeCase.methodology.applicationReasoning.replace(/\n\n/g, '<br><br>')}
                </div>
              </div>

              <!-- Dogmática -->
              <div class="solution-dimension-item">
                <div class="dimension-label">
                  <i data-lucide="feather"></i> Dogmática y Doctrina Jurídica
                </div>
                <div class="dimension-content">
                  ${activeCase.methodology.dogmaticFramework.replace(/\n\n/g, '<br><br>')}
                </div>
              </div>

              <!-- Estrategia Final -->
              <div class="solution-dimension-item" style="border-left-color: var(--success);">
                <div class="dimension-label" style="color: var(--success);">
                  <i data-lucide="check"></i> Solución Estratégica Sugerida
                </div>
                <div class="dimension-content">
                  ${activeCase.modelSolution.replace(/\n/g, '<br>')}
                </div>
              </div>

            </div>
          </div>
        ` : ''}

      </div>
    `;
  },

  bindEvents(activeCase) {
    if (!activeCase) return;

    // Volver a la lista de casos en móvil
    const btnBack = this.container.querySelector('#btn-back-to-cases');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        this.mobileView = 'list';
        this.render();
      });
    }

    // Filtros de materias
    this.container.querySelectorAll('[data-case-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setFilter(e.target.dataset.caseFilter);
      });
    });

    // Seleccionar caso
    this.container.querySelectorAll('[data-case-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = card.dataset.caseId;
        this.selectCase(id);
      });
    });

    // Guardar respuestas
    const btnSave = this.container.querySelector('#btn-save-draft');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        this.saveCurrentDraft(activeCase.id);
        App.showToast("Respuestas del caso guardadas con éxito", "success");
      });
    }

    // Toggle solución modelo
    const btnModel = this.container.querySelector('#btn-toggle-model');
    if (btnModel) {
      btnModel.addEventListener('click', () => {
        const draft = StorageService.getCaseDraft(activeCase.id) || {};
        draft.isModelRevealed = !draft.isModelRevealed;
        this.saveCurrentDraft(activeCase.id, draft.isModelRevealed);
        this.render();
      });
    }

    // Stepper click scroll
    this.container.querySelectorAll('.step-item').forEach(step => {
      step.addEventListener('click', () => {
        const stepNum = step.dataset.step;
        const targetBlock = this.container.querySelector(`#block-step-${stepNum}`);
        if (targetBlock) {
          targetBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const textarea = targetBlock.querySelector('textarea');
          if (textarea) textarea.focus();
        }
      });
    });

    // Botón agregar nuevo caso
    const btnAdd = this.container.querySelector('#btn-add-case');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.promptNewCase();
      });
    }

    // Activación inline en caso bloqueado
    const btnInlineCase = this.container.querySelector('#btn-inline-case-activate');
    if (btnInlineCase) {
      btnInlineCase.addEventListener('click', () => {
        const code = this.container.querySelector('#inline-case-license-code')?.value || '';
        App.processActivation(code);
      });
    }
  },

  saveCurrentDraft(caseId, isModelRevealed = null) {
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
