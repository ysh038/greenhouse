import { AppRouter, Link, RouteView } from '@agent-greenhouse/framework/router'
import { Page, Stack, Text } from '@agent-greenhouse/framework/ui'

import { HomeScreen } from './home/HomeScreen'
import { homeRoute } from './routes'

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
            <Page title="새 앱">
                <RouteView
                    routes={[{ route: homeRoute, screen: <HomeScreen /> }]}
                    notFound={<NotFound />}
                />
            </Page>
        </AppRouter>
    )
}
