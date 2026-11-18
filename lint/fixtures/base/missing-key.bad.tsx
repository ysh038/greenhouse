// expect: react/jsx-key
export function List({ names }: { names: string[] }) {
    return (
        <ul>
            {names.map((name) => (
                <li>{name}</li>
            ))}
        </ul>
    )
}
