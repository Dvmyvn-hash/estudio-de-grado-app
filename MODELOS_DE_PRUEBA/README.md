# MODELOS_DE_PRUEBA 📚

Carpeta de **modelos de exámenes reales** para que el agente del QuestionDeveloper
aprenda la **estructura** de las preguntas de exámenes de grado (todo el
compilador está definido en `extract_estructura_pruebas.py`).

> ⚠️ **Guardrail anti-contaminación:** de estos archivos **solo se extrae la
> estructura** (formato de combinación I–IV, cantidad de opciones, presencia de
> preguntas de requisitos/características/elementos/plazos/definiciones).
> El **contenido** de los exámenes modelo **jamás** entra a las preguntas
> generadas ni a las `sourceCitations`.

## Cómo depositar exámenes

1. Puede ser de **cualquier rama del derecho** (civil, procesal, constitucional,
   penal, tributario, laboral, etc.).
2. **Un examen por archivo**, en formato `.md` o `.txt` (Markdown o texto plano).
3. Tamaño máximo: **64 KB** por archivo (los archivos más grandes se ignoran).
4. El nombre del archivo debe describir el modelo: p. ej.
   `examen_real_derecho_civil_2024.md`, `modelo_test_procesal.txt`.
5. No hace falta ningún formato especial: el compilador detecta patrones
   estructurales automáticamente.

## Qué hace el compilador

`python extract_estructura_pruebas.py` escanea `MODELOS_DE_PRUEBA/*.md|*.txt`
(ignora este `README.md` y `_estructura_extraida.md`), extrae solo los **patrones
estructurales** y regenera **determinista e idempotente** el archivo
committeado `js/exam-structure-grammar.js` (`EXAM_STRUCTURE_GRAMMAR`), que el
`QuestionDeveloper` consume en runtime para sus parámetros de formato.

El resumen de la estructura observada/establecida se documenta en
[`_estructura_extraida.md`](./_estructura_extraida.md).