// Schreibgeschütztes Dateisystem für frühere Autosave-Stände.
//
// Notebooks lassen sich in VS Code nur über ein FileSystemProvider öffnen bzw.
// vergleichen (wie es die eingebaute Git-Extension mit "git:" macht).
// URI-Aufbau: notebook-grader-autosave:/<stand>/<praktikum-id>/<notebook>.ipynb

import * as vscode from "vscode";
import { SnapshotRepo } from "./snapshotRepo";

export const SNAPSHOT_SCHEME = "notebook-grader-autosave";

export function snapshotUri(ref: string, file: string): vscode.Uri {
  return vscode.Uri.from({ scheme: SNAPSHOT_SCHEME, path: `/${ref}/${file}` });
}

export class SnapshotFileSystem implements vscode.FileSystemProvider {
  private readonly changes = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this.changes.event;

  constructor(private readonly currentRepo: () => SnapshotRepo | undefined) {}

  watch(): vscode.Disposable { return new vscode.Disposable(() => undefined); }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const content = await this.readFile(uri);
    return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: content.byteLength,
      permissions: vscode.FilePermission.Readonly };
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const [, ref, ...rest] = uri.path.split("/");
    const repo = this.currentRepo();
    const content = repo && ref && rest.length ? await repo.readFile(ref, rest.join("/")) : undefined;
    if (content === undefined) { throw vscode.FileSystemError.FileNotFound(uri); }
    return Buffer.from(content, "utf8");
  }

  readDirectory(): never { throw vscode.FileSystemError.NoPermissions("Autosave-Stände sind schreibgeschützt."); }
  createDirectory(): never { throw vscode.FileSystemError.NoPermissions("Autosave-Stände sind schreibgeschützt."); }
  writeFile(): never { throw vscode.FileSystemError.NoPermissions("Autosave-Stände sind schreibgeschützt."); }
  delete(): never { throw vscode.FileSystemError.NoPermissions("Autosave-Stände sind schreibgeschützt."); }
  rename(): never { throw vscode.FileSystemError.NoPermissions("Autosave-Stände sind schreibgeschützt."); }
}
