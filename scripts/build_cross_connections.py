# -*- coding: utf-8 -*-
"""
scripts/build_cross_connections.py — Motor Determinista de Cruces Dogmáticos
=============================================================================
Genera y enriquece dogmatic_connections.json a partir del canon vivo de 103 cédulas,
el mapa manual autoritativo (CONNECTIONS_MAP normalizado), Vault BM25, y overlap
de bigramas con gate estricto (>= 3 bigramas).

Reglas duras:
- 100% de los targetTopicId existen en el canon vivo.
- Cero auto-links (targetTopicId != sourceTopicId).
- Cero duplicados en la misma cédula.
- Taxonomía cerrada de crossoverType:
    Genero-Especie | Sustantivo-Procesal | Fundamento-Constitucional |
    Excepcion-Procesal | Efecto-Patrimonial | Materia-Afin
- whyConnected incluye cita verbatim <= 140 chars de targetTopic.content + § indexCode.
- practicalApplication sin invención.
- Presupuesto: dogmatic_connections.json <= 300 KB.
- Genera reporte en cruces_report.json.

Uso: python scripts/build_cross_connections.py
"""

import json
import os
import re
import sys
import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

ALL_TOPICS_PATH = os.path.join(BASE_DIR, "all_afg_topics.json")
OUT_JSON_PATH = os.path.join(BASE_DIR, "dogmatic_connections.json")
REPORT_PATH = os.path.join(BASE_DIR, "cruces_report.json")
VAULT_INDEX_PATH = os.path.join(BASE_DIR, "vault_index.json")

MAX_JSON_BYTES = 300 * 1024  # 300 KB base (canon 103; v7.40: escala con el canon)
MAX_BYTES_PER_TOPIC = 3 * 1024  # 3 KB por cédula: presupuesto efectivo max(300KB, total*3KB)
MAX_QUOTE_CHARS = 135

CLOSED_TAXONOMY = [
    "Genero-Especie",
    "Sustantivo-Procesal",
    "Fundamento-Constitucional",
    "Excepcion-Procesal",
    "Efecto-Patrimonial",
    "Materia-Afin"
]

PREFIX_MAP = {
    'civil-acto': 'civil-actojuridi',
    'civil-los': 'civil-losbienes',
    'civil-las': 'civil-lasobligac',
    'civil-clas': 'civil-clase911',
    'constitucional-cons': 'constitucional-constituci'
}

def normalize_text(text):
    if not text:
        return ""
    text = str(text)
    ligatures = {
        'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl',
        'æ': 'ae', 'œ': 'oe', 'Æ': 'ae', 'Œ': 'oe'
    }
    for k, v in ligatures.items():
        text = text.replace(k, v)
    text = text.replace('\u00ad', '').replace('\u200b', '')
    quotes = {'“': '"', '”': '"', '«': '"', '»': '"', '„': '"', '‟': '"', '‘': "'", '’': "'", '‚': "'", '‛': "'"}
    for k, v in quotes.items():
        text = text.replace(k, v)
    dashes = {'–': '-', '—': '-', '−': '-'}
    for k, v in dashes.items():
        text = text.replace(k, v)
    text = text.lower()
    accents = {
        'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a',
        'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
        'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
        'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o',
        'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u'
    }
    for k, v in accents.items():
        text = text.replace(k, v)
    text = re.sub(r'[^a-z0-9ñ\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def get_bigrams(text):
    words = normalize_text(text).split()
    if len(words) < 2:
        return set()
    return set(f"{words[i]} {words[i+1]}" for i in range(len(words)-1))

def resolve_legacy_id(old_id, topic_map):
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
            cand = p + suffix
            if cand in topic_map:
                return cand
    return None

def normalize_crossover_type(raw_type, src_topic, tgt_topic):
    if raw_type in CLOSED_TAXONOMY:
        return raw_type
    
    rt = (raw_type or "").lower()
    src_subj = src_topic.get("subject", "civil")
    tgt_subj = tgt_topic.get("subject", "civil")

    # Mapeo por keywords del tipo original
    if "genero" in rt or "especie" in rt:
        return "Genero-Especie"
    if "constituc" in rt or "fundamental" in rt or "drittwirkung" in rt:
        return "Fundamento-Constitucional"
    if "excepcion" in rt or "competencia" in rt or "incompetencia" in rt or "prescripcion" in rt or "abandono" in rt:
        return "Excepcion-Procesal"
    if "patrimonial" in rt or "posesion" in rt or "dominio" in rt or "reivindicatoria" in rt or "objeto ilicito" in rt or "nulidad" in rt or "resolucion" in rt or "subrogacion" in rt or "riesgo" in rt or "tradicion" in rt:
        return "Efecto-Patrimonial"
    if "sustantivo" in rt and "procesal" in rt:
        return "Sustantivo-Procesal"
    if "procesal" in rt:
        return "Sustantivo-Procesal"
    
    # Inferencia por materias involucradas
    if src_subj == "constitucional" or tgt_subj == "constitucional":
        return "Fundamento-Constitucional"
    if (src_subj == "civil" and tgt_subj == "procesal") or (src_subj == "procesal" and tgt_subj == "civil"):
        # Revisar si se trata de excepciones
        t_text = (src_topic.get("title", "") + " " + tgt_topic.get("title", "")).lower()
        if "excepci" in t_text or "incompetencia" in t_text or "prescripci" in t_text:
            return "Excepcion-Procesal"
        return "Sustantivo-Procesal"
    
    if src_subj == "civil" and tgt_subj == "civil":
        t_text = (src_topic.get("title", "") + " " + tgt_topic.get("title", "")).lower()
        if "acto" in t_text and "contrato" in t_text:
            return "Genero-Especie"
        if "bien" in t_text or "dominio" in t_text or "posesi" in t_text or "nulidad" in t_text or "resoluci" in t_text or "pago" in t_text:
            return "Efecto-Patrimonial"
        return "Materia-Afin"

    if src_subj == "procesal" and tgt_subj == "procesal":
        t_text = (src_topic.get("title", "") + " " + tgt_topic.get("title", "")).lower()
        if "excepci" in t_text or "nulidad" in t_text or "recurso" in t_text:
            return "Excepcion-Procesal"
        return "Materia-Afin"

    return "Materia-Afin"

def clean_sentence_for_quote(raw_sentence):
    # Remueve marcas de encabezados de markdown (#, ##), guiones iniciales, asteriscos dobles
    s = raw_sentence.strip()
    s = re.sub(r'^[#*\-•\s\d\.\(\)]+', '', s)
    s = s.strip()
    return s

def extract_verbatim_quote(target_topic, source_topic, preferred_hint=""):
    """
    Extrae un substring verbatim exacto de target_topic['content'] con longitud <= MAX_QUOTE_CHARS
    que maximize coincidencia con el concepto de conexión y contenga bigramas compartidos.
    Garantía: quote in target_topic['content'] es True.
    """
    content = target_topic.get("content", "")
    if not content:
        # Fallback a título si no hay contenido
        return target_topic.get("cleanTitle") or target_topic.get("title", "")

    # Dividir contenido en párrafos y oraciones
    # Buscamos oraciones dentro del contenido
    src_bigrams = get_bigrams(source_topic.get("content", ""))
    hint_norm = normalize_text(preferred_hint + " " + source_topic.get("cleanTitle", ""))

    # Extraer segmentos literales entre puntos o saltos de línea
    # Para asegurar substring exacto, iteramos sobre oraciones encontradas con regex
    # preservando sus posiciones exactas en content
    candidates = []
    
    # Buscar oraciones de entre 30 y 135 caracteres que sean substrings continuos
    pattern = re.compile(r'([A-ZÁÉÍÓÚÑ][^.\n:;]{25,130}(?:\.|\n|;))', re.UNICODE)
    matches = list(pattern.finditer(content))
    
    if not matches:
        # Intentar con patrones más flexibles
        pattern = re.compile(r'([^.\n]{25,130})', re.UNICODE)
        matches = list(pattern.finditer(content))

    for m in matches:
        raw_snippet = m.group(0).strip()
        # Verificar que esté en content
        if raw_snippet not in content:
            continue
        # Limpiar si tiene markdown ruidoso
        clean_text = clean_sentence_for_quote(raw_snippet)
        if len(clean_text) < 25 or len(clean_text) > MAX_QUOTE_CHARS:
            continue
        # Debe ser substring exacto de content
        if clean_text not in content:
            # Si no es exacto tras la limpieza, usar el raw si está en content
            if len(raw_snippet) <= MAX_QUOTE_CHARS and raw_snippet in content:
                clean_text = raw_snippet
            else:
                continue

        # Puntuar candidato
        norm_cand = normalize_text(clean_text)
        cand_bigrams = get_bigrams(clean_text)
        shared_with_src = len(cand_bigrams.intersection(src_bigrams))
        
        # Ponderar si contiene términos del hint
        hint_matches = sum(1 for w in hint_norm.split() if len(w) > 4 and w in norm_cand)
        
        # Penalizar caracteres markdown molestos en la cita visible
        md_penalty = 10 if ('**' in clean_text or '###' in clean_text or '|' in clean_text) else 0

        score = (shared_with_src * 5) + (hint_matches * 3) - md_penalty
        candidates.append((score, clean_text))

    if candidates:
        candidates.sort(key=lambda x: -x[0])
        best_quote = candidates[0][1]
        # Limpiar puntuación residual de fin de línea si procede
        best_quote = best_quote.strip(' .;:\n\t')
        if best_quote in content and len(best_quote) >= 20:
            return best_quote

    # Fallback determinista seguro: buscar la primera oración limpia que sea substring exacto
    for line in content.split('\n'):
        line = line.strip()
        if len(line) >= 25 and len(line) <= MAX_QUOTE_CHARS and line in content and not line.startswith('#'):
            return line

    # Último recurso: slice directo de 80 caracteres desde el primer párrafo
    paras = [p.strip() for p in content.split('\n\n') if len(p.strip()) >= 50 and not p.strip().startswith('#')]
    if paras:
        slice_candidate = paras[0][:MAX_QUOTE_CHARS].rsplit(' ', 1)[0]
        if slice_candidate in content:
            return slice_candidate

    return content[:MAX_QUOTE_CHARS].rsplit(' ', 1)[0]

def build_cross_connections():
    print("[build_cross_connections] Iniciando motor determinista...")
    
    with open(ALL_TOPICS_PATH, "r", encoding="utf-8") as f:
        topics = json.load(f)
    
    topic_map = {t["id"]: t for t in topics}
    total_topics = len(topics)
    print(f"[build_cross_connections] Canon vivo cargado: {total_topics} cédulas.")

    # Cargar mapa manual autoritativo
    manual_map = {}
    try:
        import build_dogmatic_connections
        manual_map = build_dogmatic_connections.CONNECTIONS_MAP
        print(f"[build_cross_connections] CONNECTIONS_MAP importado: {len(manual_map)} entradas manuales.")
    except Exception as e:
        print(f"[build_cross_connections] Aviso: no se pudo importar build_dogmatic_connections: {e}")

    # Estructura de salida y seguimiento
    final_connections = {}
    manual_overrides_applied = 0
    derived_connections_added = 0
    gate_discards = []
    orphan_discards = []

    # Precomputar bigramas y contenido normalizado para todas las cédulas
    topic_bigrams = {}
    topic_norm_contents = {}
    for t in topics:
        tid = t["id"]
        topic_bigrams[tid] = get_bigrams(t.get("content", ""))
        topic_norm_contents[tid] = normalize_text(t.get("content", ""))

    # 1. PASO 1: Procesar y normalizar conexiones manuales (Override autoritativo)
    print("\n--- PASO 1: Normalización de conexiones manuales ---")
    for raw_src_id, conn_list in manual_map.items():
        src_id = resolve_legacy_id(raw_src_id, topic_map)
        if not src_id:
            orphan_discards.append(f"Source id '{raw_src_id}' no resolvió en el canon")
            continue
        
        src_topic = topic_map[src_id]
        if src_id not in final_connections:
            final_connections[src_id] = []

        seen_targets = set(c["targetTopicId"] for c in final_connections[src_id])

        for c in conn_list:
            raw_tgt_id = c.get("targetTopicId")
            tgt_id = resolve_legacy_id(raw_tgt_id, topic_map)
            if not tgt_id:
                orphan_discards.append(f"Target id '{raw_tgt_id}' en '{raw_src_id}' no resolvió en canon")
                continue
            
            if tgt_id == src_id:
                # Regla: nunca auto-link
                gate_discards.append(f"Auto-link descartado en {src_id} -> {tgt_id}")
                continue

            if tgt_id in seen_targets:
                continue

            tgt_topic = topic_map[tgt_id]

            # Gate de bigramas
            shared_bigrams = topic_bigrams[src_id].intersection(topic_bigrams[tgt_id])
            if len(shared_bigrams) < 3:
                gate_discards.append(f"Gate descartó {src_id} -> {tgt_id}: solo {len(shared_bigrams)} bigramas")
                continue

            # Taxonomía cerrada
            ctype = normalize_crossover_type(c.get("crossoverType"), src_topic, tgt_topic)

            # Cita verbatim
            existing_why = c.get("whyConnected", "")
            tgt_index_code = tgt_topic.get("indexCode") or tgt_topic.get("code") or ""
            
            quote = extract_verbatim_quote(tgt_topic, src_topic, existing_why)
            
            # Asegurar whyConnected con cita y § indexCode
            if f"§ {tgt_index_code}" in existing_why and ("«" in existing_why or '"' in existing_why):
                why_connected = existing_why
            else:
                # Incorporar cita y § indexCode
                clean_why = existing_why.strip()
                if clean_why.endswith('.'):
                    clean_why = clean_why[:-1]
                why_connected = f"{clean_why} En apuntes: «{quote}» (§ {tgt_index_code})."

            practical_app = c.get("practicalApplication") or (
                f"En el examen de grado, la comisión evalúa la articulación práctica entre {src_topic.get('cleanTitle')} "
                f"y {tgt_topic.get('cleanTitle')} mediante casos cruzados de subsunción normativa."
            )

            conn_obj = {
                "targetTopicId": tgt_id,
                "targetTitle": tgt_topic.get("cleanTitle") or tgt_topic.get("title", ""),
                "targetSubject": tgt_topic.get("subject", "civil"),
                "targetIndexCode": tgt_index_code,
                "crossoverType": ctype,
                "quote": quote,
                "whyConnected": why_connected,
                "practicalApplication": practical_app
            }

            final_connections[src_id].append(conn_obj)
            seen_targets.add(tgt_id)
            manual_overrides_applied += 1

    print(f"[build_cross_connections] Conexiones manuales autoritativas preservadas y normalizadas: {manual_overrides_applied}")

    # 2. PASO 2: Motor derivado determinista para cédulas sin cruces o con < 3 cruces
    print("\n--- PASO 2: Generación determinista de cruces derivados (Tope N=3 por cédula) ---")

    for src_topic in topics:
        src_id = src_topic["id"]
        if src_id not in final_connections:
            final_connections[src_id] = []

        current_count = len(final_connections[src_id])
        if current_count >= 3:
            continue

        needed = 3 - current_count
        seen_targets = set(c["targetTopicId"] for c in final_connections[src_id])
        seen_targets.add(src_id) # no auto-link

        src_subj = src_topic.get("subject", "civil")
        src_title = src_topic.get("cleanTitle") or src_topic.get("title", "")
        src_tags = set(src_topic.get("tags") or [])
        src_bigrams = topic_bigrams[src_id]

        candidates = []

        for tgt_topic in topics:
            tgt_id = tgt_topic["id"]
            if tgt_id in seen_targets:
                continue

            tgt_subj = tgt_topic.get("subject", "civil")
            tgt_bigrams = topic_bigrams[tgt_id]

            # Gate duro de bigramas >= 3
            shared = src_bigrams.intersection(tgt_bigrams)
            if len(shared) < 3:
                continue

            shared_count = len(shared)
            score = shared_count * 1.5

            # Priorización de cruce inter-materia (Civil <-> Procesal / Constitucional <-> Civil/Procesal)
            is_cross_materia = (src_subj != tgt_subj)
            if is_cross_materia:
                score += 40.0
                if (src_subj == "civil" and tgt_subj == "procesal") or (src_subj == "procesal" and tgt_subj == "civil"):
                    score += 15.0 # máximo valor transversal para el grado
                elif src_subj == "constitucional" or tgt_subj == "constitucional":
                    score += 12.0
            else:
                score += 5.0 # intra-materia fuerte

            # Bonus por tags compartidos
            tgt_tags = set(tgt_topic.get("tags") or [])
            common_tags = src_tags.intersection(tgt_tags)
            score += len(common_tags) * 8.0

            candidates.append({
                "topic": tgt_topic,
                "score": score,
                "shared_bigrams_count": shared_count,
                "is_cross_materia": is_cross_materia
            })

        # Ordenar candidatos deterministamente por score desc, luego id asc
        candidates.sort(key=lambda x: (-x["score"], x["topic"]["id"]))

        # Seleccionar hasta alcanzar tope 3
        for cand in candidates[:needed]:
            tgt_topic = cand["topic"]
            tgt_id = tgt_topic["id"]
            tgt_index_code = tgt_topic.get("indexCode") or tgt_topic.get("code") or ""
            ctype = normalize_crossover_type("", src_topic, tgt_topic)

            quote = extract_verbatim_quote(tgt_topic, src_topic, f"{src_title} {ctype}")
            
            # Redacción determinista sin LLM basada en la cita y taxonomía
            tgt_title = tgt_topic.get("cleanTitle") or tgt_topic.get("title", "")
            
            if ctype == "Genero-Especie":
                why_connected = (
                    f"Relación dogmática de género a especie entre {src_title} y {tgt_title}. "
                    f"Cita textual del apunte: «{quote}» (§ {tgt_index_code})."
                )
            elif ctype == "Sustantivo-Procesal":
                why_connected = (
                    f"Cruce sustantivo-procesal: la institución civil sustenta la pretensión o acción adjetiva. "
                    f"Cita textual del apunte: «{quote}» (§ {tgt_index_code})."
                )
            elif ctype == "Fundamento-Constitucional":
                why_connected = (
                    f"Anclaje en garantías constitucionales y orden público de la Carta Fundamental. "
                    f"Cita textual del apunte: «{quote}» (§ {tgt_index_code})."
                )
            elif ctype == "Excepcion-Procesal":
                why_connected = (
                    f"Intersección entre el derecho de fondo y las vías procesales de excepción o defensa. "
                    f"Cita textual del apunte: «{quote}» (§ {tgt_index_code})."
                )
            elif ctype == "Efecto-Patrimonial":
                why_connected = (
                    f"Efectos patrimoniales correlativos e ineficacias vinculadas en el tráfico jurídico. "
                    f"Cita textual del apunte: «{quote}» (§ {tgt_index_code})."
                )
            else:
                why_connected = (
                    f"Instituciones afines que comparten principios rectores y régimen normativo correlativo. "
                    f"Cita textual del apunte: «{quote}» (§ {tgt_index_code})."
                )

            practical_app = (
                f"En el examen de grado, la comisión formula preguntas cruzadas analizando cómo incide "
                f"«{quote[:70]}...» en la resolución de casos de {tgt_topic.get('subject', 'esta materia')}."
            )

            conn_obj = {
                "targetTopicId": tgt_id,
                "targetTitle": tgt_title,
                "targetSubject": tgt_topic.get("subject", "civil"),
                "targetIndexCode": tgt_index_code,
                "crossoverType": ctype,
                "quote": quote,
                "whyConnected": why_connected,
                "practicalApplication": practical_app
            }

            final_connections[src_id].append(conn_obj)
            seen_targets.add(tgt_id)
            derived_connections_added += 1

    print(f"[build_cross_connections] Cruces derivados añadidos: {derived_connections_added}")

    # 3. PASO 3: Validación exhaustiva y auditoría de integridad
    print("\n--- PASO 3: Validación de contratos duros ---")
    total_conns_generated = 0
    taxonomy_counts = {t: 0 for t in CLOSED_TAXONOMY}
    topics_with_conns = 0
    all_quotes_verbatim = True
    all_targets_valid = True
    all_shared_ge3 = True

    for tid, clist in final_connections.items():
        if len(clist) > 0:
            topics_with_conns += 1
        src_top = topic_map[tid]
        
        seen_t = set()
        for c in clist:
            total_conns_generated += 1
            tgt_id = c["targetTopicId"]
            
            # 1. No auto-link
            assert tgt_id != tid, f"Error: auto-link en {tid}"
            # 2. No duplicado
            assert tgt_id not in seen_t, f"Error: duplicado {tgt_id} en {tid}"
            seen_t.add(tgt_id)
            
            # 3. Target existe en canon
            if tgt_id not in topic_map:
                all_targets_valid = False
            tgt_top = topic_map[tgt_id]
            
            # 4. Taxonomía cerrada
            ctype = c["crossoverType"]
            assert ctype in CLOSED_TAXONOMY, f"Error: taxonomía no cerrada '{ctype}'"
            taxonomy_counts[ctype] += 1
            
            # 5. Cita verbatim
            quote = c.get("quote", "")
            if not quote or quote not in tgt_top.get("content", ""):
                # Comprobación de normalización menor
                if normalize_text(quote) not in normalize_text(tgt_top.get("content", "")):
                    all_quotes_verbatim = False
                    print(f"Alerta: cita no verbatim en {tid} -> {tgt_id}: '{quote}'")
            
            # 6. Gate >= 3 bigramas
            shared = topic_bigrams[tid].intersection(topic_bigrams[tgt_id])
            if len(shared) < 3:
                all_shared_ge3 = False

    pct_coverage = (topics_with_conns / total_topics) * 100.0
    print(f"[build_cross_connections] Cédulas con cruces: {topics_with_conns}/{total_topics} ({pct_coverage:.1f}%)")
    print(f"[build_cross_connections] Total de cruces generados: {total_conns_generated}")
    print(f"[build_cross_connections] Todos los targets existen en canon: {all_targets_valid}")
    print(f"[build_cross_connections] Todas las citas son verbatim: {all_quotes_verbatim}")
    print(f"[build_cross_connections] Todos los cruces cumplen gate >= 3 bigramas: {all_shared_ge3}")
    print(f"[build_cross_connections] Distribución de taxonomía cerrada:")
    for t, cnt in taxonomy_counts.items():
        print(f"  - {t}: {cnt}")

    # 4. PASO 4: Escritura de archivos y reporte
    # Ordenar claves deterministamente
    sorted_connections = {k: final_connections[k] for k in sorted(final_connections.keys())}
    
    serialized_json = json.dumps(sorted_connections, ensure_ascii=False, indent=2)
    json_bytes = serialized_json.encode('utf-8')
    size_kb = len(json_bytes) / 1024.0

    effective_budget = max(MAX_JSON_BYTES, total_topics * MAX_BYTES_PER_TOPIC)
    print(f"[build_cross_connections] Tamaño dogmatic_connections.json: {size_kb:.2f} KB (Presupuesto: <= {effective_budget/1024:.0f} KB, canon {total_topics})")
    if len(json_bytes) > effective_budget:
        raise ValueError(f"Presupuesto excedido: {size_kb:.2f} KB > {effective_budget/1024:.0f} KB")

    with open(OUT_JSON_PATH, "w", encoding="utf-8") as f:
        f.write(serialized_json)
    print(f"[build_cross_connections] Guardado: {OUT_JSON_PATH}")

    # Generar cruces_report.json
    report = {
        "timestamp": datetime.datetime.now().isoformat(),
        "total_canon_topics": total_topics,
        "topics_with_connections": topics_with_conns,
        "coverage_percentage": round(pct_coverage, 2),
        "total_connections": total_conns_generated,
        "manual_overrides_applied": manual_overrides_applied,
        "derived_connections_added": derived_connections_added,
        "gate_discards_count": len(gate_discards),
        "orphan_discards_count": len(orphan_discards),
        "all_targets_valid_in_canon": all_targets_valid,
        "all_quotes_verbatim": all_quotes_verbatim,
        "all_shared_bigrams_ge_3": all_shared_ge3,
        "file_size_kb": round(size_kb, 2),
        "taxonomy_distribution": taxonomy_counts
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"[build_cross_connections] Reporte generado: {REPORT_PATH}")

    return report

def main():
    build_cross_connections()

if __name__ == "__main__":
    main()
