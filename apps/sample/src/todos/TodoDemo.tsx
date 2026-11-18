import {
    DataBoundary,
    isApiError,
    useData,
    useMutate,
} from '@agent-greenhouse/framework/data'
import { useState } from 'react'

import { addTodo, brokenTodosQuery, todosQuery } from './todoData'

function TodoList() {
    const todos = useData(todosQuery())
    return (
        <ul aria-label="할 일 목록">
            {todos.map((todo) => (
                <li key={todo.id}>{todo.title}</li>
            ))}
        </ul>
    )
}

function BrokenTodoList() {
    const todos = useData(brokenTodosQuery())
    return <p>{todos.length}개</p>
}

function AddTodoForm() {
    const [title, setTitle] = useState('')
    const { mutate, isPending, error } = useMutate(addTodo)

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault()
                mutate(title, {
                    onSuccess: () => {
                        setTitle('')
                    },
                })
            }}
        >
            <label>
                새 할 일{' '}
                <input
                    value={title}
                    onChange={(event) => {
                        setTitle(event.target.value)
                    }}
                />
            </label>{' '}
            <button type="submit" disabled={isPending}>
                추가
            </button>
            {isApiError(error) && (
                <p role="alert">추가하지 못했습니다 ({error.status})</p>
            )}
        </form>
    )
}

function renderError({ error, retry }: { error: unknown; retry: () => void }) {
    return (
        <div role="alert">
            <pre>{error instanceof Error ? error.message : '알 수 없는 오류'}</pre>
            <button type="button" onClick={retry}>
                다시 시도
            </button>
        </div>
    )
}

export function TodoDemo() {
    return (
        <section>
            <h2>할 일</h2>
            <DataBoundary pending={<p>불러오는 중</p>} renderError={renderError}>
                <TodoList />
            </DataBoundary>
            <AddTodoForm />

            <h3>응답이 스키마와 다를 때</h3>
            <DataBoundary pending={<p>불러오는 중</p>} renderError={renderError}>
                <BrokenTodoList />
            </DataBoundary>
        </section>
    )
}
