#!/usr/bin/env python3
"""
Script de Verificación Manual de Envío de Correo (Resend HTTPS / Gmail SMTP)
GRADOMANÍA — Estudio de Grado Hub (v6.2)

Uso:
    python scripts/test_email_manual.py [destinatario@ejemplo.com]

Este script detecta automáticamente el proveedor configurado en .env
(Resend HTTPS API para producción o Gmail SMTP para desarrollo local)
y realiza un envío de prueba seguro con código de 6 dígitos.
"""

import os
import sys
import json
import secrets
import urllib.request
import urllib.error
import smtplib
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

EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "").strip().lower()
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
try:
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
except ValueError:
    SMTP_PORT = 587
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASS = os.environ.get("SMTP_PASS", "").strip()
EMAIL_FROM = os.environ.get("EMAIL_FROM", "").strip()


def test_resend(dest_email: str, code: str):
    print("📡 [Proveedor: RESEND API HTTPS (Puerto 443)]")
    if not RESEND_API_KEY:
        print("❌ ERROR: RESEND_API_KEY no está configurada en .env o variables de entorno.")
        print("   Por favor crea tu cuenta gratuita en https://resend.com y agrega:")
        print("   EMAIL_PROVIDER=resend")
        print("   RESEND_API_KEY=re_xxxxxxxxxxxx")
        print("   EMAIL_FROM=GRADOMANÍA <onboarding@resend.dev>\n")
        sys.exit(1)

    sender = EMAIL_FROM or "GRADOMANÍA <onboarding@resend.dev>"
    subject = f"Prueba Resend GRADOMANÍA — Código: {code}"
    body_text = (
        f"Hola,\n\n"
        f"Este es un correo de verificación de prueba enviado vía Resend HTTPS API.\n\n"
        f"Tu código de prueba es: {code}\n\n"
        f"Si recibes este mensaje, la integración HTTPS para Render.com está funcionando perfectamente.\n"
    )
    body_html = (
        f"<div style='font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
        f"<h2 style='color: #1e293b;'>GRADOMANÍA</h2>"
        f"<p style='color: #475569;'>Prueba de Despacho de Correo (Resend HTTPS API)</p>"
        f"<div style='background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;'>"
        f"<span style='font-size: 30px; font-weight: bold; letter-spacing: 6px; color: #0f172a;'>{code}</span>"
        f"</div>"
        f"<p style='color: #64748b; font-size: 13px;'>Código de prueba para verificación de entrega en Render.com.</p>"
        f"</div>"
    )

    payload = {
        "from": sender,
        "to": [dest_email],
        "subject": subject,
        "text": body_text,
        "html": body_html
    }

    print(f"🚀 Despachando solicitud HTTPS a https://api.resend.com/emails desde '{sender}'...")

    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "Gradomania-Diagnostic/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            res_body = resp.read().decode("utf-8", errors="ignore")
            if 200 <= status < 300:
                print(f"\n✅ ¡ÉXITO! Correo despachado correctamente mediante Resend (Status {status}).")
                print(f"   Destinatario: {dest_email}")
                print(f"   Código enviado: {code}")
                print(f"   Respuesta Resend: {res_body}")
                print("   Revisa tu bandeja de entrada (o carpeta de spam si es la primera vez).\n")
            else:
                print(f"\n❌ Error devuelto por Resend API (Status {status}): {res_body}")
                sys.exit(1)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"\n❌ ERROR HTTP de Resend API (Status {e.code}):")
        print(f"   Detalle: {err_body}")
        if "domain" in err_body.lower() or "sender" in err_body.lower():
            print("\n💡 Tip: Si usas la API key de pruebas de Resend sin dominio propio verificado,")
            print("   debes enviar desde 'onboarding@resend.dev' hacia el correo con el que te registraste en Resend.")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"\n❌ ERROR DE RED al conectar con Resend API: {e.reason}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR INESPERADO: {type(e).__name__} - {e}")
        sys.exit(1)


def test_smtp(dest_email: str, code: str):
    print("📡 [Proveedor: GMAIL SMTP]")
    if not SMTP_HOST:
        print("❌ ERROR: SMTP_HOST no está configurado.")
        sys.exit(1)
    if not SMTP_USER or not SMTP_PASS:
        print("❌ ERROR: SMTP_USER o SMTP_PASS no están configurados en .env.")
        sys.exit(1)

    sender = EMAIL_FROM or SMTP_USER
    subject = f"Prueba SMTP GRADOMANÍA — Código: {code}"
    body = (
        f"Hola,\n\n"
        f"Este es un correo de verificación de prueba enviado vía SMTP.\n\n"
        f"Tu código de prueba es: {code}\n"
    )
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = dest_email

    print(f"📡 Conectando a {SMTP_HOST}:{SMTP_PORT}...")
    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)

        print(f"\n✅ ¡ÉXITO! Correo de prueba despachado vía SMTP a: {dest_email}")
        print(f"   Código enviado: {code}\n")
    except Exception as e:
        print(f"\n❌ ERROR EN ENVÍO SMTP: {e}")
        sys.exit(1)


def main():
    print("==================================================")
    print(" VERIFICACIÓN MANUAL DE CORREO — GRADOMANÍA (v6.2)")
    print("==================================================\n")

    # Determinar proveedor
    provider = EMAIL_PROVIDER
    if not provider:
        if RESEND_API_KEY:
            provider = "resend"
        elif SMTP_HOST:
            provider = "smtp"
        else:
            provider = "none"

    if provider == "none":
        print("❌ ERROR: No hay proveedor de correo configurado en .env.")
        print("   Configura RESEND_API_KEY (para Resend HTTPS) o SMTP_HOST (para SMTP local).")
        sys.exit(1)

    # Correo destino
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

    if provider == "resend":
        test_resend(dest_email, code)
    elif provider == "smtp":
        test_smtp(dest_email, code)
    else:
        print(f"❌ Proveedor no reconocido: '{provider}'. Usa 'resend' o 'smtp'.")
        sys.exit(1)

if __name__ == "__main__":
    main()
