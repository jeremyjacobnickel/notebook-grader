// HTTP-Client für das FH-Backend. Nutzt das eingebaute fetch (Node 18+).
// Wichtig: Der courseToken wandert nur in den Authorization-Header,
// nie in Logs oder Fehlermeldungen.

export interface SubmitPayload {
  praktikum: string;
  passed: boolean;
  score: number;
  total: number;
  percentage: number;
}

export interface HintPayload {
  praktikum: string;
  code: string;
  traceback: string;
  task?: string;
  question?: string;
}

/** Schickt das Ergebnis an POST {backendUrl}/submit. */
export async function postSubmit(
  backendUrl: string,
  courseToken: string,
  payload: SubmitPayload
): Promise<void> {
  const response = await postJson(`${backendUrl}/submit`, courseToken, payload);
  if (response.ok !== true) {
    throw new Error("Das Backend hat die Abgabe nicht bestätigt.");
  }
}

/** Holt einen sokratischen Tipp von POST {backendUrl}/hint. */
export async function postHint(
  backendUrl: string,
  courseToken: string,
  payload: HintPayload
): Promise<string> {
  const response = await postJson(`${backendUrl}/hint`, courseToken, payload);
  if (typeof response.hint !== "string") {
    throw new Error("Das Backend hat keinen Tipp zurückgegeben.");
  }
  return response.hint;
}

async function postJson(
  url: string,
  courseToken: string,
  body: unknown
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${courseToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(70000),
    });
  } catch {
    // fetch wirft z. B. bei DNS-Fehler oder abgelehnter Verbindung.
    throw new Error(
      "Das Backend ist nicht erreichbar. Bitte prüfe die Einstellung " +
        "notebookGrader.backendUrl und deine Internetverbindung."
    );
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { detail?: unknown };
    throw new Error(
      typeof error.detail === "string" ? error.detail : `Das Backend hat mit Status ${response.status} geantwortet.`
    );
  }
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Das Backend hat kein gültiges JSON zurückgegeben.");
  }
}
