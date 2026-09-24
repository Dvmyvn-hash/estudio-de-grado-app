# -*- coding: utf-8 -*-
"""
lint_fuentes.py — Validador pre-ingesta de apuntes (v7.24, PROMPT 019)
=====================================================================
Revisa cada .md de fuentes/ ANTES de regenerar el temario. No modifica nada:
solo reporta y falla (exit 1) ante ERROR. WARN no bloquea.

  ERROR: encoding no UTF-8, archivo > 512 KB, colisión de tupla natural
         (subject, chapterNumber, code) contra el canon sin registro fijo.
  WARN:  < 3 secciones detectables, headings ## duplicados, capítulo
         inferido ambiguo (se auto-ubicará en otro capítulo canónico).

Uso:
  python scripts/lint_fuentes.py [--fuentes DIR] [--json-out PATH]
"""

import argparse
import json
import os
import re
import sys

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPTS_DIR)
sys.path.insert(0, BASE_DIR)

from generate_clean_notes_data import (  # noqa: E402
    FILES_CONFIG,
    discover_fuentes_files,
    extract_sections_from_file,
    infer_file_config,
    infer_temario_position,
)

MAX_FILE_BYTES = 512 * 1024
MOD_MARKER_RE = re.compile(
    r'(M[oó]dulo|Cap[ií]tulo|UNIDAD)\s*[:–—]?\s*\d+', re.IGNORECASE)
HEADING_RE = re.compile(r'^(#{1,4})\s+(.+)$')


def read_strict_utf8(path):
    with open(path, "r", encoding="utf-8") as f:  # estricto: falla ante bytes inválidos
        return f.read()


def build_canon_keys():
    """Tuplas (subject, chapterNumber, code) del canon registrado en FILES_CONFIG."""
    keys = {}
    for cfg in FILES_CONFIG:
        try:
            secs = extract_sections_from_file(cfg)
        except Exception as e:
            print(f"ALERTA lint: no se pudo extraer canon {cfg.get('file')}: {e}")
            continue
        for s in secs:
            key = (s.get("subject"), s.get("chapterNumber"), s.get("code"))
            keys.setdefault(key, s.get("id"))
    return keys


def lint_one_file(fname, fpath, canon_keys, is_canon):
    errors, warnings = [], []

    try:
        size = os.path.getsize(fpath)
    except OSError as e:
        return ([{"file": fname, "check": "acceso",
                  "msg": f"No se pudo leer el archivo: {e}"}], [])
    if size > MAX_FILE_BYTES:
        errors.append({"file": fname, "check": "tamano",
                       "msg": f"{size} bytes supera el máximo de {MAX_FILE_BYTES}."})
        return (errors, warnings)

    try:
        text = read_strict_utf8(fpath)
    except UnicodeDecodeError:
        errors.append({"file": fname, "check": "encoding",
                       "msg": "No es UTF-8 válido. Re-guárdalo como UTF-8 sin BOM."})
        return (errors, warnings)

    if len(text.strip()) < 50:
        warnings.append({"file": fname, "check": "vacio",
                         "msg": "Menos de 50 caracteres: será ignorado por el auto-descubrimiento."})
        return (errors, warnings)

    lines = text.split("\n")
    # Solo los headings ## (nivel 2, los que delimitan secciones) cuentan
    # para duplicados: los ###/#### repetidos ("1. Definición dogmática")
    # son el patrón normal de subsecciones dentro de cada cédula.
    headings = [m.group(2).strip() for line in lines
                if (m := HEADING_RE.match(line.strip())) and len(m.group(1)) <= 2]
    if len(headings) < 3:
        warnings.append({"file": fname, "check": "secciones",
                         "msg": f"Solo {len(headings)} headings detectados: quedará monolítico o con pocas cédulas."})

    seen, dups = set(), set()
    for h in headings:
        key = re.sub(r'\s+', ' ', h.lower()).strip()
        if key in seen:
            dups.add(h[:60])
        seen.add(key)
    for d in sorted(dups):
        warnings.append({"file": fname, "check": "headings-duplicados",
                         "msg": f"Heading repetido: '{d}'. Riesgo de secciones indistinguibles."})

    if is_canon:
        return (errors, warnings)

    # Solo auto-descubiertos: colisión contra el canon + ambigüedad de capítulo.
    try:
        cfg = infer_file_config(fname, fpath)
        secs = extract_sections_from_file(cfg)
    except Exception as e:
        errors.append({"file": fname, "check": "extraccion",
                       "msg": f"El auto-seccionado falló: {e}"})
        return (errors, warnings)

    for s in secs:
        key = (s.get("subject"), s.get("chapterNumber"), s.get("code"))
        if key in canon_keys:
            errors.append({
                "file": fname, "check": "colision-canon",
                "msg": (f"La sección {s.get('code')} (cap {s.get('chapterNumber')}, "
                        f"{s.get('subject')}) colisiona con la cédula canónica "
                        f"'{canon_keys[key]}'. Regístralo fijo en FILES_CONFIG con "
                        f"capítulos propios (precedente: DERECHO_PROCESAL_LA_PRUEBA.md "
                        f"cap 3-5, PROCEMAYORCUANTIA-pulido.md cap 6-13).")})
            break

    if not MOD_MARKER_RE.search(text):
        try:
            orden, sug_chap, cat = infer_temario_position(
                cfg, [{"content": text}])
            if sug_chap != cfg.get("defaultChapterNum", 1) and orden < 99:
                warnings.append({
                    "file": fname, "check": "capitulo-ambiguo",
                    "msg": (f"Sin marcador de capítulo explícito: se auto-ubicará en "
                            f"cap {sug_chap} ('{cat}'). Si no es lo esperado, agrega "
                            f"'Capítulo N' al inicio.")})
        except Exception:
            pass

    return (errors, warnings)


def main():
    ap = argparse.ArgumentParser(description="Lint pre-ingesta de fuentes/")
    ap.add_argument("--fuentes", default=None,
                    help="Carpeta a validar (defecto: fuentes/ del repo)")
    ap.add_argument("--json-out", default=None,
                    help="Ruta opcional para el reporte machine-readable")
    args = ap.parse_args()

    fuentes_dir = args.fuentes or os.path.join(BASE_DIR, "fuentes")
    canon_names = {c["file"].lower() for c in FILES_CONFIG}

    try:
        entries = sorted(os.listdir(fuentes_dir), key=lambda x: x.lower())
    except OSError as e:
        print(f"LINT FAIL: no se pudo listar {fuentes_dir}: {e}")
        return 1

    md_files = [e for e in entries
                if e.lower().endswith((".md", ".markdown"))
                and not e.startswith((".", "~"))
                and e.lower() != "readme.md"]

    canon_keys = build_canon_keys()
    all_errors, all_warnings = [], []
    checked = 0
    for fname in md_files:
        fpath = os.path.join(fuentes_dir, fname)
        if not os.path.isfile(fpath):
            continue
        checked += 1
        errs, warns = lint_one_file(
            fname, fpath, canon_keys, fname.lower() in canon_names)
        all_errors.extend(errs)
        all_warnings.extend(warns)

    for w in all_warnings:
        print(f"WARN [{w['file']}] {w['check']}: {w['msg']}")
    for e in all_errors:
        print(f"ERROR [{e['file']}] {e['check']}: {e['msg']}")

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump({"files_checked": checked, "errors": all_errors,
                       "warnings": all_warnings}, f, ensure_ascii=False, indent=2)

    if all_errors:
        print(f"LINT FAIL: {checked} archivos, "
              f"{len(all_errors)} errores, {len(all_warnings)} avisos.")
        return 1
    print(f"LINT OK: {checked} archivos, {len(all_warnings)} avisos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
