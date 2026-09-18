/**
 * GESTOR DE AUTENTICACIÓN, LICENCIAS Y CONTROL DE ACCESO
 * Maneja el Modo Demo, validación de códigos de activación y el Panel de Administrador.
 */

const LicenseService = {
  ADMIN_PIN: "grado2026", // Contraseña por defecto para tu panel de administrador
  STORAGE_LICENSE_KEY: "estudio_grado_user_license",
  STORAGE_ALL_CODES_KEY: "estudio_grado_issued_licenses",

  STORAGE_ADMIN_KEY: "estudio_grado_admin_session",

  // Modo Administrador
  isAdminMode() {
    return sessionStorage.getItem(this.STORAGE_ADMIN_KEY) === "true";
  },

  setAdminMode(val) {
    if (val) {
      sessionStorage.setItem(this.STORAGE_ADMIN_KEY, "true");
    } else {
      sessionStorage.removeItem(this.STORAGE_ADMIN_KEY);
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
    return null; // Sin licencia = Modo Demo
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
  generateCode(options = {}) {
    const scope = options.scope || "all"; // 'all', 'civil', 'procesal', 'constitucional'
    const days = options.days || 180; // 180 días (semestre de grado) o 0 (perpetua)
    const studentName = options.studentName || "Alumno";
    const canManageNotes = !!options.canManageNotes;

    const prefix = canManageNotes
      ? "GRADO-DOC"
      : (scope === "all" ? "GRADO-FULL" : `GRADO-${scope.toUpperCase()}`);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}-${randomHex}-${randomNum}`;

    const newLicense = {
      code,
      scope,
      days: parseInt(days),
      studentName,
      canManageNotes,
      role: canManageNotes ? "manager" : "student",
      createdAt: new Date().toISOString(),
      uses: 0,
      revoked: false
    };

    const list = this.getAllIssuedCodes();
    list.unshift(newLicense);
    this.saveIssuedCodes(list);

    return newLicense;
  },

  // 5. Obtener todos los códigos emitidos
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

  revokeCode(code) {
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
