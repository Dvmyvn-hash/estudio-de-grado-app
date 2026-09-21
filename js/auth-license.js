/**
 * GESTOR DE AUTENTICACIÓN, LICENCIAS Y CONTROL DE ACCESO
 * Maneja el Modo Demo, validación de códigos de activación y el Panel de Administrador.
 */

const LicenseService = {
  // Hash criptográfico SHA-256 de la clave de administración (previene exposición de credenciales en GitHub)
  ADMIN_PIN_HASH: "75cfc5343b1e254fc0e4f909e980e14cda4d24dc223718749855ba3ec28457d8",
  STORAGE_LICENSE_KEY: "estudio_grado_user_license",
  STORAGE_ALL_CODES_KEY: "estudio_grado_issued_licenses",

  STORAGE_ADMIN_KEY: "estudio_grado_admin_session",
  STORAGE_ADMIN_PIN_KEY: "estudio_grado_admin_pin",

  // Verificación criptográfica segura de la clave de administración
  async verifyAdminPin(enteredPin) {
    if (!enteredPin || typeof enteredPin !== "string") return false;
    try {
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(enteredPin.trim());
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        const isValid = hashHex === this.ADMIN_PIN_HASH;
        if (isValid) {
          sessionStorage.setItem(this.STORAGE_ADMIN_PIN_KEY, enteredPin.trim());
        }
        return isValid;
      }
    } catch (e) {
      console.warn("Crypto API no disponible para verificación de PIN:", e);
    }
    return false;
  },

  getAdminPin() {
    return sessionStorage.getItem(this.STORAGE_ADMIN_PIN_KEY) || "";
  },

  // Modo Administrador
  isAdminMode() {
    return sessionStorage.getItem(this.STORAGE_ADMIN_KEY) === "true";
  },

  setAdminMode(val) {
    if (val) {
      sessionStorage.setItem(this.STORAGE_ADMIN_KEY, "true");
    } else {
      sessionStorage.removeItem(this.STORAGE_ADMIN_KEY);
      sessionStorage.removeItem(this.STORAGE_ADMIN_PIN_KEY);
    }
  },

  // Permiso para agregar, editar e importar notas (Admin o cuenta con rol gestor)
  canManageNotes() {
    if (this.isAdminMode()) return true;
    const lic = this.getCurrentLicense();
    if (lic && !lic.expired && (lic.role === 'admin' || lic.role === 'manager' || lic.canManageNotes === true)) {
      return true;
    }
    return false;
  },

  // 1. Obtener la licencia actual del usuario en este navegador
  getCurrentLicense() {
    try {
      const stored = localStorage.getItem(this.STORAGE_LICENSE_KEY);
      if (stored) {
        const lic = JSON.parse(stored);
        // Comprobar si ha expirado
        if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
          lic.expired = true;
          return lic;
        }
        return lic;
      }
    } catch (e) {
      console.warn("Error leyendo licencia:", e);
    }
    // Comprobar si el usuario conectado con Google tiene cuenta convalidada
    if (typeof AuthService !== "undefined" && AuthService.currentUser && AuthService.currentUser.access_code && !AuthService.currentUser.isDemo) {
      return {
        code: AuthService.currentUser.access_code,
        scope: "all",
        studentName: AuthService.currentUser.name || "Estudiante de Grado",
        email: AuthService.currentUser.email,
        canManageNotes: false,
        role: "student",
        activatedAt: new Date().toISOString(),
        expiresAt: null,
        days: 180
      };
    }

    return null; // Sin licencia = Modo Demo
  },

  // Comprobar si el usuario opera en Modo Demo (sin Pase Activo convalidado)
  isDemoMode() {
    if (this.isAdminMode()) return false;
    const lic = this.getCurrentLicense();
    return !lic || Boolean(lic.expired);
  },

  // 2. Verificar si un tema o caso específico está desbloqueado
  isContentUnlocked(item, type = "topic") {
    // Si es Administrador, tiene acceso total irrestricto a todas las cédulas
    if (this.isAdminMode()) return true;

    const lic = this.getCurrentLicense();
    if (lic && !lic.expired) {
      if (lic.scope === "all") return true;
      if (item.subject && lic.scope === item.subject) return true;
      if (item.subjects && item.subjects.some(s => s === lic.scope)) return true;
    }

    // Los casos generados dinámicamente por la IA en el taller de práctica son siempre accesibles
    if (item.isGeneratedByAI || (item.id && item.id.startsWith("caso-ia-"))) {
      return true;
    }

    // Contenido liberado para Modo Demo (para que prueben la plataforma)
    if (item.isFree || item.id === "civil-acto-juridico" || item.id === "procesal-ordinario-discusion" || item.id === "caso-01-error-sustancial-proceso") {
      return true;
    }

    return false; // Bloqueado por paywall
  },

  // 3. Activar una licencia ingresada por el estudiante
  activateCode(inputCode) {
    const clean = inputCode.trim().toUpperCase();
    const issuedCodes = this.getAllIssuedCodes();
    
    // Buscar en los códigos emitidos
    const found = issuedCodes.find(c => c.code === clean);
    if (!found) {
      return { success: false, error: "El código de activación ingresado no es válido o ya caducó." };
    }

    if (found.revoked) {
      return { success: false, error: "Este código de licencia ha sido revocado." };
    }

    // Calcular fecha de expiración
    let expiresAt = null;
    if (found.days && found.days > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + parseInt(found.days));
      expiresAt = expDate.toISOString();
    }

    const userLicense = {
      code: found.code,
      scope: found.scope || "all",
      studentName: found.studentName || "Estudiante de Grado",
      canManageNotes: !!found.canManageNotes,
      role: found.role || (found.canManageNotes ? "manager" : "student"),
      activatedAt: new Date().toISOString(),
      expiresAt: expiresAt,
      days: found.days
    };

    localStorage.setItem(this.STORAGE_LICENSE_KEY, JSON.stringify(userLicense));

    // Marcar código como usado en la base de licencias
    found.uses = (found.uses || 0) + 1;
    found.lastActivatedAt = new Date().toISOString();
    this.saveIssuedCodes(issuedCodes);

    return { success: true, license: userLicense };
  },

  // 4. Panel de Admin: Generar nuevo código de licencia
  async generateCode(options = {}) {
    const scope = options.scope || "all"; // 'all', 'civil', 'procesal', 'constitucional'
    const days = options.days !== undefined ? options.days : 180; // 180 días (semestre de grado) o 0 (perpetua)
    const studentName = options.studentName || "Alumno";
    const studentEmail = (options.studentEmail || options.email || "").trim().toLowerCase();
    const canManageNotes = !!options.canManageNotes;

    let code = "";
    if (options.customCode && options.customCode.trim()) {
      code = options.customCode.trim().toUpperCase().replace(/[\s\u200b\u00a0]+/g, "");
    } else {
      const prefix = canManageNotes
        ? "GRADO-DOC"
        : (scope === "all" ? "GRADO-FULL" : `GRADO-${scope.toUpperCase()}`);
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      code = `${prefix}-${randomHex}-${randomNum}`;
    }

    const newLicense = {
      code,
      scope,
      days: parseInt(days),
      studentName,
      assignedEmail: studentEmail,
      linkedEmail: studentEmail || "",
      canManageNotes,
      role: canManageNotes ? "manager" : "student",
      createdAt: new Date().toISOString(),
      uses: 0,
      max_uses: 1,
      revoked: false
    };

    // Si hay backend disponible, persistir atómicamente en SQLite
    try {
      const adminPin = this.getAdminPin();
      const res = await fetch("/api/admin/create-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-PIN": adminPin
        },
        body: JSON.stringify({
          code,
          label: studentName,
          scope,
          days: parseInt(days),
          max_uses: 1,
          canManageNotes,
          email: studentEmail,
          assigned_email: studentEmail,
          pin: adminPin
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        return { success: false, error: data.error || `El código ${code} ya existe en el sistema.` };
      }
      if (!res.ok && res.status !== 404) {
        return { success: false, error: data.error || "No se pudo registrar el código en el servidor." };
      }
    } catch (e) {
      console.warn("Servidor no disponible para guardar código, guardando localmente:", e);
    }

    const list = this.getAllIssuedCodes();
    const existingIdx = list.findIndex(c => c.code === code);
    if (existingIdx >= 0) {
      list[existingIdx] = newLicense;
    } else {
      list.unshift(newLicense);
    }
    this.saveIssuedCodes(list);

    return { success: true, license: newLicense, code: newLicense.code };
  },

  // 5. Obtener todos los códigos emitidos (sincronizado con el servidor SQLite si está disponible)
  async fetchAdminCodes() {
    const adminPin = this.getAdminPin();
    if (adminPin) {
      try {
        const res = await fetch("/api/admin/codes", {
          headers: { "X-Admin-PIN": adminPin }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && Array.isArray(data.codes)) {
          const serverCodes = data.codes.map(c => ({
            code: c.code,
            studentName: c.label || "Sin asignar",
            scope: "all",
            days: c.expires_at ? Math.max(1, Math.round((c.expires_at - c.created_at) / 86400000)) : 0,
            uses: c.times_used,
            max_uses: c.max_uses,
            revoked: c.active !== 1,
            expires_at: c.expires_at,
            canManageNotes: (c.code || "").startsWith("GRADO-DOC"),
            linkedEmail: c.linked_emails || c.associated_email || c.assigned_email || "",
            assignedEmail: c.assigned_email || ""
          }));
          this.saveIssuedCodes(serverCodes);
          return serverCodes;
        }
      } catch (e) {
        console.warn("Error sincronizando códigos del servidor:", e);
      }
    }
    return this.getAllIssuedCodes();
  },

  getAllIssuedCodes() {
    try {
      const stored = localStorage.getItem(this.STORAGE_ALL_CODES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Error leyendo códigos emitidos:", e);
    }

    // Códigos iniciales de prueba listos para usar
    const initialCodes = [
      {
        code: "GRADO-DOCENTE-2026",
        scope: "all",
        days: 0,
        canManageNotes: true,
        role: "manager",
        studentName: "Profesor / Ayudante Autorizado",
        createdAt: new Date().toISOString(),
        uses: 0,
        revoked: false
      },
      {
        code: "GRADO-VIP-2026",
        scope: "all",
        days: 180,
        canManageNotes: false,
        role: "student",
        studentName: "Pase Semestral de Grado",
        createdAt: new Date().toISOString(),
        uses: 0,
        revoked: false
      },
      {
        code: "GRADO-CIVIL-PRO",
        scope: "civil",
        days: 90,
        canManageNotes: false,
        role: "student",
        studentName: "Pase Especial Derecho Civil",
        createdAt: new Date().toISOString(),
        uses: 0,
        revoked: false
      }
    ];
    this.saveIssuedCodes(initialCodes);
    return initialCodes;
  },

  saveIssuedCodes(list) {
    try {
      localStorage.setItem(this.STORAGE_ALL_CODES_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Error guardando códigos emitidos:", e);
    }
  },

  async revokeCode(code) {
    const adminPin = this.getAdminPin();
    if (adminPin) {
      try {
        await fetch("/api/admin/revoke-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-PIN": adminPin
          },
          body: JSON.stringify({ code, pin: adminPin })
        });
      } catch (e) {
        console.warn("Error revocando código en servidor:", e);
      }
    }
    const list = this.getAllIssuedCodes();
    const item = list.find(c => c.code === code);
    if (item) {
      item.revoked = true;
      this.saveIssuedCodes(list);
      return true;
    }
    return false;
  },

  removeCurrentLicense() {
    localStorage.removeItem(this.STORAGE_LICENSE_KEY);
  }
};

if (typeof window !== "undefined") window.LicenseService = LicenseService;
if (typeof globalThis !== "undefined") globalThis.LicenseService = LicenseService;
if (typeof module !== "undefined" && module.exports) module.exports = LicenseService;
