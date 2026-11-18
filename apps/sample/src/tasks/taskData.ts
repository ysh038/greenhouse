import { defineMutation, defineQuery } from '@agent-greenhouse/framework/data'
import { z } from 'zod'

import { api } from '../api'

const TaskSchema = z.object({
    id: z.number(),
    title: z.string(),
    isDone: z.boolean(),
})

export type Task = z.infer<typeof TaskSchema>
export type TaskStatus = 'all' | 'active' | 'done'

export const taskListQuery = defineQuery({
    scope: ['tasks', 'list'],
    load: ({ signal }, status: TaskStatus) =>
        api.get('/tasks', { schema: z.array(TaskSchema), query: { status }, signal }),
})

export const addTask = defineMutation({
    run: (input: { title: string }) =>
        api.post('/tasks', { schema: TaskSchema, body: input }),
    invalidates: () => [taskListQuery.all()],
})

export const setTaskDone = defineMutation({
    run: (input: { id: number; isDone: boolean }) =>
        api.patch(`/tasks/${input.id}`, {
            schema: TaskSchema,
            body: { isDone: input.isDone },
        }),
    invalidates: () => [taskListQuery.all()],
})

export const deleteTask = defineMutation({
    run: (input: { id: number }) =>
        api.delete(`/tasks/${input.id}`, { schema: z.undefined() }),
    invalidates: () => [taskListQuery.all()],
})
