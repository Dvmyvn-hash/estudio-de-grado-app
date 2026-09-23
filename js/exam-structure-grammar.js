/**
 * GRAMÁTICA ESTRUCTURAL DE PREGUNTAS DE EXÁMENES REALES (v7.17)
 * Generado automaticamente por extract_estructura_pruebas.py desde
 * MODELOS_DE_PRUEBA/ (determinista e idempotente). NO editar a mano.
 * SOLO estructura: formato de combinacion I-IV, opciones A-E, tipos de
 * pregunta presentes. El CONTENIDO de los modelos nunca se vierte aqui.
 */

const EXAM_STRUCTURE_GRAMMAR = {
  "combinationFormat": true,
  "optionsPerQuestion": 5,
  "statementCount": 4,
  "maxCombinacionOptionChars": 120,
  "maxDefinicionOptionChars": 160,
  "maxEnunciadoChars": 420,
  "questionKinds": [
    "requisitos",
    "caracteristicas",
    "elementos",
    "plazo",
    "definicion"
  ],
  "version": "1.0.0",
  "generatedFrom": [
    "ejemplo_semilla_estructura.md"
  ],
  "structPatterns": {
    "hasRomanStatements": true,
    "hasCombinationOptions": true,
    "hasRequisitos": true,
    "hasCaracteristicas": true,
    "hasElementos": true,
    "hasPlazos": true,
    "hasDefiniciones": true,
    "hasCasoPractico": false
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = EXAM_STRUCTURE_GRAMMAR;
if (typeof window !== "undefined") window.EXAM_STRUCTURE_GRAMMAR = EXAM_STRUCTURE_GRAMMAR;
if (typeof globalThis !== "undefined") globalThis.EXAM_STRUCTURE_GRAMMAR = EXAM_STRUCTURE_GRAMMAR;
