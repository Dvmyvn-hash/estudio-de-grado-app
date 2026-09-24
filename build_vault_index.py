# -*- coding: utf-8 -*-
"""
build_vault_index.py — Generador Determinista del Índice Estático del Vault (v7.22)
==================================================================================
Lee all_afg_topics.json (103 cédulas canónicas) y genera:
  - vault_index.json   -> Índice estático optimizado para BM25-lite (≤ 600 KB)
  - js/vault-index.js  -> Artefacto JS para navegador y Node.js (objeto VAULT_INDEX)

Presupuesto estricto: vault_index.json DEBE ser <= 600 KB.
El script es idempotente y determinista: dos corridas consecutivas producen
archivos byte-idénticos.

Uso: python build_vault_index.py
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOPICS_PATH = os.path.join(BASE_DIR, "all_afg_topics.json")
OUT_JSON_PATH = os.path.join(BASE_DIR, "vault_index.json")
OUT_JS_PATH = os.path.join(BASE_DIR, "js", "vault-index.js")
SINONIMOS_JSON_PATH = os.path.join(BASE_DIR, "sinonimos.json")
SINONIMOS_JS_PATH = os.path.join(BASE_DIR, "js", "sinonimos.js")

MAX_INDEX_BYTES = 600 * 1024  # 600 KB de presupuesto estricto
MAX_CONTENT_CHARS = 4000      # Tope de caracteres como en populateApuntesIndex
MAX_POSITIONS = 8             # Posiciones por término por documento (≤ 8)

# Lista exhaustiva y canónica de stopwords en español (sin tildes)
RAW_STOPWORDS = """
a al algo algunas algunos ante antes aquel aquella aquellas aquellos aqui arriba abajo asi atras aun aunque bajo bastante bien cabe cada casi cerca cierto cierta ciertos ciertas como con conmigo consigo contigo contra cual cuales cualquier cualquiera cualesquiera cuan cuando cuanto cuanta cuantos cuantas de del demas demasiado demasiada demasiados demasiadas dentro deprisa desde despues detras donde dos tres cuatro cinco seis siete ocho nueve diez durante e el ella ellas ello ellos empleo en encima enfrente enseguida entre era erais eramos eran eras eres es esa esas ese eso esos esta estaba estabais estabamos estaban estabas estad estada estadas estado estados estais estamos estan estar estara estaran estaras estare estareis estaremos estaria estariais estariamos estarian estarias estas este estemos esto estos estoy estuve estuviera estuvierais estuvieramos estuvieran estuvieras estuvieron estuviese estuvieseis estuviesemos estuviesen estuvieses estuvimos estuviste estuvisteis estuvo ex excepto fin final fue fuera fuerais fueramos fueran fueras fueron fuese fueseis fuesemos fuesen fueses fui fuimos fuiste fuisteis gran grandes ha habeis habia habiais habiamos habian habias habida habidas habido habidos habiendo habra habran habras habre habreis habremos habria habriais habriamos habrian habrias hace haceis hacemos hacen hacer hacera haceran haceras hacere hacereis haceremos haceria haceriais haceriamos hacerian hacerias haces hacia haciais haciamos hacian hacias hago han has hasta hay haya hayais hayamos hayan hayas haye he heis hemos hube hubiera hubierais hubieramos hubieran hubieras hubieron hubiese hubieseis hubiesemos hubiesen hubieses hubimos hubiste hubisteis hubo igual incluso indico jamas junto juntos la las le les lo los mas me mediante menos mi mia mias mientras mio mios misma mismas mismo mismos momento mucha muchas mucho muchos muy nada nadie ni ningun ninguna ningunas ninguno ningunos no nos nosotras nosotros nuestra nuestras nuestro nuestros nunca o os otra otras otro otros para parecer parte pero poca pocas poco pocos podeis podemos poder podra podran podras podre podreis podremos podria podriais podriamos podrian podrias poned poneis ponemos ponen poner ponera poneran poneras ponere ponereis poneremos poneria poneriais poneriamos ponerian ponerias pones pongo por porque primero primeros primera primeras propia propias propio propios proximo proximos proxima proximas pues puesto que quede quien quienes quienquiera quiza quizas sabe sabeis sabemos saben saber sabera saberan saberas sabere sabereis saberemos saberia saberiais saberiamos saberian saberias sabes sabiendo sabido sabida sabidos sabidas salvo se sea seais seamos sean seas segun ser sera seran seras sere sereis seremos seria seriais seriamos serian serias si sido siempre siendo sin sino so sobre sois sola solamente solas solo solos somos son soy su sus suya suyas suyo suyos tal tales tambien tampoco tan tanta tantas tanto tantos te teneis tenemos tener tengais tengamos tengo tenia teniais teniamos tenian tenias tenida tenidas tenido tenidos teniendo tenra tenran tenras tenre tenreis tenremos tenria tenriais tenriamos tenrian tenrias ti tiene tienen tienes toda todas todavia todo todos tras tu tus tuya tuyas tuyo tuyos tuve tuviera tuvierais tuvieramos tuvieran tuvieras tuvieron tuviese tuvieseis tuviesemos tuviesen tuvieses tuvimos tuviste tuvisteis tuvo un una unas uno unos usa usais usamos usan usar usara usaran usaras usare usareis usaremos usaria usariais usariamos usarian usarias usas use usted ustedes va vais valor vamos van varias varios vaya vayamos vayan vayas ve veis vemos ven ver vera veran veras vere vereis veremos veria veriais veriamos verian verias verdad verdadera verdadero ves vez veces via vosotras vosotros voy y ya yo seccion capitulo numero letra letras inciso incisos articulo articulos orden tipo tipos clase clases etc md claro tras punto puntos aspecto aspectos propio propia mismos mismas cabe dar da dan dado dados dio dicen dicho decir nivel tema temas base bases relacion sentido ejemplo ejemplos texto textos nota notas apunte apuntes cedula cedulas modulo modulos unidad unidades etapa etapas fase fases examen examenes grado grados parrafo parrafos titulo titulos subtitulo subtitulos fuente fuentes archivo archivos
"""


def normalize_text(text):
    """
    Normalización contractada (v7.25, Prompt 020):
    - Minúsculas
    - Sustitución de ligaduras tipográficas / artefactos OCR (ﬁ/ﬂ/ﬀ/ﬃ/ﬄ/æ/œ)
    - Remoción de guiones blandos (\\u00ad) y zero-width space (\\u200b)
    - Normalización de comillas y guiones
    - Eliminación de acentos en español (á,é,í,ó,ú,ü), preservando la letra ñ
    - Colapso de espacios múltiples
    """
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
    text = re.sub(r'\s+', ' ', text).strip()
    return text


STOPWORDS = set(normalize_text(RAW_STOPWORDS).split())


def stem_word(w):
    """
    Stemming ligero por sufijos en español:
    - Adverbios: -mente
    - Sustantivos verbales: -ciones / -cion
    - Plurales: -es (tras consonante) / -s (tras vocal)
    """
    if len(w) > 6 and w.endswith('mente'):
        w = w[:-5]
    if len(w) > 7 and w.endswith('ciones'):
        w = w[:-6]
    elif len(w) > 5 and w.endswith('cion'):
        w = w[:-4]
    elif len(w) > 4 and w.endswith('es') and w[-3] in 'bcdfghjklmnñprstvz':
        w = w[:-2]
    elif len(w) > 3 and w.endswith('s') and not w.endswith('ss') and w[-2] in 'aeiou':
        w = w[:-1]
    return w


def extract_temario_keywords():
    """Importa o provee el mapa canónico de palabras clave del Examen de Grado."""
    try:
        from generate_clean_notes_data import TEMARIO_CANONICO
        kws_map = {}
        for subj, entries in TEMARIO_CANONICO.items():
            for orden, chap, keywords, name in entries:
                key = f"{subj}:{chap}"
                norm_kws = [normalize_text(kw) for kw in keywords if kw]
                kws_map[key] = sorted(list(set(norm_kws)))
        return kws_map
    except Exception:
        # Fallback canónico si no se puede importar directamente
        return {
            "procesal:10": ["emplazamiento", "notificacion demanda", "258 cpc", "259 cpc"]
        }


def build_vault_index():
    if not os.path.exists(TOPICS_PATH):
        raise FileNotFoundError(f"No se encontró el archivo canónico {TOPICS_PATH}")

    with open(TOPICS_PATH, "r", encoding="utf-8") as f:
        topics = json.load(f)

    total_docs = len(topics)
    doc_lens = {}
    meta = {}
    docs = {}
    df = {}
    total_words = 0

    # Sort topics deterministically by id
    sorted_topics = sorted(topics, key=lambda t: t.get("id", ""))

    for t in sorted_topics:
        tid = t["id"]
        title = t.get("cleanTitle") or t.get("title") or ""
        cat = t.get("category") or ""
        content = (t.get("content") or "")[:MAX_CONTENT_CHARS]
        norm_content = normalize_text(content)

        terms_in_doc = {}
        word_count = 0

        # Tokenización de content
        for m in re.finditer(r"[a-z0-9ñ]{2,}", norm_content):
            w = m.group(0)
            if len(w) == 2 and not w.isdigit():
                continue
            word_count += 1
            if w in STOPWORDS:
                continue
            stem = stem_word(w)
            if stem in STOPWORDS:
                continue

            start = m.start()
            if stem not in terms_in_doc:
                terms_in_doc[stem] = [0, []]
            terms_in_doc[stem][0] += 1
            if len(terms_in_doc[stem][1]) < MAX_POSITIONS:
                terms_in_doc[stem][1].append(start)

        # Tokenización de title + cleanTitle + category (con posición 0 si no estaba)
        norm_extra = normalize_text(f"{t.get('title', '')} {title} {cat}")
        for m in re.finditer(r"[a-z0-9ñ]{2,}", norm_extra):
            w = m.group(0)
            if len(w) == 2 and not w.isdigit():
                continue
            word_count += 1
            if w in STOPWORDS:
                continue
            stem = stem_word(w)
            if stem in STOPWORDS:
                continue

            if stem not in terms_in_doc:
                terms_in_doc[stem] = [1, [0]]
            else:
                terms_in_doc[stem][0] += 1

        # Acumular df
        for stem in terms_in_doc:
            df[stem] = df.get(stem, 0) + 1

        # Ordenar postings deterministamente por término
        sorted_terms = {k: terms_in_doc[k] for k in sorted(terms_in_doc.keys())}
        docs[tid] = sorted_terms
        doc_lens[tid] = word_count
        meta[tid] = {
            "id": tid,
            "indexCode": t.get("indexCode") or t.get("code") or "",
            "code": t.get("code") or "",
            "subject": t.get("subject") or "",
            "chapterNumber": t.get("chapterNumber") or 1,
            "sourceFile": (t.get("sourceFile") or "").replace("\\", "/").split("/")[-1],
            "title": title
        }
        total_words += word_count

    avg_len = round(total_words / total_docs, 2) if total_docs > 0 else 0
    temario_kws = extract_temario_keywords()

    # Estructura del Vault Index (Claves ordenadas)
    vault_index = {
        "version": "1.0.0",
        "totalDocs": total_docs,
        "avgLen": avg_len,
        "temarioKeywords": {k: temario_kws[k] for k in sorted(temario_kws.keys())},
        "docLen": {k: doc_lens[k] for k in sorted(doc_lens.keys())},
        "meta": {k: meta[k] for k in sorted(meta.keys())},
        "df": {k: df[k] for k in sorted(df.keys())},
        "docs": {k: docs[k] for k in sorted(docs.keys())}
    }

    # Serialización JSON canónica (sin espacios residuales, orden estricto de claves)
    serialized_json = json.dumps(vault_index, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    json_bytes = serialized_json.encode('utf-8')
    json_size_kb = len(json_bytes) / 1024

    print(f"[build_vault_index] Documentos procesados: {total_docs}")
    print(f"[build_vault_index] Tamaño vault_index.json: {json_size_kb:.2f} KB (tope: 600 KB)")

    if len(json_bytes) > MAX_INDEX_BYTES:
        raise ValueError(
            f"PRESUPUESTO EXCEDIDO: vault_index.json ocupa {json_size_kb:.2f} KB "
            f"(máximo permitido: {MAX_INDEX_BYTES / 1024} KB). Poda stopwords o posiciones."
        )

    # Escribir vault_index.json
    with open(OUT_JSON_PATH, "wb") as f:
        f.write(json_bytes)

    # Renderizar js/vault-index.js
    js_content = (
        "/**\n"
        " * ÍNDICE SEMÁNTICO ESTÁTICO DEL VAULT DE CONOCIMIENTO (v7.22)\n"
        " * Generado automáticamente por build_vault_index.py desde all_afg_topics.json.\n"
        " * Determinista e idempotente. NO editar a mano.\n"
        " */\n\n"
        f"const VAULT_INDEX = {serialized_json};\n\n"
        "if (typeof module !== 'undefined' && module.exports) module.exports = VAULT_INDEX;\n"
        "if (typeof window !== 'undefined') window.VAULT_INDEX = VAULT_INDEX;\n"
        "if (typeof globalThis !== 'undefined') globalThis.VAULT_INDEX = VAULT_INDEX;\n"
    )

    with open(OUT_JS_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(js_content)

    # Compilar js/sinonimos.js desde sinonimos.json si existe
    if os.path.exists(SINONIMOS_JSON_PATH):
        with open(SINONIMOS_JSON_PATH, "r", encoding="utf-8") as f:
            sinonimos_data = json.load(f)
        sinonimos_json = json.dumps(sinonimos_data, ensure_ascii=False, indent=2)
        sinonimos_js = (
            "/**\n"
            " * DICCIONARIO DE SINÓNIMOS JURÍDICOS (v7.25, Prompt 020)\n"
            " * Compilado automáticamente desde sinonimos.json. NO editar a mano.\n"
            " */\n\n"
            f"const VAULT_SINONIMOS = {sinonimos_json};\n\n"
            "if (typeof module !== 'undefined' && module.exports) module.exports = VAULT_SINONIMOS;\n"
            "if (typeof window !== 'undefined') window.VAULT_SINONIMOS = VAULT_SINONIMOS;\n"
            "if (typeof globalThis !== 'undefined') globalThis.VAULT_SINONIMOS = VAULT_SINONIMOS;\n"
        )
        with open(SINONIMOS_JS_PATH, "w", encoding="utf-8", newline="\n") as f:
            f.write(sinonimos_js)
        print(f"  -> {SINONIMOS_JS_PATH} ({len(sinonimos_data)} grupos)")

    print(f"[build_vault_index] Archivos generados exitosamente:")
    print(f"  -> {OUT_JSON_PATH}")
    print(f"  -> {OUT_JS_PATH}")


if __name__ == "__main__":
    build_vault_index()

