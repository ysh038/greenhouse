// expect: @typescript-eslint/no-floating-promises
async function save(): Promise<void> {
    await Promise.resolve()
}

export function handleSave(): void {
    save()
}
