/**
 * CONCEPT GRAPH - VISUALIZADOR INTERACTIVO DE INSTITUCIONES JURÍDICAS
 * Simulación física con Canvas HTML5 (fuerzas elásticas y repulsión).
 * Permite explorar cómo se interconectan Civil, Procesal y Constitucional.
 * Versión v7.44 (Prompt 035): Consume GRAPH_DATA canónico con física optimizada y fallback legacy.
 */

// Constantes físicas del simulador (configurables para Prompt 037)
const K_REPEL = 2200;
const K_SPRING = 0.04;
const TARGET_DIST = 140;
const REPEL_DIST_CAP = 320;
const DAMPING = 0.88;
const CENTER_STRENGTH = 0.015;

function safeEscapeHtml(str) {
  if (typeof SecurityShield !== 'undefined' && SecurityShield.escapeHtml) {
    return SecurityShield.escapeHtml(str || '');
  }
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ConceptGraph = {
  container: null,
  canvas: null,
  ctx: null,
  nodes: [],
  links: [],
  selectedNode: null,
  draggedNode: null,
  isDragging: false,
  panX: 0,
  panY: 0,
  scale: 1,
  startMouseX: 0,
  startMouseY: 0,
  activeFilter: "all",
  filterSubject: "all",
  filterChapter: "all",
  showMasteryOverlay: true,
  visibleLinksCap: 400,
  degreeMap: null,
  _searchDebounceTimer: null,
  animationId: null,
  isSimulating: false,
  _visibilityBound: false,

  init(containerEl) {
    this.container = containerEl;
    this.render();
  },

  render() {
    this.setupData();

    this.container.innerHTML = `
      <div class="graph-layout">
        
        <!-- TOOLBAR PRINCIPAL DEL GRAFO (v7.46, PROMPT 037) -->
        <div class="graph-toolbar" id="graph-toolbar" role="toolbar" aria-label="Herramientas de exploración del grafo">
          <!-- Búsqueda Local -->
          <div class="graph-search-box">
            <div class="graph-search-input-wrap">
              <i data-lucide="search" class="graph-search-icon"></i>
              <input type="text" 
                     id="graph-search-input" 
                     class="graph-search-input" 
                     placeholder="Buscar en el grafo (ej. emplazamiento)..." 
                     maxlength="200" 
                     autocomplete="off" 
                     aria-label="Buscar concepto en el grafo">
              <button type="button" id="graph-search-clear" class="graph-search-clear hidden" aria-label="Limpiar búsqueda" title="Limpiar">
                <i data-lucide="x"></i>
              </button>
            </div>
            <div id="graph-search-feedback" class="graph-search-feedback" aria-live="polite"></div>
          </div>

          <!-- Filtro por Materia (Pills) -->
          <div class="graph-filter-pills" id="graph-filter-pills" role="group" aria-label="Filtrar por materia">
            <button type="button" class="graph-pill active" data-subject="all" aria-pressed="true">Todas</button>
            <button type="button" class="graph-pill pill-civil" data-subject="civil" aria-pressed="false">Civil</button>
            <button type="button" class="graph-pill pill-procesal" data-subject="procesal" aria-pressed="false">Procesal</button>
            <button type="button" class="graph-pill pill-constitucional" data-subject="constitucional" aria-pressed="false">Const.</button>
          </div>

          <!-- Selector de Capítulo -->
          <div class="graph-filter-chapter-wrap">
            <select id="graph-filter-chapter" class="graph-filter-chapter" aria-label="Filtrar por capítulo">
              <option value="all">Todos los capítulos</option>
            </select>
          </div>

          <!-- Toggle Mastery Overlay -->
          <div class="graph-mastery-toggle-wrap">
            <button type="button" id="graph-toggle-mastery-overlay" class="graph-mastery-btn active" aria-pressed="true" title="Alternar overlay de dominio">
              <i data-lucide="check-circle" class="graph-mastery-icon"></i>
              <span id="graph-mastery-stats-text">Dominadas 0/${this.nodes.length || 205}</span>
            </button>
          </div>
        </div>

        <!-- CONTROLES FLOTANTES -->
        <div class="graph-floating-controls" role="toolbar" aria-label="Controles de navegación del grafo">
          <button class="icon-btn btn-sm" id="btn-zoom-in" title="Acercar" aria-label="Acercar vista del grafo" tabindex="0">
            <i data-lucide="zoom-in"></i>
          </button>
          <button class="icon-btn btn-sm" id="btn-zoom-out" title="Alejar" aria-label="Alejar vista del grafo" tabindex="0">
            <i data-lucide="zoom-out"></i>
          </button>
          <button class="icon-btn btn-sm" id="btn-zoom-reset" title="Restablecer vista" aria-label="Restablecer vista del grafo" tabindex="0">
            <i data-lucide="maximize-2"></i>
          </button>
        </div>

        <!-- LEYENDA FLOTANTE -->
        <div class="graph-legend-floating">
          <div class="legend-title">Materias del Grado</div>
          <div class="legend-item"><span class="legend-color civil"></span> Civil</div>
          <div class="legend-item"><span class="legend-color procesal"></span> Procesal</div>
          <div class="legend-item"><span class="legend-color constitucional"></span> Constitucional</div>
          <div class="legend-item"><span class="legend-color cross"></span> Institución Transversal</div>
          <div class="legend-stats" id="graph-legend-stats" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px; padding-top: 4px; border-top: 1px solid var(--border-subtle);">
            ${this.nodes.length} cédulas · ${this.links.length} nexos
          </div>
        </div>

        <!-- VIEWPORT DE CANVAS -->
        <div class="graph-viewport-wrapper" id="graph-wrapper">
          <canvas id="graph-canvas"></canvas>
        </div>

        <!-- PANEL LATERAL INSPECTOR DE NODO -->
        <aside class="graph-inspector-panel hidden" id="graph-inspector">
          <!-- Inyectado al hacer clic en un nodo -->
        </aside>

      </div>
    `;

    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }

    this.canvas = this.container.querySelector('#graph-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.resizeCanvas();
    this.bindCanvasEvents();
    this.populateChaptersFilter();
    this.bindToolbarEvents();
    this.updateMasteryStatsText();
    this.startSimulation();
  },

  setupData() {
    // Prioridad de fuentes: window.GRAPH_DATA -> StorageService.getData().graph -> INITIAL_DATA.graph (legacy fallback)
    let rawGraph = null;
    if (typeof window !== 'undefined' && window.GRAPH_DATA && Array.isArray(window.GRAPH_DATA.nodes)) {
      rawGraph = window.GRAPH_DATA;
    } else if (typeof globalThis !== 'undefined' && globalThis.GRAPH_DATA && Array.isArray(globalThis.GRAPH_DATA.nodes)) {
      rawGraph = globalThis.GRAPH_DATA;
    } else {
      const stored = (typeof StorageService !== 'undefined' && StorageService.getData) ? StorageService.getData() : null;
      if (stored && stored.graph && Array.isArray(stored.graph.nodes)) {
        rawGraph = stored.graph;
      } else {
        let initGraph = null;
        if (typeof INITIAL_DATA !== 'undefined' && INITIAL_DATA && INITIAL_DATA.graph) {
          initGraph = INITIAL_DATA.graph;
        } else if (typeof window !== 'undefined' && window.INITIAL_DATA && window.INITIAL_DATA.graph) {
          initGraph = window.INITIAL_DATA.graph;
        } else if (typeof globalThis !== 'undefined' && globalThis.INITIAL_DATA && globalThis.INITIAL_DATA.graph) {
          initGraph = globalThis.INITIAL_DATA.graph;
        }
        if (initGraph && Array.isArray(initGraph.nodes)) {
          console.warn('[ConceptGraph] GRAPH_DATA ausente, usando fallback legacy');
          rawGraph = initGraph;
        }
      }
    }

    if (!rawGraph || !Array.isArray(rawGraph.nodes)) {
      rawGraph = { nodes: [], links: [] };
    }

    const rawNodes = rawGraph.nodes || [];
    const validNodeIdSet = new Set(rawNodes.map(n => n.id));

    // Aristas que referencien IDs ausentes se filtran en silencio + conteo defensivo
    let orphanLinksCount = 0;
    const rawLinks = (rawGraph.links || []).filter(l => {
      const isValid = validNodeIdSet.has(l.source) && validNodeIdSet.has(l.target);
      if (!isValid) orphanLinksCount++;
      return isValid;
    });
    if (orphanLinksCount > 0) {
      console.warn(`[ConceptGraph] ${orphanLinksCount} aristas huérfanas ignoradas`);
    }

    // Calcular grado incidente por nodo (hubs dogmáticos más grandes)
    const degreeMap = new Map();
    rawLinks.forEach(l => {
      degreeMap.set(l.source, (degreeMap.get(l.source) || 0) + 1);
      degreeMap.set(l.target, (degreeMap.get(l.target) || 0) + 1);
    });

    // Posición inicial en círculo con jitter suave
    const count = rawNodes.length;
    const centerX = this.canvas ? this.canvas.width / 2 : 400;
    const centerY = this.canvas ? this.canvas.height / 2 : 300;
    const radius = Math.min(centerX, centerY) * 0.65;

    let unknownSubjectCount = 0;
    const knownSubjects = new Set(['civil', 'procesal', 'constitucional', 'cross']);

    this.degreeMap = degreeMap;
    const allTopicsData = (typeof StorageService !== 'undefined' && typeof StorageService.getData === 'function')
      ? (StorageService.getData()?.topics || [])
      : [];
    const topicLookup = new Map(allTopicsData.map(t => [t.id, t]));

    this.nodes = rawNodes.map((n, i) => {
      const angle = count > 0 ? (i / count) * 2 * Math.PI : 0;
      const grado = degreeMap.get(n.id) || 0;
      let subject = n.subject || 'civil';
      if (!knownSubjects.has(subject)) {
        unknownSubjectCount++;
        subject = 'civil'; // Fallback seguro a civil
      }
      const t = topicLookup.get(n.id);
      const chapterNumber = t ? (t.chapterNumber || 1) : (n.chapterNumber || 1);
      const chapterKey = `${subject}-${chapterNumber}`;
      const chapterTitle = t ? (t.chapterTitle || t.chapter) : (n.chapter || '');

      return {
        ...n,
        subject,
        chapterNumber,
        chapterKey,
        chapterTitle,
        degree: grado,
        x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius: 18 + Math.min(12, grado * 2)
      };
    });

    if (unknownSubjectCount > 0) {
      console.warn(`[ConceptGraph] ${unknownSubjectCount} nodos con subject desconocido (fallback a civil)`);
    }

    this.links = rawLinks.map(l => ({ ...l }));

    // Actualizar leyenda si ya está renderizada en el DOM
    if (this.container) {
      const statsEl = this.container.querySelector('#graph-legend-stats');
      if (statsEl) {
        statsEl.textContent = `${this.nodes.length} cédulas · ${this.links.length} nexos`;
      }
    }
  },

  resizeCanvas() {
    const wrapper = this.container ? this.container.querySelector('#graph-wrapper') : null;
    if (wrapper && this.canvas) {
      this.canvas.width = wrapper.clientWidth || 800;
      this.canvas.height = wrapper.clientHeight || 600;
    }
  },

  bindCanvasEvents() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', () => {
        this.resizeCanvas();
      });
    }

    // Zoom buttons
    this.container.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
      this.scale = Math.min(this.scale * 1.25, 3);
    });
    this.container.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
      this.scale = Math.max(this.scale * 0.8, 0.4);
    });
    this.container.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
      this.scale = 1;
      this.panX = 0;
      this.panY = 0;
    });

    if (this.canvas && typeof this.canvas.addEventListener === 'function') {
      // MOUSE EVENTS
      this.canvas.addEventListener('mousedown', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.panX) / this.scale;
        const mouseY = (e.clientY - rect.top - this.panY) / this.scale;

        // Detectar si se hizo clic en un nodo
        const clickedNode = this.findNodeAt(mouseX, mouseY);

        if (clickedNode) {
          this.draggedNode = clickedNode;
          this.selectNode(clickedNode);
        } else {
          this.isDragging = true;
          this.startMouseX = e.clientX - this.panX;
          this.startMouseY = e.clientY - this.panY;
        }
      });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('mousemove', (e) => {
        if (this.draggedNode) {
          const rect = this.canvas.getBoundingClientRect();
          this.draggedNode.x = (e.clientX - rect.left - this.panX) / this.scale;
          this.draggedNode.y = (e.clientY - rect.top - this.panY) / this.scale;
          this.draggedNode.vx = 0;
          this.draggedNode.vy = 0;
        } else if (this.isDragging) {
          this.panX = e.clientX - this.startMouseX;
          this.panY = e.clientY - this.startMouseY;
        }
      });

      window.addEventListener('mouseup', () => {
        this.draggedNode = null;
        this.isDragging = false;
      });
    }

    if (this.canvas && typeof this.canvas.addEventListener === 'function') {
      // Rueda del ratón para zoom
      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.scale = Math.max(0.4, Math.min(3, this.scale * zoomFactor));
      }, { passive: false });

      // EVENTOS TÁCTILES MÓVILES (Pan, Arrastre de Nodos y Pinch-to-Zoom con 2 dedos)
      let initialPinchDist = null;
      let initialPinchScale = 1;

      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const rect = this.canvas.getBoundingClientRect();
          const touchX = (touch.clientX - rect.left - this.panX) / this.scale;
          const touchY = (touch.clientY - rect.top - this.panY) / this.scale;

          const clickedNode = this.findNodeAt(touchX, touchY);
          if (clickedNode) {
            this.draggedNode = clickedNode;
            this.selectNode(clickedNode);
          } else {
            this.isDragging = true;
            this.startMouseX = touch.clientX - this.panX;
            this.startMouseY = touch.clientY - this.panY;
          }
        } else if (e.touches.length === 2) {
          this.isDragging = false;
          this.draggedNode = null;
          initialPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          initialPinchScale = this.scale;
        }
      }, { passive: false });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          if (this.draggedNode) {
            const rect = this.canvas.getBoundingClientRect();
            this.draggedNode.x = (touch.clientX - rect.left - this.panX) / this.scale;
            this.draggedNode.y = (touch.clientY - rect.top - this.panY) / this.scale;
            this.draggedNode.vx = 0;
            this.draggedNode.vy = 0;
          } else if (this.isDragging) {
            this.panX = touch.clientX - this.startMouseX;
            this.panY = touch.clientY - this.startMouseY;
          }
        } else if (e.touches.length === 2 && initialPinchDist) {
          const currentDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (initialPinchDist > 0) {
            const factor = currentDist / initialPinchDist;
            this.scale = Math.max(0.4, Math.min(3, initialPinchScale * factor));
          }
        }
      }, { passive: false });

      window.addEventListener('touchend', () => {
        this.draggedNode = null;
        this.isDragging = false;
        initialPinchDist = null;
      });
    }
  },

  findNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist <= node.radius + 6) {
        return node;
      }
    }
    return null;
  },

  isValidTopicId(topicId) {
    if (!topicId || typeof topicId !== 'string') return false;
    if (Array.isArray(this.nodes) && this.nodes.some(n => n.id === topicId)) return true;
    if (typeof StorageService !== 'undefined' && typeof StorageService.getData === 'function') {
      const data = StorageService.getData();
      if (data && Array.isArray(data.topics) && data.topics.some(t => t.id === topicId)) return true;
    }
    if (typeof window !== 'undefined' && window.GRAPH_DATA && Array.isArray(window.GRAPH_DATA.nodes)) {
      if (window.GRAPH_DATA.nodes.some(n => n.id === topicId)) return true;
    }
    if (typeof globalThis !== 'undefined' && globalThis.GRAPH_DATA && Array.isArray(globalThis.GRAPH_DATA.nodes)) {
      if (globalThis.GRAPH_DATA.nodes.some(n => n.id === topicId)) return true;
    }
    return false;
  },

  _renderConnectionCardsFallback(connsList) {
    if (!connsList || connsList.length === 0) {
      return `
        <div class="connections-empty-state">
          <div class="connections-empty-icon"><i data-lucide="info"></i></div>
          <h4 class="connections-empty-title">Sin cruces validados aún</h4>
          <p class="connections-empty-desc">Explora el temario canónico para descubrir conexiones interdisciplinarias.</p>
        </div>
      `;
    }
    return connsList.map(conn => {
      const safeId = safeEscapeHtml(conn.id);
      const safeTitle = safeEscapeHtml(conn.title);
      const safeSubject = safeEscapeHtml(conn.subject || 'civil');
      const safeSubjectLabel = (conn.subject === 'civil') ? 'Civil' : ((conn.subject === 'procesal') ? 'Procesal' : 'Constitucional');
      const safeIndexCode = safeEscapeHtml(conn.indexCode || '');
      const safeDiscipline = safeEscapeHtml(conn.discipline || '');
      const safeCrossoverType = safeEscapeHtml(conn.crossoverType || 'Cruce Dogmático');
      const safeWhy = safeEscapeHtml(conn.whyConnected || '');
      const safeApp = safeEscapeHtml(conn.practicalApplication || '');
      const safeQuote = safeEscapeHtml(conn.quote || '');

      return `
        <div class="linked-connection-card ${safeSubject}" data-topic-id="${safeId}" data-snippet="${safeQuote}" title="Clic para estudiar esta institución vinculada">
          <div class="connection-header">
            <div class="connection-badges-row">
              <span class="connection-crossover-badge">${safeCrossoverType}</span>
              <span class="connection-subject-badge ${safeSubject}">${safeSubjectLabel}</span>
              ${safeIndexCode ? `<span class="connection-target-meta">§ ${safeIndexCode} · ${safeDiscipline}</span>` : ''}
            </div>
            <h4 class="connection-target-title">${safeTitle}</h4>
          </div>
          <div class="connection-content-body">
            <div class="connection-callout reason-box">
              <div class="connection-callout-header">
                <i data-lucide="lightbulb" class="callout-icon"></i>
                <span>¿Por qué se conectan?</span>
              </div>
              <p class="connection-callout-text">${safeWhy}</p>
              ${safeQuote ? `
                <div class="connection-quote-box">
                  <span class="connection-quote-glyph">“</span>
                  <span class="connection-quote-body"><mark class="vault-highlight">${safeQuote}</mark></span>
                  <span class="connection-quote-glyph">”</span>
                  ${safeIndexCode ? `<span class="connection-quote-ref"> (§ ${safeIndexCode})</span>` : ''}
                </div>
              ` : ''}
            </div>
            <div class="connection-callout app-box">
              <div class="connection-callout-header">
                <i data-lucide="scale" class="callout-icon"></i>
                <span>Aplicación en el Grado / Casos:</span>
              </div>
              <p class="connection-callout-text">${safeApp}</p>
            </div>
          </div>
          <div class="connection-action-footer">
            <button type="button" class="btn-jump-connection" data-target-id="${safeId}" data-snippet="${safeQuote}" title="Estudiar cédula vinculada con fragmento resaltado">
              <i data-lucide="external-link" style="width: 13px; height: 13px;"></i>
              <span>Estudiar cédula vinculada${safeIndexCode ? ` (§ ${safeIndexCode})` : ''}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ==========================================================================
  // MÉTODOS DE LA TOOLBAR, BÚSQUEDA Y FILTRADO (v7.46, PROMPT 037)
  // ==========================================================================

  getSortedChaptersList() {
    const allTopics = (typeof StorageService !== 'undefined' && typeof StorageService.getData === 'function')
      ? (StorageService.getData()?.topics || [])
      : [];

    const chapterMap = new Map();
    allTopics.forEach(t => {
      const subj = t.subject || 'civil';
      const chapNum = t.chapterNumber || 1;
      const chapTitle = t.chapterTitle || `${chapNum}. Capítulo`;
      const key = `${subj}-${chapNum}`;
      if (!chapterMap.has(key)) {
        chapterMap.set(key, {
          key,
          subject: subj,
          chapterNumber: chapNum,
          chapterTitle: chapTitle,
          topics: []
        });
      }
      chapterMap.get(key).topics.push(t);
    });

    const disciplineOrder = { civil: 1, procesal: 2, constitucional: 3 };

    // Ordenar capítulos según el temario canónico oficial (min indexCode)
    const sorted = Array.from(chapterMap.values()).sort((a, b) => {
      const discA = disciplineOrder[a.subject] || 9;
      const discB = disciplineOrder[b.subject] || 9;
      if (discA !== discB) return discA - discB;

      const parseIdx = (c) => {
        const parts = (c || "").split(".").map(p => parseInt(p, 10) || 0);
        return (parts[0] || 0) * 1000 + (parts[1] || 0);
      };
      const minA = Math.min(...a.topics.map(t => parseIdx(t.indexCode || t.code)));
      const minB = Math.min(...b.topics.map(t => parseIdx(t.indexCode || t.code)));
      if (minA !== minB) return minA - minB;
      return (a.chapterNumber || 0) - (b.chapterNumber || 0);
    });

    return sorted;
  },

  populateChaptersFilter() {
    const select = (this.container && typeof this.container.querySelector === 'function')
      ? this.container.querySelector('#graph-filter-chapter')
      : null;
    if (!select) return;

    const chapters = this.getSortedChaptersList();
    const currentVal = this.filterChapter;

    const visibleChapters = this.filterSubject === 'all'
      ? chapters
      : chapters.filter(c => c.subject === this.filterSubject);

    let html = '<option value="all">Todos los capítulos</option>';
    visibleChapters.forEach(c => {
      const subjectTag = c.subject === 'civil' ? 'Civil' : (c.subject === 'procesal' ? 'Proc.' : 'Const.');
      const label = `[${subjectTag}] ${c.chapterTitle}`;
      const selected = c.key === currentVal ? 'selected' : '';
      html += `<option value="${safeEscapeHtml(c.key)}" ${selected}>${safeEscapeHtml(label)}</option>`;
    });

    select.innerHTML = html;
  },

  bindToolbarEvents() {
    if (!this.container) return;

    const q = (sel) => (typeof this.container.querySelector === 'function') ? this.container.querySelector(sel) : null;
    const qAll = (sel) => (typeof this.container.querySelectorAll === 'function') ? this.container.querySelectorAll(sel) : [];

    const searchInput = q('#graph-search-input');
    const searchClear = q('#graph-search-clear');
    const chapterSelect = q('#graph-filter-chapter');
    const masteryToggle = q('#graph-toggle-mastery-overlay');
    const pills = qAll('.graph-pill');

    // 1. Búsqueda local con debounce 150ms
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this._searchDebounceTimer);
        const query = e.target.value;
        if (!query.trim()) {
          this.clearSearch();
          return;
        }
        this._searchDebounceTimer = setTimeout(() => {
          this.searchNode(query);
        }, 150);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(this._searchDebounceTimer);
          this.searchNode(searchInput.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          clearTimeout(this._searchDebounceTimer);
          this.clearSearch();
          searchInput.blur();
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        this.clearSearch();
        if (searchInput) searchInput.focus();
      });
    }

    // 2. Filtro por Materia (pills)
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const subject = pill.dataset.subject || 'all';
        this.setSubjectFilter(subject);
      });
    });

    // 3. Filtro por Capítulo
    if (chapterSelect) {
      chapterSelect.addEventListener('change', (e) => {
        this.setChapterFilter(e.target.value);
      });
    }

    // 4. Toggle Mastery Overlay
    if (masteryToggle) {
      masteryToggle.addEventListener('click', () => {
        this.toggleMasteryOverlay();
      });
    }
  },

  searchNode(rawQuery) {
    if (!rawQuery) {
      this.clearSearch();
      return null;
    }
    const cleanQuery = String(rawQuery).replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim().slice(0, 200);
    if (!cleanQuery) {
      this.clearSearch();
      return null;
    }

    const feedbackEl = this.container ? this.container.querySelector('#graph-search-feedback') : null;
    const clearBtn = this.container ? this.container.querySelector('#graph-search-clear') : null;
    if (clearBtn) clearBtn.classList.remove('hidden');

    // Delegar en VaultSearch sin duplicar scoring
    let results = [];
    if (typeof VaultSearch !== 'undefined' && typeof VaultSearch.searchVault === 'function') {
      results = VaultSearch.searchVault(cleanQuery, { limit: 5 });
    } else if (typeof searchVault === 'function') {
      results = searchVault(cleanQuery, { limit: 5 });
    }

    // Fallback defensivo sobre this.nodes si VaultSearch no arrojó resultados o no estaba inicializado
    if (!results || results.length === 0) {
      const qNorm = cleanQuery.toLowerCase();
      results = this.nodes
        .filter(n => (n.label && n.label.toLowerCase().includes(qNorm)) ||
                     (n.title && n.title.toLowerCase().includes(qNorm)) ||
                     (n.id && n.id.toLowerCase().includes(qNorm)))
        .slice(0, 5);
    }

    // Buscar el primer resultado canónico que exista en this.nodes
    let matchedNode = null;
    for (const res of results) {
      const node = this.nodes.find(n => n.id === res.id);
      if (node) {
        matchedNode = node;
        break;
      }
    }

    if (matchedNode) {
      this.centerNode(matchedNode);
      this.selectNode(matchedNode);
      if (feedbackEl) {
        feedbackEl.textContent = `Encontrado: ${matchedNode.label}`;
      }
      return matchedNode;
    } else {
      if (feedbackEl) {
        feedbackEl.textContent = results.length > 0
          ? `Sin nodo canónico en grafo para "${cleanQuery}"`
          : `Sin coincidencias para "${cleanQuery}"`;
      }
      return null;
    }
  },

  clearSearch() {
    const input = this.container ? this.container.querySelector('#graph-search-input') : null;
    const feedbackEl = this.container ? this.container.querySelector('#graph-search-feedback') : null;
    const clearBtn = this.container ? this.container.querySelector('#graph-search-clear') : null;
    if (input) input.value = '';
    if (feedbackEl) feedbackEl.textContent = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    this.draw();
  },

  centerNode(node) {
    if (!node || !this.canvas) return;
    const w = this.canvas.width || 800;
    const h = this.canvas.height || 600;
    const isDesktop = (typeof window === 'undefined') || (typeof window.innerWidth === 'undefined') || (window.innerWidth > 768);
    const inspectorWidth = isDesktop ? 380 : 0;
    const effectiveWidth = Math.max(300, w - inspectorWidth);
    this.panX = (effectiveWidth / 2) - (node.x * this.scale);
    this.panY = (h / 2) - (node.y * this.scale);
    this.draw();
  },

  deselectNode() {
    this.selectedNode = null;
    const layout = this.container ? this.container.querySelector('.graph-layout') : null;
    if (layout) layout.classList.remove('inspector-open');
    const inspector = this.container ? this.container.querySelector('#graph-inspector') : null;
    if (inspector) inspector.classList.add('hidden');
    if (this.canvas && typeof this.canvas.focus === 'function') {
      this.canvas.focus();
    }
    this.draw();
  },

  setSubjectFilter(subject) {
    this.filterSubject = subject || 'all';
    this.activeFilter = this.filterSubject;
    this.filterChapter = 'all';

    if (this.container && typeof this.container.querySelectorAll === 'function') {
      const pills = this.container.querySelectorAll('.graph-pill');
      pills.forEach(p => {
        const isMatch = p.dataset && p.dataset.subject === this.filterSubject;
        if (p.classList && typeof p.classList.toggle === 'function') {
          p.classList.toggle('active', isMatch);
        }
        if (typeof p.setAttribute === 'function') {
          p.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        }
      });
    }

    this.populateChaptersFilter();
    this.draw();
  },

  setChapterFilter(chapterKey) {
    this.filterChapter = chapterKey || 'all';
    this.draw();
  },

  toggleMasteryOverlay() {
    this.showMasteryOverlay = !this.showMasteryOverlay;
    this.updateMasteryStatsText();
    this.draw();
  },

  updateMasteryStatsText() {
    const textEl = (this.container && typeof this.container.querySelector === 'function')
      ? this.container.querySelector('#graph-mastery-stats-text')
      : null;
    const btn = (this.container && typeof this.container.querySelector === 'function')
      ? this.container.querySelector('#graph-toggle-mastery-overlay')
      : null;
    if (!textEl && !btn) return;

    let mastered = 0;
    const total = this.nodes.length;
    if (typeof StorageService !== 'undefined' && typeof StorageService.isTopicMasteredByUser === 'function') {
      mastered = this.nodes.filter(n => StorageService.isTopicMasteredByUser(n.id)).length;
    }

    if (textEl) {
      textEl.textContent = `Dominadas ${mastered}/${total}`;
    }
    if (btn) {
      btn.setAttribute('aria-label', `Alternar overlay de avance: ${mastered} de ${total} cédulas dominadas`);
      btn.setAttribute('aria-pressed', this.showMasteryOverlay ? 'true' : 'false');
      btn.classList.toggle('active', this.showMasteryOverlay);
    }
  },

  _matchesChapter(node, chapterKey) {
    if (!chapterKey || chapterKey === 'all') return true;
    if (node.chapterKey && node.chapterKey === chapterKey) return true;
    const parts = String(chapterKey).split('-');
    if (parts.length >= 2) {
      const subj = parts[0];
      const chapNum = parseInt(parts[1], 10);
      if (node.subject === subj && node.chapterNumber === chapNum) return true;
    }
    return false;
  },

  stepPhysics(steps = 1) {
    for (let i = 0; i < steps; i++) {
      this.updatePhysics();
      this.draw();
    }
  },

  selectNode(node) {
    this.selectedNode = node;
    const layout = this.container ? this.container.querySelector('.graph-layout') : null;
    if (layout) layout.classList.add('inspector-open');
    const inspector = this.container ? this.container.querySelector('#graph-inspector') : null;
    if (!inspector) return;

    // 1. Obtener lista completa de tópicos desde StorageService si está disponible
    const allTopics = (typeof StorageService !== 'undefined' && typeof StorageService.getData === 'function')
      ? (StorageService.getData()?.topics || [])
      : [];
    const topic = allTopics.find(t => t.id === node.id);

    // 2. Metadatos de la cédula
    const subject = (topic && topic.subject) || node.subject || 'civil';
    const subjectLabel = subject === 'civil' ? 'Civil' : (subject === 'procesal' ? 'Procesal' : (subject === 'constitucional' ? 'Constitucional' : 'Civil'));
    const indexCode = (topic && (topic.indexCode || topic.code)) || node.indexCode || '';
    const chapterTitle = (topic && (topic.chapterTitle || topic.chapter)) || node.chapter || node.category || '';

    // Etiqueta jerárquica M.C.S
    let hierCode = '';
    if (typeof App !== 'undefined' && typeof App.displayHierCode === 'function' && topic) {
      hierCode = App.displayHierCode(topic);
    }
    if (!hierCode) {
      hierCode = node.hierCode || indexCode;
    }

    // Título completo sin truncar (el canvas trunca, el inspector despliega completo)
    const fullTitle = (topic && (topic.title || topic.cleanTitle)) || node.label || '';

    // Estado de dominio (Mastery)
    const isMastered = typeof StorageService !== 'undefined' && typeof StorageService.isTopicMasteredByUser === 'function'
      ? StorageService.isTopicMasteredByUser(node.id)
      : false;

    // 3. Resolver conexiones dogmáticas
    let connsList = [];
    if (topic && Array.isArray(topic.connections) && topic.connections.length > 0) {
      connsList = topic.connections.map(conn => {
        const targetTopic = allTopics.find(t => t.id === conn.targetTopicId);
        return {
          id: conn.targetTopicId,
          title: targetTopic ? (targetTopic.cleanTitle || targetTopic.title) : conn.targetTitle,
          fullTitle: targetTopic ? targetTopic.title : conn.targetTitle,
          subject: conn.targetSubject || (targetTopic ? targetTopic.subject : 'civil'),
          discipline: targetTopic ? (targetTopic.chapterTitle || targetTopic.category) : '',
          indexCode: targetTopic ? (targetTopic.indexCode || targetTopic.code) : (conn.targetIndexCode || ''),
          crossoverType: conn.crossoverType || 'Cruce Dogmático',
          quote: conn.quote || '',
          whyConnected: conn.whyConnected || '',
          practicalApplication: conn.practicalApplication || ''
        };
      });
    } else if (Array.isArray(this.links)) {
      const connectedLinks = this.links.filter(l => l.source === node.id || l.target === node.id);
      connsList = connectedLinks.map(l => {
        const targetId = l.source === node.id ? l.target : l.source;
        const targetNode = this.nodes.find(n => n.id === targetId);
        const targetTopic = allTopics.find(t => t.id === targetId);
        return {
          id: targetId,
          title: targetTopic ? (targetTopic.cleanTitle || targetTopic.title) : (targetNode ? targetNode.label : targetId),
          fullTitle: targetTopic ? targetTopic.title : (targetNode ? targetNode.label : targetId),
          subject: (targetTopic && targetTopic.subject) || (targetNode && targetNode.subject) || 'civil',
          discipline: (targetTopic && targetTopic.chapterTitle) || (targetNode && targetNode.category) || '',
          indexCode: (targetTopic && targetTopic.indexCode) || (targetNode && targetNode.indexCode) || '',
          crossoverType: l.type || 'Cruce Dogmático',
          quote: l.quote || '',
          whyConnected: `Conexión dogmática ${l.type || 'interdisciplinaria'} verificada en el temario canónico.`,
          practicalApplication: 'Aplicación en resolución de casos y preguntas del Examen de Grado.'
        };
      });
    }

    // Render de cruces con helper unificado (cero duplicación de templates)
    const renderCards = (typeof App !== 'undefined' && typeof App.renderConnectionCardsHtml === 'function')
      ? App.renderConnectionCardsHtml
      : (typeof window !== 'undefined' && typeof window.renderConnectionCardsHtml === 'function')
        ? window.renderConnectionCardsHtml
        : (typeof renderConnectionCardsHtml === 'function' ? renderConnectionCardsHtml : null);

    const connsHtml = renderCards 
      ? renderCards(connsList, topic || node)
      : this._renderConnectionCardsFallback(connsList);

    // Sanitización anti-XSS estricta
    const safeTitle = safeEscapeHtml(fullTitle);
    const safeSubject = safeEscapeHtml(subject);
    const safeSubjectLabel = safeEscapeHtml(subjectLabel);
    const safeIndexCode = safeEscapeHtml(indexCode);
    const safeChapter = safeEscapeHtml(chapterTitle);
    const safeHierCode = safeEscapeHtml(hierCode);

    if (typeof inspector.setAttribute === 'function') {
      inspector.setAttribute('role', 'complementary');
      inspector.setAttribute('aria-label', `Ficha de conocimiento: ${safeTitle}`);
    }
    inspector.classList.remove('hidden');

    inspector.innerHTML = `
      <div class="inspector-header">
        <div style="flex: 1;">
          <div class="inspector-meta-row">
            <span class="topic-subject-badge ${safeSubject}">${safeSubjectLabel}</span>
            ${safeIndexCode ? `<span class="inspector-meta-badge" title="Cédula ${safeIndexCode}">§ ${safeIndexCode}</span>` : ''}
            ${safeHierCode ? `<span class="inspector-hier-badge" title="Cédula ${safeIndexCode} · Código M.C.S: ${safeHierCode}">${safeHierCode}</span>` : ''}
          </div>
          ${safeChapter ? `<div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 4px;">${safeChapter}</div>` : ''}
          <h2 class="inspector-node-title" tabindex="-1">${safeTitle}</h2>
        </div>
        <button class="icon-btn btn-sm" id="btn-close-inspector" aria-label="Cerrar inspector" title="Cerrar">
          <i data-lucide="x"></i>
        </button>
      </div>

      <div class="inspector-actions-row">
        <button class="btn btn-primary" id="btn-view-node-topic" style="width: 100%;">
          <i data-lucide="book-open"></i>
          <span>Ver Cédula Completa</span>
        </button>
        <button type="button" class="btn-mastery-toggle ${isMastered ? 'is-mastered' : ''}" id="btn-toggle-node-mastery" style="width: 100%;">
          <i data-lucide="${isMastered ? 'check-circle-2' : 'circle'}"></i>
          <span class="mastery-label">${isMastered ? 'Dominada ✓' : 'Marcar como dominada'}</span>
        </button>
      </div>

      <div class="inspector-section inspector-qa-section" style="margin-top: 14px;">
        <span class="inspector-section-label">Evidencia Literal en Apuntes</span>
        <button type="button" class="btn btn-outline btn-sm" id="btn-node-qa-ask" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px;">
          <i data-lucide="help-circle"></i>
          <span>¿Qué dicen mis apuntes? (Definición oficial)</span>
        </button>
        <div id="inspector-qa-result" class="inspector-qa-result"></div>
      </div>

      <div class="inspector-section" style="margin-top: 14px;">
        <span class="inspector-section-label">Cruces Dogmáticos e Instituciones Vinculadas (${connsList.length})</span>
        <div class="inspector-connections-list" style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
          ${connsHtml}
        </div>
      </div>
    `;

    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }

    // Foco accesible al abrir
    inspector.querySelector('.inspector-node-title')?.focus();

    // Cerrar inspector
    inspector.querySelector('#btn-close-inspector')?.addEventListener('click', () => {
      this.deselectNode();
    });

    // Ver cédula completa en temario
    inspector.querySelector('#btn-view-node-topic')?.addEventListener('click', () => {
      if (typeof App !== 'undefined' && typeof App.openTopic === 'function') {
        App.openTopic(node.id);
      } else if (typeof App !== 'undefined' && typeof App.switchView === 'function') {
        App.switchView('topics');
        if (typeof App.searchGlobal === 'function') {
          App.searchGlobal(node.label);
        }
      }
    });

    // Toggle de Dominio (Mastery)
    inspector.querySelector('#btn-toggle-node-mastery')?.addEventListener('click', () => {
      if (typeof StorageService !== 'undefined' && typeof StorageService.toggleTopicMastery === 'function') {
        StorageService.toggleTopicMastery(node.id);
        this.updateMasteryStatsText();
        const updated = StorageService.isTopicMasteredByUser(node.id);
        const mBtn = inspector.querySelector('#btn-toggle-node-mastery');
        if (mBtn) {
          mBtn.classList.toggle('is-mastered', updated);
          const labelSpan = mBtn.querySelector('.mastery-label');
          if (labelSpan) labelSpan.textContent = updated ? 'Dominada ✓' : 'Marcar como dominada';
          const iconEl = mBtn.querySelector('i');
          if (iconEl) iconEl.setAttribute('data-lucide', updated ? 'check-circle-2' : 'circle');
          if (typeof window !== 'undefined' && window.lucide) {
            window.lucide.createIcons();
          }
        }
        this.draw();
      }
    });

    // QA extractivo: ¿Qué dicen mis apuntes?
    inspector.querySelector('#btn-node-qa-ask')?.addEventListener('click', () => {
      const qaResult = inspector.querySelector('#inspector-qa-result');
      if (!qaResult) return;
      if (qaResult.dataset.loaded === 'true') {
        qaResult.classList.toggle('hidden');
        return;
      }

      if (typeof QAComposer !== 'undefined' && typeof QAComposer.composeAnswer === 'function') {
        const queryTerm = node.label || fullTitle;
        const res = QAComposer.composeAnswer(queryTerm, { mode: 'definicion' });
        if (!res || res.empty) {
          qaResult.innerHTML = `
            <div class="connections-empty-state" style="padding: 12px; margin-top: 6px;">
              <p class="connections-empty-desc" style="margin: 0; font-size: 0.82rem;">${safeEscapeHtml(res?.message || 'Tus apuntes no cubren esto aún')}</p>
            </div>
          `;
        } else {
          qaResult.innerHTML = res.html;
          // Wire up jump buttons inside QA answer
          qaResult.querySelectorAll('.qa-action-jump-btn').forEach(jBtn => {
            jBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const jumpTopic = jBtn.dataset.jumpTopic;
              const jumpSnippet = jBtn.dataset.snippet || '';
              if (this.isValidTopicId(jumpTopic)) {
                if (typeof App !== 'undefined' && typeof App.openTopic === 'function') {
                  App.openTopic(jumpTopic, jumpSnippet ? { highlight: jumpSnippet } : {});
                }
              }
            });
          });
        }
        qaResult.dataset.loaded = 'true';
        if (typeof window !== 'undefined' && window.lucide) {
          window.lucide.createIcons();
        }
      }
    });

    // Salto interactivo con highlight en Cruces Dogmáticos
    inspector.querySelectorAll('.btn-jump-connection').forEach(jumpBtn => {
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = jumpBtn.dataset.targetId || jumpBtn.dataset.topicId;
        const snippet = jumpBtn.dataset.snippet || '';
        if (this.isValidTopicId(targetId)) {
          if (typeof App !== 'undefined' && typeof App.openTopic === 'function') {
            App.openTopic(targetId, snippet ? { highlight: snippet } : {});
          }
        }
      });
    });

    // Clic en tarjeta de conexión para navegar dentro del grafo
    inspector.querySelectorAll('.linked-connection-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-jump-connection')) return;
        const targetId = card.dataset.topicId;
        const targetNode = this.nodes.find(n => n.id === targetId);
        if (targetNode) {
          this.selectNode(targetNode);
        }
      });
    });

    // Clic en sugerencias no validadas del Vault
    inspector.querySelectorAll('.unvalidated-suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const targetId = card.dataset.topicId;
        if (this.isValidTopicId(targetId)) {
          if (typeof App !== 'undefined' && typeof App.openTopic === 'function') {
            App.openTopic(targetId);
          }
        }
      });
    });
  },

  startSimulation() {
    if (this.isSimulating) return;
    this.isSimulating = true;

    // Escuchar cambios de visibilidad si document está presente y soporta eventos
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function' && !this._visibilityBound) {
      this._visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        const isAppGraph = typeof App !== 'undefined' ? App.currentView === 'graph' : true;
        if (!document.hidden && isAppGraph) {
          this.draw();
        }
      });
    }

    const simulate = () => {
      // Pausa automática de física cuando la pestaña está oculta o la vista no es 'graph'
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const isNotGraphView = typeof App !== 'undefined' && App.currentView && App.currentView !== 'graph';

      if (!isHidden && !isNotGraphView) {
        this.updatePhysics();
        this.draw();
      }
      if (typeof requestAnimationFrame === 'function') {
        this.animationId = requestAnimationFrame(simulate);
      }
    };

    if (this.animationId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animationId);
    }
    if (typeof requestAnimationFrame === 'function') {
      this.animationId = requestAnimationFrame(simulate);
    }
  },

  stopSimulation() {
    if (this.animationId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isSimulating = false;
  },

  updatePhysics() {
    if (!this.canvas || this.nodes.length === 0) return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Repulsión entre nodos (con cap de distancia REPEL_DIST_CAP)
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = b.x - a.x;
        if (dx > REPEL_DIST_CAP || dx < -REPEL_DIST_CAP) continue;
        const dy = b.y - a.y;
        if (dy > REPEL_DIST_CAP || dy < -REPEL_DIST_CAP) continue;

        let dist = Math.hypot(dx, dy) || 1;
        if (dist < REPEL_DIST_CAP) {
          const force = K_REPEL / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    // Fuerza de resortes en las aristas (links)
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    this.links.forEach(link => {
      const a = nodeMap.get(link.source);
      const b = nodeMap.get(link.target);
      if (a && b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const displacement = dist - TARGET_DIST;
        const force = displacement * K_SPRING;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx += fx;
        b.vy += fy;
      }
    });

    // Gravedad hacia el centro y actualización de posiciones
    this.nodes.forEach(n => {
      if (n === this.draggedNode) return;
      n.vx += (centerX - n.x) * CENTER_STRENGTH;
      n.vy += (centerY - n.y) * CENTER_STRENGTH;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    });
  },

  draw() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    // 0. Modo foco: si hay nodo seleccionado, identificar vecindario a 1 salto
    const isFocusMode = Boolean(this.selectedNode);
    const focusNeighborIds = new Set();
    if (isFocusMode && this.selectedNode) {
      focusNeighborIds.add(this.selectedNode.id);
      this.links.forEach(l => {
        if (l.source === this.selectedNode.id) focusNeighborIds.add(l.target);
        else if (l.target === this.selectedNode.id) focusNeighborIds.add(l.source);
      });
    }

    const isFilteredSubject = this.filterSubject !== 'all';
    const isFilteredChapter = this.filterChapter !== 'all';

    // 1. Determinar aristas visibles respetando cap de 400
    const maxLinks = this.visibleLinksCap || 400;
    let candidateLinks = this.links;

    if (this.links.length > maxLinks) {
      const selectedId = this.selectedNode ? this.selectedNode.id : null;
      const degMap = this.degreeMap || new Map();
      candidateLinks = [...this.links].sort((a, b) => {
        // Prioridad 1: Aristas incidentes en el nodo seleccionado (foco prioritario)
        const aInc = selectedId && (a.source === selectedId || a.target === selectedId) ? 1 : 0;
        const bInc = selectedId && (b.source === selectedId || b.target === selectedId) ? 1 : 0;
        if (aInc !== bInc) return bInc - aInc;

        // Prioridad 2: Aristas inter-materia (transversales al examen)
        const nodeA1 = nodeMap.get(a.source);
        const nodeA2 = nodeMap.get(a.target);
        const nodeB1 = nodeMap.get(b.source);
        const nodeB2 = nodeMap.get(b.target);

        const aCross = (nodeA1 && nodeA2 && nodeA1.subject !== nodeA2.subject) ? 1 : 0;
        const bCross = (nodeB1 && nodeB2 && nodeB1.subject !== nodeB2.subject) ? 1 : 0;
        if (aCross !== bCross) return bCross - aCross;

        // Prioridad 3: Grado de hubs combinado
        const aDeg = (degMap.get(a.source) || 0) + (degMap.get(a.target) || 0);
        const bDeg = (degMap.get(b.source) || 0) + (degMap.get(b.target) || 0);
        return bDeg - aDeg;
      }).slice(0, maxLinks);
    }

    // Actualizar leyenda reactiva con conteo de aristas mostradas
    const statsEl = this.container ? this.container.querySelector('#graph-legend-stats') : null;
    if (statsEl) {
      statsEl.textContent = `${this.nodes.length} cédulas · mostrando ${candidateLinks.length}/${this.links.length} nexos`;
    }

    // 2. Dibujar enlaces (aristas)
    candidateLinks.forEach(l => {
      const a = nodeMap.get(l.source);
      const b = nodeMap.get(l.target);
      if (!a || !b) return;

      const isIncidentOnSelected = this.selectedNode && (this.selectedNode.id === a.id || this.selectedNode.id === b.id);
      const aMatchesFilter = (!isFilteredSubject || a.subject === this.filterSubject) && (!isFilteredChapter || this._matchesChapter(a, this.filterChapter));
      const bMatchesFilter = (!isFilteredSubject || b.subject === this.filterSubject) && (!isFilteredChapter || this._matchesChapter(b, this.filterChapter));

      let linkAlpha = 0.25;
      let linkStroke = 'rgba(100, 116, 139, 0.25)';
      let linkLineWidth = 1.2;

      if (isFocusMode) {
        if (isIncidentOnSelected) {
          linkAlpha = 1.0;
          linkStroke = '#d4af37'; // Dorado en foco
          linkLineWidth = 2.5;
        } else {
          linkAlpha = 0.05; // Fuera del foco
          linkStroke = 'rgba(100, 116, 139, 0.15)';
          linkLineWidth = 0.8;
        }
      } else {
        if (isFilteredSubject || isFilteredChapter) {
          if (aMatchesFilter && bMatchesFilter) {
            linkAlpha = 0.6;
            linkStroke = 'rgba(100, 116, 139, 0.4)';
            linkLineWidth = 1.5;
          } else {
            linkAlpha = 0.05; // Fuera de filtro
            linkStroke = 'rgba(100, 116, 139, 0.1)';
            linkLineWidth = 0.8;
          }
        }
      }

      ctx.save();
      ctx.globalAlpha = linkAlpha;
      ctx.strokeStyle = linkStroke;
      ctx.lineWidth = linkLineWidth;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Rotulado con label o type si es incidente en el nodo seleccionado
      if (isIncidentOnSelected) {
        const linkLabel = l.label || l.type || '';
        if (linkLabel) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          ctx.fillStyle = '#d4af37';
          ctx.font = '10px Plus Jakarta Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(linkLabel, midX, midY - 4);
        }
      }
      ctx.restore();
    });

    // 3. Dibujar Nodos con atenuación y modo foco
    let masteredSet = new Set();
    if (typeof StorageService !== 'undefined') {
      if (typeof StorageService.getUserMasteredTopics === 'function') {
        const list = StorageService.getUserMasteredTopics();
        if (Array.isArray(list)) masteredSet = new Set(list);
      } else if (typeof StorageService.isTopicMasteredByUser === 'function') {
        this.nodes.forEach(n => {
          if (StorageService.isTopicMasteredByUser(n.id)) masteredSet.add(n.id);
        });
      }
    }

    this.nodes.forEach(n => {
      const isSelected = this.selectedNode && this.selectedNode.id === n.id;
      const isNeighbor = isFocusMode && focusNeighborIds.has(n.id);
      const matchesSubject = !isFilteredSubject || n.subject === this.filterSubject;
      const matchesChapter = !isFilteredChapter || this._matchesChapter(n, this.filterChapter);
      const matchesFilter = matchesSubject && matchesChapter;

      let nodeOpacity = 1.0;
      if (isFocusMode) {
        if (isSelected || isNeighbor) {
          nodeOpacity = 1.0;
        } else {
          nodeOpacity = 0.10; // Fuera de foco
        }
      } else {
        if (matchesFilter) {
          nodeOpacity = 1.0;
        } else {
          nodeOpacity = 0.12; // Fuera de filtro
        }
      }

      ctx.save();
      ctx.globalAlpha = nodeOpacity;

      // Color según materia
      let fillColor = '#38bdf8'; // civil por defecto
      if (n.subject === 'procesal') fillColor = '#a855f7';
      else if (n.subject === 'constitucional') fillColor = '#f59e0b';
      else if (n.subject === 'cross') fillColor = '#d4af37';
      else if (n.subject !== 'civil') fillColor = '#38bdf8';

      // Halo verde esmeralda si el nodo está dominado (Mastery)
      const isMastered = masteredSet.has(n.id);
      if (isMastered && (this.showMasteryOverlay || isSelected)) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (isSelected ? 5 : 3.5), 0, 2 * Math.PI);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Halo si está seleccionado
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
        ctx.fill();
      }

      // Círculo principal del nodo
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.8)';
      ctx.stroke();

      // Etiqueta del nodo
      ctx.fillStyle = isSelected ? '#ffffff' : '#edf2f7';
      ctx.font = `${isSelected ? 'bold 12px' : '11px'} Plus Jakarta Sans, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelText = n.label || '';
      const displayLabel = labelText.length > 28 ? labelText.slice(0, 27) + '…' : labelText;
      ctx.fillText(displayLabel, n.x, n.y + n.radius + 5);

      ctx.restore();
    });

    ctx.restore();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConceptGraph;
}
if (typeof window !== 'undefined') {
  window.ConceptGraph = ConceptGraph;
}
