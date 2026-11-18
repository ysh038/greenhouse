// expect: @typescript-eslint/no-explicit-any
export function size(input: any): number {
    return String(input).length
}
