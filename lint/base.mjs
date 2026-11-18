import comments from '@eslint-community/eslint-plugin-eslint-comments'
import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const TS_FILES = ['**/*.{ts,tsx}']

export function createBase(rootDir) {
    return [
        {
            files: ['**/*.{js,mjs}'],
            languageOptions: { globals: globals.node },
            rules: js.configs.recommended.rules,
        },
        ...tseslint.configs.strictTypeChecked.map((config) => ({
            ...config,
            files: TS_FILES,
        })),
        {
            files: TS_FILES,
            languageOptions: {
                parserOptions: {
                    projectService: true,
                    tsconfigRootDir: rootDir,
                },
                globals: globals.browser,
            },
            linterOptions: { reportUnusedDisableDirectives: 'error' },
            plugins: {
                'react-hooks': reactHooks,
                react,
                'eslint-comments': comments,
            },
            settings: { react: { version: '19' } },
            rules: {
                ...reactHooks.configs['recommended-latest'].rules,
                'react-hooks/exhaustive-deps': 'error',
                'react/jsx-key': 'error',
                'react/no-unstable-nested-components': 'error',

                '@typescript-eslint/switch-exhaustiveness-check': 'error',
                '@typescript-eslint/no-confusing-void-expression': 'off',
                '@typescript-eslint/restrict-template-expressions': [
                    'error',
                    { allowNumber: true },
                ],

                'eslint-comments/no-use': 'error',
                'no-empty': 'error',
                'no-warning-comments': [
                    'error',
                    { terms: ['todo', 'fixme', 'hack'], location: 'anywhere' },
                ],
            },
        },
    ]
}
