import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InvitePanel } from './InvitePanel'

function memberNames() {
    return within(screen.getByRole('list', { name: '구성원' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent)
}

function meter() {
    return screen.getByRole('meter', { name: '사용한 자리' })
}

function emailInput() {
    return screen.getByRole('textbox', { name: '이메일' })
}

function invite(email: string) {
    fireEvent.change(emailInput(), { target: { value: email } })
    fireEvent.click(screen.getByRole('button', { name: '초대' }))
}

function pressOutside(element: Element) {
    fireEvent.pointerDown(element)
    fireEvent.mouseDown(element)
    fireEvent.click(element)
}

describe('구성원 목록', () => {
    it('구성원과 사용한 자리를 보여 준다', () => {
        render(<InvitePanel />)

        expect(memberNames()).toEqual([
            'haneul.kim@example.com (관리자)',
            'doyun.lee@example.com',
            'seoyeon.park@example.com',
        ])
        expect(screen.getByText('자리 3 / 5')).toBeDefined()
        expect(meter().getAttribute('aria-valuenow')).toBe('3')
        expect(meter().style.width).toBe('60%')
    })

    it('구성원을 눌러 선택하고 내보내면 목록과 자리에서 빠진다', () => {
        render(<InvitePanel />)
        const row = screen.getByRole('button', { name: 'doyun.lee@example.com' })

        fireEvent.click(row)

        expect(row.getAttribute('aria-pressed')).toBe('true')
        expect(screen.getByText('선택: doyun.lee@example.com')).toBeDefined()

        fireEvent.click(screen.getByRole('button', { name: '내보내기' }))

        expect(memberNames()).toEqual([
            'haneul.kim@example.com (관리자)',
            'seoyeon.park@example.com',
        ])
        expect(screen.getByText('자리 2 / 5')).toBeDefined()
        expect(meter().style.width).toBe('40%')
        expect(screen.queryByRole('button', { name: '내보내기' })).toBeNull()
    })
})

describe('초대', () => {
    it('이메일과 관리자 권한을 넣어 초대하면 목록에 추가되고 입력이 비워진다', () => {
        render(<InvitePanel />)
        const adminCheckbox = screen.getByRole('checkbox', { name: '관리자 권한' })

        fireEvent.click(adminCheckbox)
        invite('jiho.kim@example.com')

        expect(memberNames()).toContain('jiho.kim@example.com (관리자)')
        expect(emailInput()).toHaveProperty('value', '')
        expect(adminCheckbox).toHaveProperty('checked', false)
        expect(screen.getByText('자리 4 / 5')).toBeDefined()
    })

    it('이메일이 비었거나 이미 구성원이면 알리고 추가하지 않는다', () => {
        render(<InvitePanel />)

        invite('  ')
        expect(screen.getByRole('alert').textContent).toBe('이메일을 입력하세요')

        invite('doyun.lee@example.com')
        expect(screen.getByRole('alert').textContent).toBe('이미 구성원입니다')

        expect(memberNames()).toHaveLength(3)
    })

    it('지우기는 입력만 비우고 초대하지 않는다', () => {
        render(<InvitePanel />)
        fireEvent.change(emailInput(), { target: { value: 'jiho.kim@example.com' } })

        fireEvent.click(screen.getByRole('button', { name: '지우기' }))

        expect(emailInput()).toHaveProperty('value', '')
        expect(memberNames()).toHaveLength(3)
        expect(screen.queryByRole('alert')).toBeNull()
    })

    it('자리가 다 차면 초대할 수 없다', () => {
        render(<InvitePanel />)

        invite('jiho.kim@example.com')
        invite('alex.morgan@example.com')

        expect(screen.getByText('자리 5 / 5')).toBeDefined()
        expect(meter().style.width).toBe('100%')
        expect(screen.getByRole('button', { name: '초대' })).toHaveProperty(
            'disabled',
            true,
        )
    })
})

describe('자리 설명', () => {
    it('누르면 설명이 열리고, 안쪽을 누르면 그대로, 바깥을 누르면 닫힌다', () => {
        render(<InvitePanel />)
        const toggle = screen.getByRole('button', { name: '자리란?' })
        expect(screen.queryByRole('note')).toBeNull()

        fireEvent.click(toggle)
        expect(toggle.getAttribute('aria-expanded')).toBe('true')
        expect(screen.getByRole('note').textContent).toBe(
            '자리는 구성원 한 명이 쓰는 이용권입니다.',
        )

        pressOutside(screen.getByRole('note'))
        expect(screen.queryByRole('note')).not.toBeNull()

        pressOutside(screen.getByRole('heading', { name: '구성원 초대' }))
        expect(screen.queryByRole('note')).toBeNull()
    })
})
