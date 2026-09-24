# PROMPT 021 — Q&A Extractivo: Pregunta → Citas Verbatim (sin generación)

> **Versión:** v1.0 · **Fecha:** 2026-09-24 · **Autor:** puente (dpint) + orquestador
> **Estado:** 📝 Por ejecutar (ejecución: Antigravity) · **Depende de:** 017 y 020 VERDES (Fase 0 de conformancia primero)

---

## ROL

Actúa como ingeniero de software senior experto en el repositorio `estudio-de-grado-app` (GRADOMANIACOS), un workbench de estudio para el Examen de Grado en Derecho (civil, procesal y constitucional). Implementa de forma completa lo siguiente respetando estrictamente las reglas, convenciones, seguridad y nomenclatura del repositorio.

## MISIÓN

Agregar el modo **Pregunta → Respuesta extractiva**: el usuario escribe una pregunta en lenguaje natural y recibe una respuesta **compuesta (no redactada)** con citas verbatim (`§ indexCode` + `sourceFile` + snippet literal) y enlaces que saltan a cada cédula resaltando el fragmento. Sin match → mensaje honesto de "sin cobertura" (nunca inventa). Cero generación de texto, cero backend, cero dependencias.

## REGLAS OBLIGATORIAS DEL REPOSITORIO

1. **`CONTEXT.md` es la única fuente canónica de verdad:** actualizarlo al terminar (IDs del DOM, Sección 8 mapa de archivos y Bitácora de Versiones Sección 9 → próxima versión `v7.27`).
2. Ejecutar y dejar al 100 % PASS: `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs`; ampliar las suites con pruebas de la nueva funcionalidad.
3. Stack vanilla (Python `http.server`/`sqlite3`, JS ES6 sin bundlers); no añadir dependencias sin justificación.
4. Sanitización XSS en el origen (`SecurityShield.escapeHtml`/`textContent`), PIN admin SHA-256, anti path-traversal y límites de payload en `server.py`.
5. No romper contratos existentes (`INITIAL_DATA`, `StorageService`, `LicenseService`, `AuthService`, `CaseGeneratorAgent`, `licenses` en `auth-license.js`).

## CONTEXTO/DESCRIPCIÓN DE LA IDEA ORIGINAL

> Orquestador (Opción B aprobada por el humano): para un examen de grado, una respuesta generada errónea es peor que ninguna. Este prompt implementa el Q&A extractivo sobre el Vault 017/020: reutiliza `searchVault()` para recuperar, compone la respuesta solo con material verbatim validado y deriva huecos de cobertura al roadmap de apuntes. Lo generativo con LLM queda explícitamente fuera de alcance.

## ESTADO ACTUAL RELEVANTE (verificar en Fase 0, no asumir)

| Archivo | Lo que se reutiliza sin modificar |
|---------|-----------------------------------|
| `js/vault-search.js` | `searchVault()`, `normalizeText()`, expansión ×0.8, filtros sin reordenar |
| `js/app.js` | `App.openTopic(id)`, orden sidebar v7.19.1, UI del Vault (`#vault-search-*`) |
| `js/case-generator-agent.js` | Filosofía `assertCitationIntegrity()` como gate |
| `sinonimos.json` | 33 grupos de recall |

## CAMBIOS A IMPLEMENTAR

### FASE 0 — Conformancia con 017/020 implementados (obligatoria primero)

1. Verifica ambos verdes (DoD + suites). Si algo está a medias, DETENTE e informa.
2. Levanta del código real: firma de `searchVault()`, esquema de sus resultados (`snippet` con/sin `<mark>`), firma de `App.openTopic()` y IDs del DOM del Vault ya creados.
3. Tabla delta asumido-vs-real en el reporte y `CONTEXT.md`; adapta A→B→C a lo real.

### PARTE A — `js/qa-composer.js` (nuevo, puro, sin estado)

`composeAnswer(query, {mode})` con modos `definicion` (mejor snippet), `panorama` (top-k agrupados por materia) y `comparativa` (dos instituciones: usa las 2 cédulas top de distinto `subject` o bloque, etiquetadas "A" y "B" sin redactar contraste propio):

- Cada bloque de respuesta = `{cita: {id, indexCode, sourceFile}, snippet}` + enlace; encabezado fijo *"Esto dicen tus apuntes:"* + disclaimer *"Respuesta extractiva, no es asesoría jurídica"*.
- Sin resultados → `{empty: true}` y la UI muestra *"Tus apuntes no cubren esto aún"* + sugerencia de materia según `TEMARIO_CANONICO` más cercano por keywords.
- Determinista: misma query → misma respuesta (sin `Math.random` ni `Date.now` en el camino).
- Composición total < 100 ms tras la búsqueda (medido en tests).

### PARTE B — UI + resaltado en destino (`index.html` + `js/app.js`, solo vista `topics`)

- Caja `#qa-ask-input` + `#qa-ask-button` + panel `#qa-answer` junto a la búsqueda del Vault (reutiliza sus estilos; no duplica CSS si existe equivalente).
- Extiende `App.openTopic(id, {highlight})`: al abrir la cédula hace scroll al primer match del snippet y lo envuelve en `<mark class="vault-highlight">` sanitizado. Sin `highlight`, comportamiento actual intacto (no-regresión).
- Debounce y estados (escribiendo/vacío/error) iguales al Vault.

### PARTE C — Ranking de huecos (local, opt-in, nunca sincronizado)

- Queries con `empty: true` se guardan en `localStorage` bajo key propia (máx. 30, con botón limpiar y toggle de activación, default ON por ser solo-local).
- Panel mínimo que rankea términos sin cobertura → alimenta "qué apunte subir" (cierra el loop con el skill `nuevo-apunte`). Cero red, cero exportación con el avance.

### PARTE D — SEGURIDAD Y GUARDRAILS

- Toda query y snippet pasan por `SecurityShield.escapeHtml`; el `<mark>` se aplica post-escape sobre offsets (precedente 017/020).
- Gate de salida: cada `cita.id` debe resolver en el índice vivo; si alguna no resuelve, la respuesta completa se degrada a estado vacío (falla cerrada, no parcial).
- Prohibido redactar conclusiones, conectar LLM o agregar endpoints.

### PARTE E — PRUEBAS Y CONTEXT.md (OBLIGATORIO)

- Aserciones: "emplazamiento" compone definición con top-1 cap 10; comparativa enfrenta 2 bloques distintos sin texto propio; query inexistente → `empty` + sugerencia de materia; highlight lleva al snippet en el visor; huecos rankean y limpian; determinismo doble corrida; composición < 100 ms; no-regresión sidebar v7.19.1 y UI Vault.
- Suites 4/4 al 100% + `CONTEXT.md` (Sección 8: `js/qa-composer.js`, `#qa-*`, huecos; bitácora v7.27).

## DEFINITION OF DONE

- [ ] FASE 0: 017/020 verdes + tabla delta escrita antes de programar
- [ ] Tres modos componen solo material verbatim validado, deterministas y < 100 ms
- [ ] Enlaces saltan y resaltan el snippet en destino; sin highlight todo igual que antes
- [ ] Sin cobertura → mensaje honesto + sugerencia de materia + ranking de huecos local
- [ ] Gate de salida falla cerrado ante cita irresoluble; cero texto generado
- [ ] Suites 4/4 al 100% + `CONTEXT.md` actualizado + commit convencional

## NOTAS PARA EL EJECUTOR

- Si el 020 cambió firmas, adapta y deja constancia; no re-implementes su scoring ni su UI.
- Rollback = borrar `js/qa-composer.js`, el bloque UI, el resaltado (restaurar `openTopic` original) y los huecos: Vault 017/020 intacto.
