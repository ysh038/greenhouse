import { useState } from 'react'

type Status = 'idle' | 'done'

function label(status: Status): string {
    switch (status) {
        case 'idle':
            return '대기'
        case 'done':
            return '완료'
    }
}

export function Counter({ status }: { status: Status }) {
    const [count, setCount] = useState(0)
    return (
        <button
            type="button"
            onClick={() => {
                setCount(count + 1)
            }}
        >
            {label(status)} {count}
        </button>
    )
}
