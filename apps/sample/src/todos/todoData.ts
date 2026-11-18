import { defineMutation, defineQuery } from '@agent-greenhouse/framework/data'
import { z } from 'zod'

import { api } from '../api'

const TodoSchema = z.object({ id: z.number(), title: z.string() })

export const todosQuery = defineQuery({
    scope: 'todos',
    load: ({ signal }) =>
        api.get('/todos', { schema: z.array(TodoSchema), signal }),
})

export const brokenTodosQuery = defineQuery({
    scope: 'broken-todos',
    load: ({ signal }) =>
        api.get('/broken-todos', { schema: z.array(TodoSchema), signal }),
})

export const addTodo = defineMutation({
    run: (title: string) =>
        api.post('/todos', { schema: TodoSchema, body: { title } }),
    invalidates: () => [todosQuery.all()],
})
