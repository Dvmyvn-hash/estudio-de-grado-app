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
import urllib.request
import urllib.error
import hmac
import hashlib
import base64
import random
import secrets
import smtplib
import sqlite3
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

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

# Soporte opcional para Google Auth SDK (fallback nativo vía urllib / tokeninfo)
try:
    import google.auth
    import google.oauth2.id_token
    HAS_GOOGLE_AUTH = True
except ImportError:
    HAS_GOOGLE_AUTH = False

import db

BASE_DIR = Path(__file__).resolve().parent

def load_env_file():
    """Carga variables desde archivo .env local si existe, sin sobreescribir las ya definidas."""
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception as e:
            print(f"[Aviso] No se pudo leer .env: {e}")

load_env_file()

PORT = int(os.environ.get("PORT", 8080))
DB_PATH = BASE_DIR / "estudio_grado.db"

def get_or_create_auth_secret() -> str:
    """Obtiene el secreto HMAC desde variable de entorno o genera uno criptográfico de 256 bits."""
    env_secret = os.environ.get("SESSION_SECRET") or os.environ.get("AUTH_SECRET_KEY")
    if env_secret and len(env_secret.strip()) >= 32:
        return env_secret.strip()

    secret_file = BASE_DIR / ".auth_secret"
    if secret_file.exists():
        try:
            with open(secret_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if len(content) >= 32:
                    return content
        except Exception:
            pass

    import secrets
    new_secret = secrets.token_hex(32)
    try:
        with open(secret_file, "w", encoding="utf-8") as f:
            f.write(new_secret)
        try:
            os.chmod(secret_file, 0o600)
        except Exception:
            pass
    except Exception as e:
        print(f"[Aviso Seguridad] No se pudo persistir .auth_secret: {e}")
    return new_secret

def load_google_client_id() -> str:
    """Carga el Client ID de Google desde variable de entorno o auth_config.json."""
    env_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    if env_id:
        return env_id
    config_file = BASE_DIR / "auth_config.json"
    if config_file.exists():
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                return cfg.get("google_client_id", "").strip()
        except Exception:
            pass
    return ""

AUTH_SECRET_KEY = get_or_create_auth_secret()
ALLOW_TEST_AUTH = os.environ.get("ALLOW_TEST_AUTH", "").strip().lower() in ("1", "true", "yes")
GOOGLE_CLIENT_ID = load_google_client_id()
db.init_db(DB_PATH)
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

# ==========================================
# UTILIDADES DE AUTENTICACIÓN Y SESIONES
# ==========================================

class SecurityRateLimiter:
    """
    Controlador de frecuencia (Rate Limiter) en memoria con poda automática
    y límites acotados para prevenir agotamiento de recursos, ataques DoS y fuerza bruta.
    """
    def __init__(self, max_entries: int = 5000):
        self.max_entries = max_entries
        self.records: Dict[str, list] = {}

    def _prune(self, now: float, max_age: float):
        """Poda entradas antiguas y evita crecimiento ilimitado de memoria."""
        keys_to_delete = []
        for k, timestamps in list(self.records.items()):
            valid = [t for t in timestamps if now - t < max_age]
            if not valid:
                keys_to_delete.append(k)
            else:
                self.records[k] = valid
        for k in keys_to_delete:
            self.records.pop(k, None)

        if len(self.records) > self.max_entries:
            sorted_keys = sorted(self.records.keys(), key=lambda k: self.records[k][-1] if self.records[k] else 0)
            for k in sorted_keys[: len(self.records) - self.max_entries]:
                self.records.pop(k, None)

    def check_fixed_limit(self, key: str, max_requests: int = 30, window_seconds: float = 60.0) -> Tuple[bool, float]:
        """
        Límite de ventana fija: max_requests por window_seconds.
        Retorna (permitido, segundos_restantes_para_reintentar).
        """
        now = time.time()
        if len(self.records) > self.max_entries or random.random() < 0.05:
            self._prune(now, window_seconds)

        timestamps = [t for t in self.records.get(key, []) if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            oldest = timestamps[0]
            retry_after = max(1.0, window_seconds - (now - oldest))
            return False, retry_after

        timestamps.append(now)
        self.records[key] = timestamps
        return True, 0.0

    def check_exponential_backoff(self, key: str, max_free_attempts: int = 5, window_seconds: float = 900.0) -> Tuple[bool, float]:
        """
        Límite con retroceso exponencial (para intentos de códigos de invitación):
        Permite hasta max_free_attempts dentro de window_seconds.
        Posteriormente exige espera exponencial 2^(intentos - max_free_attempts) + jitter.
        """
        now = time.time()
        if len(self.records) > self.max_entries or random.random() < 0.05:
            self._prune(now, window_seconds)

        history = [t for t in self.records.get(key, []) if now - t < window_seconds]
        self.records[key] = history

        if len(history) >= max_free_attempts:
            wait_seconds = (2 ** (len(history) - max_free_attempts)) + random.uniform(0.0, 0.5)
            last_attempt = history[-1] if history else now
            elapsed = now - last_attempt
            if elapsed < wait_seconds:
                return False, wait_seconds - elapsed
        return True, 0.0

    def record_attempt(self, key: str) -> None:
        now = time.time()
        history = self.records.get(key, [])
        history.append(now)
        self.records[key] = history

    def reset(self, key: str) -> None:
        self.records.pop(key, None)

LINK_CODE_LIMITER = SecurityRateLimiter(max_entries=2000)
AUTH_LIMITER = SecurityRateLimiter(max_entries=5000)
LOGIN_BACKOFF_LIMITER = SecurityRateLimiter(max_entries=5000)
GOOGLE_AUTH_LIMITER = SecurityRateLimiter(max_entries=5000)

def mask_email(email: str) -> str:
    """Enmascara correo para logs de auditoría seguros (ej. david@gmail.com -> d***@gmail.com)."""
    if not email or "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        return f"{local}***@{domain}"
    elif len(local) == 2:
        return f"{local[0]}***@{domain}"
    else:
        return f"{local[0]}***@{domain}"


def parse_sender_info(raw_sender: str, default_name: str = "GRADOMANIACOS", default_email: str = "gradomaniacos@gmail.com") -> Tuple[str, str]:
    """Extrae (name, email) de strings como 'GRADOMANIACOS <correo@ejemplo.com>' o 'correo@ejemplo.com'."""
    if not raw_sender or not raw_sender.strip():
        return default_name, default_email
    clean = raw_sender.strip()
    match = re.match(r"^([^<]+)<([^>]+)>$", clean)
    if match:
        name = match.group(1).strip().strip('"\'')
        email = match.group(2).strip()
        return name or default_name, email or default_email
    if "@" in clean:
        return default_name, clean
    return default_name, default_email


def get_email_config() -> Dict[str, Any]:
    """Obtiene la configuración de correo actual desde variables de entorno."""
    raw_provider = os.environ.get("EMAIL_PROVIDER", "").strip().lower()
    brevo_key = os.environ.get("BREVO_API_KEY", "").strip() or os.environ.get("SENDINBLUE_API_KEY", "").strip()
    resend_key = os.environ.get("RESEND_API_KEY", "").strip()
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASS", "").strip()
    email_from = os.environ.get("EMAIL_FROM", "").strip()

    # Determinación jerárquica del proveedor activo
    if raw_provider in ("brevo", "sendinblue"):
        provider = "brevo"
    elif raw_provider == "resend":
        provider = "resend"
    elif raw_provider == "smtp":
        provider = "smtp"
    elif brevo_key:
        provider = "brevo"
    elif resend_key:
        provider = "resend"
    elif smtp_host:
        provider = "smtp"
    else:
        provider = ""

    return {
        "provider": provider,
        "brevo_key": brevo_key,
        "resend_key": resend_key,
        "smtp_host": smtp_host,
        "smtp_port": smtp_port,
        "smtp_user": smtp_user,
        "smtp_pass": smtp_pass,
        "email_from": email_from
    }


def get_smtp_config() -> Tuple[str, int, str, str, str]:
    """Compatibilidad con código existente: obtiene configuración SMTP."""
    cfg = get_email_config()
    from_addr = cfg["email_from"] or cfg["smtp_user"] or "no-reply@gradomania.cl"
    return cfg["smtp_host"], cfg["smtp_port"], cfg["smtp_user"], cfg["smtp_pass"], from_addr


def _send_via_brevo(to_email: str, code: str, api_key: str, from_addr: str) -> Tuple[bool, str]:
    """
    Envía código de verificación de 6 dígitos mediante la API REST HTTPS oficial de Brevo (Sendinblue).
    Funciona 100% por HTTPS (puerto 443 estándar) y permite enviar a CUALQUIER destinatario
    validando únicamente el correo remitente ('Sender Verification' gratuito sin exigir dominio DNS).
    """
    if not api_key:
        print("[Email Error] Provider=brevo status=missing_api_key")
        return False, "Configuración incompleta de Brevo API Key."

    sender_name, sender_email = parse_sender_info(from_addr, default_name="GRADOMANIACOS", default_email="gradomaniacos@gmail.com")
    subject = f"Tu código de verificación de GRADOMANIACOS es: {code}"
    body_text = (
        f"Hola,\n\n"
        f"Tu código de verificación de GRADOMANIACOS es: {code}\n\n"
        f"Este código vence en 15 minutos. Ingrésalo en la plataforma para activar tu cuenta.\n\n"
        f"Si no solicitaste este código, puedes desestimar este mensaje con total seguridad.\n"
    )
    body_html = (
        f"<div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; "
        f"max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;'>"
        f"<h2 style='color: #1e293b; margin: 0 0 16px 0; font-size: 20px; letter-spacing: -0.5px;'>GRADOMANIACOS</h2>"
        f"<p style='color: #475569; font-size: 15px; line-height: 1.5;'>Tu código de verificación de seguridad es:</p>"
        f"<div style='background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 18px; border-radius: 6px; text-align: center; margin: 20px 0;'>"
        f"<span style='font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-family: monospace;'>{code}</span>"
        f"</div>"
        f"<p style='color: #64748b; font-size: 13px; line-height: 1.4;'>Este código vence en <strong>15 minutos</strong>. Ingrésalo en la plataforma para activar tu cuenta.</p>"
        f"<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;'>"
        f"<p style='color: #94a3b8; font-size: 12px; margin: 0;'>Si no solicitaste este código, puedes ignorar este correo con total seguridad.</p>"
        f"</div>"
    )

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body_text,
        "htmlContent": body_html
    }

    try:
        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json",
                "User-Agent": "Gradomaniacos-App/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            if 200 <= status < 300:
                print(f"[Email] Provider=brevo Verification email sent successfully to {mask_email(to_email)}")
                return True, ""
            else:
                print(f"[Email Error] Provider=brevo status={status}")
                return False, f"Brevo API error status={status}"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(err_body)
            err_msg = err_json.get("message") or err_body
        except Exception:
            err_msg = err_body
        print(f"[Email Error] Provider=brevo status={e.code} detail={err_msg}")
        return False, f"Brevo API error (status {e.code}): {err_msg}"
    except urllib.error.URLError as e:
        print(f"[Email Error] Provider=brevo status=network_error error={type(e.reason).__name__}")
        return False, "Error de red al conectar con Brevo API."
    except Exception as e:
        print(f"[Email Error] Provider=brevo status=unexpected error={type(e).__name__}")
        return False, "Error inesperado al despachar el correo."


def _send_via_resend(to_email: str, code: str, api_key: str, from_addr: str) -> Tuple[bool, str]:
    """
    Envía código de verificación de 6 dígitos mediante la API REST HTTPS oficial de Resend.
    Compatible con Web Services de Render.com (puerto 443 sin bloqueos SMTP).
    """
    if not api_key:
        print("[Email Error] Provider=resend status=missing_api_key")
        return False, "Configuración incompleta del servicio de correo (Resend API Key ausente)."

    clean_from = (from_addr or "").strip()
    sender = clean_from if clean_from else "GRADOMANIACOS <onboarding@resend.dev>"

    subject = f"Tu código de verificación de GRADOMANIACOS es: {code}"
    body_text = (
        f"Hola,\n\n"
        f"Tu código de verificación de GRADOMANIACOS es: {code}\n\n"
        f"Este código vence en 15 minutos. Ingrésalo en la plataforma para activar tu cuenta.\n\n"
        f"Si no solicitaste este código, puedes desestimar este mensaje con total seguridad.\n"
    )
    body_html = (
        f"<div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; "
        f"max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;'>"
        f"<h2 style='color: #1e293b; margin: 0 0 16px 0; font-size: 20px; letter-spacing: -0.5px;'>GRADOMANIACOS</h2>"
        f"<p style='color: #475569; font-size: 15px; line-height: 1.5;'>Tu código de verificación de seguridad es:</p>"
        f"<div style='background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 18px; border-radius: 6px; text-align: center; margin: 20px 0;'>"
        f"<span style='font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-family: monospace;'>{code}</span>"
        f"</div>"
        f"<p style='color: #64748b; font-size: 13px; line-height: 1.4;'>Este código vence en <strong>15 minutos</strong>. Ingrésalo en la plataforma para activar tu cuenta.</p>"
        f"<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;'>"
        f"<p style='color: #94a3b8; font-size: 12px; margin: 0;'>Si no solicitaste este código, puedes ignorar este correo con total seguridad.</p>"
        f"</div>"
    )

    payload = {
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "text": body_text,
        "html": body_html
    }

    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Gradomaniacos-App/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            if 200 <= status < 300:
                print(f"[Email] Provider=resend Verification email sent successfully to {mask_email(to_email)}")
                return True, ""
            else:
                print(f"[Email Error] Provider=resend status={status}")
                return False, f"Resend API error status={status}"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(err_body)
            err_msg = err_json.get("message") or err_json.get("error") or err_body
        except Exception:
            err_msg = err_body

        if e.code == 403 and ("testing" in err_msg.lower() or "only send" in err_msg.lower()):
            print(f"[Email Error] Provider=resend status=403 [DOMINIO RESTRINGIDO]: Resend sólo permite enviar al correo del titular de la cuenta de Resend mientras no verifiques un dominio en resend.com/domains. Usa Brevo (BREVO_API_KEY) para enviar sin dominio. Detalle: {err_msg}")
        elif "domain" in err_msg.lower() or "not verified" in err_msg.lower():
            print(f"[Email Error] Provider=resend status={e.code} [DOMINIO NO VERIFICADO]: El remitente '{sender}' requiere verificación DNS en resend.com/domains o usar Brevo. Detalle: {err_msg}")
        else:
            print(f"[Email Error] Provider=resend status={e.code} detail={err_msg}")

        return False, f"Resend API error (status {e.code}): {err_msg}"
    except urllib.error.URLError as e:
        print(f"[Email Error] Provider=resend status=network_error error={type(e.reason).__name__}")
        return False, "Error de red al conectar con el servicio de correo."
    except Exception as e:
        print(f"[Email Error] Provider=resend status=unexpected error={type(e).__name__}")
        return False, "Error inesperado al despachar el correo."


def _send_via_smtp(to_email: str, code: str, host: str, port: int, user: str, password: str, from_addr: str) -> Tuple[bool, str]:
    """Envía código de verificación vía SMTP (soporte Gmail STARTTLS / puerto 587 o SSL / puerto 465)."""
    sender = from_addr or user or "no-reply@gradomaniacos.cl"
    subject = f"Tu código de verificación de GRADOMANIACOS es: {code}"
    body = (
        f"Hola,\n\n"
        f"Tu código de verificación de GRADOMANIACOS es: {code}\n\n"
        f"Este código vence en 15 minutos. Ingrésalo en la plataforma para activar tu cuenta.\n\n"
        f"Si no solicitaste este código, puedes desestimar este mensaje con total seguridad.\n"
    )

    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email

        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                if user and password:
                    server.login(user, password)
                server.send_message(msg)

        print(f"[Email] Provider=smtp Verification email sent successfully to {mask_email(to_email)}")
        return True, ""

    except smtplib.SMTPAuthenticationError as e:
        print(f"[Email Error] Provider=smtp status=auth_error code={e.smtp_code}")
        return False, "Error de autenticación con el servidor de correo."
    except (smtplib.SMTPException, OSError) as e:
        print(f"[Email Error] Provider=smtp status=transport_error error={type(e).__name__}")
        return False, "No se pudo conectar con el servidor de correo."
    except Exception as e:
        print(f"[Email Error] Provider=smtp status=unexpected error={type(e).__name__}")
        return False, "Error inesperado al despachar el correo."


def send_verification_email(to_email: str, code: str) -> Tuple[bool, str]:
    """
    Envía código de verificación de 6 dígitos mediante el proveedor activo:
    - Brevo API REST HTTPS (recomendado: sin restricciones de dominio DNS, 300/día gratis)
    - Resend API REST HTTPS (para producción con dominio propio verificado)
    - SMTP (para desarrollo local con Gmail)
    - Multi-provider Fallback automático si hay más de una clave disponible
    - Dev Fallback si no hay proveedor configurado (imprime en consola)
    Retorna (éxito: bool, mensaje_error: str).
    """
    cfg = get_email_config()
    provider = cfg["provider"]

    if provider == "brevo":
        sent, err = _send_via_brevo(
            to_email=to_email,
            code=code,
            api_key=cfg["brevo_key"],
            from_addr=cfg["email_from"]
        )
        if sent:
            return True, ""
        # Multi-provider fallback hacia Resend si está disponible
        if cfg["resend_key"]:
            print("[Email Fallback] Brevo no pudo despachar, intentando con Resend...")
            res_sent, res_err = _send_via_resend(to_email, code, cfg["resend_key"], cfg["email_from"])
            if res_sent:
                return True, ""
        return False, err

    elif provider == "resend":
        sent, err = _send_via_resend(
            to_email=to_email,
            code=code,
            api_key=cfg["resend_key"],
            from_addr=cfg["email_from"]
        )
        if sent:
            return True, ""
        # Multi-provider fallback hacia Brevo si está disponible
        if cfg["brevo_key"]:
            print("[Email Fallback] Resend no pudo despachar, intentando con Brevo...")
            brv_sent, brv_err = _send_via_brevo(to_email, code, cfg["brevo_key"], cfg["email_from"])
            if brv_sent:
                return True, ""
        return False, err

    elif provider == "smtp":
        return _send_via_smtp(
            to_email=to_email,
            code=code,
            host=cfg["smtp_host"],
            port=cfg["smtp_port"],
            user=cfg["smtp_user"],
            password=cfg["smtp_pass"],
            from_addr=cfg["email_from"]
        )
    else:
        # Modo desarrollo / fallback local
        print(f"[SMTP Dev] Código de verificación para {to_email}: {code} (Vence en 15 minutos)")
        return True, ""


def validate_password_policy(password: str) -> Tuple[bool, str]:
    """
    Valida la política de contraseñas:
    - Mínimo 10 caracteres.
    - Al menos una mayúscula.
    - Al menos una minúscula.
    - Al menos un número.
    """
    if not password or len(password) < 10:
        return False, "La contraseña debe tener al menos 10 caracteres."
    if not re.search(r"[A-Z]", password):
        return False, "La contraseña debe contener al menos una letra mayúscula."
    if not re.search(r"[a-z]", password):
        return False, "La contraseña debe contener al menos una letra minúscula."
    if not re.search(r"[0-9]", password):
        return False, "La contraseña debe contener al menos un número."
    return True, ""


# Hash criptográfico SHA-256 de la clave de administración
ADMIN_PIN_HASH = "75cfc5343b1e254fc0e4f909e980e14cda4d24dc223718749855ba3ec28457d8"

def verify_admin_pin(entered_pin: Any) -> bool:
    """Verifica en tiempo constante el PIN de administración usando SHA-256."""
    if not entered_pin or not isinstance(entered_pin, str):
        return False
    pin_clean = entered_pin.strip()
    calc_hash = hashlib.sha256(pin_clean.encode("utf-8")).hexdigest()
    env_pin = os.environ.get("ADMIN_PIN")
    if env_pin:
        env_hash = hashlib.sha256(env_pin.strip().encode("utf-8")).hexdigest()
        if hmac.compare_digest(calc_hash, env_hash):
            return True
    return hmac.compare_digest(calc_hash, ADMIN_PIN_HASH)


def create_session_token(sub: str) -> str:
    """Crea un token de sesión firmado con HMAC-SHA256 y expiración a 30 días."""
    payload = {
        "sub": str(sub),
        "exp": int(time.time() + (30 * 86400))  # 30 días
    }
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('ascii').rstrip('=')
    sig = hmac.new(
        AUTH_SECRET_KEY.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode('ascii').rstrip('=')
    return f"{payload_b64}.{sig_b64}"

def verify_session_token(token: str) -> Optional[str]:
    """Verifica la firma HMAC-SHA256 y la vigencia del token de sesión. Retorna el 'sub'."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts

        expected_sig = hmac.new(
            AUTH_SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).digest()

        rem_sig = len(sig_b64) % 4
        padded_sig = sig_b64 + ("=" * (4 - rem_sig) if rem_sig else "")
        actual_sig = base64.urlsafe_b64decode(padded_sig.encode('ascii'))

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        rem_p = len(payload_b64) % 4
        padded_p = payload_b64 + ("=" * (4 - rem_p) if rem_p else "")
        payload_bytes = base64.urlsafe_b64decode(padded_p.encode('ascii'))
        payload = json.loads(payload_bytes.decode('utf-8'))

        if payload.get("exp", 0) < time.time():
            return None

        return str(payload.get("sub", ""))
    except Exception:
        return None

def make_session_cookie(token: str) -> str:
    """Genera la cookie httpOnly; Secure; SameSite=Lax requerida por la arquitectura."""
    return f"session_token={token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age={30 * 86400}"

def make_logout_cookie() -> str:
    """Genera la cookie de invalidación inmediata."""
    return "session_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"

GOOGLE_TOKEN_REGEX = re.compile(r"^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$")

def verify_google_id_token(id_token: str) -> Optional[dict]:
    """
    Verifica el ID token de Google Identity Services con validación estricta:
    1. Si es un token de prueba en entorno local/test (prefijo 'mock-google-token:' o 'test-token:'),
       SOLO se acepta si ALLOW_TEST_AUTH está expresamente activado en el entorno.
    2. Valida longitud máxima (4096 caracteres) y formato JWT de 3 segmentos.
    3. Si google-auth está disponible, usa google.oauth2.id_token.verify_oauth2_token.
    4. Fallback tolerante con urllib nativo contra https://oauth2.googleapis.com/tokeninfo con
       validación de expiración, audiencia (aud), emisor (iss) y correo verificado (email_verified).
    """
    if not id_token or not isinstance(id_token, str):
        return None

    # Límite estricto de longitud de token para prevenir ataques DoS / saturación de memoria
    if len(id_token) > 4096:
        print("[Aviso Seguridad] Token de Google excede la longitud máxima permitida (4096)")
        return None

    # Modo de prueba local/test (estrictamente restringido a entorno de pruebas con ALLOW_TEST_AUTH)
    if id_token.startswith("mock-google-token:") or id_token.startswith("test-token:"):
        if not ALLOW_TEST_AUTH:
            print("[Aviso Seguridad] Intento de usar token mock bloqueado porque ALLOW_TEST_AUTH no está activo")
            return None
        parts = id_token.split(":")
        sub = parts[1] if len(parts) > 1 and parts[1] else f"mock-sub-{int(time.time()*1000)}"
        email = parts[2] if len(parts) > 2 and parts[2] else f"{sub}@example.com"
        name = parts[3] if len(parts) > 3 and parts[3] else "Postulante de Grado"
        picture = parts[4] if len(parts) > 4 and parts[4] else ""
        return {"sub": sub, "email": email, "name": name, "picture": picture}

    # Para tokens reales de Google, validar formato canónico JWT (3 partes base64url separadas por punto)
    if not GOOGLE_TOKEN_REGEX.match(id_token):
        print("[Aviso Seguridad] Token de Google no cumple con el formato estándar JWT")
        return None

    # Intentar con google-auth oficial si está instalado
    if HAS_GOOGLE_AUTH:
        try:
            from google.oauth2 import id_token as g_id_token
            from google.auth.transport import requests as g_requests
            id_info = g_id_token.verify_oauth2_token(
                id_token,
                g_requests.Request(),
                GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None
            )
            sub = str(id_info.get("sub", "")).strip()
            if not sub:
                return None
            return {
                "sub": sub,
                "email": id_info.get("email", ""),
                "name": id_info.get("name", ""),
                "picture": id_info.get("picture", "")
            }
        except Exception as e:
            print(f"[AUTH google-auth fallo]: {e}")
            return None

    # Fallback con urllib.request estándar a endpoint público de Google
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(id_token)}"
        req = urllib.request.Request(url, headers={"User-Agent": "estudio-de-grado-app"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if GOOGLE_CLIENT_ID and data.get("aud") != GOOGLE_CLIENT_ID:
                print(f"[AUTH aud mismatch]: {data.get('aud')} != {GOOGLE_CLIENT_ID}")
                return None

            # Validar emisor oficial de Google
            iss = data.get("iss", "")
            if iss not in ("accounts.google.com", "https://accounts.google.com"):
                print(f"[AUTH iss inválido]: {iss}")
                return None

            # Validar que el correo esté verificado por Google
            email_verified = data.get("email_verified")
            if email_verified not in (True, "true", "True", 1, "1"):
                print("[AUTH correo no verificado por Google]")
                return None

            if float(data.get("exp", 0)) < time.time():
                print("[AUTH tokeninfo expirado]")
                return None

            sub = str(data.get("sub", "")).strip()
            if not sub:
                return None

            return {
                "sub": sub,
                "email": data.get("email", ""),
                "name": data.get("name", ""),
                "picture": data.get("picture", "")
            }
    except Exception as e:
        print(f"[AUTH tokeninfo error]: {e}")
        return None


class AutoSyncHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self):
        """Inyecta encabezados de seguridad HTTP estándar de defensa en profundidad."""
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
        super().end_headers()

    def send_json_response(self, data, status_code=200, headers=None):
        """Envía respuesta JSON con encabezados de seguridad y Content-Length exacto."""
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Cache-Control", "no-cache")
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(response_bytes)

    def get_authenticated_user(self):
        """Extrae y valida la cookie de sesión, retornando el registro del usuario o None."""
        cookie_header = self.headers.get("Cookie", "")
        if not cookie_header:
            return None
        cookies = {}
        for item in cookie_header.split(";"):
            if "=" in item:
                k, v = item.strip().split("=", 1)
                cookies[k.strip()] = v.strip()
        token = cookies.get("session_token")
        if not token:
            return None
        sub = verify_session_token(token)
        if not sub:
            return None
        return db.get_user_by_sub(sub)

    def do_GET(self):
        raw_clean_path = self.path.split('?')[0].split('#')[0]

        # 1. Detección y bloqueo de bytes nulos (%00 o \x00)
        if "\x00" in raw_clean_path or "%00" in raw_clean_path.lower():
            self.send_error(400, "Solicitud inválida: byte nulo detectado")
            return

        # 2. Detección de intento de evasión por doble codificación URL (%25)
        decoded_once = urllib.parse.unquote(raw_clean_path)
        decoded_twice = urllib.parse.unquote(decoded_once)
        if decoded_once != decoded_twice and ("%" in decoded_once or ".." in decoded_twice):
            self.send_error(400, "Solicitud inválida: intento de evasión por doble codificación")
            return

        clean_path = decoded_once
        segments = [s.strip() for s in clean_path.split('/') if s.strip()]
        lower_segments = [s.lower() for s in segments]

        # 3. Bloquear cualquier segmento que intente path traversal relativo
        if any(s in ('..', '.') for s in segments):
            self.send_error(403, "Acceso denegado: ruta no permitida")
            return

        # 4. Bloquear archivos y extensiones sensibles (Zero Exposure)
        BLOCKED_FILES = {
            'server.py', 'sync_config.json', 'parse_casos.py', 'all_cases.json',
            'manage_access_codes.py', 'db.py', 'test_e2e_case_flow.cjs', 'test_unlock_auth_flow.cjs',
            'package.json', 'agents.md'
        }
        BLOCKED_EXTENSIONS = ('.db', '.sqlite', '.db-wal', '.db-shm', '.key', '.pem', '.secret', '.cjs')

        if (any(s.startswith('.') for s in segments) or 
            any(s in BLOCKED_FILES for s in lower_segments) or
            any(any(s.endswith(ext) for ext in BLOCKED_EXTENSIONS) for s in lower_segments) or
            'casos' in lower_segments or '1_pautas_evaluacion' in lower_segments):
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
        # API 6: Consultar estado de sesión del usuario actual
        if clean_path == "/api/auth/me":
            user = self.get_authenticated_user()
            if user:
                self.send_json_response({
                    "ok": True,
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "name": user["name"] or user["email"].split("@")[0],
                        "access_code": user["access_code"],
                        "isDemo": not bool(user["access_code"])
                    }
                })
            else:
                self.send_json_response({
                    "ok": False,
                    "error": "No autenticado"
                }, status_code=401)
            return

        # API 7: Obtener todo el progreso sincronizado del usuario autenticado
        if clean_path == "/api/user/progress":
            user = self.get_authenticated_user()
            if not user:
                self.send_json_response({"ok": False, "error": "No autenticado"}, status_code=401)
                return
            progress = db.get_all_user_progress(user["id"])
            self.send_json_response({"ok": True, "progress": progress})
            return

        # API 8: Listar Códigos de Acceso (Admin)
        if clean_path == "/api/admin/codes":
            admin_pin = self.headers.get("X-Admin-PIN", "").strip()
            if not admin_pin and "?" in self.path:
                query_str = self.path.split("?", 1)[1]
                params = urllib.parse.parse_qs(query_str)
                admin_pin = params.get("pin", [""])[0].strip()
            if not verify_admin_pin(admin_pin):
                self.send_json_response({"ok": False, "error": "Acceso de administrador no autorizado."}, status_code=401)
                return
            raw_codes = db.list_access_codes()
            codes = []
            for c in raw_codes:
                item = dict(c)
                item["current_uses"] = item.get("times_used", 0)
                item["uses"] = item.get("times_used", 0)
                item["linked_emails"] = item.get("linked_emails") or ""
                item["assigned_email"] = item.get("assigned_email") or ""
                item["associated_email"] = item.get("associated_email") or item.get("linked_emails") or item.get("assigned_email") or ""
                codes.append(item)
            self.send_json_response({"ok": True, "codes": codes})
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

        # Normalización del encabezado Content-Type y de ruta
        raw_clean_path = self.path.split('?')[0].split('#')[0]
        clean_path = urllib.parse.unquote(raw_clean_path)
        raw_content_type = self.headers.get("Content-Type", "")
        content_type = raw_content_type.split(";")[0].strip().lower()

        # API: Cerrar Sesión (Invalidar Cookie, no requiere cuerpo)
        if clean_path == "/api/auth/logout":
            cookie = make_logout_cookie()
            self.send_json_response({"ok": True, "message": "Sesión finalizada correctamente"}, headers={"Set-Cookie": cookie})
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

        # API Admin: Crear Código de Acceso
        if clean_path == "/api/admin/create-code":
            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            admin_pin = req_data.get("pin") or self.headers.get("X-Admin-PIN", "")
            if not verify_admin_pin(admin_pin):
                self.send_json_response({"ok": False, "error": "Acceso de administrador no autorizado. Clave incorrecta."}, status_code=401)
                return

            code = req_data.get("code", "")
            label = req_data.get("label") or req_data.get("studentName") or "Grado-2026-Sept"
            try:
                max_uses = max(1, int(req_data.get("max_uses") or req_data.get("maxUses") or 1))
            except (ValueError, TypeError):
                max_uses = 1

            days = req_data.get("days")
            expires_at = None
            if days is not None and str(days).strip():
                try:
                    d_int = int(days)
                    if d_int > 0:
                        expires_at = int((time.time() + (d_int * 86400)) * 1000)
                except (ValueError, TypeError):
                    expires_at = None

            raw_assigned_email = req_data.get("email") or req_data.get("assigned_email") or req_data.get("studentEmail")
            clean_assigned_email = None
            if raw_assigned_email and str(raw_assigned_email).strip():
                candidate = str(raw_assigned_email).strip().lower()
                if "@" in candidate:
                    clean_assigned_email = candidate

            clean_code = db.normalize_access_code(code)
            if not clean_code or not re.match(r"^[A-Z0-9_\-]{4,36}$", clean_code):
                self.send_json_response({"ok": False, "error": "Formato de código inválido (debe contener entre 4 y 36 caracteres alfanuméricos o guiones)."}, status_code=400)
                return

            try:
                res = db.create_access_code(clean_code, label=label, max_uses=max_uses, expires_at=expires_at, assigned_email=clean_assigned_email)
                self.send_json_response({"ok": True, "code": clean_code, "item": res}, status_code=201)
            except sqlite3.IntegrityError:
                self.send_json_response({"ok": False, "error": f"El código '{clean_code}' ya existe en el sistema."}, status_code=409)
            except Exception as e:
                self.send_json_response({"ok": False, "error": f"Error al crear código: {str(e)}"}, status_code=500)
            return

        # API Admin: Revocar Código de Acceso
        if clean_path == "/api/admin/revoke-code":
            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            admin_pin = req_data.get("pin") or self.headers.get("X-Admin-PIN", "")
            if not verify_admin_pin(admin_pin):
                self.send_json_response({"ok": False, "error": "Acceso de administrador no autorizado."}, status_code=401)
                return

            code = req_data.get("code", "")
            clean_code = db.normalize_access_code(code)
            ok = db.revoke_access_code(clean_code)
            if ok:
                self.send_json_response({"ok": True, "message": f"Código '{clean_code}' revocado exitosamente."})
            else:
                self.send_json_response({"ok": False, "error": f"No se encontró el código '{clean_code}' o ya estaba inactivo."}, status_code=404)
            return

        # API: Registro de Usuario (Correo + Contraseña + Verificación por Código de 6 Dígitos)
        if clean_path == "/api/auth/register":
            client_ip = self.client_address[0]
            is_test = os.environ.get("ALLOW_TEST_AUTH") == "1"
            if not is_test:
                allowed, retry_sec = AUTH_LIMITER.check_fixed_limit(client_ip, max_requests=20, window_seconds=60.0)
                if not allowed:
                    self.send_json_response({
                        "ok": False,
                        "error": f"Demasiadas solicitudes de registro. Por favor espera {int(retry_sec) + 1} segundos."
                    }, status_code=429)
                    return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            email = req_data.get("email", "").strip().lower()
            password = req_data.get("password", "")
            password_confirm = req_data.get("passwordConfirm", "")
            name = req_data.get("name", "").strip()

            if not email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
                self.send_json_response({"ok": False, "error": "Formato de correo electrónico inválido."}, status_code=400)
                return

            if password != password_confirm:
                self.send_json_response({"ok": False, "error": "Las contraseñas no coinciden."}, status_code=400)
                return

            valid_pwd, pwd_err = validate_password_policy(password)
            if not valid_pwd:
                self.send_json_response({"ok": False, "error": pwd_err}, status_code=400)
                return

            # Generar código de 6 dígitos numérico con secrets.choice (no random)
            digits = "0123456789"
            verification_code = "".join(secrets.choice(digits) for _ in range(6))
            now_ms = int(time.time() * 1000)
            verification_expires_at = now_ms + (15 * 60 * 1000)  # 15 minutos

            ok, reason, user = db.create_user(
                email=email,
                password=password,
                name=name,
                is_verified=0,
                verification_code=verification_code,
                verification_code_expires_at=verification_expires_at
            )
            if not ok or not user:
                self.send_json_response({"ok": False, "error": reason}, status_code=400)
                return

            # Enviar correo mediante el proveedor activo (Brevo HTTPS / Resend HTTPS / SMTP)
            email_sent, email_err = send_verification_email(email, verification_code)
            if not email_sent:
                print(f"[Auth Register Error] No se pudo despachar correo a {mask_email(email)}: {email_err}")
                self.send_json_response({
                    "ok": False,
                    "error": "No pudimos enviar el correo de verificación. Por favor intenta nuevamente en unos minutos."
                }, status_code=503)
                return

            resp_payload = {
                "ok": True,
                "needsVerification": True,
                "email": user["email"],
                "message": "Tu cuenta ha sido creada. Por favor ingresa el código de 6 dígitos enviado a tu correo."
            }
            if is_test:
                resp_payload["testVerificationCode"] = verification_code

            self.send_json_response(resp_payload, status_code=201)
            return

        # API: Verificar Código de 6 Dígitos
        if clean_path == "/api/auth/verify-code":
            client_ip = self.client_address[0]
            is_test = os.environ.get("ALLOW_TEST_AUTH") == "1"
            if not is_test:
                allowed, retry_sec = AUTH_LIMITER.check_fixed_limit(client_ip, max_requests=30, window_seconds=60.0)
                if not allowed:
                    self.send_json_response({
                        "ok": False,
                        "error": f"Demasiados intentos. Por favor espera {int(retry_sec) + 1} segundos."
                    }, status_code=429)
                    return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            email = req_data.get("email", "").strip().lower()
            code = str(req_data.get("code", "")).strip()

            if not email or not code:
                self.send_json_response({"ok": False, "error": "Correo y código de verificación son requeridos."}, status_code=400)
                return

            user = db.get_user_by_email(email)
            if not user:
                self.send_json_response({"ok": False, "error": "Código de verificación inválido o usuario no encontrado."}, status_code=400)
                return

            if user.get("is_verified") == 1:
                self.send_json_response({"ok": False, "error": "La cuenta ya ha sido verificada. Inicia sesión directamente."}, status_code=400)
                return

            attempts = user.get("verification_attempts") or 0
            if attempts >= 5 or not user.get("verification_code"):
                db.invalidate_verification_code(user["id"])
                self.send_json_response({
                    "ok": False,
                    "error": "Has alcanzado el límite máximo de intentos (5). Solicita un nuevo código de verificación."
                }, status_code=400)
                return

            now_ms = int(time.time() * 1000)
            expires_at = user.get("verification_code_expires_at")
            if not expires_at or now_ms > expires_at:
                self.send_json_response({
                    "ok": False,
                    "error": "El código de verificación ha expirado (vence en 15 minutos). Por favor solicita uno nuevo."
                }, status_code=410)
                return

            if code != str(user.get("verification_code", "")).strip():
                new_attempts = db.increment_verification_attempts(user["id"])
                if new_attempts >= 5:
                    db.invalidate_verification_code(user["id"])
                    self.send_json_response({
                        "ok": False,
                        "error": "Has alcanzado el límite de 5 intentos fallidos. El código ha sido invalidado; solicita uno nuevo."
                    }, status_code=400)
                    return
                self.send_json_response({
                    "ok": False,
                    "error": f"Código de verificación incorrecto. Intento {new_attempts} de 5."
                }, status_code=400)
                return

            # Código correcto: marcar verificado y crear sesión activa en Versión Demo
            db.mark_user_verified(user["id"])
            token = create_session_token(str(user["id"]))
            cookie = make_session_cookie(token)
            self.send_json_response({
                "ok": True,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"] or user["email"].split("@")[0],
                    "access_code": user.get("access_code"),
                    "isDemo": not bool(user.get("access_code"))
                },
                "message": "Correo verificado exitosamente."
            }, status_code=200, headers={"Set-Cookie": cookie})
            return

        # API: Reenviar Código de Verificación de 6 Dígitos
        if clean_path == "/api/auth/resend-code":
            client_ip = self.client_address[0]
            is_test = os.environ.get("ALLOW_TEST_AUTH") == "1"
            if not is_test:
                allowed, retry_sec = AUTH_LIMITER.check_fixed_limit(client_ip, max_requests=10, window_seconds=60.0)
                if not allowed:
                    self.send_json_response({
                        "ok": False,
                        "error": f"Demasiadas solicitudes de reenvío. Espera {int(retry_sec) + 1} segundos."
                    }, status_code=429)
                    return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            email = req_data.get("email", "").strip().lower()
            if not email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
                self.send_json_response({"ok": False, "error": "Correo electrónico inválido."}, status_code=400)
                return

            user = db.get_user_by_email(email)
            new_code = None
            if user and not user.get("is_verified"):
                digits = "0123456789"
                new_code = "".join(secrets.choice(digits) for _ in range(6))
                now_ms = int(time.time() * 1000)
                new_expires_at = now_ms + (15 * 60 * 1000)
                db.update_verification_code(user["id"], new_code, new_expires_at)
                email_sent, email_err = send_verification_email(email, new_code)
                if not email_sent:
                    print(f"[Auth Resend Error] No se pudo despachar correo a {mask_email(email)}: {email_err}")
                    self.send_json_response({
                        "ok": False,
                        "error": "No pudimos enviar el correo de verificación. Por favor intenta nuevamente en unos minutos."
                    }, status_code=503)
                    return

            resp_payload = {
                "ok": True,
                "message": "Si el correo corresponde a una cuenta pendiente de verificación, recibirás un nuevo código en unos momentos."
            }
            if is_test and new_code:
                resp_payload["testVerificationCode"] = new_code

            self.send_json_response(resp_payload, status_code=200)
            return

        # API: Inicio de Sesión (Correo + Contraseña con Lockout de 15 min y Verificación de Cuenta)
        if clean_path == "/api/auth/login":
            client_ip = self.client_address[0]
            is_test = os.environ.get("ALLOW_TEST_AUTH") == "1"
            if not is_test:
                allowed, wait_sec = LOGIN_BACKOFF_LIMITER.check_exponential_backoff(client_ip, max_free_attempts=5, window_seconds=900.0)
                if not allowed:
                    self.send_json_response({
                        "ok": False,
                        "error": f"Demasiados intentos de acceso fallidos. Por favor espera {int(wait_sec) + 1} segundos."
                    }, status_code=429)
                    return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            email = req_data.get("email", "").strip().lower()
            password = req_data.get("password", "")

            user = db.get_user_by_email(email)

            # Verificar si la cuenta está bloqueada temporalmente
            now_ms = int(time.time() * 1000)
            if user and user.get("locked_until") and user["locked_until"] > now_ms:
                remaining_mins = max(1, int((user["locked_until"] - now_ms) / 60000) + 1)
                self.send_json_response({
                    "ok": False,
                    "error": f"Cuenta bloqueada temporalmente por seguridad. Reintenta en {remaining_mins} minutos."
                }, status_code=423)
                return

            if not user:
                LOGIN_BACKOFF_LIMITER.record_attempt(client_ip)
                # Resistencia a ataques de temporización (timing attacks)
                dummy_hash, dummy_salt = "bWlncmF0ZWRoYXNoMTIzNDU2Nzg5MDEyMzQ1Njc4OTA=", "bWlncmF0ZWRzYWx0MTIzNA=="
                db.verify_password(password, dummy_hash, dummy_salt)
                self.send_json_response({
                    "ok": False,
                    "error": "Credenciales inválidas."
                }, status_code=401)
                return

            is_valid = db.verify_password(password, user["password_hash"], user["password_salt"])
            if not is_valid:
                LOGIN_BACKOFF_LIMITER.record_attempt(client_ip)
                attempts, locked_until = db.record_login_failure(user["id"])
                if locked_until:
                    self.send_json_response({
                        "ok": False,
                        "error": "Cuenta bloqueada temporalmente por 15 minutos debido a 5 intentos fallidos consecutivos."
                    }, status_code=423)
                    return
                self.send_json_response({
                    "ok": False,
                    "error": "Credenciales inválidas."
                }, status_code=401)
                return

            # Verificar si la cuenta está verificada por correo
            if not user.get("is_verified"):
                self.send_json_response({
                    "ok": False,
                    "unverified": True,
                    "email": user["email"],
                    "error": "Tu cuenta aún no ha sido verificada. Ingresa el código de 6 dígitos enviado a tu correo para activarla."
                }, status_code=403)
                return

            LOGIN_BACKOFF_LIMITER.reset(client_ip)
            db.record_login_success(user["id"])
            token = create_session_token(str(user["id"]))
            cookie = make_session_cookie(token)
            progress = db.get_all_user_progress(user["id"])
            self.send_json_response({
                "ok": True,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"] or user["email"].split("@")[0],
                    "access_code": user["access_code"],
                    "isDemo": not bool(user["access_code"])
                },
                "progress": progress
            }, headers={"Set-Cookie": cookie})
            return

        # API: Convalidar Código de Acceso (Paso 2)
        if clean_path in ("/api/auth/link-code", "/api/auth/convalidate"):
            client_ip = self.client_address[0]
            is_test = os.environ.get("ALLOW_TEST_AUTH") == "1"
            if not is_test:
                allowed, wait_sec = LINK_CODE_LIMITER.check_exponential_backoff(client_ip, max_free_attempts=5, window_seconds=900.0)
                if not allowed:
                    self.send_json_response({
                        "ok": False,
                        "error": f"Demasiados intentos fallidos. Por favor espera {int(wait_sec) + 1} segundos."
                    }, status_code=429)
                    return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            clean_code = db.normalize_access_code(req_data.get("code", ""))

            # Identificar usuario: por cookie de sesión o por idToken (modo test)
            user = self.get_authenticated_user()
            if not user and is_test and req_data.get("idToken"):
                id_token = req_data.get("idToken", "").strip()
                token_info = verify_google_id_token(id_token)
                if token_info:
                    ok, reason, user = db.create_user_with_code(
                        google_sub=token_info["sub"],
                        email=token_info["email"],
                        name=token_info["name"],
                        picture_url=token_info["picture"],
                        code=clean_code
                    )
                    if not ok or not user:
                        LINK_CODE_LIMITER.record_attempt(client_ip)
                        self.send_json_response({"ok": False, "error": reason}, status_code=400)
                        return
                    LINK_CODE_LIMITER.reset(client_ip)
                    token = create_session_token(str(user["id"]))
                    cookie = make_session_cookie(token)
                    self.send_json_response({
                        "ok": True,
                        "user": {
                            "id": user["id"],
                            "email": user["email"],
                            "name": user["name"] or user["email"].split("@")[0],
                            "access_code": user["access_code"],
                            "isDemo": False
                        }
                    }, headers={"Set-Cookie": cookie})
                    return

            if not user:
                self.send_json_response({"ok": False, "error": "No autenticado. Inicia sesión primero."}, status_code=401)
                return

            ok, reason, updated_user = db.link_user_code(user["id"], clean_code)
            if not ok or not updated_user:
                LINK_CODE_LIMITER.record_attempt(client_ip)
                self.send_json_response({"ok": False, "error": reason}, status_code=400)
                return

            LINK_CODE_LIMITER.reset(client_ip)
            token = create_session_token(str(updated_user["id"]))
            cookie = make_session_cookie(token)
            self.send_json_response({
                "ok": True,
                "user": {
                    "id": updated_user["id"],
                    "email": updated_user["email"],
                    "name": updated_user["name"] or updated_user["email"].split("@")[0],
                    "access_code": updated_user["access_code"],
                    "isDemo": False
                }
            }, headers={"Set-Cookie": cookie})
            return

        # API: Autenticación con Google (Compatibilidad para pruebas E2E con ALLOW_TEST_AUTH)
        if clean_path == "/api/auth/google":
            client_ip = self.client_address[0]
            is_test = os.environ.get("ALLOW_TEST_AUTH") == "1"
            if not is_test:
                self.send_json_response({"ok": False, "error": "Autenticación Google deshabilitada. Usa /api/auth/login o /api/auth/register."}, status_code=410)
                return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            id_token = req_data.get("idToken", "").strip()
            token_info = verify_google_id_token(id_token)
            if not token_info:
                self.send_json_response({"ok": False, "error": "Token de Google inválido o expirado"}, status_code=401)
                return

            email = token_info["email"]
            name = token_info["name"]
            user = db.get_user_by_email(email)

            if user and user.get("access_code"):
                token = create_session_token(str(user["id"]))
                progress = db.get_all_user_progress(user["id"])
                cookie = make_session_cookie(token)
                self.send_json_response({
                    "ok": True,
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "name": user["name"] or user["email"].split("@")[0],
                        "access_code": user["access_code"],
                        "isDemo": False
                    },
                    "progress": progress
                }, headers={"Set-Cookie": cookie})
            else:
                self.send_json_response({
                    "ok": False,
                    "requiresAccessCode": True,
                    "message": "Se requiere un código de acceso de invitación para vincular tu cuenta.",
                    "userPreview": {"email": email, "name": name}
                }, status_code=403)
            return

        # API: Guardar / Actualizar Progreso de Usuario (Multi-dispositivo)
        if clean_path == "/api/user/progress":
            user = self.get_authenticated_user()
            if not user:
                self.send_json_response({"ok": False, "error": "No autenticado"}, status_code=401)
                return

            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                req_data = json.loads(body)
            except Exception:
                self.send_json_response({"ok": False, "error": "Cuerpo JSON inválido"}, status_code=400)
                return

            case_id = str(req_data.get("caseId", "")).strip()
            data = req_data.get("data")
            if not case_id or data is None:
                self.send_json_response({"ok": False, "error": "Campos 'caseId' y 'data' obligatorios"}, status_code=400)
                return

            if not re.match(r"^[a-zA-Z0-9_\-]{1,64}$", case_id):
                self.send_json_response({"ok": False, "error": "Identificador de caso 'caseId' inválido"}, status_code=400)
                return

            if not isinstance(data, dict):
                self.send_json_response({"ok": False, "error": "El campo 'data' debe ser un objeto JSON válido"}, status_code=400)
                return

            ok, updated_at = db.upsert_user_progress(user["id"], case_id, data)
            self.send_json_response({"ok": True, "caseId": case_id, "updatedAt": updated_at})
            return

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
    # Seguridad: Enlazar a 127.0.0.1 en desarrollo local.
    # En Render o nube (PORT en entorno) o con flag --lan: enlazar a 0.0.0.0
    bind_address = "127.0.0.1"
    is_cloud_or_lan = (
        "--lan" in sys.argv or
        "-lan" in sys.argv or
        bool(os.environ.get("RENDER")) or
        "PORT" in os.environ
    )
    if is_cloud_or_lan:
        bind_address = "0.0.0.0"

    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer((bind_address, PORT), AutoSyncHTTPHandler) as httpd:
        mode_str = "Nube / Red Pública (0.0.0.0)" if bind_address == "0.0.0.0" else "Localhost seguro (127.0.0.1)"
        print(f"==================================================")
        print(f" Servidor GRADOMANIACOS con Auto-Sincronizador")
        print(f" Modo: {mode_str}")
        print(f" Puerto: {PORT}")
        print(f" URL: http://{'localhost' if bind_address == '127.0.0.1' else '0.0.0.0'}:{PORT}")
        print(f" Monitoreando carpeta: {APUNTES_DIR}")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
