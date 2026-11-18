// expect: no-restricted-syntax
export function watchResize(onResize: () => void): void {
    window.addEventListener('resize', onResize)
}
