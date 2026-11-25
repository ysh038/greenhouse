import { defineScenario } from '@agent-greenhouse/framework/verify'

const DIALOG = { role: 'dialog', name: '온실 이름 바꾸기' } as const
const NAME = { label: '이름', within: DIALOG } as const

export default defineScenario({
    name: '창',
    // 같은 페이지의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
    expectedConsoleErrors: ['/api/broken-todos'],
    steps: async (page) => {
        await page.click({ role: 'button', name: '이름 바꾸기' })
        await page.see(DIALOG)
        await page.shot('창을 연 상태', { area: 'viewport' })

        await page.fill(NAME, '')
        await page.see({ text: '이름을 입력하세요' })
        await page.shot('이름을 비운 상태', { of: DIALOG })

        await page.press('Escape')
        await page.gone(DIALOG)
        await page.see({ text: '온실 이름: 북쪽 온실' })

        await page.click({ role: 'button', name: '이름 바꾸기' })
        await page.fill(NAME, '남쪽 온실')
        await page.click({ role: 'button', name: '저장', within: DIALOG })
        await page.gone(DIALOG)
        await page.see({ text: '온실 이름: 남쪽 온실' })
        await page.shot('이름을 바꾼 뒤', {
            of: { role: 'heading', name: '창', closest: 'section' },
        })
    },
})
