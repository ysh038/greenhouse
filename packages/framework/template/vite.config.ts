import { greenhouseTest } from '@agent-greenhouse/framework/vitest'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [react()],
    test: greenhouseTest(),
})
