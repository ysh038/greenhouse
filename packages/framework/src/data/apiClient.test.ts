import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createApiClient } from './apiClient'
import { ApiError, ApiSchemaError, isApiError } from './errors'

const UserSchema = z.object({ id: z.string(), name: z.string() })

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status })
}

function setup(response: Response) {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
        () => Promise.resolve(response),
    )
    const api = createApiClient({
        baseUrl: '/api',
        getHeaders: () => ({ Authorization: 'Bearer token' }),
        fetch: fetchMock,
    })
    return { api, fetchMock }
}

describe('createApiClient', () => {
    it('스키마로 검증한 값을 돌려준다', async () => {
        const { api } = setup(jsonResponse({ id: '1', name: '김' }))

        const user = await api.get('/users/1', { schema: UserSchema })

        expect(user).toEqual({ id: '1', name: '김' })
    })

    it('기본 URL, 쿼리 문자열, 헤더를 붙여 보낸다', async () => {
        const { api, fetchMock } = setup(jsonResponse([]))

        await api.get('/users', {
            schema: z.array(UserSchema),
            query: { page: 2, keyword: '김', empty: undefined, none: null },
        })

        const [url, init] = fetchMock.mock.calls[0] ?? []
        expect(url).toBe('/api/users?page=2&keyword=%EA%B9%80')
        expect(init?.method).toBe('GET')
        expect(init?.headers).toMatchObject({
            Accept: 'application/json',
            Authorization: 'Bearer token',
        })
    })

    it('본문이 있으면 JSON으로 보낸다', async () => {
        const { api, fetchMock } = setup(jsonResponse({ id: '2', name: '이' }))

        await api.post('/users', { schema: UserSchema, body: { name: '이' } })

        const [, init] = fetchMock.mock.calls[0] ?? []
        expect(init?.method).toBe('POST')
        expect(init?.body).toBe('{"name":"이"}')
        expect(init?.headers).toMatchObject({
            'Content-Type': 'application/json',
        })
    })

    it('응답이 스키마와 다르면 어느 필드가 틀렸는지 알려 주며 실패한다', async () => {
        const { api } = setup(jsonResponse({ id: 1 }))

        const error: unknown = await api
            .get('/users/1', { schema: UserSchema })
            .catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(ApiSchemaError)
        expect(String(error)).toContain('GET /api/users/1')
        expect(String(error)).toContain('· id:')
        expect(String(error)).toContain('· name:')
    })

    it('2xx가 아니면 상태 코드와 본문을 담은 ApiError로 실패한다', async () => {
        const { api } = setup(jsonResponse({ code: 'NOT_FOUND' }, 404))

        const error: unknown = await api
            .get('/users/9', { schema: UserSchema })
            .catch((caught: unknown) => caught)

        expect(isApiError(error)).toBe(true)
        expect(error).toBeInstanceOf(ApiError)
        expect(error).toMatchObject({
            status: 404,
            body: { code: 'NOT_FOUND' },
        })
    })

    it('본문이 없는 응답은 z.void()로 받는다', async () => {
        const { api } = setup(new Response(null, { status: 204 }))

        await expect(
            api.delete('/users/1', { schema: z.void() }),
        ).resolves.toBeUndefined()
    })
})
