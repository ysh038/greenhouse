import { DataBoundary } from '@agent-greenhouse/framework/data'
import {
    useDebouncedValue,
    useEventListener,
} from '@agent-greenhouse/framework/effect'
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
        <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <h2>사용자</h2>
                <WindowWidth />
            </div>
            <label>
                사용자 검색{' '}
                <input
                    type="search"
                    value={keyword}
                    onChange={(event) => {
                        setKeyword(event.target.value)
                    }}
                />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
                <DataBoundary
                    pending={<p>불러오는 중</p>}
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
            </div>
        </section>
    )
}
