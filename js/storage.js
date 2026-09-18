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
        // Asegurar que las conexiones dogmáticas actualizadas se reflejen siempre
        if (INITIAL_DATA && INITIAL_DATA.topics) {
          const initMap = new Map(INITIAL_DATA.topics.map(t => [t.id, t]));
          parsed.topics = parsed.topics.map(t => {
            const initTopic = initMap.get(t.id);
            if (initTopic && initTopic.connections) {
              return { ...t, connections: initTopic.connections };
            }
            return t;
          });
        }
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
    if (!data.userProgress[key]) data.userProgress[key] = { masteredTopicIds: [], lastActivity: null };
    return data.userProgress[key].masteredTopicIds || [];
  },

  // Cambiar estado de dominio de un tema para el usuario activo
  toggleTopicMastery(topicId, userKey = null) {
    const key = userKey || this.getActiveUserKey();
    const data = this.getData();
    if (!data.userProgress) data.userProgress = {};
    if (!data.userProgress[key]) data.userProgress[key] = { masteredTopicIds: [], lastActivity: null };

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

    data.userProgress[key].lastActivity = new Date().toISOString();
    this.saveData(data);
    return { isMastered, masteredCount: list.length };
  },

  // Comprobar si un tema específico está dominado por el usuario
  isTopicMasteredByUser(topicId, userKey = null) {
    const mastered = this.getUserMasteredTopics(userKey);
    return mastered.includes(topicId);
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
    data.caseDrafts[caseId] = {
      ...draftData,
      updatedAt: new Date().toISOString()
    };
    this.saveData(data);
  },

  getCaseDraft(caseId) {
    const data = this.getData();
    return (data.caseDrafts && data.caseDrafts[caseId]) || null;
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
