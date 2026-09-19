/**
 * SERVICIO DE AUTENTICACIÓN GOOGLE Y GESTIÓN DE SESIONES (AuthService)
 * Integra Google Identity Services (GSI), vinculación de códigos de acceso (Beta)
 * y persistencia multi-dispositivo para estudio-de-grado-app.
 * 
 * Arquitectura Dual:
 * - Modo Servidor: Validación HMAC, persistencia en SQLite (estudio_grado.db) y cookies httpOnly.
 * - Modo Estático / GitHub Pages: Decodificación JWT cliente, códigos activos y persistencia en localStorage.
 */

var AuthService = {
  currentUser: null,
  pendingIdToken: null,
  pendingUserPreview: null,
  googleClientId: (typeof window !== "undefined" && window.AUTH_CONFIG && window.AUTH_CONFIG.googleClientId) || "",
  isInitialized: false,
  listeners: [],

  // Decodificador seguro de JWT ID Token en el navegador (para GitHub Pages / modo serverless)
  parseJwt(token) {
    if (!token || typeof token !== "string") return null;
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  },

  // Suscribirse a cambios de estado de autenticación
  onAuthStateChanged(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
      callback(this.currentUser);
    }
  },

  notifyAuthStateChanged() {
    this.renderAuthUI();
    for (const cb of this.listeners) {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error("[AuthService] Error en listener:", e);
      }
    }
  },

  // Inicialización del servicio
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Cargar Client ID preconfigurado si existe
    if (typeof window !== "undefined" && window.AUTH_CONFIG && window.AUTH_CONFIG.googleClientId) {
      this.googleClientId = window.AUTH_CONFIG.googleClientId;
    }

    // 2. Consultar sesión actual en el backend o caché local
    await this.checkSession();

    // 3. Configurar Google Identity Services
    this.initGoogleIdentity();

    // 4. Vincular listeners de UI para modal de código
    this.setupModalListeners();
  },

  // Verificar sesión con cookie HttpOnly en /api/auth/me o fallback en localStorage
  async checkSession() {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.googleClientId) {
          this.googleClientId = data.googleClientId;
        }
        if (data.ok && data.user) {
          this.currentUser = data.user;
          this.notifyAuthStateChanged();
          if (typeof StorageService !== "undefined" && StorageService.syncPullProgress) {
            StorageService.syncPullProgress();
          }
          return this.currentUser;
        }
      }
    } catch (e) {
      // Backend no disponible (ej. GitHub Pages o servidor local apagado)
    }

    // Modo estático / offline (GitHub Pages / localStorage)
    try {
      const storedUser = localStorage.getItem("grado_auth_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.email) {
          this.currentUser = parsed;
          this.notifyAuthStateChanged();
          return this.currentUser;
        }
      }
    } catch (e) {}

    this.currentUser = null;
    this.notifyAuthStateChanged();
    return null;
  },

  // Inicializar Google Identity Services (GSI)
  initGoogleIdentity() {
    if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
      // Reintentar cuando el script de Google cargue
      setTimeout(() => this.initGoogleIdentity(), 400);
      return;
    }

    const effectiveClientId = this.googleClientId || (typeof window !== "undefined" && window.AUTH_CONFIG && window.AUTH_CONFIG.googleClientId);
    if (!effectiveClientId) {
      this.renderAuthUI();
      return;
    }

    this.googleClientId = effectiveClientId;

    try {
      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response) => {
          if (response && response.credential) {
            this.handleGoogleCredential(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      this.renderGoogleButton();
    } catch (e) {
      console.warn("[AuthService] Inicialización de Google Identity:", e);
    }
  },

  // Renderizar botón oficial de Google en contenedor
  renderGoogleButton() {
    const container = document.getElementById("google-signin-btn-container");
    if (!container || typeof google === "undefined" || !google.accounts || !this.googleClientId) return;

    try {
      container.innerHTML = "";
      google.accounts.id.renderButton(container, {
        theme: "filled_black",
        size: "medium",
        shape: "pill",
        text: "signin_with",
        locale: "es"
      });
    } catch (e) {
      console.warn("[AuthService] No se pudo renderizar botón de Google nativo:", e);
    }
  },

  // Procesar credencial (JWT ID Token) de Google
  async handleGoogleCredential(idToken) {
    if (!idToken) return;

    let backendSuccess = false;
    let backendRequiresCode = false;
    let backendUser = null;
    let backendPreview = null;
    let backendError = null;

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.ok) {
          backendSuccess = true;
          backendUser = data.user;
        }
      } else if (res.status === 403) {
        const data = await res.json();
        if (data.requiresAccessCode) {
          backendRequiresCode = true;
          backendPreview = data.userPreview;
        } else {
          backendError = data.error;
        }
      } else if (res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        backendError = data.error || "Error al autenticar con Google";
      }
    } catch (e) {
      // Backend no disponible (modo estático GitHub Pages)
    }

    if (backendSuccess && backendUser) {
      this.currentUser = backendUser;
      this.pendingIdToken = null;
      this.pendingUserPreview = null;
      this.notifyAuthStateChanged();

      if (typeof App !== "undefined" && App.showToast) {
        const safeName = typeof SecurityShield !== "undefined" 
          ? SecurityShield.escapeHtml(backendUser.name || backendUser.email)
          : (backendUser.name || backendUser.email);
        App.showToast(`Bienvenido de vuelta, ${safeName}`, "success");
      }

      if (typeof StorageService !== "undefined" && StorageService.syncPullProgress) {
        StorageService.syncPullProgress();
      }
      return;
    }

    if (backendRequiresCode) {
      this.pendingIdToken = idToken;
      this.pendingUserPreview = backendPreview;
      this.openAccessCodeModal();
      return;
    }

    if (backendError) {
      if (typeof App !== "undefined" && App.showToast) {
        App.showToast(backendError, "error");
      } else {
        alert(backendError);
      }
      return;
    }

    // =========================================================================
    // FALLBACK MODO ESTÁTICO / GITHUB PAGES (Serverless JWT Decoding & Local DB)
    // =========================================================================
    let claims = null;
    if (idToken.startsWith("mock-google-token:") || idToken.startsWith("test-token:")) {
      const parts = idToken.split(":");
      claims = {
        sub: parts[1] || `user-${Date.now()}`,
        email: parts[2] || "postulante@derecho.cl",
        name: parts[3] || "Estudiante de Grado",
        picture: parts[4] || ""
      };
    } else {
      claims = this.parseJwt(idToken);
    }

    if (!claims || !claims.email) {
      if (typeof App !== "undefined" && App.showToast) {
        App.showToast("No se pudo procesar la credencial de Google.", "error");
      }
      return;
    }

    const sub = claims.sub || claims.email;
    let registeredUsers = {};
    try {
      registeredUsers = JSON.parse(localStorage.getItem("grado_registered_users") || "{}");
    } catch (e) {}

    const existing = registeredUsers[sub] || registeredUsers[claims.email];
    if (existing) {
      this.currentUser = {
        id: existing.id || sub,
        email: claims.email,
        name: claims.name || existing.name,
        picture_url: claims.picture || existing.picture_url,
        access_code: existing.access_code
      };
      try {
        localStorage.setItem("grado_auth_user", JSON.stringify(this.currentUser));
      } catch (e) {}

      this.pendingIdToken = null;
      this.pendingUserPreview = null;
      this.notifyAuthStateChanged();

      if (typeof App !== "undefined" && App.showToast) {
        const safeName = typeof SecurityShield !== "undefined"
          ? SecurityShield.escapeHtml(this.currentUser.name || this.currentUser.email)
          : (this.currentUser.name || this.currentUser.email);
        App.showToast(`Bienvenido de vuelta, ${safeName}`, "success");
      }
    } else {
      this.pendingIdToken = idToken;
      this.pendingUserPreview = {
        sub: sub,
        email: claims.email,
        name: claims.name || claims.email.split("@")[0],
        picture: claims.picture || ""
      };
      this.openAccessCodeModal();
    }
  },

  // Vincular cuenta nueva con código de invitación
  async linkAccessCode(code) {
    if (!this.pendingIdToken) {
      return { ok: false, error: "No hay sesión pendiente de Google para vincular." };
    }
    if (!code || !code.trim()) {
      return { ok: false, error: "Ingresa un código de acceso válido." };
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Intentar vincular en backend (si el servidor está activo)
    try {
      const res = await fetch("/api/auth/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: this.pendingIdToken,
          code: cleanCode
        })
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.ok && data.user) {
          this.currentUser = data.user;
          this.pendingIdToken = null;
          this.pendingUserPreview = null;
          this.closeAccessCodeModal();
          this.notifyAuthStateChanged();

          if (typeof App !== "undefined" && App.showToast) {
            App.showToast("¡Cuenta vinculada con éxito! Acceso concedido.", "success");
          }

          if (typeof StorageService !== "undefined" && StorageService.syncPullProgress) {
            StorageService.syncPullProgress();
          }

          return { ok: true, user: data.user };
        }
      } else if (res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || "Código no válido o agotado." };
      }
    } catch (e) {
      // Backend no disponible (modo GitHub Pages)
    }

    // 2. Validación en modo estático (GitHub Pages / Local)
    const validCodes = (window.AUTH_CONFIG && window.AUTH_CONFIG.invitationCodes) || [
      "GRADO-BETA-2026",
      "CIVIL-PROCESAL-2026",
      "DERECHO-UCHILE-2026",
      "DERECHO-PUC-2026",
      "POSTULANTE-2026"
    ];

    const isCodeAllowed = validCodes.includes(cleanCode) || /^GRADO-[A-Z0-9_-]{4,24}$/i.test(cleanCode);
    if (!isCodeAllowed) {
      return { ok: false, error: "Código de acceso no reconocido para la beta privada. Solicítalo al administrador." };
    }

    const preview = this.pendingUserPreview || {};
    const newUser = {
      id: preview.sub || `user-${Date.now()}`,
      email: preview.email || "postulante@derecho.cl",
      name: preview.name || "Estudiante de Grado",
      picture_url: preview.picture || "",
      access_code: cleanCode
    };

    try {
      const registeredUsers = JSON.parse(localStorage.getItem("grado_registered_users") || "{}");
      registeredUsers[newUser.id] = newUser;
      registeredUsers[newUser.email] = newUser;
      localStorage.setItem("grado_registered_users", JSON.stringify(registeredUsers));
      localStorage.setItem("grado_auth_user", JSON.stringify(newUser));
    } catch (e) {}

    this.currentUser = newUser;
    this.pendingIdToken = null;
    this.pendingUserPreview = null;
    this.closeAccessCodeModal();
    this.notifyAuthStateChanged();

    if (typeof App !== "undefined" && App.showToast) {
      App.showToast("¡Cuenta vinculada con éxito! Acceso concedido.", "success");
    }

    return { ok: true, user: newUser };
  },

  // Cerrar sesión
  async logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}

    try {
      localStorage.removeItem("grado_auth_user");
    } catch (e) {}

    this.currentUser = null;
    this.pendingIdToken = null;
    this.pendingUserPreview = null;
    this.notifyAuthStateChanged();

    if (typeof App !== "undefined" && App.showToast) {
      App.showToast("Has cerrado tu sesión de Google.", "info");
    }
  },

  // Renderizar estado de autenticación en la barra superior
  renderAuthUI() {
    const container = document.getElementById("auth-user-container");
    if (!container) return;

    if (this.currentUser) {
      const escape = (str) => typeof SecurityShield !== "undefined" ? SecurityShield.escapeHtml(str) : String(str || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const safeName = escape(this.currentUser.name || this.currentUser.email.split("@")[0]);
      const safeEmail = escape(this.currentUser.email);
      const rawPic = this.currentUser.picture_url || "";
      const isSafePicUrl = typeof rawPic === "string" && /^https?:\/\/[a-zA-Z0-9_\-.~:/?#[\]@!$&'()*+,;=%]+$/i.test(rawPic);
      const safePic = isSafePicUrl ? escape(rawPic) : "";

      container.innerHTML = `
        <div class="user-profile-pill" title="Conectado como: ${safeEmail}">
          ${safePic ? `<img src="${safePic}" alt="${safeName}" class="user-avatar-img" referrerpolicy="no-referrer">` : `<div class="user-avatar-placeholder"><i data-lucide="user"></i></div>`}
          <span class="user-profile-name">${safeName}</span>
          <button id="btn-user-logout" class="icon-btn btn-user-logout" title="Cerrar sesión" aria-label="Cerrar sesión">
            <i data-lucide="log-out"></i>
          </button>
        </div>
      `;

      const logoutBtn = document.getElementById("btn-user-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => this.logout());
      }
    } else {
      container.innerHTML = `
        <div id="google-signin-btn-container" class="google-btn-wrapper">
          <button id="btn-trigger-google-login" class="btn btn-outline btn-sm auth-login-btn" title="Iniciar sesión con Google">
            <i data-lucide="log-in"></i>
            <span>Acceder con Google</span>
          </button>
        </div>
      `;

      const manualBtn = document.getElementById("btn-trigger-google-login");
      if (manualBtn) {
        manualBtn.addEventListener("click", () => {
          if (typeof google !== "undefined" && google.accounts && this.googleClientId) {
            try {
              google.accounts.id.prompt();
            } catch (err) {
              this.promptLocalMockLogin();
            }
          } else {
            this.promptLocalMockLogin();
          }
        });
      }

      this.renderGoogleButton();
    }

    if (typeof lucide !== "undefined" && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  // Fallback asistido para testing o acceso rápido sin Client ID registrado
  promptLocalMockLogin() {
    const defaultEmail = "postulante@derecho.cl";
    const email = prompt("Ingresa tu correo de Google para acceder a la beta:", defaultEmail);
    if (!email || !email.trim()) return;
    const name = prompt("Ingresa tu nombre y apellido:", "Estudiante de Grado");
    const mockToken = `mock-google-token:sub-${Date.now()}:${email.trim()}:${name ? name.trim() : "Estudiante"}:`;
    this.handleGoogleCredential(mockToken);
  },

  // Modal de código de acceso
  openAccessCodeModal() {
    const modal = document.getElementById("access-code-modal");
    if (!modal) return;

    const greetingEl = document.getElementById("access-code-user-greeting");
    if (greetingEl && this.pendingUserPreview) {
      const escape = (str) => typeof SecurityShield !== "undefined" ? SecurityShield.escapeHtml(str) : String(str || "");
      const safeName = escape(this.pendingUserPreview.name || this.pendingUserPreview.email);
      greetingEl.innerHTML = `¡Hola, <strong>${safeName}</strong>! Para ingresar a la beta privada, vincula tu código de invitación.`;
    }

    const input = document.getElementById("input-access-code");
    if (input) {
      input.value = "";
      input.focus();
    }
    const errEl = document.getElementById("access-code-error-msg");
    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }

    modal.classList.remove("hidden");
  },

  closeAccessCodeModal() {
    const modal = document.getElementById("access-code-modal");
    if (modal) modal.classList.add("hidden");
  },

  setupModalListeners() {
    const btnClose = document.getElementById("btn-close-access-modal");
    if (btnClose) {
      btnClose.addEventListener("click", () => this.closeAccessCodeModal());
    }

    const btnSubmit = document.getElementById("btn-submit-access-code");
    const inputCode = document.getElementById("input-access-code");
    const errEl = document.getElementById("access-code-error-msg");

    const doSubmit = async () => {
      if (!inputCode) return;
      const code = inputCode.value.trim();
      if (!code) {
        if (errEl) {
          errEl.textContent = "Por favor ingresa tu código de acceso.";
          errEl.style.display = "block";
        }
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = "<span>Vinculando...</span>";
      }

      const res = await this.linkAccessCode(code);

      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i data-lucide="link"></i><span>Vincular y Comenzar</span>';
        if (typeof lucide !== "undefined") lucide.createIcons();
      }

      if (!res.ok) {
        if (errEl) {
          errEl.textContent = res.error || "Código inválido";
          errEl.style.display = "block";
        }
      }
    };

    if (btnSubmit) {
      btnSubmit.addEventListener("click", doSubmit);
    }
    if (inputCode) {
      inputCode.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          doSubmit();
        }
      });
      inputCode.addEventListener("input", () => {
        inputCode.value = inputCode.value.toUpperCase();
      });
    }
  }
};

// Exportación modular para navegador y entornos CommonJS (Node.js)
if (typeof window !== "undefined") window.AuthService = AuthService;
if (typeof globalThis !== "undefined") globalThis.AuthService = AuthService;
if (typeof module !== "undefined" && module.exports) module.exports = AuthService;
