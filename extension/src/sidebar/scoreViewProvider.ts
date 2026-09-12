import * as vscode from "vscode";
import { randomBytes } from "crypto";
import { ScoreResult } from "../grading/score";
import { TestCaseResult } from "../grading/junitXml";

export class ScoreViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "notebookGrader.scoreView";
  private view: vscode.WebviewView | undefined;
  private result: ScoreResult | undefined;
  private cases: TestCaseResult[] = [];
  private hint = "";
  private message = "Praktikum laden oder eine vorhandene Praktikums-Datei öffnen.";

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {enableScripts: true};
    view.webview.onDidReceiveMessage((message: {command?: string}) => {
      if (["loadPraktikum", "runTests", "hint", "submit", "showAssignment", "showOutput"].includes(message.command || "")) {
        vscode.commands.executeCommand(`notebookGrader.${message.command}`);
      }
    });
    this.render();
  }
  reset(message = "Noch kein aktueller Testlauf."): void {
    this.result = undefined; this.cases = []; this.hint = ""; this.message = message; this.render();
  }
  showResult(result: ScoreResult, cases: TestCaseResult[] = []): void {
    this.result = result; this.cases = cases; this.hint = ""; this.render();
  }
  showHint(hint: string): void { this.hint = hint; this.render(); this.view?.show?.(true); }
  private render(): void { if (this.view) { this.view.webview.html = this.html(); } }
  private html(): string {
    const nonce = randomBytes(16).toString("hex");
    const result = this.result;
    const score = result ? `<p class="score">${result.passed} / ${result.total} Punkte · ${result.percentage.toFixed(1)} %</p>
      <p class="${result.isPass ? "pass" : "fail"}">${result.isPass ? "Bestanden" : "Noch nicht bestanden"}</p>` : `<p>${escape(this.message)}</p>`;
    const tests = this.cases.map(test => `<li class="${test.passed ? "pass" : "fail"}">${test.passed ? "✓" : "×"} ${escape(testLabel(test.name))}</li>`).join("");
    return `<!doctype html><html lang="de"><head><meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <style>
      body{font-family:var(--vscode-font-family);padding:10px;color:var(--vscode-foreground)}
      h2{font-size:17px;margin:0 0 8px}.muted{color:var(--vscode-descriptionForeground);font-size:12px}
      .score{font-size:20px;font-weight:600}.pass{color:var(--vscode-testing-iconPassed)}.fail{color:var(--vscode-testing-iconFailed)}
      button{cursor:pointer;border:0;padding:8px 10px;margin:3px 2px 3px 0;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border-radius:3px}
      button:disabled{opacity:.5;cursor:default}button:hover{background:var(--vscode-button-hoverBackground)}
      ul{list-style:none;padding:0;font-size:12px}li{margin:6px 0}.hint{white-space:pre-wrap;line-height:1.5;padding:12px;border-left:3px solid var(--vscode-focusBorder);background:var(--vscode-textBlockQuote-background)}
      </style></head><body><h2>Praktikumsbegleiter</h2><div class="muted">Lokal testen · Mit FH-LiteLLM lernen</div>
      <p><button data-command="loadPraktikum">Praktikum laden</button><button data-command="showAssignment">Aufgaben öffnen</button></p>
      ${score}<button data-command="runTests">Tests ausführen</button><button data-command="showOutput">Testdetails</button>
      ${tests ? `<details ${this.hint ? "" : "open"}><summary>Prüfungen</summary><ul>${tests}</ul></details>` : ""}
      <p><button data-command="hint">KI-Tipp holen</button><button data-command="submit" ${result ? "" : "disabled"}>Ergebnis abgeben</button></p>
      <p class="muted">Für Tipps werden die Praktikums-Datei, deine Frage und aktuelle Testfehler an das Backend und FH-LiteLLM gesendet.</p>
      ${this.hint ? `<h3>Dein nächster Schritt</h3><div class="hint">${escape(this.hint)}</div>` : ""}
      <script nonce="${nonce}">const api=acquireVsCodeApi();document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>api.postMessage({command:b.dataset.command})));</script></body></html>`;
  }
}
function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function testLabel(name: string): string {
  const labels: Record<string, string> = {
    test_1a_iterative_values: "1a · Fakultätswerte", test_1a_negative_number: "1a · Negative Zahlen",
    test_1a_iteration: "1a · Iterative Umsetzung", test_1b_recursive_values: "1b · Fakultätswerte",
    test_1b_negative_number: "1b · Negative Zahlen", test_1b_recursion: "1b · Rekursiver Aufruf",
    test_2a_matrix: "2a · Zufallsmatrix", test_2b_elements: "2b · Matrixelemente",
    test_2c_submatrix_function: "2c · Untermatrix-Funktion", test_2c_submatrix_variables: "2c · A_00 und A_12",
    test_2d_determinants: "2d · Determinanten berechnen", test_2d_determinant_variable: "2d · Wert von det_A",
    test_2d_recursion: "2d · Rekursive Entwicklung", test_3a_punctuation: "3a · Satzzeichen entfernen",
    test_3b_word: "3b · Echo eines Wortes", test_3c_sentence: "3c · Echo eines Satzes",
    test_3c_reuses_functions: "3c · Hilfsfunktionen verwenden", test_4_sort_values: "4 · Neue sortierte Liste",
    test_4_insertion_structure: "4 · Insertion-Sort-Verfahren"
  };
  return labels[name] || name.replace(/^test_/, "").replaceAll("_", " ");
}
