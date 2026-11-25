import type { FakeApi } from '@agent-greenhouse/framework/fake-api'
import {
    advanceTime,
    connectFakeApi,
    renderWithData,
} from '@agent-greenhouse/framework/testing'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeServer } from '../shared/fake/fakeApi'

import { UsersSection } from './UsersSection'

async function renderSection() {
    renderWithData(<UsersSection />)
    await advanceTime(0)
}

function listItems() {
    return within(screen.getByRole('list', { name: '사용자 목록' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent)
}

function requestedUrls() {
    return fakeApi.requests().map((request) => request.url)
}

async function openPanel(name: string) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }))
    await advanceTime(0)
    return screen.getByRole('complementary', { name: '사용자 상세' })
}

let fakeApi: FakeApi

beforeEach(() => {
    vi.useFakeTimers()
    fakeApi = connectFakeApi(createFakeServer())
})

describe('목록', () => {
    it('불러오는 동안 안내를 보여 주고, 끝나면 이름과 이메일을 보여 준다', async () => {
        fakeApi.hangOnce()
        const { unmount } = renderWithData(<UsersSection />)
        expect(screen.getByText('불러오는 중')).toBeDefined()
        unmount()

        await renderSection()

        expect(listItems()).toHaveLength(5)
        expect(listItems()[0]).toBe('김하늘 haneul.kim@example.com')
    })

    it('실패하면 알리고, 다시 시도하면 불러온다', async () => {
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        fakeApi.failOnce(500)

        await renderSection()

        expect(screen.getByRole('alert').textContent).toContain(
            '불러오지 못했습니다 (500)',
        )

        fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
        await advanceTime(0)

        expect(listItems()).toHaveLength(5)
        consoleError.mockRestore()
    })
})

describe('검색', () => {
    it('입력이 멈추고 300ms가 지나야 그 검색어로 조회한다', async () => {
        await renderSection()
        const input = screen.getByRole('searchbox', { name: '사용자 검색' })
        fakeApi.reset()

        fireEvent.change(input, { target: { value: '김' } })
        await advanceTime(200)
        fireEvent.change(input, { target: { value: '김지' } })
        await advanceTime(299)

        expect(requestedUrls()).toEqual([])

        await advanceTime(1)

        expect(requestedUrls()).toEqual([
            `/api/users?keyword=${encodeURIComponent('김지')}`,
        ])
        expect(listItems()).toEqual(['김지호 jiho.kim@example.com'])
    })

    it('검색어를 비우면 전체 목록을 보여 준다', async () => {
        await renderSection()
        const input = screen.getByRole('searchbox', { name: '사용자 검색' })
        expect(requestedUrls()).toEqual(['/api/users'])

        fireEvent.change(input, { target: { value: '없는 이름' } })
        await advanceTime(300)
        expect(screen.getByText('조건에 맞는 사용자가 없습니다.')).toBeDefined()

        fireEvent.change(input, { target: { value: '' } })
        await advanceTime(300)

        expect(listItems()).toHaveLength(5)
    })
})

describe('상세 패널', () => {
    it('사용자를 누르면 열리고 이름 입력란에 포커스가 간다', async () => {
        await renderSection()

        const panel = await openPanel('이도윤')
        const nameInput = within(panel).getByRole('textbox', { name: '이름' })

        expect(nameInput).toHaveProperty('value', '이도윤')
        expect(document.activeElement).toBe(nameInput)
        expect(within(panel).getByText('doyun.lee@example.com')).toBeDefined()
    })

    it('Escape를 누르면 닫힌다', async () => {
        await renderSection()
        await openPanel('이도윤')

        fireEvent.keyDown(document, { key: 'Escape' })

        expect(screen.queryByRole('complementary')).toBeNull()
    })

    it('패널 바깥을 누르면 닫히고, 안쪽을 누르면 그대로다', async () => {
        await renderSection()
        const panel = await openPanel('이도윤')

        fireEvent.pointerDown(within(panel).getByRole('textbox'))
        expect(screen.queryByRole('complementary')).not.toBeNull()

        fireEvent.pointerDown(screen.getByRole('heading', { name: '사용자' }))
        expect(screen.queryByRole('complementary')).toBeNull()
    })

    it('없는 사용자면 실패를 알린다', async () => {
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        await renderSection()
        fakeApi.failOnce(404)

        const panel = await openPanel('이도윤')

        expect(within(panel).getByRole('alert').textContent).toContain(
            '사용자를 찾을 수 없습니다 (404)',
        )
        consoleError.mockRestore()
    })
})

describe('이름 수정', () => {
    it('저장하면 목록에 반영되고 안내가 2초 동안 보인다', async () => {
        await renderSection()
        const panel = await openPanel('박서연')

        fireEvent.change(within(panel).getByRole('textbox', { name: '이름' }), {
            target: { value: '박서준' },
        })
        fireEvent.click(within(panel).getByRole('button', { name: '저장' }))
        await advanceTime(0)

        expect(listItems()).toContain('박서준 seoyeon.park@example.com')
        expect(within(panel).getByRole('status').textContent).toBe('저장했습니다')

        await advanceTime(1999)
        expect(within(panel).queryByRole('status')).not.toBeNull()

        await advanceTime(1)
        expect(within(panel).queryByRole('status')).toBeNull()
    })

    it('빈 이름으로 저장하면 400 실패를 알리고 목록은 그대로다', async () => {
        await renderSection()
        const panel = await openPanel('Alex Morgan')

        fireEvent.change(within(panel).getByRole('textbox', { name: '이름' }), {
            target: { value: '' },
        })
        fireEvent.click(within(panel).getByRole('button', { name: '저장' }))
        await advanceTime(0)

        expect(within(panel).getByRole('alert').textContent).toBe(
            '이름이 비어 있어 저장하지 못했습니다 (400)',
        )
        expect(within(panel).queryByRole('status')).toBeNull()
        expect(listItems()).toContain('Alex Morgan alex.morgan@example.com')
    })
})

describe('창 너비', () => {
    it('현재 창 너비를 보여 주고 크기가 바뀌면 갱신한다', async () => {
        await renderSection()
        const width = screen.getByRole('status', { name: '창 너비' })

        expect(width.textContent).toBe(`${window.innerWidth}px`)

        act(() => {
            window.innerWidth = 640
            fireEvent(window, new Event('resize'))
        })

        expect(width.textContent).toBe('640px')
    })
})
