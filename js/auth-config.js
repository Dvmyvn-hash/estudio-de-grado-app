/**
 * CONFIGURACIÓN DE AUTENTICACIÓN (CORREO + CONTRASEÑA + CAPTCHA) & CÓDIGOS DE ACCESO
 * Plataforma de Preparación para el Examen de Grado (Derecho)
 * 
 * Funciona de forma automática tanto en servidor local (server.py)
 * como en GitHub Pages (modo estático SPA).
 */

// ============================================================================
// 🛡️ CONFIGURACIÓN DE CLOUDFLARE TURNSTILE (CAPTCHA)
// ============================================================================
// Si el widget muestra "Solo para pruebas" ("Testing Only"), es porque está
// activa la clave de prueba de Cloudflare (1x00000000000000000000AA).
//
// Para pasar a PRODUCCIÓN real y eliminar ese mensaje:
// 1. Entra a Cloudflare Dashboard: https://dash.cloudflare.com/?to=/:account/turnstile
// 2. Crea o edita un widget agregando tus dominios (ej: localhost, tu-app.onrender.com, etc.)
// 3. Pega tu Site Key pública real en la variable TURNSTILE_PRODUCTION_SITE_KEY abajo.
// ============================================================================

// PEGA AQUÍ TU CLAVE DE SITIO (SITE KEY) PÚBLICA DE PRODUCCIÓN:
const TURNSTILE_PRODUCTION_SITE_KEY = "0x4AAAAAAAE9e7tJ25CKz1YqH";

// Clave oficial de prueba de Cloudflare (se usa automáticamente como respaldo si no ingresas una de producción):
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

const authConfig = {
  // Clave activa: utiliza la de producción si existe, o la de pruebas como fallback
  turnstileSiteKey: (TURNSTILE_PRODUCTION_SITE_KEY && TURNSTILE_PRODUCTION_SITE_KEY.trim()) || TURNSTILE_TEST_SITE_KEY,

  // Códigos de acceso de invitación activos para la beta cerrada en GitHub Pages / modo estático
  invitationCodes: [
    "GRADO-BETA-2026",
    "CIVIL-PROCESAL-2026",
    "DERECHO-UCHILE-2026",
    "DERECHO-PUC-2026",
    "POSTULANTE-2026"
  ],

  // Orígenes de JavaScript autorizados
  authorizedOrigins: [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://dvmyvn-hash.github.io"
  ]
};

if (typeof window !== "undefined") {
  window.AUTH_CONFIG = authConfig;
}

if (typeof globalThis !== "undefined") {
  globalThis.AUTH_CONFIG = authConfig;
}

// Exportación modular para entornos Node.js / pruebas
if (typeof module !== "undefined" && module.exports) {
  module.exports = authConfig;
}
