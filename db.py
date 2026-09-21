"""
Módulo de Base de Datos SQLite (estudio_grado.db)
Persistencia transaccional para:
- Códigos de acceso (access_codes)
- Usuarios vinculados con Google (users)
- Progreso multi-dispositivo por caso práctico (user_progress)
"""

import os
import sqlite3
import time
import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
DB_PATH_ENV = os.environ.get("DB_PATH")
DEFAULT_DB_PATH = Path(DB_PATH_ENV).resolve() if DB_PATH_ENV else BASE_DIR / "estudio_grado.db"


def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Crea y retorna una conexión con integridad referencial activa, WAL mode y row_factory."""
    path = db_path or DEFAULT_DB_PATH
    if path.parent and not path.parent.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=15.0)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.row_factory = sqlite3.Row
    return conn


import hashlib
import secrets
import base64
import hmac

PBKDF2_ITERATIONS = 210000


def hash_password(password: str, salt_b64: Optional[str] = None) -> Tuple[str, str]:
    """
    Genera el hash PBKDF2-HMAC-SHA256 con 210.000 iteraciones y salt aleatorio de 16 bytes.
    Retorna (password_hash_b64, password_salt_b64).
    """
    if salt_b64:
        salt_bytes = base64.b64decode(salt_b64.encode('ascii'))
    else:
        salt_bytes = secrets.token_bytes(16)
        salt_b64 = base64.b64encode(salt_bytes).decode('ascii')

    hash_bytes = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt_bytes, PBKDF2_ITERATIONS)
    hash_b64 = base64.b64encode(hash_bytes).decode('ascii')
    return hash_b64, salt_b64


def verify_password(password: str, password_hash: str, password_salt: str) -> bool:
    """Verifica en tiempo constante la contraseña usando PBKDF2-HMAC-SHA256."""
    try:
        computed_hash, _ = hash_password(password, salt_b64=password_salt)
        return hmac.compare_digest(computed_hash, password_hash)
    except Exception:
        return False


def init_db(db_path: Optional[Path] = None) -> None:
    """Crea las tablas si no existen según el modelo relacional del proyecto o migra el esquema."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS access_codes (
          code TEXT PRIMARY KEY,
          label TEXT,                 -- lote/cohorte, ej. "Grado-2026-Sept"
          max_uses INTEGER DEFAULT 1,
          times_used INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          expires_at INTEGER,         -- epoch ms, NULL = sin expiración
          created_at INTEGER NOT NULL
        );
        """)

        # Semilla de códigos de invitación estándar (idempotente con INSERT OR IGNORE)
        now_seed_ms = int(time.time() * 1000)
        seeds = [
            ("GRADO-BETA-2026", "Beta Cerrada 2026", 10000, now_seed_ms),
            ("CIVIL-PROCESAL-2026", "Cohorte Civil y Procesal", 5000, now_seed_ms),
            ("GRADO-VIP-2026", "Acceso VIP Institucional", 1000, now_seed_ms),
            ("GRADO-DOCENTE-2026", "Cuerpo Docente", 1000, now_seed_ms),
        ]

        extra_env = os.environ.get("EXTRA_ACCESS_CODES", "").strip()
        if extra_env:
            for item in extra_env.split(","):
                item = item.strip()
                if not item:
                    continue
                if ":" in item:
                    code_part, uses_part = item.split(":", 1)
                    code_clean = re.sub(r"[\s\u200b\u00a0]+", "", code_part).upper()
                    try:
                        max_u = max(1, int(uses_part.strip()))
                    except ValueError:
                        max_u = 1000
                else:
                    code_clean = re.sub(r"[\s\u200b\u00a0]+", "", item).upper()
                    max_u = 1000
                if re.match(r"^[A-Z0-9_\-]{4,36}$", code_clean):
                    seeds.append((code_clean, "Semilla Entorno", max_u, now_seed_ms))

        cursor.executemany(
            """
            INSERT OR IGNORE INTO access_codes (code, label, max_uses, times_used, active, expires_at, created_at)
            VALUES (?, ?, ?, 0, 1, NULL, ?)
            """,
            seeds
        )

        # Verificar si la columna assigned_email existe en access_codes
        cursor.execute("PRAGMA table_info(access_codes)")
        ac_columns = [row[1] for row in cursor.fetchall()]
        if "assigned_email" not in ac_columns:
            cursor.execute("ALTER TABLE access_codes ADD COLUMN assigned_email TEXT")

        # Verificar si la tabla users existe y requiere migración
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]

        if not columns:
            cursor.execute("""
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,        -- PBKDF2-HMAC-SHA256, 210.000 iteraciones
              password_salt TEXT NOT NULL,        -- 16 bytes aleatorios, base64
              name TEXT,                          -- opcional, ingresado por el usuario
              access_code TEXT REFERENCES access_codes(code),
              failed_login_attempts INTEGER DEFAULT 0,
              locked_until INTEGER,               -- epoch ms; NULL si no está bloqueado
              is_verified INTEGER DEFAULT 0,
              verification_code TEXT,
              verification_code_expires_at INTEGER, -- epoch ms
              verification_attempts INTEGER DEFAULT 0,
              created_at INTEGER NOT NULL,
              last_login_at INTEGER
            );
            """)
        elif "password_hash" not in columns:
            # Migración no destructiva de la tabla users previa con desactivación temporal de foreign_keys
            conn.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute("ALTER TABLE users RENAME TO users_old")
            cursor.execute("""
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              password_salt TEXT NOT NULL,
              name TEXT,
              access_code TEXT REFERENCES access_codes(code),
              failed_login_attempts INTEGER DEFAULT 0,
              locked_until INTEGER,
              is_verified INTEGER DEFAULT 0,
              verification_code TEXT,
              verification_code_expires_at INTEGER,
              verification_attempts INTEGER DEFAULT 0,
              created_at INTEGER NOT NULL,
              last_login_at INTEGER
            );
            """)
            cursor.execute("SELECT id, email, name, access_code, created_at, last_login_at FROM users_old")
            for r in cursor.fetchall():
                dummy_hash, dummy_salt = hash_password("GradoDefaultPass2026!")
                cursor.execute("""
                INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, name, access_code, failed_login_attempts, locked_until, is_verified, verification_code, verification_code_expires_at, verification_attempts, created_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, NULL, 1, NULL, NULL, 0, ?, ?)
                """, (r["id"], r["email"], dummy_hash, dummy_salt, r["name"], r["access_code"], r["created_at"], r["last_login_at"]))
            cursor.execute("DROP TABLE users_old")
            conn.execute("PRAGMA foreign_keys = ON;")

        # Auto-migración incremental de campos de verificación por correo (v6.0)
        cursor.execute("PRAGMA table_info(users)")
        curr_columns = [row[1] for row in cursor.fetchall()]
        if "is_verified" not in curr_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0")
        if "verification_code" not in curr_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN verification_code TEXT DEFAULT NULL")
        if "verification_code_expires_at" not in curr_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN verification_code_expires_at INTEGER DEFAULT NULL")
        if "verification_attempts" not in curr_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN verification_attempts INTEGER DEFAULT 0")

        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_progress'")
        up_row = cursor.fetchone()
        if up_row and "users_old" in (up_row[0] or ""):
            conn.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute("ALTER TABLE user_progress RENAME TO user_progress_old")
            cursor.execute("""
            CREATE TABLE user_progress (
              user_id INTEGER REFERENCES users(id),
              case_id TEXT NOT NULL,
              data_json TEXT NOT NULL,
              updated_at INTEGER NOT NULL,
              PRIMARY KEY (user_id, case_id)
            );
            """)
            cursor.execute("INSERT OR IGNORE INTO user_progress SELECT * FROM user_progress_old")
            cursor.execute("DROP TABLE user_progress_old")
            conn.execute("PRAGMA foreign_keys = ON;")

        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS user_progress (
          user_id INTEGER REFERENCES users(id),
          case_id TEXT NOT NULL,
          data_json TEXT NOT NULL,     -- draft/evaluación completa de ese caso
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, case_id)
        );
        """)
        conn.commit()


# ==========================================
# GESTIÓN DE CÓDIGOS DE ACCESO
# ==========================================

def normalize_access_code(code: Any) -> str:
    """Sanitiza y normaliza códigos de acceso eliminando espacios, NBSP, zero-width y aplicando mayúsculas."""
    if not code:
        return ""
    return re.sub(r"[\s\u200b\u00a0]+", "", str(code)).upper()


def create_access_code(
    code: str,
    label: Optional[str] = None,
    max_uses: int = 1,
    expires_at: Optional[int] = None,
    assigned_email: Optional[str] = None,
    db_path: Optional[Path] = None
) -> Dict[str, Any]:
    """Crea un nuevo código de acceso de invitación, con asignación opcional de email/Gmail."""
    init_db(db_path)
    clean_code = normalize_access_code(code)
    clean_email = str(assigned_email).strip().lower() if assigned_email and str(assigned_email).strip() else None
    now_ms = int(time.time() * 1000)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO access_codes (code, label, max_uses, times_used, active, expires_at, created_at, assigned_email)
            VALUES (?, ?, ?, 0, 1, ?, ?, ?)
            """,
            (clean_code, label or "Beta-General", max_uses, expires_at, now_ms, clean_email)
        )
        conn.commit()

    return {
        "code": clean_code,
        "label": label or "Beta-General",
        "max_uses": max_uses,
        "times_used": 0,
        "active": 1,
        "expires_at": expires_at,
        "created_at": now_ms,
        "assigned_email": clean_email,
        "associated_email": clean_email or ""
    }


def get_access_code(code: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Obtiene información de un código de acceso."""
    init_db(db_path)
    clean_code = normalize_access_code(code)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM access_codes WHERE code = ?", (clean_code,))
        row = cursor.fetchone()
        return dict(row) if row else None


def list_access_codes(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Lista todos los códigos de acceso con detalle de usos y usuarios/Gmail vinculados."""
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.*,
                   (SELECT GROUP_CONCAT(u.email, ', ') 
                    FROM users u 
                    WHERE u.access_code = a.code) AS linked_emails
            FROM access_codes a
            ORDER BY a.created_at DESC
        """)
        results = []
        for row in cursor.fetchall():
            item = dict(row)
            item["linked_emails"] = item.get("linked_emails") or ""
            item["assigned_email"] = item.get("assigned_email") or ""
            item["associated_email"] = item["linked_emails"] or item["assigned_email"] or ""
            results.append(item)
        return results


def revoke_access_code(code: str, db_path: Optional[Path] = None) -> bool:
    """Revoca (desactiva) un código de acceso."""
    init_db(db_path)
    clean_code = normalize_access_code(code)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE access_codes SET active = 0 WHERE code = ?", (clean_code,))
        conn.commit()
        return cursor.rowcount > 0


def validate_access_code(code: str, db_path: Optional[Path] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Valida las condiciones de uso de un código:
    - Existencia
    - Estado activo
    - Usos disponibles (times_used < max_uses)
    - No expirado (expires_at)
    """
    clean_code = normalize_access_code(code)
    if not clean_code:
        return False, "Código de acceso no proporcionado.", None

    if not re.match(r"^[A-Z0-9_\-]{4,36}$", clean_code):
        return False, "El código de acceso no es válido (formato incorrecto).", None

    code_data = get_access_code(clean_code, db_path)
    if not code_data:
        return False, "El código de acceso no existe.", None

    if code_data.get("active") != 1:
        return False, "El código de acceso ha sido revocado o desactivado.", code_data

    max_uses = code_data.get("max_uses", 1)
    times_used = code_data.get("times_used", 0)
    if times_used >= max_uses:
        return False, f"El código ha alcanzado el límite máximo de usos ({times_used}/{max_uses}).", code_data

    expires_at = code_data.get("expires_at")
    if expires_at is not None:
        now_ms = int(time.time() * 1000)
        if now_ms > expires_at:
            return False, "El código de acceso ha expirado.", code_data

    return True, "Código válido.", code_data


# ==========================================
# GESTIÓN DE USUARIOS
# ==========================================

def get_user_by_email(email: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Busca un usuario por su dirección de correo (case-insensitive)."""
    init_db(db_path)
    clean_email = str(email or "").strip().lower()
    if not clean_email:
        return None
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (clean_email,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Busca un usuario por su ID primario."""
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_sub(sub: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Compatibilidad de búsqueda por identificador (ID numérico o correo)."""
    if str(sub).isdigit():
        u = get_user_by_id(int(sub), db_path)
        if u:
            return u
    return get_user_by_email(sub, db_path)


def create_user(
    email: str,
    password: str,
    name: Optional[str] = None,
    access_code: Optional[str] = None,
    is_verified: int = 0,
    verification_code: Optional[str] = None,
    verification_code_expires_at: Optional[int] = None,
    db_path: Optional[Path] = None
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Crea un nuevo usuario con correo, contraseña (hasheada PBKDF2) y opcionalmente código de acceso.
    Retorna (ok, mensaje, user_dict).
    """
    init_db(db_path)
    clean_email = str(email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        return False, "Dirección de correo electrónico inválida.", None

    clean_name = str(name or "").strip()[:128] if name else None
    now_ms = int(time.time() * 1000)

    pwd_hash, pwd_salt = hash_password(password)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, is_verified, access_code, verification_code_expires_at FROM users WHERE LOWER(email) = ?", (clean_email,))
        existing_user = cursor.fetchone()
        if existing_user:
            if existing_user["is_verified"] == 1:
                return False, "El correo electrónico ya se encuentra registrado.", None

            # Si el usuario no está verificado pero su código sigue vigente: rechazar duplicado
            expires_at = existing_user["verification_code_expires_at"] or 0
            if now_ms <= expires_at:
                return False, "El correo electrónico ya se encuentra registrado y pendiente de verificación.", None

            # Si el código previo ya expiró, permitir re-registro seguro con nuevo código y contraseña
            clean_code = normalize_access_code(access_code) if access_code else None
            cursor.execute(
                """
                UPDATE users
                SET password_hash = ?,
                    password_salt = ?,
                    name = COALESCE(?, name),
                    access_code = COALESCE(?, access_code),
                    verification_code = ?,
                    verification_code_expires_at = ?,
                    verification_attempts = 0,
                    failed_login_attempts = 0,
                    locked_until = NULL
                WHERE id = ?
                """,
                (pwd_hash, pwd_salt, clean_name, clean_code, verification_code, verification_code_expires_at, existing_user["id"])
            )
            conn.commit()
            cursor.execute("SELECT id, email, name, access_code, failed_login_attempts, locked_until, is_verified, verification_code, verification_code_expires_at, verification_attempts, created_at, last_login_at FROM users WHERE id = ?", (existing_user["id"],))
            row = cursor.fetchone()
            return True, "Código de verificación actualizado para la cuenta.", dict(row) if row else None

        clean_code = normalize_access_code(access_code) if access_code else None
        if clean_code:
            cursor.execute(
                """
                UPDATE access_codes
                SET times_used = times_used + 1
                WHERE code = ?
                  AND active = 1
                  AND times_used < max_uses
                  AND (expires_at IS NULL OR expires_at > ?)
                """,
                (clean_code, now_ms)
            )
            if cursor.rowcount == 0:
                cursor.execute("SELECT active, max_uses, times_used, expires_at FROM access_codes WHERE code = ?", (clean_code,))
                row = cursor.fetchone()
                if not row:
                    return False, "El código de acceso no existe.", None
                if row["active"] != 1:
                    return False, "El código de acceso ha sido revocado o desactivado.", None
                if row["times_used"] >= row["max_uses"]:
                    return False, f"El código ha alcanzado el límite máximo de usos ({row['times_used']}/{row['max_uses']}).", None
                if row["expires_at"] is not None and now_ms > row["expires_at"]:
                    return False, "El código de acceso ha expirado.", None
                return False, "El código de acceso no es válido o ya fue utilizado.", None

        cursor.execute(
            """
            INSERT INTO users (
                email, password_hash, password_salt, name, access_code,
                failed_login_attempts, locked_until, is_verified,
                verification_code, verification_code_expires_at, verification_attempts,
                created_at, last_login_at
            )
            VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, 0, ?, ?)
            """,
            (clean_email, pwd_hash, pwd_salt, clean_name, clean_code, is_verified, verification_code, verification_code_expires_at, now_ms, now_ms)
        )
        user_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT id, email, name, access_code, failed_login_attempts, locked_until, is_verified, verification_code, verification_code_expires_at, verification_attempts, created_at, last_login_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return True, "Usuario creado exitosamente.", dict(row) if row else None


def update_verification_code(user_id: int, code: str, expires_at: int, db_path: Optional[Path] = None) -> bool:
    """Actualiza el código de verificación de 6 dígitos, vencimiento y resetea intentos a 0."""
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET verification_code = ?,
                verification_code_expires_at = ?,
                verification_attempts = 0
            WHERE id = ?
            """,
            (code, expires_at, user_id)
        )
        conn.commit()
        return cursor.rowcount > 0


def increment_verification_attempts(user_id: int, db_path: Optional[Path] = None) -> int:
    """Incrementa los intentos de verificación fallidos y retorna el total."""
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET verification_attempts = COALESCE(verification_attempts, 0) + 1 WHERE id = ?",
            (user_id,)
        )
        conn.commit()
        cursor.execute("SELECT verification_attempts FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return row["verification_attempts"] if row else 1


def invalidate_verification_code(user_id: int, db_path: Optional[Path] = None) -> bool:
    """Invalida el código de verificación tras superar el límite de intentos."""
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET verification_code = NULL, verification_code_expires_at = NULL WHERE id = ?",
            (user_id,)
        )
        conn.commit()
        return cursor.rowcount > 0


def mark_user_verified(user_id: int, db_path: Optional[Path] = None) -> bool:
    """Marca al usuario como verificado y limpia los campos temporales de verificación."""
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET is_verified = 1,
                verification_code = NULL,
                verification_code_expires_at = NULL,
                verification_attempts = 0
            WHERE id = ?
            """,
            (user_id,)
        )
        conn.commit()
        return cursor.rowcount > 0


def create_user_with_code(
    google_sub: str,
    email: str,
    name: Optional[str],
    picture_url: Optional[str],
    code: str,
    db_path: Optional[Path] = None
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Crea o vincula usuario con código (usado en suite de pruebas / fallback con Google)."""
    clean_email = str(email or f"{google_sub}@example.com").strip().lower()
    clean_name = name or clean_email.split("@")[0]
    existing = get_user_by_email(clean_email, db_path)
    if existing:
        if existing.get("access_code"):
            return True, "Usuario ya registrado y convalidado.", existing
        return link_user_code(existing["id"], code, db_path)
    return create_user(
        email=clean_email,
        password="TestPassword2026!",
        name=clean_name,
        access_code=code,
        is_verified=1,
        db_path=db_path
    )


def record_login_failure(user_id: int, db_path: Optional[Path] = None) -> Tuple[int, Optional[int]]:
    """
    Registra un intento fallido de login. Si alcanza 5 fallos consecutivos, bloquea por 15 minutos.
    Retorna (intentos_fallidos, epoch_ms_desbloqueo).
    """
    init_db(db_path)
    now_ms = int(time.time() * 1000)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT failed_login_attempts FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            return 0, None
        attempts = (row["failed_login_attempts"] or 0) + 1
        locked_until = None
        if attempts >= 5:
            locked_until = now_ms + (15 * 60 * 1000)  # 15 minutos
        cursor.execute(
            "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
            (attempts, locked_until, user_id)
        )
        conn.commit()
        return attempts, locked_until


def record_login_success(user_id: int, db_path: Optional[Path] = None) -> None:
    """Restablece intentos fallidos y actualiza la fecha de último inicio de sesión."""
    init_db(db_path)
    now_ms = int(time.time() * 1000)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?",
            (now_ms, user_id)
        )
        conn.commit()


def link_user_code(user_id: int, code: str, db_path: Optional[Path] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Convalida y vincula un código de acceso a la cuenta de usuario de forma atómica:
    1. Descuenta atómicamente en access_codes (previene Race Conditions).
    2. Actualiza users.access_code.
    """
    init_db(db_path)
    clean_code = normalize_access_code(code)
    if not clean_code:
        return False, "Código de acceso no proporcionado.", None

    if not re.match(r"^[A-Z0-9_\-]{4,36}$", clean_code):
        return False, "El código de acceso no es válido (formato incorrecto).", None

    now_ms = int(time.time() * 1000)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            return False, "Usuario no encontrado.", None

        cursor.execute(
            """
            UPDATE access_codes
            SET times_used = times_used + 1
            WHERE code = ?
              AND active = 1
              AND times_used < max_uses
              AND (expires_at IS NULL OR expires_at > ?)
            """,
            (clean_code, now_ms)
        )
        if cursor.rowcount == 0:
            cursor.execute("SELECT active, max_uses, times_used, expires_at FROM access_codes WHERE code = ?", (clean_code,))
            row = cursor.fetchone()
            if not row:
                return False, "El código de acceso no existe.", None
            if row["active"] != 1:
                return False, "El código de acceso ha sido revocado o desactivado.", None
            if row["times_used"] >= row["max_uses"]:
                return False, f"El código ha alcanzado el límite máximo de usos ({row['times_used']}/{row['max_uses']}).", None
            if row["expires_at"] is not None and now_ms > row["expires_at"]:
                return False, "El código de acceso ha expirado.", None
            return False, "El código de acceso no es válido o ya fue utilizado.", None

        cursor.execute("UPDATE users SET access_code = ? WHERE id = ?", (clean_code, user_id))
        conn.commit()

        cursor.execute("SELECT id, email, name, access_code, failed_login_attempts, locked_until, created_at, last_login_at FROM users WHERE id = ?", (user_id,))
        updated_row = cursor.fetchone()
        return True, "Código convalidado exitosamente.", dict(updated_row) if updated_row else None


def update_user_last_login(
    user_id: int,
    name: Optional[str] = None,
    picture_url: Optional[str] = None,
    email: Optional[str] = None,
    db_path: Optional[Path] = None
) -> bool:
    """Actualiza la fecha de último inicio de sesión y datos de perfil."""
    init_db(db_path)
    now_ms = int(time.time() * 1000)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET last_login_at = ?,
                name = COALESCE(?, name),
                email = COALESCE(?, email)
            WHERE id = ?
            """,
            (now_ms, name, email.strip().lower() if email else None, user_id)
        )
        conn.commit()
        return cursor.rowcount > 0


# ==========================================
# GESTIÓN DE PROGRESO DE USUARIO
# ==========================================

def get_all_user_progress(user_id: int, db_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Recupera todo el progreso del usuario por caso.
    Retorna un diccionario estructurado { case_id: draft_data_dict }.
    """
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT case_id, data_json, updated_at FROM user_progress WHERE user_id = ?", (user_id,))
        rows = cursor.fetchall()
        result = {}
        for row in rows:
            case_id = row["case_id"]
            try:
                data = json.loads(row["data_json"])
            except Exception:
                data = {}
            if isinstance(data, dict):
                data["updatedAtEpoch"] = row["updated_at"]
            result[case_id] = data
        return result


def upsert_user_progress(
    user_id: int,
    case_id: str,
    data_json_or_dict: Any,
    updated_at: Optional[int] = None,
    db_path: Optional[Path] = None
) -> Tuple[bool, int]:
    """
    Guarda o actualiza atómicamente el progreso de un caso para un usuario.
    Retorna (éxito, updated_at_ms).
    """
    init_db(db_path)
    if isinstance(data_json_or_dict, str):
        data_json = data_json_or_dict
        try:
            parsed = json.loads(data_json)
            ts = parsed.get("updatedAtEpoch")
        except Exception:
            ts = None
    else:
        ts = data_json_or_dict.get("updatedAtEpoch") if isinstance(data_json_or_dict, dict) else None
        data_json = json.dumps(data_json_or_dict, ensure_ascii=False)

    now_ms = updated_at or ts or int(time.time() * 1000)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_progress (user_id, case_id, data_json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, case_id) DO UPDATE SET
              data_json = excluded.data_json,
              updated_at = excluded.updated_at
            """,
            (user_id, str(case_id).strip(), data_json, now_ms)
        )
        conn.commit()
        return True, now_ms


if __name__ == "__main__":
    init_db()
    print("Base de datos estudio_grado.db inicializada correctamente con claves foráneas activas.")
