import { useEffect, useEffectEvent } from 'react'

export function useInterval(callback: () => void, delayMs: number | null): void {
    const onTick = useEffectEvent(callback)

    useEffect(() => {
        if (delayMs === null) return

        const intervalId = setInterval(() => {
            onTick()
        }, delayMs)
        return () => {
            clearInterval(intervalId)
        }
    }, [delayMs])
}
