"""
Servidor HTTP Inteligente con Sincronización Automática en Tiempo Real
Estudio de Grado Hub (Civil, Procesal, Constitucional)
Monitorea la carpeta Escritorio/Fuentes_Grado/APUNTES y entrega las actualizaciones en vivo al navegador.
"""

import http.server
import socketserver
import os
import json
import time
import re
import urllib.parse
from pathlib import Path

# Soporte opcional para PDF y DOCX
try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

PORT = 8080
BASE_DIR = Path(__file__).resolve().parent
FUENTES_DIR = BASE_DIR / "fuentes"
CASOS_DIR = BASE_DIR / "CASOS"
CASOS_DIR_LOWER = BASE_DIR / "casos"
DESKTOP_FUENTES_DIR = Path(os.path.expanduser("~")) / "Desktop" / "Fuentes_Grado"
APUNTES_DIR = DESKTOP_FUENTES_DIR / "APUNTES"
DESKTOP_CASOS_DIR = DESKTOP_FUENTES_DIR / "CASOS"
DESKTOP_CASOS_DIR_LOWER = DESKTOP_FUENTES_DIR / "casos"
CONFIG_FILE = BASE_DIR / "sync_config.json"
ALL_TOPICS_PATH = BASE_DIR / "all_afg_topics.json"
ALL_CASES_PATH = BASE_DIR / "all_cases.json"
DATA_JS_PATH = BASE_DIR / "js" / "data.js"

# Asegurar carpetas
FUENTES_DIR.mkdir(exist_ok=True)
CASOS_DIR.mkdir(exist_ok=True)
try:
    DESKTOP_FUENTES_DIR.mkdir(parents=True, exist_ok=True)
    APUNTES_DIR.mkdir(parents=True, exist_ok=True)
    DESKTOP_CASOS_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

SUPPORTED_EXTENSIONS = ('.md', '.txt', '.markdown', '.pdf', '.docx', '.json')

# Políticas de Seguridad y Optimización de Almacenamiento
MAX_PAYLOAD_SIZE = 131072  # 128 KB máximo de carga útil para prevenir DoS / saturación de memoria
MAX_AI_PRACTICE_CASES = 10  # Límite FIFO de casos de práctica IA para evitar sobrecarga de almacenamiento
SAFE_CASE_ID_REGEX = re.compile(r"^caso-ia-[0-9a-zA-Z_-]{4,36}$")


def get_watched_directories():
    """Obtiene las carpetas vigiladas (fuentes, casos, Escritorio Fuentes_Grado, APUNTES y CASOS)"""
    dirs = [FUENTES_DIR]
    if CASOS_DIR.exists():
        dirs.append(CASOS_DIR)
    elif CASOS_DIR_LOWER.exists():
        dirs.append(CASOS_DIR_LOWER)

    if DESKTOP_FUENTES_DIR.exists():
        dirs.append(DESKTOP_FUENTES_DIR)
    if APUNTES_DIR.exists():
        dirs.append(APUNTES_DIR)
    if DESKTOP_CASOS_DIR.exists():
        dirs.append(DESKTOP_CASOS_DIR)
    elif DESKTOP_CASOS_DIR_LOWER.exists():
        dirs.append(DESKTOP_CASOS_DIR_LOWER)

    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                custom_path = cfg.get("custom_sync_folder")
                if custom_path and os.path.isdir(custom_path):
                    dirs.append(Path(custom_path))
        except Exception as e:
            print("Error leyendo sync_config.json:", e)
    return dirs

def get_files_hash():
    """Calcula una marca de tiempo/hash de todos los archivos vigilados para detectar cambios"""
    latest_mtime = 0
    file_count = 0
    for folder in get_watched_directories():
        if folder.exists():
            for root, _, files in os.walk(folder):
                for file in files:
                    if file.lower().endswith(SUPPORTED_EXTENSIONS):
                        file_count += 1
                        filepath = os.path.join(root, file)
                        try:
                            mtime = os.path.getmtime(filepath)
                            if mtime > latest_mtime:
                                latest_mtime = mtime
                        except OSError:
                            pass
    return f"{file_count}_{int(latest_mtime)}"

def extract_text_from_file(filepath):
    """Extrae texto de archivos .md, .txt, .pdf y .docx"""
    ext = Path(filepath).suffix.lower()
    
    # PDF
    if ext == '.pdf' and HAS_PYPDF:
        try:
            reader = pypdf.PdfReader(filepath)
            pages_text = []
            for i, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                if txt.strip():
                    pages_text.append(f"### Página {i+1}\n\n{txt}")
            return "\n\n".join(pages_text)
        except Exception as e:
            print(f"Error extrayendo PDF {filepath}: {e}")
            return ""

    # DOCX
    if ext == '.docx' and HAS_DOCX:
        try:
            doc = docx.Document(filepath)
            paras = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n\n".join(paras)
        except Exception as e:
            print(f"Error extrayendo DOCX {filepath}: {e}")
            return ""

    # Archivo de texto / Markdown normal
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception as e:
        print(f"Error leyendo {filepath}: {e}")
        return ""

def extract_section_content(full_text, keywords, max_len=16000):
    """Extrae bloques relevantes del texto según palabras clave de la cédula"""
    paragraphs = full_text.split("\n\n")
    matched_paras = []
    
    for p in paragraphs:
        p_lower = p.lower()
        if any(kw.lower() in p_lower for kw in keywords):
            matched_paras.append(p.strip())
            
    if not matched_paras:
        return ""
        
    combined = "\n\n".join(matched_paras)
    if len(combined) > max_len:
        combined = combined[:max_len] + "\n\n*(Extracto representativo del apunte del postulante...)*"
    return combined

def load_user_apuntes():
    """Lee y cachea todos los apuntes presentes en la carpeta APUNTES y Fuentes_Grado"""
    user_files = {}
    scan_folders = [APUNTES_DIR, DESKTOP_FUENTES_DIR, FUENTES_DIR]
    
    for folder in scan_folders:
        if folder.exists():
            for fname in os.listdir(folder):
                fpath = folder / fname
                if fpath.is_file() and fname.lower().endswith(SUPPORTED_EXTENSIONS) and not fname.lower().startswith("temario general"):
                    if fname not in user_files:
                        user_files[fname] = extract_text_from_file(str(fpath))
    return user_files

def match_topic_to_user_notes(topic, user_files):
    """
    Motor inteligente de emparejamiento pedagógico entre el temario oficial AFG
    y los archivos de apuntes cargados por el postulante en APUNTES.
    """
    subj = topic.get("subject", "")
    code = topic.get("code", "")
    c_num = topic.get("chapterNumber", 1)
    title_lower = topic.get("title", "").lower()

    # 1. DERECHO CIVIL Y FAMILIA
    if subj == "civil":
        if c_num == 1:
            if "1.1" in code:
                txt = user_files.get("ACTO JURIDICO.md") or user_files.get("ACTO JURIDICO.docx")
                if txt:
                    return True, "ACTO JURIDICO.md", txt
            elif "1.2" in code:
                txt = user_files.get("LAS OBLIGACIONES.md") or user_files.get("LAS OBLIGACIONES.docx")
                if txt:
                    snip = extract_section_content(txt, ["concepto", "fuentes de las obligaciones", "dar, hacer", "especie", "genero"])
                    return True, "LAS OBLIGACIONES.md", snip or txt[:14000]

        elif c_num == 2:
            txt = user_files.get("LOS BIENES.md") or user_files.get("LOS BIENES.docx")
            if txt:
                if "2.1" in code:
                    snip = extract_section_content(txt, ["dominio", "propiedad", "copropiedad", "tradicion", "modos de adquirir"])
                elif "2.2" in code:
                    snip = extract_section_content(txt, ["posesion", "posesion inscrita", "mera tenencia", "conservador"])
                else: # 2.3
                    snip = extract_section_content(txt, ["reivindicatoria", "prestaciones mutuas", "posesorias", "amparo", "restitucion"])
                return True, "LOS BIENES.md", snip or txt[:14000]

        elif c_num == 3:
            txt = user_files.get("LAS OBLIGACIONES.md") or user_files.get("LAS OBLIGACIONES.docx")
            if txt:
                if "3.1" in code:
                    snip = extract_section_content(txt, ["solidarias", "indivisibles", "condicion", "plazo", "pago", "consignacion", "subrogacion"])
                else: # 3.2
                    snip = extract_section_content(txt, ["incumplimiento", "responsabilidad contractual", "dolo", "culpa", "mora", "perjuicios"])
                return True, "LAS OBLIGACIONES.md", snip or txt[:14000]

        elif c_num == 4:
            txt = user_files.get("CLASE_9_11.md") or user_files.get("RESPONSABILIDAD.md")
            if txt:
                if "4.1" in code:
                    snip = extract_section_content(txt, ["modelos de atribucion", "principios rectores", "cumulo", "option", "contractual vs. extracontractual"])
                else:
                    snip = extract_section_content(txt, ["capacidad", "dolo y culpa", "daño", "nexo causal", "eximentes", "prescripcion"])
                return True, "CLASE_9_11.md", snip or txt[:14000]

        elif c_num == 5:
            txt = user_files.get("CLASE_9_11.md") or user_files.get("CONTRATOS.md")
            if txt:
                if "5.1" in code:
                    snip = extract_section_content(txt, ["1438", "1444", "esencia", "naturaleza", "accidentales", "clasificaciones legales", "autonomia de la voluntad", "buena fe"])
                else:
                    snip = extract_section_content(txt, ["promesa", "1554", "compraventa", "1801", "cosa ajena", "precio", "eviccion", "vicios redhibitorios", "lesion enorme", "pacto comisorio"])
                return True, "CLASE_9_11.md", snip or txt[:14000]

        elif c_num == 6:
            # Sucesorio
            if "6.1" in code:
                txt = user_files.get("LOS BIENES.md", "")
                snip = extract_section_content(txt, ["derecho real de herencia", "urrutia", "gutierrez", "tradicion del derecho real", "sucesion por causa de muerte", "prescripcion"])
                return True, "LOS BIENES.md", snip or txt[:12000]
            elif "6.2" in code:
                txt = user_files.get("ACTO JURIDICO.md", "")
                snip = extract_section_content(txt, ["herencia", "indigno", "976", "aceptacion de una herencia", "repudiacion"]) or extract_section_content(user_files.get("PROCESAL.md", ""), ["peticion de herencia", "particion", "herederos"])
                return True, "ACTO JURIDICO.md", snip or txt[:12000]
            elif "6.3" in code:
                txt = user_files.get("ACTO JURIDICO.md", "")
                snip = extract_section_content(txt, ["testamento", "solemnidades", "capacidad", "unilateral", "revocable"])
                return True, "ACTO JURIDICO.md", snip or txt[:12000]
            else: # 6.4
                txt = user_files.get("LAS OBLIGACIONES.md", "")
                snip = extract_section_content(txt, ["deudas de la herencia", "testamento", "cuota", "heredero"]) or extract_section_content(user_files.get("ACTO JURIDICO.md", ""), ["alimentos futuros", "334", "herencia"])
                return True, "LAS OBLIGACIONES.md", snip or txt[:12000]

        elif c_num == 7:
            # Familia
            if "7.1" in code:
                txt = user_files.get("CLASE_9_11.md", "")
                snip = extract_section_content(txt, ["matrimonio", "esponsales", "capitulaciones matrimoniales", "1715", "donacion por causa de matrimonio"]) or extract_section_content(user_files.get("ACTO JURIDICO.md", ""), ["matrimonio", "registro civil"])
                return True, "CLASE_9_11.md", snip or txt[:12000]
            elif "7.2" in code:
                txt = user_files.get("LOS BIENES.md", "")
                snip = extract_section_content(txt, ["sociedad conyugal", "patrimonio", "administrados por el marido"]) or extract_section_content(user_files.get("LAS OBLIGACIONES.md", ""), ["sociedad conyugal", "patria potestad"])
                return True, "LOS BIENES.md", snip or txt[:12000]
            else: # 7.3
                txt = user_files.get("ACTO JURIDICO.md", "")
                snip = extract_section_content(txt, ["alimentos futuros", "334", "hijo", "patria potestad"]) or extract_section_content(user_files.get("CONSTITUCIONAL.md", ""), ["familia", "menores", "igualdad"])
                return True, "ACTO JURIDICO.md", snip or txt[:12000]

    # 2. DERECHO PROCESAL Y PROCESAL PENAL
    elif subj == "procesal":
        if c_num in [1, 2, 3, 4]:
            txt = user_files.get("PROCESAL.md") or user_files.get("DERECHO PROCESAL.md")
            if txt:
                if c_num == 1:
                    snip = extract_section_content(txt, ["accion", "pretension", "proceso", "jurisdiccion", "competencia", "tribunales"])
                elif c_num == 2:
                    snip = extract_section_content(txt, ["partes", "comparecencia", "patrocinio", "notificaciones", "plazos", "incidentes", "medidas cautelares"])
                elif c_num == 3:
                    snip = extract_section_content(txt, ["ordinario", "demanda", "emplazamiento", "prueba", "testigos", "sentencia"])
                elif c_num == 4:
                    snip = extract_section_content(txt, ["ejecutivo", "titulos", "recursos", "apelacion", "casacion", "impugnacion"])
                return True, "PROCESAL.md", snip or txt[:14000]

        elif c_num == 5:
            # Procesal Penal
            txt_penal = user_files.get("CONSTITUCIONAL.md", "")
            if "5.1" in code:
                snip = extract_section_content(txt_penal, ["legalidad penal", "nullum crimen", "debido proceso", "presuncion de inocencia", "defensa penal", "19 n. 3"])
            elif "5.2" in code:
                snip = extract_section_content(txt_penal, ["imputado", "cautelares personales", "libertad del imputado", "autoincriminacion", "detencion"])
            elif "5.3" in code:
                snip = extract_section_content(txt_penal, ["juez natural", "comisiones especiales", "tribunal establecido"]) or extract_section_content(user_files.get("PROCESAL.md", ""), ["competencia", "tribunales orales en lo penal"])
            elif "5.4" in code:
                snip = extract_section_content(txt_penal, ["investigacion", "ministerio publico", "detencion", "plazos"]) or extract_section_content(user_files.get("PROCESAL.md", ""), ["accion penal", "partes"])
            elif "5.5" in code:
                snip = extract_section_content(txt_penal, ["auto de apertura", "exclusion de prueba", "inviolabilidad"])
            elif "5.6" in code:
                snip = extract_section_content(txt_penal, ["inmediacion", "conviccion", "duda razonable", "oral"]) or extract_section_content(user_files.get("PROCESAL.md", ""), ["sentencia", "prueba"])
            else: # 5.7
                snip = extract_section_content(txt_penal, ["nulidad procesal", "garantias", "recurso"]) or extract_section_content(user_files.get("PROCESAL.md", ""), ["nulidad", "recursos"])
            return True, "CONSTITUCIONAL.md", snip or txt_penal[:12000]

    # 3. DERECHO PÚBLICO (CONSTITUCIONAL)
    elif subj == "constitucional":
        txt = user_files.get("CONSTITUCIONAL.md") or user_files.get("DERECHO CONSTITUCIONAL.md")
        if txt:
            if c_num == 1:
                snip = extract_section_content(txt, ["garantias", "reserva legal", "contenido esencial", "proteccion", "amparo", "inaplicabilidad", "excepcion"])
            else:
                if "2.2" in code:
                    snip = extract_section_content(txt, ["neuroderechos", "21.383", "actividad cerebral", "tecnolog", "datos personales", "habeas data", "19.628", "21.719", "migra"])
                else:
                    snip = extract_section_content(txt, ["derechos fundamentales", "vida", "igualdad", "debido proceso", "propiedad"])
            return True, "CONSTITUCIONAL.md", snip or txt[:14000]

    return False, None, ""

def generate_topic_markdown(t, has_notes, source_file, notes_text):
    """Construye el documento Markdown pedagógico de alta rigurosidad académica"""
    title = t.get("title", "Cédula Oficial")
    discipline = t.get("sectionName", "Temario Oficial AFG")
    chapter = t.get("chapterTitle", "Capítulo")
    code = t.get("code", "")
    normative = t.get("normativeFoundation", "Código Civil, CPC, CPP y CPR.")
    dogmatic = t.get("dogmaticAnalysis", "Doctrina civilista y jurisprudencia uniforme chilena.")
    methodology = t.get("methodologicalGuide", "Análisis de casos prácticos y subsunción en examen de grado.")
    
    bullets_list = t.get("officialBreakdown", [])
    bullets_md = "\n".join([f"- {b}" for b in bullets_list]) if bullets_list else "- Requisitos y epígrafes generales según el programa oficial AFG 2026."

    user_notes_section = f"""---

## 📝 5. Desarrollo y Análisis Doctrinal Profundo de la Cédula

{notes_text}
""" if has_notes and notes_text else ""

    return f"""# {title}

> **Ubicación en el Temario Oficial:** {discipline} · {chapter}  
> **Cédula Oficial:** `{code}` · Periodo Académico AFG y Examen de Grado 2026 (DUN 11/2022)

---

## 📋 Desglose Oficial del Temario AFG 2026
{bullets_md}

---

## ⚖️ 1. Fundamento Normativo Clave
**Normativa Positiva Aplicable:**
{normative}

*Las normas citadas conforman el núcleo legal estricto de interrogación en el Examen de Grado. Se exige precisión literal de artículos, supuestos de hecho y sanciones correlativas.*

---

## 🧠 2. Dogmática Jurídica y Discusión Doctrinal
{dogmatic}

### Núcleos Conceptuales y Tesis en Debate:
1. **Naturaleza jurídica:** Concepciones doctrinarias dominantes en el foro chileno y evolución histórica del concepto.
2. **Controversias dogmáticas clásicas:** Discusiones doctrinales entre autores nacionales (Vial del Río, Peñailillo, Ramos Pazos, Corral, Maturana, Tavolari, Bordalí, Nogueira) sobre el alcance de la institución.
3. **Criterios de los Tribunales Superiores de Justicia:** Doctrina jurisprudencial reiterada de la Excma. Corte Suprema y Cortes de Apelaciones.

---

## 🎯 3. Guía Metodológica de Aplicación en el Examen / AFG
{methodology}

### Estrategia Pedagógica ante la Comisión Evaluadora:
1. **Definición precisa:** Comenzar siempre con la definición legal o dogmática unánime (precisando elementos de la esencia).
2. **Requisitos de procedencia / supuestos fácticos:** Enumerar en orden los presupuestos copulativos que deben concurrir para su aplicación.
3. **Subsunción normativa:** Explicar cómo los hechos del caso hipotético calzan en el supuesto de hecho de la norma jurídica aplicable.
4. **Consecuencias y efectos jurídicos:** Detallar las acciones procesales disponibles, plazos de prescripción/caducidad y tribunales competentes.
5. **Errores fatales a evitar:** Confundir plazos de caducidad con prescripción, omitir excepciones legales o invocar acciones incompatibles.

---

## 📚 4. Síntesis y Cuadros Didácticos de Estudio
Este módulo sintetiza de manera exhaustiva todos los puntos exigidos en la cédula oficial del programa:
- **Conceptos y clasificaciones básicas:** Estudiadas desde su consagración legal positiva y su proyección práctica.
- **Paralelos y distinciones dogmáticas:** Cuadros comparativos entre figuras afines para responder ágilmente interrogaciones cruzadas.
- **Mecanismos de defensa y excepciones:** Herramientas concretas para articular la defensa o la pretensión en juicio ordinario o especial.
{user_notes_section}
---
*Cédula oficial sincronizada con el Temario General AFG y Examen de Grado 2026.*"""

def get_all_synced_topics():
    """
    Entrega todas las secciones reales de los apuntes desarrollados en vivo desde APUNTES.
    """
    try:
        from generate_clean_notes_data import extract_sections_from_file, FILES_CONFIG
        all_sections = []
        for cfg in FILES_CONFIG:
            secs = extract_sections_from_file(cfg)
            all_sections.extend(secs)
        if all_sections:
            try:
                with open(ALL_TOPICS_PATH, "w", encoding="utf-8") as f:
                    json.dump(all_sections, f, ensure_ascii=False, indent=2)
            except Exception as pe:
                print("Error guardando all_afg_topics.json:", pe)
            return all_sections
    except Exception as e:
        print("Error extrayendo secciones en vivo:", e)

    if ALL_TOPICS_PATH.exists():
        try:
            with open(ALL_TOPICS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print("Error leyendo all_afg_topics.json:", e)

    return []

def get_all_synced_cases():
    """
    Obtiene y sincroniza en vivo todos los casos prácticos, pautas y exámenes desde la carpeta CASOS.
    """
    if ALL_CASES_PATH.exists():
        try:
            with open(ALL_CASES_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data and data.get("cases"):
                    return data
        except Exception as e:
            print("Error leyendo all_cases.json:", e)

    try:
        from parse_casos import scan_and_parse_all_cases
        return scan_and_parse_all_cases()
    except Exception as e:
        print("Error escaneando casos en vivo:", e)

    return {"cases": [], "files": [], "casesCount": 0, "filesCount": 0, "referenceGuides": []}

class AutoSyncHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self):
        # 1. Seguridad: Prevenir acceso a directorios o archivos ocultos (.git, .antigravity, etc.) y código sensible
        raw_clean_path = self.path.split('?')[0].split('#')[0]
        clean_path = urllib.parse.unquote(raw_clean_path)
        segments = [s.strip() for s in clean_path.split('/') if s.strip()]
        
        # Bloquear cualquier segmento que comience con punto (.git, .env), scripts de servidor
        # y carpetas/archivos de entrenamiento confidenciales (CASOS, all_cases.json, parse_casos.py)
        lower_segments = [s.lower() for s in segments]
        if (any(s.startswith('.') for s in segments) or 
            any(s in ('server.py', 'sync_config.json', 'parse_casos.py', 'all_cases.json') for s in lower_segments) or
            'casos' in lower_segments):
            self.send_error(403, "Acceso denegado: modelo confidencial protegido del Agente IA")
            return

        # API 1: Comprobar cambios (Polling ligero para actualización automática)
        if clean_path == "/api/sync-check":
            version_hash = get_files_hash()
            response_bytes = json.dumps({"version": version_hash, "timestamp": time.time()}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response_bytes)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        # API 2: Obtener todos los temas parseados y sincronizados en vivo desde APUNTES
        if clean_path == "/api/sync-topics":
            topics = get_all_synced_topics()
            response_bytes = json.dumps({"topics": topics, "count": len(topics)}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response_bytes)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        # API 3: Obtener casos de práctica creados (los modelos oficiales permanecen confidenciales en el servidor)
        if clean_path == "/api/sync-cases":
            all_cases_data = get_all_synced_cases()
            all_cases = all_cases_data.get("cases", [])
            now_ts = time.time()

            # Filtrar EXCLUSIVAMENTE los casos generados por el Agente de IA
            ai_cases = []
            for c in all_cases:
                is_ai = c.get("isGeneratedByAI") is True or str(c.get("id", "")).startswith("caso-ia-")
                if is_ai:
                    # Comprobar expiración temporal si existe
                    exp = c.get("expiresAt")
                    if exp:
                        exp_sec = exp / 1000.0 if exp > 1e11 else float(exp)
                        if exp_sec < now_ts:
                            continue
                    ai_cases.append(c)

            cases_payload = {
                "cases": ai_cases,
                "casesCount": len(ai_cases),
                "isReferenceModelProtected": True
            }
            response_bytes = json.dumps(cases_payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response_bytes)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        # API 4: Protección de archivos fuente de entrenamiento del Agente
        if clean_path == "/api/casos-files":
            files_payload = {
                "protected": True,
                "message": "Los modelos de pautas y casos fuente son confidenciales para la nutrición del Agente IA."
            }
            response_bytes = json.dumps(files_payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response_bytes)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        # API 5: Consulta y nutrición dogmática desde la carpeta FUENTES
        if clean_path == "/api/fuentes":
            fuentes_data = {}
            if FUENTES_DIR.exists():
                for f in sorted(FUENTES_DIR.glob("*.md")):
                    try:
                        with open(f, "r", encoding="utf-8") as fp:
                            fuentes_data[f.name] = {
                                "filename": f.name,
                                "stem": f.stem,
                                "title": f.stem.replace("_", " ").title(),
                                "content": fp.read()
                            }
                    except Exception as e:
                        print(f"Error leyendo fuente {f}: {e}")

            response_bytes = json.dumps({"ok": True, "fuentes": fuentes_data, "count": len(fuentes_data)}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(response_bytes)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        # Servir archivos estáticos normales
        super().do_GET()

    def do_POST(self):
        # 1. Validación de seguridad preliminar de Content-Length contra DoS y desbordamiento de memoria
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except (ValueError, TypeError):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": "Encabezado Content-Length inválido"}).encode("utf-8"))
            return

        if content_length <= 0:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": "Cuerpo de solicitud vacío"}).encode("utf-8"))
            return

        if content_length > MAX_PAYLOAD_SIZE:
            self.send_response(413)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": f"Carga útil excede el límite máximo de seguridad ({MAX_PAYLOAD_SIZE // 1024} KB)"}).encode("utf-8"))
            return

        # Normalización del encabezado Content-Type y de ruta
        raw_clean_path = self.path.split('?')[0].split('#')[0]
        clean_path = urllib.parse.unquote(raw_clean_path)
        raw_content_type = self.headers.get("Content-Type", "")
        content_type = raw_content_type.split(";")[0].strip().lower()

        # API 3: Configurar carpeta externa (ej: Google Drive o carpeta de apuntes)
        if clean_path == "/api/set-sync-folder":
            # Control de acceso: solo peticiones locales (localhost / 127.0.0.1)
            client_ip = self.client_address[0]
            if client_ip not in ("127.0.0.1", "::1", "localhost"):
                self.send_error(403, "Configuración restringida al equipo local")
                return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                data = json.loads(body)
                custom_folder = data.get("folder", "").strip()
                if not custom_folder or not os.path.isdir(custom_folder):
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": False, "error": "Ruta inválida o inaccesible"}).encode("utf-8"))
                    return

                # Restricción de seguridad: no permitir carpetas raíz o del sistema
                norm_path = os.path.normpath(custom_folder).lower()
                if norm_path in ("c:\\", "c:", "/", "\\") or any(f in norm_path for f in ("windows", "system32")):
                    self.send_response(403)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": False, "error": "Acceso denegado a rutas del sistema"}).encode("utf-8"))
                    return

                with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                    json.dump({"custom_sync_folder": custom_folder}, f, indent=2)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "message": "Carpeta vinculada correctamente"}).encode("utf-8"))
            except Exception as e:
                print(f"[ERROR /api/set-sync-folder]: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": "Error interno al vincular carpeta"}).encode("utf-8"))
            return

        # API 4: Guardar caso generado por IA con ciclo de vida FIFO y blindaje contra Path Traversal
        if clean_path == "/api/ai/save-generated-case":
            if content_type != "application/json":
                self.send_response(415)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": "Content-Type debe ser application/json"}).encode("utf-8"))
                return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                new_case = json.loads(body)
                raw_case_id = str(new_case.get("id", "")).strip()

                # Sanitización estricta y blindaje contra Directory / Path Traversal
                if not SAFE_CASE_ID_REGEX.match(raw_case_id):
                    # Generar ID seguro alfanumérico si el ID recibido no cumple el estándar
                    case_id = f"caso-ia-{int(time.time() * 1000)}"
                else:
                    case_id = raw_case_id

                new_case["id"] = case_id
                new_case["isGeneratedByAI"] = True
                new_case["createdAt"] = new_case.get("createdAt", time.time())

                # 1. Aplicación de Ciclo de Vida y Retención FIFO en all_cases.json
                all_cases_data = get_all_synced_cases()
                existing_cases = all_cases_data.get("cases", [])

                official_cases = []
                ai_cases = []

                for c in existing_cases:
                    is_ai = c.get("isGeneratedByAI") is True or str(c.get("id", "")).startswith("caso-ia-")
                    if is_ai:
                        # Excluir coincidencia si se está re-guardando el mismo ID
                        if c.get("id") != case_id:
                            ai_cases.append(c)
                    else:
                        official_cases.append(c)

                # Insertar el nuevo caso como el más reciente de IA
                ai_cases.insert(0, new_case)

                # Política de retención: Mantener máximo MAX_AI_PRACTICE_CASES casos IA
                pruned_ai_cases = []
                if len(ai_cases) > MAX_AI_PRACTICE_CASES:
                    pruned_ai_cases = ai_cases[MAX_AI_PRACTICE_CASES:]
                    ai_cases = ai_cases[:MAX_AI_PRACTICE_CASES]

                # Eliminar del disco los archivos .md correspondientes a casos IA podados
                casos_semanales_dir = (CASOS_DIR / "2_CASOS_SEMANALES").resolve()
                casos_semanales_dir.mkdir(parents=True, exist_ok=True)

                for p_case in pruned_ai_cases:
                    p_id = str(p_case.get("id", ""))
                    if SAFE_CASE_ID_REGEX.match(p_id):
                        p_file = (casos_semanales_dir / f"{p_id}.md").resolve()
                        # Verificación canónica: debe estar estrictamente dentro de casos_semanales_dir
                        if p_file.is_relative_to(casos_semanales_dir) and p_file.exists():
                            try:
                                p_file.unlink()
                            except OSError as err:
                                print(f"[Aviso] No se pudo eliminar archivo podado {p_file.name}: {err}")

                # Guardar lista actualizada en all_cases.json (conservando 100% de casos oficiales)
                updated_cases = ai_cases + official_cases
                all_cases_data["cases"] = updated_cases
                all_cases_data["casesCount"] = len(updated_cases)
                with open(ALL_CASES_PATH, "w", encoding="utf-8") as f:
                    json.dump(all_cases_data, f, ensure_ascii=False, indent=2)

                # 2. Guardar archivo .md en CASOS/2_CASOS_SEMANALES/
                md_filename = f"{case_id}.md"
                md_path = (casos_semanales_dir / md_filename).resolve()

                # Comprobación estricta de ruta canónica contra Path Traversal
                if not md_path.is_relative_to(casos_semanales_dir):
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": False, "error": "Ruta de destino no autorizada"}).encode("utf-8"))
                    return

                # Composición del Markdown estructurado
                safe_title = str(new_case.get("title", "Caso Generado por IA")).replace("\n", " ").strip()
                safe_subjects = [str(s).replace("\n", " ").strip() for s in new_case.get("subjects", ["Civil"])]
                safe_facts = str(new_case.get("facts", "")).strip()

                md_content = f"""# {safe_title}

> **Materia:** {', '.join(safe_subjects)}  
> **Dificultad:** {new_case.get('difficulty', 'Grado')}  
> **Origen:** Agente de IA (Protocolo AFG 2026-20)  
> **Ciclo de Retención:** Caso de Práctica Activo  

---

## 📌 Hechos Relevantes (Antecedentes)
{safe_facts}

---

## ❓ Preguntas de Interrogación / Evaluación
"""
                for q in new_case.get("questions", []):
                    q_text = str(q.get("questionText", "")).strip()
                    md_content += f"\n### Pregunta {q.get('number', 1)}: {q_text}\n"
                    for opt in q.get("options", []):
                        md_content += f"- {str(opt.get('id', '')).upper()}) {str(opt.get('text', '')).strip()}\n"
                    md_content += f"\n*Respuesta Correcta:* Opción {str(q.get('correctAnswer', '')).upper()}\n"
                    md_content += f"*Explicación Oficial:* {str(q.get('explanation', '')).strip()}\n"

                with open(md_path, "w", encoding="utf-8") as f:
                    f.write(md_content)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "ok": True,
                    "caseId": case_id,
                    "savedFile": str(md_filename),
                    "prunedCount": len(pruned_ai_cases),
                    "activeAiCasesCount": len(ai_cases)
                }).encode("utf-8"))
            except Exception as e:
                print(f"[ERROR /api/ai/save-generated-case]: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": "Error interno del servidor al procesar el caso"}).encode("utf-8"))
            return

        # API 5: Purga manual completa de casos de práctica generados por IA
        if clean_path == "/api/ai/clean-practice-cases":
            try:
                all_cases_data = get_all_synced_cases()
                existing_cases = all_cases_data.get("cases", [])

                official_cases = []
                deleted_ids = []

                casos_semanales_dir = (CASOS_DIR / "2_CASOS_SEMANALES").resolve()

                for c in existing_cases:
                    is_ai = c.get("isGeneratedByAI") is True or str(c.get("id", "")).startswith("caso-ia-")
                    if is_ai:
                        c_id = str(c.get("id", ""))
                        deleted_ids.append(c_id)
                        if SAFE_CASE_ID_REGEX.match(c_id):
                            p_file = (casos_semanales_dir / f"{c_id}.md").resolve()
                            if p_file.is_relative_to(casos_semanales_dir) and p_file.exists():
                                try:
                                    p_file.unlink()
                                except OSError as err:
                                    print(f"[Aviso] No se pudo eliminar archivo {p_file.name}: {err}")
                    else:
                        official_cases.append(c)

                all_cases_data["cases"] = official_cases
                all_cases_data["casesCount"] = len(official_cases)
                with open(ALL_CASES_PATH, "w", encoding="utf-8") as f:
                    json.dump(all_cases_data, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "ok": True,
                    "deletedCount": len(deleted_ids),
                    "officialCasesRemaining": len(official_cases)
                }).encode("utf-8"))
            except Exception as e:
                print(f"[ERROR /api/ai/clean-practice-cases]: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": "Error interno al purgar casos"}).encode("utf-8"))
            return

        self.send_error(404, "Endpoint no encontrado")

if __name__ == "__main__":
    import sys
    # Seguridad por defecto: enlazar únicamente a localhost (127.0.0.1).
    # Si se desea conectar el celular por Wi-Fi, ejecutar con el flag --lan: python server.py --lan
    bind_address = "127.0.0.1"
    if "--lan" in sys.argv or "-lan" in sys.argv:
        bind_address = "" # Escuchar en todas las interfaces para red local

    socketserver.ThreadingTCPServer.allow_reuse_address = False
    with socketserver.ThreadingTCPServer((bind_address, PORT), AutoSyncHTTPHandler) as httpd:
        mode_str = "Red local Wi-Fi (--lan habilitado)" if bind_address == "" else "Localhost seguro (127.0.0.1)"
        print(f"==================================================")
        print(f" Servidor Estudio de Grado con Auto-Sincronizador")
        print(f" Modo: {mode_str}")
        print(f" URL: http://{'localhost' if bind_address else '192.168.1.130'}:{PORT}")
        print(f" Monitoreando carpeta: {APUNTES_DIR}")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
