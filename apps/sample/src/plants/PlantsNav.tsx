import { Link } from '@agent-greenhouse/framework/router'
import { Stack } from '@agent-greenhouse/framework/ui'

import { homeRoute } from '../routes'

import { plantListRoute } from './plantData'

export function PlantsNav() {
    return (
        <nav aria-label="화면">
            <Stack direction="row" gap="xs" wrap>
                <Link to={homeRoute.href()} appearance="nav">
                    홈
                </Link>
                <Link to={plantListRoute.href()} appearance="nav">
                    식물
                </Link>
            </Stack>
        </nav>
    )
}
