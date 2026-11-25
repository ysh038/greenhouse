import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import { App } from './App'

it('제목을 보여 준다', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '온실 관리' })).toBeDefined()
})
