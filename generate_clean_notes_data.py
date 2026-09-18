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

def extract_sections_from_file(cfg):
    fpath = os.path.join(APUNTES_DIR, cfg["file"])
    if not os.path.exists(fpath):
        print(f"ALERTA: Archivo no encontrado {fpath}")
        return []

    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
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
        cat_info = cfg["categoryMap"].get(code)
        if cat_info:
            category, chap_num = cat_info
        else:
            category = cfg["defaultCategory"]
            chap_num = cfg["defaultChapterNum"]

        sec_id = f"{cfg['subject']}-{cfg['file'][:4].lower().replace('_', '')}-{code.replace('.', '-')}"

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
            "isFree": (code in ["1.1", "2.1"] and chap_num == 1),
            "content": sec_content,
            "charCount": len(sec_content)
        })

    return sections

def main():
    all_sections = []
    for cfg in FILES_CONFIG:
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

    # Guardar en all_afg_topics.json
    with open(ALL_TOPICS_PATH, "w", encoding="utf-8") as f:
        json.dump(all_sections, f, ensure_ascii=False, indent=2)
    print(f"Guardado exitosamente en: {ALL_TOPICS_PATH}")

    # Leer viejo data.js para mantener casos prácticos y grafo
    with open(DATA_JS_PATH, "r", encoding="utf-8") as f:
        old_data = f.read()

    cases_start = old_data.find("cases: [")
    graph_start = old_data.find("graph: {")
    cases_match = old_data[cases_start:graph_start].strip().rstrip(",")
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
  {cases_match},

  // 3. GRAFO INTERACTIVO DE INSTITUCIONES
  {graph_match}
}};
"""
    with open(DATA_JS_PATH, "w", encoding="utf-8") as f:
        f.write(new_data_js)
    print(f"Guardado exitosamente en: {DATA_JS_PATH}")

if __name__ == "__main__":
    main()

