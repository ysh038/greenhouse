export interface FakeRequest {
    method: string
    url: string
    params: Record<string, string>
    query: URLSearchParams
    body: unknown
}

export interface FakeReply {
    status?: number
    body?: unknown
}

export interface FakeRoute {
    method: string
    path: string
    handler: (request: FakeRequest) => FakeReply
}

export interface FakeApi {
    fetch: (url: string, init: RequestInit) => Promise<Response>
    failOnce: (status: number, body?: unknown) => void
    hangOnce: () => void
    setDelayMs: (delayMs: number) => void
    requests: () => readonly { method: string; url: string }[]
    reset: () => void
}

type Override = { kind: 'fail'; reply: FakeReply } | { kind: 'hang' }

function matchPath(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/')
    const pathParts = path.split('/')
    if (patternParts.length !== pathParts.length) return null

    const params: Record<string, string> = {}
    for (const [index, part] of patternParts.entries()) {
        const actual = pathParts[index]
        if (actual === undefined) return null
        if (part.startsWith(':')) {
            params[part.slice(1)] = decodeURIComponent(actual)
        } else if (part !== actual) {
            return null
        }
    }
    return params
}

function readBody(init: RequestInit): unknown {
    if (typeof init.body !== 'string') return undefined
    const parsed: unknown = JSON.parse(init.body)
    return parsed
}

function toResponse(reply: FakeReply): Response {
    const status = reply.status ?? 200
    if (reply.body === undefined) return new Response(null, { status })
    return new Response(JSON.stringify(reply.body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delayMs)
    })
}

export function createFakeApi(options: {
    routes: readonly FakeRoute[]
    delayMs?: number
}): FakeApi {
    const initialDelayMs = options.delayMs ?? 0
    let delayMs = initialDelayMs
    let overrides: Override[] = []
    let log: { method: string; url: string }[] = []

    function resolveReply(method: string, url: string, init: RequestInit): FakeReply {
        const parsedUrl = new URL(url, 'http://fake.local')
        for (const route of options.routes) {
            if (route.method !== method) continue
            const params = matchPath(route.path, parsedUrl.pathname)
            if (params === null) continue
            return route.handler({
                method,
                url,
                params,
                query: parsedUrl.searchParams,
                body: readBody(init),
            })
        }
        return { status: 404, body: { code: 'NOT_FOUND' } }
    }

    return {
        fetch: async (url, init) => {
            const method = init.method ?? 'GET'
            log.push({ method, url })

            const override = overrides.shift()
            if (override?.kind === 'hang') {
                return new Promise<Response>(() => undefined)
            }

            if (delayMs > 0) await wait(delayMs)
            if (init.signal?.aborted) {
                throw new DOMException('요청이 취소되었습니다.', 'AbortError')
            }

            return toResponse(
                override?.kind === 'fail'
                    ? override.reply
                    : resolveReply(method, url, init),
            )
        },
        failOnce: (status, body = { code: 'FAKE_FAILURE' }) => {
            overrides.push({ kind: 'fail', reply: { status, body } })
        },
        hangOnce: () => {
            overrides.push({ kind: 'hang' })
        },
        setDelayMs: (nextDelayMs) => {
            delayMs = nextDelayMs
        },
        requests: () => log,
        reset: () => {
            delayMs = initialDelayMs
            overrides = []
            log = []
        },
    }
}
