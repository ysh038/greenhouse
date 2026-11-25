// expect: no-restricted-syntax
export function SaveButton({ onSave }: { onSave: () => void }) {
    return (
        <button type="button" onClick={onSave}>
            저장
        </button>
    )
}
