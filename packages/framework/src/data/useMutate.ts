import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { Mutation } from './defineMutation'

export interface MutateCallbacks<TResult> {
    onSuccess?: (result: TResult) => void
    onError?: (error: unknown) => void
}

export interface MutateState<TInput, TResult> {
    mutate: (input: TInput, callbacks?: MutateCallbacks<TResult>) => void
    isPending: boolean
    isError: boolean
    error: unknown
    reset: () => void
}

export function useMutate<TInput, TResult>(
    mutation: Mutation<TInput, TResult>,
): MutateState<TInput, TResult> {
    const queryClient = useQueryClient()

    const state = useMutation({
        mutationFn: mutation.run,
        onSuccess: async (result, input) => {
            await Promise.all(
                mutation
                    .invalidates(input, result)
                    .map((target) =>
                        queryClient.invalidateQueries({ queryKey: target.key }),
                    ),
            )
        },
    })

    return {
        mutate: (input, callbacks) => {
            state.mutate(input, {
                onSuccess: (result) => {
                    callbacks?.onSuccess?.(result)
                },
                onError: (error) => {
                    callbacks?.onError?.(error)
                },
            })
        },
        isPending: state.isPending,
        isError: state.isError,
        error: state.error,
        reset: state.reset,
    }
}
