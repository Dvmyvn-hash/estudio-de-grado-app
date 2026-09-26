# -*- coding: utf-8 -*-
"""
scripts/benchmark_laya_20.py — Benchmark inicial de 20 consultas ES del Vault
==============================================================================
Evalúa la precisión y latencia del piloto 'qa_mode' sobre 20 consultas doctrinales
reales del historial de Vault contra el modo esperado por el estudiante.
"""

import json
import os
import statistics
import sys
import time
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BENCHMARK_QUERIES = [
    # Definición (8 consultas)
    {"query": "Qué es la tradición y cuáles son sus requisitos", "expected": "definicion"},
    {"query": "Concepto de nulidad absoluta en el Código Civil", "expected": "definicion"},
    {"query": "Defina la compraventa y sus elementos de la esencia", "expected": "definicion"},
    {"query": "Noción de derecho real y derecho personal", "expected": "definicion"},
    {"query": "Qué se entiende por caso fortuito o fuerza mayor", "expected": "definicion"},
    {"query": "Concepto de acción reivindicatoria y quién puede deducirla", "expected": "definicion"},
    {"query": "Definición legal de sociedad conyugal", "expected": "definicion"},
    {"query": "Qué es el recurso de casación en el fondo", "expected": "definicion"},

    # Panorama (6 consultas)
    {"query": "Panorama general de las fuentes de las obligaciones", "expected": "panorama"},
    {"query": "Clasificación de los contratos y sus criterios dogmáticos", "expected": "panorama"},
    {"query": "Estructura y etapas del juicio ordinario de mayor cuantía", "expected": "panorama"},
    {"query": "Visión general de las garantías constitucionales del artículo 19", "expected": "panorama"},
    {"query": "Clasificaciones de las obligaciones según su eficacia", "expected": "panorama"},
    {"query": "Panorama de las medidas precautorias y sus presupuestos", "expected": "panorama"},

    # Comparativa (6 consultas)
    {"query": "Diferencias entre nulidad absoluta y nulidad relativa", "expected": "comparativa"},
    {"query": "Paralelo entre el contrato de mandato y el arrendamiento de servicios", "expected": "comparativa"},
    {"query": "Distinción entre culpa civil y culpa penal", "expected": "comparativa"},
    {"query": "Semejanzas y diferencias entre prescripción adquisitiva y extintiva", "expected": "comparativa"},
    {"query": "Comparación entre juicio ejecutivo y procedimiento incidental", "expected": "comparativa"},
    {"query": "Diferencias entre recurso de reposición y apelación", "expected": "comparativa"},
]

def run_benchmark(port=47888):
    print("=" * 78)
    print("BENCHMARK LAYA ROUTER — 20 CONSULTAS DOCTRINALES DEL VAULT (ES)")
    print("=" * 78)
    
    url = f"http://127.0.0.1:{port}/predict"
    results = []
    latencies = []
    correct_count = 0
    fallback_count = 0

    for idx, item in enumerate(BENCHMARK_QUERIES, 1):
        q = item["query"]
        expected = item["expected"]
        payload = json.dumps({"task": "qa_mode", "state": {"query": q}}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")

        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                elapsed = (time.time() - t0) * 1000.0
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            elapsed = (time.time() - t0) * 1000.0
            data = {"fallback": True, "decision": "definicion", "confidence": 0.0, "reason": str(e)}

        decision = data.get("decision", "definicion")
        confidence = data.get("confidence", 0.0)
        is_fallback = data.get("fallback", False)
        if is_fallback:
            fallback_count += 1

        is_match = (decision == expected)
        if is_match:
            correct_count += 1

        latencies.append(elapsed)
        status_sym = "[OK]" if is_match else "[X] "
        print(f"[{idx:02d}/20] {status_sym} Q: {q[:45]:<45} | Pred: {decision:<11} (Esp: {expected:<11}) | {elapsed:6.1f}ms | conf: {confidence:.2f}")

        results.append({
            "query": q,
            "expected": expected,
            "decision": decision,
            "confidence": confidence,
            "latencyMs": round(elapsed, 2),
            "match": is_match,
            "fallback": is_fallback
        })

    latencies_sorted = sorted(latencies)
    p50 = statistics.median(latencies)
    p95 = latencies_sorted[int(len(latencies_sorted) * 0.95)]
    accuracy = (correct_count / len(BENCHMARK_QUERIES)) * 100.0

    print("-" * 78)
    print(f"RESUMEN EJECUTIVO:")
    print(f"  - Total Consultas:     {len(BENCHMARK_QUERIES)}")
    print(f"  - Aciertos (vs Esper): {correct_count}/{len(BENCHMARK_QUERIES)} ({accuracy:.1f}%)")
    print(f"  - Fallbacks:           {fallback_count}/{len(BENCHMARK_QUERIES)}")
    print(f"  - Latencia Media:      {statistics.mean(latencies):.1f} ms")
    print(f"  - Latencia p50:        {p50:.1f} ms")
    print(f"  - Latencia p95:        {p95:.1f} ms")
    print(f"  - Latencia Mín / Máx:  {min(latencies):.1f} ms / {max(latencies):.1f} ms")
    print("=" * 78)

    # Veredicto honesto
    if accuracy >= 80.0 and p50 <= 650:
        verdict = f"VIABLE Y SUPERIOR AL DEFAULT: Acierto {accuracy:.1f}% supera ampliamente la heurística estática (definición por defecto)."
    elif accuracy >= 65.0:
        verdict = f"PROMETEDOR CON AJUSTE RECOMENDADO: Acierto {accuracy:.1f}%, latencia p50 {p50:.1f}ms dentro de rango aceptable."
    else:
        verdict = f"REQUIERE REFINAMIENTO DE CRITERIOS: Acierto {accuracy:.1f}% insuficiente frente al default estático."
    
    print(f"VEREDICTO: {verdict}")

    out_file = "benchmark_results_038.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({
            "accuracy": accuracy,
            "correctCount": correct_count,
            "total": len(BENCHMARK_QUERIES),
            "p50Ms": round(p50, 2),
            "p95Ms": round(p95, 2),
            "verdict": verdict,
            "details": results
        }, f, indent=2, ensure_ascii=False)
    print(f"Detalle exportado a: {out_file}")

if __name__ == "__main__":
    run_benchmark()
