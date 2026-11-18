// expect: no-restricted-imports
import axios from 'axios'

export async function loadUser(id: string): Promise<unknown> {
    const response = await axios.get(`/api/users/${id}`)
    return response.data
}
