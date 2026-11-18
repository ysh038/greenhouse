import { defineScenario } from '@agent-greenhouse/framework/verify'

const PANEL = { role: 'heading', name: '구성원 초대', closest: 'section' } as const

export default defineScenario({
    name: '구성원 초대',
    // 같은 페이지의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
    expectedConsoleErrors: ['/api/broken-todos'],
    steps: async (page) => {
        await page.see(PANEL)
        await page.shot('처음', { of: PANEL })

        await page.click({ role: 'button', name: '자리란?' })
        await page.see({ role: 'note' })
        await page.shot('자리 설명을 연 상태', { of: PANEL })
        await page.press('Escape')

        await page.click({ role: 'button', name: 'haneul.kim@example.com (관리자)' })
        await page.see({ role: 'button', name: '내보내기' })
        await page.shot('구성원을 선택한 상태', { of: PANEL })

        await page.click({ role: 'button', name: '초대' })
        await page.see({ text: '이메일을 입력하세요' })
        await page.shot('빈 이메일로 초대해 오류가 난 상태', { of: PANEL })

        await page.fill({ label: '이메일' }, 'jiho.kim@example.com')
        await page.click({ role: 'checkbox', name: '관리자 권한' })
        await page.click({ role: 'button', name: '초대' })
        await page.fill({ label: '이메일' }, 'alex.morgan@example.com')
        await page.click({ role: 'button', name: '초대' })
        await page.see({ text: '자리 5 / 5' })
        await page.shot('자리가 다 찬 상태', { of: PANEL })

        await page.shot('페이지 전체')
    },
})
