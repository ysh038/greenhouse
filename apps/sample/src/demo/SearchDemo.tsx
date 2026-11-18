import { useDebouncedValue } from '@agent-greenhouse/framework/effect'
import { useState } from 'react'

const DEBOUNCE_MS = 300

export function SearchDemo() {
    const [query, setQuery] = useState('')
    const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS)

    return (
        <section>
            <h2>검색</h2>
            <label>
                검색어{' '}
                <input
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value)
                    }}
                />
            </label>
            <p>
                입력 중: <output data-testid="typing">{query}</output>
            </p>
            <p>
                {DEBOUNCE_MS}ms 뒤 반영:{' '}
                <output data-testid="debounced">{debouncedQuery}</output>
            </p>
        </section>
    )
}
