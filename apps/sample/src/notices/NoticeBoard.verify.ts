import { defineScenario } from '@agent-greenhouse/framework/verify'

const SECTION = { role: 'heading', name: '공지사항', closest: 'section' } as const
const LIST = { role: 'list', name: '공지 목록' } as const

export default defineScenario({
    name: '공지사항',
    // 같은 페이지의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
    expectedConsoleErrors: ['/api/broken-todos'],
    steps: async (page) => {
        await page.see(LIST)
        await page.shot('처음', { of: SECTION })

        await page.click({ role: 'button', name: '도움말' })
        await page.see({ text: '공지는 최신순으로 보입니다.' })
        await page.shot('도움말을 연 상태', { of: SECTION })
        await page.press('Escape')
        await page.gone({ text: '공지는 최신순으로 보입니다.' })

        await page.fill({ label: '공지 검색' }, '점검')
        await page.gone({ text: '신규 기능 출시' })
        await page.shot('"점검"으로 검색한 결과', { of: SECTION })
        await page.fill({ label: '공지 검색' }, '')
        await page.see({ text: '신규 기능 출시' })

        await page.fill({ label: '새 공지' }, '겨울 휴무 안내')
        await page.click({ role: 'button', name: '등록' })
        await page.see({ text: '등록했습니다' })
        await page.shot('공지를 등록한 상태', { of: SECTION })

        const failing = await page.fail('GET /api/notices')
        await page.reload()
        await page.see({ text: '공지를 불러오지 못했습니다' })
        await page.shot('불러오기에 실패한 상태', { of: SECTION })
        await failing.stop()
        await page.click({ role: 'button', name: '다시 시도', within: SECTION })
        await page.see(LIST)
    },
})
