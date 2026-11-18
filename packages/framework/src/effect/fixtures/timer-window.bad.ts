// expect: no-restricted-properties
export function scheduleFrame(paint: () => void): number {
    return window.requestAnimationFrame(paint)
}
