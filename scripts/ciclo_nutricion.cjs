/**
 * CICLO DE NUTRICIÓN Y MEJORA CONTINUA — comando repetible (PROMPT 033, v7.42)
 * ============================================================================
 * Uso: node scripts/ciclo_nutricion.cjs
 *
 * Ejecuta la fase MEDIR + REGISTRAR del ciclo cada vez que se desee que el
 * sistema se vaya haciendo mejor, sin reimplementar nada:
 *   1. Lee el reporte previo (trios_ledger_report.json) como baseline.
 *   2. Ejecuta el barrido determinista (scripts/sweep_mixed_trios_ledger.cjs).
 *   3. Compara métricas clave y anexa una línea a nutricion_historial.jsonl.
 *   4. Emite veredicto: BASELINE | MEJORA | ESTABLE | REGRESION.
 *
 * Exit codes: 0 = BASELINE/MEJORA/ESTABLE · 2 = REGRESION (falla cerrada).
 * No toca canon, datos, Vault, QA ni cruces. Solo lee el repo + TEMP.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'trios_ledger_report.json');
const HISTORIAL_PATH = path.join(ROOT, 'nutricion_historial.jsonl');
const CANON_PATH = path.join(ROOT, 'all_afg_topics.json');
const SWEEP_SCRIPT = path.join(__dirname, 'sweep_mixed_trios_ledger.cjs');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function keyMetrics(report) {
  if (!report || !report.metricas) return null;
  const m = report.metricas;
  return {
    total_trios: report.total_trios || 0,
    fully_pct: m.fully_validos_y_anclados_pct || 0,
    needs_review: m.preguntas_needs_review || 0,
    top20_ids: (report.top20_debiles || []).map(d => [d.a, d.b, d.c].sort().join('+')),
    piloto_ok: Array.isArray(report.piloto_orquestador)
      ? report.piloto_orquestador.filter(p => p.valid && p.cit_ok && p.needs_review === 0).length
      : 0
  };
}

console.log('==============================================================');
console.log(' CICLO DE NUTRICION — medir + registrar (PROMPT 033)');
console.log('==============================================================');

const prevReport = readJson(REPORT_PATH);
const prev = keyMetrics(prevReport);
const canon = readJson(CANON_PATH);
const canonTotal = Array.isArray(canon) ? canon.length : 0;
console.log(`- Canon actual: ${canonTotal} cedulas`);
console.log(`- Baseline previo: ${prev ? `${prev.total_trios} trios, fully ${prev.fully_pct}%, needsReview ${prev.needs_review}` : 'ninguno (sera BASELINE)'}`);

console.log('\n--- Ejecutando barrido determinista (~60s) ---');
const run = spawnSync('node', [SWEEP_SCRIPT], { cwd: ROOT, stdio: 'inherit' });
if (run.status !== 0) {
  console.error(`CICLO FAIL: el barrido termino con codigo ${run.status}.`);
  process.exit(1);
}

const nextReport = readJson(REPORT_PATH);
const next = keyMetrics(nextReport);
if (!next) {
  console.error('CICLO FAIL: no se pudo leer trios_ledger_report.json tras el barrido.');
  process.exit(1);
}

let veredicto = 'BASELINE';
let deltaFully = 0;
let deltaNeeds = 0;
let top20Overlap = next.top20_ids.length;
if (prev) {
  deltaFully = parseFloat((next.fully_pct - prev.fully_pct).toFixed(2));
  deltaNeeds = next.needs_review - prev.needs_review;
  const prevSet = new Set(prev.top20_ids);
  top20Overlap = next.top20_ids.filter(id => prevSet.has(id)).length;
  const regresion = deltaFully < 0 || deltaNeeds > 0 || next.piloto_ok < 4 || next.total_trios !== prev.total_trios;
  const mejora = deltaFully > 0 || deltaNeeds < 0;
  veredicto = regresion ? 'REGRESION' : (mejora ? 'MEJORA' : 'ESTABLE');
}

const linea = {
  fecha: new Date().toISOString(),
  canon_total: canonTotal,
  total_trios: next.total_trios,
  fully_pct: next.fully_pct,
  needs_review: next.needs_review,
  piloto_ok: `${next.piloto_ok}/4`,
  top20_overlap_vs_previo: top20Overlap,
  delta_fully_pp: deltaFully,
  delta_needs_review: deltaNeeds,
  veredicto
};
fs.appendFileSync(HISTORIAL_PATH, JSON.stringify(linea) + '\n', 'utf8');

console.log('\n--- Resultado del ciclo ---');
console.log(`- Fully validos y anclados: ${next.fully_pct}% (delta ${deltaFully >= 0 ? '+' : ''}${deltaFully} pp)`);
console.log(`- Preguntas needsReview: ${next.needs_review} (delta ${deltaNeeds >= 0 ? '+' : ''}${deltaNeeds})`);
console.log(`- Piloto orquestador: ${next.piloto_ok}/4 en verde`);
console.log(`- Top-20 debiles coincidentes con previo: ${top20Overlap}/20`);
console.log(`- Historial: nutricion_historial.jsonl (${fs.readFileSync(HISTORIAL_PATH, 'utf8').trim().split('\n').length} ciclos registrados)`);
console.log(`\nVEREDICTO: ${veredicto}`);

if (veredicto === 'REGRESION') {
  console.error('CICLO FAIL: regresion detectada. Revisar top-20 y piloto antes de commitear.');
  process.exit(2);
}
console.log('CICLO OK: sistema medido y registrado. Listo para diagnosticar/actuar segun PROMPT 033.');
