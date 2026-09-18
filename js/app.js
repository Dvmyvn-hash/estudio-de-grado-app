/**
 * CONTROLADOR PRINCIPAL - ESTUDIO DE GRADO HUB
 * Orquesta vistas, temario, visor de apuntes, búsqueda global, importador y temas.
 */

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const App = {
  currentView: "topics",
  currentTopicId: null,
  activeSidebarFilter: "all",
  coverageFilter: "all",

  init() {
    console.log("Inicializando Estudio de Grado App...");
    this.setupTheme();
    this.setupNavigation();
    this.setupSidebar();
    this.setupGlobalSearch();
    this.setupImportModal();
    this.setupKeyboardShortcuts();

    // Cargar datos
    const data = StorageService.getData();
    if (data.topics && data.topics.length > 0) {
      this.currentTopicId = data.topics[0].id;
    }

    // Actualizar badge de casos y licencia
    this.updateCaseBadge();
    this.renderLicenseBadge();
    this.renderAdminIndicator();
    this.setupLicenseModals();

    // Renderizar vista inicial
    this.renderSidebar();
    this.renderCurrentView();

    // Iniciar Sincronizador Automático en Tiempo Real
    this.startLiveSync();

    // Renderizar iconos de Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // 0. AUTO-SINCRONIZACIÓN EN TIEMPO REAL CON ARCHIVOS DE FUENTE
  lastSyncVersion: null,
  isSyncing: false,

  startLiveSync() {
    // Comprobar cada 3.5 segundos si hay cambios en los archivos de NotebookLM / fuentes
    const check = async () => {
      try {
        const res = await fetch("/api/sync-check");
        if (res.ok) {
          const data = await res.json();
          if (this.lastSyncVersion === null) {
            this.lastSyncVersion = data.version;
          } else if (this.lastSyncVersion !== data.version) {
            this.lastSyncVersion = data.version;
            await this.syncWithServer();
          }
        }
      } catch (e) {
        // Servidor estático sin API o fuera de línea (continúa funcionando normal en local)
      }
    };

    check();
    setInterval(check, 3500);
  },

  async syncWithServer() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    const badge = document.getElementById("live-sync-badge");
    if (badge) badge.classList.add("syncing");

    try {
      const res = await fetch("/api/sync-topics");
      if (res.ok) {
        const data = await res.json();
        const serverTopics = data.topics || [];
        if (serverTopics.length > 0) {
          const localData = StorageService.getData();
          
          // Fusionar temas manteniendo estados de 'mastered'
          const existingMap = new Map((localData.topics || []).map(t => [t.id, t]));
          serverTopics.forEach(st => {
            const existing = existingMap.get(st.id);
            if (existing) {
              existingMap.set(st.id, { ...existing, ...st, mastered: existing.mastered });
            } else {
              existingMap.set(st.id, st);
            }
          });

          localData.topics = Array.from(existingMap.values());
          StorageService.saveData(localData);

          this.renderSidebar();
          if (this.currentView === "topics") {
            this.renderTopicViewer();
          }

          this.showToast(`¡Contenidos actualizados automáticamente (${serverTopics.length} cédulas sincronizadas)!`, "success");
        }
      }
    } catch (e) {
      console.warn("Error en auto-sync:", e);
    } finally {
      this.isSyncing = false;
      if (badge) badge.classList.remove("syncing");
    }
  },

  // 1. GESTIÓN DE TEMA (CLARO / OSCURO)
  setupTheme() {
    const savedTheme = localStorage.getItem("theme_preference") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const btnTheme = document.getElementById("btn-toggle-theme");
    if (btnTheme) {
      btnTheme.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme_preference", next);
        if (this.currentView === "graph") {
          ConceptGraph.draw();
        }
      });
    }
  },

  // 2. NAVEGACIÓN ENTRE VISTAS
  setupNavigation() {
    const tabs = document.querySelectorAll(".header-nav .nav-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const view = tab.dataset.view;
        this.switchView(view);
      });
    });

    // Toggle sidebar
    const btnSidebar = document.getElementById("btn-toggle-sidebar");
    const sidebar = document.getElementById("app-sidebar");
    if (btnSidebar && sidebar) {
      btnSidebar.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        if (this.currentView === "graph") {
          setTimeout(() => {
            ConceptGraph.resizeCanvas();
            ConceptGraph.setupData();
          }, 300);
        }
      });
    }
  },

  switchView(viewName) {
    this.currentView = viewName;

    // Actualizar tabs activas
    document.querySelectorAll(".header-nav .nav-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.view === viewName);
    });

    // Actualizar secciones
    document.querySelectorAll(".view-section").forEach(s => {
      s.classList.remove("active");
    });
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add("active");
    }

    this.renderCurrentView();
  },

  renderCurrentView() {
    if (this.currentView === "topics") {
      this.renderTopicViewer();
    } else if (this.currentView === "cases") {
      const casesContainer = document.getElementById("view-cases");
      CaseSolver.init(casesContainer);
    } else if (this.currentView === "graph") {
      const graphContainer = document.getElementById("view-graph");
      ConceptGraph.init(graphContainer);
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // 3. BARRA LATERAL (SIDEBAR) & TEMARIO
  setupSidebar() {
    // Filtros por materia (Civil, Procesal, Constitucional)
    const filters = document.querySelectorAll(".subject-filters .filter-pill");
    filters.forEach(btn => {
      btn.addEventListener("click", () => {
        filters.forEach(f => f.classList.remove("active"));
        btn.classList.add("active");
        this.activeSidebarFilter = btn.dataset.filter;
        this.renderSidebar();
      });
    });

    // Filtros por cobertura de apuntes (Todas, Con Apunte, Pendientes)
    const covFilters = document.querySelectorAll(".coverage-filters .coverage-pill");
    covFilters.forEach(btn => {
      btn.addEventListener("click", () => {
        covFilters.forEach(f => f.classList.remove("active"));
        btn.classList.add("active");
        this.coverageFilter = btn.dataset.coverage;
        this.renderSidebar();
      });
    });

    // Botón nuevo tema
    const btnNewTopic = document.getElementById("btn-new-topic");
    if (btnNewTopic) {
      btnNewTopic.addEventListener("click", () => {
        this.openImportModal("paste");
      });
    }
  },

  renderSidebar() {
    const data = StorageService.getData();
    const topics = data.topics || [];
    const container = document.getElementById("topics-tree-container");
    if (!container) return;

    const isAdmin = LicenseService.isAdminMode();

    // Mostrar u ocultar controles de administrador en el sidebar
    const covFiltersEl = document.querySelector(".coverage-filters");
    if (covFiltersEl) {
      covFiltersEl.style.display = isAdmin ? "flex" : "none";
    }
    const covStatsEl = document.getElementById("admin-coverage-stat-row");
    if (covStatsEl) {
      covStatsEl.style.display = isAdmin ? "flex" : "none";
    }

    // Actualizar estadísticas de cobertura en los botones de filtro (solo visible para admin)
    const totalCount = topics.length;
    const coveredCount = topics.filter(t => t.hasUserNotes).length;
    const pendingCount = totalCount - coveredCount;

    const pillAll = document.querySelector('.coverage-filters [data-coverage="all"]');
    if (pillAll) pillAll.textContent = `Todas (${totalCount})`;
    const pillCovered = document.querySelector('.coverage-filters [data-coverage="covered"]');
    if (pillCovered) pillCovered.textContent = `✅ Con Apunte (${coveredCount})`;
    const pillPending = document.querySelector('.coverage-filters [data-coverage="pending"]');
    if (pillPending) pillPending.textContent = `⚠️ Pendientes (${pendingCount})`;

    const statsCoverage = document.getElementById("stats-coverage");
    if (statsCoverage) {
      const covPct = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;
      statsCoverage.textContent = `${coveredCount} / ${totalCount} (${covPct}%)`;
    }

    // Filtrar temas según la materia Y el estado de cobertura seleccionado (cobertura solo para admin)
    const filteredTopics = topics.filter(t => {
      if (this.activeSidebarFilter !== "all" && t.subject !== this.activeSidebarFilter) return false;
      if (isAdmin) {
        if (this.coverageFilter === "covered") return t.hasUserNotes === true;
        if (this.coverageFilter === "pending") return !t.hasUserNotes;
      }
      return true;
    });

    // Actualizar estadísticas de progreso por usuario
    const stats = StorageService.calculateProgress(null, this.activeSidebarFilter);
    const statsText = document.getElementById("stats-mastery");
    if (statsText) {
      const subjectLabel = this.activeSidebarFilter === 'all' ? 'Total' : this.activeSidebarFilter.toUpperCase();
      statsText.textContent = `${stats.mastered} / ${stats.total} (${stats.percent}%)`;
      statsText.title = `Progreso en ${subjectLabel}: ${stats.mastered} de ${stats.total} cédulas dominadas`;
    }

    const progressBar = document.getElementById("mastery-progress-bar");
    if (progressBar) progressBar.style.width = `${stats.percent}%`;

    // Si no hay temas
    if (filteredTopics.length === 0) {
      container.innerHTML = `<p class="text-muted" style="padding: 16px; font-size: 0.8rem; text-align: center;">No hay cédulas que coincidan con los filtros seleccionados.</p>`;
      return;
    }

    // Agrupar por Disciplina Oficial (I, II, III) y luego por Capítulo Oficial (1, 2, 3...)
    const disciplineOrder = [
      { key: "civil", label: "I. Derecho Civil" },
      { key: "procesal", label: "II. Derecho Procesal" },
      { key: "constitucional", label: "III. Derecho Constitucional" }
    ];

    let html = "";

    disciplineOrder.forEach(disc => {
      const discTopics = filteredTopics.filter(t => t.subject === disc.key);
      if (discTopics.length === 0) return;

      // Si se muestran 'todas', mostramos el banner de la disciplina
      if (this.activeSidebarFilter === 'all') {
        html += `
          <div class="discipline-section-header">
            <span class="discipline-badge-indicator ${disc.key}"></span>
            <span class="discipline-title-text">${disc.label}</span>
          </div>
        `;
      }

      // Agrupar por Capítulos oficiales dentro de la disciplina
      const chapterMap = new Map();
      discTopics.forEach(t => {
        const chapNum = t.chapterNumber || 1;
        const chapTitle = t.chapterTitle || `${chapNum}. Capítulo`;
        if (!chapterMap.has(chapTitle)) {
          chapterMap.set(chapTitle, { num: chapNum, topics: [] });
        }
        chapterMap.get(chapTitle).topics.push(t);
      });

      // Ordenar capítulos numéricamente
      const sortedChapters = Array.from(chapterMap.entries()).sort((a, b) => a[1].num - b[1].num);

      sortedChapters.forEach(([chapTitle, chapData]) => {
        const chapterTopics = chapData.topics;
        
        // Ordenar cédulas estrictamente por código (1.1, 1.2, etc.)
        chapterTopics.sort((a, b) => {
          const parseCode = (c) => {
            const parts = (c || "").split(".").map(p => parseInt(p, 10) || 0);
            return (parts[0] || 0) * 100 + (parts[1] || 0);
          };
          return parseCode(a.code) - parseCode(b.code);
        });

        const masteredInChap = chapterTopics.filter(t => StorageService.isTopicMasteredByUser(t.id)).length;
        const totalInChap = chapterTopics.length;
        const hasActiveTopic = chapterTopics.some(t => t.id === this.currentTopicId);
        const isOpen = hasActiveTopic || this.activeSidebarFilter !== 'all' || this.coverageFilter !== 'all' || chapData.num === 1;

        html += `
          <div class="category-group ${isOpen ? 'open' : ''}">
            <div class="category-header" title="${chapTitle}">
              <div class="category-title-wrap">
                <span class="category-badge-dot ${disc.key}"></span>
                <span class="chapter-label">${chapTitle}</span>
              </div>
              <div class="chapter-meta-right">
                <span class="chapter-count-badge ${masteredInChap === totalInChap && totalInChap > 0 ? 'all-done' : ''}">
                  ${masteredInChap}/${totalInChap}
                </span>
                <i data-lucide="chevron-right" class="category-chevron"></i>
              </div>
            </div>
            <ul class="category-topics-list">
              ${chapterTopics.map(t => {
                const isUnlocked = LicenseService.isContentUnlocked(t, 'topic');
                const isMastered = StorageService.isTopicMasteredByUser(t.id);
                // Quitar prefijo repetido
                const cleanTitle = t.cleanTitle || (t.title.replace(/^Secci[oó]n\s*\d+\.\d+\s*[:–\-—]\s*/i, '').trim());

                return `
                <li class="topic-tree-item ${this.currentTopicId === t.id ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}" data-topic-id="${t.id}" title="${t.title}">
                  <div class="topic-item-left">
                    <span class="cedula-code-badge">${t.code ? '§ ' + t.code : '·'}</span>
                    <span class="topic-title-text">${cleanTitle}</span>
                  </div>
                  <div class="topic-item-right">
                    ${isAdmin ? `
                      <span class="cedula-coverage-tag ${t.hasUserNotes ? 'covered' : 'pending'}" title="${t.hasUserNotes ? 'Desarrollada con apunte personal (' + (t.userSourceFiles || []).join(', ') + ')' : 'Pendiente de apunte en carpeta APUNTES'}">
                        ${t.hasUserNotes ? '✅' : '⚠️'}
                      </span>
                    ` : ''}
                    ${!isUnlocked ? `<i data-lucide="lock" class="topic-lock-icon" title="Cédula bloqueada (Requiere Pase de Grado)"></i>` : `
                      <span class="topic-mastery-dot ${isMastered ? 'mastered' : 'learning'}" title="${isMastered ? 'Dominado por ti' : 'Por estudiar'}"></span>
                    `}
                  </div>
                </li>
                `;
              }).join('')}
            </ul>
          </div>
        `;
      });
    });

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Eventos de selección de tema
    container.querySelectorAll('.topic-tree-item').forEach(item => {
      item.addEventListener('click', () => {
        this.currentTopicId = item.dataset.topicId;
        this.renderSidebar();
        if (this.currentView !== 'topics') {
          this.switchView('topics');
        } else {
          this.renderTopicViewer();
        }
      });
    });

    // Toggle acordeón
    container.querySelectorAll('.category-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('open');
      });
    });
  },

  // 4. VISOR DE APUNTES (TOPIC VIEWER)
  renderTopicViewer() {
    const container = document.getElementById("view-topics");
    if (!container) return;

    const data = StorageService.getData();
    const topic = data.topics.find(t => t.id === this.currentTopicId) || data.topics[0];

    if (!topic) {
      container.innerHTML = `<div class="empty-state-wrap" style="padding: 60px; text-align: center;">
        <h2>No hay temas cargados</h2>
        <p class="text-muted">Importa tus apuntes de NotebookLM o sincroniza con el temario oficial.</p>
      </div>`;
      return;
    }

    const isUnlocked = LicenseService.isContentUnlocked(topic, 'topic');
    const isMastered = StorageService.isTopicMasteredByUser(topic.id);
    const isAdmin = LicenseService.isAdminMode();
    const disciplineName = topic.discipline || topic.sectionName || (
      topic.subject === 'civil' ? 'I. Derecho Civil y Derecho de Familia' :
      topic.subject === 'procesal' ? 'II. Derecho Procesal y Derecho Procesal Penal' :
      'III. Derecho Público (Constitucional)'
    );

    // Conexiones dogmáticas y aplicación práctica con IA
    const richConnections = (topic.connections && topic.connections.length > 0)
      ? topic.connections.map(conn => {
          const targetTopic = data.topics.find(t => t.id === conn.targetTopicId);
          return {
            id: conn.targetTopicId,
            title: targetTopic ? (targetTopic.cleanTitle || targetTopic.title) : conn.targetTitle,
            fullTitle: targetTopic ? targetTopic.title : conn.targetTitle,
            subject: conn.targetSubject || (targetTopic ? targetTopic.subject : 'civil'),
            discipline: targetTopic ? (targetTopic.chapterTitle || targetTopic.category) : '',
            crossoverType: conn.crossoverType || 'Cruce Dogmático',
            whyConnected: conn.whyConnected,
            practicalApplication: conn.practicalApplication
          };
        })
      : [];

    const fallbackRelated = (richConnections.length === 0)
      ? data.topics.filter(t => {
          if (t.id === topic.id) return false;
          const commonTags = (t.tags || []).filter(tag => (topic.tags || []).includes(tag));
          return commonTags.length > 0 || (t.chapterNumber === topic.chapterNumber && t.subject === topic.subject);
        }).slice(0, 3).map(rt => ({
          id: rt.id,
          title: rt.cleanTitle || rt.title,
          fullTitle: rt.title,
          subject: rt.subject,
          discipline: rt.chapterTitle || rt.category,
          crossoverType: 'Materia Afín',
          whyConnected: `Ambas instituciones integran el temario de ${rt.discipline || rt.category} y comparten principios rectores de examen de grado.`,
          practicalApplication: 'La comisión formula preguntas cruzadas analizando la subsunción normativa y los efectos jurídicos correlativos.'
        }))
      : [];

    const displayConnections = richConnections.length > 0 ? richConnections : fallbackRelated;

    // Casos prácticos vinculados
    const linkedCases = (data.cases || []).filter(c => {
      return c.subjects && c.subjects.includes(topic.subject);
    }).slice(0, 3);

    // Desglose oficial de bullets del temario
    const bulletsHtml = (topic.officialBreakdown && topic.officialBreakdown.length > 0)
      ? topic.officialBreakdown.map(b => `<li class="official-bullet-item"><i data-lucide="check" class="bullet-icon"></i><span>${b}</span></li>`).join('')
      : `<li class="official-bullet-item"><span>Programa oficial DUN 11/2022 - Periodo 2026</span></li>`;

    container.innerHTML = `
      <div class="topic-viewer-container">
        
        <!-- COLUMNA PRINCIPAL DE LECTURA -->
        <article class="topic-reading-col">
          
          <div class="topic-header-card">
            
            <!-- Breadcrumbs de ubicación en los apuntes -->
            <nav class="topic-breadcrumbs" aria-label="Ubicación en los apuntes">
              <span class="bc-discipline ${topic.subject}">${disciplineName}</span>
              <i data-lucide="chevron-right" class="bc-sep"></i>
              <span class="bc-chapter">${topic.chapterTitle || topic.category}</span>
              <i data-lucide="chevron-right" class="bc-sep"></i>
              <span class="bc-code">${topic.code ? 'Sección ' + topic.code : 'Apunte'}</span>
            </nav>

            <div class="topic-meta-row">
              <div class="topic-official-tags">
                <span class="topic-subject-badge ${topic.subject}">
                  ${disciplineName}
                </span>
                <span class="topic-period-badge" title="Archivo de apuntes de origen">
                  <i data-lucide="file-text" style="width: 12px; height: 12px; vertical-align: middle;"></i> ${topic.sourceFile || 'Apuntes'}
                </span>
              </div>
              
              <div class="topic-actions-group">
                ${isUnlocked ? `
                  <button id="btn-toggle-mastery" class="btn ${isMastered ? 'btn-secondary' : 'btn-primary'} btn-sm">
                    <i data-lucide="${isMastered ? 'check-circle' : 'circle'}"></i>
                    <span>${isMastered ? 'Dominado ✅' : 'Marcar como Dominado'}</span>
                  </button>
                ` : `
                  <span class="badge-count" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">
                    <i data-lucide="lock" style="width: 12px; height: 12px; vertical-align: middle;"></i> Sección Bloqueada
                  </span>
                `}
              </div>
            </div>

            <h1 class="topic-h1-title">${topic.title}</h1>

            <div class="topic-tags-list">
              ${(topic.tags || []).map(tag => `
                <span class="concept-tag" data-tag="${tag}">
                  <i data-lucide="tag" style="width: 12px; height: 12px;"></i> ${tag}
                </span>
              `).join('')}
            </div>

          </div>

          <!-- CUERPO DE CONTENIDO REAL DEL APUNTE O PAYWALL -->
          ${isUnlocked ? `
            <div class="topic-markdown-body topic-rendered-content" id="topic-markdown-body">
              ${MarkdownParser.render(topic.content)}
            </div>

            <!-- TARJETA DE FINALIZACIÓN Y AVANCE DE ESTUDIO -->
            <div class="topic-completion-box" style="margin-top: 40px; padding: 24px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: space-between; gap: 20px;">
              <div>
                <h3 style="font-size: 1.05rem; margin-bottom: 4px; color: var(--text-main);">
                  ${isMastered ? '🎉 ¡Cédula Registrada como Dominada!' : '¿Comprendiste esta institución jurídica?'}
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
                  ${isMastered ? 'Tu porcentaje de avance para el grado ha sido actualizado.' : 'Márcala para sumar puntos a tu porcentaje de estudio y registrar tu avance en el temario.'}
                </p>
              </div>
              <button id="btn-bottom-mastery" class="btn ${isMastered ? 'btn-secondary' : 'btn-primary'}" style="flex-shrink: 0;">
                <i data-lucide="${isMastered ? 'rotate-ccw' : 'check'}"></i>
                <span>${isMastered ? 'Marcar para Repasar' : 'Completar Cédula (+ %)'}</span>
              </button>
            </div>
          ` : `
            <div class="paywall-container">
              <div class="paywall-icon-wrap">
                <i data-lucide="lock"></i>
              </div>
              <h2 class="paywall-title">Cédula Exclusiva: Pase de Grado</h2>
              <p class="paywall-subtitle">
                Estás en <strong>Modo Demo</strong>. Para acceder a la preparación completa de esta institución jurídica, sus casos correlativos y el análisis dogmático de examen de grado, activa tu pase.
              </p>

              <div class="paywall-features-list">
                <div class="paywall-feature-item">
                  <i data-lucide="check-circle-2"></i>
                  <span>Acceso ilimitado a las 57 cédulas oficiales de Civil, Procesal y Constitucional.</span>
                </div>
                <div class="paywall-feature-item">
                  <i data-lucide="check-circle-2"></i>
                  <span>Taller metodológico con soluciones modelo de grado en 4 dimensiones.</span>
                </div>
                <div class="paywall-feature-item">
                  <i data-lucide="check-circle-2"></i>
                  <span>Grafo interactivo de conexiones entre ramas del derecho.</span>
                </div>
              </div>

              <div class="paywall-activation-box">
                <div class="activation-input-row">
                  <input type="text" id="inline-license-code" placeholder="Pega aquí tu código de activación..." autocomplete="off">
                  <button id="btn-inline-activate" class="btn btn-primary">
                    <i data-lucide="unlock"></i>
                    <span>Activar</span>
                  </button>
                </div>
              </div>

              <a href="https://wa.me/?text=Hola!%20Deseo%20adquirir%20el%20Pase%20de%20Grado%20para%20desbloquear%20la%20plataforma." target="_blank" class="btn-whatsapp-buy">
                <i data-lucide="message-circle"></i>
                <span>Solicitar mi Pase de Grado por WhatsApp</span>
              </a>
            </div>
          `}

        </article>

        <!-- PANEL LATERAL DERECHO: CONEXIONES Y CASOS -->
        <aside class="topic-aside-col">
          
          <!-- Instituciones Relacionadas con Análisis de IA -->
          <div class="aside-block-section">
            <div class="aside-section-title">
              <i data-lucide="git-merge"></i>
              <span>Instituciones Relacionadas</span>
              <span class="aside-count-badge">${displayConnections.length}</span>
            </div>
            <p class="aside-section-subtitle">Explicación dogmática y aplicación práctica en examen:</p>
            <div class="linked-items-list">
              ${displayConnections.map(conn => `
                <div class="linked-connection-card ${conn.subject}" data-topic-id="${conn.id}" title="Clic para estudiar esta institución vinculada">
                  <div class="connection-header">
                    <div class="connection-badges-row">
                      <span class="connection-crossover-badge">${conn.crossoverType}</span>
                      <span class="connection-subject-badge ${conn.subject}">
                        ${conn.subject === 'civil' ? 'Civil' : conn.subject === 'procesal' ? 'Procesal' : 'Constitucional'}
                      </span>
                    </div>
                    <h4 class="connection-target-title">${conn.title}</h4>
                  </div>

                  <div class="connection-content-body">
                    <!-- ¿Por qué se conectan? -->
                    <div class="connection-callout reason-box">
                      <div class="connection-callout-header">
                        <i data-lucide="lightbulb" class="callout-icon"></i>
                        <span>¿Por qué se conectan?</span>
                      </div>
                      <p class="connection-callout-text">${conn.whyConnected}</p>
                    </div>

                    <!-- Aplicación en el Grado / Casos -->
                    <div class="connection-callout app-box">
                      <div class="connection-callout-header">
                        <i data-lucide="scale" class="callout-icon"></i>
                        <span>Aplicación en el Grado / Casos:</span>
                      </div>
                      <p class="connection-callout-text">${conn.practicalApplication}</p>
                    </div>
                  </div>

                  <div class="connection-action-footer">
                    <span>Estudiar cédula vinculada</span>
                    <i data-lucide="arrow-right" class="footer-arrow-icon"></i>
                  </div>
                </div>
              `).join('')}
              ${displayConnections.length === 0 ? `<p class="text-muted" style="font-size: 0.78rem;">No hay temas relacionados directos.</p>` : ''}
            </div>
          </div>

          <!-- Casos Prácticos Aplicables -->
          <div>
            <div class="aside-section-title">
              <i data-lucide="briefcase"></i>
              <span>Casos Prácticos Vinculados</span>
            </div>
            <div class="linked-items-list">
              ${linkedCases.map(lc => `
                <div class="linked-case-card" data-case-id="${lc.id}">
                  <div class="linked-case-title">${lc.title}</div>
                  <p class="linked-case-desc">${lc.summary || lc.facts}</p>
                  <div class="linked-case-cta">
                    <span>Resolver en taller</span>
                    <i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
                  </div>
                </div>
              `).join('')}
              ${linkedCases.length === 0 ? `<p class="text-muted" style="font-size: 0.78rem;">No hay casos para esta materia aún.</p>` : ''}
            </div>
          </div>

        </aside>

      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Evento toggle mastery (cabecera y pie de página)
    const handleMasteryClick = () => {
      const result = StorageService.toggleTopicMastery(topic.id);
      this.renderSidebar();
      this.renderTopicViewer();
      this.showToast(result.isMastered ? "🎉 ¡Cédula dominada! Tu % de estudio ha subido." : "Cédula marcada para repasar.", "success");
    };

    container.querySelector('#btn-toggle-mastery')?.addEventListener('click', handleMasteryClick);
    container.querySelector('#btn-bottom-mastery')?.addEventListener('click', handleMasteryClick);

    // Evento activación inline desde la tarjeta de paywall
    container.querySelector('#btn-inline-activate')?.addEventListener('click', () => {
      const code = container.querySelector('#inline-license-code')?.value || '';
      this.processActivation(code);
    });

    // Clic en enlaces wikilinks ([[Concepto]])
    container.querySelectorAll('.wikilink').forEach(link => {
      link.addEventListener('click', () => {
        const target = link.dataset.wikilink;
        this.handleWikilinkClick(target);
      });
    });

    // Clic en instituciones y temas relacionados
    container.querySelectorAll('.linked-connection-card, .linked-topic-card').forEach(card => {
      card.addEventListener('click', () => {
        const topicId = card.dataset.topicId;
        if (topicId) {
          this.currentTopicId = topicId;
          this.renderSidebar();
          this.renderTopicViewer();
          const viewerContainer = document.querySelector('.main-content-scroll') || window;
          viewerContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Clic en casos vinculados
    container.querySelectorAll('.linked-case-card').forEach(card => {
      card.addEventListener('click', () => {
        const caseId = card.dataset.caseId;
        this.switchView('cases');
        CaseSolver.selectCase(caseId);
      });
    });
  },

  handleWikilinkClick(term) {
    const data = StorageService.getData();
    const cleanTerm = term.toLowerCase().trim();

    // 1. Buscar coincidencia exacta o parcial en títulos de temas
    const foundTopic = data.topics.find(t => 
      t.title.toLowerCase().includes(cleanTerm) || 
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(cleanTerm)))
    );

    if (foundTopic) {
      this.currentTopicId = foundTopic.id;
      this.renderSidebar();
      this.renderTopicViewer();
      this.showToast(`Navegando a: ${foundTopic.title}`, "info");
      return;
    }

    // 2. Si no es un tema, buscar en el grafo
    this.switchView('graph');
    setTimeout(() => {
      const node = ConceptGraph.nodes.find(n => n.label.toLowerCase().includes(cleanTerm));
      if (node) {
        ConceptGraph.selectNode(node);
      }
    }, 200);
  },

  // 5. BÚSQUEDA GLOBAL (Ctrl + K)
  setupGlobalSearch() {
    const input = document.getElementById("global-search-input");
    const dropdown = document.getElementById("search-results-dropdown");
    if (!input || !dropdown) return;

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        dropdown.classList.add("hidden");
        return;
      }

      const data = StorageService.getData();
      const matchedTopics = data.topics.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      ).slice(0, 5);

      const matchedCases = (data.cases || []).filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.facts.toLowerCase().includes(q) ||
        (c.methodology && c.methodology.legalBasis && c.methodology.legalBasis.some(b => b.toLowerCase().includes(q)))
      ).slice(0, 3);

      if (matchedTopics.length === 0 && matchedCases.length === 0) {
        dropdown.innerHTML = `<div style="padding: 12px; font-size: 0.8rem; color: var(--text-muted); text-align: center;">No se encontraron resultados para "${escapeHTML(q)}"</div>`;
        dropdown.classList.remove("hidden");
        return;
      }

      dropdown.innerHTML = `
        ${matchedTopics.length > 0 ? `
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--gold-primary); padding: 4px 8px; text-transform: uppercase;">Temas del Temario</div>
          ${matchedTopics.map(t => `
            <div class="search-result-item" data-search-type="topic" data-id="${t.id}">
              <div class="search-result-title">${t.title}</div>
              <div class="search-result-meta">
                <span>Derecho ${t.subject}</span> · <span>${t.category}</span>
              </div>
            </div>
          `).join('')}
        ` : ''}

        ${matchedCases.length > 0 ? `
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--gold-primary); padding: 8px 8px 4px 8px; text-transform: uppercase; border-top: 1px solid var(--border-subtle); margin-top: 4px;">Casos Prácticos</div>
          ${matchedCases.map(c => `
            <div class="search-result-item" data-search-type="case" data-id="${c.id}">
              <div class="search-result-title">${c.title}</div>
              <div class="search-result-meta">
                <span>${(c.subjects || []).join(', ')}</span> · <span>${c.difficulty || 'Grado'}</span>
              </div>
            </div>
          `).join('')}
        ` : ''}
      `;

      dropdown.classList.remove("hidden");

      // Clic en resultados de búsqueda
      dropdown.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const type = item.dataset.searchType;
          const id = item.dataset.id;
          dropdown.classList.add("hidden");
          input.value = "";

          if (type === "topic") {
            this.currentTopicId = id;
            this.switchView("topics");
            this.renderSidebar();
            this.renderTopicViewer();
          } else if (type === "case") {
            this.switchView("cases");
            CaseSolver.selectCase(id);
          }
        });
      });
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });
  },

  searchGlobal(query) {
    const input = document.getElementById("global-search-input");
    if (input) {
      input.value = query;
      input.dispatchEvent(new Event("input"));
      input.focus();
    }
  },

  // 6. MODAL DE IMPORTACIÓN / EXPORTACIÓN NOTEBOOKLM
  setupImportModal() {
    const modal = document.getElementById("import-modal");
    const btnOpen = document.getElementById("btn-open-import");
    const btnClose = document.getElementById("btn-close-import-modal");

    if (btnOpen) {
      btnOpen.addEventListener("click", () => this.openImportModal("paste"));
    }
    if (btnClose) {
      btnClose.addEventListener("click", () => this.closeImportModal());
    }

    // Modal Tabs
    modal?.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        modal.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const contentId = `tab-content-${tab.dataset.tab}`;
        document.getElementById(contentId)?.classList.add('active');
      });
    });

    // Drag & Drop de archivos de NotebookLM
    const dropZone = document.getElementById("drop-zone-notebooklm");
    const fileInput = document.getElementById("input-file-drop");

    if (dropZone && fileInput) {
      dropZone.addEventListener("click", () => fileInput.click());

      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
      });

      dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
      });

      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file) this.loadFileIntoForm(file);
      });

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) this.loadFileIntoForm(file);
      });
    }

    // Guardar tema(s) importado(s)
    document.getElementById("btn-save-imported-topic")?.addEventListener("click", () => {
      const subject = document.getElementById("import-subject").value;
      const categoryDefault = document.getElementById("import-category").value.trim() || "General";
      const titleDefault = document.getElementById("import-title").value.trim();
      const tagsStr = document.getElementById("import-tags").value.trim();
      const content = document.getElementById("import-markdown").value.trim();
      const autoSplit = document.getElementById("check-auto-split")?.checked;

      if (!content) {
        alert("Por favor ingresa o arrastra el contenido de tus notas de NotebookLM.");
        return;
      }

      const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(Boolean) : [];

      if (autoSplit) {
        // Analizar si contiene múltiples temas con encabezados # o ##
        const sections = this.splitMarkdownIntoTopics(content, subject, categoryDefault, tags);
        if (sections.length > 1) {
          sections.forEach(sec => StorageService.saveTopic(sec));
          this.currentTopicId = sections[0].id;
          this.closeImportModal();
          this.renderSidebar();
          this.renderTopicViewer();
          this.showToast(`¡Se detectaron e importaron ${sections.length} temas individuales con éxito!`, "success");
          this.clearImportForm();
          return;
        }
      }

      // Importar como tema único
      const singleTitle = titleDefault || this.extractFirstHeading(content) || "Nuevo Tema";
      const newTopic = {
        id: `topic-${Date.now()}`,
        subject,
        category: categoryDefault,
        title: singleTitle,
        tags,
        content
      };

      StorageService.saveTopic(newTopic);
      this.currentTopicId = newTopic.id;
      this.closeImportModal();
      this.renderSidebar();
      this.renderTopicViewer();
      this.showToast("¡Tema incorporado exitosamente al temario!", "success");
      this.clearImportForm();
    });

    // Exportar JSON
    document.getElementById("btn-export-json")?.addEventListener("click", () => {
      StorageService.exportToJsonFile();
      this.showToast("Copia de seguridad descargada", "success");
    });

    // Restaurar JSON
    document.getElementById("input-restore-json")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const ok = StorageService.restoreFromJsonString(event.target.result);
        if (ok) {
          this.showToast("¡Datos restaurados con éxito!", "success");
          this.closeImportModal();
          this.init();
        } else {
          alert("El archivo JSON seleccionado no tiene un formato válido de Estudio de Grado.");
        }
      };
      reader.readAsText(file);
    });

    // Reset Defaults
    document.getElementById("btn-reset-defaults")?.addEventListener("click", () => {
      if (confirm("¿Estás seguro de restablecer los datos a los valores iniciales de fábrica?")) {
        StorageService.resetToDefaults();
        this.init();
        this.closeImportModal();
        this.showToast("Datos restablecidos a los de grado iniciales", "info");
      }
    });

    // Renderizar lista de fuentes directas disponibles
    this.renderSourcesList();
  },

  loadFileIntoForm(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      document.getElementById("import-markdown").value = text;
      
      // Auto-rellenar título desde el nombre del archivo si está vacío
      const inputTitle = document.getElementById("import-title");
      if (!inputTitle.value) {
        const cleanName = file.name.replace(/\.(md|txt|markdown)$/i, "").replace(/[-_]/g, " ");
        inputTitle.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }

      // Auto-detectar materia según menciones en el texto
      const lower = text.toLowerCase();
      const selectSubject = document.getElementById("import-subject");
      if (lower.includes("código procesal civil") || lower.includes("cpc") || lower.includes("casación") || lower.includes("emplazamiento")) {
        selectSubject.value = "procesal";
      } else if (lower.includes("constitución") || lower.includes("cpr") || lower.includes("recurso de protección") || lower.includes("debido proceso")) {
        selectSubject.value = "constitucional";
      } else if (lower.includes("código civil") || lower.includes("contrato") || lower.includes("obligación") || lower.includes("acto jurídico")) {
        selectSubject.value = "civil";
      }

      this.showToast(`Archivo "${file.name}" cargado en el formulario`, "info");
    };
    reader.readAsText(file);
  },

  splitMarkdownIntoTopics(fullText, defaultSubject, defaultCategory, baseTags) {
    const lines = fullText.split("\n");
    const sections = [];
    let currentTitle = "";
    let currentLines = [];

    lines.forEach(line => {
      // Detectar encabezado de nivel 1 o 2 que funcione como título de cédula/tema
      const match = line.match(/^#{1,2}\s+(.+)$/);
      if (match) {
        if (currentTitle && currentLines.length > 0) {
          sections.push({
            id: `topic-${Date.now()}-${sections.length}`,
            subject: defaultSubject,
            category: defaultCategory,
            title: currentTitle,
            tags: [...baseTags],
            content: currentLines.join("\n").trim()
          });
        }
        currentTitle = match[1].trim();
        currentLines = [line];
      } else {
        currentLines.push(line);
      }
    });

    if (currentTitle && currentLines.length > 0) {
      sections.push({
        id: `topic-${Date.now()}-${sections.length}`,
        subject: defaultSubject,
        category: defaultCategory,
        title: currentTitle,
        tags: [...baseTags],
        content: currentLines.join("\n").trim()
      });
    }

    return sections;
  },

  extractFirstHeading(markdownText) {
    const match = markdownText.match(/^#{1,3}\s+(.+)$/m);
    return match ? match[1].trim() : "";
  },

  clearImportForm() {
    const titleInput = document.getElementById("import-title");
    const tagsInput = document.getElementById("import-tags");
    const contentInput = document.getElementById("import-markdown");
    if (titleInput) titleInput.value = "";
    if (tagsInput) tagsInput.value = "";
    if (contentInput) contentInput.value = "";
  },

  renderSourcesList() {
    const container = document.getElementById("sources-list-container");
    if (!container) return;

    const sources = [
      { name: "civil.md", subject: "Derecho Civil", desc: "Acto Jurídico, Bienes, Obligaciones, RCE y Contratos" },
      { name: "procesal.md", subject: "Derecho Procesal", desc: "Jurisdicción, Juicio Ordinario, Recursos y Congruencia" },
      { name: "constitucional.md", subject: "Derecho Constitucional", desc: "Bases, DD.FF., Recurso de Protección y Debido Proceso" }
    ];

    container.innerHTML = sources.map(s => `
      <div class="source-item-row">
        <div class="source-item-info">
          <i data-lucide="file-text" style="color: var(--gold-primary);"></i>
          <div>
            <div>${s.name} <span class="badge-count" style="font-size: 0.65rem; margin-left: 6px;">${s.subject}</span></div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${s.desc}</div>
          </div>
        </div>
        <span style="font-size: 0.75rem; color: var(--success); font-weight: 600;">Sincronizado</span>
      </div>
    `).join('');
  },

  openImportModal(tabName = "paste") {
    const modal = document.getElementById("import-modal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.querySelector(`[data-tab="${tabName}"]`)?.click();
    }
  },

  closeImportModal() {
    const modal = document.getElementById("import-modal");
    if (modal) {
      modal.classList.add("hidden");
    }
  },

  // 7. GESTIÓN DE LICENCIAS Y PANEL ADMINISTRADOR
  renderLicenseBadge() {
    const container = document.getElementById("license-badge-container");
    if (!container) return;

    const lic = LicenseService.getCurrentLicense();
    if (lic && !lic.expired) {
      const scopeLabel = lic.scope === 'all' ? 'Pase Completo' : `Derecho ${lic.scope}`;
      container.innerHTML = `
        <div class="license-status-badge unlocked" id="badge-license-active" title="Pase activo para ${escapeHTML(lic.studentName)}">
          <i data-lucide="crown"></i>
          <span>${scopeLabel} (${escapeHTML(lic.studentName)})</span>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="license-status-badge demo" id="btn-open-unlock-badge" title="Haz clic para ingresar tu código de activación">
          <i data-lucide="lock"></i>
          <span>Modo Demo (Activar Pase)</span>
        </button>
      `;
    }

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("btn-open-unlock-badge")?.addEventListener("click", () => {
      this.openUnlockModal();
    });
  },

  setupLicenseModals() {
    // Modal Desbloqueo Alumno
    const unlockModal = document.getElementById("unlock-modal");
    const btnCloseUnlock = document.getElementById("btn-close-unlock-modal");
    const btnSubmit = document.getElementById("btn-submit-license");

    btnCloseUnlock?.addEventListener("click", () => {
      unlockModal.classList.add("hidden");
    });

    btnSubmit?.addEventListener("click", () => {
      const code = document.getElementById("input-license-code")?.value || "";
      this.processActivation(code);
    });

    // Modal Administrador
    const adminModal = document.getElementById("admin-modal");
    const btnOpenAdmin = document.getElementById("btn-open-admin");
    const btnCloseAdmin = document.getElementById("btn-close-admin-modal");
    const btnAdminLogin = document.getElementById("btn-admin-login");
    const btnAdminLogout = document.getElementById("btn-admin-logout");
    const btnGenerate = document.getElementById("btn-generate-code");
    const adminPill = document.getElementById("admin-mode-pill");

    adminPill?.addEventListener("click", () => {
      adminModal.classList.remove("hidden");
      document.getElementById("admin-login-screen")?.classList.add("hidden");
      document.getElementById("admin-dashboard-screen")?.classList.remove("hidden");
      this.renderAdminCodesTable();
    });

    btnOpenAdmin?.addEventListener("click", () => {
      adminModal.classList.remove("hidden");
      if (LicenseService.isAdminMode()) {
        document.getElementById("admin-login-screen")?.classList.add("hidden");
        document.getElementById("admin-dashboard-screen")?.classList.remove("hidden");
        this.renderAdminCodesTable();
      } else {
        document.getElementById("admin-login-screen")?.classList.remove("hidden");
        document.getElementById("admin-dashboard-screen")?.classList.add("hidden");
        document.getElementById("admin-pin-input").value = "";
        document.getElementById("admin-login-error").style.display = "none";
      }
    });

    btnCloseAdmin?.addEventListener("click", () => {
      adminModal.classList.add("hidden");
    });

    btnAdminLogin?.addEventListener("click", () => {
      const pin = document.getElementById("admin-pin-input")?.value || "";
      if (pin === LicenseService.ADMIN_PIN) {
        LicenseService.setAdminMode(true);
        this.renderAdminIndicator();
        this.renderSidebar();
        if (this.currentView === "topics") {
          this.renderTopicViewer();
        }
        document.getElementById("admin-login-screen").classList.add("hidden");
        document.getElementById("admin-dashboard-screen").classList.remove("hidden");
        this.renderAdminCodesTable();
        this.showToast("👑 Modo Administrador activado: Tienes acceso total y visibilidad de desarrollo de apuntes.", "success");
      } else {
        document.getElementById("admin-login-error").style.display = "block";
      }
    });

    btnAdminLogout?.addEventListener("click", () => {
      LicenseService.setAdminMode(false);
      this.renderAdminIndicator();
      this.renderSidebar();
      if (this.currentView === "topics") {
        this.renderTopicViewer();
      }
      adminModal.classList.add("hidden");
      this.showToast("Modo Administrador cerrado. Ahora estás viendo la plataforma como un alumno.", "info");
    });

    btnGenerate?.addEventListener("click", () => {
      const studentName = document.getElementById("admin-student-name")?.value.trim() || "Alumno";
      const scope = document.getElementById("admin-scope-select")?.value;
      const days = document.getElementById("admin-days-select")?.value;

      const newLic = LicenseService.generateCode({ studentName, scope, days });
      this.renderAdminCodesTable();
      this.showToast(`¡Código ${newLic.code} generado! Cópialo para enviárselo a tu alumno.`, "success");
      document.getElementById("admin-student-name").value = "";
    });
  },

  renderAdminIndicator() {
    const pill = document.getElementById("admin-mode-pill");
    if (!pill) return;
    if (LicenseService.isAdminMode()) {
      pill.classList.remove("hidden");
    } else {
      pill.classList.add("hidden");
    }
  },

  renderAdminCodesTable() {
    const tbody = document.getElementById("admin-codes-tbody");
    if (!tbody) return;

    const list = LicenseService.getAllIssuedCodes();
    tbody.innerHTML = list.map(c => {
      const stStats = StorageService.calculateProgress(c.code, 'all');
      return `
      <tr style="${c.revoked ? 'opacity: 0.5; text-decoration: line-through;' : ''}">
        <td><span class="code-pill">${escapeHTML(c.code)}</span></td>
        <td>${escapeHTML(c.studentName || 'Sin asignar')}</td>
        <td><span class="badge-count" style="font-size: 0.65rem;">${c.scope}</span></td>
        <td>${c.days === 0 ? 'Perpetua' : `${c.days} días`}</td>
        <td>
          <span style="font-weight: 700; color: var(--gold-primary);">${stStats.percent}%</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">(${stStats.mastered}/${stStats.total})</span>
        </td>
        <td>
          <button class="btn-copy-code" data-copy-code="${c.code}" title="Copiar al portapapeles">
            <i data-lucide="copy" style="width: 12px; height: 12px; vertical-align: middle;"></i> Copiar
          </button>
          ${!c.revoked ? `
            <button class="btn-copy-code" data-revoke-code="${c.code}" style="color: var(--danger);" title="Revocar código">
              Revocar
            </button>
          ` : ''}
        </td>
      </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Eventos de copia
    tbody.querySelectorAll('[data-copy-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.copyCode;
        navigator.clipboard.writeText(code);
        this.showToast(`Código ${code} copiado al portapapeles`, "info");
      });
    });

    // Eventos de revocación
    tbody.querySelectorAll('[data-revoke-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.revokeCode;
        if (confirm(`¿Estás seguro de revocar la licencia ${code}?`)) {
          LicenseService.revokeCode(code);
          this.renderAdminCodesTable();
          this.showToast(`Licencia ${code} revocada`, "info");
        }
      });
    });
  },

  openUnlockModal() {
    const modal = document.getElementById("unlock-modal");
    if (modal) {
      modal.classList.remove("hidden");
      document.getElementById("input-license-code")?.focus();
      document.getElementById("license-error-msg").style.display = "none";
    }
  },

  processActivation(code) {
    if (!code) {
      alert("Por favor ingresa un código de activación.");
      return;
    }

    const result = LicenseService.activateCode(code);
    if (result.success) {
      document.getElementById("unlock-modal")?.classList.add("hidden");
      this.renderLicenseBadge();
      this.renderSidebar();
      this.renderTopicViewer();
      this.updateCaseBadge();
      if (this.currentView === "cases") {
        CaseSolver.render();
      }
      this.showToast(`¡Felicitaciones! Has desbloqueado el temario (${result.license.studentName})`, "success");
    } else {
      const errMsg = document.getElementById("license-error-msg");
      if (errMsg) {
        errMsg.textContent = result.error;
        errMsg.style.display = "block";
      } else {
        alert(result.error);
      }
    }
  },

  // 8. ATAJOS DE TECLADO
  setupKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Ctrl + K para buscador
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("global-search-input");
        if (input) {
          input.focus();
          input.select();
        }
      }
      // Esc para cerrar modal
      if (e.key === "Escape") {
        this.closeImportModal();
        document.getElementById("search-results-dropdown")?.classList.add("hidden");
      }
    });
  },

  // 8. UTILIDADES
  updateCaseBadge() {
    const data = StorageService.getData();
    const count = (data.cases || []).length;
    const badge = document.getElementById("case-count-badge");
    if (badge) badge.textContent = count;
  },

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : 'info'}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Arrancar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
