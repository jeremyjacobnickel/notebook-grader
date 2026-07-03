// ESLint-Konfiguration (Flat Config) mit den empfohlenen TypeScript-Regeln.
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["out/", "fixtures/"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      // VS-Code-Konvention: Commands heissen z. B. "notebookGrader.runTests"
      "@typescript-eslint/naming-convention": "off"
    }
  }
);
