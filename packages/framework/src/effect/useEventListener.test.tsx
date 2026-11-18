import { render, renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useEventListener } from './useEventListener'

describe('useEventListener', () => {
    it('대상에서 이벤트가 나면 핸들러를 부른다', () => {
        const handler = vi.fn()
        renderHook(() => {
            useEventListener(window, 'resize', handler)
        })

        window.dispatchEvent(new Event('resize'))

        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('언마운트하면 리스너를 해제한다', () => {
        const handler = vi.fn()
        const { unmount } = renderHook(() => {
            useEventListener(document, 'visibilitychange', handler)
        })

        unmount()
        document.dispatchEvent(new Event('visibilitychange'))

        expect(handler).not.toHaveBeenCalled()
    })

    it('핸들러가 바뀌어도 다시 등록하지 않고 최신 핸들러를 부른다', () => {
        const addSpy = vi.spyOn(window, 'addEventListener')
        const first = vi.fn()
        const second = vi.fn()
        const { rerender } = renderHook(
            ({ handler }) => {
                useEventListener(window, 'resize', handler)
            },
            { initialProps: { handler: first } },
        )
        const callsAfterMount = addSpy.mock.calls.length

        rerender({ handler: second })
        window.dispatchEvent(new Event('resize'))

        expect(addSpy.mock.calls.length).toBe(callsAfterMount)
        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
        addSpy.mockRestore()
    })

    it('ref로 받은 요소에 등록한다', () => {
        const handler = vi.fn()
        function Box() {
            const ref = useRef<HTMLDivElement>(null)
            useEventListener(ref, 'click', handler)
            return <div ref={ref}>상자</div>
        }
        const { getByText } = render(<Box />)

        getByText('상자').click()

        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('대상이 null이면 아무것도 등록하지 않는다', () => {
        const addSpy = vi.spyOn(window, 'addEventListener')
        const handler = vi.fn()
        renderHook(() => {
            useEventListener(null, 'resize', handler)
        })

        window.dispatchEvent(new Event('resize'))

        expect(handler).not.toHaveBeenCalled()
        expect(addSpy).not.toHaveBeenCalledWith(
            'resize',
            expect.anything(),
            expect.anything(),
        )
        addSpy.mockRestore()
    })
})
