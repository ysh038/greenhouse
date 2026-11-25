import { AppRouter, Link, RouteView } from '@agent-greenhouse/framework/router'
import { Page, Stack, Text } from '@agent-greenhouse/framework/ui'

import { ProtectedRoute, SessionProvider } from './access'
import { AccountScreen } from './account/AccountScreen'
import { AdminScreen } from './account/AdminScreen'
import { LoginScreen } from './account/LoginScreen'
import { DialogDemo } from './demo/DialogDemo'
import { MenuDemo } from './demo/MenuDemo'
import { SearchDemo } from './demo/SearchDemo'
import { InvitePanel } from './invites/InvitePanel'
import { NoticeBoard } from './notices/NoticeBoard'
import { PlantDetail } from './plants/PlantDetail'
import { plantDetailRoute, plantListRoute } from './plants/plantData'
import { PlantList } from './plants/PlantList'
import { accountRoute, adminRoute, homeRoute, loginRoute } from './routes'
import { TodoDemo } from './todos/TodoDemo'
import { TaskSection } from './tasks/TaskSection'
import { UsersSection } from './users/UsersSection'

function Home() {
    return (
        <>
            <MenuDemo />
            <SearchDemo />
            <TodoDemo />
            <UsersSection />
            <NoticeBoard />
            <InvitePanel />
            <TaskSection />
            <DialogDemo />
        </>
    )
}

function NotFound() {
    return (
        <Stack gap="sm" align="start">
            <Text role="alert">화면을 찾을 수 없습니다</Text>
            <Link to={homeRoute.href()}>홈으로</Link>
        </Stack>
    )
}

export function App() {
    return (
        <AppRouter>
            <SessionProvider>
                <Page title="샘플 앱">
                    <RouteView
                    routes={[
                        { route: homeRoute, screen: <Home /> },
                        { route: plantListRoute, screen: <PlantList /> },
                        { route: plantDetailRoute, screen: <PlantDetail /> },
                        { route: loginRoute, screen: <LoginScreen /> },
                        {
                            route: accountRoute,
                            screen: (
                                <ProtectedRoute>
                                    <AccountScreen />
                                </ProtectedRoute>
                            ),
                        },
                        {
                            route: adminRoute,
                            screen: (
                                <ProtectedRoute requiredRoles={['admin']}>
                                    <AdminScreen />
                                </ProtectedRoute>
                            ),
                        },
                    ]}
                    notFound={<NotFound />}
                />
                </Page>
            </SessionProvider>
        </AppRouter>
    )
}
