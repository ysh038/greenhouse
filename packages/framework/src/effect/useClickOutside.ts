import type { RefObject } from 'react'

import { useEventListener } from './useEventListener'

type ElementRef = RefObject<HTMLElement | null>

export function useClickOutside(
    refs: ElementRef | readonly ElementRef[],
    handler: (event: PointerEvent) => void,
    { isEnabled = true }: { isEnabled?: boolean } = {},
): void {
    useEventListener(isEnabled ? document : null, 'pointerdown', (event) => {
        const target = event.target
        if (!(target instanceof Node)) return

        const elementRefs = 'current' in refs ? [refs] : refs
        const isInside = elementRefs.some((ref) => ref.current?.contains(target))
        if (!isInside) handler(event)
    })
}
