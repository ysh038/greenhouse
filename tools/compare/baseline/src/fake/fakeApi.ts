import { createFakeApi } from './createFakeApi'
import { z } from 'zod'

interface Plant {
    id: number
    name: string
    stock: number
    note: string
}

const BROWSER_DELAY_MS = 400

const StockPatchSchema = z.object({ stock: z.number().int().min(0) })

function initialPlants(): Plant[] {
    return [
        { id: 1, name: '몬스테라', stock: 12, note: '반그늘에서 잘 자랍니다.' },
        { id: 2, name: '스킨답서스', stock: 30, note: '물을 좋아합니다.' },
        { id: 3, name: '몬스테라 아단소니', stock: 4, note: '잎에 구멍이 있습니다.' },
        { id: 4, name: '올리브나무', stock: 0, note: '햇빛이 많이 필요합니다.' },
        { id: 5, name: '유칼립투스', stock: 7, note: '통풍이 중요합니다.' },
    ]
}

let plants = initialPlants()

/** 식물 데이터를 처음 상태로 되돌립니다. 테스트에서 씁니다. */
export function resetPlants(): void {
    plants = initialPlants()
}

function findPlant(id: string | undefined): Plant | undefined {
    return plants.find((candidate) => candidate.id === Number(id))
}

/*
 * 백엔드 없이 동작하도록 만든 가짜 서버입니다.
 * 브라우저에서는 응답이 400ms 늦게 오고, 테스트에서는 바로 옵니다.
 *
 * GET   /api/plants?keyword=   식물 목록. [{ id, name, stock }]
 * GET   /api/plants/:id        식물 하나. { id, name, stock, note }
 * PATCH /api/plants/:id        재고 수정. 본문 { stock }. 0 이상의 정수가 아니면 400.
 */
export const fakeApi = createFakeApi({
    delayMs: import.meta.env.MODE === 'test' ? 0 : BROWSER_DELAY_MS,
    routes: [
        {
            method: 'GET',
            path: '/api/plants',
            handler: ({ query }) => {
                const keyword = query.get('keyword') ?? ''
                return {
                    body: plants
                        .filter((plant) => plant.name.includes(keyword))
                        .map(({ id, name, stock }) => ({ id, name, stock })),
                }
            },
        },
        {
            method: 'GET',
            path: '/api/plants/:id',
            handler: ({ params }) => {
                const plant = findPlant(params.id)
                return plant
                    ? { body: plant }
                    : { status: 404, body: { code: 'NOT_FOUND' } }
            },
        },
        {
            method: 'PATCH',
            path: '/api/plants/:id',
            handler: ({ params, body }) => {
                const plant = findPlant(params.id)
                if (!plant) return { status: 404, body: { code: 'NOT_FOUND' } }

                const parsed = StockPatchSchema.safeParse(body)
                if (!parsed.success) {
                    return { status: 400, body: { code: 'INVALID_STOCK' } }
                }
                plant.stock = parsed.data.stock
                return { body: plant }
            },
        },
    ],
})
