import { z } from 'zod'

interface Order {
    id: number
    customer: string
    plantName: string
    quantity: number
    status: 'pending' | 'shipped'
    memo: string
}

interface Supplier {
    id: number
    name: string
    phone: string
}

interface Settings {
    lowStockAlert: boolean
    lowStockThreshold: number
    orderAlert: boolean
    email: string
}

const MEMO_MAX_LENGTH = 100

const MemoPatchSchema = z.object({ memo: z.string().max(MEMO_MAX_LENGTH) })
const SupplierSchema = z.object({ name: z.string(), phone: z.string() })
const SettingsSchema = z.object({
    lowStockAlert: z.boolean(),
    lowStockThreshold: z.unknown(),
    orderAlert: z.boolean(),
    email: z.string(),
})

function initialOrders(): Order[] {
    return [
        { id: 1, customer: '김하늘', plantName: '몬스테라', quantity: 2, status: 'pending', memo: '문 앞에 놓아 주세요.' },
        { id: 2, customer: '이도윤', plantName: '올리브나무', quantity: 1, status: 'shipped', memo: '' },
        { id: 3, customer: '박서연', plantName: '스킨답서스', quantity: 5, status: 'pending', memo: '' },
        { id: 4, customer: '최민준', plantName: '유칼립투스', quantity: 3, status: 'shipped', memo: '부재 시 경비실에 맡겨 주세요.' },
        { id: 5, customer: '정유나', plantName: '몬스테라 아단소니', quantity: 1, status: 'pending', memo: '' },
    ]
}

function initialSuppliers(): Supplier[] {
    return [
        { id: 1, name: '초록농원', phone: '031-555-0101' },
        { id: 2, name: '한빛화훼', phone: '02-555-0199' },
        { id: 3, name: '숲속묘목', phone: '041-555-0142' },
    ]
}

function initialSettings(): Settings {
    return {
        lowStockAlert: true,
        lowStockThreshold: 5,
        orderAlert: false,
        email: 'owner@example.com',
    }
}

const NOT_FOUND = { status: 404, body: { code: 'NOT_FOUND' } }

/*
 * 백엔드를 흉내 내는 가짜 서버를 하나 만듭니다. 데이터는 만들 때마다 처음 상태입니다.
 * 개발 서버(fakeServer.plugin.mjs)는 응답을 400ms 늦추고, 테스트는 바로 받습니다.
 *
 * GET    /api/orders?status=    주문 목록. [{ id, customer, plantName, quantity, status }]
 *                               status는 "pending"(준비 중) 또는 "shipped"(발송됨). 없으면 전체.
 * GET    /api/orders/:id        주문 하나. { id, customer, plantName, quantity, status, memo }
 * PATCH  /api/orders/:id        배송 메모 수정. 본문 { memo }. 100자를 넘으면 400.
 * POST   /api/orders/:id/ship   발송 처리. 준비 중인 주문이 아니면 409.
 *
 * GET    /api/suppliers         공급처 목록. [{ id, name, phone }]
 * POST   /api/suppliers         공급처 추가. 본문 { name, phone }.
 *                               실패하면 400과 { code }: "NAME_REQUIRED", "INVALID_PHONE".
 * DELETE /api/suppliers/:id     공급처 삭제. { id }
 *
 * GET    /api/settings          알림 설정. { lowStockAlert, lowStockThreshold, orderAlert, email }
 * PUT    /api/settings          알림 설정 저장. 본문은 위와 같은 모양.
 *                               실패하면 400과 { code }: "INVALID_THRESHOLD", "INVALID_EMAIL".
 */
export function createFakeServer(options: { delayMs?: number } = {}): FakeApi {
    const orders = initialOrders()
    let suppliers = initialSuppliers()
    let nextSupplierId = 4
    let settings = initialSettings()

    function findOrder(id: string | undefined): Order | undefined {
        return orders.find((candidate) => candidate.id === Number(id))
    }

    return createFakeApi({
        delayMs: options.delayMs ?? 0,
        routes: [
            {
                method: 'GET',
                path: '/api/orders',
                handler: ({ query }) => {
                    const status = query.get('status') ?? ''
                    return {
                        body: orders
                            .filter((order) => status === '' || order.status === status)
                            .map(({ id, customer, plantName, quantity, status: orderStatus }) => ({
                                id,
                                customer,
                                plantName,
                                quantity,
                                status: orderStatus,
                            })),
                    }
                },
            },
            {
                method: 'GET',
                path: '/api/orders/:id',
                handler: ({ params }) => {
                    const order = findOrder(params.id)
                    return order ? { body: order } : NOT_FOUND
                },
            },
            {
                method: 'PATCH',
                path: '/api/orders/:id',
                handler: ({ params, body }) => {
                    const order = findOrder(params.id)
                    if (!order) return NOT_FOUND

                    const parsed = MemoPatchSchema.safeParse(body)
                    if (!parsed.success) {
                        return { status: 400, body: { code: 'INVALID_MEMO' } }
                    }
                    order.memo = parsed.data.memo
                    return { body: order }
                },
            },
            {
                method: 'POST',
                path: '/api/orders/:id/ship',
                handler: ({ params }) => {
                    const order = findOrder(params.id)
                    if (!order) return NOT_FOUND
                    if (order.status !== 'pending') {
                        return { status: 409, body: { code: 'NOT_PENDING' } }
                    }
                    order.status = 'shipped'
                    return { body: order }
                },
            },
            {
                method: 'GET',
                path: '/api/suppliers',
                handler: () => ({ body: suppliers }),
            },
            {
                method: 'POST',
                path: '/api/suppliers',
                handler: ({ body }) => {
                    const parsed = SupplierSchema.safeParse(body)
                    if (!parsed.success || parsed.data.name.trim() === '') {
                        return { status: 400, body: { code: 'NAME_REQUIRED' } }
                    }
                    if (!/^[0-9-]+$/.test(parsed.data.phone)) {
                        return { status: 400, body: { code: 'INVALID_PHONE' } }
                    }
                    const supplier = {
                        id: nextSupplierId,
                        name: parsed.data.name.trim(),
                        phone: parsed.data.phone,
                    }
                    nextSupplierId += 1
                    suppliers = [...suppliers, supplier]
                    return { status: 201, body: supplier }
                },
            },
            {
                method: 'DELETE',
                path: '/api/suppliers/:id',
                handler: ({ params }) => {
                    const id = Number(params.id)
                    if (!suppliers.some((supplier) => supplier.id === id)) return NOT_FOUND
                    suppliers = suppliers.filter((supplier) => supplier.id !== id)
                    return { body: { id } }
                },
            },
            {
                method: 'GET',
                path: '/api/settings',
                handler: () => ({ body: settings }),
            },
            {
                method: 'PUT',
                path: '/api/settings',
                handler: ({ body }) => {
                    const parsed = SettingsSchema.safeParse(body)
                    const threshold = parsed.success ? parsed.data.lowStockThreshold : null
                    if (
                        !parsed.success ||
                        typeof threshold !== 'number' ||
                        !Number.isInteger(threshold) ||
                        threshold < 1
                    ) {
                        return { status: 400, body: { code: 'INVALID_THRESHOLD' } }
                    }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.data.email)) {
                        return { status: 400, body: { code: 'INVALID_EMAIL' } }
                    }
                    settings = { ...parsed.data, lowStockThreshold: threshold }
                    return { body: settings }
                },
            },
        ],
    })
}
