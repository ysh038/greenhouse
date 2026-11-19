import { defineScenario } from '@agent-greenhouse/framework/verify'

export default defineScenario({
    name: '앱 틀',
    steps: async (page) => {
        await page.see({ role: 'heading', name: '온실 관리' })
        await page.shot('처음')
    },
})
