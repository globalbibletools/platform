import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import pluginReact from "@eslint-react/eslint-plugin";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default defineConfig(
  globalIgnores(["src/shared/jobs/bin/"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  pluginQuery.configs["flat/recommended"],
  pluginRouter.configs["flat/recommended"],
  pluginReact.configs["recommended-typescript"],
  ...compat.extends("prettier"),
  {
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-children-prop": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
