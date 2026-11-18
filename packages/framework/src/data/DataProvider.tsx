import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { ApiError, ApiSchemaError } from './errors'

export type DataClient = QueryClient

const RETRYABLE_STATUSES = [408, 429]

function isWorthRetrying(error: unknown): boolean {
    if (error instanceof ApiSchemaError) return false
    if (error instanceof ApiError) {
        return error.status >= 500 || RETRYABLE_STATUSES.includes(error.status)
    }
    return true
}

function toMaxRetries(retry: number | boolean): number {
    if (retry === true) return Number.POSITIVE_INFINITY
    if (retry === false) return 0
    return retry
}

export function createDataClient(
    options: { retry?: number | boolean; staleTimeMs?: number } = {},
): DataClient {
    const { retry = 1, staleTimeMs = 0 } = options
    const maxRetries = toMaxRetries(retry)
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: (failureCount, error) =>
                    failureCount < maxRetries && isWorthRetrying(error),
                staleTime: staleTimeMs,
            },
            mutations: { retry: false },
        },
    })
}

export function DataProvider({
    client,
    children,
}: {
    client?: DataClient
    children: ReactNode
}) {
    const [defaultClient] = useState(() => createDataClient())
    return (
        <QueryClientProvider client={client ?? defaultClient}>
            {children}
        </QueryClientProvider>
    )
}
