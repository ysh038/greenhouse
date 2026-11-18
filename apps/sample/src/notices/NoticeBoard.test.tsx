import { advanceTime, renderWithData } from '@agent-greenhouse/framework/testing'
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeApi } from '../fake/fakeApi'

import { NoticeBoard } from './NoticeBoard'

async function renderBoard() {
    renderWithData(<NoticeBoard />)
    await advanceTime(0)
}

function noticeTitles() {
    return within(screen.getByRole('list', { name: '공지 목록' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent)
}

function pressOutside(element: Element) {
    fireEvent.pointerDown(element)
    fireEvent.mouseDown(element)
    fireEvent.click(element)
}

beforeEach(() => {
    vi.useFakeTimers()
    fakeApi.reset()
})

describe('공지 목록', () => {
    it('불러오는 동안 안내를 보여 주고, 끝나면 목록과 건수를 보여 준다', async () => {
        fakeApi.hangOnce()
        const { unmount } = renderWithData(<NoticeBoard />)
        expect(screen.getByText('불러오는 중')).toBeDefined()
        unmount()

        await renderBoard()

        expect(noticeTitles()).toEqual([
            '서버 점검 안내',
            '신규 기능 출시',
            '정기 점검 일정',
        ])
        expect(screen.getByText('공지 3건')).toBeDefined()
    })

    it('불러오지 못하면 알리고, 다시 시도하면 복구된다', async () => {
        fakeApi.failOnce(500)
        await renderBoard()

        const alert = screen.getByRole('alert')
        expect(alert.textContent).toContain('공지를 불러오지 못했습니다')

        fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }))
        await advanceTime(0)

        expect(noticeTitles()).toHaveLength(3)
    })
})

describe('공지 검색', () => {
    it('입력이 멈추고 300ms 뒤에 그 검색어로 조회한다', async () => {
        await renderBoard()
        fakeApi.reset()
        const input = screen.getByRole('searchbox', { name: '공지 검색' })

        fireEvent.change(input, { target: { value: '점' } })
        await advanceTime(200)
        fireEvent.change(input, { target: { value: '점검' } })
        await advanceTime(299)
        expect(fakeApi.requests()).toEqual([])

        await advanceTime(1)
        await advanceTime(0)

        expect(fakeApi.requests().map((request) => request.url)).toEqual([
            `/api/notices?keyword=${encodeURIComponent('점검')}`,
        ])
        expect(noticeTitles()).toEqual(['서버 점검 안내', '정기 점검 일정'])
        expect(screen.getByText('공지 2건')).toBeDefined()
    })
})

describe('공지 등록', () => {
    it('등록하면 목록에 나타나고, 안내가 2초 동안 보였다가 사라진다', async () => {
        await renderBoard()

        fireEvent.change(screen.getByRole('textbox', { name: '새 공지' }), {
            target: { value: '휴무 안내' },
        })
        fireEvent.click(screen.getByRole('button', { name: '등록' }))
        await advanceTime(0)

        expect(noticeTitles()).toContain('휴무 안내')
        expect(screen.getByRole('status').textContent).toBe('등록했습니다')

        await advanceTime(1999)
        expect(screen.queryByRole('status')).not.toBeNull()
        await advanceTime(1)
        expect(screen.queryByRole('status')).toBeNull()
    })

    it('제목이 비어 있으면 서버의 400을 알리고 목록은 그대로 둔다', async () => {
        await renderBoard()
        const before = noticeTitles()

        fireEvent.click(screen.getByRole('button', { name: '등록' }))
        await advanceTime(0)

        expect(screen.getByRole('alert').textContent).toContain(
            '등록하지 못했습니다 (400)',
        )
        expect(noticeTitles()).toEqual(before)
    })
})

describe('도움말', () => {
    it('버튼으로 열고, Escape로 닫는다', async () => {
        await renderBoard()

        fireEvent.click(screen.getByRole('button', { name: '도움말' }))
        expect(screen.getByRole('note').textContent).toBe(
            '공지는 최신순으로 보입니다.',
        )

        fireEvent.keyDown(document, { key: 'Escape' })
        await advanceTime(0)

        expect(screen.queryByRole('note')).toBeNull()
    })

    it('바깥을 누르면 닫히고, 안쪽을 누르면 그대로다', async () => {
        await renderBoard()
        fireEvent.click(screen.getByRole('button', { name: '도움말' }))

        pressOutside(screen.getByRole('note'))
        await advanceTime(0)
        expect(screen.queryByRole('note')).not.toBeNull()

        pressOutside(screen.getByRole('heading', { name: '공지사항' }))
        await advanceTime(0)
        expect(screen.queryByRole('note')).toBeNull()
    })
})
