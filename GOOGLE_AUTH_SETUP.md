# 🔑 Guía Rápida: Activar Autenticación con Google en GitHub y Local

Esta guía te permite dejar operativa la autenticación con **Google Identity Services (GSI)** tanto en tu computadora local como en **GitHub Pages** (`https://dvmyvn-hash.github.io/estudio-de-grado-app`).

---

## ⚡ 1. Arquitectura Dual Lista para Usar

La aplicación ya cuenta con una **arquitectura híbrida inteligente**:
- **En Local / Servidor (`python server.py`)**: Valida firmas HMAC-SHA256, sincroniza en tiempo real con SQLite (`estudio_grado.db`) y gestiona cookies `httpOnly; Secure; SameSite=Lax`.
- **En GitHub Pages (Modo Estático Serverless)**: Al subirse a GitHub, la aplicación decodifica de forma segura el JWT firmado por Google en el navegador, valida los códigos de acceso de la beta privada y persiste los avances de casos en `localStorage`.

---

## 🛠️ 2. Cómo Obtener tu Google Client ID (2 Minutos)

Google exige que cada aplicación web registre su dominio para permitir el inicio de sesión. Sigue estos 3 pasos:

### Paso 1: Ingresar a Google Cloud Console
1. Abre [Google Cloud Console - Credenciales](https://console.cloud.google.com/apis/credentials).
2. Si no tienes un proyecto, haz clic en **"Crear proyecto"** (ej: *"Estudio de Grado"*).
3. En la pestaña **"Pantalla de consentimiento de OAuth"** (*OAuth consent screen*):
   - Tipo de usuario: **Externo** (External).
   - Nombre de la app: `Estudio de Grado`.
   - Correo de asistencia: Tu correo personal.
   - En *Permisos/Scopes*, solo necesitas los básicos por defecto: `email`, `profile`, `openid`.

### Paso 2: Crear el ID de Cliente OAuth 2.0
1. Ve a **"Credenciales"** -> **"+ Crear credenciales"** -> **"ID de cliente de OAuth"**.
2. Tipo de aplicación: **Aplicación web** (*Web application*).
3. Nombre: `Estudio de Grado Web`.
4. En la sección **"Orígenes autorizados de JavaScript"** (*Authorized JavaScript origins*), agrega:
   ```text
   http://localhost:8080
   http://127.0.0.1:8080
   http://localhost:8000
   http://127.0.0.1:8000
   https://dvmyvn-hash.github.io
   ```
   *(Nota: Google requiere la URL base sin barra final ni subcarpetas).*
5. Haz clic en **"Crear"**.
6. Copia el valor de **"ID de cliente"** (termina en `.apps.googleusercontent.com`).

---

## 📝 3. Pegar tu Client ID en el Proyecto

Abre los dos archivos de configuración y pega tu ID:

### Archivo 1: `js/auth-config.js` (Frontend / GitHub Pages)
```javascript
window.AUTH_CONFIG = {
  googleClientId: "TU_CLIENT_ID_AQUI.apps.googleusercontent.com",
  ...
};
```

### Archivo 2: `auth_config.json` (Backend Python)
```json
{
  "google_client_id": "TU_CLIENT_ID_AQUI.apps.googleusercontent.com"
}
```

---

## 🎟️ 4. Códigos de Invitación Activos para la Beta

Cuando un nuevo usuario inicie sesión con su cuenta de Google, el sistema le solicitará un código de invitación. En GitHub Pages vienen precargados los siguientes códigos:

- `GRADO-BETA-2026`
- `CIVIL-PROCESAL-2026`
- `DERECHO-UCHILE-2026`
- `DERECHO-PUC-2026`
- `POSTULANTE-2026`

*(En local con `server.py` puedes generar y gestionar códigos ilimitados con `python manage_access_codes.py create --code TU-CODIGO`).*

---

## 🚀 5. Subir a GitHub

Para publicar todos los cambios:

```bash
git add .
git commit -m "Activar Google Auth Dual-Mode y despliegue a GitHub Pages"
git push origin main
```

El flujo de GitHub Actions desplegará la plataforma automáticamente en:
**`https://dvmyvn-hash.github.io/estudio-de-grado-app/`**

---

## 💡 Modo de Prueba Inmediato (Sin Google Cloud Console)

Si aún no has creado tu Client ID en Google Cloud, la aplicación cuenta con un **asistente de acceso directo**:
- Al hacer clic en **"Acceder con Google"**, podrás ingresar tu correo de prueba y uno de los códigos de la beta (`GRADO-BETA-2026`) para experimentar toda la interfaz, avatar y sincronización de inmediato.
