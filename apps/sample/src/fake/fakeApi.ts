import { createFakeApi } from '@agent-greenhouse/framework/fake-api'
import { z } from 'zod'

interface Todo {
    id: number
    title: string
}

interface User {
    id: number
    name: string
    email: string
}

const BROWSER_DELAY_MS = 400

const NewTodoSchema = z.object({ title: z.string().min(1) })
const UserPatchSchema = z.object({ name: z.string().trim().min(1) })

const todos: Todo[] = [
    { id: 1, title: '온실 짓기' },
    { id: 2, title: '씨앗 심기' },
]

const users: User[] = [
    { id: 1, name: '김하늘', email: 'haneul.kim@example.com' },
    { id: 2, name: '이도윤', email: 'doyun.lee@example.com' },
    { id: 3, name: '박서연', email: 'seoyeon.park@example.com' },
    { id: 4, name: '김지호', email: 'jiho.kim@example.com' },
    { id: 5, name: 'Alex Morgan', email: 'alex.morgan@example.com' },
]

const notices = [
    { id: 1, title: '서버 점검 안내' },
    { id: 2, title: '신규 기능 출시' },
    { id: 3, title: '정기 점검 일정' },
]

function findUser(id: string | undefined): User | undefined {
    return users.find((candidate) => candidate.id === Number(id))
}

export const fakeApi = createFakeApi({
    delayMs: import.meta.env.MODE === 'test' ? 0 : BROWSER_DELAY_MS,
    routes: [
        {
            method: 'GET',
            path: '/api/todos',
            handler: () => ({ body: todos }),
        },
        {
            method: 'POST',
            path: '/api/todos',
            handler: ({ body }) => {
                const parsed = NewTodoSchema.safeParse(body)
                if (!parsed.success) {
                    return { status: 400, body: { code: 'INVALID_TITLE' } }
                }
                const todo = { id: todos.length + 1, title: parsed.data.title }
                todos.push(todo)
                return { status: 201, body: todo }
            },
        },
        {
            method: 'GET',
            path: '/api/broken-todos',
            handler: () => ({ body: [{ id: '1', name: '모양이 다른 응답' }] }),
        },
        {
            method: 'GET',
            path: '/api/notices',
            handler: ({ query }) => {
                const keyword = query.get('keyword') ?? ''
                return {
                    body: notices.filter((notice) =>
                        notice.title.includes(keyword),
                    ),
                }
            },
        },
        {
            method: 'POST',
            path: '/api/notices',
            handler: ({ body }) => {
                const parsed = NewTodoSchema.safeParse(body)
                if (!parsed.success) {
                    return { status: 400, body: { code: 'INVALID_TITLE' } }
                }
                const notice = {
                    id: notices.length + 1,
                    title: parsed.data.title,
                }
                notices.unshift(notice)
                return { status: 201, body: notice }
            },
        },
        {
            method: 'GET',
            path: '/api/users',
            handler: ({ query }) => {
                const keyword = (query.get('keyword') ?? '').trim().toLowerCase()
                return {
                    body: users.filter((user) =>
                        user.name.toLowerCase().includes(keyword),
                    ),
                }
            },
        },
        {
            method: 'GET',
            path: '/api/users/:id',
            handler: ({ params }) => {
                const user = findUser(params.id)
                return user
                    ? { body: user }
                    : { status: 404, body: { code: 'NOT_FOUND' } }
            },
        },
        {
            method: 'PATCH',
            path: '/api/users/:id',
            handler: ({ params, body }) => {
                const user = findUser(params.id)
                if (!user) return { status: 404, body: { code: 'NOT_FOUND' } }

                const parsed = UserPatchSchema.safeParse(body)
                if (!parsed.success) {
                    return { status: 400, body: { code: 'INVALID_NAME' } }
                }
                user.name = parsed.data.name
                return { body: user }
            },
        },
    ],
})
