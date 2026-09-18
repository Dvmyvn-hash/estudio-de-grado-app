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
DESKTOP_FUENTES_DIR = Path(os.path.expanduser("~")) / "Desktop" / "Fuentes_Grado"
APUNTES_DIR = DESKTOP_FUENTES_DIR / "APUNTES"
CONFIG_FILE = BASE_DIR / "sync_config.json"
ALL_TOPICS_PATH = BASE_DIR / "all_afg_topics.json"
DATA_JS_PATH = BASE_DIR / "js" / "data.js"

# Asegurar carpetas
FUENTES_DIR.mkdir(exist_ok=True)
DESKTOP_FUENTES_DIR.mkdir(parents=True, exist_ok=True)
APUNTES_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_EXTENSIONS = ('.md', '.txt', '.markdown', '.pdf', '.docx')

def get_watched_directories():
    """Obtiene las carpetas vigiladas (fuentes local, Escritorio Fuentes_Grado y APUNTES)"""
    dirs = [FUENTES_DIR]
    if DESKTOP_FUENTES_DIR.exists():
        dirs.append(DESKTOP_FUENTES_DIR)
    if APUNTES_DIR.exists():
        dirs.append(APUNTES_DIR)
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

class AutoSyncHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self):
        # 1. Seguridad: Prevenir acceso a directorios o archivos ocultos (.git, .antigravity, etc.) y código sensible
        clean_path = self.path.split('?')[0].split('#')[0]
        segments = [s.strip() for s in clean_path.split('/') if s.strip()]
        
        # Bloquear cualquier segmento que comience con punto (.git, .env) o scripts de servidor
        if any(s.startswith('.') for s in segments) or any(s in ('server.py', 'sync_config.json') for s in segments):
            self.send_error(403, "Acceso denegado: recurso protegido")
            return

        # API 1: Comprobar cambios (Polling ligero para actualización automática)
        if self.path == "/api/sync-check":
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
        if self.path == "/api/sync-topics":
            topics = get_all_synced_topics()
            response_bytes = json.dumps({"topics": topics, "count": len(topics)}, ensure_ascii=False).encode("utf-8")
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
        # API 3: Configurar carpeta externa (ej: Google Drive o carpeta de apuntes)
        if self.path == "/api/set-sync-folder":
            # Control de acceso: solo peticiones locales (localhost / 127.0.0.1)
            client_ip = self.client_address[0]
            if client_ip not in ("127.0.0.1", "::1", "localhost"):
                self.send_error(403, "Configuracion restringida al equipo local")
                return

            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 65536:
                self.send_error(413, "Carga demasiado grande")
                return

            body = self.rfile.read(content_length).decode("utf-8")
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
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        super().do_POST()

if __name__ == "__main__":
    import sys
    # Seguridad por defecto: enlazar únicamente a localhost (127.0.0.1).
    # Si se desea conectar el celular por Wi-Fi, ejecutar con el flag --lan: python server.py --lan
    bind_address = "127.0.0.1"
    if "--lan" in sys.argv or "-lan" in sys.argv:
        bind_address = "" # Escuchar en todas las interfaces para red local

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((bind_address, PORT), AutoSyncHTTPHandler) as httpd:
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
