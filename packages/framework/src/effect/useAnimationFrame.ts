import { useEffect, useEffectEvent } from 'react'

export interface AnimationFrame {
    deltaMs: number
    elapsedMs: number
}

export function useAnimationFrame(
    callback: (frame: AnimationFrame) => void,
    isActive = true,
): void {
    const onFrame = useEffectEvent(callback)

    useEffect(() => {
        if (!isActive) return

        let frameId = 0
        let startedAt: number | null = null
        let previousAt: number | null = null

        const tick = (now: number) => {
            startedAt ??= now
            const deltaMs = now - (previousAt ?? now)
            previousAt = now
            onFrame({ deltaMs, elapsedMs: now - startedAt })
            frameId = requestAnimationFrame(tick)
        }

        frameId = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(frameId)
        }
    }, [isActive])
}
