import os
import re
import json

APUNTES_DIR = r"C:\Users\dpint\Desktop\Fuentes_Grado\APUNTES"

FILES_INFO = [
    {
        "file": "ACTO JURIDICO.md",
        "subject": "civil",
        "subjectName": "Derecho Civil",
        "module": "Acto Jurídico",
        "category": "Teoría General del Acto Jurídico",
        "chapterNumber": 1
    },
    {
        "file": "LOS BIENES.md",
        "subject": "civil",
        "subjectName": "Derecho Civil",
        "module": "Bienes y Derechos Reales",
        "category": "Teoría de los Bienes",
        "chapterNumber": 2
    },
    {
        "file": "LAS OBLIGACIONES.md",
        "subject": "civil",
        "subjectName": "Derecho Civil",
        "module": "Obligaciones",
        "category": "Teoría General de las Obligaciones",
        "chapterNumber": 3
    },
    {
        "file": "CLASE_9_11.md",
        "subject": "civil",
        "subjectName": "Derecho Civil",
        "module": "Responsabilidad Extracontractual y Contratos",
        "category": "RCE y Contratos",
        "chapterNumber": 4
    },
    {
        "file": "PROCESAL.md",
        "subject": "procesal",
        "subjectName": "Derecho Procesal",
        "module": "Parte General y Normas Comunes",
        "category": "Orgánico y Normas Comunes",
        "chapterNumber": 1
    },
    {
        "file": "CONSTITUCIONAL.md",
        "subject": "constitucional",
        "subjectName": "Derecho Constitucional",
        "module": "Acciones y Derechos Fundamentales",
        "category": "Teoría de los Derechos y Acciones",
        "chapterNumber": 1
    }
]

def split_file_into_sections(filepath):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()

    lines = text.split("\n")
    section_headers = []

    # Pattern for section heading: starts with # or ** and contains Sección \d+\.\d+
    sec_regex = re.compile(r'^(?:#{1,4}\s*\*{0,2}|\*{2})\s*Secci[oó]n\s*(\d+\.\d+)\s*[:–\-—]\s*(.*?)(?:\*{0,2})$', re.IGNORECASE)

    for idx, line in enumerate(lines):
        m = sec_regex.match(line.strip())
        if m:
            code = m.group(1).strip()
            title = m.group(2).strip().replace("*", "").strip()
            # Skip if part of an index table or dotted line
            if "..." in line or "|" in line:
                continue
            section_headers.append((idx, code, title, line))

    # Filter out table of contents entries that appear in the first 50 lines
    filtered_headers = []
    for idx, code, title, raw in section_headers:
        if idx < 45 and any(h[1] == code for h in section_headers if h[0] >= 45):
            continue
        filtered_headers.append((idx, code, title, raw))

    sections = []
    for i in range(len(filtered_headers)):
        start_idx, code, title, raw = filtered_headers[i]
        end_idx = filtered_headers[i+1][0] if i+1 < len(filtered_headers) else len(lines)
        
        sec_lines = lines[start_idx:end_idx]
        sec_content = "\n".join(sec_lines).strip()
        sections.append({
            "code": f"Sección {code}",
            "rawCode": code,
            "title": f"Sección {code}: {title}",
            "cleanTitle": title,
            "content": sec_content,
            "charCount": len(sec_content),
            "lineCount": len(sec_lines)
        })

    return sections

if __name__ == "__main__":
    total = 0
    for finfo in FILES_INFO:
        p = os.path.join(APUNTES_DIR, finfo["file"])
        secs = split_file_into_sections(p)
        print(f"=== {finfo['file']} ({finfo['module']}) ===")
        print(f"  Total secciones: {len(secs)}")
        total += len(secs)
        for s in secs:
            print(f"    [{s['code']}] {s['cleanTitle'][:55]}... ({s['charCount']} chars)")
    print(f"\nTOTAL SECCIONES EN APUNTES: {total}")
