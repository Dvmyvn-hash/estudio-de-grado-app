---
name: Diagnóstico de página desactualizada
description: Diagnosticar página desactualizada o índice desordenado distinguiendo servidor local vs sitio desplegado, caché de navegador y localStorage
---

# Diagnóstico de página desactualizada

Usa este skill cuando "en la página se sigue viendo desordenado/viejo" aunque
el código local esté correcto.

## Orden de descarte (de más a menos probable)

1. **Desplegado vs local.** ¿Qué URL se está mirando? Los cambios locales
   (`git status`) NO llegan a GitHub Pages hasta `commit + push` + 2-3 min de
   CI (que regenera datos con `generate_clean_notes_data.py`). Sin push, el
   incógnito seguirá mostrando lo viejo.
2. **Caché del navegador.** `js/data.js` se cachea: verificar con Ctrl+F5 o
   incógnito DESPUÉS del deploy, nunca antes.
3. **Datos del servidor local.** `GET /api/sync-topics` re-ejecuta el parser
   en vivo: comprobar rangos Procesal (`2.40-2.41` Réplica →
   `2.42-2.45` Teoría → `2.50-2.55` Medios → `2.56-2.59` Sentencia).
4. **Orden visual del sidebar.** Simular `renderSidebar`: agrupar por
   `chapterTitle` y ordenar bloques por min `indexCode`. Si algún bloque sale
   antes de tiempo, el bug está en el sort de `js/app.js`, no en los datos.
5. **`localStorage` heredado.** `StorageService.getData()` auto-sana la caché
   adoptando los campos canónicos de `INITIAL_DATA` y preservando solo
   `mastered`; no requiere borrado manual. Si persiste, revisar que
   `INITIAL_DATA.topics` regenerado tenga los `indexCode` nuevos.

## Cierre

- Si el defecto era deploy/caché: no tocar código, solo publicar y reverificar.
- Si era datos: skill `temario-orden`. Si era render: corregir el sort y
  agregar/ajustar el test del sidebar en `test_deduplication_flow.cjs`.
