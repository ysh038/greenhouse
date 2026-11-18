import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.mjs'],
        exclude: ['**/node_modules/**', '**/dist/**', 'tools/measure/**'],
    },
})
