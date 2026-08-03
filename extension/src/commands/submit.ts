// Schickt das letzte Testergebnis an das FH-Backend (POST /submit).

import * as vscode from "vscode";
import { getBackendConfig } from "../config";
import { submitResult } from "../backend/client";
import { state, currentPraktikumId } from "../state";

export async function submit(): Promise<void> {
  const score = state.lastScore;
  if (!score) {
    void vscode.window.showInformationMessage(
      "Notebook Grader: Bitte zuerst die Tests ausführen (Notebook Grader: Tests ausführen)."
    );
    return;
  }

  const praktikum = currentPraktikumId();
  if (!praktikum) {
    void vscode.window.showErrorMessage(
      "Notebook Grader: Kein Praktikum geladen — bitte zuerst eines laden."
    );
    return;
  }

  const config = getBackendConfig();
  if (!config) {
    void vscode.window.showErrorMessage(
      "Notebook Grader: backendUrl und courseToken in den Einstellungen setzen (notebookGrader.*)."
    );
    return;
  }

  try {
    await submitResult(config, praktikum, score);
    const status = score.isPass ? "bestanden" : "nicht bestanden";
    void vscode.window.showInformationMessage(
      `Notebook Grader: Abgegeben — ${score.passed}/${score.total} Punkte (${score.percentage} %), ${status}.`
    );
  } catch {
    // Bewusst keine technischen Details — freundliche Meldung reicht
    void vscode.window.showErrorMessage(
      "Notebook Grader: Das Backend ist gerade nicht erreichbar. Bitte später erneut abgeben."
    );
  }
}
