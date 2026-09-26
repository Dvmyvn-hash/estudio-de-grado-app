# LAYA_HOME — Contrato de Integración y Gobernanza (v1.0 · 2026-09-26)

Instalación compartida de **Laya** (modelo de decisiones local) por máquina, consumida por `estudio-de-grado-app` y futuros módulos del ecosistema.

---

## 1. Ubicación y Estructura

- **Variable de Entorno:** `LAYA_HOME` (por defecto `%USERPROFILE%\.laya`).
- `venvs/laya/`: Entorno virtual dedicado con Python >= 3.10, PyTorch CPU y `laya>=0.3.0`.
- `checkpoints/`: Modelos descargados y gestionados por la biblioteca `laya` (`laya-multilingual` por defecto).
- `logs/router.jsonl`: Bitácora de inferencias, latencias y fallbacks.
- `.installed`: Archivo marker que certifica la instalación correcta del modelo y su venv.

---

## 2. Invariantes Arquitectónicos

1. **Aislamiento de Dependencias:** El repositorio `estudio-de-grado-app` tiene **cero dependencias nuevas** en `requirements.txt` o `package.json`. PyTorch y Laya residen exclusivamente en `LAYA_HOME/venvs/laya`.
2. **Fallback Determinista:** Si Laya no está instalada, el venv no existe, el socket no responde o se excede el timeout:
   - El script `scripts/laya_router.py` finaliza con **código de salida 0** y emite `{"fallback": true, "reason": "..."}`.
   - El backend HTTP responde con el objeto de fallback sin error 500.
   - El cliente frontend aplica inmediatamente el comportamiento determinista base (pills manuales, regex de seguridad).
3. **Timeout Duro (500 ms):** Toda inferencia en tiempo de ejecución debe resolverse en $\le 500\text{ ms}$. Si no se cumple, se aborta y se aplica el fallback sin degradar la UI.
4. **Deploy Estático (GitHub Pages):** En entornos serverless/estáticos, `POST /api/laya/predict` retorna 404; el cliente lo maneja como fallback normal.

---

## 3. Línea Roja Dogmática

> 🛑 **LÍNEA ROJA INMUTABLE:**
> **Laya sugiere, nunca decide** en rúbricas de evaluación, autenticación, dominio temático (*mastery*) o calificaciones finales del Examen de Grado.

Queda estrictamente prohibido registrar o invocar tareas destinadas a:
- Asignar puntajes o notas de examen.
- Validar tokens, sesiones o permisos de usuario.
- Determinar de forma autónoma la aprobación o reprobación de rúbricas jurídicas.
- Modificar el estado de maestría de temas sin supervisión heurística/dogmática.

---

## 4. Registro de Tareas Autorizadas (`LAYA_TASKS`)

Toda tarea debe declararse en `LAYA_TASKS` dentro de `scripts/laya_router.py` respetando las siguientes condiciones:
- **Máximo 5 opciones** para preguntas de tipo `choice` (previniendo la degradación del modelo).
- **Modelo multilingüe** (`multilingual`) como predeterminado para el dominio jurídico chileno e hispanohablante.
- **Definición obligatoria de `fallback`** determinista.

### Tareas Piloto Oficiales:
| Tarea | Tipo | Opciones / Rango | Propósito | Fallback |
|---|---|---|---|---|
| `qa_mode` | `choice` | `definicion`, `panorama`, `comparativa` (3 opciones) | Sugerencia inicial de píldora de modo en consulta doctrinal. | `definicion` |
| `shield_risk` | `noul` | `[0.0, 1.0]` | Puntuación aditiva de riesgo de manipulación/jailbreak en paralelo a regex. | `0.0` |

---

## 5. Privacidad y Seguridad

- **Registro sin PII:** La bitácora en `logs/router.jsonl` trunca las consultas a un máximo de 80 caracteres y no registra identificadores de usuario, correos ni datos sensibles.
- **Sanitización de Entrada:** Toda entrada enviada al router es sanitizada y acotada ($\le 4\text{ KB}$ en endpoint HTTP, 200 caracteres para consultas de sugerencia).
