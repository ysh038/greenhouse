import { defineScenario } from '@agent-greenhouse/framework/verify'

const SECTION = { role: 'heading', name: '검색', closest: 'section' } as const

export default defineScenario({
    name: '검색',
    // 같은 페이지의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
    expectedConsoleErrors: ['/api/broken-todos'],
    steps: async (page) => {
        await page.see({ label: '검색어' })
        await page.shot('처음', { of: SECTION })

        await page.fill({ label: '검색어' }, '몬스테라 아단소니')
        await page.see({ text: '300ms 뒤 반영: 몬스테라 아단소니' })
        await page.shot('검색어가 반영된 상태', { of: SECTION })
    },
})
