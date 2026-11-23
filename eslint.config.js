import js from "@eslint/js";
import tseslint from "typescript-eslint";

// The engine must be pure and deterministic: time comes from the clock module,
// randomness from a seeded generator passed in by the caller.
const engineIsPure = {
  files: ["packages/engine/src/**/*.ts"],
  ignores: ["packages/engine/src/clock.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
        message: "No Date.now() in the engine: take a Clock or a LocalDate.",
      },
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=0]",
        message: "No new Date() in the engine: take a Clock or a LocalDate.",
      },
      {
        selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
        message: "No Math.random() in the engine: take a seeded Rng.",
      },
    ],
    "no-restricted-globals": ["error", "fetch", "process", "console"],
  },
};

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  engineIsPure,
);
