# PROMPTS/ — Puente entre Ideas ↔ Agente Antigravity IDE

> **Rol de este puente:** el humano (dpint) expresa ideas en bruto; este puente las traduce a **prompts de ingeniería completos**, aterrizados en el código real de `estudio-de-grado-app` (GRADOMANIACOS), listos para pegar en el agente de **Antigravity IDE**.

## Protocolo de trabajo (para el humano)

1. **Cuenta tu idea** tal cual sale de tu cabeza (no hace falta que esté bien redactada).
2. El puente **mapea la idea sobre el código real** del repo (idiomas, IDs del DOM, endpoints, parser, suites de tests).
3. El puente **genera un prompt técnico completo** (ver plantilla `_TEMPLATE.md`) y lo guarda aquí con numeración `NNN_<slug>.md`.
4. **Copia el archivo `NNN_<slug>.md`** en Antigravity IDE como prompt inicial (o apunta a la ruta del archivo) y ejecútalo.
5. Cuando un prompt se ejecute y se revise, se marca en el índice de abajo como `✅ Implementado` (o `🔄 Revisión`).

## Índice de prompts

| # | Archivo | Descripción | Estado |
| :-: | :--- | :--- | :--- |
| 001 | `001_sync_apuntes_admin.md` | Subida de apuntes desde el Panel de Administrador con sincronización inmediata a la Sección de Apuntes e índice temático. | ⚠️ Superseded por 007 (v7.8) — la subida por servidor fue eliminada; `fuentes/` es la base canónica |
| 002 | `002_mejorar_agente_casos_complejidad_pauta.md` | Mejora integral del agente de creación de casos: complejidad lógica e interdisciplinaria, cobertura completa del temario, rúbrica AIME 2026-20 al 100 %, soluciones modelo sin vaguedad, apego estricto a las fuentes implementadas y **nutrición dinámica desde los apuntes cargados** (`/api/sync-topics`, `linkedApuntes`, refresco ≤ 3.5 s). | ✅ Implementado (v7.3) |
| 003 | `003_indice_unificado_sin_duplicados_solo_apuntes.md` | Índice de Apuntes unificado: elimina códigos duplicados (`1.1`, `1.3`…) vía `indexCode` canónico por disciplina (`N.N`) sin tocar `code`/`id`, orden continuo y completo acorde a las secciones reales de los apuntes, y **gatea el índice solo a la vista Apuntes** (oculto/cerrado en Casos y Grafo; `#btn-toggle-sidebar` deshabilitado fuera de Apuntes). | ✅ Implementado (v7.2) |
| 004 | `004_registro_persistente_codigos_acceso_operativo.md` | Registro persistente y operativo de códigos de acceso usados: disco durable en Render, tabla de auditoría `access_code_usages`, restauración del Pase Activo al ingresar desde cualquier plataforma y cliente que prioriza la verdad del servidor sobre el `localStorage`. | ✅ Implementado (v7.4) |
| 005 | `005_header_movil_iconos_eliminar_modo_claro.md` | Header móvil solo-íconos (eliminación de superposición entre logotipo y candado, chip de usuario compacto con solo avatar y logout) y eliminación definitiva del selector de Modo Claro (Dark Academy único e inmutable en `:root`). | ✅ Implementado (v7.5) |
| 006 | `006_diagnostico_port_timeout_render.md` | Diagnóstico e instrumentación en 5 fases del arranque en Render (resolución de 'Port scan timeout' tras 18m), desbufferizado unbuffered total (PYTHONUNBUFFERED=1, python -u server.py), robustecimiento de SQLite contra bloqueos de disco/WAL y gracia en daemon de purga. | ✅ Implementado (v7.6) |
| 008 | `008_indice_automatico_fuentes_auto_seccionado.md` | Índice automático desde `fuentes/`: al soltar un `.md` se auto-descubre (sin editar `FILES_CONFIG`), se secciona solo en cédulas `N.1, N.2…` según módulo/capítulo detectado (o headings `##`, o fallback monolítico), se ordena solo en la página y se publica con `git push` (CI). | ✅ Implementado (v7.9) |
| 009 | `009_agente_ia_nutricion_apuntes_dinamicos.md` | El Agente de IA se nutre en vivo de los apuntes dinámicos (PROMPT 008): corpus semilla + `DYNAMIC_CORPUS` derivado del contenido real (`extractCitations`), `resolveLinkedFuente`/`getLinkedApuntesForArchetype` con resolución por clave secundaria, `assertCitationIntegrity` corpus-driven en 3 capas y `validateGeneratedCase` integrado con el índice vivo. | ✅ Implementado (v7.10) |
| 010 | `010_desarrollador_preguntas_verificacion_cedulas.md` | El Desarrollador de Preguntas del Agente (`QuestionDeveloper`): 4 preguntas de verificación A-E al cierre de cada cédula con **naturaleza detectada** (dogmática por defecto; de caso si hay plazos/aplicación; de procedencia si hay vías adjetivas; de competencia si hay tribunales), citas derivadas del contenido real (cero alucinación) y **cierre automático de la cédula como completada al acertar 4/4**. | ✅ Implementado (v7.11) |
| 011 | `011_sync_avance_cedulas_multidispositivo.md` | Sincronización multi-dispositivo del avance de cédulas: la cédula "completada" en el celular se refleja en el PC. Tabla `user_topic_mastery` + `GET/POST /api/user/topic-mastery` (autenticado, LWW por cédula), client de sincronización con timestamps y reconciliación en `StorageService`, disparadores en `startLiveSync`/`syncWithServer`/`handleMasteryClick`, y **Exportar/Importar manual** como puente en modo estático (GitHub Pages/file:). | ✅ Implementado (v7.12) |

## Reglas transversales para cualquier prompt (las heredan todos)

- `CONTEXT.md` es la única fuente canónica de verdad; todo cambio de código DEBE actualizarlo (Sección 9 → Bitácora de versiones).
- Las suites `node test_unlock_auth_flow.cjs`, `node test_e2e_case_flow.cjs`, `node test_deduplication_flow.cjs` y `node test_mobile_header_theme.cjs` deben quedar al 100 % PASS tras la implementación.
- Stack vanilla: Python `http.server`/`sqlite3` y JavaScript ES6 sin bundlers; no añadir dependencias nuevas sin justificación.
- Sanitización en el origen (`SecurityShield.escapeHtml` / `textContent`), PIN admin vía SHA-256, anti path-traversal y límites de payload en `server.py`.
- Nomenclatura jurídica chilena: materias `civil | procesal | constitucional`, "cédula", "capítulo", "sección N.N".