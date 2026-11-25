import { Button, ConfirmDialog, Dialog, TextField } from '@agent-greenhouse/framework/ui'
import { useState } from 'react'

export function PostActions({
    title,
    onRename,
    onDelete,
}: {
    title: string
    onRename: (title: string) => void
    onDelete: () => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [draft, setDraft] = useState(title)

    return (
        <>
            <Button
                onClick={() => {
                    setIsEditing(true)
                }}
            >
                이름 바꾸기
            </Button>
            <Button
                tone="danger"
                onClick={() => {
                    setIsConfirming(true)
                }}
            >
                삭제
            </Button>
            {isEditing && (
                <Dialog
                    title="이름 바꾸기"
                    onClose={() => {
                        setIsEditing(false)
                    }}
                >
                    <TextField
                        label="제목"
                        value={draft}
                        onChange={setDraft}
                        trailing={
                            <Button
                                variant="primary"
                                onClick={() => {
                                    onRename(draft)
                                    setIsEditing(false)
                                }}
                            >
                                저장
                            </Button>
                        }
                    />
                </Dialog>
            )}
            {isConfirming && (
                <ConfirmDialog
                    message="이 글을 삭제할까요?"
                    confirmLabel="삭제"
                    tone="danger"
                    onConfirm={onDelete}
                    onCancel={() => {
                        setIsConfirming(false)
                    }}
                />
            )}
        </>
    )
}
