# -*- coding: utf-8 -*-
"""
scripts/build_graph_data.py — Builder Offline del Grafo Vivo desde Canon y Cruces Dogmáticos
=============================================================================================
Construye la capa de datos viva del grafo de instituciones jurídicas para GRADOMANIACOS
a partir de all_afg_topics.json (canon de cédulas) y dogmatic_connections.json (cruces
validados del Prompt 031).

Sin LLMs, 100% determinista, offline e idempotente.

Artefactos generados:
1. graph_data.json: { "nodes": [...], "links": [...] } en raíz del repo.
2. js/graph-data.js: window.GRAPH_DATA = { ... } para carga estática en GitHub Pages.
3. graph_report.json: reporte forense con métricas, presupuesto y SHA-256.

Reglas duras:
- 1 nodo por cada cédula del canon (totalNodes == len(canon)).
- 0 huérfanos (todo link.target pertenece al canon).
- 0 auto-links (source != target).
- 0 duplicados: duplicados A↔B se colapsan a una sola arista (duplicatesCollapsed).
- Taxonomía cerrada de crossoverType validada.
- Presupuesto: graph_data.json <= max(600 KB, totalNodes * 3 KB).
- Determinismo: ordenar nodos por (subject, indexCode) y aristas por (source, target).
"""

import os
import sys
import json
import re
import hashlib
import argparse
import datetime
from pathlib import Path

# Taxonomía cerrada del Prompt 031
CLOSED_TAXONOMY = [
    "Genero-Especie",
    "Sustantivo-Procesal",
    "Fundamento-Constitucional",
    "Excepcion-Procesal",
    "Efecto-Patrimonial",
    "Materia-Afin"
]


def parse_code_tuple(code_str):
    """Convierte un código como '1.2' o '1.10' a tupla de enteros (1, 2) para ordenamiento natural."""
    parts = (code_str or "").split(".")
    res = []
    for p in parts:
        digits = re.findall(r"\d+", p)
        res.append(int(digits[0]) if digits else 0)
    return tuple(res)


def node_sort_key(node):
    """Clave determinista de ordenamiento para nodos: (subject, indexCode natural, id)."""
    subj = node.get("subject", "")
    idx = node.get("indexCode", "")
    return (subj, parse_code_tuple(idx), node.get("id", ""))


def build_graph_data(
    all_topics_path=None,
    connections_path=None,
    out_json_path=None,
    out_js_path=None,
    out_report_path=None
):
    """
    Construye determinísticamente graph_data.json, js/graph-data.js y graph_report.json.
    """
    base_dir = Path(__file__).resolve().parent.parent

    if all_topics_path is None:
        all_topics_path = base_dir / "all_afg_topics.json"
    else:
        all_topics_path = Path(all_topics_path)

    if connections_path is None:
        connections_path = base_dir / "dogmatic_connections.json"
    else:
        connections_path = Path(connections_path)

    if out_json_path is None:
        out_json_path = base_dir / "graph_data.json"
    else:
        out_json_path = Path(out_json_path)

    if out_js_path is None:
        out_js_path = base_dir / "js" / "graph-data.js"
    else:
        out_js_path = Path(out_js_path)

    if out_report_path is None:
        out_report_path = base_dir / "graph_report.json"
    else:
        out_report_path = Path(out_report_path)

    # 1. Validar inputs
    if not all_topics_path.exists():
        raise FileNotFoundError(f"Canon no encontrado: {all_topics_path}")
    if not connections_path.exists():
        raise FileNotFoundError(f"Cruces dogmáticos no encontrados: {connections_path}")

    with open(all_topics_path, "r", encoding="utf-8") as f:
        topics = json.load(f)

    with open(connections_path, "r", encoding="utf-8") as f:
        connections = json.load(f)

    # 2. Extraer Nodos
    canon_ids = set()
    nodes = []
    for t in topics:
        tid = t.get("id")
        if not tid:
            continue
        canon_ids.add(tid)
        raw_label = (t.get("cleanTitle") or t.get("title") or "").strip()
        label = raw_label[:60]
        subject = t.get("subject", "")
        index_code = t.get("indexCode", "")
        chapter = (t.get("chapterTitle") or t.get("category") or "").strip()

        nodes.append({
            "id": tid,
            "label": label,
            "subject": subject,
            "indexCode": index_code,
            "chapter": chapter
        })

    # Ordenar nodos determinísticamente por (subject, indexCode)
    nodes.sort(key=node_sort_key)

    # 3. Extraer Aristas (Cruces Validados)
    seen_undirected = set()
    links = []
    self_links_dropped = 0
    orphans_dropped = 0
    duplicates_collapsed = 0

    valid_taxonomy_set = set(CLOSED_TAXONOMY)

    for node in nodes:
        src_id = node["id"]
        conns = connections.get(src_id, [])
        for conn in conns:
            tgt_id = conn.get("targetTopicId")

            # Regla dura: nunca auto-link (source == target se descarta y se cuenta)
            if not tgt_id or src_id == tgt_id:
                self_links_dropped += 1
                continue

            # Regla dura: target inexistente en el canon se descarta (orphansDropped)
            if tgt_id not in canon_ids:
                orphans_dropped += 1
                continue

            # Regla dura: duplicados A↔B se colapsan a una arista (duplicatesCollapsed)
            edge_key = tuple(sorted([src_id, tgt_id]))
            if edge_key in seen_undirected:
                duplicates_collapsed += 1
                continue
            seen_undirected.add(edge_key)

            crossover_type = conn.get("crossoverType") or "Materia-Afin"
            if crossover_type not in valid_taxonomy_set:
                crossover_type = "Materia-Afin"

            quote = conn.get("quote", "")

            links.append({
                "source": src_id,
                "target": tgt_id,
                "type": crossover_type,
                "quote": quote
            })

    # Ordenar aristas determinísticamente por (source, target)
    links.sort(key=lambda l: (l["source"], l["target"]))

    graph_dict = {
        "nodes": nodes,
        "links": links
    }

    # 4. Formatear y verificar presupuesto
    json_str = json.dumps(graph_dict, ensure_ascii=False, indent=2) + "\n"
    json_bytes = json_str.encode("utf-8")
    file_size_bytes = len(json_bytes)
    file_size_kb = round(file_size_bytes / 1024.0, 2)

    total_nodes = len(nodes)
    budget_kb = round(max(600.0, total_nodes * 3.0), 2)
    budget_bytes = int(budget_kb * 1024)

    if file_size_bytes > budget_bytes:
        print(
            f"ERROR: graph_data.json excede el presupuesto ({file_size_kb} KB > {budget_kb} KB)",
            file=sys.stderr
        )
        sys.exit(1)

    # 5. Calcular SHA-256 de graph_data.json
    sha256_hash = hashlib.sha256(json_bytes).hexdigest()

    # 6. Escribir Output 1 — graph_data.json
    with open(out_json_path, "wb") as f:
        f.write(json_bytes)

    # 7. Escribir Output 2 — js/graph-data.js (window.GRAPH_DATA + module.exports)
    out_js_path.parent.mkdir(parents=True, exist_ok=True)
    js_content = f"""/**
 * GRAFO VIVO DE INSTITUCIONES Y CRUCES DOGMÁTICOS (v7.43, Prompt 034)
 * Generado automáticamente por scripts/build_graph_data.py desde all_afg_topics.json y dogmatic_connections.json.
 * Determinista e idempotente. NO editar a mano.
 */

const GRAPH_DATA = {json.dumps(graph_dict, ensure_ascii=False, indent=2)};

if (typeof module !== 'undefined' && module.exports) module.exports = GRAPH_DATA;
if (typeof window !== 'undefined') window.GRAPH_DATA = GRAPH_DATA;
if (typeof globalThis !== 'undefined') globalThis.GRAPH_DATA = GRAPH_DATA;
"""
    with open(out_js_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    # 8. Escribir Output 3 — graph_report.json
    report_data = {
        "totalNodes": total_nodes,
        "totalLinks": len(links),
        "orphansDropped": orphans_dropped,
        "selfLinksDropped": self_links_dropped,
        "duplicatesCollapsed": duplicates_collapsed,
        "budgetKB": budget_kb,
        "fileSizeKB": file_size_kb,
        "sha256": sha256_hash,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    with open(out_report_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("==================================================")
    print(" BUILDER DEL GRAFO VIVO: COMPLETADO EXITOSAMENTE")
    print("==================================================")
    print(f" - Nodos totales:             {total_nodes} (100% canon derivado)")
    print(f" - Aristas unicas:            {len(links)}")
    print(f" - Duplicados A<->B colapsados: {duplicates_collapsed}")
    print(f" - Huerfanos descartados:     {orphans_dropped}")
    print(f" - Auto-enlaces descartados:  {self_links_dropped}")
    print(f" - Peso graph_data.json:      {file_size_kb} KB / {budget_kb} KB presupuesto")
    print(f" - SHA-256:                   {sha256_hash}")
    print(f" - Artefactos generados:")
    print(f"    * {out_json_path}")
    print(f"    * {out_js_path}")
    print(f"    * {out_report_path}")
    print("==================================================")

    return report_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Builder determinista del Grafo Vivo para GRADOMANIACOS.")
    parser.add_argument("--all-topics", help="Ruta a all_afg_topics.json", default=None)
    parser.add_argument("--connections", help="Ruta a dogmatic_connections.json", default=None)
    parser.add_argument("--out-json", help="Ruta de salida para graph_data.json", default=None)
    parser.add_argument("--out-js", help="Ruta de salida para js/graph-data.js", default=None)
    parser.add_argument("--out-report", help="Ruta de salida para graph_report.json", default=None)

    args = parser.parse_args()
    build_graph_data(
        all_topics_path=args.all_topics,
        connections_path=args.connections,
        out_json_path=args.out_json,
        out_js_path=args.out_js,
        out_report_path=args.out_report
    )
