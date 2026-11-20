import { defineScenario } from '@agent-greenhouse/framework/verify'

const SECTION = { role: 'heading', name: '할 일', closest: 'section' } as const
const LIST = { role: 'list', name: '할 일 목록' } as const

export default defineScenario({
    name: '할 일',
    expectedConsoleErrors: [
        // 이 화면의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
        '/api/broken-todos',
        // 아래에서 빈 제목으로 추가해 서버가 거절하는 것을 봅니다.
        '응답 400: POST /api/todos',
    ],
    steps: async (page) => {
        await page.see(LIST)
        await page.see({ role: 'button', name: '다시 시도', within: SECTION })
        await page.shot('처음 (스키마 오류 안내 포함)', { of: SECTION })

        await page.click({ role: 'button', name: '추가', within: SECTION })
        await page.see({ text: '추가하지 못했습니다 (400)' })
        await page.shot('빈 제목으로 추가해 실패한 상태', { of: SECTION })

        await page.fill({ label: '새 할 일' }, '물 주기')
        await page.click({ role: 'button', name: '추가', within: SECTION })
        await page.see({ text: '물 주기' })
        await page.shot('할 일을 추가한 상태', { of: SECTION })

        const failing = await page.fail('GET /api/todos')
        await page.reload()
        await page.see({ text: 'GET /api/todos 요청이 실패했습니다 (500).' })
        await page.shot('목록을 불러오지 못한 상태', { of: SECTION })
        await failing.stop()
    },
})
