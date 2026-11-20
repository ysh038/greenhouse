import { defineScenario } from '@agent-greenhouse/framework/verify'

const SECTION = { role: 'heading', name: '메뉴', closest: 'section' } as const

export default defineScenario({
    name: '메뉴',
    // 같은 페이지의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
    expectedConsoleErrors: ['/api/broken-todos'],
    steps: async (page) => {
        await page.see({ role: 'button', name: '메뉴 열기' })
        await page.shot('닫힌 상태', { of: SECTION })

        await page.click({ role: 'button', name: '메뉴 열기' })
        await page.see({ text: '프로필' })
        await page.shot('메뉴를 연 상태', { of: SECTION })

        await page.press('Escape')
        await page.gone({ text: '프로필' })
        await page.see({ role: 'button', name: '메뉴 열기' })
    },
})
