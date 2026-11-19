import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**'] },
    {
        files: ['**/*.{js,mjs}'],
        languageOptions: { globals: globals.node },
        rules: js.configs.recommended.rules,
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [...tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: globals.browser,
        },
        plugins: { 'react-hooks': reactHooks },
        rules: reactHooks.configs['recommended-latest'].rules,
    },
)
