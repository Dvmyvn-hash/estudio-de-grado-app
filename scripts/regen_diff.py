# -*- coding: utf-8 -*-
"""
regen_diff.py — Diff auditable del temario regenerado (v7.24, PROMPT 019)
========================================================================
Compara el all_afg_topics.json ANTES y DESPUÉS de regenerar y clasifica:

  INFO  (exit 0): added, index_moved (mismo id, distinto indexCode: esperado
        ante cambios de temario), category_changed (solo display).
  ERROR (exit 2): removed (id desaparecido: rompe progreso y citas),
        code_changed, chapter_changed, subject_changed, duplicate_id.

No modifica el canon: solo lee los dos JSON y reporta.

Uso:
  python scripts/regen_diff.py snapshot --current all_afg_topics.json --out /tmp/before.json
  python scripts/regen_diff.py compare --before /tmp/before.json --current all_afg_topics.json [--json-out PATH]
"""

import argparse
import json
import sys
from collections import Counter

ERROR_CLASSES = ("removed", "code_changed", "chapter_changed",
                 "subject_changed", "duplicate_id")


def load_index(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    topics = data if isinstance(data, list) else data.get("topics", [])
    index = {}
    for t in topics:
        tid = t.get("id")
        if tid in index:
            index[tid] = None  # marca duplicado
            continue
        if tid is not None:
            index[tid] = {"indexCode": t.get("indexCode"), "code": t.get("code"),
                          "chapterNumber": t.get("chapterNumber"),
                          "category": t.get("category"),
                          "subject": t.get("subject")}
    return index


def cmd_snapshot(args):
    index = load_index(args.current)
    dups = [k for k, v in index.items() if v is None]
    clean = {k: v for k, v in index.items() if v is not None}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"topics": clean}, f, ensure_ascii=False, indent=1)
    print(f"SNAPSHOT OK: {len(clean)} cédulas en {args.out}"
          + (f" (ALERTA: ids duplicados: {dups})" if dups else ""))
    return 0


def cmd_compare(args):
    with open(args.before, "r", encoding="utf-8") as f:
        before = json.load(f).get("topics", {})
    current_full = load_index(args.current)
    dups = [k for k, v in current_full.items() if v is None]
    current = {k: v for k, v in current_full.items() if v is not None}

    groups = {"added": [], "removed": [], "index_moved": [],
              "code_changed": [], "chapter_changed": [],
              "subject_changed": [], "category_changed": [],
              "duplicate_id": list(dups)}

    for tid in current:
        if tid not in before:
            groups["added"].append(tid)
    for tid, b in before.items():
        c = current.get(tid)
        if c is None:
            groups["removed"].append(tid)
            continue
        if b.get("indexCode") != c.get("indexCode"):
            groups["index_moved"].append(
                f"{tid}: {b.get('indexCode')} -> {c.get('indexCode')}")
        if b.get("code") != c.get("code"):
            groups["code_changed"].append(tid)
        if b.get("chapterNumber") != c.get("chapterNumber"):
            groups["chapter_changed"].append(tid)
        if b.get("subject") != c.get("subject"):
            groups["subject_changed"].append(tid)
        if b.get("category") != c.get("category"):
            groups["category_changed"].append(tid)

    for name in ("added", "index_moved", "category_changed"):
        for item in groups[name]:
            print(f"INFO {name}: {item}")
    errors = sum(len(groups[c]) for c in ERROR_CLASSES)
    for name in ERROR_CLASSES:
        for item in groups[name]:
            print(f"ERROR {name}: {item}")

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump({"groups": groups,
                       "before_total": len(before),
                       "current_total": len(current)},
                      f, ensure_ascii=False, indent=2)

    print(f"DIFF: antes={len(before)} ahora={len(current)} | "
          f"INFO={len(groups['added']) + len(groups['index_moved']) + len(groups['category_changed'])} "
          f"ERROR={errors}")
    if errors:
        print("DIFF FAIL: pérdida real detectada (removed/code/chapter/subject/duplicate).")
        return 2
    print("DIFF OK: sin pérdidas (solo altas y movimientos de indexCode).")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Diff auditable del temario")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p_snap = sub.add_parser("snapshot")
    p_snap.add_argument("--current", required=True)
    p_snap.add_argument("--out", required=True)
    p_cmp = sub.add_parser("compare")
    p_cmp.add_argument("--before", required=True)
    p_cmp.add_argument("--current", required=True)
    p_cmp.add_argument("--json-out", default=None)
    args = ap.parse_args()
    if args.cmd == "snapshot":
        return cmd_snapshot(args)
    return cmd_compare(args)


if __name__ == "__main__":
    sys.exit(main())
