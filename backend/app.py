"""Lokaler Prototyp: authentifizierte Tipps und SQLite-Abgaben, keine Codeausführung."""

import hashlib
import secrets
import sqlite3
import threading
import time
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from backend.settings import ROOT, settings
from backend.tutor import get_hint

app = FastAPI(title="Praktikum 5 – lokales Backend", version="0.2.0")
hint_times: dict[str, list[float]] = {}
rate_lock = threading.Lock()


def authenticate(authorization: Annotated[str | None, Header()] = None):
    expected = settings().get("COURSE_TOKEN", "")
    if not expected:
        raise HTTPException(503, "COURSE_TOKEN fehlt im Backend.")
    if not authorization or not secrets.compare_digest(authorization, f"Bearer {expected}"):
        raise HTTPException(401, "Ungültiges Kurs-Token.")
    # Prototyp: genau eine lokale Identität, ohne Klarnamen oder Token in der DB.
    return hashlib.sha256(expected.encode()).hexdigest()[:16]


class HintRequest(BaseModel):
    praktikum: Literal["5_praktikum"]
    code: str = Field(max_length=40000)
    traceback: str = Field(default="", max_length=16000)
    task: str = Field(default="Gesamtes Praktikum", max_length=120)
    question: str = Field(default="Was ist mein nächster Schritt?", max_length=2000)


class Submission(BaseModel):
    praktikum: Literal["5_praktikum"]
    passed: bool
    score: int = Field(ge=0, le=10000)
    total: int = Field(gt=0, le=10000)
    percentage: float = Field(ge=0, le=100)


def health():
    return {"ok": True, "ai_configured": bool(settings().get("LITELLM_API_KEY"))}


def hint(payload: HintRequest, identity: str = Depends(authenticate)):
    now = time.monotonic()
    with rate_lock:
        recent = [stamp for stamp in hint_times.get(identity, []) if now - stamp < 60]
        if len(recent) >= 6:
            raise HTTPException(429, "Maximal sechs Tipps pro Minute. Bitte kurz warten.")
        hint_times[identity] = recent + [now]
    return {"hint": get_hint(payload)}


def submit(payload: Submission, identity: str = Depends(authenticate)):
    percentage = round(payload.score / payload.total * 100, 1)
    passed = payload.score * 100 >= payload.total * 80
    if payload.score > payload.total or payload.passed != passed or abs(payload.percentage - percentage) > 0.01:
        raise HTTPException(422, "Punktestand und Bestehensstatus widersprechen sich.")
    target = Path(settings().get("SUBMISSIONS_DB", str(ROOT / ".local" / "submissions.sqlite3")))
    target.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(target) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY, student TEXT, praktikum TEXT, score INTEGER,
            total INTEGER, passed INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
        cursor = db.execute(
            "INSERT INTO submissions (student, praktikum, score, total, passed) VALUES (?, ?, ?, ?, ?)",
            (identity, payload.praktikum, payload.score, payload.total, int(passed)),
        )
    return {"ok": True, "submission_id": cursor.lastrowid}


# Explizite Registrierung statt eigener Decorators.
app.add_api_route("/health", health, methods=["GET"])
app.add_api_route("/hint", hint, methods=["POST"])
app.add_api_route("/submit", submit, methods=["POST"])
