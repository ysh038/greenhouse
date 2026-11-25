import { renderWithData } from '@agent-greenhouse/framework/testing'
import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import { App } from '../App'

it('처음 주소에서 홈 화면을 보여 준다', () => {
    renderWithData(<App />)

    expect(screen.getByRole('heading', { name: '홈' })).toBeDefined()
})

it('없는 주소면 알리고 홈으로 가는 링크를 준다', () => {
    renderWithData(<App />, { path: '/nothing' })

    expect(screen.getByRole('alert').textContent).toBe('화면을 찾을 수 없습니다')
    expect(screen.getByRole('link', { name: '홈으로' })).toBeDefined()
})
