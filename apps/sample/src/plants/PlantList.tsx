import { Link, useSearchParam } from '@agent-greenhouse/framework/router'
import { Card, Select, Stack, Text } from '@agent-greenhouse/framework/ui'

import {
    plantDetailRoute,
    SORT_OPTIONS,
    sortPlants,
    toPlantSort,
} from './plantData'
import { PlantsNav } from './PlantsNav'

export function PlantList() {
    const [sortParam, setSort] = useSearchParam('sort', 'name')
    const sort = toPlantSort(sortParam)

    return (
        <Stack gap="lg">
            <PlantsNav />
            <Card>
                <h2>식물</h2>
                <Select
                    label="정렬"
                    value={sort}
                    options={SORT_OPTIONS}
                    onChange={setSort}
                />
                <Stack as="ul" gap="sm" aria-label="식물 목록">
                    {sortPlants(sort).map((plant) => (
                        <li key={plant.id}>
                            <Stack direction="row" gap="sm" justify="between" wrap>
                                <Link to={plantDetailRoute.href({ id: plant.id })}>
                                    {plant.name}
                                </Link>
                                <Text as="span" tone="muted">
                                    재고 {plant.stock}개
                                </Text>
                            </Stack>
                        </li>
                    ))}
                </Stack>
            </Card>
        </Stack>
    )
}
