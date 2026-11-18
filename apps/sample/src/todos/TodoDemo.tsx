import {
    DataBoundary,
    isApiError,
    useData,
    useMutate,
    type DataErrorProps,
} from '@agent-greenhouse/framework/data'
import {
    Button,
    Card,
    ErrorNotice,
    Stack,
    Text,
    TextField,
} from '@agent-greenhouse/framework/ui'
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
    return <Text>{todos.length}개</Text>
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
            <Stack gap="sm">
                <Stack direction="row" align="end" gap="sm">
                    <TextField label="새 할 일" value={title} onChange={setTitle} />
                    <Button type="submit" variant="primary" disabled={isPending}>
                        추가
                    </Button>
                </Stack>
                {isApiError(error) && (
                    <Text role="alert" tone="danger">
                        추가하지 못했습니다 ({error.status})
                    </Text>
                )}
            </Stack>
        </form>
    )
}

function renderError({ error, retry }: DataErrorProps) {
    return (
        <ErrorNotice
            message={error instanceof Error ? error.message : '알 수 없는 오류'}
            onRetry={retry}
        />
    )
}

const pending = <Text tone="muted">불러오는 중</Text>

export function TodoDemo() {
    return (
        <Card>
            <h2>할 일</h2>
            <DataBoundary pending={pending} renderError={renderError}>
                <TodoList />
            </DataBoundary>
            <AddTodoForm />

            <h3>응답이 스키마와 다를 때</h3>
            <DataBoundary pending={pending} renderError={renderError}>
                <BrokenTodoList />
            </DataBoundary>
        </Card>
    )
}
