// expect: react/forbid-elements
export function SaveButton({ onSave }: { onSave: () => void }) {
    return (
        <button type="button" onClick={onSave}>
            저장
        </button>
    )
}
