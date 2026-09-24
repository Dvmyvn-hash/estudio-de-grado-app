---
name: Temario canónico y orden del índice
description: Ordenar o corregir el índice de cédulas según el temario canónico del Examen de Grado (TEMARIO_CANONICO, assign_index_codes, sidebar por min indexCode)
---

# Orden del índice según temario canónico

Usa este skill cuando el índice se vea desordenado o haya que mover bloques
(Discusión, Prueba, Sentencia, materias nuevas) en `estudio-de-grado-app`.

## Regla de oro

El orden visual lo manda `TEMARIO_CANONICO` en
`generate_clean_notes_data.py`, no el número de capítulo ni el orden de los
archivos. El sidebar debe ordenar bloques por **min `indexCode`**, jamás por
`chapterNumber` numérico (eso mostraba La Prueba cap 3-5 antes que
Discusión cap 6-12).

## Orden oficial Procesal (temario AIME)

1. Orgánico (cap 1) → Normas Comunes (cap 2)
2. Discusión (cap 6-12): Medidas Prejudiciales → Demanda → Control de
   Admisibilidad → Retiro/Desistimiento/Modificación → Emplazamiento →
   Actitudes del Demandado → Réplica y Dúplica
3. Conciliación 3.3 (slot reservado `cap 18`, sin cédulas aún)
4. Prueba (cap 3-5): Teoría General → Etapa Probatoria → Medios (Art. 341 CPC)
5. Sentencia (cap 13, DESPUÉS de la Prueba) → Ejecutivo → Recursos → Especiales

## Workflow

1. Edita solo `TEMARIO_CANONICO[procesal|civil|constitucional]` en
   `generate_clean_notes_data.py` (cada entrada es
   `(orden, chapterNumber, keywords[], display_name)`).
2. Para etapas futuras sin apuntes, reserva slot con `chapterNumber` libre
   (ej. Conciliación = `(10, 18, [...], ...)`) para que el auto-posicionamiento
   las ubique solas al llegar.
3. Regenera: `python generate_clean_notes_data.py`.
4. Verifica rangos Procesal: `2.10-2.41` cap 6-12, `2.42-2.55` cap 3-5,
   `2.56-2.59` cap 13; Civil `1.1-1.34`; Constitucional `3.1-3.10`.
5. Verifica el orden visual simulando `renderSidebar` (agrupar por
   `chapterTitle`, ordenar bloques por min `indexCode`).
6. Corre `node test_deduplication_flow.cjs` (11/11).
7. Actualiza `CONTEXT.md` (Secciones 2.5, 3.1, 8 y bitácora 9).

## Prohibido

- Reordenar el sidebar por `chapterNumber`.
- Cambiar `id`, `code` o `chapterNumber` existentes (el progreso
  `masteredTopicIds` y los casos usan `id`).
- Crear cédulas para etapas sin apunte: solo se reserva el slot.
