// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      angular.configs.tsRecommended,
      prettier,
    ],
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.app.json', 'tsconfig.spec.json'],
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // --------------------
      // Angular
      // --------------------
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],

      // Standalone
      '@angular-eslint/prefer-standalone': 'error',

      // Signals
      '@angular-eslint/no-uncalled-signals': 'error',

      // modern injection
      '@angular-eslint/prefer-inject': 'error',

      // Perf
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/sort-lifecycle-methods': 'error',

      // --------------------
      // TypeScript
      // --------------------
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
        },
      ],
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-inferrable-types': [
        'warn',
        {
          ignoreParameters: true,
        },
      ],
      '@typescript-eslint/no-magic-numbers': [
        'warn',
        {
          ignore: [-1, 0, 1, 2, 3, 4, 10, 100, 500, 1000],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/prefer-readonly': 'error',

      camelcase: 'error',
      eqeqeq: 'error',
      'no-console': 'warn',
      'no-duplicate-imports': 'error',
      'no-new': 'error',
      'no-implied-eval': 'error',
      'prefer-template': 'error',
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility, prettier],
    rules: {
      '@angular-eslint/template/conditional-complexity': [
        'error',
        {
          maxComplexity: 4,
        },
      ],
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/no-inline-styles': 'error',
      '@angular-eslint/template/no-interpolation-in-attributes': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
    },
  },
]);
