import { defineScenario } from '@agent-greenhouse/framework/verify'

export default defineScenario({
    name: '보호된 화면',
    // 로그인하지 않고 내 계정을 엽니다. 로그인 화면으로 보내져야 합니다.
    path: '/account',
    steps: async (page) => {
        await page.see({ role: 'heading', name: '로그인' })
        await page.see({ text: '로그인이 필요합니다' })
        await page.shot('로그인 화면으로 보내진 상태')

        await page.click({ role: 'button', name: '구성원으로 로그인' })
        await page.see({ role: 'heading', name: '내 계정' })
        await page.see({ text: '역할: 구성원' })
        await page.shot('구성원으로 들어온 내 계정')

        // 구성원은 관리자 화면에 들어가지 못하고 내 계정에 남습니다.
        await page.click({ role: 'link', name: '관리자 화면' })
        await page.see({ role: 'heading', name: '내 계정' })

        await page.click({ role: 'button', name: '로그아웃' })
        await page.see({ role: 'heading', name: '로그인' })
        await page.click({ role: 'button', name: '관리자로 로그인' })
        await page.see({ text: '역할: 관리자' })
        await page.click({ role: 'link', name: '관리자 화면' })
        await page.see({ role: 'heading', name: '관리자 화면' })
        await page.shot('관리자로 들어온 관리자 화면')
    },
})
