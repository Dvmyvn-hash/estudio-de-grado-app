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
    },
    {
        "file": "DERECHO_PROCESAL_LA_PRUEBA.md",
        "subject": "procesal",
        "discipline": "II. Derecho Procesal",
        "defaultCategory": "La Prueba Procesal Civil",
        "defaultChapterNum": 3,
        "categoryMap": {
            "1.1": ("Teoría General de la Prueba Procesal Civil", 3),
            "1.2": ("Teoría General de la Prueba Procesal Civil", 3),
            "1.3": ("Teoría General de la Prueba Procesal Civil", 3),
            "1.4": ("Teoría General de la Prueba Procesal Civil", 3),
            "2.1": ("Etapa Probatoria en el Juicio Ordinario de Mayor Cuantía", 4),
            "2.2": ("Etapa Probatoria en el Juicio Ordinario de Mayor Cuantía", 4),
            "2.3": ("Etapa Probatoria en el Juicio Ordinario de Mayor Cuantía", 4),
            "2.4": ("Etapa Probatoria en el Juicio Ordinario de Mayor Cuantía", 4),
            "3.1": ("Los Medios de Prueba en Particular (Art. 341 CPC)", 5),
            "3.2": ("Los Medios de Prueba en Particular (Art. 341 CPC)", 5),
            "3.3": ("Los Medios de Prueba en Particular (Art. 341 CPC)", 5),
            "3.4": ("Los Medios de Prueba en Particular (Art. 341 CPC)", 5),
            "3.5": ("Los Medios de Prueba en Particular (Art. 341 CPC)", 5),
            "3.6": ("Los Medios de Prueba en Particular (Art. 341 CPC)", 5)
        }
    },
    {
        "file": "PROCEMAYORCUANTIA-pulido.md",
        "subject": "procesal",
        "discipline": "II. Derecho Procesal",
        "defaultCategory": "Procedimiento Ordinario de Mayor Cuantía (Etapa de Discusión)",
        "defaultChapterNum": 6,
        "categoryMap": {
            "1.1": ("Las Medidas Prejudiciales", 6),
            "1.2": ("Las Medidas Prejudiciales", 6),
            "1.3": ("Las Medidas Prejudiciales", 6),
            "1.4": ("Las Medidas Prejudiciales", 6),
            "1.5": ("Las Medidas Prejudiciales", 6),
            "1.6": ("Las Medidas Prejudiciales", 6),
            "2.1": ("La Demanda", 7),
            "2.2": ("La Demanda", 7),
            "2.3": ("La Demanda", 7),
            "2.4": ("La Demanda", 7),
            "3.1": ("Control de Admisibilidad (Examen de Oficio)", 8),
            "3.2": ("Control de Admisibilidad (Examen de Oficio)", 8),
            "3.3": ("Control de Admisibilidad (Examen de Oficio)", 8),
            "3.4": ("Control de Admisibilidad (Examen de Oficio)", 8),
            "3.5": ("Control de Admisibilidad (Examen de Oficio)", 8),
            "3.6": ("Control de Admisibilidad (Examen de Oficio)", 8),
            "4.1": ("Retiro, Desistimiento y Modificación de la Demanda", 9),
            "4.2": ("Retiro, Desistimiento y Modificación de la Demanda", 9),
            "4.3": ("Retiro, Desistimiento y Modificación de la Demanda", 9),
            "4.4": ("Retiro, Desistimiento y Modificación de la Demanda", 9),
            "4.5": ("Retiro, Desistimiento y Modificación de la Demanda", 9),
            "4.6": ("Retiro, Desistimiento y Modificación de la Demanda", 9),
            "5.1": ("El Emplazamiento", 10),
            "5.2": ("El Emplazamiento", 10),
            "5.3": ("El Emplazamiento", 10),
            "5.4": ("El Emplazamiento", 10),
            "6.1": ("Actitudes del Demandado frente a la Demanda", 11),
            "6.2": ("Actitudes del Demandado frente a la Demanda", 11),
            "6.3": ("Actitudes del Demandado frente a la Demanda", 11),
            "6.4": ("Actitudes del Demandado frente a la Demanda", 11),
            "7.1": ("Réplica y Dúplica", 12),
            "7.2": ("Réplica y Dúplica", 12),
            "8.1": ("Etapa de Sentencia y Modos Anormales de Término", 13),
            "8.2": ("Etapa de Sentencia y Modos Anormales de Término", 13),
            "8.3": ("Etapa de Sentencia y Modos Anormales de Término", 13),
            "8.4": ("Etapa de Sentencia y Modos Anormales de Término", 13)
        }
    }
]

# ═══════════════════════════════════════════════════════════════
# TEMARIO CANÓNICO DEL EXAMEN DE GRADO — Orden Oficial
# ═══════════════════════════════════════════════════════════════
# Estructura: {subject: [(orden, chapterNumber, category_keywords[], display_name), ...]}
# - orden: prioridad global (1 = primero en temario, 99 = último)
# - chapterNumber: número de capítulo en el archivo fuente
# - category_keywords: lista de palabras clave para auto-detectar categoría en archivos nuevos
# - display_name: nombre legible para logs/debug
# ═══════════════════════════════════════════════════════════════

TEMARIO_CANONICO = {
    "civil": [
        # Orden oficial: Acto Jurídico → Bienes → Obligaciones → Incumplimiento → RCE → Contratos → Sucesiones → Familia → Garantías
        (1,  1, ["acto juridico", "teoria general del acto", "estructura", "clasificaciones", "voluntad", "consentimiento", "objeto", "causa", "solemnidades", "ineficacias", "representacion", "simulacion"], "Teoría General del Acto Jurídico"),
        (2,  2, ["bienes", "derechos reales", "dominio", "posesion", "tradicion", "prescripcion", "proteccion", "clasificacion", "modos de adquirir"], "Teoría de los Bienes y Derechos Reales"),
        (3,  3, ["obligaciones", "cumplimiento", "pago", "extinguir", "modalidad", "condicion", "plazo", "accion resolutoria", "fuentes", "clasificaciones", "sujetos", "pluralidad"], "Teoría General de las Obligaciones y Cumplimiento"),
        (4,  4, ["incumplimiento", "responsabilidad contractual", "resolucion", "clausula penal", "mora", "culpa", "daños", "perjuicios"], "Incumplimiento y Responsabilidad Contractual"),
        (5,  5, ["responsabilidad extracontractual", "rce", "daño", "culpa", "hecho ilicito", "chance", "medica", "cumulo"], "Responsabilidad Extracontractual (RCE)"),
        (6,  6, ["generalidades de los contratos", "clasificacion contratos", "consentimiento contractual", "formacion del consentimiento"], "Generalidades de los Contratos"),
        (7,  7, ["contrato de promesa", "promesa", "1554 cc", "solemnidad promesa", "plazo o condicion promesa"], "Contrato de Promesa"),
        (8,  8, ["contrato de compraventa", "compraventa", "precio compraventa", "cosa vendida", "vicios redhibitorios", "eviccion"], "Contrato de Compraventa"),
        (9,  9, ["sucesiones", "herencia", "testamento", "legitima", "particion", "sucesion", "intestada", "forzosa"], "Derecho de Sucesiones"),
        (10, 10, ["familia", "matrimonio", "filiacion", "alimentos", "regimen patrimonial", "divorcio", "sociedad conyugal", "bienes reservados"], "Derecho de Familia"),
        (11, 11, ["garantias", "hipoteca", "prenda", "fianza", "caucion", "reales de garantia"], "Derechos Reales de Garantía"),
    ],
    "procesal": [
        # Orden oficial: Orgánico → Normas Comunes → Mayor Cuantía (6-13) → La Prueba (3-5) → Ejecutivo → Cautelares → Recursos → Especiales
        (1,  1, ["accion", "pretension", "proceso", "jurisdiccion", "competencia", "organico", "derecho de accion", "teoria dualista", "teoria monista"], "Parte General (Derecho Procesal Orgánico)"),
        (2,  2, ["partes", "terceros", "comparecencia", "patrocinio", "mandato judicial", "actos procesales", "plazos", "notificaciones", "nulidad procesal", "incidentes", "capacidad procesal", "ius postulandi"], "Normas Comunes a Todo Procedimiento"),
        # MAYOR CUANTÍA — capítulos 6-13 en PROCEMAYORCUANTIA-pulido.md
        (3,  6, ["medidas prejudiciales", "prejudicial", "preparatoria", "probatoria", "precautoria", "declaracion jurada", "exhibicion", "reconocimiento firma"], "Las Medidas Prejudiciales"),
        (4,  7, ["demanda", "libelo", "requisitos demanda", "254 cpc", "individualizacion", "hechos", "fundamentos", "peticiones"], "La Demanda"),
        (5,  8, ["control admisibilidad", "examen oficio", "256 cpc", "ineptitud libelo", "patrocinio legal", "saneamiento"], "Control de Admisibilidad (Examen de Oficio)"),
        (6,  9, ["retiro demanda", "desistimiento", "modificacion demanda", "261 cpc", "148 cpc", "150 cpc", "inmutabilidad litis"], "Retiro, Desistimiento y Modificación de la Demanda"),
        (7, 10, ["emplazamiento", "notificacion demanda", "258 cpc", "259 cpc"], "El Emplazamiento"),
        (8, 11, ["rebeldia", "allanamiento", "excepciones dilatorias", "contestacion demanda", "ficcion negativa", "311 cpc", "313 cpc"], "Actitudes del Demandado frente a la Demanda"),
        (9, 12, ["replica", "duplica", "311 cpc", "312 cpc", "nuevos hechos", "excepciones perentorias"], "Réplica y Dúplica"),
        (10, 13, ["sentencia", "cita oir sentencia", "observaciones prueba", "430 cpc", "desasimiento", "modos anormales termino", "432 cpc", "433 cpc", "162 cpc", "cosajuicio"], "Etapa de Sentencia y Modos Anormales de Término"),
        # LA PRUEBA — capítulos 3-5 en DERECHO_PROCESAL_LA_PRUEBA.md
        (11, 3, ["teoria general prueba", "objeto prueba", "carga prueba", "valoracion prueba", "sana critica", "318 cpc", "hechos sustanciales", "pertinentes", "controvertidos"], "Teoría General de la Prueba Procesal Civil"),
        (12, 4, ["recepcion causa prueba", "auto prueba", "ampliacion prueba", "321 cpc", "322 cpc", "periodo observaciones", "430 cpc", "hechos nuevos", "conocimiento superveniente"], "Etapa Probatoria en el Juicio Ordinario de Mayor Cuantía"),
        (13, 5, ["medios prueba", "documental", "testimonial", "confesional", "absolucion posiciones", "inspeccion personal", "pericial", "presunciones", "341 cpc", "426 cpc", "427 cpc", "1712 cc"], "Los Medios de Prueba en Particular (Art. 341 CPC)"),
        # OTROS PROCEDIMIENTOS
        (14, 14, ["ejecutivo", "titulo ejecutivo", "excepcion ejecutiva", "embargo", "pago", "mandamiento", "oposicion"], "Juicio Ejecutivo"),
        (15, 15, ["cautelar", "medida precautoria", "medidas especificas", "innominadas", "fumus boni iuris", "periculum in mora"], "Medidas Precautorias"),
        (16, 16, ["recurso", "apelacion", "casacion", "queja", "reposicion", "768 cpc", "772 cpc"], "Sistema de Recursos"),
        (17, 17, ["menor cuantia", "sumario", "arriendo", "familia", "laboral", "especial", "monitorio"], "Procedimientos Especiales"),
    ],
    "constitucional": [
        (1,  1, ["accion", "garantias", "amparo", "proteccion", "inconstitucionalidad", "tribunal constitucional", "requisitos", "procedencia"], "Acciones y Garantías Constitucionales"),
        (2,  2, ["derechos fundamentales", "articulo 19", "igualdad", "libertad", "propiedad", "debido proceso", "vida", "honra", "intimidad", "conciencia", "culto", "expresion", "reunion", "asociacion"], "Derechos Fundamentales en Específico (Art. 19 CPR)"),
        (3,  3, ["organos estado", "congreso", "presidente", "poder judicial", "ministerio publico", "contraloria", "tribunal constitucional", "bases institucionalidad"], "Órganos del Estado y Organización Política"),
        (4,  4, ["reforma constitucion", "estado de excepcion", "plebiscito", "soberania", "asamblea constituyente", "congreso pleno"], "Reforma Constitucional y Estado de Excepción"),
    ]
}

# Mapa rápido: (subject, chapterNumber) → (orden_temario, category_name)
TEMARIO_ORDER_MAP = {}
for subj, entries in TEMARIO_CANONICO.items():
    for orden, chap, keywords, name in entries:
        TEMARIO_ORDER_MAP[(subj, chap)] = (orden, name)

DISCIPLINE_MAP = {
    "civil": "I. Derecho Civil",
    "procesal": "II. Derecho Procesal",
    "constitucional": "III. Derecho Constitucional"
}

def discover_fuentes_files(fuentes_dir=None):
    """
    Escanea fuentes/ (o el directorio parametrizado) buscando archivos Markdown (*.md, *.markdown).
    Filtra:
      - Archivos ya declarados en FILES_CONFIG (comparación case-insensitive para Windows).
      - Archivos ocultos o temporales (iniciados con '.' o '~').
      - 'README.md' (case-insensitive).
      - Archivos con contenido menor a 50 caracteres (emitiendo advertencia).
    Retorna la lista de nombres de archivo (basenames) ordenados alfabéticamente (case-insensitive).
    """
    if fuentes_dir is None:
        fuentes_dir = os.path.join(BASE_DIR, "fuentes")

    if not os.path.isdir(fuentes_dir):
        return []

    known_canonical_map = {cfg["file"].lower(): cfg["file"] for cfg in FILES_CONFIG}
    discovered = []

    try:
        entries = sorted(os.listdir(fuentes_dir), key=lambda x: x.lower())
    except Exception as e:
        print(f"Error listando {fuentes_dir}: {e}")
        return []

    for entry in entries:
        lower_entry = entry.lower()
        if not (lower_entry.endswith(".md") or lower_entry.endswith(".markdown")):
            continue
        if entry.startswith(".") or entry.startswith("~"):
            continue
        if lower_entry == "readme.md":
            continue

        # Guardrail Windows: Si coincide con FILES_CONFIG ignorando mayúsculas/minúsculas
        if lower_entry in known_canonical_map:
            canon_name = known_canonical_map[lower_entry]
            if entry != canon_name:
                print(f"ALERTA: Archivo '{entry}' coincide con '{canon_name}' en FILES_CONFIG ignorando mayúsculas/minúsculas. Se usa la entrada de FILES_CONFIG.")
            continue

        full_path = os.path.join(fuentes_dir, entry)
        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as fp:
                content = fp.read()
            if len(content.strip()) < 50:
                print(f"ALERTA: Archivo ignorado por contenido insuficiente (<50 chars): {entry}")
                continue
        except Exception as e:
            print(f"ALERTA: Error leyendo archivo {entry}: {e}")
            continue

        discovered.append(entry)

    return sorted(discovered, key=lambda x: x.lower())

def infer_file_config(filename, filepath):
    """
    Infiere los metadatos (subject, discipline, defaultCategory, defaultChapterNum)
    para un archivo Markdown auto-descubierto a partir de su contenido y estructura.
    """
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
    except Exception:
        text = ""

    lower_text = text.lower()

    # Heurística ponderada de materia con orden de precedencia:
    # 1. Constitucional
    const_keywords = [
        "constitución", "constitucion", "cpr", "art. 19", "art. 20", "artículo 19", "articulo 19",
        "recurso de protección", "recurso de proteccion", "amparo", "tribunal constitucional",
        "derechos fundamentales", "garantías constitucionales", "garantias constitucionales",
        "supremacía constitucional", "supremacia constitucional", "bases de la institucionalidad"
    ]
    # 2. Procesal
    proc_keywords = [
        "código de procedimiento civil", "codigo de procedimiento civil", "cpc",
        "código orgánico de tribunales", "codigo organico de tribunales", "cot",
        "juicio", "incidente", "recurso", "demanda", "prueba", "tribunal", "juzgado",
        "carga de la prueba", "casación", "casacion", "apelación", "apelacion",
        "medida precautoria", "medidas precautorias", "juicio ejecutivo", "notificación", "notificacion"
    ]
    # 3. Civil (fallback)
    civ_keywords = [
        "código civil", "codigo civil", "cc", "acto jurídico", "acto juridico",
        "bienes", "obligaciones", "contrato", "dominio", "posesión", "posesion",
        "responsabilidad", "nulidad", "prescripción", "prescripcion", "compraventa",
        "tradición", "tradicion", "derechos reales"
    ]

    const_score = sum(lower_text.count(kw) for kw in const_keywords)
    proc_score = sum(lower_text.count(kw) for kw in proc_keywords)
    civ_score = sum(lower_text.count(kw) for kw in civ_keywords)

    if const_score > 0 and const_score >= proc_score and const_score >= civ_score:
        subject = "constitucional"
    elif proc_score > 0 and proc_score >= civ_score:
        subject = "procesal"
    else:
        subject = "civil"

    discipline = DISCIPLINE_MAP.get(subject, "I. Derecho Civil")

    # Inferencia de categoría por el primer encabezado #
    default_category = ""
    for line in text.split("\n"):
        l_strip = line.strip()
        if l_strip.startswith("#"):
            default_category = re.sub(r"^#+\s*", "", l_strip).strip().replace("*", "").strip()
            break

    if not default_category:
        default_category = os.path.splitext(filename)[0].replace("_", " ").title()

    # Inferencia de número de capítulo/módulo por encabezado
    mod_match = re.search(r'^(?:#{1,4}\s*)?(?:M[oó]dulo|Cap[ií]tulo|UNIDAD)\s*[:–—]?\s*(\d+)', text, re.IGNORECASE | re.MULTILINE)
    default_chap_num = int(mod_match.group(1)) if mod_match else 1

    return {
        "file": filename,
        "filePath": filepath,
        "subject": subject,
        "discipline": discipline,
        "defaultCategory": default_category,
        "defaultChapterNum": default_chap_num,
        "categoryMap": {},
        "isAutoDiscovered": True
    }

def infer_temario_position(cfg, sections_raw):
    """
    Determina la posición en el temario canónico para un archivo auto-descubierto.
    Analiza el contenido de las secciones extraídas y hace matching por palabras clave.
    Retorna: (orden_temario, chapterNumber_sugerido, category_canonica)
    """
    subject = cfg.get("subject", "civil")
    if subject not in TEMARIO_CANONICO:
        return (99, cfg.get("defaultChapterNum", 1), cfg.get("defaultCategory", "General"))
    
    # Concatenar todo el contenido para análisis
    full_text = " ".join([s.get("content", "") for s in sections_raw]).lower()
    
    best_match = None
    best_score = 0
    
    for orden, chap, keywords, name in TEMARIO_CANONICO[subject]:
        score = sum(full_text.count(kw.lower()) for kw in keywords)
        if score > best_score:
            best_score = score
            best_match = (orden, chap, name)
    
    if best_match and best_score > 0:
        return best_match
    
    # Fallback: usar chapterNumber del archivo si existe en temario
    chap = cfg.get("defaultChapterNum", 1)
    for orden, c, kw, name in TEMARIO_CANONICO[subject]:
        if c == chap:
            return (orden, chap, name)
    
    return (99, chap, cfg.get("defaultCategory", "General"))

def build_files_config(fuentes_dir=None):
    """Construye la lista de configuraciones de archivos: base fija FILES_CONFIG + archivos descubiertos en fuentes/.

    La carpeta `fuentes/` del repositorio es la única fuente canónica de apuntes:
    cualquier archivo nuevo se auto-descubre, se infiere su materia y se secciona
    automáticamente, preservando intactos los 6 archivos canónicos."""
    import copy
    configs = copy.deepcopy(FILES_CONFIG)
    discovered = discover_fuentes_files(fuentes_dir=fuentes_dir)
    target_dir = fuentes_dir if fuentes_dir is not None else os.path.join(BASE_DIR, "fuentes")
    for f in discovered:
        full_path = os.path.join(target_dir, f)
        inferred = infer_file_config(f, full_path)
        configs.append(inferred)
    return configs

def extract_sections_from_auto_discovered_file(cfg, text, lines, clean_stem):
    """
    Auto-secciona un archivo descubierto en fuentes/ según módulos/capítulos o headings Markdown.
    Precedencia:
    1. Módulos explícitos (Módulo N, Capítulo N, UNIDAD N):
       Agrupa el texto por módulo N y genera/renumera secciones N.1, N.2, N.3...
    2. Headings Markdown ## (o ###):
       Si no hay módulos explícitos, cada heading ## delimita una sección 1.1, 1.2...
    3. Fallback monolítico:
       Si no hay estructura, una sola sección M.1 (donde M es defaultChapterNum).
    Garantiza numeración consecutiva por capítulo sin huecos y esquema canónico de cédula.
    """
    mod_regex = re.compile(r'^(?:#{1,4}\s*)?(?:M[oó]dulo|Cap[ií]tulo|UNIDAD)\s*[:–—]?\s*(\d+)\s*[:–\-—]?\s*(.*)$', re.IGNORECASE)
    sec_regex = re.compile(r'^(?:#{1,4}\s*\*{0,2}|\*{2})\s*Secci[oó]n\s*(\d+\.\d+)\s*[:–\-—]\s*(.*?)(?:\*{0,2})$', re.IGNORECASE)
    h2_regex = re.compile(r'^##\s+(.+)$')
    h3_regex = re.compile(r'^###\s+(.+)$')

    # 1. Buscar módulos explícitos
    module_spans = []
    for idx, line in enumerate(lines):
        m = mod_regex.match(line.strip())
        if m:
            m_num = int(m.group(1))
            m_title = m.group(2).strip().replace("*", "").strip()
            module_spans.append((idx, m_num, m_title))

    sections_raw = []

    if module_spans:
        for mi in range(len(module_spans)):
            m_idx, m_num, m_title = module_spans[mi]
            next_m_idx = module_spans[mi + 1][0] if mi + 1 < len(module_spans) else len(lines)
            mod_lines = lines[m_idx:next_m_idx]
            chap_title = m_title or f"Módulo {m_num}"

            # Dentro del módulo, buscar secciones explícitas o headings ##
            sub_sec_headers = []
            for sub_i, line in enumerate(mod_lines):
                if sub_i == 0:
                    continue
                s_match = sec_regex.match(line.strip())
                if s_match:
                    sub_sec_headers.append((sub_i, s_match.group(2).strip().replace("*", "").strip(), s_match.group(1).strip()))
                    continue
                h2_match = h2_regex.match(line.strip())
                if h2_match:
                    sub_sec_headers.append((sub_i, h2_match.group(1).strip().replace("*", "").strip(), None))
                    continue
                h3_match = h3_regex.match(line.strip())
                if h3_match and not any(h[2] is None for h in sub_sec_headers):
                    sub_sec_headers.append((sub_i, h3_match.group(1).strip().replace("*", "").strip(), None))

            if sub_sec_headers:
                for si in range(len(sub_sec_headers)):
                    s_idx, s_title, s_orig_code = sub_sec_headers[si]
                    next_s_idx = sub_sec_headers[si + 1][0] if si + 1 < len(sub_sec_headers) else len(mod_lines)
                    sec_content = "\n".join(mod_lines[s_idx:next_s_idx]).strip()
                    sections_raw.append({
                        "chapterNumber": m_num,
                        "chapterTitle": chap_title,
                        "category": chap_title,
                        "cleanTitle": s_title or f"Sección {si + 1}",
                        "origCode": s_orig_code,
                        "content": sec_content
                    })
            else:
                # Módulo monolítico
                sec_content = "\n".join(mod_lines).strip()
                sections_raw.append({
                    "chapterNumber": m_num,
                    "chapterTitle": chap_title,
                    "category": chap_title,
                    "cleanTitle": chap_title,
                    "origCode": None,
                    "content": sec_content
                })
    else:
        # No hay módulos explícitos: buscar Sección N.N o headings ## / ###
        sec_headers = []
        for idx, line in enumerate(lines):
            s_match = sec_regex.match(line.strip())
            if s_match:
                if "..." in line or "|" in line:
                    continue
                sec_headers.append((idx, s_match.group(2).strip().replace("*", "").strip(), s_match.group(1).strip(), "sec"))
                continue
            h2_match = h2_regex.match(line.strip())
            if h2_match:
                sec_headers.append((idx, h2_match.group(1).strip().replace("*", "").strip(), None, "h2"))
                continue
            h3_match = h3_regex.match(line.strip())
            if h3_match:
                sec_headers.append((idx, h3_match.group(1).strip().replace("*", "").strip(), None, "h3"))

        explicit_secs = [h for h in sec_headers if h[3] == "sec"]
        if explicit_secs:
            filtered_secs = []
            for h in explicit_secs:
                if h[0] < 45 and any(other[2] == h[2] for other in explicit_secs if other[0] >= 45):
                    continue
                filtered_secs.append(h)
            for i in range(len(filtered_secs)):
                s_idx, s_title, s_orig_code, _ = filtered_secs[i]
                next_s_idx = filtered_secs[i + 1][0] if i + 1 < len(filtered_secs) else len(lines)
                sec_content = "\n".join(lines[s_idx:next_s_idx]).strip()
                c_parts = (s_orig_code or "1.1").split(".")
                c_num = int(c_parts[0]) if c_parts[0].isdigit() else cfg.get("defaultChapterNum", 1)
                sections_raw.append({
                    "chapterNumber": c_num,
                    "chapterTitle": cfg.get("defaultCategory") or "General",
                    "category": cfg.get("defaultCategory") or "General",
                    "cleanTitle": s_title or f"Sección {s_orig_code}",
                    "origCode": s_orig_code,
                    "content": sec_content
                })
        else:
            h2_secs = [h for h in sec_headers if h[3] == "h2"]
            target_headings = h2_secs if h2_secs else [h for h in sec_headers if h[3] == "h3"]

            if target_headings:
                chap_num = cfg.get("defaultChapterNum", 1)
                chap_title = cfg.get("defaultCategory") or "General"
                for i in range(len(target_headings)):
                    s_idx, s_title, _, _ = target_headings[i]
                    next_s_idx = target_headings[i + 1][0] if i + 1 < len(target_headings) else len(lines)
                    sec_content = "\n".join(lines[s_idx:next_s_idx]).strip()
                    sections_raw.append({
                        "chapterNumber": chap_num,
                        "chapterTitle": chap_title,
                        "category": chap_title,
                        "cleanTitle": s_title or f"Tema {i + 1}",
                        "origCode": None,
                        "content": sec_content
                    })
            else:
                # Fallback monolítico
                clean_title = ""
                for line in lines:
                    l_strip = line.strip()
                    if l_strip.startswith("#"):
                        clean_title = re.sub(r"^#+\s*", "", l_strip).strip().replace("*", "").strip()
                        break
                if not clean_title:
                    clean_title = os.path.splitext(cfg["file"])[0].replace("_", " ").title()

                chap_num = cfg.get("defaultChapterNum", 1)
                chap_title = cfg.get("defaultCategory") or "General"
                sec_content = text.strip()
                sections_raw.append({
                    "chapterNumber": chap_num,
                    "chapterTitle": chap_title,
                    "category": chap_title,
                    "cleanTitle": clean_title,
                    "origCode": None,
                    "content": sec_content
                })

    # Inferencia de posición canónica a nivel de archivo/documento en el temario oficial
    file_temario_order, file_sugg_chap, file_canon_cat = infer_temario_position(cfg, sections_raw)
    has_explicit_chap = (cfg.get("defaultChapterNum", 1) != 1) or any(
        item.get("chapterNumber", 1) != 1 for item in sections_raw
    )
    single_chap = (len(set(item["chapterNumber"] for item in sections_raw)) <= 1)
    if file_temario_order < 99 and single_chap and not has_explicit_chap:
        for item in sections_raw:
            item["chapterNumber"] = file_sugg_chap
            item["chapterTitle"] = file_canon_cat
            item["category"] = file_canon_cat

    # Post-proceso: Renumerar consecutivamente N.1, N.2, N.3... por capítulo para garantizar sin huecos
    chap_counters = {}
    final_sections = []

    for item in sections_raw:
        chap_num = item["chapterNumber"]
        chap_counters[chap_num] = chap_counters.get(chap_num, 0) + 1
        seq = chap_counters[chap_num]
        code = f"{chap_num}.{seq}"

        sec_content = item["content"]
        clean_title = item["cleanTitle"]
        clean_title = re.sub(r'^(?:Secci[oó]n\s*\d+\.\d+|M[oó]dulo\s*\d+|Cap[ií]tulo\s*\d+)\s*[:–\-—]\s*', '', clean_title, flags=re.IGNORECASE).strip()
        if not clean_title:
            clean_title = f"Cédula {code}"

        tags = []
        for kw in ["dominio", "posesión", "nulidad", "responsabilidad", "contrato", "obligación", "prueba", "resolución", "garantías", "protección", "amparo", "debido proceso", "propiedad", "competencia", "jurisdicción"]:
            if kw in sec_content.lower():
                tags.append(kw.capitalize())
        if not tags:
            tags = ["Examen de Grado", "Derecho"]

        sec_id = f"{cfg['subject']}-{clean_stem}-{code.replace('.', '-')}"
        is_free = (code in ["1.1", "2.1"] and chap_num == 1)

        sec_obj = {
            "id": sec_id,
            "subject": cfg["subject"],
            "discipline": cfg["discipline"],
            "sectionName": cfg["discipline"],
            "chapterNumber": chap_num,
            "chapterTitle": item["chapterTitle"],
            "category": item["category"],
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
        }
        if item.get("origCode"):
            sec_obj["origCode"] = item["origCode"]

        final_sections.append(sec_obj)

    # ═══════════════════════════════════════════════════════════════
    # ASIGNAR POSICIÓN TEMARIO CANÓNICA A CADA SECCIÓN (auto-descubiertos)
    # ═══════════════════════════════════════════════════════════════
    for item in final_sections:
        subj = cfg["subject"]
        chap = item["chapterNumber"]
        key = (subj, chap)
        if key in TEMARIO_ORDER_MAP:
            orden_temario, category_canonica = TEMARIO_ORDER_MAP[key]
            item["_temario_order"] = orden_temario
            item["category"] = category_canonica
            item["chapterTitle"] = category_canonica
        else:
            # Inferir por contenido de la sección individual
            sec_text = item.get("content", "").lower()
            best_orden = 99
            best_cat = item["category"]
            for orden, c, keywords, name in TEMARIO_CANONICO.get(subj, []):
                score = sum(sec_text.count(kw.lower()) for kw in keywords)
                if score > 0 and orden < best_orden:
                    best_orden = orden
                    best_cat = name
            item["_temario_order"] = best_orden
            item["category"] = best_cat
            item["chapterTitle"] = best_cat

    return final_sections

def extract_sections_from_file(cfg):
    # Prioridad canónica: fuentes/ del repositorio (git-trackeable), luego Desktop/Fuentes_Grado/APUNTES.
    fpath = os.path.join(BASE_DIR, "fuentes", cfg["file"])
    if not os.path.exists(fpath):
        fpath = os.path.join(APUNTES_DIR, cfg["file"])
    if not os.path.exists(fpath):
        if "filePath" in cfg and os.path.exists(cfg["filePath"]):
            fpath = cfg["filePath"]
        else:
            print(f"ALERTA: Archivo no encontrado {cfg['file']} (buscado en fuentes y APUNTES)")
            return []

    with open(fpath, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()

    lines = text.split("\n")

    stem_raw = os.path.splitext(cfg["file"])[0].lower()
    clean_stem = re.sub(r'[^a-zA-Z0-9]', '', stem_raw)[:10] or "nota"

    if cfg.get("isAutoDiscovered"):
        return extract_sections_from_auto_discovered_file(cfg, text, lines, clean_stem)

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
        is_free = (code in ["1.1", "2.1"] and chap_num == 1)

        # Temario canónico para caso monolítico
        key = (cfg["subject"], chap_num)
        if key in TEMARIO_ORDER_MAP:
            orden_temario, category_canonica = TEMARIO_ORDER_MAP[key]
            category = category_canonica
        else:
            orden_temario = 99

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
            "connections": [],
            "_temario_order": orden_temario
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

        # ═══════════════════════════════════════════════════════════════
        # ASIGNAR ORDEN TEMARIO CANÓNICO (archivos canónicos - sobrescribe categoryMap)
        # ═══════════════════════════════════════════════════════════════
        key = (cfg["subject"], chap_num)
        if key in TEMARIO_ORDER_MAP:
            orden_temario, category_canonica = TEMARIO_ORDER_MAP[key]
            category = category_canonica  # sobrescribe categoryMap
            chap_num = chap_num  # mantener chapterNumber del archivo
        else:
            orden_temario = 99

        sec_id = f"{cfg['subject']}-{clean_stem}-{code.replace('.', '-')}"
        is_free = (code in ["1.1", "2.1"] and chap_num == 1)

        sec_obj = {
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
            "connections": [],
            "_temario_order": orden_temario
        }
        sections.append(sec_obj)

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
    Criterio de prevalencia (v7.8): en igualdad de origen, prevalece la versión con mayor
    contenido (charCount). Preserva el orden relativo original.
    """
    if not all_sections:
        return []

    unique_sections = []
    seen_map = {}  # (subject, chapterNumber, code) -> index in unique_sections
    seen_ids = {}  # id -> index in unique_sections

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
            new_len = sec.get("charCount") or len(sec.get("content", ""))
            exist_len = existing.get("charCount") or len(existing.get("content", ""))
            if new_len >= exist_len:
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
    Ordena determinísticamente según el Temario Canónico del Examen de Grado:
      1. _temario_order asc (prioridad canónica absoluta)
      2. chapterNumber asc (capítulo dentro del bloque)
      3. parse_code_tuple(code) asc (código ordinal 1.1, 1.2...)
      4. _orig_idx asc (tie-breaker determinista)
    Deduplica primero para asegurar que ninguna sección se repita.
    Limpia los campos temporales y muta all_sections in-place.
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

    ordered_sections = []
    for d_idx, subj in enumerate(disciplines, start=1):
        prefix = discipline_prefixes.get(subj, d_idx)
        subj_sections = [sec for sec in all_sections if sec.get("subject", "civil") == subj]

        def sort_key(s):
            temario_orden = s.get("_temario_order")
            chap = s.get("chapterNumber") or 1
            if temario_orden is None:
                temario_orden = TEMARIO_ORDER_MAP.get((subj, chap), (99, ""))[0]
            c_tuple = parse_code_tuple(s.get("code", ""))
            return (temario_orden, chap, c_tuple, s.get("_orig_idx", 0))

        subj_sections.sort(key=sort_key)

        for seq, sec in enumerate(subj_sections, start=1):
            sec["indexCode"] = f"{prefix}.{seq}"

        ordered_sections.extend(subj_sections)

    all_sections.clear()
    all_sections.extend(ordered_sections)

    for sec in all_sections:
        sec.pop("_orig_idx", None)
        sec.pop("_temario_order", None)

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


