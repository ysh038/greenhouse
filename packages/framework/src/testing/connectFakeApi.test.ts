import { expect, it } from 'vitest'

import { createFakeApi } from '../fake-api'
import { connectFakeApi } from './helpers'

function createGreetingApi() {
    return createFakeApi({
        routes: [
            {
                method: 'GET',
                path: '/api/greeting',
                handler: () => ({ body: { text: '안녕하세요' } }),
            },
        ],
    })
}

it('fetch로 나간 요청을 가짜 서버가 받는다', async () => {
    const fakeApi = connectFakeApi(createGreetingApi())

    const response = await fetch('/api/greeting')

    expect(await response.json()).toEqual({ text: '안녕하세요' })
    expect(fakeApi.requests()).toEqual([{ method: 'GET', url: '/api/greeting' }])
})

it('가짜 서버에 건 실패가 fetch에 그대로 나타난다', async () => {
    const fakeApi = connectFakeApi(createGreetingApi())
    fakeApi.failOnce(503)

    const response = await fetch('/api/greeting')

    expect(response.status).toBe(503)
})
