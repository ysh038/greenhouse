// 프로젝트의 vite.config.ts(또는 vitest.config.ts)에서 test 설정으로 씁니다.
//
//     import { greenhouseTest } from '@agent-greenhouse/framework/vitest'
//     export default defineConfig({ test: greenhouseTest() })
import path from 'node:path'

/**
 * jsdom 환경, 테스트마다 화면 정리와 타이머 되돌리기, connectFakeApi가 바꿔 둔 fetch 되돌리기를 설정합니다.
 * @param {object} [overrides] 덧붙일 vitest test 설정
 */
export function greenhouseTest(overrides = {}) {
    return {
        environment: 'jsdom',
        // connectFakeApi가 바꿔 둔 fetch를 테스트마다 되돌립니다.
        unstubGlobals: true,
        ...overrides,
        setupFiles: [
            path.join(import.meta.dirname, 'setup.mjs'),
            ...(overrides.setupFiles ?? []),
        ],
        server: {
            ...overrides.server,
            deps: {
                ...overrides.server?.deps,
                // 프레임워크가 CSS를 가져오므로 vitest가 변환해야 합니다.
                inline: [/@agent-greenhouse\/framework/, ...(overrides.server?.deps?.inline ?? [])],
            },
        },
    }
}
