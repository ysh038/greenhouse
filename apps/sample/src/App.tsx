import { MenuDemo } from './demo/MenuDemo'
import { NoticeBoard } from './notices/NoticeBoard'
import { SearchDemo } from './demo/SearchDemo'
import { TodoDemo } from './todos/TodoDemo'
import { UsersSection } from './users/UsersSection'

export function App() {
    return (
        <main>
            <h1>샘플 앱</h1>
            <MenuDemo />
            <SearchDemo />
            <TodoDemo />
            <UsersSection />
            <NoticeBoard />
        </main>
    )
}
