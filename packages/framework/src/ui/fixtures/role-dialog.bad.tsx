// expect: no-restricted-syntax
export function Detail({ name }: { name: string }) {
    return (
        <div role="dialog" aria-modal="true">
            {name}
        </div>
    )
}
