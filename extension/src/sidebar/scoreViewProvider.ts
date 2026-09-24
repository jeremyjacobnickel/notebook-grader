import { feedback, isOpen, subtaskSummary, testPrefix } from "../grading/feedback";
import { NotebookTask } from "../notebook";
import { HintUsage } from "../backend/client";
import { usageText } from "./usageText";
import * as vscode from "vscode";
import { randomBytes } from "crypto";
import { ScoreResult } from "../grading/score";
import { TestCaseResult } from "../grading/junitXml";

export class ScoreViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "notebookGrader.scoreView";
  private view: vscode.WebviewView | undefined;
  private result: ScoreResult | undefined;
  private cases: TestCaseResult[] = [];
  private tasks: NotebookTask[] = [];
  private hint = "";
  private subtask: string | undefined;
  private usage: HintUsage | undefined;
  private message = "Praktikum laden oder eine vorhandene Praktikums-Datei öffnen.";

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {enableScripts: true};
    view.webview.onDidReceiveMessage((message: {command?: string}) => {
      if (["loadPraktikum", "runTests", "testSubtask", "hint", "submit", "showAssignment", "showOutput"].includes(message.command || "")) {
        vscode.commands.executeCommand(`notebookGrader.${message.command}`);
      }
    });
    this.render();
  }
  reset(message = "Noch kein aktueller Testlauf."): void {
    this.result = undefined; this.subtask = undefined; this.cases = []; this.hint = ""; this.message = message; this.render();
  }
  showResult(result: ScoreResult, cases: TestCaseResult[], tasks: NotebookTask[], subtask?: string): void {
    this.subtask = subtask; this.tasks = tasks;
    this.result = result; this.cases = cases; this.hint = ""; this.render();
  }
  showHint(hint: string, usage?: HintUsage): void { this.hint = hint; this.usage = usage; this.render(); this.view?.show?.(true); }
  private render(): void { if (this.view) { this.view.webview.html = this.html(); } }
  private html(): string {
    const nonce = randomBytes(16).toString("hex");
    const result = this.result;
    const score = result ? `<p>${this.subtask ? `Teilaufgabe ${escape(this.subtask)}` : "Gesamtes Praktikum"}</p><p class="score">${result.passed} / ${result.total} Punkte · ${result.percentage.toFixed(1)} %</p>
      <p class="${result.isPass ? "pass" : "fail"}">${this.subtask ? (result.passed === result.total ? "Teilaufgabe bestanden" : "Teilaufgabe noch nicht vollständig bestanden") : result.isPass ? "Bestanden" : "Noch nicht bestanden"}</p>` : `<p>${escape(this.message)}</p>`;
    const tests = this.cases.map(test => `<li class="${test.passed ? "pass" : isOpen(test) ? "muted" : "fail"}">${test.passed ? "✓" : isOpen(test) ? "○" : "×"} ${escape(testLabel(test.name))}<br>${escape(feedback(test))}${test.detail ? `<details><summary>Fehlerdetails</summary><pre style="white-space:pre-wrap">${escape(test.detail)}</pre></details>` : ""}</li>`).join("");
    const progress = this.cases.some(c => this.tasks.some(t => c.name.startsWith(testPrefix(t.id))))
      ? `<h3>Teilaufgaben</h3><ul>${subtaskSummary(this.cases, this.tasks).map(line => `<li>${escape(line)}</li>`).join("")}</ul>` : "";
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
      ${score}<button data-command="runTests">Alle Tests ausführen</button><button data-command="testSubtask">Teilaufgabe prüfen</button><button data-command="showOutput">Testdetails</button>
      ${progress}
      ${tests ? `<details ${this.hint ? "" : "open"}><summary>Prüfungen</summary><ul>${tests}</ul></details>` : ""}
      <p><button data-command="hint">KI-Tipp holen</button><button data-command="submit" ${result && !this.subtask ? "" : "disabled"}>Ergebnis abgeben</button></p>
      <p class="muted">Für einen Tipp gehen nur Setup-Code und deine Antwortzellen der gewählten Aufgabe (bis zur gewählten Teilaufgabe), zugeordnete Testfehler und deine Frage über das Backend an FH-LiteLLM.</p>
      ${this.hint ? `<h3>Dein nächster Schritt</h3><div class="hint">${escape(this.hint)}</div><details><summary>KI-Verbrauch</summary><p class="hint muted">${escape(usageText(this.usage))}</p></details>` : ""}
      <script nonce="${nonce}">const api=acquireVsCodeApi();document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>api.postMessage({command:b.dataset.command})));</script></body></html>`;
  }
}
function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function testLabel(name: string): string {
  return name.replace(/^test_/, "").replaceAll("_", " ");
}
