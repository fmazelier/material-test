/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'no-empty-source': null,
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['theme', 'tailwind', 'layer', 'apply'],
      },
    ],

    'scss/dollar-variable-pattern': [
      '^_?[a-z][a-zA-Z0-9-]*$',
      {
        message:
          'Variables must be kebab-case or camelCase (optional leading _ for Sass private variables)',
      },
    ],
  },
};
