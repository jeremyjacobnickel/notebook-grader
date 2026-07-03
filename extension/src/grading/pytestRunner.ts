// Führt pytest in einem Ordner aus und liefert die geparsten Testergebnisse.

import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { parseJunitXml, TestCaseResult } from "./junitXml";

export interface PytestRun {
  testcases: TestCaseResult[];
  /** Komplette stdout/stderr-Ausgabe von pytest (für den KI-Tipp). */
  output: string;
}

/**
 * Startet `python -m pytest --junitxml=<tmpfile>` im angegebenen Ordner
 * und parst die JUnit-XML. Wirft einen Error mit verständlicher Meldung,
 * wenn python/pytest fehlt oder pytest nicht bis zum Report kommt.
 */
export async function runPytest(cwd: string): Promise<PytestRun> {
  const reportFile = path.join(
    os.tmpdir(),
    `notebook-grader-${Date.now()}-${Math.random().toString(36).slice(2)}.xml`
  );
  try {
    const run = await runPython(cwd, [
      "-m",
      "pytest",
      `--junitxml=${reportFile}`,
    ]);

    // Exit-Code 0 = alles grün, 1 = Tests fehlgeschlagen — in beiden
    // Fällen hat pytest einen Report geschrieben. Alles andere
    // (Sammelfehler, kein pytest, keine Tests) melden wir als Fehler.
    let xml: string;
    try {
      xml = await fs.readFile(reportFile, "utf8");
    } catch {
      throw new Error(
        `pytest hat keinen Report geschrieben. Ist pytest installiert ` +
          `(python -m pip install pytest)?\n\n${run.output.trim()}`
      );
    }

    const testcases = parseJunitXml(xml);
    if (testcases.length === 0 && run.exitCode !== 0) {
      throw new Error(
        `pytest hat keine Tests gefunden oder konnte sie nicht laden:\n\n` +
          run.output.trim()
      );
    }
    return { testcases, output: run.output };
  } finally {
    await fs.rm(reportFile, { force: true });
  }
}

interface ProcessRun {
  exitCode: number;
  output: string;
}

// Versucht erst `python`, dann `python3` (auf macOS/Linux heisst der
// Interpreter ausserhalb von venvs meist python3).
async function runPython(cwd: string, args: string[]): Promise<ProcessRun> {
  try {
    return await runProcess("python", args, cwd);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        return await runProcess("python3", args, cwd);
      } catch (retryError) {
        if ((retryError as NodeJS.ErrnoException).code === "ENOENT") {
          throw new Error(
            "Python wurde nicht gefunden. Bitte Python installieren und " +
              "sicherstellen, dass `python` oder `python3` im PATH liegt."
          );
        }
        throw retryError;
      }
    }
    throw error;
  }
}

function runProcess(
  command: string,
  args: string[],
  cwd: string
): Promise<ProcessRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ exitCode: code ?? 1, output }));
  });
}
