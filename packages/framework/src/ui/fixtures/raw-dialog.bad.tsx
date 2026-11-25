// expect: react/forbid-elements
export function Detail({ name }: { name: string }) {
    return <dialog open>{name}</dialog>
}
