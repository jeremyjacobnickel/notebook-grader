"""Häufige Markdown-/LaTeX-Markierungen in lesbaren Tutor-Klartext umwandeln."""

import re


def math_text(match):
    text = match.group(1)
    # Geschachtelte einfache Brüche von innen nach außen umformen.
    for _ in range(10):
        updated = re.sub(r'\\frac\{([^{}]*)\}\{([^{}]*)\}', r'(\1)/(\2)', text)
        updated = re.sub(r'\\sqrt\{([^{}]*)\}', r'√(\1)', updated)
        updated = re.sub(r'\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}', r'\1', updated)
        if updated == text:
            break
        text = updated
    symbols = {'cdot': '·', 'times': '×', 'leq': '≤', 'geq': '≥', 'neq': '≠',
               'le': '≤', 'ge': '≥', 'to': '→', 'infty': '∞', 'sum': 'Σ',
               'prod': 'Π', 'in': '∈', 'ldots': '…', 'dots': '…',
               'left': '', 'right': ''}
    text = re.sub(r'\\([A-Za-z]+)', lambda m: symbols.get(m.group(1), m.group(1)), text)
    text = re.sub(r'([_^])\{([^{}]*)\}', r'\1(\2)', text)
    return text.replace('\\,', ' ').replace('\\;', ' ').replace('\\!', '')


def plain_text(text):
    # Code als Klartext erhalten: insbesondere **, _ und $ darin nicht verändern.
    code_parts = []
    def keep_code(match):
        code_parts.append(match.group(1))
        return f'\x00CODE{len(code_parts) - 1}\x00'
    text = re.sub(r'```[^\n]*\n([\s\S]*?)```', keep_code, text)
    text = re.sub(r'`([^`\n]+)`', keep_code, text)
    for pattern in (r'\$\$([\s\S]*?)\$\$', r'\\\[([\s\S]*?)\\\]',
                    r'\\\(([\s\S]*?)\\\)', r'(?<!\\)\$([^$\n]+?)\$'):
        text = re.sub(pattern, math_text, text)
    text = re.sub(r'(?m)^ {0,3}#{1,6}\s+', '', text)
    text = re.sub(r'\*\*([^\n]+?)\*\*', r'\1', text)
    text = re.sub(r'(?<!\w)__([^\n]+?)__(?!\w)', r'\1', text)
    text = re.sub(r'(?<![\w*])\*([^*\n]+?)\*(?!\w)', r'\1', text)
    text = re.sub(r'(?<!\w)_([^_\n]+?)_(?!\w)', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1 (\2)', text)
    for index, code in enumerate(code_parts):
        text = text.replace(f'\x00CODE{index}\x00', code)
    return text.strip()
