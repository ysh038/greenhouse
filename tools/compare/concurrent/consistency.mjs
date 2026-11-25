// 화면 사이의 모양 일치: 세 화면의 "저장" 버튼과 입력란의 계산된 스타일을 비교하고 스크린샷을 남깁니다.
//   COMPARE_CONTROL=route COMPARE_HOME_TEXT='식물 재고 화면은 아직 없습니다' \
//     node tools/compare/concurrent/consistency.mjs <앱 폴더> <결과 폴더> <포트>
import fs from 'node:fs'
import path from 'node:path'

import { button, field, openPage, setup, teardown } from '../accumulate/lib.mjs'
import { openAdd, openOrder, plantsLoaded, toOrders, toSettings, toSuppliers } from '../accumulate/flows.mjs'

const [appDir, resultDir, port] = process.argv.slice(2)
const PROPS = ['height', 'borderRadius', 'backgroundColor', 'color', 'fontSize', 'fontWeight', 'borderColor', 'paddingLeft']
const styleOf = (locator) =>
    locator.evaluate((element, props) => {
        const style = getComputedStyle(element)
        return Object.fromEntries(props.map((prop) => [prop, style[prop]]))
    }, PROPS)

const rows = { '저장 버튼': {}, 입력란: {} }
try {
    await setup(appDir, resultDir, Number(port))
    for (const colorScheme of ['light', 'dark']) {
        const { page, context } = await openPage({ colorScheme })
        const shot = (name) => page.screenshot({ path: path.join(resultDir, `${name}--${colorScheme}.png`) })
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        if (colorScheme === 'light') {
            rows['저장 버튼'].주문 = await styleOf(await button(page, '저장'))
            rows.입력란.주문 = await styleOf(memo)
        }
        await shot('1-주문 상세')
        await page.keyboard.press('Escape')
        await toSuppliers(page)
        const { name } = await openAdd(page)
        if (colorScheme === 'light') {
            rows['저장 버튼'].공급처 = await styleOf(await button(page, '저장'))
            rows.입력란.공급처 = await styleOf(name)
        }
        await shot('2-공급처 추가')
        await page.keyboard.press('Escape')
        const settings = await toSettings(page)
        await settings.email.fill('new@example.com')
        if (colorScheme === 'light') {
            rows['저장 버튼']['알림 설정'] = await styleOf(settings.save)
            rows.입력란['알림 설정'] = await styleOf(settings.email)
        }
        await shot('3-알림 설정')
        await context.close()
    }
} finally {
    await teardown()
}

const summary = {}
for (const [role, byScreen] of Object.entries(rows)) {
    const differing = PROPS.filter((prop) => new Set(Object.values(byScreen).map((style) => style[prop])).size > 1)
    summary[role] = { differing, values: Object.fromEntries(differing.map((prop) => [prop, Object.fromEntries(Object.entries(byScreen).map(([screen, style]) => [screen, style[prop]]))])) }
}
fs.writeFileSync(path.join(resultDir, 'consistency.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 1))
void field
