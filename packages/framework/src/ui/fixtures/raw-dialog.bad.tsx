// expect: no-restricted-syntax
export function Detail({ name }: { name: string }) {
    return <dialog open>{name}</dialog>
}
