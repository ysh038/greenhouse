import type { QueryTarget } from './defineQuery'

export interface Mutation<TInput, TResult> {
    readonly run: (input: TInput) => Promise<TResult>
    readonly invalidates: (
        input: TInput,
        result: TResult,
    ) => readonly QueryTarget[]
}

export function defineMutation<TInput = void, TResult = unknown>(
    config: Mutation<TInput, TResult>,
): Mutation<TInput, TResult> {
    return config
}
