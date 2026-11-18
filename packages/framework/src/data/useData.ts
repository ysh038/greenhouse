import { useSuspenseQuery } from '@tanstack/react-query'

import type { Query } from './defineQuery'

export function useData<TData>(query: Query<TData>): TData {
    const { data } = useSuspenseQuery({
        queryKey: query.key,
        queryFn: ({ signal }) => query.load({ signal }),
    })
    return data
}
