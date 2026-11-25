import { Button, Card, Dialog, Stack, Text, TextField } from '@agent-greenhouse/framework/ui'
import { useState, type SyntheticEvent } from 'react'

export function DialogDemo() {
    const [name, setName] = useState('북쪽 온실')
    const [draft, setDraft] = useState(name)
    const [isOpen, setIsOpen] = useState(false)

    const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (draft.trim() === '') return
        setName(draft.trim())
        setIsOpen(false)
    }

    return (
        <Card>
            <h2>창</h2>
            <Stack direction="row" align="center" gap="md" wrap>
                <Text>온실 이름: {name}</Text>
                <Button
                    size="sm"
                    onClick={() => {
                        setDraft(name)
                        setIsOpen(true)
                    }}
                >
                    이름 바꾸기
                </Button>
            </Stack>
            {isOpen && (
                <Dialog
                    title="온실 이름 바꾸기"
                    onClose={() => {
                        setIsOpen(false)
                    }}
                >
                    <form onSubmit={handleSubmit}>
                        <TextField
                            label="이름"
                            value={draft}
                            onChange={setDraft}
                            errorMessage={
                                draft.trim() === '' ? '이름을 입력하세요' : undefined
                            }
                            trailing={
                                <Button type="submit" variant="primary">
                                    저장
                                </Button>
                            }
                        />
                    </form>
                </Dialog>
            )}
        </Card>
    )
}
