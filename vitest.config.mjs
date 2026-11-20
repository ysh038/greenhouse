import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.mjs'],
        // connectFakeApi가 바꿔 둔 fetch를 테스트마다 되돌립니다.
        unstubGlobals: true,
        exclude: ['**/node_modules/**', '**/dist/**', 'tools/**'],
    },
})
