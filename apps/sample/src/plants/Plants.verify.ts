import { defineScenario } from '@agent-greenhouse/framework/verify'

const SORT = { label: '정렬' } as const

export default defineScenario({
    name: '식물',
    path: '/plants',
    steps: async (page) => {
        await page.see({ role: 'heading', name: '식물' })
        await page.shot('목록 (이름순)')

        await page.select(SORT, '재고 많은 순')
        await page.see({ text: '재고 30개' })
        await page.shot('재고 많은 순으로 바꾼 뒤')

        await page.click({ role: 'link', name: '올리브나무' })
        await page.see({ role: 'heading', name: '올리브나무' })
        await page.shot('식물 하나의 화면')

        await page.click({ role: 'link', name: '식물 목록으로' })
        await page.see({ role: 'heading', name: '식물' })
    },
})
