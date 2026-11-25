import { greenhouseTest } from '@agent-greenhouse/framework/vitest'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: greenhouseTest({
        exclude: ['**/node_modules/**', '**/dist/**', 'tools/**', 'packages/framework/template/**'],
    }),
})
