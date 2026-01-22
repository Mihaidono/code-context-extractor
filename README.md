# Code Context Extractor

Code Context Extractor aggregates source code from a selected folder recursively into a single text file, including file paths and names. This is useful for generating project context for AI tools, code review helpers, or search/indexing utilities.

## Features

- Recursively scans a selected folder.
- Respects `.gitignore` where possible.
- Skips common noise directories (e.g. `node_modules`, `.git`, `.terraform`, `.idea`, `.vscode`, etc.).
- Skips binary files (e.g. images, compiled artifacts) by detecting NUL bytes.
- Normalizes file paths to POSIX-style (`/`) for consistent use across platforms.
- Optional filter by file extension (e.g. only `.tf`, `.py`).

### Example Output

```text
# file: src/main.ts
console.log("Hello, world");

# file: infra/main.tf
resource "aws_s3_bucket" "example" {
  # ...
}
```

## Usage

1. Open VS Code.
2. Open the Command Palette:
   - **Windows / Linux:** `Ctrl+Shift+P`
   - **macOS:** `Cmd+Shift+P`
3. Run:
   - **Create Code Context File**
4. Select the root folder you want to bundle.
5. Select where to save the output file (e.g. `bundle.txt`).
6. Optionally enter file extensions to include (space-separated), for example:
   - `.tf .py .ts`
   - Leave empty to include all non-binary files.

The extension generates a single text file with the following structure:

```text
# file: relative/path/from/root.ext
<file contents>

# file: another/file.ext
<file contents>
```

## Commands

This extension contributes the following command:

- **Command ID:** `code-context-extractor.bundle`
- **Title:** `Create Code Context File`

## Configuration

Configuration options may be added in future releases. Planned settings include:

- Maximum file size per file
- Toggle for respecting `.gitignore`
- Additional directories to exclude

## Requirements

- VS Code **1.108.1** or later

The extension has been tested on:

- Windows
- macOS
- Linux

## Known Limitations

- Large repositories may produce very large output files.
- File encoding is assumed UTF-8 with a fallback to `latin1` where necessary.
- Binary files are skipped entirely.

## Development

To build and run the extension locally:

```bash
npm install
npm run compile
```

Then:

1. Open the project folder in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. Run the bundle command from the Command Palette.

### Linting and Tests

```bash
npm run lint
npm test
```

## Packaging and Distribution

To create a `.vsix` package:

```bash
npm run compile
npx vsce package
```

Install locally using:

```bash
code --install-extension code-context-extractor-<version>.vsix
```

## Privacy

This extension:

- Runs entirely locally
- Does **not** send your code or bundled output anywhere
- Performs no telemetry or data collection

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT License — see [LICENSE](./LICENSE) for details.
