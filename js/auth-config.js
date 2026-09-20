/**
 * CONFIGURACIÓN DE AUTENTICACIÓN (CORREO + CONTRASEÑA + CAPTCHA) & CÓDIGOS DE ACCESO
 * Plataforma de Preparación para el Examen de Grado (Derecho)
 * 
 * Funciona de forma automática tanto en servidor local (server.py)
 * como en GitHub Pages (modo estático SPA).
 */

const authConfig = {
  // Clave pública (Site Key) de Cloudflare Turnstile.
  // 1x00000000000000000000AA es la clave de prueba oficial de Cloudflare (pasa siempre con éxito).
  turnstileSiteKey: "1x00000000000000000000AA",

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
