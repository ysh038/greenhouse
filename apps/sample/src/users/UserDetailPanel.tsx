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
            <p>{user.email}</p>
            <label>
                이름{' '}
                <input
                    autoFocus
                    value={name}
                    aria-invalid={isError}
                    onChange={(event) => {
                        setName(event.target.value)
                    }}
                />
            </label>{' '}
            <button type="submit" disabled={isPending}>
                저장
            </button>
            {isError && <p role="alert">{describeSaveError(error)}</p>}
            {isSavedNoticeShown && !isPending && !isError && (
                <p role="status">저장했습니다</p>
            )}
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
        <aside ref={panelRef} aria-label="사용자 상세">
            <h3>사용자 상세</h3>
            <DataBoundary
                pending={<p>불러오는 중</p>}
                renderError={renderLoadError}
            >
                <UserEditForm userId={userId} />
            </DataBoundary>
            <button type="button" onClick={onClose}>
                닫기
            </button>
        </aside>
    )
}
