export class ApiError extends Error {
    readonly method: string
    readonly url: string
    readonly status: number
    readonly body: unknown

    constructor(details: {
        method: string
        url: string
        status: number
        body: unknown
    }) {
        super(`${details.method} ${details.url} 요청이 실패했습니다 (${details.status}).`)
        this.name = 'ApiError'
        this.method = details.method
        this.url = details.url
        this.status = details.status
        this.body = details.body
    }
}

export class ApiSchemaError extends Error {
    readonly method: string
    readonly url: string
    readonly issues: readonly string[]

    constructor(details: {
        method: string
        url: string
        issues: readonly string[]
    }) {
        super(
            `${details.method} ${details.url} 응답이 스키마와 다릅니다.\n${details.issues.join('\n')}`,
        )
        this.name = 'ApiSchemaError'
        this.method = details.method
        this.url = details.url
        this.issues = details.issues
    }
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
}
