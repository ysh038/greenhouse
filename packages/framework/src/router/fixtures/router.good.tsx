import {
    AppRouter,
    defineRoute,
    ExternalLink,
    Link,
    RouteView,
    useNavigate,
    useRouteParams,
    useSearchParam,
} from '@agent-greenhouse/framework/router'
import { Button, Stack, Text } from '@agent-greenhouse/framework/ui'

const plantListRoute = defineRoute('/plants')
const plantDetailRoute = defineRoute('/plants/:id')

function PlantList() {
    const [sort, setSort] = useSearchParam('sort', 'name')
    return (
        <Stack gap="sm">
            <Text>정렬: {sort}</Text>
            <Button
                onClick={() => {
                    setSort('stock')
                }}
            >
                재고순
            </Button>
            <Link to={plantDetailRoute.href({ id: 3 })}>3번 식물</Link>
            <ExternalLink href="https://example.com/guide">재배 안내</ExternalLink>
        </Stack>
    )
}

function PlantDetail() {
    const { id } = useRouteParams(plantDetailRoute)
    const navigate = useNavigate()
    return (
        <Stack gap="sm">
            <Text>{id}번 식물</Text>
            <Button
                onClick={() => {
                    navigate(plantListRoute.href())
                }}
            >
                목록으로
            </Button>
        </Stack>
    )
}

export function PlantApp() {
    return (
        <AppRouter>
            <Link to={plantListRoute.href()} appearance="nav">
                식물
            </Link>
            <RouteView
                routes={[
                    { route: plantListRoute, screen: <PlantList /> },
                    { route: plantDetailRoute, screen: <PlantDetail /> },
                ]}
                notFound={<Text>화면을 찾을 수 없습니다</Text>}
            />
        </AppRouter>
    )
}
