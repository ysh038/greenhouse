// expect: no-restricted-syntax
export function Row({ title, onOpen }: { title: string; onOpen: () => void }) {
    return (
        <ul>
            <li onClick={onOpen}>{title}</li>
            <li>
                <div onClick={onOpen}>열기</div>
            </li>
        </ul>
    )
}
