# -*- coding: utf-8 -*-
"""
Estructura de Exámenes Modelo -> Gramática de Preguntas (v7.17)
================================================================
Escanea MODELOS_DE_PRUEBA/*.md|*.txt (ignora README.md y _estructura_extraida.md),
extrae SOLO patrones ESTRUCTURALES de las preguntas de exámenes reales y genera,
de forma DETERMINISTA e IDEMPOTENTE, los archivos committeados:

  - js/exam-structure-grammar.js        -> objeto EXAM_STRUCTURE_GRAMMAR
  - MODELOS_DE_PRUEBA/_estructura_extraida.md -> resumen de la gramática observada

Guardrail anti-contaminación: el CONTENIDO de los modelos jamas se vierte en las
preguntas del QuestionDeveloper ni en sus sourceCitations; solo se observan las
formas (combinacion I-IV, opciones A-E, presencia de requisitos/plazos/etc.).

Uso:  python extract_estructura_pruebas.py
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELOS_DIR = os.path.join(BASE_DIR, "MODELOS_DE_PRUEBA")
OUT_JS_PATH = os.path.join(BASE_DIR, "js", "exam-structure-grammar.js")
OUT_RESUMEN_PATH = os.path.join(MODELOS_DIR, "_estructura_extraida.md")

IGNORED_FILES = {"README.md", "_estructura_extraida.md"}
EXTENSIONS = (".md", ".txt")
MAX_BYTES = 64 * 1024  # 64 KB max por archivo modelo

GRAMMAR_DEFAULTS = {
    "combinationFormat": True,
    "optionsPerQuestion": 5,
    "statementCount": 4,
    "maxCombinacionOptionChars": 120,
    "maxDefinicionOptionChars": 160,
    "maxEnunciadoChars": 420,
    "questionKinds": ["requisitos", "caracteristicas", "elementos", "plazo", "definicion"],
}

RE_ROMAN_STATEMENT = re.compile(r"^[IVX]+\.\s", re.MULTILINE)
RE_COMBINACION_OPTION = re.compile(
    r"^[a-e]\)\s*(?:Solo\s+)?[IVX]+(?:\s*(?:y|,)\s*[IVX]+)*\s*$", re.MULTILINE
)
RE_PLAZO = re.compile(r"\bplazo\b", re.IGNORECASE)  # marcador estructural de plazos
RE_PLAZO_NUM = re.compile(r"\b\d{1,3}\s*d[ií]as?\b", re.IGNORECASE)
RE_DEFINICION = re.compile(
    r"(?:se define|consiste en|es el|es la|son los|son las|se entiende por)\b.{0,150}?\.",
    re.IGNORECASE,
)
RE_CASO_PRACTICO = re.compile(
    r"\b(?:caso\s+pr[áa]ctico|pregunta\s+de\s+caso|supuesto\s+pr[áa]ctico|situaci[óo]n\s+pr[áa]ctica|hip[óo]tesis\s+f[áa]ctica)\b",
    re.IGNORECASE,
)


def analyze_text(text):
    """Detecta SOLO patrones estructurales en el texto de un examen modelo."""
    lower = text.lower()
    return {
        "hasRomanStatements": bool(RE_ROMAN_STATEMENT.search(text)),
        "hasCombinationOptions": bool(RE_COMBINACION_OPTION.search(text)),
        "hasRequisitos": "requisito" in lower,
        "hasCaracteristicas": ("caracter" in lower) and ("caracteristicas" in lower or "característica" in lower),
        "hasElementos": "elemento" in lower,
        "hasPlazos": bool(RE_PLAZO.search(text)) and bool(RE_PLAZO_NUM.search(text)),
        "hasDefiniciones": bool(RE_DEFINICION.search(text)),
        "hasCasoPractico": bool(RE_CASO_PRACTICO.search(text)),
    }


def collect_model_files():
    if not os.path.isdir(MODELOS_DIR):
        return []
    files = []
    for name in os.listdir(MODELOS_DIR):
        if name in IGNORED_FILES:
            continue
        if not name.lower().endswith(EXTENSIONS):
            continue
        path = os.path.join(MODELOS_DIR, name)
        size = os.path.getsize(path)
        if size > MAX_BYTES:
            continue
        files.append(name)
    return sorted(files)  # orden canonico -> determinismo


def build_grammar(files):
    struct = {
        "hasRomanStatements": False,
        "hasCombinationOptions": False,
        "hasRequisitos": False,
        "hasCaracteristicas": False,
        "hasElementos": False,
        "hasPlazos": False,
        "hasDefiniciones": False,
        "hasCasoPractico": False,
    }
    for name in files:
        path = os.path.join(MODELOS_DIR, name)
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        feats = analyze_text(text)
        for key in struct:
            if feats.get(key):
                struct[key] = True

    grammar = dict(GRAMMAR_DEFAULTS)
    grammar["version"] = "1.0.0"
    grammar["generatedFrom"] = files
    grammar["structPatterns"] = struct
    return grammar


def render_js(grammar):
    body = json.dumps(grammar, ensure_ascii=False, indent=2)
    return (
        "/**\n"
        " * GRAMÁTICA ESTRUCTURAL DE PREGUNTAS DE EXÁMENES REALES (v7.17)\n"
        " * Generado automaticamente por extract_estructura_pruebas.py desde\n"
        " * MODELOS_DE_PRUEBA/ (determinista e idempotente). NO editar a mano.\n"
        " * SOLO estructura: formato de combinacion I-IV, opciones A-E, tipos de\n"
        " * pregunta presentes. El CONTENIDO de los modelos nunca se vierte aqui.\n"
        " */\n"
        "\n"
        "const EXAM_STRUCTURE_GRAMMAR = " + body + ";\n"
        "\n"
        "if (typeof module !== \"undefined\" && module.exports) module.exports = EXAM_STRUCTURE_GRAMMAR;\n"
        "if (typeof window !== \"undefined\") window.EXAM_STRUCTURE_GRAMMAR = EXAM_STRUCTURE_GRAMMAR;\n"
        "if (typeof globalThis !== \"undefined\") globalThis.EXAM_STRUCTURE_GRAMMAR = EXAM_STRUCTURE_GRAMMAR;\n"
    )


def render_resumen(grammar, files):
    lines = [
        "# Estructura Extraída de Exámenes Modelo (v7.17)",
        "",
        "> Documento **generado** por `extract_estructura_pruebas.py` (determinista e",
        "> idempotente). Resume la gramática estructural observada en `MODELOS_DE_PRUEBA/`.",
        "> Solo estructura; nunca contenido.",
        "",
        "## Modelos analizados",
        "",
    ]
    if files:
        for name in files:
            lines.append(f"- `{name}`")
    else:
        lines.append("- _(ninguno depositado todavía)_")
    lines += [
        "",
        "## Gramática establecida",
        "",
        f"- Formato de combinación I–IV: **{'SÍ' if grammar['structPatterns']['hasRomanStatements'] else 'NO observado'}**",
        f"- Opciones de combinación «a) …, b) …»: **{'SÍ' if grammar['structPatterns']['hasCombinationOptions'] else 'NO observado'}**",
        f"- Preguntas de requisitos: **{'SÍ' if grammar['structPatterns']['hasRequisitos'] else 'NO observado'}**",
        f"- Preguntas de características: **{'SÍ' if grammar['structPatterns']['hasCaracteristicas'] else 'NO observado'}**",
        f"- Preguntas de elementos del concepto: **{'SÍ' if grammar['structPatterns']['hasElementos'] else 'NO observado'}**",
        f"- Preguntas de plazos: **{'SÍ' if grammar['structPatterns']['hasPlazos'] else 'NO observado'}**",
        f"- Preguntas de definición: **{'SÍ' if grammar['structPatterns']['hasDefiniciones'] else 'NO observado'}**",
        f"- Preguntas de caso práctico (reservado, se atiende aparte): **{'SÍ' if grammar['structPatterns']['hasCasoPractico'] else 'NO observado'}**",
        "",
        f"- Opciones por pregunta: **{grammar['optionsPerQuestion']} (A–E)**",
        f"- Proposiciones por enunciado de combinación: **{grammar['statementCount']} (I–IV)**",
        f"- Tope de opción en combinación: **{grammar['maxCombinacionOptionChars']} chars**",
        f"- Tope de opción en definición: **{grammar['maxDefinicionOptionChars']} chars**",
        f"- Tope de enunciado: **{grammar['maxEnunciadoChars']} chars**",
        "",
        "## Reglas de generación derivadas",
        "",
        "- 3 proposiciones **verdaderas** ancladas al apunte + 1 **falsa** por mutación simple.",
        "- La alternativa correcta es la única combinación que incluye todas las verdaderas y ninguna falsa.",
        "- Cada distractor incluye la proposición falsa u omite al menos una verdadera.",
        "- Los plazos se preguntan como **número simple** («¿de cuántos días/años es el plazo?»), no como cómputo.",
        "- Las preguntas generadas son **solo dogmáticas**; los casos se atienden aparte.",
    ]
    return "\n".join(lines) + "\n"


def main():
    files = collect_model_files()
    grammar = build_grammar(files)

    os.makedirs(os.path.dirname(OUT_JS_PATH), exist_ok=True)
    with open(OUT_JS_PATH, "w", encoding="utf-8") as fh:
        fh.write(render_js(grammar))

    with open(OUT_RESUMEN_PATH, "w", encoding="utf-8") as fh:
        fh.write(render_resumen(grammar, files))

    print(f"[extract_estructura_pruebas] {len(files)} modelo(s) analizado(s)")
    print(f"  -> {OUT_JS_PATH}")
    print(f"  -> {OUT_RESUMEN_PATH}")


if __name__ == "__main__":
    main()