# PROMPT 026 — Mejora del Generador: Anclaje Obligatorio + Barrido de Tríos Mixtos

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador (Nexo)
> **Estado:** ✅ Implementado (v7.32, Nexo: gate + barrido 4785 tríos) · **Depende de:** ninguno (respeta 021 en curso: no tocar sus archivos)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Que cada pregunta generada esté **anclada al apunte**: exigir ≥3 bigramas compartidos entre explicación y cédula vinculada (estándar 24.5.1 del `QuestionDeveloper`, hoy ausente en el generador de casos) y elegir `linkedApuntes` por overlap real de contenido. Luego barrer tríos mixtos civil/procesal (2+1) para medir anclaje y registrar el ledger.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 y Bitácora Sección 9 → próxima versión `v7.32`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano: combinadas 2+1 cruzadas que se revisen por tiempo para mejora continua con IA real.
>
> **Hallazgo piloto del orquestador (verificado):** 4 combinadas válidas con citas verdes pero anclaje parcial (2/3, 3/4, 2/3, **1/3** en nulidad+reivindicatoria+cautelares). El generador no exige anclaje textual: una explicación puede citar bien y aun así derivar del vocabulario del apunte. **Decisión:** el valor está en el gate + barrido por cobertura (minutos de CPU, medido: 655 pares en 0.7 s), no en horas de loop. Sin cambios al canon ni al Vault.

## ESTADO ACTUAL RELEVANTE (levantar en Fase 0, no asumir)

| Elemento | Qué mapear |
|----------|------------|
| `synthesizeCase()` + `shuffleQuestionOptions()` | Dónde anclar el gate sin romper determinismo de suites |
| `linkedApuntes` actuales | Criterio vigente de selección (a reemplazar por overlap) |
| `INSTITUTIONS` (37) + `incompatibleWith` | Universo de tríos mixtos 2 civil+1 procesal y viceversa |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Conformancia (obligatoria primero)

Tabla delta asumido-vs-real del generador y sus tests; si el 021/023 siguen en curso, no tocar sus archivos.

### PARTE A — Gate de anclaje en el generador (`js/case-generator-agent.js`)

- Nueva función pura `assertExplanationAnchored(explanation, linkedContents, minBigrams=3)` (normalización ES idéntica a la del Vault: minúsculas, sin tildes, tokens >3 chars).
- `linkedApuntes` se elige por overlap de bigramas con la explicación, no por defecto de arquetipo; si ningún candidato alcanza el umbral, la pregunta se marca `needsReview: true` (visible, no silencioso) en vez de vincular a ciegas.
- Umbral configurable por constante (no magic numbers); determinismo preservado (sin `Math.random` nuevo en el camino de validación).

### PARTE B — Barrido de tríos mixtos + ledger (TEMP + reporte)

- Todos los tríos compatibles con mezcla civil/procesal (2+1 ambos sentidos), respetando la matriz; por trío: `synthesizeCase` → validación + citas + anclaje por pregunta.
- Ledger `{a,b,c, valid, cit_ok, anclaje_x/y}` + top-20 tríos débiles. Solo lectura del repo + TEMP; sin servidor, DB ni puertos.

### PARTE C — SEGURIDAD

- Sin superficie nueva: el gate es cómputo local sobre strings; el barrido no escribe canon ni artefactos comprometidos.

### PARTE D — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Aserciones: explicación sin anclaje → `needsReview`; vínculo por overlap supera al vínculo por defecto en el set piloto (las 4 combinadas del orquestador: anclaje 100% o reporte explícito); determinismo doble corrida; regresión 24.4/24.5 intacta.
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8, bitácora v7.32).

## DEFINITION OF DONE

- [ ] Gate de anclaje con umbral configurable + `needsReview` visible
- [ ] `linkedApuntes` por overlap real en todos los arquetipos
- [ ] Barrido completo de tríos mixtos con ledger y top-20 débiles
- [ ] Piloto del orquestador en verde total (anclaje 4/4 combinadas o needsReview justificado)
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- **Prohibido tocar:** archivos del 021/023 en curso (`js/qa-composer.js`, bloques `#qa-*`, header search); staging con paths explícitos.
- Rollback = revertir el gate (vuelve la vinculación por defecto) + borrar ledger: suites y canon intactos.
