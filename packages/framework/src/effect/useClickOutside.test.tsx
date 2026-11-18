import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useClickOutside } from './useClickOutside'

function Panel({
    onOutside,
    isEnabled,
}: {
    onOutside: () => void
    isEnabled?: boolean
}) {
    const panelRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    useClickOutside([panelRef, triggerRef], onOutside, { isEnabled })
    return (
        <>
            <button ref={triggerRef} type="button">
                열기
            </button>
            <div ref={panelRef}>
                <span>안쪽</span>
            </div>
            <p>바깥</p>
        </>
    )
}

describe('useClickOutside', () => {
    it('바깥을 누르면 핸들러를 부른다', () => {
        const onOutside = vi.fn()
        render(<Panel onOutside={onOutside} />)

        fireEvent.pointerDown(screen.getByText('바깥'))

        expect(onOutside).toHaveBeenCalledTimes(1)
    })

    it('ref 안쪽이나 함께 넘긴 다른 ref를 누르면 부르지 않는다', () => {
        const onOutside = vi.fn()
        render(<Panel onOutside={onOutside} />)

        fireEvent.pointerDown(screen.getByText('안쪽'))
        fireEvent.pointerDown(screen.getByText('열기'))

        expect(onOutside).not.toHaveBeenCalled()
    })

    it('isEnabled가 false면 부르지 않는다', () => {
        const onOutside = vi.fn()
        render(<Panel onOutside={onOutside} isEnabled={false} />)

        fireEvent.pointerDown(screen.getByText('바깥'))

        expect(onOutside).not.toHaveBeenCalled()
    })
})
