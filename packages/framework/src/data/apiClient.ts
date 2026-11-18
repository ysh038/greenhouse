import type { z } from 'zod'

import { ApiError, ApiSchemaError } from './errors'

type QueryValue = string | number | boolean | null | undefined
type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface ApiClientOptions {
    baseUrl: string
    getHeaders?: () => Record<string, string>
    fetch?: FetchLike
}

export interface ApiRequestOptions<TSchema extends z.ZodType> {
    schema: TSchema
    query?: Record<string, QueryValue>
    signal?: AbortSignal
}

export interface ApiBodyRequestOptions<TSchema extends z.ZodType>
    extends ApiRequestOptions<TSchema> {
    body?: unknown
}

type ApiRequest = <TSchema extends z.ZodType>(
    path: string,
    options: ApiRequestOptions<TSchema>,
) => Promise<z.output<TSchema>>

type ApiBodyRequest = <TSchema extends z.ZodType>(
    path: string,
    options: ApiBodyRequestOptions<TSchema>,
) => Promise<z.output<TSchema>>

export interface ApiClient {
    get: ApiRequest
    post: ApiBodyRequest
    put: ApiBodyRequest
    patch: ApiBodyRequest
    delete: ApiBodyRequest
}

function buildUrl(
    baseUrl: string,
    path: string,
    query: Record<string, QueryValue> = {},
): string {
    const searchParams = new URLSearchParams()
    for (const [name, value] of Object.entries(query)) {
        if (value !== null && value !== undefined) {
            searchParams.set(name, String(value))
        }
    }
    const search = searchParams.toString()
    return `${baseUrl}${path}${search === '' ? '' : `?${search}`}`
}

async function readPayload(response: Response): Promise<unknown> {
    const text = await response.text()
    if (text === '') return undefined
    try {
        const parsed: unknown = JSON.parse(text)
        return parsed
    } catch {
        return text
    }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
    const send: FetchLike = options.fetch ?? ((url, init) => fetch(url, init))

    async function request<TSchema extends z.ZodType>(
        method: string,
        path: string,
        requestOptions: ApiBodyRequestOptions<TSchema>,
    ): Promise<z.output<TSchema>> {
        const { schema, query, signal, body } = requestOptions
        const url = buildUrl(options.baseUrl, path, query)
        const hasBody = body !== undefined

        const response = await send(url, {
            method,
            headers: {
                Accept: 'application/json',
                ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
                ...options.getHeaders?.(),
            },
            ...(hasBody ? { body: JSON.stringify(body) } : {}),
            ...(signal ? { signal } : {}),
        })
        const payload = await readPayload(response)

        if (!response.ok) {
            throw new ApiError({
                method,
                url,
                status: response.status,
                body: payload,
            })
        }

        const parsed = schema.safeParse(payload)
        if (!parsed.success) {
            throw new ApiSchemaError({
                method,
                url,
                issues: parsed.error.issues.map((issue) => {
                    const field = issue.path.map(String).join('.')
                    return `· ${field === '' ? '(응답 전체)' : field}: ${issue.message}`
                }),
            })
        }
        return parsed.data
    }

    return {
        get: (path, requestOptions) => request('GET', path, requestOptions),
        post: (path, requestOptions) => request('POST', path, requestOptions),
        put: (path, requestOptions) => request('PUT', path, requestOptions),
        patch: (path, requestOptions) => request('PATCH', path, requestOptions),
        delete: (path, requestOptions) => request('DELETE', path, requestOptions),
    }
}
