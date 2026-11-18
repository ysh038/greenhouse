import { useDeferredData } from '@agent-greenhouse/framework/data'
import { Button, Stack, Text } from '@agent-greenhouse/framework/ui'

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
        return <Text tone="muted">조건에 맞는 사용자가 없습니다.</Text>
    }

    return (
        <Stack as="ul" gap="xs" aria-label="사용자 목록" aria-busy={isUpdating}>
            {users.map((user) => (
                <li key={user.id}>
                    <Button
                        variant="ghost"
                        aria-pressed={user.id === selectedId}
                        onClick={() => {
                            onSelect(user.id)
                        }}
                    >
                        <strong>{user.name}</strong> <span>{user.email}</span>
                    </Button>
                </li>
            ))}
        </Stack>
    )
}
