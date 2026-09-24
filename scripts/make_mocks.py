# -*- coding: utf-8 -*-
"""
make_mocks.py — Fábrica determinista de mocks solo-tests (v7.23, PROMPT 018)
============================================================================
Genera corpus sintéticos por materia troncal para probar casos borde del
pipeline y benchmarkear el Vault. Escribe EXCLUSIVAMENTE en el directorio
temporal indicado (--out, defecto: tempfile fresco) y se niega a escribir
dentro del repo (canon, fuentes/, artefactos comprometidos).

Los stems llevan prefijo "mock" para que la aserción de aislamiento los
detecte en cualquier índice (ningún id canónico contiene "mock").

Uso:
  python scripts/make_mocks.py --out DIR [--manifest-out PATH] [--benchmark N] [--seed afg]
"""

import argparse
import json
import os
import random
import sys
import tempfile

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPTS_DIR)

MOCK_STEM_TAG = "mock"


def refuse_repo_paths(out_dir):
    real_out = os.path.realpath(out_dir)
    real_base = os.path.realpath(BASE_DIR)
    if real_out == real_base or real_out.startswith(real_base + os.sep):
        print(f"MOCKS FAIL: --out ({real_out}) está dentro del repo. "
              f"Los mocks solo pueden generarse en directorios temporales.")
        sys.exit(3)


def w(out_dir, name, text, encoding="utf-8"):
    path = os.path.join(out_dir, name)
    with open(path, "w", encoding=encoding) as f:
        f.write(text)
    return path


def build_corpus(out_dir, rng):
    manifest = {}  # file -> {sections, codes, chapter, subject}

    w(out_dir, "MOCK_CIVIL_ACTO.md",
      "# Capítulo 1: Acto Juridico Mock\n"
      "## Seccion 1.1: Voluntad y consentimiento mock\n"
      "El acto juridico mock requiere voluntad, objeto y causa.\n"
      "## Seccion 1.2: Solemnidades mock\n"
      "Las solemnidades mock y la representacion.\n")
    manifest["MOCK_CIVIL_ACTO.md"] = {
        "sections": 2, "codes": ["1.1", "1.2"], "chapter": 1,
        "subject": "civil", "collides_with": "civil-actojuridi-1-1"}

    w(out_dir, "MOCK_CIVIL_BIENES.md",
      "# Capitulo 9: Bienes Mock de Prueba\n"
      "## Seccion 1.1: Dominio mock\n"
      "El dominio mock y la tradicion de prueba.\n")
    manifest["MOCK_CIVIL_BIENES.md"] = {
        "sections": 1, "codes": ["9.1"], "chapter": 9, "subject": "civil"}

    w(out_dir, "MOCK_CIVIL_OBLIGACIONES.md",
      "# Capítulo 3: Obligaciones Civiles Mock\n"
      "## Cumplimiento mock\n"
      "El codigo civil: el pago mock extingue la obligacion civil de prueba.\n"
      "## Incumplimiento mock\n"
      "La obligacion civil incumplida y la responsabilidad contractual mock.\n")
    manifest["MOCK_CIVIL_OBLIGACIONES.md"] = {
        "sections": 2, "codes": ["3.1", "3.2"], "chapter": 3,
        "subject": "civil"}

    w(out_dir, "MOCK_PROCESAL_GENERAL.md",
      "# Reglas Generales Mock\n"
      "## Demanda mock\n"
      "La demanda mock y el libelo de prueba ante el tribunal.\n"
      "## Emplazamiento mock\n"
      "La notificacion mock y el emplazamiento de prueba.\n")
    manifest["MOCK_PROCESAL_GENERAL.md"] = {
        "sections": 2, "codes": ["7.1", "7.2"], "chapter": 7,
        "subject": "procesal", "note": "auto-ubicado en La Demanda por keywords"}

    w(out_dir, "MOCK_PROCESAL_MONO.md",
      "# Juicio Ordinario Mock Sin Subtitulos\n"
      "Texto monolitico mock sobre el juicio ordinario de prueba, sin "
      "subtitulos internos, para forzar la ruta de seccion unica de prueba.\n")
    manifest["MOCK_PROCESAL_MONO.md"] = {
        "sections": 1, "codes": ["1.1"], "chapter": 1,
        "subject": "procesal", "monolithic": True}

    w(out_dir, "MOCK_CONSTITUCIONAL_BASES.md",
      "# Bases Mock\n"
      "## Institucionalidad mock\n"
      "Las bases de la institucionalidad mock y la constitucion de prueba.\n"
      "## Derechos mock\n"
      "Los derechos fundamentales mock y el amparo de prueba.\n")
    manifest["MOCK_CONSTITUCIONAL_BASES.md"] = {
        "sections": 2, "codes": ["1.1", "1.2"], "chapter": 1,
        "subject": "constitucional"}

    # Edge: diminuto (< 50 chars, debe ser ignorado por discover).
    w(out_dir, "diminuto_mock.md", "# Corto mock")
    manifest["diminuto_mock.md"] = {"ignored": True}

    # Edge: encoding no UTF-8 (latin-1, debe fallar lectura estricta).
    with open(os.path.join(out_dir, "LATIN1_mock.md"), "w", encoding="latin-1") as f:
        f.write("# Bases Mock Latin1\n## Acción mock con tildes: áéíóú ñ \xff\n"
                "Texto mock con bytes no UTF-8 para prueba de encoding.\n")
    manifest["LATIN1_mock.md"] = {"encoding_error": True, "sections": 1,
        "note": "errors=replace igual extrae 1 seccion; el lint estricto la rechaza"}

    # Edge: vacío total.
    w(out_dir, "MOCK_EDGE_VACIO.md", "")
    manifest["MOCK_EDGE_VACIO.md"] = {"ignored": True}

    # Edge: módulos duplicados.
    w(out_dir, "MOCK_EDGE_DUPMOD.md",
      "# Dup Mock\nMódulo 2: Primero mock\nTexto mock primero.\n"
      "Módulo 2: Segundo mock\nTexto mock segundo.\n")
    manifest["MOCK_EDGE_DUPMOD.md"] = {"sections": 2, "chapter": 2}

    # Edge: gigante determinista (> 64 KB, no debe colgar el pipeline).
    chunk = ("Parrafo mock de relleno determinista sobre prueba. " * 40 + "\n")
    big = "# Gigante Mock\n" + "".join(
        f"## Bloque mock {i}\n{chunk}" for i in range(60))
    w(out_dir, "MOCK_EDGE_GIGANTE.md", big)
    assert len(big.encode("utf-8")) > 64 * 1024
    manifest["MOCK_EDGE_GIGANTE.md"] = {"sections": 60, "min_bytes": 64 * 1024}

    return manifest


def build_benchmark(out_dir, n, rng):
    words = ["demanda", "prueba", "tribunal", "contrato", "dominio",
             "recurso", "sentencia", "plazo", "competencia", "testimonio"]
    for i in range(n):
        body = " ".join(rng.choice(words) for _ in range(120))
        w(out_dir, f"BENCH_mock_{i:04d}.md",
          f"# Bench Mock {i}\n## Seccion mock {i}\n{body}.\n")
    return n


def main():
    ap = argparse.ArgumentParser(description="Fábrica de mocks solo-tests")
    ap.add_argument("--out", default=None)
    ap.add_argument("--manifest-out", default=None)
    ap.add_argument("--benchmark", type=int, default=0)
    ap.add_argument("--seed", default="afg")
    args = ap.parse_args()

    out_dir = args.out or tempfile.mkdtemp(prefix="mocks_afg_")
    os.makedirs(out_dir, exist_ok=True)
    refuse_repo_paths(out_dir)

    rng = random.Random(args.seed)
    manifest = build_corpus(out_dir, rng)
    bench_n = 0
    if args.benchmark > 0:
        bench_n = build_benchmark(out_dir, args.benchmark, rng)

    manifest["_meta"] = {"seed": args.seed, "benchmark_docs": bench_n,
                         "stem_tag": MOCK_STEM_TAG}
    if args.manifest_out:
        with open(args.manifest_out, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=1, sort_keys=True)
        print(f"MOCKS OK: {len(manifest) - 1} fixtures + {bench_n} bench en {out_dir}")
    else:
        print(f"MOCKS OK: {len(manifest) - 1} fixtures + {bench_n} bench en {out_dir}")
    print(f"OUT_DIR={out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
