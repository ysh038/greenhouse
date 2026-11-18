import { act, render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'

import { createDataClient, DataProvider } from '../data'

export function renderWithData(ui: ReactNode): RenderResult {
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
