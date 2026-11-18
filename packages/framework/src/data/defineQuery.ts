export interface LoadContext {
    signal: AbortSignal
}

export interface QueryTarget {
    readonly key: readonly unknown[]
}

export interface Query<TData> extends QueryTarget {
    readonly load: (context: LoadContext) => Promise<TData>
}

export interface QueryFactory<TParams, TData> {
    (params: TParams): Query<TData>
    all: () => QueryTarget
}

export function defineQuery<TParams = void, TData = unknown>(config: {
    scope: string | readonly string[]
    load: (context: LoadContext, params: TParams) => Promise<TData>
}): QueryFactory<TParams, TData> {
    const scope = typeof config.scope === 'string' ? [config.scope] : config.scope

    const created = new Map<string, Query<TData>>()

    const create = (params: TParams): Query<TData> => {
        const cacheKey = params === undefined ? '' : JSON.stringify(params)
        const existing = created.get(cacheKey)
        if (existing) return existing

        const query: Query<TData> = {
            key: params === undefined ? scope : [...scope, params],
            load: (context) => config.load(context, params),
        }
        created.set(cacheKey, query)
        return query
    }

    return Object.assign(create, { all: (): QueryTarget => ({ key: scope }) })
}
