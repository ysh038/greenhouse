import { useDeferredData } from '@agent-greenhouse/framework/data'

import { userListQuery } from './userData'

export function UserList({
    keyword,
    selectedId,
    onSelect,
}: {
    keyword: string
    selectedId: number | null
    onSelect: (id: number) => void
}) {
    const { data: users, isUpdating } = useDeferredData(userListQuery(keyword))

    if (users.length === 0) {
        return <p>조건에 맞는 사용자가 없습니다.</p>
    }

    return (
        <ul aria-label="사용자 목록" aria-busy={isUpdating}>
            {users.map((user) => (
                <li key={user.id}>
                    <button
                        type="button"
                        aria-pressed={user.id === selectedId}
                        onClick={() => {
                            onSelect(user.id)
                        }}
                    >
                        <strong>{user.name}</strong> <span>{user.email}</span>
                    </button>
                </li>
            ))}
        </ul>
    )
}
