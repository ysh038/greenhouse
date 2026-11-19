import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import { fakeApi, resetPlants } from '../fake/fakeApi'
import { installFakeFetch } from '../fake/installFakeFetch'

installFakeFetch()

beforeEach(() => {
    fakeApi.reset()
    resetPlants()
})

afterEach(() => {
    cleanup()
    vi.useRealTimers()
})
