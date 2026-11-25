import { vi } from 'vitest'

import type { FakeApi } from '../fake/createFakeApi'

/**
 * 테스트 동안 `fetch`로 나가는 요청을 가짜 서버가 받게 합니다. 받은 가짜 서버를 그대로 돌려줍니다.
 * `beforeEach`에서 새 가짜 서버를 만들어 넘기면 테스트마다 데이터가 처음 상태입니다.
 * 바꿔 둔 `fetch`는 vitest 설정의 `unstubGlobals: true`가 테스트마다 되돌립니다.
 */
export function connectFakeApi(fakeApi: FakeApi): FakeApi {
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : input.toString()
        return fakeApi.fetch(url, init ?? {})
    })
    return fakeApi
}
