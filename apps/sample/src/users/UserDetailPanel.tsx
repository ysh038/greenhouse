import {
    DataBoundary,
    isApiError,
    useData,
    useMutate,
} from '@agent-greenhouse/framework/data'
import {
    useClickOutside,
    useKeydown,
    useTimeout,
} from '@agent-greenhouse/framework/effect'
import { Button, Card, Stack, Text, TextField } from '@agent-greenhouse/framework/ui'
import { useRef, useState } from 'react'

import { renderLoadError } from './LoadError'
import { renameUser, userQuery } from './userData'

const SAVED_NOTICE_MS = 2000

function describeSaveError(error: unknown): string {
    if (isApiError(error) && error.status === 400) {
        return '이름이 비어 있어 저장하지 못했습니다 (400)'
    }
    if (isApiError(error)) return `저장하지 못했습니다 (${error.status})`
    return '저장하지 못했습니다'
}

function UserEditForm({ userId }: { userId: number }) {
    const user = useData(userQuery(userId))
    const [name, setName] = useState(user.name)
    const [savedCount, setSavedCount] = useState(0)
    const [isSavedNoticeShown, setIsSavedNoticeShown] = useState(false)
    const { mutate, isPending, isError, error } = useMutate(renameUser)

    useTimeout(
        () => {
            setIsSavedNoticeShown(false)
        },
        isSavedNoticeShown ? SAVED_NOTICE_MS : null,
        savedCount,
    )

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault()
                mutate(
                    { id: userId, name },
                    {
                        onSuccess: (saved) => {
                            setName(saved.name)
                            setSavedCount((count) => count + 1)
                            setIsSavedNoticeShown(true)
                        },
                    },
                )
            }}
        >
            <Stack>
                <Text tone="muted">{user.email}</Text>
                <TextField
                    autoFocus
                    label="이름"
                    value={name}
                    onChange={setName}
                    errorMessage={isError ? describeSaveError(error) : undefined}
                />
                <Stack direction="row" gap="sm">
                    <Button type="submit" variant="primary" disabled={isPending}>
                        저장
                    </Button>
                    {isSavedNoticeShown && !isPending && !isError && (
                        <Text role="status" tone="success">
                            저장했습니다
                        </Text>
                    )}
                </Stack>
            </Stack>
        </form>
    )
}

export function UserDetailPanel({
    userId,
    onClose,
}: {
    userId: number
    onClose: () => void
}) {
    const panelRef = useRef<HTMLElement>(null)

    useClickOutside(panelRef, onClose)
    useKeydown('Escape', onClose)

    return (
        <Card as="aside" ref={panelRef} aria-label="사용자 상세">
            <Stack direction="row" justify="between">
                <h3>사용자 상세</h3>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    닫기
                </Button>
            </Stack>
            <DataBoundary
                pending={<Text tone="muted">불러오는 중</Text>}
                renderError={renderLoadError}
            >
                <UserEditForm userId={userId} />
            </DataBoundary>
        </Card>
    )
}
