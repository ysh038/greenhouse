// 공통 변경(주 색상, 실패 문구, 포커스)이 네 화면 모두에 반영됐는지 검사합니다.
//   node tools/compare/accumulate/change.mjs <앱 폴더> <결과 폴더> <포트> [변경 전 probe.json]
// 변경 전 측정 결과를 주면, 예전 주 색상이 남은 곳도 셉니다.
import fs from 'node:fs'

import {
    flip, needAddClosed, openAdd, openOrder, openPlant, plantsLoaded, toOrders, toSettings, toSuppliers,
} from './flows.mjs'
import {
    api, button, choose, contrastOf, define, field, menuItem, need, needGone, rowButton, runChecks, seen,
    setup, sleep, tabUntil, teardown, textOf, withPage,
} from './lib.mjs'

const [appDir, resultDir, portText, oldProbePath] = process.argv.slice(2)

const TARGET = { light: [31, 122, 77], dark: [111, 207, 151] }
const FAILURE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요'
const SCHEMES = { light: '밝은 화면', dark: '어두운 화면' }

/** 요소(와 그 앞뒤 가상 요소)에 칠해진 색을 모두 모읍니다. [r, g, b] 목록. */
const paintedColors = (locator, { withParent = false } = {}) =>
    locator.evaluate((element, includeParent) => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d', { willReadFrequently: true })
        const toRgb = (color) => {
            context.clearRect(0, 0, 1, 1)
            context.fillStyle = '#000'
            context.fillStyle = color
            context.fillRect(0, 0, 1, 1)
            const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
            return a > 120 ? [r, g, b] : null
        }
        const found = []
        const collect = (node, pseudo) => {
            const style = getComputedStyle(node, pseudo)
            if (pseudo && style.content === 'none') return
            const candidates = [style.color, style.backgroundColor]
            for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
                if (parseFloat(style[`border${side}Width`]) > 0) candidates.push(style[`border${side}Color`])
            }
            if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) candidates.push(style.outlineColor)
            if (style.textDecorationLine !== 'none') candidates.push(style.textDecorationColor)
            candidates.push(style.accentColor === 'auto' ? '' : style.accentColor)
            for (const match of style.boxShadow.match(/rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8}/gi) ?? []) candidates.push(match)
            for (const color of candidates) {
                if (!color) continue
                const rgb = toRgb(color)
                if (rgb) found.push(rgb)
            }
        }
        // 숨긴 라디오 옆의 span을 꾸미는 구현이 있어서 라벨 안쪽과 바로 옆 요소도 봅니다.
        const nodes = [element, ...(element.labels ?? [])]
        for (const label of element.labels ?? []) nodes.push(...label.querySelectorAll('*'))
        if (element.nextElementSibling) nodes.push(element.nextElementSibling)
        if (includeParent && element.parentElement) nodes.push(element.parentElement)
        for (const node of nodes) {
            collect(node)
            collect(node, '::before')
            collect(node, '::after')
        }
        return found
    }, withParent)

const isNear = (a, b) => a.every((value, index) => Math.abs(value - b[index]) <= 3)
const carries = (colors, target) => colors.some((color) => isNear(color, target))
const show = (colors) => [...new Set(colors.map((color) => `rgb(${color.join(',')})`))].slice(0, 6).join(' ')

// ======================================================================
// 1. 주 색상
// ======================================================================
const saveButtons = {
    '식물 재고': async (page) => {
        await openPlant(page)
        return button(page, '저장')
    },
    주문: async (page) => {
        await toOrders(page)
        await openOrder(page)
        return button(page, '저장')
    },
    공급처: async (page) => {
        await toSuppliers(page)
        await openAdd(page)
        return button(page, '저장')
    },
    '알림 설정': async (page) => {
        const form = await toSettings(page)
        await form.email.fill('changed@example.com')
        return form.save
    },
}

let index = 0
for (const [scheme, schemeName] of Object.entries(SCHEMES)) {
    for (const [screen, open] of Object.entries(saveButtons)) {
        index += 1
        define('주 색상', `CC${index}`, `${schemeName}: ${screen}의 "저장" 버튼이 새 주 색상이고 글자를 읽을 수 있다`, () =>
            withPage({ colorScheme: scheme }, async (page) => {
                await plantsLoaded(page)
                const save = await open(page)
                await sleep(300)
                const background = await save.evaluate((element) => getComputedStyle(element).backgroundColor)
                const colors = await paintedColors(save)
                const rgb = background.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
                if (rgb.length !== 3 || !isNear(rgb, TARGET[scheme])) throw new Error(`배경이 ${background} (칠해진 색: ${show(colors)})`)
                const contrast = await contrastOf(save)
                if (contrast.ratio < 4.5) throw new Error(`글자 명암비 ${contrast.ratio}:1`)
            }),
        )
    }
}

for (const [scheme, schemeName] of Object.entries(SCHEMES)) {
    index += 1
    define('주 색상', `CC${index}`, `${schemeName}: 고른 메뉴 항목과 고른 필터에 새 주 색상이 쓰인다`, () =>
        withPage({ colorScheme: scheme }, async (page) => {
            await plantsLoaded(page)
            await toOrders(page)
            const menuColors = await paintedColors(await menuItem(page, '주문'), { withParent: true })
            if (!carries(menuColors, TARGET[scheme])) throw new Error(`고른 메뉴 항목의 색: ${show(menuColors)}`)
            const picked = await choose(page, '준비 중')
            await needGone(page, '이도윤')
            await page.mouse.move(4, 4)
            await sleep(300)
            const filterColors = await paintedColors(picked, { withParent: true })
            if (!carries(filterColors, TARGET[scheme])) throw new Error(`고른 필터의 색: ${show(filterColors)}`)
        }),
    )
}

const focusTargets = {
    '식물 재고의 식물 검색': (page) => field(page, '식물 검색'),
    '주문의 배송 메모': async (page) => {
        await toOrders(page)
        return openOrder(page)
    },
    '공급처의 이름': async (page) => {
        await toSuppliers(page)
        return (await openAdd(page)).name
    },
    '알림 설정의 이메일': async (page) => (await toSettings(page)).email,
}
for (const [name, open] of Object.entries(focusTargets)) {
    index += 1
    define('주 색상', `CC${index}`, `밝은 화면: ${name} 입력란의 포커스 표시가 새 주 색상이다`, () =>
        withPage({}, async (page) => {
            await plantsLoaded(page)
            const input = await open(page)
            await input.focus()
            await page.keyboard.press('Shift+Tab')
            await page.keyboard.press('Tab')
            await sleep(300)
            const colors = await paintedColors(input, { withParent: true })
            if (!carries(colors, TARGET.light)) throw new Error(`포커스된 입력란의 색: ${show(colors)}`)
        }),
    )
}

if (oldProbePath) {
    const old = JSON.parse(fs.readFileSync(oldProbePath, 'utf8'))
    const oldColors = [...new Set(old.samples.filter((item) => item.role === '저장 버튼').map((item) => item.style.backgroundColor))]
        .map((color) => color.match(/[\d.]+/g)?.slice(0, 3).map(Number))
        .filter((rgb) => rgb && Math.max(...rgb) - Math.min(...rgb) > 30 && !isNear(rgb, TARGET.light))
    define('참고', 'CL', `밝은 화면: 예전 주 색상(${oldColors.map((c) => `rgb(${c.join(',')})`).join(', ') || '없음'})이 남은 곳이 없다`, () =>
        withPage({}, async (page) => {
            await plantsLoaded(page)
            const left = []
            const scan = async (where) => {
                await sleep(300)
                const hits = await page.evaluate((targets) => {
                    const near = (text) => {
                        const numbers = text.match(/rgba?\(([^)]*)\)/g) ?? []
                        return numbers.some((value) => {
                            const [r, g, b, a = '1'] = value.match(/[\d.]+/g)
                            if (Number(a) < 0.5) return false
                            return targets.some((t) => Math.abs(t[0] - r) <= 3 && Math.abs(t[1] - g) <= 3 && Math.abs(t[2] - b) <= 3)
                        })
                    }
                    const found = []
                    for (const element of document.querySelectorAll('body *')) {
                        const rect = element.getBoundingClientRect()
                        if (rect.width === 0 || rect.height === 0) continue
                        const style = getComputedStyle(element)
                        const parts = [style.color, style.backgroundColor, style.boxShadow, style.textDecorationColor]
                        if (parseFloat(style.borderTopWidth) > 0) parts.push(style.borderTopColor)
                        if (parseFloat(style.borderBottomWidth) > 0) parts.push(style.borderBottomColor)
                        if (parseFloat(style.borderLeftWidth) > 0) parts.push(style.borderLeftColor)
                        if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) parts.push(style.outlineColor)
                        if (parts.some(near)) found.push(`${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 12)}"`)
                    }
                    return found
                }, oldColors)
                for (const hit of hits) left.push(`${where}: ${hit}`)
            }
            await scan('식물 재고')
            await openPlant(page)
            await scan('식물 상세')
            await page.keyboard.press('Escape')
            await toOrders(page)
            await choose(page, '준비 중')
            await scan('주문')
            await openOrder(page)
            await scan('주문 상세')
            await page.keyboard.press('Escape')
            await toSuppliers(page)
            await scan('공급처')
            await openAdd(page)
            await scan('공급처 추가')
            await page.keyboard.press('Escape')
            await needAddClosed(page)
            await (await rowButton(page, '한빛화훼', /삭제/)).click()
            await need(page, '한빛화훼을(를) 삭제할까요?')
            await scan('삭제 확인')
            await page.keyboard.press('Escape')
            const form = await toSettings(page)
            await form.email.fill('changed@example.com')
            await scan('알림 설정')
            if (left.length > 0) throw new Error(`${left.length}곳: ${[...new Set(left)].slice(0, 6).join(' / ')}`)
        }),
    )
}

// ======================================================================
// 2. 요청 실패 문구
// ======================================================================
async function needFailure(page, act) {
    await api(page, 'failOnce', 500) // 변경 요청 한 번만 실패 (뒤따르는 조회는 정상)
    await act()
    if (!(await seen(page, FAILURE, { timeout: 12000 }))) {
        const alerts = await page.getByRole('alert').allInnerTexts().catch(() => [])
        throw new Error(`통일 문구가 안 보임${alerts.length ? ` (보인 안내: ${alerts.join(' | ').slice(0, 80)})` : ''}`)
    }
}

define('실패 문구', 'CF1', '식물 재고 저장 실패', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const stock = await openPlant(page)
        await stock.fill('9')
        await needFailure(page, async () => (await button(page, '저장')).click())
    }),
)
define('실패 문구', 'CF2', '주문 배송 메모 저장 실패', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        await memo.fill('바꿈')
        await needFailure(page, async () => (await button(page, '저장')).click())
    }),
)
define('실패 문구', 'CF3', '주문 발송 처리 실패', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await openOrder(page)
        const ship = await button(page, '발송 처리')
        await needFailure(page, () => ship.click())
    }),
)
define('실패 문구', 'CF4', '공급처 추가 실패', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name, phone } = await openAdd(page)
        await name.fill('실패집')
        await phone.fill('010-5555-0001')
        await needFailure(page, async () => (await button(page, '저장')).click())
    }),
)
define('실패 문구', 'CF5', '공급처 삭제 실패', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        await (await rowButton(page, '한빛화훼', /삭제/)).click()
        const confirm = await button(page, '삭제하기')
        await needFailure(page, () => confirm.click())
    }),
)
define('실패 문구', 'CF6', '알림 설정 저장 실패', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.email.fill('keep@example.com')
        await needFailure(page, () => form.save.click())
    }),
)

async function needKept(page, code, message, act) {
    await api(page, 'failOnce', 400, { code })
    await act()
    await need(page, message, { timeout: 6000 })
    if (await seen(page, FAILURE, { timeout: 0 })) throw new Error('400인데 통일 문구가 보임')
}
define('실패 문구', 'CF7', '식물 재고: 400 문구는 그대로', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const stock = await openPlant(page)
        await stock.fill('9')
        await needKept(page, 'INVALID_STOCK', /재고는 0 이상의 정수여야 합니다/, async () => (await button(page, '저장')).click())
    }),
)
define('실패 문구', 'CF8', '주문: 400 문구는 그대로', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        await memo.fill('바꿈')
        await needKept(page, 'INVALID_MEMO', /배송 메모는 100자 이하여야 합니다/, async () => (await button(page, '저장')).click())
    }),
)
define('실패 문구', 'CF9', '공급처: 400 문구는 그대로', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name, phone } = await openAdd(page)
        await name.fill('새싹')
        await phone.fill('010-5555-0003')
        await needKept(page, 'INVALID_PHONE', /연락처는 숫자와 -만 쓸 수 있습니다/, async () => (await button(page, '저장')).click())
    }),
)
define('실패 문구', 'CF10', '알림 설정: 400 문구는 그대로', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await flip(page, form.order)
        await needKept(page, 'INVALID_EMAIL', /이메일 형식이 올바르지 않습니다/, () => form.save.click())
    }),
)

// ======================================================================
// 3. 패널과 확인 창의 포커스
// ======================================================================
const dialogs = {
    '식물 상세': {
        focusOpener: async (page) => {
            await (await field(page, '식물 검색')).focus()
            if (!(await tabUntil(page, { includes: '스킨답서스', excludes: ['유칼립투스'] }))) throw new Error('Tab으로 식물 항목에 닿지 못함')
        },
        inside: async (page) => [await field(page, '재고'), await button(page, '닫기')],
        isOpen: (page) => seen(page, '식물 상세', { timeout: 0, exact: true }),
    },
    '주문 상세': {
        before: toOrders,
        focusOpener: async (page) => {
            await (await menuItem(page, '주문')).focus()
            if (!(await tabUntil(page, { includes: '박서연', excludes: ['김하늘', '정유나'] }))) throw new Error('Tab으로 주문 항목에 닿지 못함')
        },
        inside: async (page) => [await field(page, '배송 메모'), await button(page, '닫기')],
        isOpen: (page) => seen(page, '주문 상세', { timeout: 0, exact: true }),
    },
    '공급처 추가': {
        before: toSuppliers,
        focusOpener: async (page) => (await button(page, '공급처 추가')).focus(),
        inside: async (page) => [await field(page, '이름'), await button(page, '닫기')],
        isOpen: async (page) => (await page.getByLabel('이름', { exact: true }).count()) > 0 && (await page.getByLabel('이름', { exact: true }).first().isVisible()),
    },
    '삭제 확인 창': {
        before: toSuppliers,
        focusOpener: async (page) => (await rowButton(page, '한빛화훼', /삭제/)).focus(),
        inside: async (page) => [await button(page, '삭제하기'), await button(page, '취소')],
        isOpen: (page) => seen(page, '삭제할까요?', { timeout: 0 }),
    },
}

async function openByKeyboard(page, dialog) {
    await plantsLoaded(page)
    if (dialog.before) await dialog.before(page)
    await dialog.focusOpener(page)
    await page.evaluate(() => { window.__opener = document.activeElement })
    await page.keyboard.press('Enter')
    const [first, second] = await dialog.inside(page)
    await sleep(500)
    const handles = [await first.elementHandle(), await second.elementHandle()]
    await page.evaluate(([a, b]) => {
        let node = a
        while (node && !node.contains(b)) node = node.parentElement
        window.__box = node?.closest('dialog, [role="dialog"], [role="alertdialog"]') ?? node
    }, handles)
}

let dialogIndex = 0
for (const [name, dialog] of Object.entries(dialogs)) {
    dialogIndex += 1
    define('포커스', `CT${dialogIndex}`, `${name}: Tab으로 포커스가 밖으로 나가지 않는다`, () =>
        withPage({}, async (page) => {
            await openByKeyboard(page, dialog)
            const where = () => page.evaluate(() => {
                const active = document.activeElement
                if (!active || active === document.body) return '어디에도 없음'
                if (window.__box?.contains(active)) return ''
                return `밖의 ${active.tagName.toLowerCase()} "${(active.textContent ?? active.getAttribute('aria-label') ?? '').trim().slice(0, 14)}"`
            })
            for (let i = 0; i < 12; i += 1) {
                await page.keyboard.press('Tab')
                const escaped = await where()
                if (escaped) throw new Error(`Tab ${i + 1}번째에 포커스가 ${escaped}`)
            }
            for (let i = 0; i < 4; i += 1) {
                await page.keyboard.press('Shift+Tab')
                const escaped = await where()
                if (escaped) throw new Error(`Shift+Tab ${i + 1}번째에 포커스가 ${escaped}`)
            }
        }),
    )
    define('포커스', `CR${dialogIndex}`, `${name}: 닫으면 열기 전에 있던 곳으로 포커스가 돌아간다`, () =>
        withPage({}, async (page) => {
            await openByKeyboard(page, dialog)
            await page.keyboard.press('Escape')
            for (let i = 0; i < 20 && (await dialog.isOpen(page)); i += 1) await sleep(100)
            if (await dialog.isOpen(page)) throw new Error('Escape로 닫히지 않음')
            let state = ''
            for (let i = 0; i < 15; i += 1) {
                state = await page.evaluate(() => {
                    const active = document.activeElement
                    const opener = window.__opener
                    if (active === opener) return ''
                    if (active && opener && !opener.isConnected && active.tagName === opener.tagName && active.textContent === opener.textContent) return ''
                    if (!active || active === document.body) return '어디에도 없음'
                    return `${active.tagName.toLowerCase()} "${(active.textContent ?? '').trim().slice(0, 14)}"`
                })
                if (state === '') return
                await sleep(100)
            }
            throw new Error(`닫은 뒤 포커스가 ${state}`)
        }),
    )
}

// ---------- 실행 ----------
try {
    await setup(appDir, resultDir, Number(portText))
    await runChecks('change.json')
} finally {
    await teardown()
}
