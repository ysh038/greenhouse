// expect: react/forbid-elements
export function NameInput({
    name,
    onNameChange,
}: {
    name: string
    onNameChange: (name: string) => void
}) {
    return (
        <label>
            이름
            <input
                value={name}
                onChange={(event) => {
                    onNameChange(event.target.value)
                }}
            />
        </label>
    )
}
