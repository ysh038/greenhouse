import { defineScenario } from '@agent-greenhouse/framework/verify'

const SECTION = { role: 'heading', name: '작업', closest: 'section' } as const
const NEW_TASK = { label: '새 작업' } as const
const CONFIRM = { role: 'alertdialog' } as const

export default defineScenario({
    name: '작업',
    expectedConsoleErrors: [
        // 같은 페이지의 "응답이 스키마와 다를 때" 예시가 일부러 내는 에러입니다.
        '/api/broken-todos',
        // 아래에서 빈 제목으로 추가해 서버가 거절하는 것을 봅니다.
        '응답 400: POST /api/tasks',
    ],
    steps: async (page) => {
        await page.see({ text: '남은 작업 3개' })

        // 서버가 정상일 때는 볼 수 없는 화면은 요청을 가로채서 만듭니다.
        const loading = await page.hold('GET /api/tasks')
        await page.reload()
        await page.see({ text: '불러오는 중', within: SECTION })
        await page.shot('불러오는 중', { of: SECTION })
        await loading.stop()
        await page.see({ text: '남은 작업 3개' })

        const failing = await page.fail('GET /api/tasks')
        await page.reload()
        await page.see({ text: '작업을 불러오지 못했습니다' })
        await page.shot('불러오기에 실패한 상태', { of: SECTION })
        await failing.stop()
        await page.click({ role: 'button', name: '다시 시도', within: SECTION })
        await page.see({ text: '남은 작업 3개' })

        const longTitle = await page.respond('GET /api/tasks', {
            body: [
                {
                    id: 1,
                    title: '온실 북쪽 벽의 환기창을 모두 열어 두고 온도와 습도가 내려가는지 한 시간마다 확인해서 기록하기',
                    isDone: false,
                },
            ],
        })
        await page.reload()
        await page.see({ text: '남은 작업 1개' })
        await page.shot('제목이 긴 작업', { of: SECTION })
        await longTitle.stop()
        await page.reload()
        await page.see({ text: '남은 작업 3개' })
        await page.shot('처음 (전체)', { of: SECTION })

        // "완료" 필터에는 줄이 하나뿐이라 "삭제" 버튼이 하나만 보입니다.
        await page.click({ role: 'button', name: '완료' })
        await page.gone({ role: 'checkbox', name: '모종 주문하기' })
        await page.shot('"완료" 필터', { of: SECTION })

        await page.click({ role: 'button', name: '삭제' })
        await page.see(CONFIRM)
        await page.shot('삭제 확인 창', { area: 'viewport' })

        // 서버가 삭제를 거절하면 창이 닫히지 않고 안에 알립니다.
        const failingDelete = await page.fail('DELETE /api/tasks/*')
        await page.click({ role: 'button', name: '삭제', within: CONFIRM })
        await page.see({ text: '삭제하지 못했습니다' })
        await page.shot('삭제에 실패한 확인 창', { of: CONFIRM })
        await failingDelete.stop()

        await page.click({ role: 'button', name: '삭제', within: CONFIRM })
        await page.gone(CONFIRM)
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
