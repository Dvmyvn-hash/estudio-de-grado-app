/**
 * BARRIDO COMPLETO DE TRÍOS MIXTOS CIVIL/PROCESAL + LEDGER DE CALIDAD
 * PROMPT 026 (v7.32) - GRADOMANIACOS
 * 
 * Barredura exhaustiva de los 4.785 tríos mixtos (2 Civil + 1 Procesal y 1 Civil + 2 Procesal)
 * respetando la matriz de incompatibilidades dogmáticas.
 * 
 * Para cada trío:
 * 1. Síntesis determinista con seed (PRNG FNV-1a + Mulberry32)
 * 2. Validación de estructura (validateGeneratedCase)
 * 3. Validación de citas corpus-driven (assertCitationIntegrity)
 * 4. Medición de anclaje dogmático por pregunta (assertExplanationAnchored >= 3 bigramas)
 * 
 * Genera ledger completo y ranking de los top-20 tríos más débiles.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const CaseGeneratorAgent = require('../js/case-generator-agent.js');

// 1. Inicializar APUNTES_INDEX desde all_afg_topics.json
const topicsPath = path.resolve(__dirname, '../all_afg_topics.json');
const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
CaseGeneratorAgent.populateApuntesIndex(topics);

// PRNG determinista idéntico al estándar del generador (lotFnv1a + lotMulberry32)
function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2. Filtrar instituciones por materia
const civilInsts = CaseGeneratorAgent.INSTITUTIONS.filter(i => i.subject === 'civil');
const procInsts = CaseGeneratorAgent.INSTITUTIONS.filter(i => i.subject === 'procesal');

function areCompatible(a, b) {
  if (a.incompatibleWith && a.incompatibleWith.includes(b.id)) return false;
  if (b.incompatibleWith && b.incompatibleWith.includes(a.id)) return false;
  return true;
}

function isCompatibleTrio(a, b, c) {
  return areCompatible(a, b) && areCompatible(a, c) && areCompatible(b, c);
}

// 3. Generar universo de tríos mixtos compatibles
const trios = [];

// 2 Civil + 1 Procesal
for (let i = 0; i < civilInsts.length; i++) {
  for (let j = i + 1; j < civilInsts.length; j++) {
    for (let k = 0; k < procInsts.length; k++) {
      const a = civilInsts[i];
      const b = civilInsts[j];
      const c = procInsts[k];
      if (isCompatibleTrio(a, b, c)) {
        trios.push({
          type: '2_civil_1_proc',
          insts: [a, b, c]
        });
      }
    }
  }
}

// 1 Civil + 2 Procesal
for (let i = 0; i < procInsts.length; i++) {
  for (let j = i + 1; j < procInsts.length; j++) {
    for (let k = 0; k < civilInsts.length; k++) {
      const a = procInsts[i];
      const b = procInsts[j];
      const c = civilInsts[k];
      if (isCompatibleTrio(a, b, c)) {
        trios.push({
          type: '1_civil_2_proc',
          insts: [a, b, c]
        });
      }
    }
  }
}

console.log(`=============================================================`);
console.log(` BARRIDO COMPLETO DE TRÍOS MIXTOS CIVIL/PROCESAL (PROMPT 026)`);
console.log(`=============================================================`);
console.log(`- Instituciones Civil: ${civilInsts.length}`);
console.log(`- Instituciones Procesal: ${procInsts.length}`);
console.log(`- Total Tríos Compatibles: ${trios.length} (esperado: 4.785)`);

const origRandom = Math.random;
const tStart = Date.now();

let totalValidos = 0;
let totalCitasOk = 0;
let totalFullyOk = 0; // valid && cit_ok && anclaje_100
let totalPreguntas = 0;
let totalPreguntasAncladas = 0;
let totalNeedsReviewPreguntas = 0;

const ledger = [];

for (let idx = 0; idx < trios.length; idx++) {
  const item = trios[idx];
  const [instA, instB, instC] = item.insts;
  const trioKey = `${instA.id}:${instB.id}:${instC.id}`;

  // Semilla PRNG determinista por trío
  const seed = fnv1a("trio:" + trioKey);
  const rng = mulberry32(seed);

  let caseObj;
  try {
    Math.random = rng;
    caseObj = CaseGeneratorAgent.synthesizeCase(item.insts);
  } finally {
    Math.random = origRandom;
  }

  const vResult = CaseGeneratorAgent.validateGeneratedCase(caseObj);
  const cResult = CaseGeneratorAgent.assertCitationIntegrity(caseObj);

  const isValid = !!(vResult && vResult.valid);
  const isCitOk = !!(cResult && cResult.valid);

  const qs = Array.isArray(caseObj.questions) ? caseObj.questions : [];
  const qCount = qs.length;
  let qAnchored = 0;
  let qNeedsReview = 0;

  for (const q of qs) {
    if (q.needsReview === true) {
      qNeedsReview++;
    } else {
      qAnchored++;
    }
  }

  totalPreguntas += qCount;
  totalPreguntasAncladas += qAnchored;
  totalNeedsReviewPreguntas += qNeedsReview;

  if (isValid) totalValidos++;
  if (isCitOk) totalCitasOk++;

  const isFullyOk = isValid && isCitOk && (qNeedsReview === 0);
  if (isFullyOk) totalFullyOk++;

  const anchorRatio = qCount > 0 ? (qAnchored / qCount) : 0;

  ledger.push({
    i: idx + 1,
    type: item.type,
    a: instA.id,
    b: instB.id,
    c: instC.id,
    names: [instA.name, instB.name, instC.name],
    archetypeId: caseObj.archetypeId || "unknown",
    valid: isValid,
    errors_val: isValid ? [] : (vResult.errors || []),
    cit_ok: isCitOk,
    errors_cit: isCitOk ? [] : (cResult.errors || []),
    anclaje: `${qAnchored}/${qCount}`,
    anclaje_pct: Math.round(anchorRatio * 100),
    needs_review: qNeedsReview,
    shared_bigrams: qs.map(q => q.anchorShared || 0)
  });

  if ((idx + 1) % 1000 === 0 || (idx + 1) === trios.length) {
    const elapsedSec = ((Date.now() - tStart) / 1000).toFixed(1);
    console.log(`  > Progreso: ${idx + 1}/${trios.length} tríos procesados (${elapsedSec}s)...`);
  }
}

const totalElapsedSec = ((Date.now() - tStart) / 1000).toFixed(2);

// 4. Identificar Top-20 Tríos Débiles
// Criterio de debilidad:
// 1. Invalidez estructural (valid: false)
// 2. Falla de citas (cit_ok: false)
// 3. Menor porcentaje de anclaje (anclaje_pct menor)
// 4. Mayor cantidad de preguntas needs_review
const sortedByWeakness = ledger.slice().sort((x, y) => {
  if (x.valid !== y.valid) return x.valid ? 1 : -1;
  if (x.cit_ok !== y.cit_ok) return x.cit_ok ? 1 : -1;
  if (x.anclaje_pct !== y.anclaje_pct) return x.anclaje_pct - y.anclaje_pct;
  return y.needs_review - x.needs_review;
});

const top20Debiles = sortedByWeakness.slice(0, 20);

// 5. Verificar Piloto del Orquestador (4 combinaciones canónicas)
// Piloto:
// 1. civ_nulidad_absoluta + civ_reivindicatoria + proc_medidas_precautorias
// 2. civ_resp_extracontractual + proc_competencia_accion_mueble + proc_medidas_precautorias
// 3. civ_resolucion_1489 + civ_clausula_penal_enorme + proc_juicio_ejecutivo_excepciones
// 4. civ_tradicion_posesion + civ_reivindicatoria + proc_recurso_apelacion
const pilotPairs = [
  ["civ_nulidad_absoluta", "civ_reivindicatoria", "proc_medidas_precautorias"],
  ["civ_resp_extracontractual", "proc_competencia_accion_mueble", "proc_medidas_precautorias"],
  ["civ_resolucion_1489", "civ_clausula_penal_enorme", "proc_juicio_ejecutivo_excepciones"],
  ["civ_tradicion_posesion", "civ_reivindicatoria", "proc_recurso_apelacion"]
];

const pilotResults = pilotPairs.map(ids => {
  const item = ledger.find(row => {
    const rowIds = [row.a, row.b, row.c];
    return ids.every(id => rowIds.includes(id));
  });
  return {
    ids,
    found: !!item,
    valid: item ? item.valid : false,
    cit_ok: item ? item.cit_ok : false,
    anclaje: item ? item.anclaje : "N/A",
    anclaje_pct: item ? item.anclaje_pct : 0,
    needs_review: item ? item.needs_review : 0,
    archetypeId: item ? item.archetypeId : "N/A"
  };
});

// 6. Preparar Reporte Resumen
const summary = {
  fecha: new Date().toISOString(),
  total_trios: trios.length,
  duracion_segundos: parseFloat(totalElapsedSec),
  ms_por_trio: parseFloat((totalElapsedSec * 1000 / trios.length).toFixed(2)),
  metricas: {
    validos_estructura: totalValidos,
    validos_estructura_pct: parseFloat((totalValidos / trios.length * 100).toFixed(2)),
    citas_verificadas: totalCitasOk,
    citas_verificadas_pct: parseFloat((totalCitasOk / trios.length * 100).toFixed(2)),
    fully_validos_y_anclados: totalFullyOk,
    fully_validos_y_anclados_pct: parseFloat((totalFullyOk / trios.length * 100).toFixed(2)),
    total_preguntas: totalPreguntas,
    preguntas_ancladas: totalPreguntasAncladas,
    preguntas_ancladas_pct: parseFloat((totalPreguntasAncladas / totalPreguntas * 100).toFixed(2)),
    preguntas_needs_review: totalNeedsReviewPreguntas,
    preguntas_needs_review_pct: parseFloat((totalNeedsReviewPreguntas / totalPreguntas * 100).toFixed(2))
  },
  piloto_orquestador: pilotResults,
  top20_debiles: top20Debiles
};

// 7. Guardar artefactos en TEMP del sistema y en el workspace para auditoría
const tempDir = os.tmpdir();
const tempLedgerPath = path.join(tempDir, 'gradomaniacos_trios_ledger.json');
const tempSummaryPath = path.join(tempDir, 'gradomaniacos_trios_summary.json');

fs.writeFileSync(tempLedgerPath, JSON.stringify(ledger, null, 2), 'utf8');
fs.writeFileSync(tempSummaryPath, JSON.stringify(summary, null, 2), 'utf8');

// Reporte en workspace para persistencia
const wsSummaryPath = path.resolve(__dirname, '../trios_ledger_report.json');
fs.writeFileSync(wsSummaryPath, JSON.stringify(summary, null, 2), 'utf8');

console.log(`\n=============================================================`);
console.log(` RESULTADOS DEL BARRIDO (4.785 TRÍOS MIXTOS)`);
console.log(`=============================================================`);
console.log(`- Tiempo total: ${totalElapsedSec}s (${summary.ms_por_trio} ms/trío)`);
console.log(`- Válidos estructura: ${totalValidos}/${trios.length} (${summary.metricas.validos_estructura_pct}%)`);
console.log(`- Citas verificadas: ${totalCitasOk}/${trios.length} (${summary.metricas.citas_verificadas_pct}%)`);
console.log(`- Totalmente sólidos (Válido + Citas + 100% Anclaje): ${totalFullyOk}/${trios.length} (${summary.metricas.fully_validos_y_anclados_pct}%)`);
console.log(`- Total preguntas: ${totalPreguntas}`);
console.log(`- Preguntas ancladas (>= 3 bigramas): ${totalPreguntasAncladas}/${totalPreguntas} (${summary.metricas.preguntas_ancladas_pct}%)`);
console.log(`- Preguntas con needsReview (< 3 bigramas): ${totalNeedsReviewPreguntas}/${totalPreguntas} (${summary.metricas.preguntas_needs_review_pct}%)`);

console.log(`\n--- PILOTO DEL ORQUESTADOR (4 COMBINACIONES CANÓNICAS) ---`);
pilotResults.forEach((p, idx) => {
  console.log(`  [Piloto ${idx + 1}] ${p.ids.join(" + ")}`);
  console.log(`    -> Válido: ${p.valid ? '✅' : '❌'} | Citas: ${p.cit_ok ? '✅' : '❌'} | Anclaje: ${p.anclaje} (${p.anclaje_pct}%) | NeedsReview: ${p.needs_review}`);
});

console.log(`\n--- TOP-20 TRÍOS DÉBILES (A SUPERVISAR) ---`);
top20Debiles.forEach((d, idx) => {
  console.log(`  #${idx + 1} [${d.a} + ${d.b} + ${d.c}]`);
  console.log(`     Val: ${d.valid ? 'OK' : 'ERR'} | Cit: ${d.cit_ok ? 'OK' : 'ERR'} | Anclaje: ${d.anclaje} (${d.anclaje_pct}%) | Arquetipo: ${d.archetypeId}`);
  if (d.errors_val.length > 0) console.log(`     Errores Val: ${d.errors_val.join('; ')}`);
  if (d.errors_cit.length > 0) console.log(`     Errores Cit: ${d.errors_cit.join('; ')}`);
});

console.log(`\nArchivos generados:`);
console.log(`- Resumen en workspace: ${wsSummaryPath}`);
console.log(`- Ledger en TEMP: ${tempLedgerPath}`);
console.log(`- Resumen en TEMP: ${tempSummaryPath}`);
