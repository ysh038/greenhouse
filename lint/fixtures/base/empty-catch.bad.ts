// expect: no-empty
export function parse(text: string): unknown {
    let value: unknown = null
    try {
        value = JSON.parse(text)
    } catch {}
    return value
}
