import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { fakeServerPlugin } from './fakeServer.plugin.mjs'

export default defineConfig({
    plugins: [react(), fakeServerPlugin({ entry: '/src/fake/fakeApi.ts' })],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        // connectFakeApi가 바꿔 둔 fetch를 테스트마다 되돌립니다.
        unstubGlobals: true,
    },
})
