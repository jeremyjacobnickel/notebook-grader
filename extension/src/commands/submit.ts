// Command: Bestanden/Nicht-bestanden-Ergebnis ans FH-Backend schicken.

import * as vscode from "vscode";
import { postSubmit } from "../backend/client";
import { getConfig } from "../config";
import { state } from "../state";

export async function submit(): Promise<void> {
  if (!state.lastResult || !state.praktikumId) {
    vscode.window.showErrorMessage(
      "Es gibt noch kein Ergebnis. Führe zuerst " +
        "»Notebook Grader: Tests ausführen« aus."
    );
    return;
  }
  const { backendUrl, courseToken } = getConfig();
  if (!backendUrl || !courseToken) {
    vscode.window.showErrorMessage(
      "Backend ist nicht konfiguriert. Bitte notebookGrader.backendUrl " +
        "und notebookGrader.courseToken in den Einstellungen setzen."
    );
    return;
  }

  const result = state.lastResult;
  try {
    await postSubmit(backendUrl, courseToken, {
      praktikum: state.praktikumId,
      passed: result.isPass,
      score: result.passed,
      total: result.total,
      percentage: result.percentage,
    });
  } catch (error) {
    vscode.window.showErrorMessage(
      `Abgabe fehlgeschlagen: ${(error as Error).message}`
    );
    return;
  }

  vscode.window.showInformationMessage(
    result.isPass
      ? `Abgabe übermittelt: ${state.praktikumId} bestanden ` +
          `(${result.percentage.toFixed(1)} %). 🎉`
      : `Abgabe übermittelt: ${state.praktikumId} noch nicht bestanden ` +
          `(${result.percentage.toFixed(1)} %, mindestens 80 % nötig).`
  );
}
