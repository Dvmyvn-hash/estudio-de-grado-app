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

  openUnlockModal() {
    const modal = document.getElementById("unlock-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    this.updateUnlockModalState();
    if (window.lucide) window.lucide.createIcons();
  },

  updateUnlockModalState() {
    const modal = document.getElementById("unlock-modal");
    if (!modal) return;

    const stepLogin = document.getElementById("unlock-step-login");
    const stepConvalidate = document.getElementById("unlock-step-convalidate");
    const stepActive = document.getElementById("unlock-step-active");
    const modalTitle = document.getElementById("unlock-modal-title");
    const modalSubtitle = document.getElementById("unlock-modal-subtitle");
    const headerIcon = document.getElementById("unlock-modal-header-icon");
    const errorMsg = document.getElementById("license-error-msg");

    if (errorMsg) {
      errorMsg.style.display = "none";
      errorMsg.textContent = "";
    }

    const user = typeof AuthService !== "undefined" ? AuthService.currentUser : null;
    const lic = typeof LicenseService !== "undefined" ? LicenseService.getCurrentLicense() : null;
    const isConvalidated = lic && !lic.expired && (!user || !user.isDemo || user.access_code);

    if (!user) {
      // 1. SIN SESIÓN: Mostrar Paso 1 (Registro / Login con Correo + Contraseña + Captcha)
      if (stepLogin) stepLogin.classList.remove("hidden");
      if (stepConvalidate) stepConvalidate.classList.add("hidden");
      if (stepActive) stepActive.classList.add("hidden");

      if (modalTitle) modalTitle.textContent = "Activar Pase de Grado";
      if (modalSubtitle) modalSubtitle.textContent = "Paso 1: Identifícate con tu correo y contraseña";
      if (headerIcon) headerIcon.setAttribute("data-lucide", "lock");

      if (typeof AuthService !== "undefined") {
        if (AuthService.setAuthMode) {
          AuthService.setAuthMode(AuthService.authMode || "register");
        }
        if (AuthService.initTurnstile) {
          AuthService.initTurnstile();
        }
      }
    } else if (!isConvalidated) {
      // 2. SESIÓN EN VERSIÓN DEMO: Mostrar Paso 2 (Convalidar Cuenta con Código)
      if (stepLogin) stepLogin.classList.add("hidden");
      if (stepConvalidate) stepConvalidate.classList.remove("hidden");
      if (stepActive) stepActive.classList.add("hidden");

      if (modalTitle) modalTitle.textContent = "Convalidar Cuenta";
      if (modalSubtitle) modalSubtitle.textContent = "Paso 2: Convalida tu cuenta para activar el Pase de Grado";
      if (headerIcon) headerIcon.setAttribute("data-lucide", "key-round");

      const nameEl = document.getElementById("unlock-user-name");
      const emailEl = document.getElementById("unlock-user-email");
      const avatarEl = document.getElementById("unlock-user-avatar");
      const placeholderEl = document.getElementById("unlock-user-avatar-placeholder");

      const safeName = user.name || (user.email ? user.email.split("@")[0] : "Estudiante");
      const safeEmail = user.email || "";

      if (nameEl) nameEl.textContent = safeName;
      if (emailEl) emailEl.textContent = safeEmail;

      if (avatarEl) avatarEl.style.display = "none";
      if (placeholderEl) placeholderEl.style.display = "flex";

      const inputCode = document.getElementById("input-license-code");
      if (inputCode) {
        setTimeout(() => inputCode.focus(), 150);
      }
    } else {
      // 3. CUENTA YA CONVALIDADA / PASE ACTIVO
      if (stepLogin) stepLogin.classList.add("hidden");
      if (stepConvalidate) stepConvalidate.classList.add("hidden");
      if (stepActive) stepActive.classList.remove("hidden");

      if (modalTitle) modalTitle.textContent = "Pase de Grado Activo";
      if (modalSubtitle) modalSubtitle.textContent = "Tu cuenta está convalidada con acceso completo";
      if (headerIcon) headerIcon.setAttribute("data-lucide", "crown");

      const nameEl = document.getElementById("unlock-active-name");
      const emailEl = document.getElementById("unlock-active-email");
      const avatarEl = document.getElementById("unlock-active-avatar");
      const placeholderEl = document.getElementById("unlock-active-avatar-placeholder");
      const scopeTitleEl = document.getElementById("unlock-active-scope-title");

      const safeName = (lic && lic.studentName) || user.name || "Estudiante de Grado";
      const safeEmail = user.email || "";

      if (nameEl) nameEl.textContent = safeName;
      if (emailEl) emailEl.textContent = safeEmail;

      if (avatarEl) avatarEl.style.display = "none";
      if (placeholderEl) placeholderEl.style.display = "flex";

      if (scopeTitleEl) {
        scopeTitleEl.textContent = (lic && lic.scope === "all") ? "Pase de Grado Completo" : `Pase de Derecho ${lic ? lic.scope : "Completo"}`;
      }
    }

    if (window.lucide) window.lucide.createIcons();
  },

  async processActivation(code) {
    if (!code || !code.trim()) {
      const errMsg = document.getElementById("license-error-msg");
      if (errMsg) {
        errMsg.textContent = "Por favor ingresa un código de activación.";
        errMsg.style.display = "block";
      }
      return;
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Si no hay sesión iniciada, guiar al usuario a identificarse primero
    if (!AuthService.currentUser || !AuthService.currentUser.email) {
      this.openUnlockModal();
      this.showToast("Primero debes identificarte para convalidar tu cuenta.", "warning");
      return;
    }

    const btnSubmit = document.getElementById("btn-submit-license");
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span>Convalidando...</span>';
    }

    // 2. Convalidar y vincular código a la cuenta activa
    const res = await AuthService.convalidateAccount(cleanCode);

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i data-lucide="check-circle"></i><span>Convalidar Cuenta</span>';
      if (window.lucide) window.lucide.createIcons();
    }

    if (res && res.ok) {
      document.getElementById("unlock-modal")?.classList.add("hidden");
      this.renderLicenseBadge();
      this.renderAdminIndicator();
      this.renderSidebar();
      this.renderTopicViewer();
      this.updateCaseBadge();
      if (this.currentView === "cases") {
        CaseSolver.render();
      }
      const safeEmail = AuthService.currentUser.email;
      this.showToast(`¡Cuenta ${safeEmail} convalidada con éxito! Pase de Grado activado.`, "success");
    } else {
      const errMsg = document.getElementById("license-error-msg");
      if (errMsg) {
        errMsg.textContent = (res && res.error) || "Código de activación inválido o expirado.";
        errMsg.style.display = "block";
      } else {
        alert((res && res.error) || "Código no válido.");
      }
    }
  },

  init() {
    console.log("Inicializando GRADOMANIACOS...");
    this.setupTheme();
    this.setupNavigation();
    this.setupSidebar();
    this.setupGlobalSearch();
    this.setupVaultSearch();
    this.setupImportModal();
    this.setupProgressBackup();
    this.setupKeyboardShortcuts();

    // Sincronizar fuentes doctrinales y apuntes oficiales en el agente generador de casos
    if (typeof CaseGeneratorAgent !== "undefined") {
      if (typeof CaseGeneratorAgent.syncFuentesFromServer === "function") {
        CaseGeneratorAgent.syncFuentesFromServer();
      }
      if (typeof CaseGeneratorAgent.syncApuntesFromServer === "function") {
        CaseGeneratorAgent.syncApuntesFromServer();
      }
    }

    // Inicializar autenticación con Google y códigos de invitación
    if (typeof AuthService !== "undefined" && typeof AuthService.init === "function") {
      AuthService.init();
      AuthService.onAuthStateChanged(() => {
        this.renderLicenseBadge();
        this.renderAdminIndicator();
        this.renderSidebar();
        this.renderTopicViewer();
        if (typeof this.updateUnlockModalState === "function") {
          this.updateUnlockModalState();
        }
        // Al cambiar la sesión (login/logout) reconciliar el avance con el servidor de forma determinista
        this.pullMasteryProgress();
      });
    }

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
    if (window.innerWidth <= 1024) {
      const sidebar = document.getElementById("app-sidebar");
      if (sidebar) sidebar.classList.add("collapsed");
    }
    this.renderSidebar();
    this.renderCurrentView();

    // Iniciar Sincronizador Automático en Tiempo Real
    this.startLiveSync();

    // Renderizar iconos de Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // 0. AUTO-SINCRONIZACIÓN EN TIEMPO REAL CON ARCHIVOS DE FUENTE / MODO ESTÁTICO GITHUB PAGES
  lastSyncVersion: null,
  isSyncing: false,
  syncErrorsCount: 0,
  syncIntervalId: null,
  _isPullingMastery: false,

  startLiveSync() {
    const badge = document.getElementById("live-sync-badge");
    const isGitHubPages = window.location.hostname.endsWith("github.io");
    const isFileProtocol = window.location.protocol === "file:";

    // En entornos estáticos sin backend Python (GitHub Pages o archivo local)
    if (isGitHubPages || isFileProtocol) {
      if (badge) {
        badge.title = "Plataforma autónoma activa: Todo el temario, casos dogmáticos y grafo operan 100% en tu navegador.";
        const dot = badge.querySelector(".live-dot");
        const text = badge.querySelector(".live-text");
        if (dot) {
          dot.style.background = "#10b981";
          dot.style.boxShadow = "0 0 8px rgba(16, 185, 129, 0.6)";
        }
        if (text) text.textContent = "Web Activa";
      }
      return;
    }

    // Comprobar si hay cambios en servidor local con Python
    const check = async () => {
      try {
        const res = await fetch("/api/sync-check");
        if (res.ok) {
          const data = await res.json();
          this.syncErrorsCount = 0;
          if (this.lastSyncVersion === null) {
            this.lastSyncVersion = data.version;
          } else if (this.lastSyncVersion !== data.version) {
            this.lastSyncVersion = data.version;
            await this.syncWithServer();
          }
        } else {
          this.syncErrorsCount++;
          if (this.syncErrorsCount >= 2) {
            // Servidor estático sin endpoints API
            if (this.syncIntervalId) clearInterval(this.syncIntervalId);
            if (badge) {
              badge.title = "Modo Web Estático: Temario y casos cargados localmente.";
              const text = badge.querySelector(".live-text");
              if (text) text.textContent = "Web Activa";
            }
          }
        }
      } catch (e) {
        this.syncErrorsCount++;
        if (this.syncErrorsCount >= 2) {
          if (this.syncIntervalId) clearInterval(this.syncIntervalId);
          if (badge) {
            badge.title = "Modo Autónomo: Datos almacenados en el navegador.";
            const text = badge.querySelector(".live-text");
            if (text) text.textContent = "Web Activa";
          }
        }
      }
    };

    check();
    this.syncIntervalId = setInterval(check, 3500);

    // Arranque: sincronizar el avance de cédulas dominadas con el servidor (LWW por cédula, v7.12)
    this.pullMasteryProgress();
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
          
          // Indexar estados de 'mastered' del cliente (por id y por clave natural para soportar migraciones de ID)
          const masteredIdSet = new Set();
          const masteredKeySet = new Set();

          (localData.topics || []).forEach(t => {
            if (t.mastered || (StorageService.isTopicMasteredByUser && StorageService.isTopicMasteredByUser(t.id))) {
              masteredIdSet.add(t.id);
              masteredKeySet.add(`${t.subject}-${t.chapterNumber}-${t.code}`);
            }
          });

          // Deduplicar serverTopics por clave natural (subject, chapterNumber, code)
          const dedupedServerTopicsMap = new Map();
          serverTopics.forEach(st => {
            const key = `${st.subject || 'civil'}-${st.chapterNumber || 1}-${st.code || '1.1'}`;
            const isMastered = masteredIdSet.has(st.id) || masteredKeySet.has(key);
            if (!dedupedServerTopicsMap.has(key)) {
              dedupedServerTopicsMap.set(key, { ...st, mastered: isMastered });
            } else {
              const existing = dedupedServerTopicsMap.get(key);
              dedupedServerTopicsMap.set(key, { ...st, mastered: existing.mastered || isMastered });
            }
          });

          // Reemplazar localData.topics con el conjunto canónico del servidor (purgando tópicos huérfanos o duplicados)
          localData.topics = Array.from(dedupedServerTopicsMap.values());
          StorageService.saveData(localData);

          // Invalidar y re-sincronizar apuntes en el agente generador de casos
          if (typeof CaseGeneratorAgent !== "undefined") {
            if (typeof CaseGeneratorAgent.invalidateApuntes === "function") {
              CaseGeneratorAgent.invalidateApuntes();
            }
            if (typeof CaseGeneratorAgent.syncApuntesFromServer === "function") {
              CaseGeneratorAgent.syncApuntesFromServer();
            }
          }

          this.renderSidebar();
          if (this.currentView === "topics") {
            this.renderTopicViewer();
          }

          this.showToast(`¡Contenidos actualizados automáticamente (${serverTopics.length} cédulas sincronizadas)!`, "success");
        }
      }

      // Sincronizar Casos Prácticos generados por IA (modelos de entrenamiento permanecen confidenciales en servidor)
      try {
        const resCases = await fetch("/api/sync-cases");
        if (resCases.ok) {
          const casesData = await resCases.json();
          const serverCases = (casesData.cases || []).filter(c => c.isGeneratedByAI || (c.id && c.id.startsWith("caso-ia-")));
          const localData = StorageService.getData();
          
          // Actualizar lista local reteniendo exclusivamente casos de práctica IA
          const existingMap = new Map((localData.cases || []).filter(c => c.isGeneratedByAI || (c.id && c.id.startsWith("caso-ia-"))).map(c => [c.id, c]));
          serverCases.forEach(sc => existingMap.set(sc.id, { ...(existingMap.get(sc.id) || {}), ...sc }));
          
          localData.cases = Array.from(existingMap.values());
          StorageService.saveData(localData);

          if (this.currentView === "cases") {
            CaseSolver.render();
          }
        }
      } catch (ce) {
        console.warn("Error sincronizando casos IA:", ce);
      }
    } catch (e) {
      console.warn("Error en auto-sync:", e);
    } finally {
      this.isSyncing = false;
      if (badge) badge.classList.remove("syncing");

      // Tras cada sincronización de contenidos, reconciliar avance de cédulas con el servidor
      // (no bloqueante; LWW por cédula; guard de re-entrancia interno)
      this.pullMasteryProgress();
    }
  },

  // Sincroniza el avance de cédulas dominadas con el servidor (LWW por cédula).
  // Solo refresca la UI y notifica si hubo cambios reales aplicados desde el servidor.
  async pullMasteryProgress() {
    if (this._isPullingMastery) return;
    this._isPullingMastery = true;
    try {
      const res = await StorageService.pullMasteryFromServer();
      if (res && res.changed) {
        this.renderSidebar();
        if (this.currentView === "topics") {
          this.renderTopicViewer();
        }
        this.showToast("🔄 Progreso sincronizado con tus otros dispositivos", "success");
      }
      return res;
    } catch (e) {
      console.warn("Error sincronizando avance de cédulas:", e);
      return { changed: false, reason: "client-error" };
    } finally {
      this._isPullingMastery = false;
    }
  },

  // 1. GESTIÓN DE TEMA (Dark Academy inmutable)
  setupTheme() {
    document.documentElement.setAttribute("data-theme", "dark");
    try {
      localStorage.removeItem("theme_preference");
    } catch (e) {}
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

    // Toggle sidebar & móvil drawer
    const btnSidebar = document.getElementById("btn-toggle-sidebar");
    const sidebar = document.getElementById("app-sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const btnCloseSidebarMobile = document.getElementById("btn-close-sidebar-mobile");

    const closeSidebarMobile = () => {
      if (sidebar) sidebar.classList.add("collapsed");
      if (sidebarBackdrop) sidebarBackdrop.classList.add("hidden");
    };

    const openSidebarMobile = () => {
      if (sidebar) sidebar.classList.remove("collapsed");
      if (sidebarBackdrop && window.innerWidth <= 1024) {
        sidebarBackdrop.classList.remove("hidden");
      }
    };

    if (btnSidebar && sidebar) {
      btnSidebar.addEventListener("click", () => {
        // En vistas distintas a 'topics' la barra lateral está restringida
        if (this.currentView !== "topics") return;

        const isCollapsed = sidebar.classList.contains("collapsed");
        if (isCollapsed) {
          openSidebarMobile();
        } else {
          closeSidebarMobile();
        }
        this.sidebarHiddenByView = false;
        if (this.currentView === "graph") {
          setTimeout(() => {
            ConceptGraph.resizeCanvas();
            ConceptGraph.setupData();
          }, 300);
        }
      });
    }

    if (btnCloseSidebarMobile) {
      btnCloseSidebarMobile.addEventListener("click", () => {
        closeSidebarMobile();
        this.sidebarHiddenByView = false;
      });
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener("click", () => {
        closeSidebarMobile();
        this.sidebarHiddenByView = false;
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

    // Gateo de Barra Lateral: el índice es exclusivo de la vista de Apuntes (topics)
    const sidebar = document.getElementById("app-sidebar");
    const btnSidebar = document.getElementById("btn-toggle-sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");

    if (viewName === "topics") {
      // Restaurar índice si fue ocultado por gateo de vista
      if (sidebar && this.sidebarHiddenByView) {
        sidebar.classList.remove("collapsed");
        this.sidebarHiddenByView = false;
      }
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.add("hidden");
      }
      if (btnSidebar) {
        btnSidebar.classList.remove("hidden");
        btnSidebar.removeAttribute("aria-hidden");
        btnSidebar.disabled = false;
        btnSidebar.style.display = "";
      }
    } else {
      // Ocultar y restringir índice en vistas Casos y Grafo
      if (sidebar && !sidebar.classList.contains("collapsed")) {
        sidebar.classList.add("collapsed");
        this.sidebarHiddenByView = true;
      }
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.add("hidden");
      }
      if (btnSidebar) {
        btnSidebar.classList.add("hidden");
        btnSidebar.setAttribute("aria-hidden", "true");
        btnSidebar.disabled = true;
        btnSidebar.style.display = "none";
      }
    }

    this.renderCurrentView();
  },

  openTopic(topicId) {
    if (!topicId) return;
    this.currentTopicId = topicId;
    this.renderSidebar();
    if (this.currentView !== 'topics') {
      this.switchView('topics');
    } else {
      this.renderTopicViewer();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderCurrentView() {
    if (this.currentView === "topics") {
      this.renderTopicViewer();
    } else if (this.currentView === "cases") {
      if (typeof CaseGeneratorAgent !== "undefined" && (!CaseGeneratorAgent.APUNTES_INDEX || CaseGeneratorAgent.APUNTES_INDEX.length === 0)) {
        if (typeof CaseGeneratorAgent.syncApuntesFromServer === "function") {
          CaseGeneratorAgent.syncApuntesFromServer();
        }
      }
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

  _isRenderingSidebar: false,

  renderSidebar() {
    if (this._isRenderingSidebar) return;
    this._isRenderingSidebar = true;

    try {
      const data = StorageService.getData();
      
      // Deduplicación defensiva en capa de presentación (clave natural: subject, chapterNumber, code)
      const dedupedTopicsMap = new Map();
      (data.topics || []).forEach(t => {
        const key = `${t.subject || 'civil'}-${t.chapterNumber || 1}-${t.code || '1.1'}`;
        if (!dedupedTopicsMap.has(key)) {
          dedupedTopicsMap.set(key, t);
        }
      });
      const topics = Array.from(dedupedTopicsMap.values());

      const container = document.getElementById("topics-tree-container");
      if (!container) return;

    const isAdmin = LicenseService.isAdminMode();

    // Sincronizar controles y visibilidad de roles
    this.renderAdminIndicator();

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

      // Ordenar capítulos por temario canónico (min indexCode del bloque), no por chapterNumber.
      // Fundamento v7.19.1: el orden dogmático exige Discusión (cap 6-12) → Prueba (cap 3-5) → Sentencia (cap 13).
      // Ordenar por chapterNumber numérico rompería ese orden y mostraría La Prueba antes que Mayor Cuantía.
      const sortedChapters = Array.from(chapterMap.entries()).sort((a, b) => {
        const parseIdx = (c) => {
          const parts = (c || "").split(".").map(p => parseInt(p, 10) || 0);
          return (parts[0] || 0) * 1000 + (parts[1] || 0);
        };
        const minA = Math.min(...a[1].topics.map(t => parseIdx(t.indexCode || t.code)));
        const minB = Math.min(...b[1].topics.map(t => parseIdx(t.indexCode || t.code)));
        if (minA !== minB) return minA - minB;
        return (a[1].num || 0) - (b[1].num || 0);
      });

      sortedChapters.forEach(([chapTitle, chapData]) => {
        const chapterTopics = chapData.topics;
        
        // Ordenar cédulas prioritariamente por indexCode (1.1, 1.2, etc.) y fallback a code
        chapterTopics.sort((a, b) => {
          const parseCode = (c) => {
            const parts = (c || "").split(".").map(p => parseInt(p, 10) || 0);
            return (parts[0] || 0) * 1000 + (parts[1] || 0);
          };
          const codeA = a.indexCode || a.code;
          const codeB = b.indexCode || b.code;
          return parseCode(codeA) - parseCode(codeB);
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
                const displayCode = t.indexCode || t.code;
                const safeDisplayCode = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(displayCode || '') : (displayCode || '');
                const safeCleanTitle = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(cleanTitle || '') : (cleanTitle || '');
                const tooltipText = t.indexCode 
                  ? `Cédula ${t.indexCode} · Sección ${t.code || ''} (${t.sourceFile || ''})`
                  : (t.title || '');
                const safeTooltip = typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(tooltipText) : tooltipText;

                return `
                <li class="topic-tree-item ${this.currentTopicId === t.id ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}" data-topic-id="${t.id}" title="${safeTooltip}">
                  <div class="topic-item-left">
                    <span class="cedula-code-badge">${displayCode ? '§ ' + safeDisplayCode : '·'}</span>
                    <span class="topic-title-text">${safeCleanTitle}</span>
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

    if (typeof container.replaceChildren === "function") {
      const tempWrapper = document.createElement("div");
      tempWrapper.innerHTML = html;
      container.replaceChildren(...tempWrapper.childNodes);
    } else {
      container.innerHTML = html;
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Eventos de selección de tema
    container.querySelectorAll('.topic-tree-item').forEach(item => {
      item.addEventListener('click', () => {
        this.currentTopicId = item.dataset.topicId;
        this.renderSidebar();
        if (window.innerWidth <= 1024) {
          const sidebar = document.getElementById("app-sidebar");
          const backdrop = document.getElementById("sidebar-backdrop");
          if (sidebar) sidebar.classList.add("collapsed");
          if (backdrop) backdrop.classList.add("hidden");
        }
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
    } finally {
      this._isRenderingSidebar = false;
    }
  },

  // 4. VISOR DE APUNTES (TOPIC VIEWER)
  renderTopicViewer() {
    const container = document.getElementById("view-topics");
    if (!container) return;

    const data = StorageService.getData();
    const topic = data.topics.find(t => t.id === this.currentTopicId) || data.topics[0];

    if (!topic) {
      const canManage = LicenseService.canManageNotes();
      container.innerHTML = `<div class="empty-state-wrap" style="padding: 60px; text-align: center;">
        <h2>No hay temas seleccionados</h2>
        <p class="text-muted">${canManage ? 'Importa tus apuntes de NotebookLM o sincroniza con el temario oficial.' : 'Selecciona una cédula del índice temático para comenzar tu estudio.'}</p>
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

    // Desarrollador de Preguntas de Grado — Modo Perfeccionamiento Admin (v7.18, PROMPT 015)
    // El cuestionario está suprimido para el público general mientras se calibra la calidad dogmática.
    // Solo visible para usuarios con sesión de administrador activa (LicenseService.isAdminMode()).
    let quizHtml = '';
    const canViewQuiz = isAdmin && isUnlocked && typeof QuestionDeveloper !== 'undefined';
    if (canViewQuiz) {
      const questions = QuestionDeveloper.getSectionQuestions(topic);
      const quizState = StorageService.getTopicQuizState(topic.id) || {
        correctCount: 0,
        answers: [null, null, null, null],
        questionResults: [false, false, false, false],
        completed: false
      };
      const nature = QuestionDeveloper.detectNature(topic);
      const tax = QuestionDeveloper.NATURE_TAXONOMY[nature] || QuestionDeveloper.NATURE_TAXONOMY.dogmatic;
      const extractedCites = QuestionDeveloper.extractCitations(topic.content) || [];
      const citesCount = extractedCites.length;
      const correctCount = quizState.correctCount || 0;
      const pct = Math.round((correctCount / 4) * 100);
      const isCompleted = Boolean(quizState.completed);

      const questionsHtml = questions.map((q, idx) => {
        const isAnswered = Boolean(quizState.answers && quizState.answers[idx] !== null);
        const chosenLetter = isAnswered ? quizState.answers[idx] : null;
        const isCorrect = isAnswered ? (chosenLetter === q.correctAnswer) : false;

        const optionsHtml = q.options.map(opt => {
          let optClass = 'quiz-option';
          if (isAnswered) {
            if (opt.id === q.correctAnswer) optClass += ' correct';
            else if (opt.id === chosenLetter) optClass += ' incorrect';
            if (opt.id === chosenLetter) optClass += ' selected';
          }
          return `
            <button type="button" class="${optClass}" data-q-index="${idx}" data-option="${opt.id}" ${isAnswered ? 'disabled' : ''}>
              <span class="quiz-opt-letter">${opt.id.toUpperCase()}</span>
              <span>${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(opt.text) : opt.text}</span>
            </button>
          `;
        }).join('');

        const feedbackHtml = isAnswered ? `
          <div class="quiz-answer-feedback ${isCorrect ? 'success' : 'warning'}">
            <i data-lucide="${isCorrect ? 'check-circle' : 'alert-circle'}" style="width: 16px; height: 16px;"></i>
            <span>${isCorrect ? '✓ ¡Respuesta Correcta!' : '✗ Opción Incorrecta'}</span>
          </div>
        ` : `<div class="quiz-answer-feedback hidden"></div>`;

        const citesHtml = (q.sourceCitations && q.sourceCitations.length > 0) ? `
          <div class="quiz-cites-wrap">
            ${q.sourceCitations.map(c => `<span class="quiz-cite-pill"><i data-lucide="book-open" style="width: 11px; height: 11px; margin-right: 4px;"></i>${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(c) : c}</span>`).join('')}
          </div>
        ` : '';

        const solutionHtml = `
          <div class="quiz-solution ${isAnswered ? '' : 'hidden'}">
            <div class="quiz-solution-title"><i data-lucide="award" style="width: 13px; height: 13px; vertical-align: middle; margin-right: 4px;"></i>Solución Dogmática Oficial</div>
            <div>${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(q.solucionDogmatica) : q.solucionDogmatica}</div>
            <div class="quiz-pauta-title"><i data-lucide="clipboard-check" style="width: 13px; height: 13px; vertical-align: middle; margin-right: 4px;"></i>Pauta de Corrección de la Comisión</div>
            <div>${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(q.pauta) : q.pauta}</div>
            ${citesHtml}
          </div>
        `;

        const qNatureTax = QuestionDeveloper.NATURE_TAXONOMY[q.nature] || tax;

        return `
          <div class="quiz-question-card" data-q-index="${idx}">
            <div class="quiz-question-header">
              <span class="quiz-q-num">Pregunta ${idx + 1} de 4</span>
              <span class="quiz-q-nature-tag" style="border-left: 2px solid ${qNatureTax.color};">${qNatureTax.label}</span>
            </div>
            <div class="quiz-q-statement" data-quiz-question>${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(q.questionText) : q.questionText}</div>
            <div class="quiz-options-list">
              ${optionsHtml}
            </div>
            ${feedbackHtml}
            ${solutionHtml}
          </div>
        `;
      }).join('');

      quizHtml = `
        <section id="section-quiz-developer">
          <div class="quiz-dev-header">
            <div class="quiz-dev-title-wrap">
              <h2 class="quiz-dev-main-title">🎓 Verificación de Cédula — Desarrollador de Preguntas del Agente</h2>
              <span class="quiz-admin-lab-badge" title="Cuestionario en desarrollo interno: visible exclusivamente para administradores">
                <i data-lucide="flask-conical" style="width: 12px; height: 12px; vertical-align: middle;"></i> Modo Perfeccionamiento (Solo Admin)
              </span>
              <span id="quiz-nature-badge" style="background: ${tax.color}22; color: ${tax.color}; border-color: ${tax.color}44;">
                <i data-lucide="sparkles" style="width: 12px; height: 12px;"></i> ${tax.label} (${citesCount} cita${citesCount === 1 ? '' : 's'} real${citesCount === 1 ? '' : 'es'})
              </span>
            </div>
            <div class="quiz-progress-box">
              <div class="quiz-progress-meta">
                <span>Progreso</span>
                <span id="quiz-progress-count">${correctCount}/4 verificadas</span>
              </div>
              <div class="quiz-progress-bar">
                <div id="quiz-progress-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          </div>

          <div id="quiz-completed-banner" class="${isCompleted ? '' : 'hidden'}">
            <i data-lucide="check-circle" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div>
              <strong>🎉 Cédula Completada por Verificación — 4/4 correctas</strong>
              <div style="font-size: 0.82rem; opacity: 0.9;">Tu dominio de esta cédula ha sido acreditado y tu porcentaje de avance general se ha actualizado.</div>
            </div>
          </div>

          <div class="quiz-questions-grid">
            ${questionsHtml}
          </div>
        </section>
      `;
    }

    container.innerHTML = `
      <div class="topic-viewer-container">
        
        <!-- COLUMNA PRINCIPAL DE LECTURA -->
        <article class="topic-reading-col">
          
          <div class="topic-header-card">
            
            <!-- Breadcrumbs de ubicación en los apuntes -->
            <nav class="topic-breadcrumbs" aria-label="Ubicación en los apuntes">
              <span class="bc-discipline ${topic.subject}">${disciplineName}</span>
              <i data-lucide="chevron-right" class="bc-sep"></i>
              <span class="bc-chapter">${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(topic.chapterTitle || topic.category || '') : (topic.chapterTitle || topic.category || '')}</span>
              <i data-lucide="chevron-right" class="bc-sep"></i>
              <span class="bc-code">${topic.indexCode ? `Cédula ${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(topic.indexCode) : topic.indexCode} — Sección ${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(topic.code || '') : (topic.code || '')} (${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(topic.sourceFile || '') : (topic.sourceFile || '')})` : (topic.code ? 'Sección ' + (typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(topic.code) : topic.code) : 'Apunte')}</span>
            </nav>

            <div class="topic-meta-row">
              <div class="topic-official-tags">
                <span class="topic-subject-badge ${topic.subject}">
                  ${disciplineName}
                </span>
                <span class="topic-period-badge" title="Archivo de apuntes de origen">
                  <i data-lucide="file-text" style="width: 12px; height: 12px; vertical-align: middle;"></i> ${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(topic.sourceFile || 'Apuntes') : (topic.sourceFile || 'Apuntes')}
                </span>
              </div>
              
              <div class="topic-actions-group">
                ${isUnlocked ? `
                  <button id="btn-toggle-connections-aside" class="btn btn-outline btn-sm" title="Ver o suprimir panel lateral de cruces e instituciones">
                    <i data-lucide="git-merge"></i>
                    <span>Cruces (${displayConnections.length})</span>
                  </button>
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

            <div class="topic-quick-pills">
              <button id="btn-toggle-connections-aside-pill" class="quick-pill quick-pill-crossover" title="Ver o suprimir cruces dogmáticos e instituciones vinculadas">
                <i data-lucide="git-merge"></i>
                <span>Cruces Dogmáticos (${displayConnections.length})</span>
              </button>
            </div>

          </div>

          <!-- CUERPO DE CONTENIDO REAL DEL APUNTE O PAYWALL -->
          ${isUnlocked ? `
            <div class="topic-markdown-body topic-rendered-content" id="topic-markdown-body">
              ${typeof MarkdownParser !== 'undefined' ? MarkdownParser.render(topic.content) : topic.content}
            </div>

            <!-- ACORDEÓN INLINE: INSTITUCIONES RELACIONADAS (DENTRO DEL APUNTE) -->
            ${displayConnections.length > 0 ? `
              <div class="inline-connections-box">
                <button type="button" id="btn-toggle-inline-connections" class="btn-toggle-inline" aria-expanded="false">
                  <div class="btn-toggle-inline-left">
                    <i data-lucide="git-merge"></i>
                    <span>Cruces Dogmáticos e Instituciones Vinculadas (${displayConnections.length})</span>
                  </div>
                  <div class="inline-toggle-state-text">
                    <span id="inline-toggle-label">Ver análisis</span>
                    <i data-lucide="chevron-down"></i>
                  </div>
                </button>
                <div id="inline-connections-body" class="inline-connections-body collapsed">
                  <p class="aside-section-subtitle" style="margin-bottom: 8px;">Explicación dogmática y aplicación práctica en examen:</p>
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
                        <div class="connection-callout reason-box">
                          <div class="connection-callout-header">
                            <i data-lucide="lightbulb" class="callout-icon"></i>
                            <span>¿Por qué se conectan?</span>
                          </div>
                          <p class="connection-callout-text">${conn.whyConnected}</p>
                        </div>

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
                </div>
              </div>
            ` : ''}

            ${quizHtml}

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
                  <span>4 preguntas de verificación del agente por cédula con cierre automático.</span>
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

              <a href="https://www.instagram.com/gradomaniacos?stkn=MXNtMDF1OHBhMmRhcA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-buy btn-instagram-buy">
                <i data-lucide="instagram"></i>
                <span>Solicitar mi Pase de Grado por Instagram</span>
              </a>
            </div>
          `}

        </article>

        <!-- PANEL LATERAL DERECHO: CONEXIONES Y CASOS (SUPRIMIBLE) -->
        <aside id="topic-aside-panel" class="topic-aside-col">
          
          <div class="aside-panel-header">
            <div class="aside-panel-header-title">
              <i data-lucide="git-merge"></i>
              <span>Cruces Dogmáticos</span>
            </div>
            <button id="btn-close-aside-panel" class="btn-close-aside" title="Suprimir o cerrar panel lateral">
              <i data-lucide="x"></i>
              <span>Cerrar</span>
            </button>
          </div>
          
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

    if (typeof window !== "undefined" && window.lucide) {
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

    // Evento de interacción con el Desarrollador de Preguntas de Cédula (v7.11)
    const quizContainer = container.querySelector('#section-quiz-developer');
    if (quizContainer) {
      quizContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.quiz-option');
        if (!btn || btn.disabled) return;

        const qIndex = parseInt(btn.dataset.qIndex, 10);
        const chosenLetter = btn.dataset.option;
        const questions = typeof QuestionDeveloper !== 'undefined' ? QuestionDeveloper.getSectionQuestions(topic) : [];
        const question = questions[qIndex];
        if (!question) return;

        const result = StorageService.recordTopicAnswer(topic.id, qIndex, chosenLetter, question.correctAnswer);

        // Actualizar UI de la tarjeta en el DOM sin re-render completo para preservar el scroll
        const card = btn.closest('.quiz-question-card');
        if (card) {
          const allOpts = card.querySelectorAll('.quiz-option');
          allOpts.forEach(optBtn => {
            optBtn.disabled = true;
            const optLetter = optBtn.dataset.option;
            if (optLetter === question.correctAnswer) {
              optBtn.classList.add('correct');
            } else if (optLetter === chosenLetter) {
              optBtn.classList.add('incorrect');
            }
          });
          btn.classList.add('selected');

          // Feedback de la respuesta
          const feedbackEl = card.querySelector('.quiz-answer-feedback');
          if (feedbackEl) {
            feedbackEl.className = `quiz-answer-feedback ${result.isCorrect ? 'success' : 'warning'}`;
            feedbackEl.innerHTML = `<i data-lucide="${result.isCorrect ? 'check-circle' : 'alert-circle'}" style="width: 16px; height: 16px;"></i><span>${result.isCorrect ? '✓ ¡Respuesta Correcta!' : '✗ Opción Incorrecta'}</span>`;
          }

          // Solución dogmática oficial revelada
          const solutionEl = card.querySelector('.quiz-solution');
          if (solutionEl) {
            solutionEl.classList.remove('hidden');
          }
        }

        // Actualizar contador y barra de progreso
        const fillEl = quizContainer.querySelector('#quiz-progress-fill');
        const countEl = quizContainer.querySelector('#quiz-progress-count');
        if (fillEl) fillEl.style.width = `${Math.round((result.correctCount / 4) * 100)}%`;
        if (countEl) countEl.textContent = `${result.correctCount}/4 verificadas`;

        if (window.lucide) window.lucide.createIcons();

        // Si se completaron las 4/4 y se dominó la cédula
        if (result.newlyMastered) {
          const bannerEl = quizContainer.querySelector('#quiz-completed-banner');
          if (bannerEl) bannerEl.classList.remove('hidden');

          this.showToast("🎉 ¡Cédula completada por verificación (4/4)!", "success");
          this.renderSidebar();

          // Refrescar el estado y texto de los botones de mastery
          const btnBottom = container.querySelector('#btn-bottom-mastery');
          const btnTop = container.querySelector('#btn-toggle-mastery');
          if (btnBottom) {
            btnBottom.className = 'btn btn-secondary';
            btnBottom.innerHTML = `<i data-lucide="rotate-ccw"></i><span>Marcar para Repasar</span>`;
          }
          if (btnTop) {
            btnTop.className = 'btn btn-secondary btn-sm';
            btnTop.innerHTML = `<i data-lucide="check-circle"></i><span>Dominado ✅</span>`;
          }
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }

    // Toggle y supresión del panel lateral de cruces dogmáticos
    const asidePanel = container.querySelector('#topic-aside-panel');
    const asideBackdrop = document.getElementById('aside-backdrop');
    const btnToggleAside = container.querySelector('#btn-toggle-connections-aside');
    const btnToggleAsidePill = container.querySelector('#btn-toggle-connections-aside-pill');
    const btnCloseAside = container.querySelector('#btn-close-aside-panel');

    const toggleAside = () => {
      if (!asidePanel) return;
      if (window.innerWidth <= 1024) {
        const isOpen = asidePanel.classList.contains('open');
        if (isOpen) {
          asidePanel.classList.remove('open');
          if (asideBackdrop) asideBackdrop.classList.add('hidden');
        } else {
          asidePanel.classList.add('open');
          asidePanel.classList.remove('collapsed');
          if (asideBackdrop) asideBackdrop.classList.remove('hidden');
        }
      } else {
        asidePanel.classList.toggle('collapsed');
      }
    };

    const closeAside = () => {
      if (!asidePanel) return;
      asidePanel.classList.remove('open');
      asidePanel.classList.add('collapsed');
      if (asideBackdrop) asideBackdrop.classList.add('hidden');
    };

    btnToggleAside?.addEventListener('click', toggleAside);
    btnToggleAsidePill?.addEventListener('click', toggleAside);
    btnCloseAside?.addEventListener('click', closeAside);
    asideBackdrop?.addEventListener('click', closeAside);

    // Toggle acordeón inline dentro de los apuntes
    const btnToggleInline = container.querySelector('#btn-toggle-inline-connections');
    const inlineBody = container.querySelector('#inline-connections-body');
    const inlineLabel = container.querySelector('#inline-toggle-label');

    btnToggleInline?.addEventListener('click', () => {
      if (!inlineBody) return;
      const isCollapsed = inlineBody.classList.contains('collapsed');
      if (isCollapsed) {
        inlineBody.classList.remove('collapsed');
        btnToggleInline.classList.add('expanded');
        btnToggleInline.setAttribute('aria-expanded', 'true');
        if (inlineLabel) inlineLabel.textContent = 'Ocultar análisis';
      } else {
        inlineBody.classList.add('collapsed');
        btnToggleInline.classList.remove('expanded');
        btnToggleInline.setAttribute('aria-expanded', 'false');
        if (inlineLabel) inlineLabel.textContent = 'Ver análisis';
      }
    });

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
          closeAside();
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

  // 5.1 VAULT DE CONOCIMIENTO — BÚSQUEDA SEMÁNTICA ESTÁTICA + FILTROS E HISTORIAL (v7.22 / v7.25, Prompts 017 y 020)
  setupVaultSearch() {
    const input = document.getElementById("vault-search-input");
    const resultsContainer = document.getElementById("vault-search-results");
    const clearBtn = document.getElementById("vault-search-clear");
    const pillsContainer = document.getElementById("vault-filter-pills");
    const chapterSelect = document.getElementById("vault-filter-chapter");
    const historyContainer = document.getElementById("vault-search-history");
    const historyItems = document.getElementById("vault-history-items");
    const clearHistoryBtn = document.getElementById("vault-history-clear");

    if (!input || !resultsContainer) return;

    let debounceTimer = null;
    let selectedSubject = "all";
    let selectedChapter = "all";

    const escapeFn = (typeof SecurityShield !== "undefined" && SecurityShield.escapeHtml)
      ? SecurityShield.escapeHtml
      : (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Gestión del Historial Reciente (localStorage 100% local, no exportable)
    const RECENT_KEY = "vault_recent_searches";
    const getRecentSearches = () => {
      try {
        const raw = localStorage.getItem(RECENT_KEY);
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string" && x.trim().length > 0).slice(0, 10) : [];
      } catch (e) {
        return [];
      }
    };

    const saveRecentSearch = (query) => {
      const q = (query || "").trim();
      if (q.length < 3) return;
      let list = getRecentSearches();
      list = list.filter(item => item.toLowerCase() !== q.toLowerCase());
      list.unshift(q);
      if (list.length > 10) list = list.slice(0, 10);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
      } catch (e) {}
    };

    const clearRecentSearches = () => {
      try {
        localStorage.removeItem(RECENT_KEY);
      } catch (e) {}
      if (historyContainer) historyContainer.classList.add("hidden");
    };

    const renderRecentSearches = () => {
      if (!historyContainer || !historyItems) return;
      if (input.value.trim().length >= 3) {
        historyContainer.classList.add("hidden");
        return;
      }
      const list = getRecentSearches();
      if (list.length === 0) {
        historyContainer.classList.add("hidden");
        return;
      }

      historyItems.innerHTML = list.map(item => `
        <button type="button" class="vault-history-chip" data-search="${escapeFn(item)}" title="Buscar: ${escapeFn(item)}">
          ${escapeFn(item)}
        </button>
      `).join("");

      historyItems.querySelectorAll(".vault-history-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          const s = chip.getAttribute("data-search");
          if (s) {
            input.value = s;
            if (clearBtn) clearBtn.classList.remove("hidden");
            historyContainer.classList.add("hidden");
            performSearch(s);
          }
        });
      });

      historyContainer.classList.remove("hidden");
      resultsContainer.classList.add("hidden");
    };

    // Población dinámica de bloques/capítulos ordenados por min indexCode (v7.19.1)
    const updateChapterOptions = () => {
      if (!chapterSelect) return;
      const allTopics = (StorageService && StorageService.getData && StorageService.getData().topics) ||
                        (typeof INITIAL_DATA !== "undefined" && INITIAL_DATA.topics) || [];
      
      const filtered = selectedSubject === "all" ? allTopics : allTopics.filter(t => t.subject === selectedSubject);
      
      const chapterMap = new Map();
      filtered.forEach(t => {
        const chapNum = t.chapterNumber || 1;
        const chapTitle = t.chapterTitle || `${chapNum}. Capítulo`;
        if (!chapterMap.has(chapTitle)) {
          chapterMap.set(chapTitle, { num: chapNum, topics: [] });
        }
        chapterMap.get(chapTitle).topics.push(t);
      });

      const parseIdx = (c) => {
        const parts = (c || "").split(".").map(p => parseInt(p, 10) || 0);
        return (parts[0] || 0) * 1000 + (parts[1] || 0);
      };

      const sortedChapters = Array.from(chapterMap.entries()).sort((a, b) => {
        const minA = Math.min(...a[1].topics.map(t => parseIdx(t.indexCode || t.code)));
        const minB = Math.min(...b[1].topics.map(t => parseIdx(t.indexCode || t.code)));
        if (minA !== minB) return minA - minB;
        return (a[1].num || 0) - (b[1].num || 0);
      });

      let optionsHtml = `<option value="all">Todos los bloques</option>`;
      sortedChapters.forEach(([chapTitle, data]) => {
        optionsHtml += `<option value="${data.num}">Capítulo ${data.num}: ${escapeFn(chapTitle)}</option>`;
      });
      chapterSelect.innerHTML = optionsHtml;
      chapterSelect.value = "all";
      selectedChapter = "all";
    };

    // Ejecución de la búsqueda con filtros
    const performSearch = (query) => {
      const q = (query || "").trim();
      if (q.length < 3) {
        resultsContainer.classList.add("hidden");
        resultsContainer.innerHTML = "";
        if (clearBtn) clearBtn.classList.add("hidden");
        if (historyContainer && input === document.activeElement) renderRecentSearches();
        return;
      }

      if (clearBtn) clearBtn.classList.remove("hidden");
      if (historyContainer) historyContainer.classList.add("hidden");

      if (typeof searchVault !== "function") {
        resultsContainer.innerHTML = `<div class="vault-search-empty">Motor de búsqueda no disponible</div>`;
        resultsContainer.classList.remove("hidden");
        return;
      }

      const searchOpts = {
        limit: 8
      };
      if (selectedSubject !== "all") {
        searchOpts.subject = selectedSubject;
      }
      if (selectedChapter !== "all") {
        searchOpts.chapterNumber = selectedChapter;
      }

      const results = searchVault(q, searchOpts);

      if (!results || results.length === 0) {
        resultsContainer.innerHTML = `<div class="vault-search-empty">Sin coincidencias en apuntes</div>`;
        resultsContainer.classList.remove("hidden");
        return;
      }

      // Guardar en búsquedas recientes
      saveRecentSearch(q);

      resultsContainer.innerHTML = results.map(res => `
        <div class="vault-search-result-item" data-topic-id="${escapeFn(res.id)}" tabindex="0" role="button" aria-label="Abrir cédula ${escapeFn(res.indexCode)} ${escapeFn(res.title)}">
          <div class="vault-result-header">
            <span class="vault-result-code">§ ${escapeFn(res.indexCode || "")}</span>
            <span class="vault-result-title">${escapeFn(res.title || "")}</span>
          </div>
          <div class="vault-result-source">${escapeFn(res.sourceFile || "")}</div>
          <div class="vault-result-snippet">${res.hasPrefixEllipsis ? "…" : ""}${res.highlightedSnippet || escapeFn(res.snippet || "")}${res.hasSuffixEllipsis ? "…" : ""}</div>
        </div>
      `).join("");

      resultsContainer.classList.remove("hidden");

      // Clic y Enter en resultados del Vault
      resultsContainer.querySelectorAll(".vault-search-result-item").forEach(item => {
        const handleOpen = () => {
          const tid = item.dataset.topicId;
          if (tid) {
            this.openTopic(tid);
            // En móvil, si la barra lateral está abierta como drawer, cerrarla
            if (window.innerWidth <= 1024) {
              const sidebar = document.getElementById("app-sidebar");
              if (sidebar && !sidebar.classList.contains("collapsed")) {
                this.toggleSidebar();
              }
            }
          }
        };

        item.addEventListener("click", handleOpen);
        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
          }
        });
      });
    };

    // Eventos de entrada en el input con debounce
    input.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      const val = e.target.value;
      if (val.trim().length < 3) {
        resultsContainer.classList.add("hidden");
        resultsContainer.innerHTML = "";
        if (clearBtn) clearBtn.classList.add("hidden");
        renderRecentSearches();
        return;
      }
      if (clearBtn) clearBtn.classList.remove("hidden");
      if (historyContainer) historyContainer.classList.add("hidden");
      debounceTimer = setTimeout(() => {
        performSearch(val);
      }, 200);
    });

    input.addEventListener("focus", () => {
      if (input.value.trim().length < 3) {
        renderRecentSearches();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        resultsContainer.classList.add("hidden");
        resultsContainer.innerHTML = "";
        clearBtn.classList.add("hidden");
        renderRecentSearches();
        input.focus();
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearRecentSearches();
      });
    }

    // Interacción con pills de disciplina
    if (pillsContainer) {
      pillsContainer.querySelectorAll(".vault-filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          pillsContainer.querySelectorAll(".vault-filter-pill").forEach(p => p.classList.remove("active"));
          pill.classList.add("active");
          selectedSubject = pill.dataset.subject || "all";
          updateChapterOptions();
          if (input.value.trim().length >= 3) {
            performSearch(input.value);
          }
        });
      });
    }

    // Interacción con selector de capítulo
    if (chapterSelect) {
      chapterSelect.addEventListener("change", () => {
        selectedChapter = chapterSelect.value;
        if (input.value.trim().length >= 3) {
          performSearch(input.value);
        }
      });
    }

    // Inicializar opciones de bloques temáticos
    updateChapterOptions();
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
        if (tab.dataset.tab === 'sources') this.renderSourcesList();
        if (tab.dataset.tab === 'casos') this.renderCasosFilesList();
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
      if (!LicenseService.canManageNotes()) {
        this.showToast("Acceso restringido: Solo el administrador o cuentas con permiso pueden agregar apuntes.", "warning");
        return;
      }
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
      if (!LicenseService.canManageNotes()) {
        this.showToast("Acceso restringido: Solo el administrador o cuentas con permiso pueden restaurar notas.", "warning");
        return;
      }
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
          alert("El archivo JSON seleccionado no tiene un formato válido de GRADOMANIACOS.");
        }
      };
      reader.readAsText(file);
    });

    // Reset Defaults
    document.getElementById("btn-reset-defaults")?.addEventListener("click", () => {
      if (!LicenseService.canManageNotes()) {
        this.showToast("Acceso restringido: Solo el administrador puede restablecer el temario.", "warning");
        return;
      }
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

  // Respaldo manual del avance de cédulas dominadas (Exportar/Importar JSON) para
  // el puente multi-dispositivo en Modo Estático / GitHub Pages (v7.12).
  setupProgressBackup() {
    const btnExport = document.getElementById("btn-export-progress");
    const btnImport = document.getElementById("btn-import-progress");
    const inputImport = document.getElementById("input-import-progress");

    if (btnExport) {
      btnExport.addEventListener("click", () => {
        const ok = StorageService.exportUserProgressFile();
        this.showToast(ok ? "✅ Avance exportado como JSON (impórtalo en tu otro dispositivo)" : "⚠️ No se pudo exportar el avance", ok ? "success" : "warning");
      });
    }

    if (btnImport && inputImport) {
      btnImport.addEventListener("click", () => {
        inputImport.click();
      });

      inputImport.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Límite de seguridad: 512 KB
        if (file.size > 512 * 1024) {
          this.showToast("⚠️ El archivo de respaldo supera 512 KB y fue rechazado.", "warning");
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const result = StorageService.mergeUserProgressFromJsonString(String(event.target.result || ""));
            if (result && result.ok) {
              this.renderSidebar();
              if (this.currentView === "topics") {
                this.renderTopicViewer();
              }
              this.showToast(`✅ Avance importado y fusionado (${result.imported} cédulas actualizadas)`, "success");
              // Reconciliar con el servidor si hay sesión activa
              this.pullMasteryProgress();
            } else {
              this.showToast(`⚠️ ${(result && result.error) || "El archivo no es un respaldo de avance válido."}`, "warning");
            }
          } catch (err) {
            this.showToast("⚠️ No se pudo procesar el archivo de respaldo.", "warning");
          } finally {
            e.target.value = "";
          }
        };
        reader.onerror = () => {
          this.showToast("⚠️ No se pudo leer el archivo de respaldo.", "warning");
          e.target.value = "";
        };
        reader.readAsText(file);
      });
    }
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

  async renderSourcesList() {
    const container = document.getElementById("sources-list-container");
    if (!container) return;

    const knownDescs = {
      "ACTO JURIDICO.md": { subject: "Derecho Civil", desc: "Teoría del Acto Jurídico: requisitos, vicios, nulidades e ineficacia" },
      "LOS BIENES.md": { subject: "Derecho Civil", desc: "Teoría de los Bienes: dominio, posesión, modos de adquirir y derechos reales" },
      "LAS OBLIGACIONES.md": { subject: "Derecho Civil", desc: "Teoría de las Obligaciones: fuente, efectos, cumplimiento e incumplimiento" },
      "CLASE_9_11.md": { subject: "Derecho Civil", desc: "RCE, contratos, promesa y compraventa (clases 9 a 11)" },
      "PROCESAL.md": { subject: "Derecho Procesal", desc: "Jurisdicción, juicio ordinario, recursos y normas comunes" },
      "CONSTITUCIONAL.md": { subject: "Derecho Constitucional", desc: "Bases de institucionalidad, DD.FF. y acciones constitucionales" }
    };

    const sourceFilesMap = new Map();

    // 1. Intentar obtener desde /api/fuentes si el backend está activo
    try {
      if (typeof fetch === "function") {
        const res = await fetch("/api/fuentes");
        if (res.ok) {
          const data = await res.json();
          if (data && data.fuentes) {
            Object.values(data.fuentes).forEach(f => {
              const fname = f.filename || f.name;
              if (fname) {
                sourceFilesMap.set(fname, {
                  name: fname,
                  subject: knownDescs[fname]?.subject || (f.discipline || "Apunte"),
                  desc: knownDescs[fname]?.desc || (f.title || "Apunte desarrollado en fuentes/")
                });
              }
            });
          }
        }
      }
    } catch (e) {}

    // 2. Si no hay fuentes del backend, derivar de StorageService o INITIAL_DATA.topics
    if (sourceFilesMap.size === 0) {
      const allTopics = (typeof StorageService !== "undefined" && StorageService.getData)
        ? (StorageService.getData().topics || [])
        : ((typeof INITIAL_DATA !== "undefined" && INITIAL_DATA.topics) ? INITIAL_DATA.topics : []);

      allTopics.forEach(t => {
        const fname = t.sourceFile ? t.sourceFile.replace(/^.*[\\\/]/, '') : "";
        if (fname && !sourceFilesMap.has(fname)) {
          const subjName = t.discipline || (t.subject === 'procesal' ? 'Derecho Procesal' : t.subject === 'constitucional' ? 'Derecho Constitucional' : 'Derecho Civil');
          sourceFilesMap.set(fname, {
            name: fname,
            subject: knownDescs[fname]?.subject || subjName,
            desc: knownDescs[fname]?.desc || `Apunte desarrollado (${t.chapterTitle || subjName})`
          });
        }
      });
    }

    // 3. Fallback defensivo si no hubiese tópicos cargados
    if (sourceFilesMap.size === 0) {
      Object.entries(knownDescs).forEach(([fname, info]) => {
        sourceFilesMap.set(fname, { name: fname, subject: info.subject, desc: info.desc });
      });
    }

    const sources = Array.from(sourceFilesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = sources.map(s => `
      <div class="source-item-row">
        <div class="source-item-info">
          <i data-lucide="file-text" style="color: var(--gold-primary);"></i>
          <div>
            <div>${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(s.name) : s.name} <span class="badge-count" style="font-size: 0.65rem; margin-left: 6px;">${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(s.subject) : s.subject}</span></div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${typeof SecurityShield !== 'undefined' ? SecurityShield.escapeHtml(s.desc) : s.desc}</div>
          </div>
        </div>
        <span style="font-size: 0.75rem; color: var(--success); font-weight: 600;">Sincronizado</span>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  async renderCasosFilesList() {
    const container = document.getElementById("casos-files-container");
    const statsEl = document.getElementById("casos-sync-stats");
    if (!container) return;

    // Configurar botón de re-escaneo una sola vez si no se ha hecho
    const btnSync = document.getElementById("btn-force-sync-casos");
    if (btnSync && !btnSync.dataset.bound) {
      btnSync.dataset.bound = "true";
      btnSync.addEventListener("click", async () => {
        this.showToast("Re-escaneando carpeta CASOS...", "info");
        await this.syncWithServer();
        await this.renderCasosFilesList();
      });
    }

    container.innerHTML = `<p class="text-muted" style="padding: 16px; text-align: center;"><i data-lucide="loader" class="spin"></i> Escaneando carpeta CASOS...</p>`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await fetch("/api/casos-files");
      if (!res.ok) throw new Error("No se pudo conectar al servidor");
      const data = await res.json();
      const files = data.files || [];
      const casesCount = data.casesCount || 0;

      if (statsEl) {
        statsEl.innerHTML = `<strong>${files.length}</strong> archivo(s) vigilado(s) · <strong>${casesCount}</strong> caso(s) práctico(s) listos`;
      }

      if (files.length === 0) {
        container.innerHTML = `
          <div class="empty-state-wrap" style="padding: 24px; text-align: center;">
            <p class="text-muted">No se detectaron archivos en la carpeta <code>CASOS/</code>.</p>
            <p style="font-size: 0.8rem; color: var(--text-subtle);">Coloca tus archivos .md, .docx, .pdf o .txt en <code>CASOS/</code> (o en <code>Escritorio/Fuentes_Grado/CASOS</code>) y presiona "Re-escanear".</p>
          </div>
        `;
        return;
      }

      container.innerHTML = files.map(f => {
        const catBadgeClass = f.category === 'examenes' ? 'filter-constitucional' : (f.category === 'semanales' ? 'filter-civil' : 'filter-procesal');
        return `
          <div class="source-item-row">
            <div class="source-item-info">
              <i data-lucide="${f.hasCaseParsed ? 'briefcase' : 'file-text'}" style="color: var(--gold-primary);"></i>
              <div>
                <div>
                  <strong>${typeof escapeHTML === 'function' ? escapeHTML(f.name) : f.name}</strong>
                  <span class="badge-count ${catBadgeClass}" style="font-size: 0.65rem; margin-left: 6px;">${f.categoryLabel}</span>
                  ${f.hasCaseParsed ? `<span class="badge-count" style="font-size: 0.65rem; margin-left: 4px; background: rgba(34, 197, 94, 0.15); color: #22c55e;">Caso Extraído</span>` : ''}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  ${f.parsedCaseTitle ? `Título: "${typeof escapeHTML === 'function' ? escapeHTML(f.parsedCaseTitle) : f.parsedCaseTitle}"` : `Ruta: ${f.relativePath} · ${f.charCount} caracteres`}
                </div>
              </div>
            </div>
            <span style="font-size: 0.75rem; color: var(--success); font-weight: 600;">Sincronizado</span>
          </div>
        `;
      }).join('');

    } catch (e) {
      if (statsEl) statsEl.textContent = "Modo autónomo / sin servidor local activo";
      container.innerHTML = `
        <div style="padding: 16px; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">
          <p>Para sincronizar en vivo con la carpeta <code>CASOS/</code> ejecuta el servidor local:</p>
          <pre style="background: var(--bg-surface-elevated); padding: 8px 12px; border-radius: 4px; font-size: 0.8rem; margin: 8px 0;">python server.py</pre>
          <p>Todos los casos que agregues a <code>CASOS/</code> o <code>Escritorio/Fuentes_Grado/CASOS</code> se sincronizarán al instante.</p>
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();
  },

  openImportModal(tabName = "paste") {
    // Modo Presentación Docente (v7.16): la gestión e importación/exportación de archivos
    // está deshabilitada (defensa en profundidad además del guard de canManageNotes).
    if (LicenseService.isDocente()) {
      this.showToast("Modo Presentación Docente: la gestión e importación/exportación de archivos está deshabilitada.", "warning");
      return;
    }
    if (!LicenseService.canManageNotes()) {
      this.showToast("Acceso restringido: Solo el administrador o cuentas con permiso pueden agregar o gestionar apuntes.", "warning");
      return;
    }
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
        <button class="license-status-badge unlocked icon-only" id="badge-license-active" title="Pase activo (${scopeLabel}): ${escapeHTML(lic.studentName)}" aria-label="Pase de Grado Activo">
          <i data-lucide="crown"></i>
        </button>
      `;
    } else {
      container.innerHTML = `
        <button class="license-status-badge demo icon-only" id="btn-open-unlock-badge" title="Modo Demo: Clic para ingresar código de activación" aria-label="Modo Demo - Activar Pase">
          <i data-lucide="lock"></i>
        </button>
      `;
    }

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("btn-open-unlock-badge")?.addEventListener("click", () => {
      this.openUnlockModal();
    });
    document.getElementById("badge-license-active")?.addEventListener("click", () => {
      this.openUnlockModal();
    });
  },

  setupLicenseModals() {
    // Modal Desbloqueo Alumno (Google Auth -> Convalidación Demo)
    const unlockModal = document.getElementById("unlock-modal");
    const btnCloseUnlock = document.getElementById("btn-close-unlock-modal");
    const btnSubmit = document.getElementById("btn-submit-license");
    const inputLicense = document.getElementById("input-license-code");

    btnCloseUnlock?.addEventListener("click", () => {
      unlockModal.classList.add("hidden");
    });

    btnSubmit?.addEventListener("click", () => {
      const code = inputLicense?.value || "";
      this.processActivation(code);
    });

    inputLicense?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = inputLicense.value || "";
        this.processActivation(code);
      }
    });

    inputLicense?.addEventListener("input", () => {
      inputLicense.value = inputLicense.value.toUpperCase();
    });

    // Botón de Google dentro del modal de activación (Paso 1)
    document.getElementById("btn-modal-trigger-google")?.addEventListener("click", () => {
      if (typeof AuthService !== "undefined" && AuthService.triggerGoogleLogin) {
        AuthService.triggerGoogleLogin();
      }
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
      if (LicenseService.isFullAdmin()) {
        this.renderAdminCodesTable();
      } else {
        this.applyDocenteRestrictions();
      }
    });

    btnOpenAdmin?.addEventListener("click", () => {
      adminModal.classList.remove("hidden");
      if (LicenseService.isAdminMode()) {
        document.getElementById("admin-login-screen")?.classList.add("hidden");
        document.getElementById("admin-dashboard-screen")?.classList.remove("hidden");
        if (LicenseService.isFullAdmin()) {
          this.renderAdminCodesTable();
        } else {
          this.applyDocenteRestrictions();
        }
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

    btnAdminLogin?.addEventListener("click", async () => {
      const pin = document.getElementById("admin-pin-input")?.value || "";
      const role = await LicenseService.verifyAdminPin(pin);
      if (role) {
        LicenseService.setAdminMode(true, role);
        this.renderAdminIndicator();
        this.renderSidebar();
        if (this.currentView === "topics") {
          this.renderTopicViewer();
        }
        document.getElementById("admin-login-screen").classList.add("hidden");
        document.getElementById("admin-dashboard-screen").classList.remove("hidden");
        if (LicenseService.isFullAdmin()) {
          this.renderAdminCodesTable();
          this.showToast("👑 Modo Administrador activado: Tienes acceso total y visibilidad de desarrollo de apuntes.", "success");
        } else {
          this.applyDocenteRestrictions();
          this.showToast("🎓 Modo Presentación Docente activado: visualiza y prueba las herramientas; la gestión de códigos y archivos está deshabilitada.", "info");
        }
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

    // Botón de gestión directa de apuntes desde el dashboard de administrador
    const btnAdminManageNotes = document.getElementById("btn-admin-manage-notes");
    btnAdminManageNotes?.addEventListener("click", () => {
      adminModal.classList.add("hidden");
      this.openImportModal("paste");
    });

    btnGenerate?.addEventListener("click", async () => {
      // Modo Presentación Docente (v7.16): la generación de códigos está deshabilitada.
      if (LicenseService.isDocente()) {
        this.showToast("Modo Presentación Docente: la generación de códigos está deshabilitada.", "warning");
        return;
      }
      const studentName = document.getElementById("admin-student-name")?.value.trim() || "Alumno";
      const studentEmail = document.getElementById("admin-student-email")?.value.trim() || "";
      const customCode = document.getElementById("admin-custom-code")?.value.trim() || "";
      const scope = document.getElementById("admin-scope-select")?.value;
      const days = document.getElementById("admin-days-select")?.value;
      const canManageNotes = !!document.getElementById("admin-grant-notes-perm")?.checked;

      const res = await LicenseService.generateCode({ studentName, studentEmail, scope, days, canManageNotes, customCode });
      if (!res || !res.success) {
        this.showToast(res?.error || "Error al generar código de licencia", "error");
        return;
      }
      await this.renderAdminCodesTable();
      const roleMsg = canManageNotes ? " (con permiso de gestor de apuntes)" : "";
      this.showToast(`¡Código ${res.code} generado${roleMsg}! Cópialo para enviárselo a tu alumno.`, "success");
      document.getElementById("admin-student-name").value = "";
      const emailInput = document.getElementById("admin-student-email");
      if (emailInput) emailInput.value = "";
      const customInput = document.getElementById("admin-custom-code");
      if (customInput) customInput.value = "";
      const permCheck = document.getElementById("admin-grant-notes-perm");
      if (permCheck) permCheck.checked = false;
    });
  },

  renderAdminIndicator() {
    const pill = document.getElementById("admin-mode-pill");
    const btnAdmin = document.getElementById("btn-open-admin");
    const isAdmin = LicenseService.isAdminMode();
    const canManage = LicenseService.canManageNotes();

    // Indicador en cabecera: un solo icono (glowing shield si es admin, shield estándar si no)
    if (pill && btnAdmin) {
      if (isAdmin) {
        pill.classList.remove("hidden");
        btnAdmin.classList.add("hidden");
      } else {
        pill.classList.add("hidden");
        btnAdmin.classList.remove("hidden");
      }
    } else if (pill) {
      if (isAdmin) {
        pill.classList.remove("hidden");
      } else {
        pill.classList.add("hidden");
      }
    }

    // Botón de cabecera "Importar Notas": solo visible si es Administrador o cuenta con rol gestor
    const btnImport = document.getElementById("btn-open-import");
    if (btnImport) {
      if (canManage) {
        btnImport.classList.remove("hidden");
        btnImport.style.display = "inline-flex";
      } else {
        btnImport.classList.add("hidden");
        btnImport.style.display = "none";
      }
    }

    // Opción bajo el índice ("Nuevo Tema / Cédula"):
    // Suprimida totalmente para alumnos normales, solo visible si la cuenta tiene rol de administrador/gestor
    const sidebarFooter = document.getElementById("sidebar-footer-admin");
    if (sidebarFooter) {
      if (canManage) {
        sidebarFooter.classList.remove("hidden");
        sidebarFooter.style.display = "block";
      } else {
        sidebarFooter.classList.add("hidden");
        sidebarFooter.style.display = "none";
      }
    }

    // MODE-DOCENTE (v7.16, PROMPT 013): la cuenta de presentación docente no puede cargar ni
    // descargar archivos, así que oculta el respaldo Exportar/Importar avance. Si se desea
    // permitir al profesor respaldar su propio avance, eliminar este bloque.
    const isDocente = LicenseService.isDocente();
    const progressActions = document.getElementById("sidebar-progress-actions");
    if (progressActions) {
      progressActions.classList.toggle("hidden", isDocente);
      progressActions.style.display = isDocente ? "none" : "";
    }
  },

  // Modo Presentación Docente (v7.16, PROMPT 013): el panel de administrador se muestra en
  // modo solo-visualización. Se ocultan el formulario de generación de códigos, la tabla de
  // códigos emitidos y el gestor de apuntes, y se muestra el banner aclaratorio.
  applyDocenteRestrictions() {
    const form = document.getElementById("admin-license-form");
    const panel = document.getElementById("admin-codes-panel");
    const banner = document.getElementById("docente-mode-banner");
    const manageNotes = document.getElementById("btn-admin-manage-notes");
    if (form) form.style.display = "none";
    if (panel) panel.style.display = "none";
    if (manageNotes) manageNotes.style.display = "none";
    if (banner) banner.style.display = "block";
  },

  async renderAdminCodesTable() {
    const tbody = document.getElementById("admin-codes-tbody");
    if (!tbody) return;

    const list = await LicenseService.fetchAdminCodes();
    tbody.innerHTML = list.map(c => {
      const emailDisplay = c.linkedEmail || c.assignedEmail || '';
      const isConvalidated = (c.uses > 0 && c.linkedEmail);
      return `
      <tr style="${c.revoked ? 'opacity: 0.5; text-decoration: line-through;' : ''}">
        <td><span class="code-pill">${escapeHTML(c.code)}</span></td>
        <td>
          ${escapeHTML(c.studentName || 'Sin asignar')}
          ${c.canManageNotes ? '<span class="badge-count" style="font-size: 0.65rem; margin-left: 4px; background: rgba(16, 185, 129, 0.2); color: #10b981;">Gestor Apuntes</span>' : ''}
        </td>
        <td>
          ${emailDisplay ? `
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="display: inline-flex; align-items: center; gap: 5px; color: ${isConvalidated ? '#10b981' : 'var(--gold-primary)'}; font-size: 0.82rem; font-weight: 600;">
                <i data-lucide="${isConvalidated ? 'check-circle' : 'mail'}" style="width: 13px; height: 13px; flex-shrink: 0;"></i>
                <span>${escapeHTML(emailDisplay)}</span>
              </span>
              <span style="font-size: 0.70rem; color: ${isConvalidated ? '#10b981' : 'var(--text-muted)'}; font-weight: 500;">
                ${isConvalidated ? '✓ Convalidado' : 'Pendiente de canje'}
              </span>
            </div>
          ` : `
            <span style="color: var(--text-muted); font-size: 0.78rem; font-style: italic;">
              Sin vincular
            </span>
          `}
        </td>
        <td><span class="badge-count" style="font-size: 0.65rem;">${c.scope}</span></td>
        <td>${c.days === 0 ? 'Perpetua' : `${c.days} días`}</td>
        <td>
          <span style="font-weight: 700; color: ${c.uses > 0 ? '#10b981' : 'var(--text-muted)'};">
            ${c.uses}/${c.max_uses}
          </span>
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
      btn.addEventListener('click', async () => {
        // Modo Presentación Docente (v7.16): la revocación de códigos está deshabilitada.
        if (LicenseService.isDocente()) {
          this.showToast("Modo Presentación Docente: la revocación de códigos está deshabilitada.", "warning");
          return;
        }
        const code = btn.dataset.revokeCode;
        if (confirm(`¿Estás seguro de revocar la licencia ${code}?`)) {
          await LicenseService.revokeCode(code);
          await this.renderAdminCodesTable();
          this.showToast(`Licencia ${code} revocada`, "info");
        }
      });
    });
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
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    App.init();
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = App;
}
