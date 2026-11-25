import { act, render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'

import { createDataClient, DataProvider } from '../data'
import type { FakeApi } from '../fake-api'

/**
 * 데이터 모듈을 쓰는 화면을 테스트에서 그립니다. 재시도는 끕니다.
 * path를 주면 그 주소에서 연 것처럼 그립니다(라우터 모듈의 AppRouter가 든 화면). 안 주면 '/'입니다.
 */
export function renderWithData(
    ui: ReactNode,
    options: { path?: string } = {},
): RenderResult {
    window.history.replaceState(null, '', options.path ?? '/')
    return render(
        <DataProvider client={createDataClient({ retry: false })}>
            {ui}
        </DataProvider>,
    )
}

export async function advanceTime(ms: number): Promise<void> {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
    })
}

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
