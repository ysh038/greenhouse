import type { Plugin } from 'vite'

export function fakeServerPlugin(options: { entry: string; delayMs?: number }): Plugin
