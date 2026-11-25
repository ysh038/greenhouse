import { defineScenario } from '@agent-greenhouse/framework/verify'

export default defineScenario({
    name: '없는 식물',
    path: '/plants/999',
    steps: async (page) => {
        await page.see({ text: '식물을 찾을 수 없습니다' })
        await page.shot('없는 식물의 주소')
    },
})
