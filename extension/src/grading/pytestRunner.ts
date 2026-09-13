import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import type { CancellationToken } from "vscode";
import { parseJunitXml, TestCaseResult } from "./junitXml";

export interface PytestRun { testcases: TestCaseResult[]; output: string; }

export async function runPytest(cwd: string, pythonPath = "", token?: CancellationToken, subtask?: string): Promise<PytestRun> {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "notebook-grader-"));
  const report = path.join(temp, "report.xml");
  try {
    const args = ["-m", "pytest", "-q", "--tb=short", "--continue-on-collection-errors", `--junitxml=${report}`];
    if (subtask) {
      if (!/^(?:[1-3][a-d]|4)$/.test(subtask)) { throw new Error("Unbekannte Teilaufgabe."); }
      args.push("-k", `test_${subtask}_`);
    }
    let run;
    try { run = await runProcess(pythonPath || "python", args, cwd, token); }
    catch (error) {
      if (!pythonPath && (error as NodeJS.ErrnoException).code === "ENOENT") {
        run = await runProcess("python3", args, cwd, token);
      } else { throw error; }
    }
    if (run.exitCode !== 0 && run.exitCode !== 1) {
      throw new Error(`pytest konnte nicht vollständig laufen (Exit ${run.exitCode}).\n${run.output}`);
    }
    const testcases = parseJunitXml(await fs.readFile(report, "utf8"));
    if (!testcases.length) { throw new Error("Keine Tests gefunden."); }
    return { testcases, output: run.output };
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}

function runProcess(command: string, args: string[], cwd: string, token?: CancellationToken): Promise<{exitCode: number; output: string}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: {...process.env, PYTHONIOENCODING: "utf-8"} });
    let output = "";
    let stopped = "";
    const stop = (reason: string) => { stopped = reason; child.kill("SIGKILL"); };
    const timer = setTimeout(() => stop("Testlauf nach 30 Sekunden abgebrochen. Prüfe Schleifen und Rekursion."), 30000);
    const cancel = token?.onCancellationRequested(() => stop("Testlauf abgebrochen."));
    if (token?.isCancellationRequested) { stop("Testlauf abgebrochen."); }
    const collect = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-100000); };
    child.stdout.on("data", collect); child.stderr.on("data", collect);
    child.on("error", error => { clearTimeout(timer); cancel?.dispose(); reject(error); });
    child.on("close", code => {
      clearTimeout(timer); cancel?.dispose();
      if (stopped) { reject(new Error(stopped)); }
      else { resolve({exitCode: code ?? 2, output}); }
    });
  });
}
