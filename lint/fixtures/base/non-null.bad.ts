// expect: @typescript-eslint/no-non-null-assertion
export function firstName(names: string[]): string {
    return names[0]!
}
