import {
    DataBoundary,
    isApiError,
    useData,
    useDeferredData,
    useMutate,
} from '@agent-greenhouse/framework/data'
import {
    Button,
    Card,
    Checkbox,
    ConfirmDialog,
    ErrorNotice,
    Stack,
    Text,
    TextField,
} from '@agent-greenhouse/framework/ui'
import { useState, type SyntheticEvent } from 'react'

import {
    addTask,
    deleteTask,
    setTaskDone,
    taskListQuery,
    type Task,
    type TaskStatus,
} from './taskData'

const FILTERS: readonly { status: TaskStatus; label: string }[] = [
    { status: 'all', label: '전체' },
    { status: 'active', label: '진행 중' },
    { status: 'done', label: '완료' },
]

function RemainingCount() {
    const tasks = useData(taskListQuery('all'))
    const remaining = tasks.filter((task) => !task.isDone).length
    return <Text tone="muted">남은 작업 {remaining}개</Text>
}

function TaskRow({
    task,
    onToggle,
    onAskDelete,
}: {
    task: Task
    onToggle: (isDone: boolean) => void
    onAskDelete: () => void
}) {
    return (
        <li>
            <Stack direction="row" gap="sm" justify="between" wrap>
                <Checkbox
                    label={task.title}
                    checked={task.isDone}
                    isStruck={task.isDone}
                    onChange={onToggle}
                />
                <Button size="sm" tone="danger" onClick={onAskDelete}>
                    삭제
                </Button>
            </Stack>
        </li>
    )
}

function TaskList({ status }: { status: TaskStatus }) {
    const { data: tasks } = useDeferredData(taskListQuery(status))
    const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
    const toggle = useMutate(setTaskDone)
    const remove = useMutate(deleteTask)

    return (
        <>
            {toggle.isError && (
                <Text role="alert" tone="danger">
                    변경하지 못했습니다
                </Text>
            )}
            {tasks.length === 0 ? (
                <Text tone="muted">작업이 없습니다</Text>
            ) : (
                <Stack as="ul" gap="sm" aria-label="작업 목록">
                    {tasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            onToggle={(isDone) => {
                                toggle.mutate({ id: task.id, isDone })
                            }}
                            onAskDelete={() => {
                                remove.reset()
                                setDeleteTarget(task)
                            }}
                        />
                    ))}
                </Stack>
            )}
            {deleteTarget && (
                <ConfirmDialog
                    message={`'${deleteTarget.title}' 작업을 삭제할까요?`}
                    confirmLabel="삭제"
                    tone="danger"
                    isPending={remove.isPending}
                    errorMessage={remove.isError ? '삭제하지 못했습니다' : undefined}
                    onCancel={() => {
                        setDeleteTarget(null)
                    }}
                    onConfirm={() => {
                        remove.mutate(
                            { id: deleteTarget.id },
                            {
                                onSuccess: () => {
                                    setDeleteTarget(null)
                                },
                            },
                        )
                    }}
                />
            )}
        </>
    )
}

function describeAddError(error: unknown): string {
    if (isApiError(error) && error.status === 400) return '제목을 입력하세요'
    return '추가하지 못했습니다'
}

function TaskForm() {
    const [title, setTitle] = useState('')
    const add = useMutate(addTask)

    const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault()
        add.mutate(
            { title },
            {
                onSuccess: () => {
                    setTitle('')
                },
            },
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <TextField
                label="새 작업"
                value={title}
                onChange={setTitle}
                errorMessage={add.isError ? describeAddError(add.error) : undefined}
                trailing={
                    <Button type="submit" variant="primary" disabled={add.isPending}>
                        추가
                    </Button>
                }
            />
        </form>
    )
}

export function TaskSection() {
    const [status, setStatus] = useState<TaskStatus>('all')

    return (
        <Card>
            <h2>작업</h2>
            <Stack direction="row" gap="xs" role="group" aria-label="상태 필터">
                {FILTERS.map((filter) => (
                    <Button
                        key={filter.status}
                        size="sm"
                        variant="ghost"
                        aria-pressed={filter.status === status}
                        onClick={() => {
                            setStatus(filter.status)
                        }}
                    >
                        {filter.label}
                    </Button>
                ))}
            </Stack>
            <DataBoundary
                pending={<Text tone="muted">불러오는 중</Text>}
                resetKeys={[status]}
                renderError={({ retry }) => (
                    <ErrorNotice message="작업을 불러오지 못했습니다" onRetry={retry} />
                )}
            >
                <RemainingCount />
                <TaskList status={status} />
            </DataBoundary>
            <TaskForm />
        </Card>
    )
}
