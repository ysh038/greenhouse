import { Page } from '@agent-greenhouse/framework/ui'

import { MenuDemo } from './demo/MenuDemo'
import { SearchDemo } from './demo/SearchDemo'
import { NoticeBoard } from './notices/NoticeBoard'
import { TodoDemo } from './todos/TodoDemo'
import { UsersSection } from './users/UsersSection'

export function App() {
    return (
        <Page title="샘플 앱">
            <MenuDemo />
            <SearchDemo />
            <TodoDemo />
            <UsersSection />
            <NoticeBoard />
        </Page>
    )
}
