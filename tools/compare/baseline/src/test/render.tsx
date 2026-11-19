import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'

/** 테스트마다 새 QueryClient로 감싸서 그립니다. 재시도는 끕니다. */
export function renderWithProviders(ui: ReactNode): RenderResult {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}
