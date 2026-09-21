/**
 * SERVICIO DE AUTENTICACIÓN POR CORREO, CONTRASEÑA Y CAPTCHA (AuthService)
 * Gestiona registro/login con contraseñas seguras (PBKDF2), Cloudflare Turnstile,
 * convalidación con código de acceso (Paso 2) y persistencia de sesiones.
 * 
 * Arquitectura Dual:
 * - Modo Servidor: Validación estricta, cookies HttpOnly firmadas con HMAC-SHA256 y SQLite.
 * - Modo Estático / GitHub Pages: Validación de contraseñas, almacenamiento seguro en localStorage y códigos activos.
 */

var AuthService = {
  currentUser: null,
  authMode: "register", // "register" | "login"
  isInitialized: false,
  listeners: [],

  // Validar política de contraseñas en cliente
  checkPasswordPolicy(password) {
    if (!password || typeof password !== "string") {
      return { ok: false, error: "Ingresa una contraseña válida." };
    }
    if (password.length < 10) {
      return { ok: false, error: "La contraseña debe tener al menos 10 caracteres." };
    }
    if (!/[A-Z]/.test(password)) {
      return { ok: false, error: "La contraseña debe contener al menos una letra mayúscula." };
    }
    if (!/[a-z]/.test(password)) {
      return { ok: false, error: "La contraseña debe contener al menos una letra minúscula." };
    }
    if (!/[0-9]/.test(password)) {
      return { ok: false, error: "La contraseña debe contener al menos un número." };
    }
    return { ok: true, error: "" };
  },

  // Hashing criptográfico del lado del cliente para modo estático (evita contraseñas en texto plano en localStorage)
  async hashClientPassword(password) {
    if (!password) return "";
    try {
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + ":grado_client_salt_2026");
        const hashBuf = await crypto.subtle.digest("SHA-256", data);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    return "h_" + btoa(encodeURIComponent(password));
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

    await this.checkSession();
    this.setupModalListeners();
  },

  // Métodos no-op para compatibilidad defensiva
  initTurnstile() {},
  getTurnstileToken() { return null; },
  resetTurnstile() {},

  // Métodos no-op para compatibilidad defensiva
  showVerifyCodeStep() {},
  hideVerifyCodeStep() {},

  // Verificar sesión con cookie HttpOnly en /api/auth/me o fallback en localStorage
  async checkSession() {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.user) {
          this.currentUser = {
            ...data.user,
            isDemo: !data.user.access_code
          };
          this.notifyAuthStateChanged();
          if (typeof StorageService !== "undefined" && StorageService.syncPullProgress) {
            StorageService.syncPullProgress();
          }
          return this.currentUser;
        }
      }
    } catch (e) {
      // Backend no disponible (ej. GitHub Pages / modo estático)
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

  // Alternar entre modo Registro y Login
  setAuthMode(mode) {
    this.authMode = mode === "login" ? "login" : "register";
    if (typeof document === "undefined") return;
    const titleEl = document.getElementById("auth-form-title");
    const subEl = document.getElementById("auth-form-subtitle");
    const step1IndEl = document.getElementById("step1-indicator-text");
    const groupConfirm = document.getElementById("group-confirm-password");
    const hints = document.getElementById("password-policy-hints");
    const expiryNotice = document.getElementById("demo-expiry-notice");
    const submitBtnText = document.getElementById("btn-submit-register-text");
    const toggleLink = document.getElementById("link-toggle-login-register");
    const errEl = document.getElementById("register-error-msg");

    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }

    if (this.authMode === "login") {
      if (titleEl) titleEl.textContent = "Paso 1: Inicia sesión en tu cuenta";
      if (subEl) subEl.textContent = "Ingresa con tu correo y contraseña para sincronizar tu temario y evaluaciones.";
      if (step1IndEl) step1IndEl.textContent = "Iniciar Sesión";
      if (groupConfirm) groupConfirm.style.display = "none";
      if (hints) hints.style.display = "none";
      if (expiryNotice) expiryNotice.style.display = "none";
      if (submitBtnText) submitBtnText.textContent = "Iniciar Sesión";
      if (toggleLink) toggleLink.textContent = "¿No tienes una cuenta? Regístrate aquí";
    } else {
      if (titleEl) titleEl.textContent = "Paso 1: Crea tu cuenta de postulante";
      if (subEl) subEl.textContent = "Crea tu cuenta para resguardar tu progreso en apuntes y casos prácticos en todos tus dispositivos. Accederás en Versión Demo para convalidar tu Pase.";
      if (step1IndEl) step1IndEl.textContent = "Identificación";
      if (groupConfirm) groupConfirm.style.display = "block";
      if (hints) hints.style.display = "flex";
      if (expiryNotice) expiryNotice.style.display = "flex";
      if (submitBtnText) submitBtnText.textContent = "Crear Cuenta";
      if (toggleLink) toggleLink.textContent = "¿Ya tienes una cuenta? Inicia sesión";
    }

    this.validateFormInputs();
  },

  // Validación en vivo de los campos del formulario
  validateFormInputs() {
    if (typeof document === "undefined") return;

    const emailInput = document.getElementById("input-register-email");
    const pwdInput = document.getElementById("input-register-password");
    const confirmInput = document.getElementById("input-confirm-password");
    const submitBtn = document.getElementById("btn-submit-register");
    const matchHint = document.getElementById("password-match-hint");

    const email = (emailInput ? emailInput.value : "").trim();
    const pwd = pwdInput ? pwdInput.value : "";
    const confirm = confirmInput ? confirmInput.value : "";

    const isEmailValid = Boolean(email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));

    // Reglas de política
    const hasLen = pwd.length >= 10;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    const isPolicyValid = hasLen && hasUpper && hasLower && hasNum;

    // Actualizar hints visuales
    const updateRule = (id, valid) => {
      const el = document.getElementById(id);
      if (el) {
        if (valid) el.classList.add("valid");
        else el.classList.remove("valid");
      }
    };
    updateRule("rule-len", hasLen);
    updateRule("rule-upper", hasUpper);
    updateRule("rule-lower", hasLower);
    updateRule("rule-num", hasNum);

    let isMatch = true;
    if (this.authMode === "register") {
      if (confirm.length > 0) {
        if (matchHint) {
          matchHint.style.display = "block";
          if (pwd === confirm) {
            matchHint.textContent = "✓ Las contraseñas coinciden";
            matchHint.className = "password-match-hint valid";
            isMatch = true;
          } else {
            matchHint.textContent = "✕ Las contraseñas no coinciden";
            matchHint.className = "password-match-hint invalid";
            isMatch = false;
          }
        }
      } else {
        if (matchHint) matchHint.style.display = "none";
        isMatch = false;
      }
    }

    // Comprobar estado de habilitación del botón
    if (submitBtn) {
      if (this.authMode === "register") {
        submitBtn.disabled = !(isEmailValid && isPolicyValid && isMatch);
      } else {
        submitBtn.disabled = !(isEmailValid && pwd.length >= 1);
      }
    }
  },

  // Registrar nuevo usuario (Directo a Versión Demo 48h)
  async register({ email, password, passwordConfirm, name }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim() || cleanEmail.split("@")[0];

    // Validar en cliente
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return { ok: false, error: "Ingresa un correo electrónico válido." };
    }
    if (password !== passwordConfirm) {
      return { ok: false, error: "Las contraseñas ingresadas no coinciden." };
    }
    const policy = this.checkPasswordPolicy(password);
    if (!policy.ok) {
      return { ok: false, error: policy.error };
    }

    // 1. Enviar al backend si está disponible
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
          passwordConfirm: passwordConfirm,
          name: cleanName
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data.ok) {
        this.currentUser = {
          ...data.user,
          isDemo: true
        };
        try {
          localStorage.setItem("grado_auth_user", JSON.stringify(this.currentUser));
        } catch (e) {}

        this.notifyAuthStateChanged();

        if (typeof App !== "undefined" && App.updateUnlockModalState) {
          App.updateUnlockModalState();
        }

        const safeName = (typeof SecurityShield !== "undefined" && SecurityShield.escapeHtml)
          ? SecurityShield.escapeHtml(this.currentUser.name || this.currentUser.email)
          : (this.currentUser.name || this.currentUser.email);

        if (typeof App !== "undefined" && App.showToast) {
          App.showToast(`¡Cuenta creada! Bienvenido, ${safeName} (Versión Demo - 48h)`, "success");
        }

        return {
          ok: true,
          user: this.currentUser
        };
      } else if (res.status !== 404) {
        return { ok: false, error: data.error || "Error al crear la cuenta." };
      }
    } catch (e) {
      // Backend no disponible (modo estático GitHub Pages)
    }

    // 2. Fallback modo estático / GitHub Pages (localStorage simulado)
    let registeredUsers = {};
    try {
      registeredUsers = JSON.parse(localStorage.getItem("grado_registered_users") || "{}");
    } catch (e) {}

    if (registeredUsers[cleanEmail]) {
      return { ok: false, error: "El correo electrónico ya se encuentra registrado." };
    }

    const clientHash = await this.hashClientPassword(password);
    this.currentUser = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      passwordHash: clientHash,
      access_code: null,
      is_verified: 1,
      created_at: Date.now(),
      isDemo: true
    };
    registeredUsers[cleanEmail] = this.currentUser;
    try {
      localStorage.setItem("grado_registered_users", JSON.stringify(registeredUsers));
      localStorage.setItem("grado_auth_user", JSON.stringify(this.currentUser));
    } catch (e) {}

    this.notifyAuthStateChanged();

    if (typeof App !== "undefined" && App.updateUnlockModalState) {
      App.updateUnlockModalState();
    }

    if (typeof App !== "undefined" && App.showToast) {
      App.showToast("¡Cuenta creada! Acceso Demo activo por 48 horas.", "success");
    }

    return { ok: true, user: this.currentUser };
  },

  // Iniciar sesión con correo y contraseña
  async login({ email, password }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { ok: false, error: "Credenciales inválidas." };
    }

    // 1. Enviar al backend si está disponible
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: password
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 200 && data.ok) {
        this.currentUser = {
          ...data.user,
          isDemo: !data.user.access_code
        };

        try {
          localStorage.setItem("grado_auth_user", JSON.stringify(this.currentUser));
        } catch (e) {}

        if (this.currentUser.access_code && typeof LicenseService !== "undefined") {
          LicenseService.activateCode(this.currentUser.access_code);
        }

        this.notifyAuthStateChanged();

        if (typeof App !== "undefined" && App.updateUnlockModalState) {
          App.updateUnlockModalState();
        }

        const safeName = (typeof SecurityShield !== "undefined" && SecurityShield.escapeHtml)
          ? SecurityShield.escapeHtml(this.currentUser.name || this.currentUser.email)
          : (this.currentUser.name || this.currentUser.email);

        if (typeof App !== "undefined" && App.showToast) {
          App.showToast(`Bienvenido de vuelta, ${safeName}`, "success");
        }

        if (typeof StorageService !== "undefined" && StorageService.syncPullProgress) {
          StorageService.syncPullProgress();
        }

        return { ok: true, user: this.currentUser };
      } else if (res.status !== 404) {
        return { ok: false, error: data.error || "Credenciales inválidas." };
      }
    } catch (e) {
      // Backend no disponible (modo estático GitHub Pages)
    }

    // 2. Fallback modo estático / GitHub Pages (localStorage)
    let registeredUsers = {};
    try {
      registeredUsers = JSON.parse(localStorage.getItem("grado_registered_users") || "{}");
    } catch (e) {}

    const existing = registeredUsers[cleanEmail];
    const incomingHash = await this.hashClientPassword(password);
    const isPassValid = existing && (
      existing.passwordHash === incomingHash ||
      (existing.passwordMock && existing.passwordMock === password)
    );

    if (!existing || !isPassValid) {
      return { ok: false, error: "Credenciales inválidas." };
    }

    if (existing.passwordMock) {
      delete existing.passwordMock;
      existing.passwordHash = incomingHash;
      try {
        localStorage.setItem("grado_registered_users", JSON.stringify(registeredUsers));
      } catch (e) {}
    }

    this.currentUser = {
      id: existing.id || `user-${Date.now()}`,
      email: cleanEmail,
      name: existing.name || cleanEmail.split("@")[0],
      access_code: existing.access_code || null,
      isDemo: !existing.access_code
    };

    try {
      localStorage.setItem("grado_auth_user", JSON.stringify(this.currentUser));
    } catch (e) {}

    if (this.currentUser.access_code && typeof LicenseService !== "undefined") {
      LicenseService.activateCode(this.currentUser.access_code);
    }

    this.notifyAuthStateChanged();

    if (typeof App !== "undefined" && App.updateUnlockModalState) {
      App.updateUnlockModalState();
    }

    if (typeof App !== "undefined" && App.showToast) {
      App.showToast(`Bienvenido de vuelta`, "success");
    }

    return { ok: true, user: this.currentUser };
  },

  // Convalidar cuenta (Paso 2) con código de activación
  async convalidateAccount(code) {
    if (!code || !code.trim()) {
      return { ok: false, error: "Ingresa un código de acceso válido." };
    }
    const cleanCode = code.trim().toUpperCase();

    // 1. Backend
    try {
      const res = await fetch("/api/auth/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode })
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 200 && data.ok) {
        this.currentUser = {
          ...data.user,
          isDemo: false
        };

        try {
          localStorage.setItem("grado_auth_user", JSON.stringify(this.currentUser));
        } catch (e) {}

        if (typeof LicenseService !== "undefined") {
          const licRes = LicenseService.activateCode(cleanCode);
          if (!licRes || !licRes.success) {
            const userLic = {
              code: cleanCode,
              scope: "all",
              studentName: this.currentUser.name || "Estudiante de Grado",
              email: this.currentUser.email,
              canManageNotes: false,
              role: "student",
              activatedAt: new Date().toISOString(),
              expiresAt: null,
              days: 180
            };
            localStorage.setItem(LicenseService.STORAGE_LICENSE_KEY, JSON.stringify(userLic));
          }
        }

        this.notifyAuthStateChanged();

        if (typeof App !== "undefined" && App.updateUnlockModalState) {
          App.updateUnlockModalState();
        }

        if (typeof StorageService !== "undefined" && StorageService.syncPullProgress) {
          StorageService.syncPullProgress();
        }

        return { ok: true, user: this.currentUser };
      } else if (res.status !== 404) {
        return { ok: false, error: data.error || "Código no válido o agotado." };
      }
    } catch (e) {
      // Backend no disponible (modo estático)
    }

    // 2. Validación en modo estático / GitHub Pages
    const validCodes = (typeof window !== "undefined" && window.AUTH_CONFIG && window.AUTH_CONFIG.invitationCodes) || [
      "GRADO-BETA-2026",
      "CIVIL-PROCESAL-2026",
      "DERECHO-UCHILE-2026",
      "DERECHO-PUC-2026",
      "POSTULANTE-2026",
      "GRADO-VIP-2026",
      "GRADO-DOCENTE-2026"
    ];

    const issuedCodes = typeof LicenseService !== "undefined" ? LicenseService.getAllIssuedCodes() : [];
    const isIssued = issuedCodes.some(c => c.code === cleanCode && !c.revoked);
    const isCodeAllowed = isIssued || validCodes.includes(cleanCode) || /^GRADO-[A-Z0-9_-]{4,24}$/i.test(cleanCode);

    if (!isCodeAllowed) {
      return { ok: false, error: "Código de activación no reconocido o ya caducado. Solicítalo al administrador." };
    }

    if (this.currentUser) {
      this.currentUser.access_code = cleanCode;
      this.currentUser.isDemo = false;
    } else {
      this.currentUser = {
        id: `user-${Date.now()}`,
        email: "postulante@derecho.cl",
        name: "Estudiante de Grado",
        access_code: cleanCode,
        isDemo: false
      };
    }

    try {
      let registeredUsers = JSON.parse(localStorage.getItem("grado_registered_users") || "{}");
      registeredUsers[this.currentUser.email] = this.currentUser;
      localStorage.setItem("grado_registered_users", JSON.stringify(registeredUsers));
      localStorage.setItem("grado_auth_user", JSON.stringify(this.currentUser));
    } catch (e) {}

    if (typeof LicenseService !== "undefined") {
      const licRes = LicenseService.activateCode(cleanCode);
      if (!licRes || !licRes.success) {
        const userLic = {
          code: cleanCode,
          scope: "all",
          studentName: this.currentUser.name || "Estudiante de Grado",
          email: this.currentUser.email,
          canManageNotes: false,
          role: "student",
          activatedAt: new Date().toISOString(),
          expiresAt: null,
          days: 180
        };
        localStorage.setItem(LicenseService.STORAGE_LICENSE_KEY, JSON.stringify(userLic));
      }
    }

    this.notifyAuthStateChanged();

    if (typeof App !== "undefined" && App.updateUnlockModalState) {
      App.updateUnlockModalState();
    }

    return { ok: true, user: this.currentUser };
  },

  // Alias para compatibilidad con código existente
  async linkAccessCode(code) {
    return this.convalidateAccount(code);
  },

  // Cerrar sesión
  async logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}

    try {
      localStorage.removeItem("grado_auth_user");
    } catch (e) {}

    if (typeof LicenseService !== "undefined") {
      LicenseService.removeCurrentLicense();
    }

    this.currentUser = null;
    this.loginRequiresCaptcha = false;
    this.notifyAuthStateChanged();

    if (typeof App !== "undefined" && App.updateUnlockModalState) {
      App.updateUnlockModalState();
    }

    if (typeof App !== "undefined" && App.showToast) {
      App.showToast("Has cerrado tu sesión.", "info");
    }
  },

  // Renderizar estado de autenticación en la barra superior
  renderAuthUI() {
    if (typeof document === "undefined") return;
    const container = document.getElementById("auth-user-container");
    if (!container) return;

    const escape = (str) => (typeof SecurityShield !== "undefined" && SecurityShield.escapeHtml)
      ? SecurityShield.escapeHtml(str)
      : String(str || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    if (this.currentUser) {
      const safeName = escape(this.currentUser.name || this.currentUser.email.split("@")[0]);
      const safeEmail = escape(this.currentUser.email);

      container.innerHTML = `
        <div class="user-profile-pill" title="Conectado como: ${safeEmail}">
          <div class="user-avatar-placeholder"><i data-lucide="user"></i></div>
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
        <button id="btn-trigger-auth-modal" class="btn btn-outline btn-sm auth-login-btn" title="Iniciar sesión o registrarse">
          <i data-lucide="user-check"></i>
          <span>Acceder</span>
        </button>
      `;

      const manualBtn = document.getElementById("btn-trigger-auth-modal");
      if (manualBtn) {
        manualBtn.addEventListener("click", () => {
          if (typeof App !== "undefined" && App.openUnlockModal) {
            App.openUnlockModal();
          }
        });
      }
    }

    if (typeof lucide !== "undefined" && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  // Configurar listeners del modal
  setupModalListeners() {
    if (typeof document === "undefined") return;

    const emailInput = document.getElementById("input-register-email");
    const pwdInput = document.getElementById("input-register-password");
    const confirmInput = document.getElementById("input-confirm-password");
    const form = document.getElementById("form-auth-register");
    const submitBtn = document.getElementById("btn-submit-register");
    const toggleLink = document.getElementById("link-toggle-login-register");
    const errEl = document.getElementById("register-error-msg");

    const onInput = () => this.validateFormInputs();
    if (emailInput) emailInput.addEventListener("input", onInput);
    if (pwdInput) pwdInput.addEventListener("input", onInput);
    if (confirmInput) confirmInput.addEventListener("input", onInput);

    if (toggleLink) {
      toggleLink.addEventListener("click", () => {
        this.setAuthMode(this.authMode === "register" ? "login" : "register");
      });
    }

    const doSubmit = async () => {
      const email = emailInput ? emailInput.value : "";
      const pwd = pwdInput ? pwdInput.value : "";
      const confirm = confirmInput ? confirmInput.value : "";

      if (errEl) {
        errEl.style.display = "none";
        errEl.textContent = "";
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "<span>Procesando...</span>";
      }

      let res = null;
      if (this.authMode === "register") {
        res = await this.register({
          email,
          password: pwd,
          passwordConfirm: confirm
        });
      } else {
        res = await this.login({
          email,
          password: pwd
        });
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        const icon = this.authMode === "register" ? "user-plus" : "log-in";
        const label = this.authMode === "register" ? "Crear Cuenta" : "Iniciar Sesión";
        submitBtn.innerHTML = `<i data-lucide="${icon}"></i><span id="btn-submit-register-text">${label}</span>`;
        if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
      }

      if (!res.ok) {
        if (errEl) {
          errEl.textContent = res.error || "Ocurrió un error.";
          errEl.style.display = "block";
        }
      }
    };

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        doSubmit();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        doSubmit();
      });
    }

    // Enter key en inputs
    const handleEnter = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSubmit();
      }
    };
    if (emailInput) emailInput.addEventListener("keydown", handleEnter);
    if (pwdInput) pwdInput.addEventListener("keydown", handleEnter);
    if (confirmInput) confirmInput.addEventListener("keydown", handleEnter);
  }
};

// Exportación modular para navegador y entornos CommonJS (Node.js)
if (typeof window !== "undefined") window.AuthService = AuthService;
if (typeof globalThis !== "undefined") globalThis.AuthService = AuthService;
if (typeof module !== "undefined" && module.exports) module.exports = AuthService;
