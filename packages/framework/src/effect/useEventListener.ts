import { useEffect, useEffectEvent, type RefObject } from 'react'

export interface ListenerOptions {
    capture?: boolean
    passive?: boolean
    once?: boolean
}

type ElementTarget = HTMLElement | RefObject<HTMLElement | null> | null
type ListenerTarget = Window | Document | ElementTarget

function resolveTarget(target: ListenerTarget): EventTarget | null {
    if (target === null) return null
    return 'current' in target ? target.current : target
}

export function useEventListener<K extends keyof WindowEventMap>(
    target: Window | null,
    type: K,
    handler: (event: WindowEventMap[K]) => void,
    options?: ListenerOptions,
): void
export function useEventListener<K extends keyof DocumentEventMap>(
    target: Document | null,
    type: K,
    handler: (event: DocumentEventMap[K]) => void,
    options?: ListenerOptions,
): void
export function useEventListener<K extends keyof HTMLElementEventMap>(
    target: ElementTarget,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: ListenerOptions,
): void
export function useEventListener(
    target: ListenerTarget,
    type: string,
    handler: (event: Event) => void,
    options: ListenerOptions = {},
): void {
    const { capture, passive, once } = options
    const onEvent = useEffectEvent(handler)

    useEffect(() => {
        const eventTarget = resolveTarget(target)
        if (eventTarget === null) return

        const listener = (event: Event) => {
            onEvent(event)
        }
        const listenerOptions = { capture, passive, once }

        eventTarget.addEventListener(type, listener, listenerOptions)
        return () => {
            eventTarget.removeEventListener(type, listener, listenerOptions)
        }
    }, [target, type, capture, passive, once])
}
