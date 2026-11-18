import { useEventListener } from './useEventListener'

export function useKeydown(
    key: string | readonly string[],
    handler: (event: KeyboardEvent) => void,
    { isEnabled = true }: { isEnabled?: boolean } = {},
): void {
    useEventListener(isEnabled ? document : null, 'keydown', (event) => {
        const keys = typeof key === 'string' ? [key] : key
        if (keys.includes(event.key)) handler(event)
    })
}
