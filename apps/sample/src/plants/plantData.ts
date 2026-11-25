import { defineRoute } from '@agent-greenhouse/framework/router'

export const plantListRoute = defineRoute('/plants')
export const plantDetailRoute = defineRoute('/plants/:id')

export type Plant = {
    id: number
    name: string
    stock: number
    note: string
}

export const PLANTS: readonly Plant[] = [
    { id: 1, name: '몬스테라', stock: 12, note: '반그늘에서 잘 자랍니다.' },
    { id: 2, name: '스킨답서스', stock: 30, note: '물을 좋아합니다.' },
    { id: 3, name: '올리브나무', stock: 0, note: '햇빛이 많이 필요합니다.' },
    { id: 4, name: '유칼립투스', stock: 7, note: '통풍이 중요합니다.' },
]

export const SORT_OPTIONS = [
    { value: 'name', label: '이름순' },
    { value: 'stock', label: '재고 많은 순' },
] as const

export type PlantSort = (typeof SORT_OPTIONS)[number]['value']

export function toPlantSort(value: string): PlantSort {
    return SORT_OPTIONS.find((option) => option.value === value)?.value ?? 'name'
}

export function sortPlants(sort: PlantSort): Plant[] {
    return [...PLANTS].sort((a, b) =>
        sort === 'stock' ? b.stock - a.stock : a.name.localeCompare(b.name, 'ko'),
    )
}
