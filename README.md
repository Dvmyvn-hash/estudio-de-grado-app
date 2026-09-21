# ⚖️ GRADOMANÍA — Plataforma Inteligente para el Examen de Grado en Derecho
### Derecho Civil · Derecho Procesal · Derecho Constitucional

**GRADOMANÍA** es una plataforma web de alto rendimiento diseñada para la preparación integral del Examen de Grado en Derecho. Integra el temario completo basado en cédulas oficiales, un visor de apuntes Markdown enriquecido, un grafo visual interactivo de conceptos jurídicos interconectados, un taller metodológico de casos prácticos con rúbrica AIME 2026-20 y un sistema de autenticación seguro con control de acceso convalidable.

---

## 🏗️ Arquitectura Dual: Nube / Local / Estática

La aplicación opera bajo una arquitectura dual perfectamente desacoplada:

1. **Modo Servidor Completo (Render.com / Local con Python)**:
   - Servidor HTTP multi-hilo (`server.py`) con API REST para autenticación (PBKDF2-SHA256), protección anti-fuerza bruta con backoff exponencial, verificación nativa de código por correo electrónico (6 dígitos) vía SMTP y sincronización multi-dispositivo con SQLite (`db.py`).
   - Monitoreo en vivo de fuentes y apuntes con auto-recarga inteligente en el navegador.

2. **Modo Autónomo / Estático (GitHub Pages / Navegador Offline)**:
   - Si no hay backend Python disponible o se aloja en GitHub Pages, la aplicación entra automáticamente en modo autónomo: todo el temario dogmático, el visor Markdown, el grafo interactivo y los casos de prueba cargan directamente desde memoria (`js/data.js`) y guardan el progreso en `localStorage`.

---

## 🚀 Despliegue Público Gratuito en Render.com

Puedes desplegar **GRADOMANÍA** completamente gratis en [Render.com](https://render.com) en menos de 3 minutos:

### Paso 1: Subir el proyecto a GitHub
Sube este repositorio a tu cuenta de GitHub (público o privado).

### Paso 2: Crear el Web Service en Render
1. Inicia sesión en [Render Dashboard](https://dashboard.render.com).
2. Haz clic en **"New +"** y selecciona **"Web Service"**.
3. Conecta tu repositorio de GitHub `estudio-de-grado-app`.
4. Configura los siguientes parámetros:
   - **Name:** `gradomania` (o el nombre que prefieras)
   - **Region:** Elige la más cercana (ej: `Oregon (US West)` u `Ohio`)
   - **Branch:** `main` (o tu rama activa)
   - **Root Directory:** *(dejar en blanco si el repo está en la raíz)*
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python server.py`
   - **Instance Type:** `Free` ($0/mes)

### Paso 3: Variables de Entorno (Environment Variables)
En la sección **"Environment"** de Render Dashboard añade:

> [!IMPORTANT]
> **Transporte de Correo en Render Free (Resend HTTPS API):**
> Los Web Services gratuitos de Render bloquean el tráfico SMTP saliente (puertos 25, 465 y 587). Para el envío garantizado de códigos de verificación por correo, **GRADOMANÍA** utiliza la API HTTPS de [Resend](https://resend.com) (puerto 443 estándar).

| Clave (Key) | Valor (Value) | Descripción |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.8` | Versión recomendada de Python |
| `SESSION_SECRET` | *(Haz clic en "Generate")* | Secreto criptográfico de 32+ caracteres para firmar cookies de sesión |
| `EMAIL_PROVIDER` | `resend` | Proveedor de correo en producción (`resend` o `smtp`) |
| `RESEND_API_KEY` | `re_123456789...` | API Key creada en [resend.com/api-keys](https://resend.com/api-keys) |
| `EMAIL_FROM` | `GRADOMANÍA <onboarding@resend.dev>` | Remitente inicial de pruebas (o tu dominio verificado) |
| `PORT` | `8080` | Render lo configura automáticamente |

> [!TIP]
> **Configuración en 1 minuto con Resend:**
> 1. Regístrate gratis en [resend.com](https://resend.com) (incluye 3.000 correos/mes sin costo).
> 2. En el panel de Resend, entra a **API Keys** y crea una clave (ej: *"gradomania-prod"*).
> 3. Copia la clave generada (`re_...`) y colócala en `RESEND_API_KEY` en Render.
> 4. Deja `EMAIL_FROM=GRADOMANÍA <onboarding@resend.dev>`. *(Nota: con el dominio `onboarding@resend.dev`, Resend solo permite enviar al correo asociado a tu cuenta de Resend. Cuando verifiques tu propio dominio en Resend, podrás enviar a cualquier destinatario libremente).*

> [!NOTE]
> **Para desarrollo local con Gmail SMTP (opcional):**
> En tu entorno local puedes seguir usando Gmail SMTP configurando en tu `.env` local `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=tu_correo@gmail.com` y `SMTP_PASS=tu_app_password`. Para diagnosticar cualquier transporte ejecuta: `python scripts/test_email_manual.py tu_correo@gmail.com`.

### Paso 4: Desplegar y listo
Haz clic en **"Create Web Service"**. En un par de minutos, Render completará el build y te entregará una URL pública segura HTTPS (ej: `https://gradomania.onrender.com`).

> [!NOTE]
> **Persistencia en el Plan Gratuito de Render:**
> En el plan Free de Render, el disco es efímero (los datos de SQLite se restablecen si el contenedor entra en reposo prolongado). Para generar códigos de invitación válidos en producción:
> 1. Ve a la pestaña **"Shell"** de tu servicio en Render.
> 2. Ejecuta: `python manage_access_codes.py` para emitir tus códigos de activación.
> *(Si deseas persistencia 24/7 sin reinicios de base de datos, puedes activar el plan Starter de $7/mes y adjuntar un Persistent Disk montado en `/data`).*

---

## 💻 Ejecución en Entorno Local

### Opción A: Servidor Inteligente con Python (Recomendado)
```powershell
python server.py
```
Abre en tu navegador: [http://localhost:8080](http://localhost:8080)

*Para conectar tu teléfono o tablet mediante la misma red Wi-Fi:*
```powershell
python server.py --lan
```

### Opción B: Modo Estático (Sin Servidor)
Haz doble clic sobre `index.html` o usa cualquier servidor estático:
```powershell
python -m http.server 8000
```

---

## 🔑 Gestión de Códigos de Invitación (Pase de Grado)

Para crear, listar o revocar códigos de acceso para tus alumnos o para ti mismo:
```powershell
python manage_access_codes.py
```
El asistente de terminal te permitirá:
1. Crear un código nuevo (con límite de usos y fecha de expiración opcional).
2. Listar todos los códigos activos y ver cuántos usuarios lo han convalidado.
3. Desactivar o eliminar códigos.

---

## 📚 Módulos y Metodología Jurídica

1. **Temario & Visor Dogmático:** Cédulas estructuradas de Civil, Procesal y Constitucional con referencias doctrinales y normativas.
2. **Grafo de Instituciones Interconectadas:** Red de relaciones jurídicas transversales (ej: cómo la teoría del acto jurídico se relaciona con las nulidades procesales y las garantías constitucionales). Totalmente interactivo con soporte táctil (pan y pinch-to-zoom).
3. **Taller de Casos Prácticos con Rúbrica AIME 2026-20:** Calificación en 4 dimensiones de excelencia:
   - Dimensión 1: Marco Jurídico (citas normativas pertinentes).
   - Dimensión 2: Hechos Relevantes (discriminación de datos sustantivos).
   - Dimensión 3: Subsunción y Razonamiento (silogismo y justificación de alternativas).
   - Dimensión 4: Claridad y Precisión Técnica (lenguaje dogmático riguroso).
4. **Modos Claro y Oscuro Accesibles:** Cumplimiento de contraste WCAG AA en ambos temas visuales.
