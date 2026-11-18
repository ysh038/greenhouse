import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeApi } from './createFakeApi'

function setup(delayMs = 0) {
    const users = [{ id: 1, name: '김' }]
    return createFakeApi({
        delayMs,
        routes: [
            {
                method: 'GET',
                path: '/api/users',
                handler: ({ query }) => ({
                    body: users.filter((user) =>
                        user.name.includes(query.get('keyword') ?? ''),
                    ),
                }),
            },
            {
                method: 'GET',
                path: '/api/users/:id',
                handler: ({ params }) => {
                    const user = users.find(
                        (candidate) => candidate.id === Number(params.id),
                    )
                    return user ? { body: user } : { status: 404 }
                },
            },
            {
                method: 'POST',
                path: '/api/users',
                handler: ({ body }) => ({ status: 201, body }),
            },
        ],
    })
}

async function read(response: Response): Promise<unknown> {
    const text = await response.text()
    return text === '' ? undefined : JSON.parse(text)
}

describe('createFakeApi', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    it('메서드와 경로가 맞는 핸들러의 응답을 돌려준다', async () => {
        const api = setup()

        const response = await api.fetch('/api/users?keyword=김', {})

        expect(response.status).toBe(200)
        expect(await read(response)).toEqual([{ id: 1, name: '김' }])
    })

    it('경로의 :이름 부분을 params로 넘긴다', async () => {
        const api = setup()

        const found = await api.fetch('/api/users/1', { method: 'GET' })
        const missing = await api.fetch('/api/users/9', { method: 'GET' })

        expect(await read(found)).toEqual({ id: 1, name: '김' })
        expect(missing.status).toBe(404)
    })

    it('JSON 본문을 읽어 핸들러에 넘긴다', async () => {
        const api = setup()

        const response = await api.fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({ name: '이' }),
        })

        expect(response.status).toBe(201)
        expect(await read(response)).toEqual({ name: '이' })
    })

    it('맞는 경로가 없으면 404를 준다', async () => {
        const api = setup()

        const response = await api.fetch('/api/unknown', {})

        expect(response.status).toBe(404)
    })

    it('failOnce는 다음 요청 한 번만 실패시킨다', async () => {
        const api = setup()
        api.failOnce(500)

        const first = await api.fetch('/api/users', {})
        const second = await api.fetch('/api/users', {})

        expect(first.status).toBe(500)
        expect(second.status).toBe(200)
    })

    it('hangOnce는 다음 요청 한 번을 끝나지 않게 한다', async () => {
        const api = setup()
        const onSettled = vi.fn()
        api.hangOnce()

        void api.fetch('/api/users', {}).finally(onSettled)
        await vi.advanceTimersByTimeAsync(10_000)
        const next = await api.fetch('/api/users', {})

        expect(onSettled).not.toHaveBeenCalled()
        expect(next.status).toBe(200)
    })

    it('delayMs만큼 기다린 뒤 응답한다', async () => {
        const api = setup(300)
        const onResponse = vi.fn()

        void api.fetch('/api/users', {}).then(onResponse)
        await vi.advanceTimersByTimeAsync(299)
        expect(onResponse).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)

        expect(onResponse).toHaveBeenCalledTimes(1)
    })

    it('요청 기록을 남기고 reset으로 지운다', async () => {
        const api = setup()

        await api.fetch('/api/users', {})
        await api.fetch('/api/users', { method: 'POST', body: '{}' })

        expect(api.requests()).toEqual([
            { method: 'GET', url: '/api/users' },
            { method: 'POST', url: '/api/users' },
        ])
        api.reset()
        expect(api.requests()).toEqual([])
    })
})
