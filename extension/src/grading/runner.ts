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
    const { output, exitCode } = await spawnPytest(cwd, xmlPath);
    let junitXml: string | null = null;
    try {
      junitXml = await fs.readFile(xmlPath, "utf8");
    } catch {
      junitXml = null;
    }
    return { junitXml, output, exitCode };
  } finally {
    // Temp-Ordner immer aufräumen
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

function spawnPytest(
  cwd: string,
  xmlPath: string
): Promise<{ output: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = cp.spawn("python", ["-m", "pytest", `--junitxml=${xmlPath}`], {
      cwd,
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    // "error" feuert z. B., wenn `python` nicht installiert ist
    child.on("error", reject);
    child.on("close", (code) => resolve({ output, exitCode: code }));
  });
}
