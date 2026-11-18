// expect: no-restricted-properties
export async function loadUser(id: string): Promise<unknown> {
    const response = await window.fetch(`/api/users/${id}`)
    return response.json()
}
