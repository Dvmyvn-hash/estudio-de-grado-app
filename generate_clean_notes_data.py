# -*- coding: utf-8 -*-
"""
Motor de Extracción Fidedigna de Apuntes Personales para Estudio de Grado
Extrae cada SECCIÓN real de los archivos de apunte en su totalidad, sin recortes ni plantillas artificiales.
"""

import os
import re
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APUNTES_DIR = os.path.join(os.path.expanduser("~"), "Desktop", "Fuentes_Grado", "APUNTES")
ALL_TOPICS_PATH = os.path.join(BASE_DIR, "all_afg_topics.json")
DATA_JS_PATH = os.path.join(BASE_DIR, "js", "data.js")

FILES_CONFIG = [
    {
        "file": "ACTO JURIDICO.md",
        "subject": "civil",
        "discipline": "I. Derecho Civil",
        "defaultCategory": "Teoría General del Acto Jurídico",
        "defaultChapterNum": 1,
        "categoryMap": {}
    },
    {
        "file": "LOS BIENES.md",
        "subject": "civil",
        "discipline": "I. Derecho Civil",
        "defaultCategory": "Teoría de los Bienes y Derechos Reales",
        "defaultChapterNum": 2,
        "categoryMap": {}
    },
    {
        "file": "LAS OBLIGACIONES.md",
        "subject": "civil",
        "discipline": "I. Derecho Civil",
        "defaultCategory": "Teoría General de las Obligaciones",
        "defaultChapterNum": 3,
        "categoryMap": {
            "1.1": ("Teoría General de las Obligaciones y Cumplimiento", 3),
            "1.2": ("Teoría General de las Obligaciones y Cumplimiento", 3),
            "1.3": ("Teoría General de las Obligaciones y Cumplimiento", 3),
            "1.4": ("Teoría General de las Obligaciones y Cumplimiento", 3),
            "1.5": ("Teoría General de las Obligaciones y Cumplimiento", 3),
            "1.6": ("Incumplimiento y Responsabilidad Contractual", 4),
            "1.7": ("Incumplimiento y Responsabilidad Contractual", 4)
        }
    },
    {
        "file": "CLASE_9_11.md",
        "subject": "civil",
        "discipline": "I. Derecho Civil",
        "defaultCategory": "Responsabilidad Extracontractual y Contratos",
        "defaultChapterNum": 5,
        "categoryMap": {
            "1.1": ("Responsabilidad Extracontractual (RCE)", 5),
            "1.2": ("Responsabilidad Extracontractual (RCE)", 5),
            "1.3": ("Responsabilidad Extracontractual (RCE)", 5),
            "1.4": ("Responsabilidad Extracontractual (RCE)", 5),
            "2.1": ("Generalidades de los Contratos", 6),
            "2.2": ("Generalidades de los Contratos", 6),
            "2.3": ("Generalidades de los Contratos", 6),
            "3.1": ("Contrato de Promesa", 7),
            "3.2": ("Contrato de Promesa", 7),
            "3.3": ("Contrato de Promesa", 7),
            "4.1": ("Contrato de Compraventa", 8),
            "4.2": ("Contrato de Compraventa", 8),
            "4.3": ("Contrato de Compraventa", 8),
            "4.4": ("Contrato de Compraventa", 8)
        }
    },
    {
        "file": "PROCESAL.md",
        "subject": "procesal",
        "discipline": "II. Derecho Procesal",
        "defaultCategory": "Derecho Procesal Orgánico",
        "defaultChapterNum": 1,
        "categoryMap": {
            "1.1": ("Parte General (Derecho Procesal Orgánico)", 1),
            "1.2": ("Parte General (Derecho Procesal Orgánico)", 1),
            "1.3": ("Parte General (Derecho Procesal Orgánico)", 1),
            "2.1": ("Normas Comunes a Todo Procedimiento", 2),
            "2.2": ("Normas Comunes a Todo Procedimiento", 2),
            "2.3": ("Normas Comunes a Todo Procedimiento", 2),
            "2.4": ("Normas Comunes a Todo Procedimiento", 2),
            "2.5": ("Normas Comunes a Todo Procedimiento", 2),
            "2.6": ("Normas Comunes a Todo Procedimiento", 2)
        }
    },
    {
        "file": "CONSTITUCIONAL.md",
        "subject": "constitucional",
        "discipline": "III. Derecho Constitucional",
        "defaultCategory": "Teoría de los Derechos y Acciones",
        "defaultChapterNum": 1,
        "categoryMap": {
            "1.1": ("Acciones y Garantías Constitucionales", 1),
            "1.2": ("Acciones y Garantías Constitucionales", 1),
            "1.3": ("Acciones y Garantías Constitucionales", 1),
            "1.4": ("Acciones y Garantías Constitucionales", 1),
            "2.1": ("Derechos Fundamentales en Específico (Art. 19 CPR)", 2),
            "2.2": ("Derechos Fundamentales en Específico (Art. 19 CPR)", 2),
            "2.3": ("Derechos Fundamentales en Específico (Art. 19 CPR)", 2),
            "2.4": ("Derechos Fundamentales en Específico (Art. 19 CPR)", 2),
            "2.5": ("Derechos Fundamentales en Específico (Art. 19 CPR)", 2),
            "2.6": ("Derechos Fundamentales en Específico (Art. 19 CPR)", 2)
        }
    }
]

REGISTRY_PATH = os.path.join(BASE_DIR, "apuntes_registry.json")
DISCIPLINE_MAP = {
    "civil": "I. Derecho Civil",
    "procesal": "II. Derecho Procesal",
    "constitucional": "III. Derecho Constitucional"
}

def build_files_config():
    """Construye la lista de configuraciones de archivos fusionando la base fija con apuntes_registry.json.
    Deduplica para que apuntes administrados (subidos por admin) prevalezcan sobre apuntes fijos."""
    import copy
    configs = copy.deepcopy(FILES_CONFIG)
    existing_files = {c["file"].lower(): c for c in configs}

    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                registry = json.load(f)
            
            # Deduplicar entradas del registro si hubiesen duplicados por archivo o capítulo
            raw_entries = registry.get("files", [])
            seen_entries = {}
            for entry in raw_entries:
                fname = (entry.get("file") or "").strip()
                if not fname:
                    continue
                seen_entries[fname.lower()] = entry  # Última versión subida prevalece

            for fname_key, entry in seen_entries.items():
                fname = entry.get("file")
                subj = entry.get("subject", "civil")
                disc = entry.get("discipline") or DISCIPLINE_MAP.get(subj, "I. Derecho Civil")
                cat = entry.get("defaultCategory") or entry.get("chapterTitle") or "General"
                chap_num = int(entry.get("defaultChapterNum") or 1)
                chap_title = entry.get("chapterTitle") or cat

                # Coincidencia 1: Mismo nombre de archivo (case-insensitive)
                if fname_key in existing_files:
                    target = existing_files[fname_key]
                    target["file"] = fname
                    target["subject"] = subj
                    target["discipline"] = disc
                    target["defaultCategory"] = cat
                    target["defaultChapterNum"] = chap_num
                    target["chapterTitle"] = chap_title
                    target["source"] = entry.get("source", "admin-upload")
                else:
                    new_cfg = {
                        "file": fname,
                        "subject": subj,
                        "discipline": disc,
                        "defaultCategory": cat,
                        "defaultChapterNum": chap_num,
                        "chapterTitle": chap_title,
                        "categoryMap": entry.get("categoryMap") or {},
                        "source": entry.get("source", "admin-upload")
                    }
                    configs.append(new_cfg)
                    existing_files[fname_key] = new_cfg
        except Exception as e:
            print("Error cargando apuntes_registry.json:", e)

    return configs

def extract_sections_from_file(cfg):
    fpath = os.path.join(APUNTES_DIR, cfg["file"])
    if not os.path.exists(fpath):
        fpath = os.path.join(BASE_DIR, "fuentes", cfg["file"])
    if not os.path.exists(fpath):
        print(f"ALERTA: Archivo no encontrado {cfg['file']} (buscado en APUNTES y fuentes)")
        return []

    with open(fpath, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()

    lines = text.split("\n")
    sec_regex = re.compile(r'^(?:#{1,4}\s*\*{0,2}|\*{2})\s*Secci[oó]n\s*(\d+\.\d+)\s*[:–\-—]\s*(.*?)(?:\*{0,2})$', re.IGNORECASE)

    section_headers = []
    for idx, line in enumerate(lines):
        m = sec_regex.match(line.strip())
        if m:
            code = m.group(1).strip()
            title = m.group(2).strip().replace("*", "").strip()
            if "..." in line or "|" in line:
                continue
            section_headers.append((idx, code, title, line))

    # Filtrar entradas del índice que aparecen al inicio
    filtered_headers = []
    for idx, code, title, raw in section_headers:
        if idx < 45 and any(h[1] == code for h in section_headers if h[0] >= 45):
            continue
        filtered_headers.append((idx, code, title, raw))

    stem_raw = os.path.splitext(cfg["file"])[0].lower()
    clean_stem = re.sub(r'[^a-zA-Z0-9]', '', stem_raw)[:10] or "nota"

    # Caso sin encabezados Sección N.N: generar una única sección con el archivo completo
    if not filtered_headers:
        clean_title = ""
        for line in lines:
            l_strip = line.strip()
            if l_strip.startswith("#"):
                clean_title = re.sub(r"^#+\s*", "", l_strip).strip()
                break
        if not clean_title:
            clean_title = os.path.splitext(cfg["file"])[0].replace("_", " ").title()

        code = "1.1"
        cat_info = cfg.get("categoryMap", {}).get(code)
        if cat_info:
            category, chap_num = cat_info
        else:
            category = cfg.get("defaultCategory") or cfg.get("chapterTitle") or "General"
            chap_num = cfg.get("defaultChapterNum", 1)

        tags = []
        for kw in ["dominio", "posesión", "nulidad", "responsabilidad", "contrato", "obligación", "prueba", "resolución", "garantías", "protección", "amparo", "debido proceso", "propiedad"]:
            if kw in text.lower():
                tags.append(kw.capitalize())
        if not tags:
            tags = ["Examen de Grado", "Derecho"]

        sec_id = f"{cfg['subject']}-{clean_stem}-{code.replace('.', '-')}"
        sec_content = text.strip()
        is_free = False if cfg.get("source") == "admin-upload" else (code in ["1.1", "2.1"] and chap_num == 1)

        return [{
            "id": sec_id,
            "subject": cfg["subject"],
            "discipline": cfg["discipline"],
            "sectionName": cfg["discipline"],
            "chapterNumber": chap_num,
            "chapterTitle": category,
            "category": category,
            "code": code,
            "title": f"Sección {code}: {clean_title}",
            "cleanTitle": clean_title,
            "sourceFile": cfg["file"],
            "userSourceFiles": [cfg["file"]],
            "hasUserNotes": True,
            "tags": tags[:5],
            "isFree": is_free,
            "content": sec_content,
            "charCount": len(sec_content),
            "connections": []
        }]

    sections = []
    for i in range(len(filtered_headers)):
        start_idx, code, clean_title, raw = filtered_headers[i]
        end_idx = filtered_headers[i+1][0] if i+1 < len(filtered_headers) else len(lines)

        sec_lines = lines[start_idx:end_idx]
        sec_content = "\n".join(sec_lines).strip()

        # Extraer etiquetas de conceptos desde el texto
        tags = []
        for kw in ["dominio", "posesión", "nulidad", "responsabilidad", "contrato", "obligación", "prueba", "resolución", "garantías", "protección", "amparo", "debido proceso", "propiedad"]:
            if kw in sec_content.lower():
                tags.append(kw.capitalize())
        if not tags:
            tags = ["Examen de Grado", "Derecho"]

        # Determinar categoría y número de capítulo
        cat_info = cfg.get("categoryMap", {}).get(code)
        if cat_info:
            category, chap_num = cat_info
        else:
            category = cfg.get("defaultCategory") or cfg.get("chapterTitle") or "General"
            chap_num = cfg.get("defaultChapterNum", 1)

        sec_id = f"{cfg['subject']}-{clean_stem}-{code.replace('.', '-')}"
        is_free = False if cfg.get("source") == "admin-upload" else (code in ["1.1", "2.1"] and chap_num == 1)

        sections.append({
            "id": sec_id,
            "subject": cfg["subject"],
            "discipline": cfg["discipline"],
            "sectionName": cfg["discipline"],
            "chapterNumber": chap_num,
            "chapterTitle": category,
            "category": category,
            "code": code,
            "title": f"Sección {code}: {clean_title}",
            "cleanTitle": clean_title,
            "sourceFile": cfg["file"],
            "userSourceFiles": [cfg["file"]],
            "hasUserNotes": True,
            "tags": tags[:5],
            "isFree": is_free,
            "content": sec_content,
            "charCount": len(sec_content),
            "connections": []
        })

    return sections

def update_data_js(all_sections):
    """Actualiza topics en js/data.js manteniendo intactos los casos y el grafo institucional."""
    if not os.path.exists(DATA_JS_PATH):
        return
    try:
        with open(DATA_JS_PATH, "r", encoding="utf-8") as f:
            old_data = f.read()

        cases_start = old_data.find("cases: [")
        graph_start = old_data.find("graph: {")
        if cases_start == -1 or graph_start == -1:
            return
        cases_raw = old_data[cases_start:graph_start]
        # Limpiar cualquier comentario acumulado de grafo al final de cases
        cases_clean = re.sub(r'//\s*3\.\s*GRAFO.*$', '', cases_raw, flags=re.MULTILINE).strip().rstrip(",")
        graph_match = old_data[graph_start:old_data.rfind("};")].strip()

        new_data_js = f"""/**
 * ESTUDIO DE GRADO - APUNTES COMPLETOS DESARROLLADOS
 * Cada sección del temario corresponde exactamente al contenido desarrollado de los apuntes.
 * Enriquecido automáticamente con Conexiones Dogmáticas y Aplicaciones Prácticas con IA.
 */

const INITIAL_DATA = {{
  // 1. SECCIONES COMPLETAS Y DESARROLLADAS DEL APUNTE ({len(all_sections)} SECCIONES EN TOTAL)
  topics: {json.dumps(all_sections, ensure_ascii=False, indent=2)},

  // 2. TALLER DE CASOS PRÁCTICOS
  {cases_clean},

  // 3. GRAFO INTERACTIVO DE INSTITUCIONES
  {graph_match}
}};
"""
        with open(DATA_JS_PATH, "w", encoding="utf-8") as f:
            f.write(new_data_js)
        print(f"Guardado exitosamente en: {DATA_JS_PATH}")
    except Exception as e:
        print("Error actualizando js/data.js:", e)

def parse_code_tuple(code_str):
    """Convierte un código como '1.2' o '1.10' a tupla de enteros (1, 2) para ordenamiento natural."""
    parts = (code_str or "").split(".")
    res = []
    for p in parts:
        digits = re.findall(r"\d+", p)
        res.append(int(digits[0]) if digits else 0)
    return tuple(res)

def deduplicate_sections(all_sections):
    """
    Deduplica las secciones por tupla canónica (subject, chapterNumber, code) o id.
    Criterio de prevalencia:
    1. Si una sección proviene de un apunte administrado (source == 'admin-upload' o archivo registrado),
       prevalece sobre la sección fija preconfigurada.
    2. En caso de igualdad de origen, prevalece la versión con mayor contenido (charCount) o la procesada más recientemente.
    Preserva el orden relativo original.
    """
    if not all_sections:
        return []

    unique_sections = []
    seen_map = {}  # (subject, chapterNumber, code) -> index in unique_sections
    seen_ids = {}  # id -> index in unique_sections

    fixed_filenames = {c["file"].lower() for c in FILES_CONFIG}

    for sec in all_sections:
        subj = sec.get("subject", "civil")
        chap = sec.get("chapterNumber", 1)
        code = sec.get("code", "1.1")
        sec_id = sec.get("id")

        primary_key = (subj, chap, code)

        target_idx = None
        if primary_key in seen_map:
            target_idx = seen_map[primary_key]
        elif sec_id and sec_id in seen_ids:
            target_idx = seen_ids[sec_id]

        if target_idx is None:
            idx = len(unique_sections)
            unique_sections.append(sec)
            seen_map[primary_key] = idx
            if sec_id:
                seen_ids[sec_id] = idx
        else:
            existing = unique_sections[target_idx]
            new_is_admin = (sec.get("source") == "admin-upload") or (sec.get("sourceFile", "").lower() not in fixed_filenames)
            existing_is_admin = (existing.get("source") == "admin-upload") or (existing.get("sourceFile", "").lower() not in fixed_filenames)

            should_replace = False
            if new_is_admin and not existing_is_admin:
                should_replace = True
            elif new_is_admin == existing_is_admin:
                new_len = sec.get("charCount") or len(sec.get("content", ""))
                exist_len = existing.get("charCount") or len(existing.get("content", ""))
                if new_len >= exist_len:
                    should_replace = True

            if should_replace:
                if not sec.get("connections") and existing.get("connections"):
                    sec["connections"] = existing["connections"]
                unique_sections[target_idx] = sec
                if sec_id:
                    seen_ids[sec_id] = target_idx

    return unique_sections

def assign_index_codes(all_sections):
    """
    Asigna un indexCode canónico único y secuencial ('N.M') por disciplina a todas las secciones.
    N = 1 (Civil), 2 (Procesal), 3 (Constitucional).
    Ordena determinísticamente por (chapterNumber asc, parse_code_tuple(code) asc, original_index asc).
    Deduplica primero para asegurar que ninguna sección se repita.
    Muta all_sections in-place y la retorna.
    """
    deduped = deduplicate_sections(all_sections)
    all_sections.clear()
    all_sections.extend(deduped)

    discipline_prefixes = {
        "civil": 1,
        "procesal": 2,
        "constitucional": 3
    }

    for idx, sec in enumerate(all_sections):
        sec["_orig_idx"] = idx

    disciplines = ["civil", "procesal", "constitucional"]
    for sec in all_sections:
        s = sec.get("subject", "civil")
        if s not in disciplines:
            disciplines.append(s)

    for d_idx, subj in enumerate(disciplines, start=1):
        prefix = discipline_prefixes.get(subj, d_idx)
        subj_sections = [sec for sec in all_sections if sec.get("subject", "civil") == subj]

        def sort_key(s):
            chap = s.get("chapterNumber") or 1
            c_tuple = parse_code_tuple(s.get("code", ""))
            return (chap, c_tuple, s.get("_orig_idx", 0))

        subj_sections.sort(key=sort_key)

        for seq, sec in enumerate(subj_sections, start=1):
            sec["indexCode"] = f"{prefix}.{seq}"

    for sec in all_sections:
        sec.pop("_orig_idx", None)

    return all_sections

def main():
    configs = build_files_config()
    all_sections = []
    for cfg in configs:
        secs = extract_sections_from_file(cfg)
        print(f"Cargadas {len(secs)} secciones de {cfg['file']} ({cfg['discipline']})")
        all_sections.extend(secs)

    # Cargar conexiones dogmáticas analizadas con IA si existen
    conn_path = os.path.join(BASE_DIR, "dogmatic_connections.json")
    dogmatic_connections = {}
    if os.path.exists(conn_path):
        try:
            with open(conn_path, "r", encoding="utf-8") as f:
                dogmatic_connections = json.load(f)
            print(f"Cargadas {len(dogmatic_connections)} conexiones dogmáticas desde {conn_path}")
        except Exception as e:
            print(f"Error cargando {conn_path}: {e}")

    for sec in all_sections:
        sec["connections"] = dogmatic_connections.get(sec["id"], [])

    # Asignar indexCodes canónicos únicos y ordenados por disciplina
    assign_index_codes(all_sections)

    # Guardar en all_afg_topics.json
    with open(ALL_TOPICS_PATH, "w", encoding="utf-8") as f:
        json.dump(all_sections, f, ensure_ascii=False, indent=2)
    print(f"Guardado exitosamente en: {ALL_TOPICS_PATH}")

    update_data_js(all_sections)

if __name__ == "__main__":
    main()


