/**
 * GESTOR DE ALMACENAMIENTO LOCAL Y RESPALDOS (LocalStorage / JSON)
 * Permite guardar avances, nuevos temas agregados desde NotebookLM y respuestas de casos.
 */

const STORAGE_KEY = "estudio_de_grado_data_v4_connections";

const StorageService = {
  // Cargar datos (con migración transparente de progreso previo)
  getData() {
    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Migrar de versiones previas si existen preservando progreso
        const oldStored = localStorage.getItem("estudio_de_grado_data_v3_pure_notes") ||
                          localStorage.getItem("estudio_de_grado_data_v2_afg") ||
                          localStorage.getItem("estudio_de_grado_data_v1");
        const oldData = oldStored ? JSON.parse(oldStored) : {};
        const freshData = {
          ...INITIAL_DATA,
          userProgress: oldData.userProgress || {},
          caseDrafts: oldData.caseDrafts || {}
        };
        this.saveData(freshData);
        return freshData;
      } else {
        const parsed = JSON.parse(stored);
        // Asegurar que las conexiones dogmáticas actualizadas se reflejen siempre y sanear tópicos
        if (INITIAL_DATA && INITIAL_DATA.topics && Array.isArray(parsed.topics)) {
          const initMap = new Map(INITIAL_DATA.topics.map(t => [t.id, t]));
          const initKeyMap = new Map(INITIAL_DATA.topics.map(t => [`${t.subject}-${t.chapterNumber}-${t.code}`, t]));

          const dedupedMap = new Map();
          let needsSanitization = false;

          parsed.topics.forEach(t => {
            const canonical = initMap.get(t.id) || initKeyMap.get(`${t.subject}-${t.chapterNumber}-${t.code}`);
            const resolvedId = canonical ? canonical.id : t.id;
            const naturalKey = `${t.subject || 'civil'}-${t.chapterNumber || 1}-${t.code || '1.1'}`;

            if (t.id !== resolvedId) {
              needsSanitization = true;
            }

            if (!dedupedMap.has(naturalKey)) {
              if (canonical) {
                dedupedMap.set(naturalKey, { ...canonical, mastered: Boolean(t.mastered) });
              } else {
                dedupedMap.set(naturalKey, t);
              }
            } else {
              needsSanitization = true;
              const existing = dedupedMap.get(naturalKey);
              const isMastered = Boolean(existing.mastered || t.mastered);
              if (canonical) {
                dedupedMap.set(naturalKey, { ...canonical, mastered: isMastered });
              } else {
                existing.mastered = isMastered;
              }
            }
          });

          parsed.topics = Array.from(dedupedMap.values());
          if (needsSanitization) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            } catch (e) {}
          }
        }

        // Confidencialidad de Modelos y Expiración Temporal: Solo conservar casos generados por IA no expirados
        if (parsed.cases && Array.isArray(parsed.cases)) {
          const now = Date.now();
          parsed.cases = parsed.cases.filter(c => {
            const isAi = c.isGeneratedByAI === true || (c.id && c.id.startsWith("caso-ia-"));
            const notExpired = !c.expiresAt || c.expiresAt > now;
            return isAi && notExpired;
          });
        }

        // Asegurar estructura de topicQuizzes en el progreso de usuario
        if (!parsed.userProgress) parsed.userProgress = {};
        Object.keys(parsed.userProgress).forEach(k => {
          if (parsed.userProgress[k] && !parsed.userProgress[k].topicQuizzes) {
            parsed.userProgress[k].topicQuizzes = {};
          }
        });
        return parsed;
      }
    } catch (e) {
      console.warn("Error leyendo localStorage, usando INITIAL_DATA:", e);
    }
    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  },

  // Guardar datos completos
  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Error guardando en localStorage:", e);
      return false;
    }
  },

  // Agregar o actualizar un tema desde NotebookLM
  saveTopic(topic) {
    const data = this.getData();
    const index = data.topics.findIndex(t => t.id === topic.id);
    if (index >= 0) {
      data.topics[index] = { ...data.topics[index], ...topic, lastReviewed: new Date().toISOString().split("T")[0] };
    } else {
      data.topics.unshift({
        ...topic,
        id: topic.id || `topic-${Date.now()}`,
        mastered: false,
        lastReviewed: new Date().toISOString().split("T")[0]
      });
    }
    this.saveData(data);
    return data;
  },

  // Clave del usuario activo (según su licencia o demo)
  getActiveUserKey() {
    try {
      const lic = LicenseService.getCurrentLicense();
      if (lic && lic.code) return lic.code;
    } catch (e) {}
    return "demo_student";
  },

  // Obtener lista de IDs de temas dominados por un usuario específico
  getUserMasteredTopics(userKey = null) {
    const key = userKey || this.getActiveUserKey();
    const data = this.getData();
    if (!data.userProgress) data.userProgress = {};
    if (!data.userProgress[key]) data.userProgress[key] = { masteredTopicIds: [], lastActivity: null, topicQuizzes: {}, masteredTimestamps: {} };
    if (!data.userProgress[key].masteredTimestamps) data.userProgress[key].masteredTimestamps = {};
    return data.userProgress[key].masteredTopicIds || [];
  },

  // Marcar un tema como dominado de forma idempotente (usado por auto-completado de quiz)
  markTopicMastered(topicId, userKey = null) {
    const key = userKey || this.getActiveUserKey();
    const data = this.getData();
    if (!data.userProgress) data.userProgress = {};
    if (!data.userProgress[key]) data.userProgress[key] = { masteredTopicIds: [], lastActivity: null, topicQuizzes: {}, masteredTimestamps: {} };
    if (!data.userProgress[key].masteredTopicIds) data.userProgress[key].masteredTopicIds = [];
    if (!data.userProgress[key].masteredTimestamps) data.userProgress[key].masteredTimestamps = {};

    const list = data.userProgress[key].masteredTopicIds;
    let newlyAdded = false;
    if (!list.includes(topicId)) {
      list.push(topicId);
      newlyAdded = true;
    }
    const nowEpoch = Date.now();
    data.userProgress[key].masteredTimestamps[topicId] = nowEpoch;
    data.userProgress[key].lastActivity = new Date().toISOString();
    this.saveData(data);

    this._pushMasteryChange(topicId, true, nowEpoch);

    return { mastered: true, newlyAdded, masteredCount: list.length, timestamp: nowEpoch };
  },

  // Cambiar estado de dominio de un tema para el usuario activo
  toggleTopicMastery(topicId, userKey = null) {
    const key = userKey || this.getActiveUserKey();
    const data = this.getData();
    if (!data.userProgress) data.userProgress = {};
    if (!data.userProgress[key]) data.userProgress[key] = { masteredTopicIds: [], lastActivity: null, topicQuizzes: {}, masteredTimestamps: {} };
    if (!data.userProgress[key].masteredTimestamps) data.userProgress[key].masteredTimestamps = {};

    const list = data.userProgress[key].masteredTopicIds;
    const idx = list.indexOf(topicId);
    let isMastered = false;

    if (idx >= 0) {
      list.splice(idx, 1);
      isMastered = false;
    } else {
      list.push(topicId);
      isMastered = true;
    }

    const nowEpoch = Date.now();
    data.userProgress[key].masteredTimestamps[topicId] = nowEpoch;
    data.userProgress[key].lastActivity = new Date().toISOString();
    this.saveData(data);

    this._pushMasteryChange(topicId, isMastered, nowEpoch);

    return { isMastered, masteredCount: list.length, timestamp: nowEpoch };
  },

  // Comprobar si un tema específico está dominado por el usuario
  isTopicMasteredByUser(topicId, userKey = null) {
    const mastered = this.getUserMasteredTopics(userKey);
    return mastered.includes(topicId);
  },

  // Obtener estado del cuestionario de verificación de una cédula
  getTopicQuizState(topicId, userKey = null) {
    const key = userKey || this.getActiveUserKey();
    const data = this.getData();
    if (!data.userProgress || !data.userProgress[key] || !data.userProgress[key].topicQuizzes) {
      return null;
    }
    return data.userProgress[key].topicQuizzes[topicId] || null;
  },

  // Registrar respuesta a una pregunta del cuestionario de verificación
  recordTopicAnswer(topicId, qIndex, chosenLetter, correctLetter, userKey = null) {
    const key = userKey || this.getActiveUserKey();
    const data = this.getData();
    if (!data.userProgress) data.userProgress = {};
    if (!data.userProgress[key]) data.userProgress[key] = { masteredTopicIds: [], lastActivity: null, topicQuizzes: {} };
    if (!data.userProgress[key].topicQuizzes) data.userProgress[key].topicQuizzes = {};

    const quizzes = data.userProgress[key].topicQuizzes;
    const existing = quizzes[topicId] || {
      correctCount: 0,
      answers: [null, null, null, null],
      questionResults: [false, false, false, false],
      completed: false,
      completedAt: null,
      updatedAt: null
    };

    if (!existing.questionResults) existing.questionResults = [false, false, false, false];
    if (!Array.isArray(existing.answers)) existing.answers = [null, null, null, null];

    const isCorrect = (chosenLetter === correctLetter);
    existing.answers[qIndex] = chosenLetter;
    existing.questionResults[qIndex] = isCorrect;
    existing.correctCount = existing.questionResults.filter(Boolean).length;
    existing.updatedAt = new Date().toISOString();

    let newlyMastered = false;
    if (existing.correctCount === 4 && !existing.completed) {
      existing.completed = true;
      existing.completedAt = new Date().toISOString();
      if (!data.userProgress[key].masteredTopicIds) data.userProgress[key].masteredTopicIds = [];
      if (!data.userProgress[key].masteredTimestamps) data.userProgress[key].masteredTimestamps = {};
      const list = data.userProgress[key].masteredTopicIds;
      if (!list.includes(topicId)) {
        list.push(topicId);
        newlyMastered = true;
      }
      const nowEpoch = Date.now();
      data.userProgress[key].masteredTimestamps[topicId] = nowEpoch;
      this._pushMasteryChange(topicId, true, nowEpoch);
    }

    quizzes[topicId] = existing;
    data.userProgress[key].lastActivity = new Date().toISOString();
    this.saveData(data);

    return {
      isCorrect,
      correctCount: existing.correctCount,
      completed: existing.completed,
      newlyMastered
    };
  },

  // Comprobar si el cuestionario de una cédula fue completado con 4/4
  isTopicQuizCompleted(topicId, userKey = null) {
    const state = this.getTopicQuizState(topicId, userKey);
    return Boolean(state && state.completed);
  },

  // Reiniciar estado del cuestionario de una cédula
  resetTopicQuiz(topicId, userKey = null) {
    const key = userKey || this.getActiveUserKey();
    const data = this.getData();
    if (data.userProgress && data.userProgress[key] && data.userProgress[key].topicQuizzes) {
      delete data.userProgress[key].topicQuizzes[topicId];
      data.userProgress[key].lastActivity = new Date().toISOString();
      this.saveData(data);
      return true;
    }
    return false;
  },

  // Calcular porcentaje de avance por materia y total para un usuario
  calculateProgress(userKey = null, subjectFilter = "all") {
    const data = this.getData();
    const topics = data.topics || [];
    const masteredIds = new Set(this.getUserMasteredTopics(userKey));

    const relevantTopics = topics.filter(t => {
      if (subjectFilter === "all") return true;
      return t.subject === subjectFilter;
    });

    const total = relevantTopics.length;
    const mastered = relevantTopics.filter(t => masteredIds.has(t.id)).length;
    const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return { total, mastered, percent };
  },

  // Guardar borrador de respuesta de un caso práctico
  saveCaseDraft(caseId, draftData) {
    const data = this.getData();
    if (!data.caseDrafts) data.caseDrafts = {};
    const nowIso = new Date().toISOString();
    const nowEpoch = Date.now();
    const draft = {
      ...draftData,
      updatedAt: nowIso,
      updatedAtEpoch: nowEpoch
    };
    data.caseDrafts[caseId] = draft;
    this.saveData(data);

    // Sincronización en segundo plano con el backend SQLite si hay sesión de usuario activa
    this.syncPushCaseDraft(caseId, draft);
  },

  // Envía el borrador al servidor para sincronización multi-dispositivo
  async syncPushCaseDraft(caseId, draftData) {
    if (typeof AuthService === "undefined" || !AuthService.currentUser) return;
    try {
      await fetch("/api/user/progress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseId,
          data: draftData
        })
      });
    } catch (e) {
      console.warn("[StorageService] Error enviando progreso al servidor (offline cache activo):", e);
    }
  },

  // Sincroniza el progreso completo con el servidor aplicando estrategia Last-Write-Wins (LWW)
  async syncPullProgress() {
    if (typeof AuthService === "undefined" || !AuthService.currentUser) return;
    try {
      const res = await fetch("/api/user/progress", {
        credentials: "include",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.progress) return;

      const serverProgress = json.progress;
      const data = this.getData();
      if (!data.caseDrafts) data.caseDrafts = {};

      let hasChanges = false;
      const pendingPushes = [];

      // 1. Integrar datos del servidor hacia el cliente
      for (const [caseId, serverDraft] of Object.entries(serverProgress)) {
        const localDraft = data.caseDrafts[caseId];
        const serverTs = serverDraft.updatedAtEpoch || (serverDraft.updatedAt ? new Date(serverDraft.updatedAt).getTime() : 0);
        const localTs = localDraft ? (localDraft.updatedAtEpoch || (localDraft.updatedAt ? new Date(localDraft.updatedAt).getTime() : 0)) : 0;

        if (!localDraft || serverTs >= localTs) {
          data.caseDrafts[caseId] = serverDraft;
          hasChanges = true;
        } else if (localTs > serverTs) {
          // El borrador local es más reciente (ej. generado offline)
          pendingPushes.push({ caseId, data: localDraft });
        }
      }

      // 2. Si existen borradores locales no presentes en el servidor, enviarlos
      for (const [caseId, localDraft] of Object.entries(data.caseDrafts)) {
        if (!serverProgress[caseId]) {
          pendingPushes.push({ caseId, data: localDraft });
        }
      }

      if (hasChanges) {
        this.saveData(data);
        if (typeof CaseSolver !== "undefined" && CaseSolver.activeCaseId && typeof CaseSolver.loadCaseDraft === "function") {
          CaseSolver.loadCaseDraft(CaseSolver.activeCaseId);
        }
      }

      // 3. Despachar actualizaciones locales pendientes
      for (const item of pendingPushes) {
        this.syncPushCaseDraft(item.caseId, item.data);
      }
    } catch (e) {
      console.warn("[StorageService] Error sincronizando progreso:", e);
    }
  },

  // Comprueba si la sincronización de avance con el servidor está habilitada
  // (solo usuarios autenticados con Pase Activo, no cuentas demo ni anónimas)
  isServerSyncAvailable() {
    return typeof AuthService !== "undefined" &&
      Boolean(AuthService.currentUser) &&
      AuthService.currentUser.isDemo === false;
  },

  // Envía un cambio de dominio de cédula al backend (fire-and-forget)
  async _pushMasteryChange(topicId, mastered, ts = null) {
    if (!this.isServerSyncAvailable()) return;
    const timestamp = ts || Date.now();
    try {
      await fetch("/api/user/topic-mastery", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: String(topicId),
          mastered: Boolean(mastered),
          ts: timestamp
        })
      });
    } catch (e) {
      // Silencioso (local-first)
    }
  },

  // Sincroniza el dominio de cédulas con el servidor aplicando Last-Write-Wins (LWW) por cédula
  async pullMasteryFromServer() {
    if (!this.isServerSyncAvailable()) {
      return { changed: false, reason: "no-server-sync" };
    }
    try {
      const res = await fetch("/api/user/topic-mastery", {
        credentials: "include",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) {
        return { changed: false, reason: `http-${res.status}` };
      }
      const dataJson = await res.json();
      if (!dataJson.ok || !dataJson.mastery) {
        return { changed: false, reason: "invalid-response" };
      }

      const remoteMastery = dataJson.mastery;
      const key = this.getActiveUserKey();
      const data = this.getData();
      if (!data.userProgress) data.userProgress = {};
      if (!data.userProgress[key]) data.userProgress[key] = { masteredTopicIds: [], lastActivity: null, topicQuizzes: {}, masteredTimestamps: {} };
      if (!data.userProgress[key].masteredTopicIds) data.userProgress[key].masteredTopicIds = [];
      if (!data.userProgress[key].masteredTimestamps) data.userProgress[key].masteredTimestamps = {};

      const localList = data.userProgress[key].masteredTopicIds;
      const localTimestamps = data.userProgress[key].masteredTimestamps;
      let changed = false;
      const pendingPushes = [];

      // 1. Integrar datos del servidor aplicando LWW por cédula
      for (const [topicId, rItem] of Object.entries(remoteMastery)) {
        const remoteMastered = Boolean(rItem.mastered);
        const remoteTs = Number(rItem.updatedAt || 0);
        const localTs = Number(localTimestamps[topicId] || 0);
        const isCurrentlyMastered = localList.includes(topicId);

        if (remoteTs > localTs) {
          // Servidor más reciente: aplicar cambio remoto
          if (remoteMastered && !isCurrentlyMastered) {
            localList.push(topicId);
            changed = true;
          } else if (!remoteMastered && isCurrentlyMastered) {
            const idx = localList.indexOf(topicId);
            if (idx >= 0) localList.splice(idx, 1);
            changed = true;
          }
          localTimestamps[topicId] = remoteTs;
        } else if (localTs > remoteTs) {
          // Local más reciente: reconciliar subiendo al servidor
          pendingPushes.push({ topicId, mastered: isCurrentlyMastered, ts: localTs });
        }
      }

      // 2. Comprobar cédulas locales con timestamp que no existen en el servidor
      for (const [topicId, localTs] of Object.entries(localTimestamps)) {
        if (!remoteMastery[topicId]) {
          const isCurrentlyMastered = localList.includes(topicId);
          pendingPushes.push({ topicId, mastered: isCurrentlyMastered, ts: Number(localTs) || Date.now() });
        }
      }

      if (changed) {
        data.userProgress[key].lastActivity = new Date().toISOString();
        this.saveData(data);
      }

      // 3. Despachar actualizaciones locales pendientes en lotes de máx 500
      if (pendingPushes.length > 0) {
        for (let i = 0; i < pendingPushes.length; i += 500) {
          const batch = pendingPushes.slice(i, i + 500);
          fetch("/api/user/topic-mastery", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ changes: batch })
          }).catch(() => {});
        }
      }

      return { changed };
    } catch (e) {
      return { changed: false, reason: "network-error" };
    }
  },

  // Construye el payload de respaldo del avance del usuario activo (solo userProgress del usuario,
  // sin topics/cases/auth). Usado por exportUserProgressFile().
  buildUserProgressExportPayload(userKey = null) {
    const key = userKey || this.getActiveUserKey();
    const data = this.getData();
    const progress = (data.userProgress && data.userProgress[key]) || {};
    return {
      app: "GRADOMANIACOS",
      type: "user-progress-backup",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      userKey: key,
      progress: {
        masteredTopicIds: Array.isArray(progress.masteredTopicIds) ? progress.masteredTopicIds.slice() : [],
        masteredTimestamps: (progress.masteredTimestamps && typeof progress.masteredTimestamps === "object")
          ? { ...progress.masteredTimestamps }
          : {},
        topicQuizzes: (progress.topicQuizzes && typeof progress.topicQuizzes === "object")
          ? JSON.parse(JSON.stringify(progress.topicQuizzes))
          : {},
        lastActivity: progress.lastActivity || null
      }
    };
  },

  // Exporta el avance del usuario activo como archivo JSON descargable (puente manual multi-dispositivo
  // para Modo Estático / GitHub Pages). Retorna true si se generó la descarga.
  exportUserProgressFile(userKey = null) {
    try {
      const payload = this.buildUserProgressExportPayload(userKey);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateTag = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `gradomania-progreso-${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
      return true;
    } catch (e) {
      console.error("[StorageService] Error exportando avance:", e);
      return false;
    }
  },

  // Fusiona un respaldo JSON de avance aportado por el usuario (unión aditiva + LWW por cédula).
  // Valida estrictamente la estructura: type "user-progress-backup", masteredTopicIds array de strings,
  // masteredTimestamps números, quizzes objetos; nunca renderiza el contenido en el DOM (solo merge de datos).
  // Únicamente toca userProgress[key] del usuario activo. Retorna { ok, imported, quizzesImported } | { ok:false, error }.
  mergeUserProgressFromJsonString(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || parsed.type !== "user-progress-backup") {
        return { ok: false, error: "El archivo no es un respaldo de avance válido de GRADOMANIACOS." };
      }
      const payload = parsed.progress;
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "El respaldo no contiene datos de progreso." };
      }

      // Validación estricta de estructura
      const incomingIds = Array.isArray(payload.masteredTopicIds) ? payload.masteredTopicIds : null;
      const incomingTimestamps = (payload.masteredTimestamps && typeof payload.masteredTimestamps === "object") ? payload.masteredTimestamps : null;
      const incomingQuizzes = (payload.topicQuizzes && typeof payload.topicQuizzes === "object") ? payload.topicQuizzes : {};

      if (!incomingIds || !incomingTimestamps) {
        return { ok: false, error: "La estructura del respaldo es inválida (faltan masteredTopicIds o masteredTimestamps)." };
      }

      // Guard anti-prototype-pollution: rechazar __proto__, constructor y prototype en keys o valores
      const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
      const hasPrototypePollution = (obj) => {
        if (!obj || typeof obj !== "object") return false;
        for (const k of Object.getOwnPropertyNames(obj)) {
          if (DANGEROUS_KEYS.includes(k)) return true;
          if (obj[k] && typeof obj[k] === "object") {
            if (hasPrototypePollution(obj[k])) return true;
          }
        }
        return false;
      };
      if (hasPrototypePollution(parsed)) {
        return { ok: false, error: "Estructura de respaldo sospechosa o no permitida (prototype pollution guard)." };
      }
      if (incomingIds.some(id => DANGEROUS_KEYS.includes(id))) {
        return { ok: false, error: "Identificador de cédula inválido o no permitido (prototype pollution guard)." };
      }
      if (Object.keys(incomingTimestamps).some(k => DANGEROUS_KEYS.includes(k))) {
        return { ok: false, error: "Clave de timestamp inválida o no permitida (prototype pollution guard)." };
      }

      if (!incomingIds.every(id => typeof id === "string")) {
        return { ok: false, error: "masteredTopicIds debe contener solo identificadores de texto." };
      }
      if (!Object.values(incomingTimestamps).every(v => typeof v === "number")) {
        return { ok: false, error: "masteredTimestamps debe contener solo marcas de tiempo numéricas." };
      }

      const key = this.getActiveUserKey();
      const data = this.getData();
      if (!data.userProgress) data.userProgress = {};
      if (!data.userProgress[key]) data.userProgress[key] = { masteredTopicIds: [], lastActivity: null, topicQuizzes: {}, masteredTimestamps: {} };
      if (!data.userProgress[key].masteredTopicIds) data.userProgress[key].masteredTopicIds = [];
      if (!data.userProgress[key].masteredTimestamps) data.userProgress[key].masteredTimestamps = {};
      if (!data.userProgress[key].topicQuizzes) data.userProgress[key].topicQuizzes = {};

      const local = data.userProgress[key];
      let imported = 0;
      let quizzesImported = 0;

      // 1. Unión aditiva de masteredTopicIds aplicando LWW por cédula
      incomingIds.forEach(topicId => {
        const incomingTs = Number(incomingTimestamps[topicId] || 0);
        const localTs = Number(local.masteredTimestamps[topicId] || 0);
        const alreadyIncluded = local.masteredTopicIds.includes(topicId);

        if (incomingTs > localTs) {
          // El respaldo es más reciente para esta cédula
          if (!alreadyIncluded) {
            local.masteredTopicIds.push(topicId);
            imported++;
          }
          local.masteredTimestamps[topicId] = incomingTs;
        } else if (incomingTs === localTs && !alreadyIncluded) {
          // Mismo timestamp y ausente localmente: unión aditiva sin perder nada
          local.masteredTopicIds.push(topicId);
          local.masteredTimestamps[topicId] = incomingTs || Date.now();
          imported++;
        }
      });

      // 2. Timestamps presentes en el respaldo para cédulas NO listadas como dominadas
      //    (desmarcadas con LWW: si el respaldo es más reciente, aplicar desmarcado)
      Object.keys(incomingTimestamps).forEach(topicId => {
        if (incomingIds.includes(topicId)) return;
        const incomingTs = Number(incomingTimestamps[topicId] || 0);
        const localTs = Number(local.masteredTimestamps[topicId] || 0);
        const idx = local.masteredTopicIds.indexOf(topicId);
        if (incomingTs > localTs && idx >= 0) {
          local.masteredTopicIds.splice(idx, 1);
          local.masteredTimestamps[topicId] = incomingTs;
          imported++;
        }
      });

      // 3. Quizzes: solo se importan los que el usuario local NO tenga ya (nunca sobrescribir local)
      Object.keys(incomingQuizzes).forEach(topicId => {
        const q = incomingQuizzes[topicId];
        if (!q || typeof q !== "object") return;
        if (local.topicQuizzes[topicId]) return; // el local prevalece
        local.topicQuizzes[topicId] = q;
        quizzesImported++;
      });

      if (imported > 0 || quizzesImported > 0) {
        data.userProgress[key].lastActivity = new Date().toISOString();
        this.saveData(data);
      }

      return { ok: true, imported, quizzesImported };
    } catch (e) {
      console.warn("[StorageService] Respaldo de avance inválido:", e);
      return { ok: false, error: "El archivo no es un JSON de respaldo válido." };
    }
  },

  getCaseDraft(caseId) {
    const data = this.getData();
    return (data.caseDrafts && data.caseDrafts[caseId]) || null;
  },

  /**
   * Ciclo de vida y retención óptima: Mantiene como máximo 'maxCount' casos de práctica IA
   * aplicando política FIFO. Los casos oficiales (exámenes y pautas base) son inmunes.
   * Purga además cualquier borrador huérfano en caseDrafts para liberar memoria en localStorage.
   */
  pruneOldAiCases(maxCount = 10) {
    const data = this.getData();
    const cases = data.cases || [];
    
    // Separar casos oficiales y de práctica generados por IA
    const officialCases = [];
    const aiCases = [];

    cases.forEach(c => {
      const isAi = c.isGeneratedByAI || (c.id && c.id.startsWith("caso-ia-"));
      if (isAi) {
        aiCases.push(c);
      } else {
        officialCases.push(c);
      }
    });

    if (aiCases.length <= maxCount) {
      return { prunedCount: 0, remainingAiCount: aiCases.length };
    }

    // Conservar solo los 'maxCount' casos IA más recientes (los primeros en la lista)
    const keptAiCases = aiCases.slice(0, maxCount);
    const prunedAiCases = aiCases.slice(maxCount);
    const prunedIds = new Set(prunedAiCases.map(c => c.id));

    // Reensamblar lista de casos
    data.cases = [...keptAiCases, ...officialCases];

    // Limpieza de borradores huérfanos en caseDrafts
    if (data.caseDrafts) {
      prunedIds.forEach(id => {
        delete data.caseDrafts[id];
      });
    }

    this.saveData(data);
    return { prunedCount: prunedAiCases.length, remainingAiCount: keptAiCases.length };
  },

  /**
   * Purga manual completa de todos los casos de práctica generados por IA y sus borradores,
   * preservando íntegramente los casos oficiales de la universidad.
   */
  clearAllAiPracticeCases() {
    const data = this.getData();
    const cases = data.cases || [];
    
    const officialCases = [];
    const prunedIds = [];

    cases.forEach(c => {
      const isAi = c.isGeneratedByAI || (c.id && c.id.startsWith("caso-ia-"));
      if (isAi) {
        prunedIds.push(c.id);
      } else {
        officialCases.push(c);
      }
    });

    data.cases = officialCases;

    if (data.caseDrafts) {
      prunedIds.forEach(id => {
        delete data.caseDrafts[id];
      });
    }

    this.saveData(data);
    return { deletedCount: prunedIds.length, officialCasesCount: officialCases.length };
  },

  // Exportar todo a archivo .json descargable
  exportToJsonFile() {
    const data = this.getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respaldo_estudio_de_grado_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Restaurar desde archivo .json subido
  restoreFromJsonString(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.topics && parsed.cases) {
        this.saveData(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error("JSON inválido:", e);
      return false;
    }
  },

  // Restablecer valores de fábrica
  resetToDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    return this.getData();
  }
};

if (typeof window !== "undefined") window.StorageService = StorageService;
if (typeof globalThis !== "undefined") globalThis.StorageService = StorageService;
if (typeof module !== "undefined" && module.exports) module.exports = StorageService;

