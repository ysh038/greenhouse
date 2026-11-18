import { defineMutation, defineQuery } from '@agent-greenhouse/framework/data'
import { z } from 'zod'

import { api } from '../api'

const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
})

export type User = z.infer<typeof UserSchema>

export const userListQuery = defineQuery({
    scope: ['users', 'list'],
    load: ({ signal }, keyword: string) =>
        api.get('/users', {
            schema: z.array(UserSchema),
            query: { keyword: keyword === '' ? undefined : keyword },
            signal,
        }),
})

export const userQuery = defineQuery({
    scope: ['users', 'detail'],
    load: ({ signal }, id: number) =>
        api.get(`/users/${id}`, { schema: UserSchema, signal }),
})

export const renameUser = defineMutation({
    run: (input: { id: number; name: string }) =>
        api.patch(`/users/${input.id}`, {
            schema: UserSchema,
            body: { name: input.name },
        }),
    invalidates: (input) => [userListQuery.all(), userQuery(input.id)],
})
