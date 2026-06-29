# Extension (VS Code client)

TypeScript, VS Code API. **Skeleton — not implemented yet.**

Planned contents:

- `package.json` — extension manifest with three commands:
  - **Praktikum laden** — load a task into the workspace
  - **Tests ausführen** — run `pytest` locally, show the inline green/red score
  - **Abgeben** — submit the pass/fail result to the backend
- A sidebar panel showing the current score and a **Tipp** (hint) button.

The extension runs `pytest` locally on the student's machine and talks to
the backend (`/submit`, `/hint`) using the course token from the user's
settings.

Keep the TypeScript small and conventional — follow the official VS Code
extension samples.
