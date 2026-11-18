import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'allure-results/', 'allure-report/', '.auth/'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.js'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Thao tác + khẳng định nằm trong page object / ApiClient (expectOk, expectError)
      'playwright/expect-expect': [
        'warn',
        { assertFunctionNames: ['expectOk', 'expectError', 'loginOk', 'create'] },
      ],
      'playwright/no-conditional-in-test': 'off',
    },
  },
];
