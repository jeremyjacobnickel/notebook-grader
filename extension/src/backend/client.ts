// HTTP-Client für das FH-Backend. Nutzt die eingebaute fetch-API
// (Node 18+), keine zusätzliche HTTP-Bibliothek.
// Der courseToken wandert nur in den Authorization-Header — nie ins Log.

import type { BackendConfig } from "../config";
import type { ScoreResult } from "../grading/score";

export async function submitResult(
  config: BackendConfig,
  praktikum: string,
  score: ScoreResult
): Promise<void> {
  const body = {
    praktikum,
    passed: score.isPass,
    score: score.passed,
    total: score.total,
    percentage: score.percentage,
  };
  const data = await postJson(config, "/submit", body);
  if (data.ok !== true) {
    throw new Error("Backend hat die Abgabe nicht bestätigt.");
  }
}

export async function requestHint(
  config: BackendConfig,
  praktikum: string,
  code: string,
  traceback: string
): Promise<string> {
  const data = await postJson(config, "/hint", { praktikum, code, traceback });
  if (typeof data.hint !== "string") {
    throw new Error("Backend-Antwort enthält keinen Tipp.");
  }
  return data.hint;
}

async function postJson(
  config: BackendConfig,
  route: string,
  body: unknown
): Promise<Record<string, unknown>> {
  const response = await fetch(config.backendUrl + route, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.courseToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Backend antwortete mit HTTP ${response.status}.`);
  }
  return (await response.json()) as Record<string, unknown>;
}
