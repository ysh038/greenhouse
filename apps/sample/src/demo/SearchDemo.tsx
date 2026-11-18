import { useDebouncedValue } from '@agent-greenhouse/framework/effect'
import { Card, Text, TextField } from '@agent-greenhouse/framework/ui'
import { useState } from 'react'

const DEBOUNCE_MS = 300

export function SearchDemo() {
    const [query, setQuery] = useState('')
    const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS)

    return (
        <Card>
            <h2>검색</h2>
            <TextField label="검색어" value={query} onChange={setQuery} />
            <Text tone="muted">
                입력 중: <output data-testid="typing">{query}</output>
            </Text>
            <Text tone="muted">
                {DEBOUNCE_MS}ms 뒤 반영:{' '}
                <output data-testid="debounced">{debouncedQuery}</output>
            </Text>
        </Card>
    )
}
