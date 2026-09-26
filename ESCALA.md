# ESCALA.md — Lineamientos para miles de usuarios (v1.0 · 2026-09-26 · Nexo + dpint)

Documento canónico de escalabilidad de `estudio-de-grado-app`. No es un prompt
ejecutable: es el marco que todo prompt futuro debe respetar cuando toque
crecer. Regla madre: **no optimizar prematuramente; escalar por gatillos
medidos, no por ansiedad.**

---

## 1. Dónde estamos hoy (techos reales, verificados en el repo)

| Capa | Estado actual | Techo estimado | Veredicto |
|---|---|---|---|
| Frontend estático (Pages/CDN): Vault, Q&A, Grafo, temario | 100% client-side, artefactos JSON ≤ ~830 KB | Miles concurrentes sin despeinarse (lo sirve el CDN, no tu servidor) | ✅ Ya escala |
| `server.py` (stdlib `http.server` + `ThreadingTCPServer`) | 1 hilo por request, sin workers ni cola | Decenas de concurrentes; cientos con degradación | 🔴 Primer cuello |
| SQLite + WAL (`db.py`, `busy_timeout` 5 s, disco 1 GB en Render `starter`) | Un escritor por vez; lecturas concurrentes OK | ~100 escrituras/min antes de contención visible | 🟡 Segundo cuello |
| Sesiones/auth/mastery (`/api/user/*`) | Todo pasa por el servidor Python | Escala con el servidor (ver arriba) | 🔴 Hereda el cuello |
| Worker Laya (`localhost:47888`) | 1 instancia, 1.6 GB RAM, sin cola ni batch | 1 usuario (tú); 0 multi-usuario | 🔴 No es servicio todavía |
| `ciclo_nutricion`, builders offline | Dev-time, una vez por deploy | No tocan runtime | ✅ Irrelevante a escala |

**Conclusión honesta:** con Pages + CDN ya aguantas miles de *lectores*; el servidor
Render `starter` aguanta cientos de *usuarios con sesión* en el mejor caso. El
salto a miles con sesión exige las fases de abajo, en orden y por gatillos.

---

## 2. Principios innegociables (todo prompt de escala los hereda)

1. **Estático primero:** toda lectura que pueda ser JSON/CDN, es JSON/CDN. El
   servidor Python solo para lo que exige escritura o secreto (auth, mastery,
   códigos, Laya).
2. **Degradar, no caer:** cada dependencia (Laya, servidor, DB) tiene fallback
   que preserva lectura. Una caída parcial jamás es pantalla en blanco.
3. **Medir antes de migrar:** ningún cambio de infraestructura sin benchmark
   previo (latencia p50/p95, errores/seg, saturación) y gatillo numérico.
4. **Compatibilidad de datos:** `id`/`code`/`indexCode`, mastery y licencias son
   inmutables entre fases. Escalar nunca migra el significado de un dato.
5. **Costo con techo:** cada fase declara su costo mensual estimado. Sin techo,
   no se ejecuta.

---

## 3. Roadmap por fases (gatillos, no fechas)

### Fase E1 — Endurecer lo actual (0 costo, hacer ya al tocar servidor)
- Rate-limit por IP en endpoints de escritura (patrón del buscador: 1 req/150 ms).
- Timeouts y payload caps en TODO endpoint nuevo (ya es norma; auditar los viejos).
- Health check `/api/health` (uptime, versión, tamaño DB, latencia de 1 query).
- **Gatillo de salida:** p95 > 800 ms en `/api/user/topic-mastery` o errores 5xx > 0.1%.

### Fase E2 — Servidor de verdad (cuando E1 ya no alcanza)
- Reemplazar stdlib por servidor WSGI/ASGI con workers (gunicorn/uvicorn) detrás
  del mismo `server.py` (cambio de runtime, no de lógica).
- Caché en memoria para lecturas calientes (temario, artefactos) con TTL.
- **Gatillo de salida:** CPU sostenida > 70% o cola de threads creciendo.

### Fase E3 — Datos multi-usuario (solo si E2 se queda corto)
- SQLite → Postgres gestionado para auth/mastery/códigos (lecturas estáticas
  siguen en CDN; el canon NO se mueve).
- Migración con doble-escritura temporal y verificación fila a fila.
- **Gatillo de salida:** contención WAL visible (busy_timeout agotados en logs).

### Fase E4 — Laya como servicio (solo con demanda multi-usuario real)
- El worker localhost NO escala: se convierte en microservicio con cola + batch
  + N réplicas, o se evalúa inferencia en edge según costo.
- El contrato `LAYA_TASKS` + fallback no cambia: la app ni se entera.
- **Gatillo de entrada:** > 10 decisiones/seg sostenidas (hoy: ~1).

---

## 4. Cargas objetivo (para futuros load tests)

| Escenario | Objetivo |
|---|---|
| Lectura anónima (Pages) | 5.000 concurrentes, p95 < 1 s, 0% errores |
| Sesión + mastery (Render) | 500 concurrentes, p95 < 800 ms, < 0.1% errores |
| Laya servicio (futuro) | 10 dec/seg, p95 < 1 s, fallback < 1% |

Herramienta sugerida cuando toque: `k6` o `locust`, guion versionado en
`scripts/load/` (no existe aún; crearlo es parte de E1 cuando se active).

---

## 5. Prohibido a escala

- Sesiones en memoria del proceso (mueren con cada deploy; usar DB o store externo).
- `SELECT *` sin `LIMIT` en endpoints (paginar todo lo que crezca con usuarios).
- Subir pesos/modelos al repo o al deploy estático (Laya vive en servicio, nunca en Pages).
- Decisiones de Laya sin fallback en ningún flujo de usuario.
- Optimizar sin el benchmark previo que lo justifique.

---

*Estado E1: ejecutada en v7.48 (2026-09-26, Nexo) — `GET /api/health`, helper `_check_e1_rate_limit` y guardas en 4 POST de escritura, Seccion 20 en unlock suite (219 tests). Siguiente: PROMPT de Fase E2 solo ante su gatillo (CPU > 70%).*
