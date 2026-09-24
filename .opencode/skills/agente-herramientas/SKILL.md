---
name: Herramientas deterministas del agente
description: Interfaz de herramientas del Vault para agentes (searchVault, assertCitationIntegrity, vinculación): recuperar y validar antes de afirmar, jamás responder de memoria
---

# Herramientas deterministas del agente

Usa este skill cuando conectes cualquier agente (los módulos JS actuales o un
LLM futuro) a la base de conocimiento. La regla madre: **todo lo que el
agente afirme debe venir de una herramienta, nunca de memoria.**

## Las tres herramientas (ya implementadas, úsalas, no las dupliques)

1. **Recuperar — `searchVault(query, {subject, limit})`** (`js/vault-search.js`):
   única vía legítima de consulta. Retorna cédulas con `id`, `indexCode`,
   `sourceFile`, `score` y `snippet` verbatim. Sin resultados → el agente
   declara "sin cobertura", jamás inventa.
2. **Validar — `assertCitationIntegrity(case)`** (`js/case-generator-agent.js`):
   gate obligatorio post-generación. Rechaza cualquier cita inexistente en el
   corpus (`DYNAMIC_CORPUS` + índice). Ninguna respuesta sale sin pasarla.
3. **Vincular — `getLinkedApuntesForArchetype()` / `resolveLinkedFuente()`**:
   resuelven referencias a cédulas reales (con fallback por clave secundaria)
   y derivan `rules` del contenido vía `extractCitations()`. Contexto previo
   con `populateApuntesIndex()` (tope 4.000 chars por cédula).

## Contrato para el agente consumidor

- Cada afirmación fáctica cita `id` + `indexCode`; cada snippet es substring
  verbatim del `content` (verificable por test, como la Sección 28/29).
- `consultar_jurisprudencia` / `buscar_materia_troncal` (los nombres que pide
  el plan) se implementan como envoltorios finos sobre `searchVault` con
  `subject` prefijado, NO como servicios nuevos.
- Prohibido: responder de memoria, parafrasear citas normativas, agregar
  endpoints de escritura (`POST /add` revive el incidente v7.8).

## Si algún día hay LLM runtime

- Solo en backend (nunca en Pages estático), solo extractivo primero, con
  `assertCitationIntegrity` como gate post-llamada y sin keys en el repo.
  Esa decisión requiere prompt propio (ver Opción B); no improvisarla aquí.
