import { defineScenario } from '@agent-greenhouse/framework/verify'

export default defineScenario({
    name: '홈',
    steps: async (page) => {
        await page.see({ role: 'heading', name: '홈' })
        await page.shot('처음')
    },
})
