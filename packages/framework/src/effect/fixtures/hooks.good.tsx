import {
    useAnimationFrame,
    useClickOutside,
    useDebouncedValue,
    useEventListener,
    useInterval,
    useKeydown,
    useTimeout,
} from '@agent-greenhouse/framework/effect'
import { TextField } from '@agent-greenhouse/framework/ui'
import { useRef, useState } from 'react'

export function Menu({ onClose }: { onClose: () => void }) {
    const panelRef = useRef<HTMLDivElement>(null)
    const [query, setQuery] = useState('')
    const [width, setWidth] = useState(0)
    const [seconds, setSeconds] = useState(0)
    const [progress, setProgress] = useState(0)
    const [isLeaving, setIsLeaving] = useState(false)
    const debouncedQuery = useDebouncedValue(query, 300)

    useClickOutside(panelRef, () => {
        setIsLeaving(true)
    })
    useKeydown('Escape', () => {
        setIsLeaving(true)
    })
    useEventListener(window, 'resize', () => {
        setWidth(window.innerWidth)
    })
    useTimeout(onClose, isLeaving ? 200 : null)
    useTimeout(
        () => {
            setSeconds(0)
        },
        5000,
        query,
    )
    useInterval(() => {
        setSeconds((previous) => previous + 1)
    }, 1000)
    useAnimationFrame(({ elapsedMs }) => {
        setProgress(Math.min(1, elapsedMs / 200))
    }, isLeaving)

    return (
        <div ref={panelRef} style={{ opacity: 1 - progress }}>
            <TextField label="검색어" value={query} onChange={setQuery} />
            <p>
                {debouncedQuery} {width} {seconds}
            </p>
        </div>
    )
}
