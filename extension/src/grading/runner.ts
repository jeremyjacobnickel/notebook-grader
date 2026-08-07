// Führt `python -m pytest` aus und liefert die JUnit-XML zurück.
// --junitxml gehört zu pytest selbst, es ist kein Plugin nötig.

import * as cp from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

export interface PytestRun {
  // null, wenn pytest keine XML geschrieben hat (z. B. Startfehler)
  junitXml: string | null;
  // stdout + stderr gemischt — wird als "traceback" für den KI-Tipp gemerkt
  output: string;
  exitCode: number | null;
}

export async function runPytest(cwd: string): Promise<PytestRun> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "notebook-grader-"));
  const xmlPath = path.join(tmpDir, "results.xml");
  try {
    let result;
    try {
      result = await spawnPytest("python", cwd, xmlPath);
    } catch (error) {
      // Auf macOS heißt der Befehl oft nur `python3` — bei "nicht
      // gefunden" (ENOENT) einmal damit nachprobieren.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        result = await spawnPytest("python3", cwd, xmlPath);
      } else {
        throw error;
      }
    }
    let junitXml: string | null = null;
    try {
      junitXml = await fs.readFile(xmlPath, "utf8");
    } catch {
      junitXml = null;
    }
    return { junitXml, output: result.output, exitCode: result.exitCode };
  } finally {
    // Temp-Ordner immer aufräumen
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

function spawnPytest(
  command: string,
  cwd: string,
  xmlPath: string
): Promise<{ output: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    // --continue-on-collection-errors: eine Aufgaben-Datei mit Syntaxfehler
    // soll nicht den ganzen Testlauf der übrigen Aufgaben stoppen
    const child = cp.spawn(
      command,
      ["-m", "pytest", "--continue-on-collection-errors", `--junitxml=${xmlPath}`],
      { cwd }
    );
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    // "error" feuert z. B., wenn der Befehl nicht installiert ist
    child.on("error", reject);
    child.on("close", (code) => resolve({ output, exitCode: code }));
  });
}
