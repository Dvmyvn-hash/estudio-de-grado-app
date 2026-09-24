---
name: Nuevo apunte en fuentes
description: Incorporar un apunte nuevo en fuentes/ con auto-descubrimiento, auto-seccionado y auto-ubicación en el temario canónico
---

# Nuevo apunte en `fuentes/`

Usa este skill al depositar un `.md` nuevo (Sucesiones, Familia, Conciliación,
Sumario, Ejecutivo, etc.).

## Workflow

1. Deposita el archivo en `fuentes/` (nada más es obligatorio).
2. El motor lo auto-descubre (`discover_fuentes_files()`): ignora `README.md`,
   ocultos (`.*`), temporales (`~*`) y archivos de menos de 50 caracteres.
3. La materia se infiere por keywords (`infer_file_config()`); la posición en
   el temario por scoring dogmático (`infer_temario_position()`), que asigna
   capítulo y categoría canónica si el archivo no declara `Capítulo N`.
4. **Si los capítulos del archivo colisionarían** con el canon de su materia
   (tupla `subject-chapter-code`), regístralo fijo en `FILES_CONFIG` con
   capítulos propios (precedente v7.13/v7.14:
   `DERECHO_PROCESAL_LA_PRUEBA.md` cap 3-5,
   `PROCEMAYORCUANTIA-pulido.md` cap 6-13).
5. Regenera: `python generate_clean_notes_data.py`.
6. Verifica: el apunte quedó en su bloque dogmático (ej. Sucesiones = cap 9,
   `Derecho de Sucesiones`, después de Contratos), sin duplicar `indexCode`
   ni romper IDs existentes.
7. Corre `node test_deduplication_flow.cjs` (incluye auto-posicionamiento de
   `SUCESIONES.md`) y actualiza `CONTEXT.md` (2.5, 3.1, 8, 9).

## Notas

- El `git push` dispara la CI (`.github/workflows/deploy-pages.yml`), que
  regenera `all_afg_topics.json` y `js/data.js` antes de publicar en Pages.
- Nunca edites `all_afg_topics.json` ni `js/data.js` a mano: son generados.
