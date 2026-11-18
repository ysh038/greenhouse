// expect: no-restricted-globals
export async function loadUser(id: string): Promise<unknown> {
    const response = await fetch(`/api/users/${id}`)
    return response.json()
}
