// expect: no-restricted-globals
export function focusLater(input: HTMLInputElement): void {
    setTimeout(() => {
        input.focus()
    }, 0)
}
