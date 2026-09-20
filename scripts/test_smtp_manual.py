#!/usr/bin/env python3
"""
Script de Verificación Manual de Envío SMTP (Gmail / Producción)
GRADOMANÍA — Estudio de Grado Hub

Uso:
    python scripts/test_smtp_manual.py [destinatario@ejemplo.com]

Este script lee las variables desde el archivo .env o del entorno del sistema
y realiza un envío de prueba directo a la casilla indicada para confirmar
que la cuenta Gmail y la Contraseña de Aplicación de 16 caracteres funcionan.
"""

import os
import sys
import smtplib
import secrets
from pathlib import Path
from email.mime.text import MIMEText

BASE_DIR = Path(__file__).resolve().parent.parent

def load_env():
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception as e:
            print(f"[Aviso] No se pudo leer .env: {e}")

load_env()

SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASS = os.environ.get("SMTP_PASS", "").strip()
EMAIL_FROM = os.environ.get("EMAIL_FROM", "").strip() or SMTP_USER

def main():
    print("==================================================")
    print(" VERIFICACIÓN MANUAL DE ENVÍO SMTP (GMAIL)")
    print("==================================================\n")

    if not SMTP_HOST:
        print("❌ ERROR: SMTP_HOST no está configurado.")
        print("   Por favor crea o edita el archivo .env en la raíz del proyecto con:")
        print("   SMTP_HOST=smtp.gmail.com")
        print("   SMTP_PORT=587")
        print("   SMTP_USER=tu_cuenta@gmail.com")
        print("   SMTP_PASS=tu_app_password_de_16_letras")
        print("   EMAIL_FROM=GRADOMANÍA <tu_cuenta@gmail.com>\n")
        sys.exit(1)

    if not SMTP_USER or not SMTP_PASS:
        print("❌ ERROR: SMTP_USER o SMTP_PASS no están configurados en .env o entorno.")
        print("   Para Gmail, SMTP_PASS debe ser una Contraseña de Aplicación de 16 caracteres:")
        print("   (Cuenta Google -> Seguridad -> Verificación en 2 pasos -> Contraseñas de aplicaciones -> Correo)\n")
        sys.exit(1)

    # Obtener correo de destino
    if len(sys.argv) > 1 and sys.argv[1].strip():
        dest_email = sys.argv[1].strip()
    else:
        try:
            dest_email = input("Ingresa el correo de destino para la prueba: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nCancelado.")
            sys.exit(0)

    if not dest_email or "@" not in dest_email:
        print("❌ Correo de destino inválido.")
        sys.exit(1)

    code = "".join(secrets.choice("0123456789") for _ in range(6))
    subject = f"Prueba SMTP GRADOMANÍA — Código: {code}"
    body = (
        f"Hola,\n\n"
        f"Este es un correo de verificación de prueba enviado desde GRADOMANÍA.\n\n"
        f"Tu código de prueba es: {code}\n\n"
        f"Si recibes este mensaje, la configuración SMTP con Gmail está funcionando correctamente.\n"
    )

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = dest_email

    print(f"📡 Conectando a {SMTP_HOST}:{SMTP_PORT} como '{SMTP_USER}'...")

    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.ehlo()
                print("🔒 Iniciando cifrado STARTTLS...")
                server.starttls()
                server.ehlo()
                print("🔑 Autenticando con servidor...")
                server.login(SMTP_USER, SMTP_PASS)
                print(f"✉️ Despachando mensaje a {dest_email}...")
                server.send_message(msg)

        print(f"\n✅ ¡ÉXITO! Correo de prueba despachado correctamente a: {dest_email}")
        print(f"   Código enviado: {code}")
        print("   Revisa tu bandeja de entrada (y la carpeta de spam si es necesario).\n")

    except smtplib.SMTPAuthenticationError as e:
        print("\n❌ ERROR DE AUTENTICACIÓN (SMTPAuthenticationError):")
        print(f"   Código de error: {e.smtp_code}")
        print(f"   Mensaje del servidor: {e.smtp_error}")
        print("\n💡 SOLUCIÓN RECOMENDADA:")
        print("   1. En cuentas de Google/Gmail, NO se debe usar la contraseña normal de la cuenta.")
        print("   2. Asegúrate de tener activada la 'Verificación en dos pasos' en tu cuenta de Google.")
        print("   3. Ve a https://myaccount.google.com/apppasswords y genera una 'Contraseña de aplicación'.")
        print("   4. Copia esa clave de 16 caracteres en SMTP_PASS dentro de tu archivo .env.")
        sys.exit(1)
    except (smtplib.SMTPException, OSError) as e:
        print(f"\n❌ ERROR DE CONEXIÓN O TRANSPORTE SMTP:")
        print(f"   Detalle: {e}")
        print("   Verifica tu conexión a Internet y que el puerto 587 no esté bloqueado por un firewall.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR INESPERADO: {type(e).__name__} - {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
