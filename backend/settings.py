"""Lokale Konfiguration; Schlüssel verlassen dieses Backend nicht."""

import os
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]


def settings():
    # Bei jedem Request neu lesen: ein nachgetragener Key benötigt keinen Neustart.
    return {**dotenv_values(ROOT / ".env"), **os.environ}
