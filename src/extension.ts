import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import fg from "fast-glob";
import ignore from "ignore";

const DEFAULT_EXCLUDES = [
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "dist",
  "build",
  ".terraform",
  ".idea",
  ".vscode",
];

async function isBinaryFile(
  filePath: string,
  sniffBytes = 8192,
): Promise<boolean> {
  try {
    const fh = await fs.open(filePath, "r");
    const buf = Buffer.alloc(Math.min(sniffBytes, 4096));
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    await fh.close();
    if (bytesRead === 0) {
      return false;
    }
    return buf.slice(0, bytesRead).includes(0);
  } catch {
    // If we can't read, treat as binary to skip
    return true;
  }
}

async function loadGitignore(
  root: string,
): Promise<null | ReturnType<typeof ignore>> {
  const gi = path.join(root, ".gitignore");
  try {
    const txt = await fs.readFile(gi, "utf8");
    const ig = ignore();
    ig.add(txt);
    return ig;
  } catch {
    return null;
  }
}

async function gatherFiles(
  root: string,
  ig: ReturnType<typeof ignore> | null,
  onlyExtensions?: string[],
) {
  const patterns = ["**/*"];
  const ignorePatterns = DEFAULT_EXCLUDES.map((d) => `**/${d}/**`);

  const entries = await fg(patterns, {
    cwd: root,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: true,
    ignore: ignorePatterns,
  });

  const filtered = entries.filter((rel) => {
    if (ig && ig.ignores(rel)) {
      return false;
    }
    if (onlyExtensions && onlyExtensions.length > 0) {
      const ext = path.extname(rel).toLowerCase();
      return onlyExtensions.includes(ext);
    }
    return true;
  });

  filtered.sort();
  return filtered; // posix-style rel paths from fast-glob
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "code-context-extractor.bundle",
    async () => {
      // Pick folder
      const folderPick = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select folder to bundle",
      });
      if (!folderPick?.length) {
        return;
      }

      const root = folderPick[0].fsPath;

      // Save location
      const outPick = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(root, "bundle.txt")),
        saveLabel: "Save bundle as",
      });
      if (!outPick) {
        return;
      }

      // Optional: extension filter
      const extsInput = await vscode.window.showInputBox({
        prompt:
          "Optional: include only these extensions (space-separated), e.g. .tf .py — leave empty to include all",
        placeHolder: ".tf .py",
      });
      const extensions = extsInput
        ? extsInput
            .split(/\s+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : undefined;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Bundling files",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: "Loading .gitignore (if present)..." });
          const ig = await loadGitignore(root);

          progress.report({ message: "Enumerating files..." });
          const relFiles = await gatherFiles(root, ig, extensions);

          let outBuf = "";
          let processed = 0;
          for (const rel of relFiles) {
            const full = path.join(root, rel);
            // skip output file if inside the root
            try {
              if (path.resolve(full) === path.resolve(outPick.fsPath)) {
                continue;
              }
            } catch {}

            if (await isBinaryFile(full)) {
              continue;
            }

            let content: string;
            try {
              content = await fs.readFile(full, "utf8");
            } catch {
              // fallback to latin1 to avoid throwing on odd encodings
              try {
                content = (await fs.readFile(
                  full,
                  "latin1",
                )) as unknown as string;
              } catch {
                continue;
              }
            }

            const relPosix = rel.split(path.sep).join("/");

            outBuf += `# file: ${relPosix}\n`;
            outBuf += content.endsWith("\n") ? content : content + "\n";
            outBuf += "\n";

            processed += 1;
            if (processed % 50 === 0) {
              progress.report({ message: `Processed ${processed} files...` });
              // yield to event loop
              await new Promise((res) => setTimeout(res, 10));
            }
          }

          progress.report({ message: "Writing bundle..." });
          await fs
            .mkdir(path.dirname(outPick.fsPath), { recursive: true })
            .catch(() => {});
          await fs.writeFile(outPick.fsPath, outBuf, "utf8");

          vscode.window.showInformationMessage(
            `Bundle written: ${outPick.fsPath} (considered ${relFiles.length} files, included ${processed})`,
          );
        },
      );
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  // nothing to do
}
