import { Page } from '@agent-greenhouse/framework/ui'

import { MenuDemo } from './demo/MenuDemo'
import { SearchDemo } from './demo/SearchDemo'
import { InvitePanel } from './invites/InvitePanel'
import { NoticeBoard } from './notices/NoticeBoard'
import { TodoDemo } from './todos/TodoDemo'
import { TaskSection } from './tasks/TaskSection'
import { UsersSection } from './users/UsersSection'

export function App() {
    return (
        <Page title="샘플 앱">
            <MenuDemo />
            <SearchDemo />
            <TodoDemo />
            <UsersSection />
            <NoticeBoard />
            <InvitePanel />
            <TaskSection />
        </Page>
    )
}
