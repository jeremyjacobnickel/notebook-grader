"""Lokale Vorprüfung und teilaufgabenbezogenes Laden; keine Serverausführung."""

import ast

import pytest

REQUIRED = {
    '1a': ['factorial_iter'], '1b': ['factorial_rec'],
    '2a': ['A'], '2b': ['a_00', 'a_12'],
    '2c_submatrix_function': ['submatrix'], '2c_submatrix_variables': ['A_00', 'A_12'],
    '2d_determinants': ['det_laplace'], '2d_determinant_variable': ['det_A'],
    '2d_recursion': ['det_laplace'], '3a': ['remove_punctuation'],
    '3b': ['echo_word'], '3c': ['echo'], '4': ['insertion_sort'],
}


def defined_names(node):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return {node.name}
    if isinstance(node, (ast.Import, ast.ImportFrom)):
        return {alias.asname or alias.name.split('.')[0] for alias in node.names}
    return {n.id for n in ast.walk(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)}


def placeholder(node):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        body = [n for n in node.body if not (isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant)
                                            and isinstance(n.value.value, str))]
        if not body:
            return True
        for item in body:
            if isinstance(item, ast.Pass):
                continue
            if isinstance(item, ast.Return) and (item.value is None or isinstance(item.value, ast.Constant) and item.value.value is None):
                continue
            if isinstance(item, ast.Expr) and isinstance(item.value, ast.Constant) and item.value.value is Ellipsis:
                continue
            if isinstance(item, ast.Raise):
                exc = item.exc.func if isinstance(item.exc, ast.Call) else item.exc
                if isinstance(exc, ast.Name) and exc.id == 'NotImplementedError':
                    continue
            return False
        return True
    if isinstance(node, (ast.Assign, ast.AnnAssign)):
        return node.value is None or isinstance(node.value, ast.Constant) and node.value.value is None
    return False


def load_for_test(source, test_name):
    try:
        tree = ast.parse(source.read_text(encoding='utf-8'), filename=str(source))
    except SyntaxError as error:
        pytest.fail(f'EXECUTION: Syntaxfehler in Zeile {error.lineno}: {error.msg}', pytrace=False)
    key = test_name.removeprefix('test_')
    required = next(value for prefix, value in REQUIRED.items() if key == prefix or key.startswith(prefix + '_'))
    names = set(required)
    selected = []
    definitions = {}
    for node in tree.body:
        for name in defined_names(node):
            definitions[name] = node
    for name in required:
        node = definitions.get(name)
        if node is None:
            pytest.skip(f'MISSING: {name} fehlt. Prüfe den geforderten Namen in der Aufgabenstellung.')
        if placeholder(node):
            pytest.skip(f'OPEN: {name} enthält noch einen Platzhalter.')
    changed = True
    while changed:
        changed = False
        for node in tree.body:
            if node not in selected and defined_names(node) & names:
                selected.append(node)
                names.update(n.id for n in ast.walk(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load))
                changed = True
    module = ast.Module(body=sorted(selected, key=lambda node: node.lineno), type_ignores=[])
    namespace = {'__name__': '__grader__', '__file__': str(source)}
    try:
        exec(compile(module, str(source), 'exec'), namespace)
    except Exception as error:
        pytest.fail(f'EXECUTION: {type(error).__name__}: {error}', pytrace=False)
    return namespace
