import { fireEvent, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useKeydown } from './useKeydown'

describe('useKeydown', () => {
    it('지정한 키가 눌리면 핸들러를 부른다', () => {
        const handler = vi.fn()
        renderHook(() => {
            useKeydown('Escape', handler)
        })

        fireEvent.keyDown(document, { key: 'Escape' })
        fireEvent.keyDown(document, { key: 'Enter' })

        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('여러 키를 받을 수 있다', () => {
        const handler = vi.fn()
        renderHook(() => {
            useKeydown(['ArrowUp', 'ArrowDown'], handler)
        })

        fireEvent.keyDown(document, { key: 'ArrowUp' })
        fireEvent.keyDown(document, { key: 'ArrowDown' })

        expect(handler).toHaveBeenCalledTimes(2)
    })

    it('isEnabled가 false면 부르지 않는다', () => {
        const handler = vi.fn()
        renderHook(() => {
            useKeydown('Escape', handler, { isEnabled: false })
        })

        fireEvent.keyDown(document, { key: 'Escape' })

        expect(handler).not.toHaveBeenCalled()
    })
})
