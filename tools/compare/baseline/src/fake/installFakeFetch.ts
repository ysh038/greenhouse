import { fakeApi } from './fakeApi'

/** /api 로 가는 fetch를 가짜 서버로 돌립니다. 그 밖의 요청은 원래 fetch로 보냅니다. */
export function installFakeFetch(): void {
    const realFetch = globalThis.fetch

    globalThis.fetch = async (input, init) => {
        const request = input instanceof Request ? input : null
        const href =
            typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const url = new URL(href, 'http://app.local')
        if (!url.pathname.startsWith('/api/')) return realFetch(input, init)

        const body = init?.body ?? (request ? await request.clone().text() : undefined)
        return fakeApi.fetch(`${url.pathname}${url.search}`, {
            ...init,
            method: init?.method ?? request?.method ?? 'GET',
            body: body === '' ? undefined : body,
            signal: init?.signal ?? request?.signal,
        })
    }
}
