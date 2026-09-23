# PROMPT 016 — Temario Canónico: Ordenamiento Automático del Índice según Examen de Grado

> **Versión:** v1.0 · **Fecha:** 2026-09-23 · **Autor:** puente (dpint)
> **Estado:** ✅ Implementado (v7.19) · **Depende de:** 008, 007

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Implementar un **sistema de ordenamiento por temario canónico** que sea la única fuente de verdad para el orden del índice de cédulas en el sidebar. El sistema debe:
1. Definir declarativamente el orden oficial del examen de grado (Civil, Procesal, Constitucional)
2. Auto-ubicar cualquier archivo nuevo subido a `fuentes/` en su posición correcta según contenido
3. Resolver el problema actual: Procesal Mayor Cuantía (cap 6-13) ANTES que La Prueba (cap 3-5)
4. Ser extensible para futuras materias (Sucesiones, Familia, Ejecutivo, etc.) sin tocar código

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 2.5 tabla indexCode, Sección 3.1 auto-ordenamiento, Sección 9 bitácora v7.19).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> "necesito un prompt por fases para poder estructurar el indice, resulta que subi el apunte de prueba y luego el de procemayorcuantia y por temario primero va el de mayorcuantia y luego el de la prueba, por lo que quiero que el orden del indice se ajuste al temario del examen de grado dentro del proyecto, solamente para el orden del cual esta en el indice, nada mas que eso"
>
> "y pq el prompt no está en la carpeta designada para ello?, incorporalo ahi para que lo desarrollemos fase por fase"
>
> "recuerda que necesito que el orden sea en base al temario del examen de grado, me gustaria en un futuro poder subir el apunte y que se ordene solo en base al temario,ejemplo si subo uno de sucesorio y luego uno de familia o contratos, se identifique solo en base al orden del temario"

**Intención:** El usuario subió `DERECHO_PROCESAL_LA_PRUEBA.md` (capítulos 3-5) y `PROCEMAYORCUANTIA-pulido.md` (capítulos 6-13). El orden actual en `indexCode` pone La Prueba (2.10-2.23) antes que Mayor Cuantía (2.24-2.59) porque `assign_index_codes()` ordena por `chapterNumber` ascendente. Pero el temario oficial del examen de grado exige: Parte General → **Mayor Cuantía** → **La Prueba** → Otros. Además, quiere que **cualquier apunte futuro** (Sucesiones, Familia, Arrendamiento, etc.) se auto-ordene correctamente al depositarlo en `fuentes/`.

## ESTADO ACTUAL RELEVANTE

| Archivo | Función/Sección | Estado |
|---------|-----------------|--------|
| `generate_clean_notes_data.py` | `FILES_CONFIG` (líneas 16-177) | 7 archivos canónicos registrados |
| `generate_clean_notes_data.py` | `assign_index_codes()` (líneas 784-828) | Ordena por `chapterNumber` asc → **BUG actual** |
| `generate_clean_notes_data.py` | `extract_sections_from_auto_discovered_file()` (333-541) | Auto-secciona archivos nuevos |
| `generate_clean_notes_data.py` | `infer_file_config()` (241-315) | Infiere materia por keywords |
| `all_afg_topics.json` | 103 tópicos totales | `indexCode` 1.1-1.34 (Civil), 2.1-2.59 (Procesal), 3.1-3.10 (Const.) |
| `js/data.js` | `INITIAL_DATA.topics` | Espejo de `all_afg_topics.json` |
| `index.html` | Sidebar `#topics-tree-container` | Renderiza ordenado por `indexCode` |

**Procesal actual (orden `indexCode`):**
- 2.1-2.9 → Capítulos 1-2 (Orgánico + Normas Comunes) ✓
- 2.10-2.23 → Capítulos 3-5 (La Prueba) **← DEBE IR DESPUÉS**
- 2.24-2.59 → Capítulos 6-13 (Mayor Cuantía) **← DEBE IR ANTES**

## CAMBIOS A IMPLEMENTAR

### PARTE A — `generate_clean_notes_data.py`: Configuración Temario Canónico

**A.1. Agregar constante `TEMARIO_CANONICO` después de `FILES_CONFIG` (línea ~177)**

Estructura: `{subject: [(orden, chapterNumber, keywords[], display_name), ...]}`
- `orden`: prioridad global (1 = primero en temario)
- `chapterNumber`: número de capítulo en archivo fuente
- `keywords`: para auto-detectar categoría en archivos auto-descubiertos
- `display_name`: nombre legible para logs

Incluir órdenes para:
- **Civil (1-9):** Acto Jurídico → Bienes → Obligaciones → Incumplimiento → Contratos → RCE → Sucesiones → Familia → Garantías
- **Procesal (1-17):** Orgánico → Normas Comunes → **Mayor Cuantía (6-13)** → **La Prueba (3-5)** → Ejecutivo → Cautelares → Recursos → Especiales
- **Constitucional (1-4):** Acciones → Derechos Fundamentales → Órganos → Reforma

**A.2. Agregar mapa rápido `TEMARIO_ORDER_MAP = {(subject, chapterNumber): (orden, category_name)}`**

### PARTE B — `generate_clean_notes_data.py`: Función de Inferencia Temario

**B.1. Nueva función `infer_temario_position(cfg, sections_raw)` (después de `infer_file_config`)**
- Input: config del archivo + secciones crudas extraídas
- Output: `(orden_temario, chapterNumber_sugerido, category_canonica)`
- Lógica: score por keywords en contenido concatenado → mejor match en `TEMARIO_CANONICO[subject]`
- Fallback: `chapterNumber` del archivo si existe en temario

### PARTE C — `generate_clean_notes_data.py`: Inyectar `_temario_order` en Secciones

**C.1. En `extract_sections_from_auto_discovered_file()` (antes de `return final_sections`)**
- Para cada sección: lookup `(subject, chapterNumber)` en `TEMARIO_ORDER_MAP`
- Setear `item["_temario_order"]`, `item["category"]`, `item["chapterTitle"]`
- Si no match: inferir por contenido de la sección individual

**C.2. En `extract_sections_from_file()` (dentro del bucle que crea `sec_obj`, línea ~666)**
- Mismo lookup para archivos canónicos (sobrescribe `categoryMap` si hay conflicto)
- Setear `sec_obj["_temario_order"]`

### PARTE D — `generate_clean_notes_data.py`: Reescribir `assign_index_codes()`

**D.1. Reemplazo COMPLETO de la función (líneas 784-828)**
```python
def sort_key(s):
    temario_orden = s.get("_temario_order", 99)      # 1. Temario canónico (prioridad absoluta)
    chap = s.get("chapterNumber") or 1                # 2. Capítulo dentro del bloque
    c_tuple = parse_code_tuple(s.get("code", ""))     # 3. Código original (1.1, 1.2...)
    orig_idx = s.get("_orig_idx", 0)                  # 4. Tie-breaker
    return (temario_orden, chap, c_tuple, orig_idx)
```
- Limpiar campos temporales: `sec.pop("_temario_order", None)`

### PARTE E — `FILES_CONFIG`: Verificar Coherencia `defaultChapterNum`

| Archivo | `defaultChapterNum` | Debe coincidir con temario |
|---------|---------------------|---------------------------|
| `PROCESAL.md` | 1 | Orden 1-2 (cap 1-2) ✓ |
| `DERECHO_PROCESAL_LA_PRUEBA.md` | 3 | Orden 11-13 (cap 3-5) ✓ |
| `PROCEMAYORCUANTIA-pulido.md` | 6 | Orden 3-10 (cap 6-13) ✓ |
| `LAS OBLIGACIONES.md` | 3 | Orden 3 (cap 3) ✓ |
| `CLASE_9_11.md` | 5 | Orden 5-6 (cap 5-6) ✓ |

### PARTE F — SEGURIDAD

- **Sin breaking changes:** `id`, `code`, `chapterNumber`, `content`, `connections` **no cambian**. Solo `indexCode` y `category/chapterTitle` (display).
- **Progreso de usuario intacto:** `masteredTopicIds` usa `id` (ej. `procesal-procemayor-1-1`) → no afectado.
- **Casos vinculados intactos:** `linkedApuntes` usa `id` → no afectado.
- **Grafo dogmático intacto:** `connections` usa `id` → no afectado.
- **Auto-descubrimiento defensivo:** Archivos sin match en temario → `orden=99` (al final) + warning en consola.

### PARTE G — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

**G.1. Tests de Regresión (ejecutar y pasar 100%):**
```bash
node test_e2e_case_flow.cjs
node test_unlock_auth_flow.cjs
node test_deduplication_flow.cjs
node test_mobile_header_theme.cjs
```

**G.2. Tests de Validación Temario (nuevos, verificar manualmente):**
```bash
# 1. Regenerar
python generate_clean_notes_data.py

# 2. Verificar orden Procesal: Mayor Cuantía ANTES que La Prueba
python -c "
import json
with open('all_afg_topics.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
procesal = [t for t in data if t['subject'] == 'procesal']
for t in procesal:
    print(f\"{t['indexCode']:>5} | orden={t.get('_temario_order','?'):>2} | cap {t['chapterNumber']:>2} | {t['category'][:35]:<35} | {t['title'][:50]}\")
"
# Debe mostrar: 2.1-2.9 (cap 1-2), 2.10-2.45 (cap 6-13 Mayor Cuantía), 2.46-2.59 (cap 3-5 La Prueba)

# 3. Verificar Civil ordenado: Acto Jurídico → Bienes → Obligaciones → Contratos → RCE → ...
python -c "
import json
with open('all_afg_topics.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
civil = [t for t in data if t['subject'] == 'civil']
for t in civil:
    print(f\"{t['indexCode']:>5} | cap {t['chapterNumber']:>2} | {t['category'][:40]:<40} | {t['title'][:50]}\")
"

# 4. Simular archivo nuevo: SUCESIONES.md → debe caer entre Contratos y Familia
cat > fuentes/SUCESIONES.md << 'EOF'
# SUCESIONES POR CAUSA DE MUERTE
## Sección 1.1: Apertura de la Sucesión
La sucesión se abre por la muerte de la persona...
## Sección 1.2: Herencia y Legado
Diferencia entre heredero y legatario...
EOF
python generate_clean_notes_data.py
python -c "
import json
with open('all_afg_topics.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
for t in data:
    if 'sucesion' in t['id'].lower():
        print(f\"{t['indexCode']:>5} | {t['category']} | {t['title']}\")
"
# Debe salir con indexCode ~1.34-1.36 (después de Contratos, antes de Familia)
```

**G.3. Actualizar `CONTEXT.md`:**
- **Sección 2.5:** Reemplazar tabla `indexCode` por descripción temario canónico
- **Sección 3.1:** Agregar párrafo "Auto-Ordenamiento por Temario Canónico (v7.19)"
- **Sección 9 (Bitácora):** Agregar entrada v7.19 con fecha, alcance, archivos

## DEFINITION OF DONE

- [ ] `TEMARIO_CANONICO` definido completamente para Civil, Procesal, Constitucional
- [ ] `infer_temario_position()` implementada y probada
- [ ] `_temario_order` inyectado en ambas funciones de extracción (canónicos + auto-descubiertos)
- [ ] `assign_index_codes()` reescrita con `sort_key` por temario
- [ ] Regeneración exitosa: `python generate_clean_notes_data.py` sin errores
- [ ] Procesal: `indexCode` 2.10-2.45 = Mayor Cuantía, 2.46-2.59 = La Prueba ✓
- [ ] Civil: orden Acto Jurídico → Bienes → Obligaciones → Contratos → RCE → Sucesiones → Familia ✓
- [ ] Archivo nuevo `SUCESIONES.md` auto-ubicado correctamente ✓
- [ ] Tests E2E pasan (4/4 suites) ✓
- [ ] `CONTEXT.md` actualizado (Secciones 2.5, 3.1, 9) ✓
- [ ] Commit con mensaje convencional

## NOTAS PARA EL EJECUTOR

- **Fase por fase:** Implementar PARTES A→B→C→D→E, regenerar y validar en cada paso
- **No tocar `js/app.js` ni `index.html`**: El sidebar ya ordena por `indexCode`; el fix es solo en generación de datos
- **Campo temporal `_temario_order`**: Se usa solo para sort, se limpia al final de `assign_index_codes()`
- **Palabras clave en `TEMARIO_CANONICO`**: Usar términos que aparezcan literalmente en los apuntes (ej. "medidas prejudiciales", "emplazamiento", "sucesiones", "testamento")
- **Orden dentro de mismo `orden_temario`**: Si dos archivos comparten orden (ej. cap 6 y 7 ambos en Mayor Cuantía), `chapterNumber` y `code` desempatan naturalmente
- **Archivos huérfanos**: Si auto-descubierto no matchtea keywords → `orden=99`, warning en consola, va al final de su materia