# 🛡️ Guía de Autenticación Autónoma y Despliegue Público (GitHub Pages y Local)

Plataforma de Preparación para el Examen de Grado (`estudio-de-grado-app`)

El sistema cuenta con una arquitectura de **Autenticación Autónoma con Correo Electrónico, Contraseña (PBKDF2-HMAC-SHA256) y Verificación de Correo con Código de 6 Dígitos vía SMTP**, diseñada para operar de manera inmediata tanto en **servidor local (`server.py`)** como en **GitHub Pages (modo estático público SPA)**.

---

## 🚀 1. Arquitectura Dual Lista para Producción

1. **Modo Servidor Local / Docker / Producción (`python server.py`):**
   - Hashing con **PBKDF2-HMAC-SHA256 (210.000 iteraciones)** y salt criptográfico de 16 bytes.
   - Verificación nativa de cuenta mediante código numérico de 6 dígitos enviado por correo (SMTP) con expiración de 15 minutos y límite de 5 intentos.
   - Bloqueo temporal (*Account Lockout*) por 15 minutos tras 5 intentos fallidos consecutivos de inicio de sesión.
   - Sesiones persistidas en cookies `HttpOnly; Secure; SameSite=Lax` firmadas con HMAC-SHA256.
   - Base de datos relacional SQLite `estudio_grado.db` con blindaje contra Zero-Exposure (**HTTP 403**).

2. **Modo Estático / GitHub Pages (`https://dvmyvn-hash.github.io/estudio-de-grado-app`):**
   - Operación 100% *serverless* y autónoma en el navegador.
   - Hashing del lado del cliente mediante Web Crypto API (`crypto.subtle.digest("SHA-256")`) para **nunca almacenar contraseñas en texto plano** en `localStorage`.
   - Soporte para códigos de activación de la beta privada (`GRADO-BETA-2026`, etc.).
   - Verificación de código simulada en cliente para pruebas sin servidor.

---

## 📧 2. Configuración de Envío de Correos (SMTP)

El sistema utiliza la biblioteca estándar de Python (`smtplib`) sin dependencias externas. Para enviar correos de verificación en producción o desarrollo:

1. Configura las siguientes variables de entorno:
   - `SMTP_HOST`: Dirección del servidor SMTP (ej: `smtp.resend.com`, `smtp.gmail.com`, `smtp.sendgrid.net`).
   - `SMTP_PORT`: Puerto SMTP (ej: `587` para STARTTLS o `465` para SSL). Por defecto es `587`.
   - `SMTP_USER`: Nombre de usuario o API Key del servicio de correo.
   - `SMTP_PASS`: Contraseña o clave secreta de la cuenta SMTP.
   - `EMAIL_FROM`: Dirección remitente (ej: `no-reply@tudominio.com`).

2. En entorno local (PowerShell):
   ```powershell
   $env:SMTP_HOST="smtp.resend.com"
   $env:SMTP_PORT="587"
   $env:SMTP_USER="resend"
   $env:SMTP_PASS="re_..."
   $env:EMAIL_FROM="no-reply@tudominio.com"
   python server.py
   ```

> [!NOTE]
> **Modo Desarrollo (Sin SMTP):** Si no defines `SMTP_HOST`, `server.py` registrará el código de verificación en la consola (`[SMTP Dev] Código de verificación para user@ejemplo.com: 123456`) permitiendo probar el flujo completo localmente sin configurar un servidor de correos.

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
git commit -m "feat: eliminacion de Turnstile y verificacion nativa con codigo de 6 digitos via SMTP v6.0"
git push origin main
```

El flujo de GitHub Actions desplegará la plataforma automáticamente en:
**`https://dvmyvn-hash.github.io/estudio-de-grado-app/`**

---

## 🛡️ 5. Blindaje de Ciberseguridad Activo
- **Zero Exposure:** Ningún archivo de base de datos (`.db`, `.sqlite`), secreto criptográfico (`.auth_secret`), archivo `.py` ni script de prueba (`.cjs`) es accesible vía web.
- **Defensa contra Clickjacking y Sniffing:** Encabezados `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`.
- **Integridad de Modelos IA:** Las pautas de evaluación y modelos fuente en `CASOS/` permanecen bajo HTTP 403 Forbidden.
