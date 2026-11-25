// expect: @eslint-react/no-missing-key
export function List({ names }: { names: string[] }) {
    return (
        <ul>
            {names.map((name) => (
                <li>{name}</li>
            ))}
        </ul>
    )
}
