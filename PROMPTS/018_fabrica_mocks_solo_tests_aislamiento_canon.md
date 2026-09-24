# PROMPT 018 — Fábrica de Mocks Solo-Tests con Aislamiento del Canon (sin inyección al Vault)

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 008, 016, 017

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Crear una **fábrica determinista de mocks exclusivamente para tests**: genera corpus sintéticos por materia troncal (Civil, Procesal, Constitucional) para probar casos borde del pipeline (archivos vacíos, monolíticos, headings raros, colisiones, encoding) y para benchmarkear la búsqueda del Vault (PROMPT 017). Los mocks **jamás tocan `fuentes/`, el canon de 103 cédulas ni el `vault_index.json` comprometido**.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión `v7.23`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Humano (idea de Gemini a evaluar): "Generación de Mocks por Materias Troncales: un script que genere JSON/Markdown de prueba (Civil: Acto Jurídico, Bienes, Obligaciones; Procesal: Reglas Generales, Juicio Ordinario; Constitucional: Bases de la Institucionalidad) y los inyecte automáticamente en el Vault."
>
> **Veredicto del orquestador: la inyección al Vault se RECHAZA, la fábrica de mocks se APRUEBA solo-tests.** Razones: (1) un mock `civil` cap 1 colisiona por tupla natural `(subject, chapterNumber, code)` con el canon real y `deduplicate_sections()` lo mutilaría o lo tragaría (hazard validado en v7.9); (2) el invariante de **103 cédulas exactas** sostiene ~13 aserciones E2E más `APUNTES_INDEX === 103` y `DYNAMIC_CORPUS` limitado a 8 fuentes: inyectar mocks rompe las suites; (3) existe guardrail anti-contaminación (`MODELOS_DE_PRUEBA/` solo aporta estructura, jamás contenido) y el Vault 017 exige snippets verbatim del apunte real: contenido sintético en el índice es alucinación institucionalizada. Lo rescatable es real: el repo ya usa fixtures efímeros (`tempfile` en `test_deduplication_flow.cjs`, `MODULO_NUEVO.md`, `ejemplo_semilla_estructura.md`); este prompt los convierte en fábrica reutilizable + benchmark del Vault.

## ESTADO ACTUAL RELEVANTE

| Archivo | Función/Sección | Estado |
|---------|-----------------|--------|
| `test_deduplication_flow.cjs` | Fixtures inline en `tempfile` (`CONTRATOS.md`, `SUCESIONES.md`) | Patrón a generalizar, no a duplicar |
| `test_e2e_case_flow.cjs` | Invariante 103 (líneas ~732, 1086, 1099), `APUNTES_INDEX`, `DYNAMIC_CORPUS` 8 fuentes | Límite infranqueable |
| `generate_clean_notes_data.py` | `deduplicate_sections()` por tupla natural, prevalece mayor `charCount` | Riesgo de mutilación del canon |
| `.gitignore` | `test_*.cjs` ignorados | Las suites viven en local; la fábrica debe ser importable desde ellas |

## CAMBIOS A IMPLEMENTAR

### PARTE A — `scripts/make_mocks.py` (nuevo, solo-tests, determinista con seed)

Generadores por materia troncal con salidas **conocidas y asertables** (nº secciones, códigos, capítulos):

- `civil`: acto jurídico / bienes / obligaciones (incluye 1 archivo que colisiona a propósito cap 1 `1.1` para probar prevalencia).
- `procesal`: reglas generales / juicio ordinario (incluye headings raros y un monolítico sin `Sección N.N`).
- `constitucional`: bases de la institucionalidad (incluye archivo < 50 chars que debe ser ignorado + archivo con encoding raro).
- `edge`: vacío, solo título, módulos duplicados, `capítulo` gigante (> 64 KB, debe procesarse sin colgar).
- **Todo escribe exclusivamente en el `temp_dir` que recibe por parámetro**; el script aborta si el destino no es temporal o está bajo `fuentes/`, la raíz del canon o `MODELOS_DE_PRUEBA/`.

### PARTE B — Cableado a suites (sin reescribir las existentes)

- Nuevas aserciones que usan la fábrica: colisión deliberada no altera el canon (gana mayor `charCount`, el perdedor se descarta íntegro); archivo < 50 chars ignorado; monolítico → 1 sección `N.1`; benchmark: `searchVault()` **real del 017 si ya está verde, si no la interfaz que el 017 especifica** sobre corpus sintético de 500 docs < 50 ms (valida el presupuesto del PROMPT 017).
- No tocar las aserciones del invariante 103: deben seguir pasando idénticas.

### PARTE C — SEGURIDAD

- Prohibido commitear cualquier salida de la fábrica: si un mock aparece en `fuentes/` o en `vault_index.json`, la suite correspondiente debe fallar (aserción de aislamiento).
- Sin dependencias nuevas; seeded RNG (`random.seed(afg)`) para determinismo total.

### PARTE D — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8: `scripts/make_mocks.py`; bitácora v7.23).

## DEFINITION OF DONE

- [ ] `scripts/make_mocks.py` genera los 4 corpus en temp dir, determinista (2 corridas byte-idénticas)
- [ ] Colisión deliberada no muta el canon; archivo diminuto ignorado; monolítico → `N.1`
- [ ] Benchmark Vault sintético 500 docs < 50 ms por query
- [ ] Aserción de aislamiento: ningún mock en `fuentes/` ni en `vault_index.json`
- [ ] Invariante 103 y suites 4/4 al 100% intactos
- [ ] `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- Si una prueba necesita "inyectar en el Vault", que construya un índice **efímero en memoria** desde el corpus mock, jamás el artefacto comprometido.
- Rollback = borrar `scripts/make_mocks.py` y sus aserciones: el canon no debe enterarse.
