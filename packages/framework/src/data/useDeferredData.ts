import { useDeferredValue } from 'react'

import type { Query } from './defineQuery'
import { useData } from './useData'

export interface DeferredData<TData> {
    data: TData
    isUpdating: boolean
}

export function useDeferredData<TData>(query: Query<TData>): DeferredData<TData> {
    const shownQuery = useDeferredValue(query)
    const data = useData(shownQuery)
    return { data, isUpdating: shownQuery !== query }
}
