import {
    Button,
    Card,
    ErrorNotice,
    Page,
    Stack,
    Text,
    TextField,
    tokens,
} from '@agent-greenhouse/framework/ui'
import { useState } from 'react'

function UsageBar({ used, limit }: { used: number; limit: number }) {
    const percent = Math.min(100, Math.round((used / limit) * 100))
    const isOver = used > limit
    return (
        <div
            role="meter"
            aria-label="사용량"
            aria-valuenow={percent}
            style={{
                width: `${percent}%`,
                background: isOver ? tokens.color.danger : tokens.color.primary,
            }}
        />
    )
}

export function ProfilePage({
    onSave,
    saveError,
    onRetry,
}: {
    onSave: (name: string) => void
    saveError: string | null
    onRetry: () => void
}) {
    const [name, setName] = useState('')
    const [isHelpOpen, setIsHelpOpen] = useState(false)

    return (
        <Page title="프로필">
            <Card>
                <Stack direction="row" justify="between">
                    <h2>기본 정보</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={isHelpOpen}
                        onClick={() => {
                            setIsHelpOpen(!isHelpOpen)
                        }}
                    >
                        도움말
                    </Button>
                </Stack>
                {isHelpOpen && <Text tone="muted">이름은 언제든 바꿀 수 있습니다.</Text>}
                <form
                    onSubmit={(event) => {
                        event.preventDefault()
                        onSave(name)
                    }}
                >
                    <Stack direction="row" align="end" gap="sm">
                        <TextField
                            label="이름"
                            value={name}
                            onChange={setName}
                            errorMessage={name === '' ? '이름을 입력하세요' : undefined}
                        />
                        <Button type="submit" variant="primary">
                            저장
                        </Button>
                    </Stack>
                </form>
                <UsageBar used={3} limit={10} />
            </Card>
            {saveError !== null && (
                <ErrorNotice message={saveError} onRetry={onRetry} />
            )}
        </Page>
    )
}
