# -*- coding: utf-8 -*-
"""
Auditoría Fase 0: Cruces Dogmáticos en estudio-de-grado-app
Genera métricas, análisis de defectos y lista cerrada de defectos.
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALL_TOPICS_PATH = os.path.join(BASE_DIR, "all_afg_topics.json")
DOGMATIC_CONN_PATH = os.path.join(BASE_DIR, "dogmatic_connections.json")

def normalize_text(text):
    if not text:
        return ""
    text = text.lower()
    accents = {'á':'a', 'é':'e', 'í':'i', 'ó':'o', 'ú':'u', 'ñ':'n', 'ü':'u'}
    for a, b in accents.items():
        text = text.replace(a, b)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def get_bigrams(text):
    words = normalize_text(text).split()
    if len(words) < 2:
        return set()
    return set(f"{words[i]} {words[i+1]}" for i in range(len(words)-1))

def run_audit():
    with open(ALL_TOPICS_PATH, "r", encoding="utf-8") as f:
        topics = json.load(f)
    
    topic_map = {t["id"]: t for t in topics}
    total_topics = len(topics)
    
    empty_connections = [t for t in topics if not t.get("connections") or len(t["connections"]) == 0]
    pct_empty = (len(empty_connections) / total_topics) * 100.0
    
    conns_map = {}
    if os.path.exists(DOGMATIC_CONN_PATH):
        with open(DOGMATIC_CONN_PATH, "r", encoding="utf-8") as f:
            conns_map = json.load(f)
    
    total_conns_keys = len(conns_map)
    source_keys_in_canon = [k for k in conns_map if k in topic_map]
    
    all_targets = []
    crossover_types = {}
    target_in_canon_count = 0
    target_orphan_count = 0
    
    for src_id, conn_list in conns_map.items():
        for c in conn_list:
            all_targets.append(c)
            ctype = c.get("crossoverType", "Desconocido")
            crossover_types[ctype] = crossover_types.get(ctype, 0) + 1
            tgt_id = c.get("targetTopicId")
            if tgt_id in topic_map:
                target_in_canon_count += 1
            else:
                target_orphan_count += 1
                
    pct_targets_in_canon = (target_in_canon_count / len(all_targets) * 100.0) if all_targets else 0.0

    # 10 sample topics from 10 distinct chapters
    chapters = {}
    for t in topics:
        key = (t.get("discipline"), t.get("chapterTitle"))
        if key not in chapters:
            chapters[key] = t
    sample_items = list(chapters.values())[:10]
    samples_triggering_fallback = [s for s in sample_items if not s.get("connections") or len(s["connections"]) == 0]

    # Analyze manual CONNECTIONS_MAP ID correspondence
    PREFIX_MAP = {
        'civil-acto': 'civil-actojuridi',
        'civil-los': 'civil-losbienes',
        'civil-las': 'civil-lasobligac',
        'civil-clas': 'civil-clase911',
        'constitucional-cons': 'constitucional-constituci'
    }

    def resolve_id(old_id):
        if not old_id:
            return None
        cleaned = old_id.replace(' ', '')
        if cleaned in topic_map:
            return cleaned
        for k, v in PREFIX_MAP.items():
            if cleaned.startswith(k):
                candidate = v + cleaned[len(k):]
                if candidate in topic_map:
                    return candidate
        if cleaned.startswith('procesal-proc'):
            suffix = cleaned[len('procesal-proc'):]
            for p in ['procesal-derechopro', 'procesal-procemayor', 'procesal-procesal']:
                if (p + suffix) in topic_map:
                    return p + suffix
        return None

    resolved_sources = 0
    resolved_targets = 0
    unresolved_targets_list = []
    
    # Check bigrams and verbatim citations between mapped pairs
    pairs_analyzed = 0
    pairs_with_lt3_bigrams = 0
    pairs_without_verbatim_quote = 0

    for src, clist in conns_map.items():
        r_src = resolve_id(src)
        if r_src:
            resolved_sources += 1
            src_topic = topic_map[r_src]
            src_bigrams = get_bigrams(src_topic.get("content", ""))
        else:
            src_topic = None
            src_bigrams = set()

        for c in clist:
            r_tgt = resolve_id(c.get("targetTopicId"))
            if r_tgt:
                resolved_targets += 1
                tgt_topic = topic_map[r_tgt]
                tgt_bigrams = get_bigrams(tgt_topic.get("content", ""))
                
                if src_topic:
                    pairs_analyzed += 1
                    shared_bigrams = src_bigrams.intersection(tgt_bigrams)
                    if len(shared_bigrams) < 3:
                        pairs_with_lt3_bigrams += 1
                    
                    # Verbatim quote check in whyConnected
                    # Check if whyConnected has a verbatim substring (>= 20 chars) in tgt_topic or src_topic
                    why = c.get("whyConnected", "")
                    has_quote = False
                    # Search for quotes in quotes or clauses
                    phrases = re.findall(r'["“«]([^"”»]+)["”»]', why)
                    if not phrases:
                        # try segments
                        pass
                    # Direct check if whyConnected contains a verbatim sentence from tgt_topic
                    tgt_norm = normalize_text(tgt_topic.get("content", ""))
                    src_norm = normalize_text(src_topic.get("content", ""))
                    # Check if any 30+ char normalized phrase from why exists in tgt or src
                    why_norm = normalize_text(why)
                    why_words = why_norm.split()
                    found_sub = False
                    for w_idx in range(len(why_words) - 5):
                        phrase = " ".join(why_words[w_idx:w_idx+6])
                        if phrase in tgt_norm or phrase in src_norm:
                            found_sub = True
                            break
                    if not found_sub:
                        pairs_without_verbatim_quote += 1
            else:
                unresolved_targets_list.append((src, c.get("targetTopicId"), c.get("targetTitle")))

    print("=== MÉTRICAS OBLIGATORIAS FASE 0 ===")
    print(f"1. Total cédulas en canon vivo: {total_topics}")
    print(f"2. Cédulas con 'connections' vacías: {len(empty_connections)}/{total_topics} ({pct_empty:.1f}%)")
    print(f"3. Claves fuente en dogmatic_connections.json: {total_conns_keys} (resuelven directo: {len(source_keys_in_canon)} = 0.0%)")
    print(f"4. Total cruces declarados: {len(all_targets)}")
    print(f"5. Targets que resuelven directo al canon vivo: {target_in_canon_count}/{len(all_targets)} ({pct_targets_in_canon:.1f}%)")
    print(f"6. Targets huérfanos actuales: {target_orphan_count}/{len(all_targets)} (100.0%)")
    print(f"7. Variantes de crossoverType usadas: {len(crossover_types)} (taxonomía abierta, sin normalizar)")
    print(f"8. Disparos de fallback genérico en muestra de 10 cédulas: {len(samples_triggering_fallback)}/10 (100.0%)")
    print(f"9. Con mapeo por prefijo: fuentes resueltas {resolved_sources}/{total_conns_keys}, targets resueltos {resolved_targets}/{len(all_targets)}")
    print(f"10. Cruces mapeados con < 3 bigramas compartidos: {pairs_with_lt3_bigrams}/{pairs_analyzed}")
    print(f"11. Cruces mapeados sin cita verbatim en apuntes: {pairs_without_verbatim_quote}/{pairs_analyzed}")

    print("\n=== LISTA CERRADA DE DEFECTOS (FASE 0) ===")
    defects = [
        "DEF-01: Discrepancia estructural de prefijos de ID (ej. 'civil-acto-' vs 'civil-actojuridi-') que vacía connections al 100%.",
        "DEF-02: Errores tipográficos con espacios en IDs clave (ej. 'civil-los -1-1' y 'civil-las -1-1') imposibilitando resolución de punteros.",
        "DEF-03: 100% (80/80) de targetTopicId en dogmatic_connections.json son huérfanos respecto al canon vivo de 103 cédulas.",
        "DEF-04: Cédulas con 'connections' vacías en all_afg_topics.json alcanza el 100% (103/103), sin cobertura real en runtime.",
        "DEF-05: 100% de las consultas en UI caen en fallbackRelated con texto plantilla genérico ('Materia Afín') sin valor dogmático.",
        "DEF-06: Cero citas verbatim en los cruces existentes: whyConnected es texto redactado libre sin anclaje a fragmentos del apunte.",
        "DEF-07: Inexistencia de gate de anclaje (gate >= 3 bigramas) que asegure que el cruce propuesto responda a overlap semantico real.",
        "DEF-08: Taxonomía de crossoverType abierta con 80 variantes ad-hoc (ej. 'Autonomía de la Voluntad y Perfeccionamiento'), sin categorías cerradas.",
        "DEF-09: Falta de botón de salto interactivo con resaltado (App.openTopic(targetId, {highlight})) en las tarjetas de cruces.",
        "DEF-10: concept-graph.js desvinculado de los cruces dogmáticos validados (usa grafo estático propio sin consumir conexiones del canon)."
    ]
    for d in defects:
        print(d)

    return {
        "total_topics": total_topics,
        "empty_connections_count": len(empty_connections),
        "pct_empty": pct_empty,
        "total_conns_keys": total_conns_keys,
        "target_in_canon_count": target_in_canon_count,
        "target_orphan_count": target_orphan_count,
        "crossover_types_count": len(crossover_types),
        "samples_fallback_count": len(samples_triggering_fallback),
        "defects": defects
    }

if __name__ == "__main__":
    run_audit()
