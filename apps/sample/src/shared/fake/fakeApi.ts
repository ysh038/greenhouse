import { createFakeApi, type FakeApi } from '@agent-greenhouse/framework/fake-api'
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

interface Task {
    id: number
    title: string
    isDone: boolean
}

const NewTodoSchema = z.object({ title: z.string().min(1) })
const TaskStatusSchema = z.enum(['all', 'active', 'done'])
const TaskPatchSchema = z.object({ isDone: z.boolean() })
const NewTaskSchema = z.object({ title: z.string().trim().min(1) })
const UserPatchSchema = z.object({ name: z.string().trim().min(1) })

/**
 * 백엔드를 흉내 내는 가짜 서버를 하나 만듭니다. 데이터는 만들 때마다 처음 상태입니다.
 * 개발 서버(fakeServer.plugin.ts)와 테스트(connectFakeApi)가 각자 만들어 씁니다.
 */
export function createFakeServer(options: { delayMs?: number } = {}): FakeApi {
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

    function initialTasks(): Task[] {
        return [
            { id: 1, title: '온실 설계도 그리기', isDone: false },
            { id: 2, title: '모종 주문하기', isDone: false },
            { id: 3, title: '물주기 일정 정하기', isDone: true },
            { id: 4, title: '온도계 달기', isDone: false },
        ]
    }

    let tasks = initialTasks()
    let nextTaskId = tasks.length + 1

    function findTask(id: string | undefined): Task | undefined {
        return tasks.find((candidate) => candidate.id === Number(id))
    }

    function findUser(id: string | undefined): User | undefined {
        return users.find((candidate) => candidate.id === Number(id))
    }

    return createFakeApi({
        delayMs: options.delayMs ?? 0,
        routes: [
            {
                method: 'GET',
                path: '/api/tasks',
                handler: ({ query }) => {
                    const status = TaskStatusSchema.safeParse(query.get('status') ?? 'all')
                    if (!status.success) {
                        return { status: 400, body: { code: 'INVALID_STATUS' } }
                    }
                    return {
                        body: tasks.filter(
                            (task) =>
                                status.data === 'all' ||
                                task.isDone === (status.data === 'done'),
                        ),
                    }
                },
            },
            {
                method: 'POST',
                path: '/api/tasks',
                handler: ({ body }) => {
                    const parsed = NewTaskSchema.safeParse(body)
                    if (!parsed.success) {
                        return { status: 400, body: { code: 'INVALID_TITLE' } }
                    }
                    const task = {
                        id: nextTaskId,
                        title: parsed.data.title,
                        isDone: false,
                    }
                    nextTaskId += 1
                    tasks.push(task)
                    return { status: 201, body: task }
                },
            },
            {
                method: 'PATCH',
                path: '/api/tasks/:id',
                handler: ({ params, body }) => {
                    const task = findTask(params.id)
                    if (!task) return { status: 404, body: { code: 'NOT_FOUND' } }

                    const parsed = TaskPatchSchema.safeParse(body)
                    if (!parsed.success) {
                        return { status: 400, body: { code: 'INVALID_BODY' } }
                    }
                    task.isDone = parsed.data.isDone
                    return { body: task }
                },
            },
            {
                method: 'DELETE',
                path: '/api/tasks/:id',
                handler: ({ params }) => {
                    const task = findTask(params.id)
                    if (!task) return { status: 404, body: { code: 'NOT_FOUND' } }
                    tasks = tasks.filter((candidate) => candidate.id !== task.id)
                    return { status: 204 }
                },
            },
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
}
