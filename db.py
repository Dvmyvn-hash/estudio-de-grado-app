"""
Módulo de Base de Datos SQLite (estudio_grado.db)
Persistencia transaccional para:
- Códigos de acceso (access_codes)
- Usuarios vinculados con Google (users)
- Progreso multi-dispositivo por caso práctico (user_progress)
"""

import sqlite3
import time
import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "estudio_grado.db"


def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Crea y retorna una conexión con integridad referencial activa, WAL mode y row_factory."""
    path = db_path or DEFAULT_DB_PATH
    conn = sqlite3.connect(str(path), timeout=15.0)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[Path] = None) -> None:
    """Crea las tablas si no existen según el modelo relacional del proyecto."""
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

        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          google_sub TEXT UNIQUE NOT NULL,   -- 'sub' del ID token, identificador estable
          email TEXT NOT NULL,
          name TEXT,
          picture_url TEXT,
          access_code TEXT REFERENCES access_codes(code),
          created_at INTEGER NOT NULL,
          last_login_at INTEGER NOT NULL
        );

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

def create_access_code(
    code: str,
    label: Optional[str] = None,
    max_uses: int = 1,
    expires_at: Optional[int] = None,
    db_path: Optional[Path] = None
) -> Dict[str, Any]:
    """Crea un nuevo código de acceso de invitación."""
    init_db(db_path)
    clean_code = code.strip().upper()
    now_ms = int(time.time() * 1000)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO access_codes (code, label, max_uses, times_used, active, expires_at, created_at)
            VALUES (?, ?, ?, 0, 1, ?, ?)
            """,
            (clean_code, label or "Beta-General", max_uses, expires_at, now_ms)
        )
        conn.commit()

    return {
        "code": clean_code,
        "label": label or "Beta-General",
        "max_uses": max_uses,
        "times_used": 0,
        "active": 1,
        "expires_at": expires_at,
        "created_at": now_ms
    }


def get_access_code(code: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Obtiene información de un código de acceso."""
    init_db(db_path)
    clean_code = code.strip().upper()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM access_codes WHERE code = ?", (clean_code,))
        row = cursor.fetchone()
        return dict(row) if row else None


def list_access_codes(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Lista todos los códigos de acceso con detalle de usos."""
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM access_codes ORDER BY created_at DESC")
        return [dict(row) for row in cursor.fetchall()]


def revoke_access_code(code: str, db_path: Optional[Path] = None) -> bool:
    """Revoca (desactiva) un código de acceso."""
    init_db(db_path)
    clean_code = code.strip().upper()
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
    if not code or not isinstance(code, str):
        return False, "Código de acceso no proporcionado.", None

    clean_code = code.strip().upper()
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

def get_user_by_sub(google_sub: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Busca un usuario por su google_sub estable."""
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE google_sub = ?", (str(google_sub),))
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


def create_user_with_code(
    google_sub: str,
    email: str,
    name: Optional[str],
    picture_url: Optional[str],
    code: str,
    db_path: Optional[Path] = None
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Crea un nuevo usuario vinculado a un código de acceso de forma transaccional atómica:
    1. Sanitiza los parámetros de entrada.
    2. Ejecuta un UPDATE condicional atómico en access_codes (previene Race Conditions / TOCTOU).
    3. Inserta el registro del usuario.
    """
    init_db(db_path)
    if not code or not isinstance(code, str):
        return False, "Código de acceso no proporcionado.", None

    clean_code = code.strip().upper()
    now_ms = int(time.time() * 1000)

    # Sanitización defensiva de entradas
    safe_sub = re.sub(r"[\x00-\x1F\x7F]", "", str(google_sub)).strip()[:128]
    safe_email = re.sub(r"[\x00-\x1F\x7F]", "", str(email)).strip().lower()[:255]
    safe_name = re.sub(r"[\x00-\x1F\x7F]", "", str(name or "")).strip()[:128]
    raw_pic = str(picture_url or "").strip()
    safe_pic = raw_pic[:500] if re.match(r"^https?://[a-zA-Z0-9.\-_~:/?#\[\]@!$&'()*+,;=]+$", raw_pic) else ""

    if not safe_sub or not safe_email:
        return False, "Datos de cuenta de Google incompletos o inválidos.", None

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        try:
            # 1. Verificar si ya existe usuario con ese sub
            cursor.execute("SELECT * FROM users WHERE google_sub = ?", (safe_sub,))
            existing = cursor.fetchone()
            if existing:
                return True, "Usuario ya registrado.", dict(existing)

            # 2. Incremento atómico condicional: garantiza que no dos transacciones concurrentes
            # puedan exceder max_uses aunque lleguen al mismo milisegundo (Race Condition Protection)
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
                # El código no pudo ser consumido. Consultar la causa exacta para informar al cliente:
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

            # 3. Insertar usuario
            cursor.execute(
                """
                INSERT INTO users (google_sub, email, name, picture_url, access_code, created_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (safe_sub, safe_email, safe_name, safe_pic, clean_code, now_ms, now_ms)
            )
            user_id = cursor.lastrowid
            conn.commit()

            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()
            return True, "Usuario creado exitosamente.", dict(user_row) if user_row else None
        except Exception as e:
            conn.rollback()
            return False, f"Error transaccional al crear usuario: {e}", None


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
                picture_url = COALESCE(?, picture_url),
                email = COALESCE(?, email)
            WHERE id = ?
            """,
            (now_ms, name, picture_url, email.strip().lower() if email else None, user_id)
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
