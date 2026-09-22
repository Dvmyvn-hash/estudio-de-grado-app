# PROMPT — Diagnóstico y Corrección: "Port scan timeout" en Render (Deploy Falla)
### Proyecto: `estudio-de-grado-app` (GRADOMANÍA)

**Contexto:** El despliegue en Render falló tras **18m22s** con el error:
```
==> Port scan timeout reached, no open ports detected. Bind your service to at least one port.
==> Timed Out
```
Esto significa que el proceso de `server.py` arrancó (el build fue exitoso), pero **nunca llegó a abrir/escuchar el puerto** dentro de la ventana de detección de Render. La duración de 18+ minutos antes de que Render se rindiera descarta un error de sintaxis o de import inmediato (eso falla en segundos) — apunta a que algo **bloquea o cuelga la ejecución antes de la línea que abre el socket**, o a un bucle de reintentos sin límite.

Este commit incluye varios hitos empaquetados juntos (v7.2 a v7.5), así que no asumas cuál de ellos causó el problema — diagnostica con evidencia real antes de tocar código.

## REGLA DE AISLAMIENTO ABSOLUTO
No reviertas ni reescribas funcionalidad completa de ningún hito a ciegas. El objetivo es encontrar la causa raíz exacta y aplicar la corrección mínima necesaria — no un rollback masivo.

---

## 1. Instrumentación diagnóstica (hazlo primero, antes de intentar arreglar nada)

Añade logging explícito (`print(..., flush=True)` o el logger que ya use `server.py`) inmediatamente antes y después de cada fase de arranque, en este orden:
1. Carga de variables de entorno (`load_env_file()`).
2. Inicialización/migración de base de datos (`init_db()` y cualquier auto-migración o backfill retroactivo que corra al iniciar).
3. Arranque del hilo daemon de purga automática (`run_auto_purge_daemon`, v7.0) — confirma explícitamente que se lanza con `daemon=True` y que **no bloquea el hilo principal** (no debe haber un `.join()` ni una llamada síncrona a `purge_unvalidated_accounts()` en el hilo principal antes de abrir el socket).
4. Cualquier sincronización con fuentes externas introducida por el Agente de IA (`syncApuntesFromServer`, `FUENTES_CORPUS`, `TOPICS_INDEX`, o llamadas a APIs externas tipo Gemini/Cloud Run mencionadas en el diseño) — si alguna de estas corre en el arranque del servidor (no del navegador), debe confirmarse que **no sea una llamada de red síncrona sin timeout**.
5. Creación del socket / `HTTPServer`/`ThreadingHTTPServer` y llamada a `serve_forever()`.

Con estos logs, redeploya una vez (aunque vuelva a fallar) — el log de Render mostrará exactamente en qué fase se detiene el proceso, en vez de tener que adivinar.

## 2. Verificaciones puntuales según lo que revele el log

* **Si se detiene en la migración de base de datos:** revisar si alguna auto-migración reciente (columnas nuevas, backfill de `access_code_usages`, registro `apuntes_registry.json`) quedó en un bucle o una consulta que no retorna — especialmente si involucra iterar sobre todos los usuarios o archivos sin límite ni manejo de errores.
* **Si se detiene en el hilo de purga automática:** confirmar que `threading.Thread(target=run_auto_purge_daemon, daemon=True).start()` se invoca de forma asíncrona y que el hilo principal continúa inmediatamente hacia el bind del socket, sin esperar a que la primera purga termine.
* **Si se detiene en una llamada de red externa (APIs de IA, sincronización de fuentes):** cualquier llamada HTTP saliente durante el arranque del servidor debe tener un **timeout corto explícito** (ej. 5-10s) y nunca ser bloqueante de forma indefinida; si no es estrictamente necesaria antes de aceptar tráfico, moverla a que ocurra de forma perezosa (en la primera solicitud que la necesite) o en un hilo en segundo plano, no en el camino crítico de arranque.
* **Si nunca se llega ni siquiera al punto 1 (carga de entorno):** revisar si `requirements.txt` incluye alguna dependencia nueva que Render sí logró instalar pero que al importarse dispara un efecto colateral costoso (conexión a un servicio externo al importar el módulo, por ejemplo).
* **Confirmar en paralelo (aunque ya estaba resuelto desde v5.0) que el bind sigue siendo correcto:** `HOST = "0.0.0.0"` y `PORT = int(os.environ.get("PORT", <valor_local_por_defecto>))` — verificar que ningún cambio reciente haya reintroducido un puerto o host hardcodeado.

## 3. Corrección

Una vez identificada la fase exacta que cuelga (por el log de Render), aplicar la corrección mínima: mover la operación bloqueante fuera del camino crítico de arranque (a un hilo daemon con timeout, o a ejecución perezosa en el primer request), o corregir el bucle/consulta que no retorna. **No** remover funcionalidad completa de un hito salvo que el diagnóstico confirme sin ambigüedad que esa es la causa.

## 4. Verificación de cierre

1. Confirmar localmente que `server.py` abre el puerto y queda escuchando en **menos de 5 segundos** desde el arranque (no 18 minutos).
2. Redesplegar en Render y confirmar que el deploy pasa el chequeo de puerto sin timeout.
3. `node test_unlock_auth_flow.cjs` y `node test_e2e_case_flow.cjs` deben mantenerse en 100%.
4. Registrar hito **v7.6** en la Bitácora §9, documentando la causa raíz exacta encontrada (no genérica) y la corrección aplicada.

## Fuera de alcance

No modificar el diseño visual del header móvil ni el Modo Claro (v7.2, ya cerrado), ni ejecutar cambios adicionales del Agente de IA más allá de lo estrictamente necesario para resolver el bloqueo de arranque.
