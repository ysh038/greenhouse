import { renderWithData } from '@agent-greenhouse/framework/testing'
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from '../App'

function plantNames() {
    return within(screen.getByRole('list', { name: '식물 목록' }))
        .getAllByRole('link')
        .map((link) => link.textContent)
}

const sortSelect = () => screen.getByRole('combobox', { name: '정렬' })

describe('식물 목록', () => {
    it('/plants에서 이름순으로 보여 주고 메뉴의 "식물"이 지금 화면으로 표시된다', () => {
        renderWithData(<App />, { path: '/plants' })

        expect(screen.getByRole('heading', { name: '식물' })).toBeDefined()
        expect(plantNames()).toEqual(['몬스테라', '스킨답서스', '올리브나무', '유칼립투스'])
        expect(
            screen.getByRole('link', { name: '식물' }).getAttribute('aria-current'),
        ).toBe('page')
        expect(
            screen.getByRole('link', { name: '홈' }).getAttribute('aria-current'),
        ).toBeNull()
    })

    it('정렬을 바꾸면 순서가 바뀌고 주소에 남는다', () => {
        renderWithData(<App />, { path: '/plants' })

        fireEvent.change(sortSelect(), { target: { value: 'stock' } })

        expect(plantNames()).toEqual(['스킨답서스', '몬스테라', '유칼립투스', '올리브나무'])
        expect(window.location.search).toBe('?sort=stock')
    })

    it('주소에 정렬이 있으면 그 순서로 열린다', () => {
        renderWithData(<App />, { path: '/plants?sort=stock' })

        expect(sortSelect()).toHaveProperty('value', 'stock')
        expect(plantNames()[0]).toBe('스킨답서스')
    })

    it('주소의 정렬 값이 모르는 값이면 이름순으로 본다', () => {
        renderWithData(<App />, { path: '/plants?sort=price' })

        expect(sortSelect()).toHaveProperty('value', 'name')
        expect(plantNames()[0]).toBe('몬스테라')
    })
})

describe('식물 상세', () => {
    it('목록에서 식물을 누르면 그 식물의 화면으로 가고 주소가 바뀐다', () => {
        renderWithData(<App />, { path: '/plants' })

        fireEvent.click(screen.getByRole('link', { name: '올리브나무' }))

        expect(screen.getByRole('heading', { name: '올리브나무' })).toBeDefined()
        expect(screen.getByText('재고 0개')).toBeDefined()
        expect(window.location.pathname).toBe('/plants/3')
        expect(
            screen.getByRole('link', { name: '식물' }).getAttribute('aria-current'),
        ).toBe('page')
    })

    it('"식물 목록으로"를 누르면 목록으로 돌아간다', () => {
        renderWithData(<App />, { path: '/plants/2' })
        expect(screen.getByRole('heading', { name: '스킨답서스' })).toBeDefined()

        fireEvent.click(screen.getByRole('link', { name: '식물 목록으로' }))

        expect(screen.getByRole('heading', { name: '식물' })).toBeDefined()
        expect(window.location.pathname).toBe('/plants')
    })

    it('없는 식물의 주소면 알린다', () => {
        renderWithData(<App />, { path: '/plants/999' })

        expect(screen.getByRole('alert').textContent).toBe('식물을 찾을 수 없습니다')
        expect(screen.getByRole('link', { name: '식물 목록으로' })).toBeDefined()
    })
})

describe('없는 주소', () => {
    it('어느 화면에도 맞지 않으면 알리고 홈으로 가는 링크를 준다', () => {
        renderWithData(<App />, { path: '/nothing/here' })

        expect(screen.getByRole('alert').textContent).toBe('화면을 찾을 수 없습니다')
        expect(screen.getByRole('link', { name: '홈으로' }).getAttribute('href')).toBe('/')
    })
})
