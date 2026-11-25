import { Link, useRouteParams } from '@agent-greenhouse/framework/router'
import { Card, Stack, Text } from '@agent-greenhouse/framework/ui'

import { plantDetailRoute, plantListRoute, PLANTS } from './plantData'
import { PlantsNav } from './PlantsNav'

export function PlantDetail() {
    const { id } = useRouteParams(plantDetailRoute)
    const plant = PLANTS.find((candidate) => String(candidate.id) === id)

    return (
        <Stack gap="lg">
            <PlantsNav />
            <Card>
                {plant ? (
                    <>
                        <h2>{plant.name}</h2>
                        <Text>재고 {plant.stock}개</Text>
                        <Text tone="muted">{plant.note}</Text>
                    </>
                ) : (
                    <Text role="alert">식물을 찾을 수 없습니다</Text>
                )}
                <Link to={plantListRoute.href()}>식물 목록으로</Link>
            </Card>
        </Stack>
    )
}
