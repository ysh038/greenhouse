import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { fakeServerPlugin } from '@agent-greenhouse/framework/vite'

export default defineConfig({
    plugins: [react(), fakeServerPlugin({ entry: '/src/shared/fake/fakeApi.ts' })],
})
