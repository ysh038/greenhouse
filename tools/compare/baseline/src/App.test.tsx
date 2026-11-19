import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import { App } from './App'
import { renderWithProviders } from './test/render'

it('제목을 보여 준다', () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('heading', { name: '온실 관리' })).toBeDefined()
})
