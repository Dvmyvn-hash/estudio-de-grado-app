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
        if (INITIAL_DATA && INITIAL_DATA.topics && Array.isArray(parsed.topics)) {
          const initMap = new Map(INITIAL_DATA.topics.map(t => [t.id, t]));
          parsed.topics = parsed.topics.map(t => {
            const initTopic = initMap.get(t.id);
            if (initTopic && initTopic.connections) {
              return { ...t, connections: initTopic.connections };
            }
            return t;
          });
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
