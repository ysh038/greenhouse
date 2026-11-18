// expect: no-restricted-syntax
export function Toolbar({ offset }: { offset: number }) {
    return (
        <div style={{ display: 'flex', gap: 12, marginTop: -4, color: `#ff0000` }}>
            <p style={{ left: offset, marginBottom: 13 }}>도구</p>
        </div>
    )
}
