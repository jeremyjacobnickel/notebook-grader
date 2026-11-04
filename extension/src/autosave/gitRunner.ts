// System-Git aufrufen, ohne dass Tokens in Argumenten, URLs oder Konfiguration landen.

import { execFile } from "child_process";

export type GitResult = { code: number; stdout: string; stderr: string };

/** Mindestversion für Konfiguration über GIT_CONFIG_COUNT. */
export const MIN_GIT_VERSION: [number, number] = [2, 31];

export function runGit(args: string[], cwd: string, env: NodeJS.ProcessEnv = {}): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    // Rohe Bytes statt encoding "utf8": Im Extension Host von VS Code schlug das
    // Dekodieren der Streams fehl ("StringDecoder is not a constructor").
    execFile("git", args, {
      cwd,
      encoding: "buffer",
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        // Nie interaktiv nachfragen: ohne gültiges Token schlägt der Aufruf fehl.
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "",
        SSH_ASKPASS: "",
        GIT_EDITOR: "true",
        LC_ALL: "C",
        ...env,
      },
    }, (error, stdout, stderr) => {
      if (error && typeof error.code !== "number") {
        reject(new Error((error as NodeJS.ErrnoException).code === "ENOENT"
          ? "Git wurde nicht gefunden. Bitte Git installieren (mindestens Version 2.31)."
          : `Git-Aufruf fehlgeschlagen: ${error.message}`));
        return;
      }
      resolve({ code: error ? Number(error.code) : 0, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") });
    });
  });
}

/**
 * Umgebung für Netzwerkzugriffe: andere Credential-Helper (z. B. Schlüsselbund)
 * werden abgeschaltet, das Token steht nur in einer Umgebungsvariablen des
 * Git-Prozesses. Benutzername "oauth2" funktioniert bei GitLab für PAT und OAuth.
 */
export function credentialEnv(token: string | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    GIT_CONFIG_COUNT: token ? "2" : "1",
    GIT_CONFIG_KEY_0: "credential.helper",
    GIT_CONFIG_VALUE_0: "",
  };
  if (token) {
    env.GIT_CONFIG_KEY_1 = "credential.helper";
    env.GIT_CONFIG_VALUE_1 =
      "!f() { test \"$1\" = get && printf 'username=oauth2\\npassword=%s\\n' \"$NOTEBOOK_GRADER_GIT_TOKEN\"; }; f";
    env.NOTEBOOK_GRADER_GIT_TOKEN = token;
  }
  return env;
}

export function parseGitVersion(output: string): [number, number] | undefined {
  const match = /git version (\d+)\.(\d+)/.exec(output);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

export function isSupportedGitVersion(version: [number, number]): boolean {
  return version[0] > MIN_GIT_VERSION[0] || (version[0] === MIN_GIT_VERSION[0] && version[1] >= MIN_GIT_VERSION[1]);
}

/** Verständliche Meldung aus der Git-Fehlerausgabe; enthält nie das Token. */
export function describeGitError(stderr: string): string {
  if (/Authentication failed|Access denied|could not read Username|terminal prompts disabled|HTTP Basic/i.test(stderr)) {
    return "GitLab hat die Anmeldung abgelehnt. Token fehlt, ist abgelaufen oder hat keinen Scope write_repository.";
  }
  if (/Could not resolve host|Failed to connect|Connection timed out|Network is unreachable/i.test(stderr)) {
    return "GitLab ist nicht erreichbar (offline?). Der Stand ist lokal gesichert und wird später übertragen.";
  }
  if (/not found|does not appear to be a git repository/i.test(stderr)) {
    return "Repository nicht gefunden. Bitte die Repository-URL prüfen.";
  }
  const line = stderr.split("\n").map(text => text.trim()).find(text => text && !text.startsWith("hint:"));
  return line ?? "Unbekannter Git-Fehler.";
}
