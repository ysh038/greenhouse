import { advanceTime, renderWithData } from '@agent-greenhouse/framework/testing'
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeApi, resetTasks } from '../fake/fakeApi'

import { TaskSection } from './TaskSection'

async function renderSection() {
    renderWithData(<TaskSection />)
    await advanceTime(0)
}

function taskLabels() {
    return within(screen.getByRole('list', { name: '작업 목록' }))
        .getAllByRole('listitem')
        .map((item) => within(item).getByRole('checkbox').closest('label')?.textContent)
}

function filter(name: string) {
    return screen.getByRole('button', { name })
}

beforeEach(() => {
    vi.useFakeTimers()
    fakeApi.reset()
    resetTasks()
})

describe('목록', () => {
    it('불러오는 동안 안내를 보여 주고, 끝나면 제목과 남은 작업 수를 보여 준다', async () => {
        fakeApi.hangOnce()
        const { unmount } = renderWithData(<TaskSection />)
        expect(screen.getByText('불러오는 중')).toBeDefined()
        unmount()

        await renderSection()

        expect(screen.getByRole('heading', { name: '작업' })).toBeDefined()
        expect(screen.getByText('남은 작업 3개')).toBeDefined()
        expect(taskLabels()).toEqual([
            '온실 설계도 그리기',
            '모종 주문하기',
            '물주기 일정 정하기',
            '온도계 달기',
        ])
    })

    it('완료한 작업은 체크되고 취소선 표시가 붙는다', async () => {
        await renderSection()

        const done = screen.getByRole('checkbox', { name: '물주기 일정 정하기' })
        const active = screen.getByRole('checkbox', { name: '모종 주문하기' })

        expect(done).toHaveProperty('checked', true)
        expect(screen.getByText('물주기 일정 정하기').dataset.struck).toBe('true')
        expect(active).toHaveProperty('checked', false)
        expect(screen.getByText('모종 주문하기').dataset.struck).toBeUndefined()
    })

    it('불러오지 못하면 알리고, 다시 시도하면 복구된다', async () => {
        fakeApi.failOnce(500)
        await renderSection()

        const alert = screen.getByRole('alert')
        expect(alert.textContent).toContain('작업을 불러오지 못했습니다')

        fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }))
        await advanceTime(0)

        expect(taskLabels()).toHaveLength(4)
    })
})

describe('상태 필터', () => {
    it('고른 필터가 표시되고 그 조건의 작업만 보인다. 남은 작업 수는 그대로다', async () => {
        await renderSection()
        expect(filter('전체').getAttribute('aria-pressed')).toBe('true')

        fireEvent.click(filter('완료'))
        await advanceTime(0)

        expect(filter('완료').getAttribute('aria-pressed')).toBe('true')
        expect(filter('전체').getAttribute('aria-pressed')).toBe('false')
        expect(taskLabels()).toEqual(['물주기 일정 정하기'])
        expect(screen.getByText('남은 작업 3개')).toBeDefined()

        fireEvent.click(filter('진행 중'))
        await advanceTime(0)

        expect(filter('진행 중').getAttribute('aria-pressed')).toBe('true')
        expect(taskLabels()).toEqual([
            '온실 설계도 그리기',
            '모종 주문하기',
            '온도계 달기',
        ])
    })

    it('조건에 맞는 작업이 없으면 안내한다', async () => {
        await renderSection()
        fireEvent.click(screen.getByRole('checkbox', { name: '물주기 일정 정하기' }))
        await advanceTime(0)
        fireEvent.click(filter('완료'))
        await advanceTime(0)

        expect(screen.getByText('작업이 없습니다')).toBeDefined()
        expect(screen.queryByRole('list', { name: '작업 목록' })).toBeNull()
    })
})

describe('완료 여부 바꾸기', () => {
    it('체크하면 완료가 되고 남은 작업 수가 줄어든다', async () => {
        await renderSection()

        fireEvent.click(screen.getByRole('checkbox', { name: '모종 주문하기' }))
        await advanceTime(0)

        expect(screen.getByRole('checkbox', { name: '모종 주문하기' })).toHaveProperty(
            'checked',
            true,
        )
        expect(screen.getByText('남은 작업 2개')).toBeDefined()
    })

    it('진행 중 필터에서 완료하면 그 목록에서 빠진다', async () => {
        await renderSection()
        fireEvent.click(filter('진행 중'))
        await advanceTime(0)

        fireEvent.click(screen.getByRole('checkbox', { name: '모종 주문하기' }))
        await advanceTime(0)

        expect(taskLabels()).toEqual(['온실 설계도 그리기', '온도계 달기'])
    })

    it('서버가 실패하면 알린다', async () => {
        await renderSection()
        fakeApi.failOnce(500)

        fireEvent.click(screen.getByRole('checkbox', { name: '모종 주문하기' }))
        await advanceTime(0)

        expect(screen.getByRole('alert').textContent).toBe('변경하지 못했습니다')
    })
})

describe('삭제', () => {
    function rowOf(title: string) {
        const item = screen.getByText(title).closest('li')
        if (!item) throw new Error(`${title} 줄을 찾지 못했습니다`)
        return within(item)
    }

    it('삭제를 누르면 확인 문구가 나오고, 삭제 확인을 눌러야 지워진다', async () => {
        await renderSection()

        fireEvent.click(rowOf('모종 주문하기').getByRole('button', { name: '삭제' }))

        expect(screen.getByText("'모종 주문하기' 작업을 삭제할까요?")).toBeDefined()
        expect(taskLabels()).toHaveLength(4)

        fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }))
        await advanceTime(0)

        expect(taskLabels()).toEqual([
            '온실 설계도 그리기',
            '물주기 일정 정하기',
            '온도계 달기',
        ])
        expect(screen.getByText('남은 작업 2개')).toBeDefined()
        expect(screen.queryByText(/작업을 삭제할까요/)).toBeNull()
    })

    it('취소하면 그대로 남는다', async () => {
        await renderSection()
        fireEvent.click(rowOf('모종 주문하기').getByRole('button', { name: '삭제' }))

        fireEvent.click(screen.getByRole('button', { name: '취소' }))
        await advanceTime(0)

        expect(screen.queryByText(/작업을 삭제할까요/)).toBeNull()
        expect(taskLabels()).toHaveLength(4)
        expect(
            fakeApi.requests().filter((request) => request.method === 'DELETE'),
        ).toEqual([])
    })
})

describe('추가', () => {
    function titleInput() {
        return screen.getByRole('textbox', { name: '새 작업' })
    }

    it('추가하면 목록 맨 아래에 나타나고 입력란이 비워진다', async () => {
        await renderSection()

        fireEvent.change(titleInput(), { target: { value: '화분 옮기기' } })
        fireEvent.click(screen.getByRole('button', { name: '추가' }))
        await advanceTime(0)

        expect(taskLabels()).toHaveLength(5)
        expect(taskLabels().at(-1)).toBe('화분 옮기기')
        expect(titleInput()).toHaveProperty('value', '')
        expect(screen.getByText('남은 작업 4개')).toBeDefined()
    })

    it('제목이 비어 있으면 서버의 400을 "제목을 입력하세요"로 알리고 목록은 그대로다', async () => {
        await renderSection()

        fireEvent.click(screen.getByRole('button', { name: '추가' }))
        await advanceTime(0)

        expect(screen.getByRole('alert').textContent).toBe('제목을 입력하세요')
        expect(taskLabels()).toHaveLength(4)
    })

    it('공백만 넣어도 같은 안내를 하고 입력은 그대로 둔다', async () => {
        await renderSection()

        fireEvent.change(titleInput(), { target: { value: '   ' } })
        fireEvent.click(screen.getByRole('button', { name: '추가' }))
        await advanceTime(0)

        expect(screen.getByRole('alert').textContent).toBe('제목을 입력하세요')
        expect(titleInput()).toHaveProperty('value', '   ')
    })
})
