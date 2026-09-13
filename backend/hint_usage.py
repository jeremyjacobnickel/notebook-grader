"""Nur Verbrauchsmetadaten speichern, niemals Prompts, Code oder Schlüssel."""

import json
import math
import sqlite3
from pathlib import Path

from backend.settings import ROOT


def number(value, integer=False):
    try:
        result = float(value)
        if not math.isfinite(result) or result < 0 or isinstance(value, bool):
            return None
        if integer:
            return int(result) if result.is_integer() else None
        return result
    except (ValueError, TypeError, OverflowError):
        return None


def response_usage(response, data, requested_model, duration_ms):
    usage = data.get('usage') or {}
    if not isinstance(usage, dict):
        usage = {}
    reported = data.get('model')
    # Ein zurückgespiegelter Router-Alias belegt kein konkretes Modell.
    reported = reported if isinstance(reported, str) else None
    return {
        'requested_model': requested_model,
        'reported_model': reported,
        'deployment_id': response.headers.get('x-litellm-model-id'),
        'input_tokens': number(usage.get('prompt_tokens'), integer=True),
        'output_tokens': number(usage.get('completion_tokens'), integer=True),
        'total_tokens': number(usage.get('total_tokens'), integer=True),
        'cost_usd': number(response.headers.get('x-litellm-response-cost')),
        'duration_ms': duration_ms,
    }


def save_usage(config, task, usage):
    target = Path(config.get('HINT_USAGE_DB', str(ROOT / '.local' / 'hint_usage.sqlite3')))
    target.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(target) as db:
        db.execute('''CREATE TABLE IF NOT EXISTS hint_usage (
            id INTEGER PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            task TEXT NOT NULL, metadata TEXT NOT NULL)''')
        db.execute('INSERT INTO hint_usage (task, metadata) VALUES (?, ?)',
                   (task, json.dumps(usage, allow_nan=False)))
