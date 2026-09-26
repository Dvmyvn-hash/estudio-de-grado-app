# -*- coding: utf-8 -*-
"""
Setup de Laya compartido (LAYA_HOME) — v1.1 · 2026-09-26
========================================================
CONVENCIÓN DE UBICACIÓN Y CONTROL DE VERSIONES:
- scripts/setup_laya.py (este archivo): FUENTE CANÓNICA VERSIONADA en el repo.
- %USERPROFILE%\\.laya\\setup_laya.py: EJECUTABLE LOCAL en máquina.
Ambos comparten la misma lógica y no hardcodean rutas de usuario.

Instalación ÚNICA por máquina, compartida por todos los proyectos vía
variable de entorno LAYA_HOME. Cada proyecto la consume con fallback
determinista si no está instalada (ver LAYA_CONTRACT.md).

Uso:
    python scripts/setup_laya.py                     (instala/actualiza checkpoint default)
    python scripts/setup_laya.py --check             (verifica presencia y salud, sale 0 o 1)
    python scripts/setup_laya.py --smoke-only        (ejecuta prueba de humo sin reinstalar)
    python scripts/setup_laya.py --checkpoint laya-typed-decisions

Checkpoints:
    laya-multilingual     322M — español +100 idiomas (DEFAULT para nuestros proyectos)
    laya                  421M — inglés
    laya-typed-decisions  421M — flujos choice/score/noul estructurados
"""
import argparse
import os
import subprocess
import sys
import venv

# Lectura dinámica de LAYA_HOME con fallback al directorio home del usuario actual
LAYA_HOME = os.environ.get("LAYA_HOME", os.path.join(os.path.expanduser("~"), ".laya"))
VENV_DIR = os.path.join(LAYA_HOME, "venvs", "laya")
MARKER = os.path.join(LAYA_HOME, ".installed")
LOG_FILE = os.path.join(LAYA_HOME, "logs", "setup.log")
CHECKPOINT_DEFAULT = "laya-multilingual"

# Alias públicos (docs/HF) -> clave interna del Router
CHECKPOINT_ALIASES = {
    "laya": "english",
    "english": "english",
    "laya-multilingual": "multilingual",
    "multilingual": "multilingual",
    "multi": "multilingual",
    "laya-typed-decisions": "typed-decisions",
    "typed-decisions": "typed-decisions",
    "typed": "typed-decisions",
}

REQUIREMENTS = ["laya>=0.3.0", "torch --index-url https://download.pytorch.org/whl/cpu"]


def venv_python():
    """Detecta el ejecutable de python dentro del venv de LAYA_HOME (Windows/POSIX)."""
    if sys.platform == "win32":
        exe = os.path.join(VENV_DIR, "Scripts", "python.exe")
    else:
        exe = os.path.join(VENV_DIR, "bin", "python")
    return exe if os.path.isfile(exe) else None


def check_installation():
    """
    Verifica la presencia y salud de Laya sin instalar:
    1. Existencia del directorio LAYA_HOME
    2. Existencia del marker .installed
    3. Existencia del ejecutable de python en el venv
    4. Capacidad de importar Router y torch
    Retorna 0 si todo es válido, 1 en caso contrario.
    """
    if not os.path.isdir(LAYA_HOME):
        print(f"[setup_laya --check] FAIL: LAYA_HOME no existe en '{LAYA_HOME}'")
        return 1

    if not os.path.isfile(MARKER):
        print(f"[setup_laya --check] FAIL: Marker no encontrado en '{MARKER}'")
        return 1

    py = venv_python()
    if not py:
        print(f"[setup_laya --check] FAIL: Python del venv no encontrado en '{VENV_DIR}'")
        return 1

    test_code = (
        "import sys; "
        "import torch; "
        "import laya; "
        "from laya import Router; "
        "print(f'[check] Laya {laya.__version__} OK, PyTorch {torch.__version__} OK')"
    )
    try:
        res = subprocess.run([py, "-c", test_code], capture_output=True, text=True, timeout=15)
        if res.returncode == 0:
            print(f"[setup_laya --check] OK: {res.stdout.strip()}")
            return 0
        else:
            print(f"[setup_laya --check] FAIL (exit {res.returncode}): {res.stderr.strip()}")
            return 1
    except Exception as e:
        print(f"[setup_laya --check] FAIL: Excepción durante prueba de import: {e}")
        return 1


def ensure_venv():
    if venv_python():
        print(f"[setup_laya] venv existente: {VENV_DIR}")
        return venv_python()
    print(f"[setup_laya] creando venv en {VENV_DIR} ...")
    venv.create(VENV_DIR, with_pip=True)
    return venv_python()


def pip(python, *args):
    cmd = [python, "-m", "pip", "install", "--upgrade", *args]
    print("[setup_laya] " + " ".join(cmd))
    subprocess.check_call(cmd)


def smoke_test(python, checkpoint):
    key = CHECKPOINT_ALIASES.get(checkpoint, checkpoint)
    if key not in ("english", "multilingual", "typed-decisions"):
        sys.exit(f"[setup_laya] ERROR: checkpoint desconocido '{checkpoint}' "
                 f"(usa: {sorted(CHECKPOINT_ALIASES)})")
    code = (
        "from laya import Router; "
        f"r = Router(default='{key}'); "
        f"r.preload(['{key}']); "
        "out = r.predict({'body': 'Donde queda la sucursal?'}, "
        "{'dept': {'type': 'choice', 'instructions': 'Area?', "
        "'criteria': {'ventas': 'compras', 'soporte': 'ayuda'}}}, "
        f"model='{key}'); "
        "print('[smoke]', out)"
    )
    subprocess.check_call([python, "-c", code])


def main():
    ap = argparse.ArgumentParser(description="Instalador y verificador canónico de Laya compartido")
    ap.add_argument("--check", action="store_true", help="Verifica presencia e import de Laya sin instalar, retorna exit code 0 si ok, 1 si no")
    ap.add_argument("--smoke-only", action="store_true", help="Ejecuta solo la prueba de humo del modelo sin reinstalar dependencias")
    ap.add_argument("--checkpoint", default=CHECKPOINT_DEFAULT, help="Nombre del checkpoint de pesos (default: laya-multilingual)")
    args = ap.parse_args()

    if args.check:
        code = check_installation()
        sys.exit(code)

    os.makedirs(os.path.join(LAYA_HOME, "logs"), exist_ok=True)
    print(f"[setup_laya] log en: {LOG_FILE} (si la ventana se cierra, revisa ese archivo)")
    print("[setup_laya] CONSEJO: ejecuta desde una terminal abierta, no con doble-clic.")

    if sys.version_info < (3, 10):
        sys.exit("[setup_laya] ERROR: se requiere Python >= 3.10")
    if sys.version_info >= (3, 14):
        print("[setup_laya] AVISO: Python >= 3.14; si torch/laya fallan, usa Python 3.11-3.13.")

    python = ensure_venv()
    if not args.smoke_only:
        pip(python, "pip")
        for req in REQUIREMENTS:
            pip(python, *req.split())
    print(f"[setup_laya] smoke test checkpoint '{args.checkpoint}' ...")
    smoke_test(python, args.checkpoint)

    with open(MARKER, "w", encoding="utf-8") as fh:
        fh.write(f"checkpoint={args.checkpoint}\nvenv={VENV_DIR}\n")
    print(f"[setup_laya] OK. Marker: {MARKER}")


class _Tee:
    """Duplica stdout/stderr a consola + archivo de log (sobrevive al cierre)."""

    def __init__(self, *streams):
        self.streams = streams

    def write(self, data):
        for s in self.streams:
            try:
                s.write(data)
            except Exception:
                pass

    def flush(self):
        for s in self.streams:
            try:
                s.flush()
            except Exception:
                pass


if __name__ == "__main__":
    if "--check" in sys.argv:
        # Modo check directo sin Tee a log
        main()
    else:
        os.makedirs(os.path.join(LAYA_HOME, "logs"), exist_ok=True)
        _logfh = open(LOG_FILE, "a", encoding="utf-8")
        sys.stdout = _Tee(sys.stdout, _logfh)
        sys.stderr = _Tee(sys.stderr, _logfh)
        try:
            main()
        except SystemExit as e:
            print(f"[setup_laya] salida con codigo {e.code}")
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[setup_laya] ERROR: {e}")
        finally:
            print(f"[setup_laya] fin. Log completo en: {LOG_FILE}")
