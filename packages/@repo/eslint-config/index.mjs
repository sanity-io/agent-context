import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import sanityReact from 'eslint-config-sanity/react.js'
import sanityTypescript from 'eslint-config-sanity/typescript.js'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import reactYouMightNotNeedAnEffect from 'eslint-plugin-react-you-might-not-need-an-effect'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {ignores: ['dist/', 'build/', 'coverage/', '.next/', '.sanity/']},
  {files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}']},
  {
    languageOptions: {
      ecmaVersion: 'latest',
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  reactYouMightNotNeedAnEffect.configs.recommended,
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...sanityReact.rules,
      ...sanityTypescript.rules,
      'react/jsx-newline': ['error', {prevent: false}],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'react/jsx-no-bind': 'off',
      'no-duplicate-imports': 'error',
      'no-console': ['error', {allow: ['warn', 'error']}],
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {allowInterfaces: 'with-single-extends'},
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  ...sanityTypescript.overrides,
]
