"""
Script CLI de Administración de Códigos de Acceso (Beta Cerrada)
Proyecto: estudio-de-grado-app

Uso:
  python manage_access_codes.py list
  python manage_access_codes.py create [--code CODIGO] [--label COHORTE] [--max-uses N] [--days DIAS]
  python manage_access_codes.py revoke CODIGO
  python manage_access_codes.py status CODIGO
"""

import sys
import argparse
import time
import random
import datetime
from pathlib import Path

# Asegurar importación de db.py
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

import db


def format_timestamp(ts_ms):
    if not ts_ms:
        return "Sin expiración"
    try:
        dt = datetime.datetime.fromtimestamp(ts_ms / 1000.0)
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(ts_ms)


def generate_random_code(prefix="GRADO-BETA"):
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    part1 = "".join(random.choice(chars) for _ in range(4))
    part2 = "".join(random.choice(chars) for _ in range(4))
    return f"{prefix}-{part1}-{part2}"


def cmd_create(args):
    code = args.code.strip().upper() if args.code else generate_random_code()
    label = args.label.strip() if args.label else "Grado-2026-Sept"
    max_uses = max(1, args.max_uses)

    expires_at = None
    if args.days and args.days > 0:
        expires_at = int((time.time() + (args.days * 86400)) * 1000)

    try:
        res = db.create_access_code(code, label=label, max_uses=max_uses, expires_at=expires_at)
        print("==================================================")
        print(" CÓDIGO DE ACCESO CREADO EXITOSAMENTE")
        print("==================================================")
        print(f" Código:       {res['code']}")
        print(f" Etiqueta:     {res['label']}")
        print(f" Usos Máximos: {res['max_uses']}")
        print(f" Expiración:   {format_timestamp(res['expires_at'])}")
        print("==================================================")
    except Exception as e:
        print(f" Error creando código de acceso: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_list(args):
    codes = db.list_access_codes()
    print("==========================================================================================")
    print(" LISTA DE CÓDIGOS DE ACCESO EMITIDOS (BETA CERRADA)")
    print("==========================================================================================")
    if not codes:
        print(" No hay códigos registrados en el sistema.")
        print(" Crea uno nuevo con: python manage_access_codes.py create")
        print("==========================================================================================")
        return

    header = f"{'CÓDIGO':<24} | {'ETIQUETA':<18} | {'USOS':<8} | {'ESTADO':<10} | {'EXPIRACIÓN':<18}"
    print(header)
    print("-" * len(header))

    now_ms = int(time.time() * 1000)
    for c in codes:
        code_str = c["code"]
        label_str = (c["label"] or "")[:18]
        uses_str = f"{c['times_used']}/{c['max_uses']}"
        
        is_active = c["active"] == 1
        is_exhausted = c["times_used"] >= c["max_uses"]
        is_expired = c["expires_at"] is not None and now_ms > c["expires_at"]

        if not is_active:
            status = "REVOCADO"
        elif is_exhausted:
            status = "AGOTADO"
        elif is_expired:
            status = "EXPIRADO"
        else:
            status = "ACTIVO"

        exp_str = format_timestamp(c["expires_at"])
        print(f"{code_str:<24} | {label_str:<18} | {uses_str:<8} | {status:<10} | {exp_str:<18}")

    print("==========================================================================================")
    print(f" Total de códigos: {len(codes)}")


def cmd_revoke(args):
    code = args.code.strip().upper()
    ok = db.revoke_access_code(code)
    if ok:
        print(f" Código '{code}' ha sido revocado exitosamente.")
    else:
        print(f" No se encontró el código '{code}' o ya estaba inactivo.", file=sys.stderr)
        sys.exit(1)


def cmd_status(args):
    code = args.code.strip().upper()
    code_data = db.get_access_code(code)
    if not code_data:
        print(f" El código '{code}' no existe en la base de datos.", file=sys.stderr)
        sys.exit(1)

    now_ms = int(time.time() * 1000)
    is_active = code_data["active"] == 1
    is_exhausted = code_data["times_used"] >= code_data["max_uses"]
    is_expired = code_data["expires_at"] is not None and now_ms > code_data["expires_at"]

    print("==================================================")
    print(f" DETALLE DEL CÓDIGO: {code}")
    print("==================================================")
    print(f" Etiqueta:     {code_data.get('label')}")
    print(f" Activo:       {'SÍ' if is_active else 'NO (Revocado)'}")
    print(f" Usos:         {code_data['times_used']} de {code_data['max_uses']}")
    print(f" Expiración:   {format_timestamp(code_data.get('expires_at'))}")
    print(f" Creado:       {format_timestamp(code_data.get('created_at'))}")

    # Buscar usuarios vinculados a este código
    with db.get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, name, last_login_at FROM users WHERE access_code = ?", (code,))
        users = cursor.fetchall()

    print("\n Usuarios Vinculados:")
    if not users:
        print("  (Ningún usuario ha vinculado este código todavía)")
    else:
        for u in users:
            last_login = format_timestamp(u["last_login_at"])
            print(f"  - ID {u['id']}: {u['name']} ({u['email']}) · Último login: {last_login}")
    print("==================================================")


def main():
    parser = argparse.ArgumentParser(
        description="Gestor local de Códigos de Acceso e Invitación (Beta Cerrada) - estudio-de-grado-app"
    )
    subparsers = parser.add_subparsers(dest="command", help="Comandos disponibles")

    # Comando: list
    subparsers.add_parser("list", help="Lista todos los códigos emitidos")

    # Comando: create
    create_parser = subparsers.add_parser("create", help="Crea un nuevo código de acceso")
    create_parser.add_argument("--code", type=str, help="Código personalizado (ej. GRADO-VIP-01). Si no se define, se genera uno aleatorio.")
    create_parser.add_argument("--label", type=str, default="Grado-2026-Sept", help="Etiqueta/Cohorte (ej. Grado-2026-Sept)")
    create_parser.add_argument("--max-uses", type=int, default=1, help="Número máximo de cuentas que pueden usar este código (default: 1)")
    create_parser.add_argument("--days", type=int, default=None, help="Días de vigencia antes de expirar (default: sin expiración)")

    # Comando: revoke
    revoke_parser = subparsers.add_parser("revoke", help="Revoca un código de acceso")
    revoke_parser.add_argument("code", type=str, help="Código a revocar")

    # Comando: status
    status_parser = subparsers.add_parser("status", help="Muestra el detalle y usuarios vinculados a un código")
    status_parser.add_argument("code", type=str, help="Código a consultar")

    args = parser.parse_args()

    if args.command == "create":
        cmd_create(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "revoke":
        cmd_revoke(args)
    elif args.command == "status":
        cmd_status(args)
    else:
        cmd_list(args)


if __name__ == "__main__":
    main()
