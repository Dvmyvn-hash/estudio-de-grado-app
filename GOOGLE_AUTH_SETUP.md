# 🛡️ Guía de Autenticación Autónoma y Despliegue Público (GitHub Pages y Local)

Plataforma de Preparación para el Examen de Grado (`estudio-de-grado-app`)

El sistema cuenta con una arquitectura de **Autenticación Autónoma con Correo Electrónico, Contraseña (PBKDF2-HMAC-SHA256) y Captcha Cloudflare Turnstile**, diseñada para operar de manera inmediata tanto en **servidor local (`server.py`)** como en **GitHub Pages (modo estático público SPA)**.

---

## 🚀 1. Arquitectura Dual Lista para Producción

1. **Modo Servidor Local / Docker / Producción (`python server.py`):**
   - Hashing con **PBKDF2-HMAC-SHA256 (210.000 iteraciones)** y salt criptográfico de 16 bytes.
   - Verificación fail-closed de **Cloudflare Turnstile** en registro y tras fallos en login.
   - Bloqueo temporal (*Account Lockout*) por 15 minutos tras 5 intentos fallidos consecutivos.
   - Sesiones persistidas en cookies `HttpOnly; Secure; SameSite=Lax` firmadas con HMAC-SHA256.
   - Base de datos relacional SQLite `estudio_grado.db` con blindaje contra Zero-Exposure (**HTTP 403**).

2. **Modo Estático / GitHub Pages (`https://dvmyvn-hash.github.io/estudio-de-grado-app`):**
   - Operación 100% *serverless* y autónoma en el navegador.
   - Hashing del lado del cliente mediante Web Crypto API (`crypto.subtle.digest("SHA-256")`) para **nunca almacenar contraseñas en texto plano** en `localStorage`.
   - Soporte para códigos de activación de la beta privada (`GRADO-BETA-2026`, etc.).
   - Resiliencia automática: si un adblocker o política de red bloquea Cloudflare Turnstile, se activa la verificación local sin interrumpir al postulante.

---

## 🔑 2. Configuración de Cloudflare Turnstile

El proyecto viene configurado con la clave de sitio pública de producción (`0x4AAAAAAAE9e7tJ25CKz1YqH`), con respaldo automático a la clave de pruebas de Cloudflare (`1x00000000000000000000AA`) y tokens de contingencia offline si se detectan bloqueos de red o adblockers.

Si deseas utilizar tus propias claves de Cloudflare en tu dominio personalizado:

1. Ingresa a tu panel de [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).
2. Haz clic en **"Add site"** / **"Agregar sitio"**:
   - Nombre: `Estudio de Grado`.
   - Dominios autorizados:
     - `dvmyvn-hash.github.io`
     - `localhost`
     - `127.0.0.1`
   - Modo de widget: **Managed** (Recomendado) o **Invisible**.
3. Copia tu **Site Key** y tu **Secret Key**:
   - En `js/auth-config.js`: Reemplaza `turnstileSiteKey: "TU_SITE_KEY_AQUI"`.
   - En `auth_config.json`: Reemplaza `"turnstile_site_key": "TU_SITE_KEY_AQUI"`.
   - En el servidor: Exporta la variable de entorno:
     ```powershell
     $env:TURNSTILE_SECRET_KEY="TU_SECRET_KEY_AQUI"
     ```

---

## 🔒 3. Códigos de Invitación Preconfigurados (Beta Cerrada)

Para convalidar una cuenta de Versión Demo a Pase Activo de Grado, se encuentran pre-sembrados los siguientes códigos:
- `GRADO-BETA-2026`: Acceso completo a Civil, Procesal y Constitucional.
- `CIVIL-PROCESAL-2026`: Cohorte de Civil y Procesal.
- `GRADO-VIP-2026`: Acceso institucional prioritario.
- `GRADO-DOCENTE-2026`: Cuenta con perfil evaluador.

*(En local con `server.py` puedes generar y gestionar códigos ilimitados con `python manage_access_codes.py create --code TU-CODIGO`).*

---

## 🚀 4. Subir a GitHub y Publicar

Para publicar los cambios en tu repositorio público:

```bash
git add .
git commit -m "feat: autenticacion autonoma con PBKDF2, Turnstile y blindaje de seguridad v4.0"
git push origin main
```

El flujo de GitHub Actions desplegará la plataforma automáticamente en:
**`https://dvmyvn-hash.github.io/estudio-de-grado-app/`**

---

## 🛡️ 5. Blindaje de Ciberseguridad Activo
- **Zero Exposure:** Ningún archivo de base de datos (`.db`, `.sqlite`), secreto criptográfico (`.auth_secret`), archivo `.py` ni script de prueba (`.cjs`) es accesible vía web.
- **Defensa contra Clickjacking y Sniffing:** Encabezados `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`.
- **Integridad de Modelos IA:** Las pautas de evaluación y modelos fuente en `CASOS/` permanecen bajo HTTP 403 Forbidden.
