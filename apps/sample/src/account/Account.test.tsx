import { renderWithData } from '@agent-greenhouse/framework/testing'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from '../App'

const heading = (name: string) => screen.getByRole('heading', { name })
const signInAs = (name: '구성원으로 로그인' | '관리자로 로그인') => {
    fireEvent.click(screen.getByRole('button', { name }))
}

describe('보호된 화면', () => {
    it('로그인하지 않고 내 계정에 들어가면 로그인 화면으로 가고 이유를 알린다', () => {
        renderWithData(<App />, { path: '/account' })

        expect(heading('로그인')).toBeDefined()
        expect(screen.getByRole('status').textContent).toBe('로그인이 필요합니다')
        expect(window.location.pathname).toBe('/login')
    })

    it('로그인 화면에 직접 들어오면 안내 없이 보이고, 로그인하면 내 계정으로 간다', () => {
        renderWithData(<App />, { path: '/login' })
        expect(screen.queryByRole('status')).toBeNull()

        signInAs('구성원으로 로그인')

        expect(heading('내 계정')).toBeDefined()
        expect(screen.getByText('역할: 구성원')).toBeDefined()
        expect(window.location.pathname).toBe('/account')
    })

    it('관리자 화면에 들어가려다 로그인하면 관리자 화면으로 돌아간다', () => {
        renderWithData(<App />, { path: '/admin' })
        expect(heading('로그인')).toBeDefined()

        signInAs('관리자로 로그인')

        expect(heading('관리자 화면')).toBeDefined()
        expect(window.location.pathname).toBe('/admin')
    })

    it('구성원은 관리자 화면에 들어가지 못하고 내 계정으로 돌아온다', () => {
        renderWithData(<App />, { path: '/login' })
        signInAs('구성원으로 로그인')

        fireEvent.click(screen.getByRole('link', { name: '관리자 화면' }))

        expect(heading('내 계정')).toBeDefined()
        expect(window.location.pathname).toBe('/account')
    })

    it('로그아웃하면 안내 없이 로그인 화면으로 간다', () => {
        renderWithData(<App />, { path: '/login' })
        signInAs('구성원으로 로그인')

        fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

        expect(heading('로그인')).toBeDefined()
        expect(screen.queryByRole('status')).toBeNull()
        expect(window.location.pathname).toBe('/login')
    })
})
