#!/usr/bin/env python3
"""
Script de Verificación Manual de Envío de Correo (Brevo HTTPS / Resend HTTPS / Gmail SMTP)
GRADOMANIACOS — Estudio de Grado Hub (v6.7)

Uso:
    python scripts/test_email_manual.py [destinatario@ejemplo.com]

Este script detecta automáticamente el proveedor configurado en .env o entorno
(Brevo HTTPS API, Resend HTTPS API o Gmail SMTP) y realiza un envío de prueba
seguro con un código numérico de 6 dígitos, diagnosticando posibles problemas de dominio.
"""

import os
import sys
import re
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
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "").strip() or os.environ.get("SENDINBLUE_API_KEY", "").strip()
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
try:
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
except ValueError:
    SMTP_PORT = 587
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASS = os.environ.get("SMTP_PASS", "").strip()
EMAIL_FROM = os.environ.get("EMAIL_FROM", "").strip()


def parse_sender_info(raw_sender: str, default_name: str = "GRADOMANIACOS", default_email: str = "gradomaniacos@gmail.com"):
    if not raw_sender or not raw_sender.strip():
        return default_name, default_email
    clean = raw_sender.strip()
    match = re.match(r"^([^<]+)<([^>]+)>$", clean)
    if match:
        name = match.group(1).strip().strip('"\'')
        email = match.group(2).strip()
        return name or default_name, email or default_email
    if "@" in clean:
        return default_name, clean
    return default_name, default_email


def test_brevo(dest_email: str, code: str):
    print("📡 [Proveedor: BREVO (SENDINBLUE) API HTTPS (Puerto 443)]")
    if not BREVO_API_KEY:
        print("❌ ERROR: BREVO_API_KEY no está configurada.")
        print("   Para activar Brevo gratis sin necesidad de dominio propio:")
        print("   1. Crea tu cuenta gratuita en https://brevo.com")
        print("   2. Valida tu email remitente en 'Senders & IP'")
        print("   3. Genera tu clave en 'SMTP & API' y agrégala a Render o .env:")
        print("      EMAIL_PROVIDER=brevo")
        print("      BREVO_API_KEY=xkeysib-xxxxxxxxxxxx")
        print("      EMAIL_FROM=GRADOMANIACOS <gradomaniacos@gmail.com>\n")
        sys.exit(1)

    sender_name, sender_email = parse_sender_info(EMAIL_FROM, "GRADOMANIACOS", "gradomaniacos@gmail.com")
    subject = f"Prueba Brevo GRADOMANIACOS — Código: {code}"
    body_text = (
        f"Hola,\n\n"
        f"Este es un correo de prueba enviado vía Brevo API REST HTTPS.\n\n"
        f"Tu código de prueba es: {code}\n\n"
        f"Si recibes este mensaje, la integración HTTPS para Render.com está operativa y puede entregar correos a cualquier persona sin restricciones de dominio.\n"
    )
    body_html = (
        f"<div style='font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
        f"<h2 style='color: #1e293b;'>GRADOMANIACOS</h2>"
        f"<p style='color: #475569;'>Prueba de Despacho de Correo (Brevo API REST HTTPS)</p>"
        f"<div style='background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;'>"
        f"<span style='font-size: 30px; font-weight: bold; letter-spacing: 6px; color: #0f172a;'>{code}</span>"
        f"</div>"
        f"<p style='color: #64748b; font-size: 13px;'>Código de prueba para verificación en producción.</p>"
        f"</div>"
    )

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": dest_email}],
        "subject": subject,
        "textContent": body_text,
        "htmlContent": body_html
    }

    print(f"🚀 Despachando solicitud HTTPS a https://api.brevo.com/v3/smtp/email desde '{sender_name} <{sender_email}>'...")
    try:
        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json",
                "User-Agent": "Gradomania-Diagnostic/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            res_body = resp.read().decode("utf-8", errors="ignore")
            if 200 <= status < 300:
                print(f"\n✅ ¡ÉXITO! Correo despachado correctamente vía Brevo (Status {status}).")
                print(f"   Destinatario: {dest_email}")
                print(f"   Código enviado: {code}")
                print(f"   Respuesta API: {res_body}")
                print("   Revisa tu bandeja de entrada o spam.\n")
            else:
                print(f"\n❌ Error devuelto por Brevo API (Status {status}): {res_body}")
                sys.exit(1)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"\n❌ ERROR HTTP de Brevo API (Status {e.code}):")
        print(f"   Detalle: {err_body}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"\n❌ ERROR DE RED al conectar con Brevo API: {e.reason}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR INESPERADO: {type(e).__name__} - {e}")
        sys.exit(1)


def test_resend(dest_email: str, code: str):
    print("📡 [Proveedor: RESEND API HTTPS (Puerto 443)]")
    if not RESEND_API_KEY:
        print("❌ ERROR: RESEND_API_KEY no está configurada.")
        sys.exit(1)

    clean_from = (EMAIL_FROM or "").strip()
    sender = clean_from if clean_from else "GRADOMANIACOS <onboarding@resend.dev>"

    subject = f"Prueba Resend GRADOMANIACOS — Código: {code}"
    body_text = (
        f"Hola,\n\n"
        f"Este es un correo de prueba enviado vía Resend HTTPS API.\n\n"
        f"Tu código de prueba es: {code}\n"
    )
    body_html = (
        f"<div style='font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
        f"<h2 style='color: #1e293b;'>GRADOMANIACOS</h2>"
        f"<p style='color: #475569;'>Prueba de Despacho de Correo (Resend HTTPS API)</p>"
        f"<div style='background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;'>"
        f"<span style='font-size: 30px; font-weight: bold; letter-spacing: 6px; color: #0f172a;'>{code}</span>"
        f"</div>"
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
            else:
                print(f"\n❌ Error devuelto por Resend API (Status {status}): {res_body}")
                sys.exit(1)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"\n❌ ERROR HTTP de Resend API (Status {e.code}):")
        print(f"   Detalle: {err_body}")
        if e.code == 403 and ("testing" in err_body.lower() or "only send" in err_body.lower()):
            print("\n⚠️  [DIAGNÓSTICO EXACTO: MODO DE PRUEBA RESTRINGIDO]")
            print("   Resend restringe los envíos con 'onboarding@resend.dev' ÚNICAMENTE al correo con el que te registraste en Resend.")
            print("   Para enviar a tus amigos o a cualquier persona sin comprar un dominio:")
            print("   👉 Recomendamos configurar Brevo (EMAIL_PROVIDER=brevo, BREVO_API_KEY=xkeysib-...) que permite envíos a cualquiera gratis.")
            print("   👉 O verifica un dominio propio en https://resend.com/domains con registros DNS.\n")
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
    subject = f"Prueba SMTP GRADOMANIACOS — Código: {code}"
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
    print(" VERIFICACIÓN MANUAL DE CORREO — GRADOMANIACOS (v6.7)")
    print("==================================================\n")

    provider = EMAIL_PROVIDER
    if not provider:
        if BREVO_API_KEY:
            provider = "brevo"
        elif RESEND_API_KEY:
            provider = "resend"
        elif SMTP_HOST:
            provider = "smtp"
        else:
            provider = "none"

    if provider == "none":
        print("❌ ERROR: No hay proveedor de correo configurado en .env.")
        print("   Configura BREVO_API_KEY (recomendado sin dominio) o RESEND_API_KEY.")
        sys.exit(1)

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

    if provider in ("brevo", "sendinblue"):
        test_brevo(dest_email, code)
    elif provider == "resend":
        test_resend(dest_email, code)
    elif provider == "smtp":
        test_smtp(dest_email, code)
    else:
        print(f"❌ Proveedor no reconocido: '{provider}'. Usa 'brevo', 'resend' o 'smtp'.")
        sys.exit(1)

if __name__ == "__main__":
    main()
