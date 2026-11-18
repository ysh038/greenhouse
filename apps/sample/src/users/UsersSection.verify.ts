import { defineScenario } from '@agent-greenhouse/framework/verify'

const SECTION = { role: 'heading', name: '사용자', closest: 'section' } as const

export default defineScenario({
    name: '사용자',
    // 같은 페이지의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
    expectedConsoleErrors: ['/api/broken-todos'],
    steps: async (page) => {
        await page.see({ role: 'list', name: '사용자 목록' })
        await page.shot('목록을 불러온 상태', { of: SECTION })

        await page.fill({ label: '사용자 검색' }, '김')
        await page.gone({ role: 'button', name: '이도윤 doyun.lee@example.com' })
        await page.shot('"김"으로 검색한 결과', { of: SECTION })

        await page.click({ role: 'button', name: '김하늘 haneul.kim@example.com' })
        await page.see({ label: '이름' })
        await page.shot('상세 패널을 연 상태', { of: SECTION })

        await page.fill({ label: '이름' }, '')
        await page.click({ role: 'button', name: '저장' })
        await page.see({ text: '이름이 비어 있어 저장하지 못했습니다 (400)' })
        await page.shot('빈 이름으로 저장해 실패한 상태', { of: SECTION })

        await page.fill({ label: '이름' }, '김하늘빛')
        await page.click({ role: 'button', name: '저장' })
        await page.see({ text: '저장했습니다' })
        await page.shot('저장에 성공한 상태', { of: SECTION })
    },
})
