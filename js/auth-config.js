/**
 * CONFIGURACIÓN DE AUTENTICACIÓN GOOGLE & CÓDIGOS DE ACCESO
 * Plataforma de Preparación para el Examen de Grado (Derecho)
 * 
 * Funciona de forma automática tanto en servidor local (server.py)
 * como en GitHub Pages (modo estático SPA).
 */

window.AUTH_CONFIG = {
  // Client ID de Google OAuth 2.0 Web para Google Identity Services (GSI).
  // Puedes actualizarlo con tu propio Client ID desde Google Cloud Console (ver GOOGLE_AUTH_SETUP.md).
  googleClientId: "1084268194723-8c4v8vhf2rghk0n3k0t3q3j3j3j3j3j3.apps.googleusercontent.com",

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
  ],

  // Habilitar acceso de prueba asistido si Google Identity no está configurado aún en Google Cloud Console
  allowDemoLogin: true
};

// Exportación modular para entornos Node.js / pruebas
if (typeof module !== "undefined" && module.exports) {
  module.exports = window.AUTH_CONFIG;
}
