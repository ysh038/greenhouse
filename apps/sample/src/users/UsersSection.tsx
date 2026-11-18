import { DataBoundary } from '@agent-greenhouse/framework/data'
import {
    useDebouncedValue,
    useEventListener,
} from '@agent-greenhouse/framework/effect'
import { Card, Stack, Text, TextField } from '@agent-greenhouse/framework/ui'
import { useState } from 'react'

import { renderLoadError } from './LoadError'
import { UserDetailPanel } from './UserDetailPanel'
import { UserList } from './UserList'

const SEARCH_DEBOUNCE_MS = 300

function WindowWidth() {
    const [width, setWidth] = useState(() => window.innerWidth)

    useEventListener(window, 'resize', () => {
        setWidth(window.innerWidth)
    })

    return <output aria-label="창 너비">{width}px</output>
}

export function UsersSection() {
    const [keyword, setKeyword] = useState('')
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const searchKeyword = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS).trim()

    return (
        <Card>
            <Stack direction="row" align="baseline" justify="between">
                <h2>사용자</h2>
                <WindowWidth />
            </Stack>
            <TextField
                type="search"
                label="사용자 검색"
                value={keyword}
                onChange={setKeyword}
            />
            <Stack direction="row" align="start" gap="xl" wrap>
                <DataBoundary
                    pending={<Text tone="muted">불러오는 중</Text>}
                    renderError={renderLoadError}
                    resetKeys={[searchKeyword]}
                >
                    <UserList
                        keyword={searchKeyword}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                </DataBoundary>
                {selectedId !== null && (
                    <UserDetailPanel
                        key={selectedId}
                        userId={selectedId}
                        onClose={() => {
                            setSelectedId(null)
                        }}
                    />
                )}
            </Stack>
        </Card>
    )
}
