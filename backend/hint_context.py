"""Teilaufgaben auswählen, ohne studentischen Code auszuführen."""

import ast
import re

from fastapi import HTTPException

# Erwartete Namen plus ausdrücklich benötigte Grundlagen der Teilaufgabe.
TASK_NAMES = {
    '1a': ['factorial_iter', 'factorial'],
    '1b': ['factorial_rec', 'factorial'],
    '2a/b': ['A', 'a_00', 'a_12'],
    '2c': ['A', 'submatrix', 'A_00', 'A_12'],
    '2d': ['A', 'submatrix', 'det_laplace', 'det_A'],
    '3a': ['remove_punctuation'],
    '3b': ['echo_word'],
    '3c': ['remove_punctuation', 'echo_word', 'echo'],
    '4': ['insertion_sort'],
}


def task_id(label):
    key = label.split(' – ')[0].strip()
    if key not in TASK_NAMES:
        raise HTTPException(422, 'Bitte eine konkrete Teilaufgabe auswählen.')
    return key


def assignment_context(assignment, key):
    sections = re.split(r'(?m)(?=^## \d+\. Aufgabe:)', assignment)
    section = next(part for part in sections if part.startswith(f'## {key[0]}. Aufgabe:'))
    parts = re.split(r'(?m)(?=^\*\*[a-d]\)\*\*)', section)
    wanted = {'a', 'b'} if key == '2a/b' else set(key[1:])
    if not wanted:
        return section.split('\n---')[0].strip()
    return '\n'.join([parts[0]] + [p for p in parts[1:] if p[2] in wanted]).strip()


def code_context(code, key):
    try:
        tree = ast.parse(code)
    except SyntaxError:
        # Keine unsichere Textauswahl: bei kaputtem Syntaxbaum keinen gesamten
        # Praktikumscode als stillen Fallback an das Sprachmodell übertragen.
        return '[Code wegen Syntaxfehler nicht sicher zuordenbar. Bitte zuerst die lokale Syntaxmeldung prüfen.]'
    names = set(TASK_NAMES[key])
    selected = []
    # Abhängigkeiten transitiv aufnehmen (Hilfsfunktionen, Konstanten, Imports).
    changed = True
    while changed:
        changed = False
        for node in tree.body:
            if node in selected:
                continue
            defined = set()
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                defined.add(node.name)
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                defined.update(alias.asname or alias.name.split('.')[0] for alias in node.names)
            else:
                defined.update(n.id for n in ast.walk(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store))
            if defined & names:
                selected.append(node)
                names.update(n.id for n in ast.walk(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load))
                changed = True
    lines = code.splitlines()
    chunks = []
    for node in sorted(selected, key=lambda item: item.lineno):
        start = min([node.lineno] + [d.lineno for d in getattr(node, 'decorator_list', [])])
        chunks.append('\n'.join(lines[start - 1:node.end_lineno]))
    return '\n\n'.join(chunks) or '[Keine zuordenbare Implementierung gefunden; der Funktionsname könnte abweichen.]'


def error_context(traceback, key):
    prefixes = ['2a', '2b'] if key == '2a/b' else [key]
    # pytest --tb=short: jeder Fehler beginnt mit einer Unterstrich-Überschrift.
    blocks = re.split(r'(?m)(?=^_{3,} .+ _{3,}\s*$)', traceback)
    chosen = []
    for block in blocks:
        title = block.splitlines()[0] if block else ''
        if any(re.search(r'\btest_' + prefix + r'_', title) for prefix in prefixes):
            # Globale Zusammenfassung am Ende gehört nicht zur Teilaufgabe.
            chosen.append(re.split(r'(?m)^={3,}', block)[0].strip())
    return '\n\n'.join(chosen)[:6000] or '[Keine eindeutig zugeordnete aktuelle Testfehlermeldung verfügbar.]'


def build_context(payload, assignment):
    key = task_id(payload.task)
    return key, assignment_context(assignment, key), code_context(payload.code, key), error_context(payload.traceback, key)
