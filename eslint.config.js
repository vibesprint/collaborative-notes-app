import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

import reactPlugin from "eslint-plugin-react";
import unusedImports from "eslint-plugin-unused-imports";


export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
    {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      "react": reactPlugin,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    rules: {
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",

      // Enforce the rules you noticed on the documentation page:
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error"
    }
  },
])
