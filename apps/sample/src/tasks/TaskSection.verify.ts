import { defineScenario } from '@agent-greenhouse/framework/verify'

const SECTION = { role: 'heading', name: '작업', closest: 'section' } as const
const NEW_TASK = { label: '새 작업' } as const

export default defineScenario({
    name: '작업',
    // 같은 페이지의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
    expectedConsoleErrors: ['/api/broken-todos'],
    steps: async (page) => {
        await page.see({ text: '남은 작업 3개' })
        await page.shot('처음 (전체)', { of: SECTION })

        // "완료" 필터에는 줄이 하나뿐이라 "삭제" 버튼이 하나만 보입니다.
        await page.click({ role: 'button', name: '완료' })
        await page.gone({ role: 'checkbox', name: '모종 주문하기' })
        await page.shot('"완료" 필터', { of: SECTION })

        await page.click({ role: 'button', name: '삭제' })
        await page.see({ role: 'button', name: '삭제 확인' })
        await page.shot('삭제 확인을 묻는 상태', { of: SECTION })

        await page.click({ role: 'button', name: '삭제 확인' })
        await page.see({ text: '작업이 없습니다' })
        await page.shot('완료 작업을 지워 목록이 빈 상태', { of: SECTION })

        await page.click({ role: 'button', name: '진행 중' })
        await page.see({ role: 'checkbox', name: '모종 주문하기' })
        await page.shot('"진행 중" 필터', { of: SECTION })

        await page.click({ role: 'checkbox', name: '모종 주문하기' })
        await page.see({ text: '남은 작업 2개' })
        await page.click({ role: 'button', name: '전체' })
        await page.shot('작업 하나를 완료한 상태 (전체)', { of: SECTION })

        // 같은 페이지의 다른 구역에도 "추가" 버튼이 있어 이 구역 안에서 찾습니다.
        await page.fill(NEW_TASK, '')
        await page.click({ role: 'button', name: '추가', within: SECTION })
        await page.see({ text: '제목을 입력하세요' })
        await page.shot('빈 제목으로 추가해 오류가 난 상태', { of: SECTION })

        await page.fill(NEW_TASK, '화분 옮기기')
        await page.click({ role: 'button', name: '추가', within: SECTION })
        await page.see({ role: 'checkbox', name: '화분 옮기기' })
        await page.shot('작업을 추가한 상태', { of: SECTION })
    },
})
