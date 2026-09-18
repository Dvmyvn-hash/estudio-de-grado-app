import os, re

apuntes_dir = os.path.join(os.path.expanduser("~"), "Desktop", "Fuentes_Grado", "APUNTES")
files = {}
for fname in sorted(os.listdir(apuntes_dir)):
    p = os.path.join(apuntes_dir, fname)
    if os.path.isfile(p) and fname.endswith(".md"):
        files[fname] = open(p, encoding="utf-8", errors="ignore").read()

queries = {
    "Sucesión Intestada (6.2)": ["ordenes de sucesion", "representacion sucesoria", "derecho de representacion", "orden sucesorio", "sucesion intestada", "abintestato"],
    "Sucesión Testada (6.3)": ["testamento", "solemne", "abierto", "cerrado", "desheredamiento", "revocacion del testamento"],
    "Asignaciones Forzosas (6.4)": ["asignaciones forzosas", "legitima", "legitimarios", "cuarta de mejoras", "acervos imaginarios"],
    "Familia - Matrimonio (7.1)": ["matrimonio", "acuerdo de union civil", "separacion judicial", "divorcio", "efectos personales"],
    "Familia - Regimenes (7.2)": ["sociedad conyugal", "haber absoluto", "haber relativo", "separacion de bienes", "participacion en los gananciales"],
    "Familia - Filiacion (7.3)": ["filiacion", "reclamacion", "impugnacion", "alimentos", "cuidado personal", "relacion directa"],
    "Procesal Penal - Disposiciones (5.2)": ["sujetos procesales", "medidas cautelares personales", "prision preventiva", "imputado"],
    "Procesal Penal - Procedimientos (5.3)": ["procedimiento simplificado", "procedimiento abreviado", "juicio oral en lo penal"],
    "Procesal Penal - Investigacion (5.4)": ["formalizacion de la investigacion", "etapa de investigacion", "salidas alternativas", "suspension condicional"],
    "Procesal Penal - Preparacion (5.5)": ["audiencia de preparacion", "auto de apertura", "exclusion de prueba"],
    "Procesal Penal - Juicio Oral (5.6)": ["tribunal de juicio oral en lo penal", "top", "estandar de duda razonable", "inmediacion"],
    "Procesal Penal - Recursos (5.7)": ["recurso de nulidad penal", "causales del recurso de nulidad"]
}

for q_name, kw_list in queries.items():
    print(f"\n==================== {q_name} ====================")
    found_any = False
    for fname, content in files.items():
        matched_sections = []
        for kw in kw_list:
            matches = [m.start() for m in re.finditer(re.escape(kw), content, re.IGNORECASE)]
            if matches:
                found_any = True
                print(f"  [Match in {fname}] keyword '{kw}': {len(matches)} times")
                # Show first match snippet
                pos = matches[0]
                snippet = content[max(0, pos-100):min(len(content), pos+300)].replace("\n", " ")
                print(f"     Snippet: ...{snippet}...")
    if not found_any:
        print("  --> No direct keyword matches in these files.")
