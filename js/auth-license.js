/**
 * GESTOR DE AUTENTICACIÓN, LICENCIAS Y CONTROL DE ACCESO
 * Maneja el Modo Demo, validación de códigos de activación y el Panel de Administrador.
 */

const LicenseService = {
  // Hash criptográfico SHA-256 de la clave de administración (previene exposición de credenciales en GitHub)
  ADMIN_PIN_HASH: "75cfc5343b1e254fc0e4f909e980e14cda4d24dc223718749855ba3ec28457d8",
  // Hash SHA-256 de la clave de PRESENTACIÓN DOCENTE (v7.16, PROMPT 013): misma experiencia
  // visual de administrador, pero SIN permisos de gestión (no genera/revoca códigos ni
  // gestiona/sube/importa/descarga archivos). Nunca en texto plano en el repo.
  DOCENTE_PIN_HASH: "28f5e0c2764fecec65663fe4d72aff9330340a18e02232362c92a07736b808ba",
  STORAGE_LICENSE_KEY: "estudio_grado_user_license",
  STORAGE_ALL_CODES_KEY: "estudio_grado_issued_licenses",

  STORAGE_ADMIN_KEY: "estudio_grado_admin_session",
  STORAGE_ADMIN_PIN_KEY: "estudio_grado_admin_pin",
  STORAGE_ADMIN_ROLE_KEY: "estudio_grado_admin_role",

  // Verificación criptográfica segura de la clave de administración.
  // Retorna el rol ("admin" | "docente") si es válida, o null si no lo es.
  async verifyAdminPin(enteredPin) {
    if (!enteredPin || typeof enteredPin !== "string") return null;
    try {
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(enteredPin.trim());
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        let role = null;
        if (hashHex === this.ADMIN_PIN_HASH) {
          role = "admin";
        } else if (hashHex === this.DOCENTE_PIN_HASH) {
          role = "docente";
        }
        if (role) {
          sessionStorage.setItem(this.STORAGE_ADMIN_PIN_KEY, enteredPin.trim());
          sessionStorage.setItem(this.STORAGE_ADMIN_ROLE_KEY, role);
        }
        return role;
      }
    } catch (e) {
      console.warn("Crypto API no disponible para verificación de PIN:", e);
    }
    return null;
  },

  getAdminPin() {
    return sessionStorage.getItem(this.STORAGE_ADMIN_PIN_KEY) || "";
  },

  // Rol de la sesión de administración activa: "admin" | "docente" | ""
  getAdminRole() {
    return sessionStorage.getItem(this.STORAGE_ADMIN_ROLE_KEY) || "";
  },

  // Rol pleno de gestión (generar/revocar/listar códigos, subir/importar/exportar archivos)
  isFullAdmin() {
    return this.getAdminRole() === "admin";
  },

  // Cuenta de presentación docente: visualización y prueba de herramientas, sin gestión
  isDocente() {
    return this.getAdminRole() === "docente";
  },

  // Modo Administrador (rol pleno 'admin' o cuenta de presentación 'docente'):
  // ambos desbloquean todo el contenido y ven el panel; difieren solo en permisos de gestión.
  isAdminMode() {
    return sessionStorage.getItem(this.STORAGE_ADMIN_KEY) === "true";
  },

  setAdminMode(val, role) {
    if (val) {
      sessionStorage.setItem(this.STORAGE_ADMIN_KEY, "true");
      sessionStorage.setItem(this.STORAGE_ADMIN_ROLE_KEY, role || "admin");
    } else {
      sessionStorage.removeItem(this.STORAGE_ADMIN_KEY);
      sessionStorage.removeItem(this.STORAGE_ADMIN_PIN_KEY);
      sessionStorage.removeItem(this.STORAGE_ADMIN_ROLE_KEY);
    }
  },

  // Permiso para agregar, editar e importar notas (rol pleno admin o cuenta con rol gestor)
  canManageNotes() {
    if (this.isFullAdmin()) return true;
    const lic = this.getCurrentLicense();
    if (lic && !lic.expired && (lic.role === 'admin' || lic.role === 'manager' || lic.canManageNotes === true)) {
      return true;
    }
    return false;
  },

  // 1. Obtener la licencia actual del usuario en este navegador
  getCurrentLicense() {
    // Prioridad absoluta a la verdad del servidor (AuthService.currentUser)
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

    // Fallback cuando no hay sesión del servidor activa (modo offline / estático)
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

    return null; // Sin licencia = Modo Demo
  },

  // Comprobar si el usuario opera en Modo Demo (sin Pase Activo convalidado)
  isDemoMode() {
    if (this.isAdminMode()) return false;

    // Prioridad absoluta a la sesión activa validada por el servidor
    if (typeof AuthService !== "undefined" && AuthService.currentUser) {
      if (AuthService.currentUser.access_code && !AuthService.currentUser.isDemo) {
        return false;
      }
      if (AuthService.currentUser.isDemo) {
        return true;
      }
    }

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
    // Modo Presentación Docente (v7.16): nunca generar códigos; defensa en profundidad sin fetch.
    if (this.isDocente()) {
      return { success: false, error: "Modo Presentación Docente: sin permisos de gestión." };
    }
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
    // Modo Presentación Docente (v7.16): sin acceso al listado de códigos; sin fetch.
    if (this.isDocente()) return [];
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
            label: c.label || "",
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

  // 5b. Generar lote de códigos (1 a 50) de forma atómica
  async generateBatchCodes(options = {}) {
    if (this.isDocente()) {
      return { success: false, error: "Modo Presentación Docente: sin permisos de gestión." };
    }
    const count = Math.min(50, Math.max(1, parseInt(options.count) || 1));
    const scope = options.scope || "all";
    const canManageNotes = !!options.canManageNotes;
    const defaultPrefix = canManageNotes
      ? "GRADO-DOC"
      : (scope === "all" ? "GRADO-FULL" : `GRADO-${scope.toUpperCase()}`);
    const prefix = (options.prefix || defaultPrefix).trim().toUpperCase();
    const label = (options.label || options.studentName || "Lote-General").trim();
    const assignedEmail = (options.studentEmail || options.email || options.assignedEmail || "").trim().toLowerCase() || null;
    const days = options.days !== undefined ? parseInt(options.days) : 180;
    const expiresAt = days > 0 ? (Date.now() + days * 86400000) : null;

    const adminPin = this.getAdminPin();
    if (adminPin) {
      try {
        const res = await fetch("/api/admin/create-code-batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-PIN": adminPin
          },
          body: JSON.stringify({
            count,
            prefix,
            label,
            assigned_email: assignedEmail,
            max_uses: 1,
            expires_at: expiresAt,
            pin: adminPin
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { success: false, error: data.error || "Error al generar lote en servidor." };
        }

        if (data.ok && Array.isArray(data.items)) {
          const newCodes = data.items.map(item => ({
            code: item.code,
            label: item.label,
            studentName: item.label,
            scope,
            days,
            uses: 0,
            max_uses: item.max_uses || 1,
            revoked: false,
            expires_at: item.expires_at,
            canManageNotes,
            role: canManageNotes ? "manager" : "student",
            createdAt: new Date(item.created_at || Date.now()).toISOString(),
            assignedEmail: item.assigned_email || "",
            linkedEmail: item.assigned_email || ""
          }));

          const list = this.getAllIssuedCodes();
          list.unshift(...newCodes);
          this.saveIssuedCodes(list);
          return { success: true, count: data.count, codes: data.codes, items: newCodes };
        }
      } catch (e) {
        console.warn("Servidor no disponible para lote, fallback local:", e);
      }
    }

    // Fallback local si backend no responde
    const localItems = [];
    for (let i = 0; i < count; i++) {
      const res = await this.generateCode({
        ...options,
        customCode: null,
        studentName: label,
        studentEmail: assignedEmail
      });
      if (res.success && res.license) {
        localItems.push(res.license);
      }
    }
    return {
      success: localItems.length > 0,
      count: localItems.length,
      codes: localItems.map(c => c.code),
      items: localItems
    };
  },

  // 5c. Purgar códigos ociosos con soporte de simulacro (dry_run)
  async purgeUnusedCodes(options = {}) {
    if (this.isDocente()) {
      return { success: false, error: "Modo Presentación Docente: sin permisos de gestión." };
    }
    const dryRun = options.dryRun !== false && options.dry_run !== false;
    const adminPin = this.getAdminPin();
    if (adminPin) {
      try {
        const res = await fetch("/api/admin/purge-codes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-PIN": adminPin
          },
          body: JSON.stringify({
            dry_run: dryRun,
            older_than_days: options.older_than_days || options.olderThanDays || null,
            prefix: options.prefix || null,
            pin: adminPin
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { success: false, error: data.error || "Error al purgar códigos en el servidor." };
        }

        if (!dryRun && Array.isArray(data.purged) && data.purged.length > 0) {
          const purgedSet = new Set(data.purged);
          const list = this.getAllIssuedCodes().filter(c => !purgedSet.has(c.code));
          this.saveIssuedCodes(list);
        }

        return {
          success: true,
          dryRun: data.dry_run,
          count: data.count,
          codes: data.codes || []
        };
      } catch (e) {
        return { success: false, error: "Error de red al consultar purga de códigos: " + e.message };
      }
    }
    return { success: false, error: "PIN de administrador no configurado." };
  },

  // 5d. Actualizar etiqueta de estado ([PENDIENTE] / [ENTREGADO])
  async updateCodeLabel(code, label) {
    if (this.isDocente()) {
      return { success: false, error: "Modo Presentación Docente: sin permisos de gestión." };
    }
    const cleanCode = (code || "").trim().toUpperCase().replace(/[\s\u200b\u00a0]+/g, "");
    if (!cleanCode) {
      return { success: false, error: "Código requerido." };
    }
    const newLabel = (label || "").trim();
    const adminPin = this.getAdminPin();
    if (adminPin) {
      try {
        const res = await fetch("/api/admin/update-code-label", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-PIN": adminPin
          },
          body: JSON.stringify({
            code: cleanCode,
            label: newLabel,
            pin: adminPin
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { success: false, error: data.error || "Error al actualizar etiqueta." };
        }
      } catch (e) {
        console.warn("Error actualizando etiqueta en servidor:", e);
      }
    }

    const list = this.getAllIssuedCodes();
    const item = list.find(c => c.code === cleanCode);
    if (item) {
      item.label = newLabel;
      item.studentName = newLabel || "Sin asignar";
      this.saveIssuedCodes(list);
    }
    return { success: true, code: cleanCode, label: newLabel };
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
    // Modo Presentación Docente (v7.16): nunca revocar códigos; sin fetch.
    if (this.isDocente()) return false;
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
