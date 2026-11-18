// expect: react/no-unstable-nested-components
export function List({ names }: { names: string[] }) {
    const Row = ({ name }: { name: string }) => <li>{name}</li>
    return (
        <ul>
            {names.map((name) => (
                <Row key={name} name={name} />
            ))}
        </ul>
    )
}
