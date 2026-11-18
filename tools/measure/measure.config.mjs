import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import query from '@tanstack/eslint-plugin-query';
import a11y from 'eslint-plugin-jsx-a11y';
import comments from '@eslint-community/eslint-plugin-eslint-comments';
import noEffect from 'eslint-plugin-react-you-might-not-need-an-effect';
import importX from 'eslint-plugin-import-x';
import vitest from '@vitest/eslint-plugin';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';

const root = process.cwd();
const strict = Object.assign({}, ...tseslint.configs.strictTypeChecked.map(c => c.rules ?? {}));
const warnAll = rules => Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, v === 'off' || v === 0 || (Array.isArray(v) && (v[0] === 'off' || v[0] === 0)) ? v : Array.isArray(v) ? ['warn', ...v.slice(1)] : 'warn']));
const timers = ['setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback'];

export default [
  { ignores: ['dist/**', 'node_modules/**', 'scripts/**', '*.config.*', 'public/**', 'docs/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: './tsconfig.app.json', tsconfigRootDir: root, ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin, 'react-hooks': reactHooks, react, '@tanstack/query': query,
      'jsx-a11y': a11y, 'eslint-comments': comments, 'no-effect': noEffect, 'import-x': importX,
    },
    settings: {
      react: { version: '19' },
      'import-x/resolver': { typescript: { project: root + '/tsconfig.app.json' } },
    },
    rules: {
      ...warnAll(strict),
      '@typescript-eslint/consistent-type-assertions': ['warn', { assertionStyle: 'never' }],
      '@typescript-eslint/no-unsafe-type-assertion': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'warn',
      'no-restricted-imports': ['warn', { paths: [
        { name: 'axios', message: '[B1] axios' },
        { name: '@tanstack/react-query', importNames: ['useQuery'], message: '[B5] useQuery' },
        { name: '@tanstack/react-query', importNames: ['useMutation'], message: '[B6] useMutation' },
      ] }],
      'no-restricted-globals': ['warn', { name: 'fetch', message: '[B1] fetch' }, ...timers.map(name => ({ name, message: '[A4] timer' }))],
      'no-restricted-properties': ['warn',
        ...timers.map(property => ({ object: 'window', property, message: '[A4] timer' })),
        ...['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName', 'createElement'].map(property => ({ object: 'document', property, message: '[A7] document' })),
        { object: 'window', property: 'fetch', message: '[B1] fetch' }],
      'no-restricted-syntax': ['warn',
        { selector: "CallExpression[callee.name=/^use(Layout)?Effect$/]", message: '[A1] useEffect' },
        { selector: "CallExpression[callee.property.name=/^use(Layout)?Effect$/]", message: '[A1] useEffect' },
        { selector: "CallExpression[callee.property.name='addEventListener']", message: '[A6] addEventListener' }],
      'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'hack', 'workaround', 'xxx', '임시'], location: 'anywhere' }],
      'no-empty': 'warn',
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
      'react-hooks/rules-of-hooks': 'warn', 'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn', 'react-hooks/no-deriving-state-in-effects': 'warn',
      'react-hooks/purity': 'warn', 'react-hooks/immutability': 'warn', 'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn', 'react-hooks/set-state-in-render': 'warn',
      ...Object.fromEntries(Object.keys(noEffect.rules).map(r => ['no-effect/' + r, 'warn'])),
      '@tanstack/query/exhaustive-deps': 'warn', '@tanstack/query/prefer-query-options': 'warn',
      '@tanstack/query/no-rest-destructuring': 'warn', '@tanstack/query/stable-query-client': 'warn', '@tanstack/query/no-unstable-deps': 'warn',
      'eslint-comments/no-use': 'warn',
      'react/forbid-dom-props': ['warn', { forbid: ['style'] }],
      'react/forbid-elements': ['warn', { forbid: ['button', 'input', 'select', 'textarea', 'a'] }],
      'react/no-unstable-nested-components': 'warn', 'react/no-array-index-key': 'warn',
      'import-x/no-cycle': 'warn',
      ...warnAll(a11y.flatConfigs.strict.rules),
    },
  },
  {
    files: ['src/tests/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    plugins: { vitest, 'testing-library': testingLibrary },
    rules: {
      'vitest/expect-expect': 'warn', 'vitest/no-conditional-expect': 'warn', 'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'warn', 'vitest/valid-expect': 'warn', 'vitest/no-identical-title': 'warn', 'vitest/no-commented-out-tests': 'warn',
      'testing-library/no-node-access': 'warn', 'testing-library/no-container': 'warn', 'testing-library/prefer-screen-queries': 'warn',
      'testing-library/no-wait-for-multiple-assertions': 'warn', 'testing-library/prefer-user-event': 'warn',
    },
  },
];
