import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'test-results-stock/',
      'playwright-report-stock/',
      'allure-results/',
      'allure-report/',
      'allure-report-single/',
      'playwright-report-all/',
      'blob-report/',
      '.auth/',
    ],
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
        {
          assertFunctionNames: [
            'expectOk',
            'expectError',
            'loginOk',
            'create',
            'expectAllRemoved',
            'expectLoggedOut',
            'runCase',
          ],
        },
      ],
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
    },
  },
];
