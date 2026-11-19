// 화면 사이의 일관성 측정과 스크린샷.
//   node tools/compare/accumulate/probe.mjs <앱 폴더> <결과 폴더> <포트>
// 같은 역할을 하는 요소(저장 버튼, 입력란, 오류 문구, 패널 등)를 네 화면에서 찾아
// 계산된 스타일을 비교합니다. 역할마다 서로 다른 모양이 몇 가지인지가 결과입니다.
import fs from 'node:fs'
import path from 'node:path'

import {
    flip, needAddClosed, openAdd, openOrder, openPlant, plantsLoaded, toOrders, toSettings, toSuppliers,
} from './flows.mjs'
import {
    api, button, choose, field, firstVisible, goTo, menuItem, need, needGone, openPage, rowButton, setup,
    sleep, teardown, textOf,
} from './lib.mjs'

const [appDir, resultDir, portText] = process.argv.slice(2)
const shotDir = path.join(resultDir, 'shots')

const samples = []
const errors = []

const PROPS = {
    button: ['tag', 'height', 'paddingLeft', 'fontSize', 'fontWeight', 'borderRadius', 'backgroundColor', 'color', 'borderColor', 'borderWidth'],
    input: ['tag', 'height', 'paddingLeft', 'fontSize', 'borderRadius', 'borderColor', 'backgroundColor', 'color'],
    text: ['fontSize', 'fontWeight', 'color'],
    heading: ['tag', 'fontSize', 'fontWeight', 'color'],
    message: ['fontSize', 'fontWeight', 'color', 'surface', 'live', 'placement'],
    panel: ['placement', 'width', 'borderRadius', 'paddingLeft', 'backgroundColor', 'hasShadow', 'hasBorder', 'isModal'],
}

/** 요소의 모양을 역할에 맞는 속성만 뽑아 적습니다 */
async function describe(locator, kind) {
    const all = await locator.evaluate((element, positionDepth) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        const px = (value) => `${Math.round(parseFloat(value) || 0)}px`
        const opaque = (color) => !/rgba\(.*,\s*0\)$|transparent/.test(color)
        // 글자 뒤에 깔린 색: 자신부터 올라가며 처음 칠해진 배경
        let surface = 'none'
        let live = 'none'
        let positioned = 'static'
        let depth = 0
        for (let node = element; node && node !== document.body; node = node.parentElement, depth += 1) {
            const nodeStyle = getComputedStyle(node)
            if (surface === 'none' && depth < 3 && opaque(nodeStyle.backgroundColor)) surface = nodeStyle.backgroundColor
            const role = node.getAttribute('role')
            if (live === 'none' && (role === 'alert' || role === 'status')) live = role
            if (live === 'none' && node.hasAttribute('aria-live')) live = `aria-live=${node.getAttribute('aria-live')}`
            // 문구 자신이나 바로 위 상자가 떠 있는지만 봅니다. 떠 있는 패널 안에 든 것은 세지 않습니다.
            if (positioned === 'static' && depth < positionDepth && nodeStyle.position !== 'static' && nodeStyle.position !== 'relative') {
                positioned = nodeStyle.position
            }
        }
        const viewWidth = innerWidth
        const viewHeight = innerHeight
        let placement = 'inline'
        if (positioned === 'fixed' || positioned === 'absolute' || positioned === 'sticky') {
            const centerX = rect.x + rect.width / 2
            const centerY = rect.y + rect.height / 2
            if (rect.height >= viewHeight * 0.9 && rect.right >= viewWidth - 2) placement = `${positioned}: 오른쪽 서랍`
            else if (Math.abs(centerX - viewWidth / 2) < 60 && Math.abs(centerY - viewHeight / 2) < viewHeight * 0.3) placement = `${positioned}: 가운데`
            else if (centerY < viewHeight * 0.25) placement = `${positioned}: 위`
            else if (centerY > viewHeight * 0.75) placement = `${positioned}: 아래`
            else placement = `${positioned}: 그 밖`
        }
        const isDialog = element.tagName === 'DIALOG' || element.getAttribute('role') === 'dialog' || element.getAttribute('role') === 'alertdialog'
        return {
            tag: element.tagName.toLowerCase(),
            height: `${Math.round(rect.height)}px`,
            width: `${Math.round(rect.width)}px`,
            paddingLeft: px(style.paddingLeft),
            fontSize: px(style.fontSize),
            fontWeight: style.fontWeight,
            borderRadius: px(style.borderTopLeftRadius),
            backgroundColor: style.backgroundColor,
            color: style.color,
            borderColor: parseFloat(style.borderTopWidth) > 0 ? style.borderTopColor : 'none',
            borderWidth: px(style.borderTopWidth),
            hasShadow: style.boxShadow !== 'none',
            hasBorder: parseFloat(style.borderTopWidth) > 0,
            isModal: isDialog ? `dialog${element.getAttribute('aria-modal') === 'true' || element.matches?.(':modal') ? ' (modal)' : ''}` : 'dialog 아님',
            surface,
            live,
            placement,
        }
    }, kind === 'message' ? 2 : 1)
    return Object.fromEntries(PROPS[kind].map((name) => [name, all[name]]))
}

async function sample(role, kind, screen, name, getLocator) {
    try {
        const locator = await getLocator()
        if (!locator) throw new Error('찾지 못함')
        samples.push({ role, screen, name, style: await describe(locator, kind) })
    } catch (error) {
        errors.push(`${screen} / ${role} / ${name}: ${String(error.message ?? error).split('\n')[0].slice(0, 160)}`)
    }
}

/** 두 요소를 모두 품은 가장 가까운 상자. 그 위에 dialog가 있으면 dialog. */
async function containerOf(first, second) {
    const other = await second.elementHandle()
    const handle = await first.evaluateHandle((element, target) => {
        let node = element
        while (node && !node.contains(target)) node = node.parentElement
        const dialog = node?.closest('dialog, [role="dialog"], [role="alertdialog"]')
        if (dialog) return dialog
        // 패딩이나 배경이 있는 상자까지 올라갑니다 (폼만 감싼 상자를 패널로 보지 않도록).
        for (let box = node; box && box !== document.body; box = box.parentElement) {
            const style = getComputedStyle(box)
            const isPainted = !/rgba\(.*,\s*0\)$|transparent/.test(style.backgroundColor) || parseFloat(style.borderTopWidth) > 0 || style.boxShadow !== 'none'
            if (isPainted) return box
        }
        return node
    }, other)
    return handle.asElement()
}

const labelOf = async (input) => {
    const handle = await input.evaluateHandle((element) => element.labels?.[0] ?? null)
    return handle.asElement()
}

async function shot(page, name) {
    await sleep(600)
    await page.screenshot({ path: path.join(shotDir, `${name}.png`), animations: 'disabled' })
}

async function step(title, body) {
    try {
        await body()
    } catch (error) {
        errors.push(`[${title}] ${String(error.message ?? error).split('\n')[0].slice(0, 200)}`)
    }
}

const heading = (page, name) => firstVisible(page.getByRole('heading', { name, exact: true }))

/** 정상 흐름: 네 화면을 돌며 요소를 재고 스크린샷을 찍습니다 */
async function walk(variant, options, { measure }) {
    const { page, context } = await openPage(options)
    const measureOnly = async (...args) => { if (measure) await sample(...args) }
    try {
        // ----- 식물 재고 -----
        await step('식물 재고', async () => {
            await plantsLoaded(page)
            await shot(page, `1-식물 재고--${variant}`)
            await measureOnly('화면 제목', 'heading', '식물 재고', '식물 재고', () => heading(page, '식물 재고'))
            const search = await field(page, '식물 검색')
            await measureOnly('입력란', 'input', '식물 재고', '식물 검색', () => search)
            await measureOnly('입력란 라벨', 'text', '식물 재고', '식물 검색', () => labelOf(search))
            await measureOnly('목록 글자', 'text', '식물 재고', '올리브나무', () => textOf(page, '올리브나무'))
            await measureOnly('메뉴 항목 (고른 것)', 'button', '메뉴', '식물 재고', () => menuItem(page, '식물 재고'))
            await measureOnly('메뉴 항목 (안 고른 것)', 'button', '메뉴', '주문', () => menuItem(page, '주문'))
            const stock = await openPlant(page)
            const close = await button(page, '닫기')
            await shot(page, `2-식물 상세--${variant}`)
            await measureOnly('패널', 'panel', '식물 재고', '식물 상세', () => containerOf(stock, close))
            await measureOnly('패널 제목', 'heading', '식물 재고', '식물 상세', () => textOf(page, '식물 상세', { exact: true }))
            await measureOnly('입력란', 'input', '식물 재고', '재고', () => stock)
            await measureOnly('입력란 라벨', 'text', '식물 재고', '재고', () => labelOf(stock))
            await measureOnly('저장 버튼', 'button', '식물 재고', '저장', () => button(page, '저장'))
            await measureOnly('닫기 버튼', 'button', '식물 재고', '닫기', () => close)
            if (measure) {
                await stock.fill('-3')
                await (await button(page, '저장')).click()
                await sample('입력 오류 문구', 'message', '식물 재고', '재고는 0 이상의 정수여야 합니다', () => textOf(page, /재고는 0 이상의 정수여야 합니다/))
                await stock.fill('31')
                await (await button(page, '저장')).click()
                await sample('완료 안내', 'message', '식물 재고', '저장했습니다', () => textOf(page, '저장했습니다'))
            }
            await page.keyboard.press('Escape')
            await needGone(page, '식물 상세', { exact: true })
        })

        // ----- 주문 -----
        await step('주문', async () => {
            await toOrders(page)
            await shot(page, `3-주문--${variant}`)
            await measureOnly('화면 제목', 'heading', '주문', '주문', () => heading(page, '주문'))
            await measureOnly('목록 글자', 'text', '주문', '이도윤', () => textOf(page, '이도윤'))
            const memo = await openOrder(page)
            const close = await button(page, '닫기')
            await shot(page, `4-주문 상세--${variant}`)
            await measureOnly('패널', 'panel', '주문', '주문 상세', () => containerOf(memo, close))
            await measureOnly('패널 제목', 'heading', '주문', '주문 상세', () => textOf(page, '주문 상세', { exact: true }))
            await measureOnly('입력란', 'input', '주문', '배송 메모', () => memo)
            await measureOnly('입력란 라벨', 'text', '주문', '배송 메모', () => labelOf(memo))
            await measureOnly('저장 버튼', 'button', '주문', '저장', () => button(page, '저장'))
            await measureOnly('닫기 버튼', 'button', '주문', '닫기', () => close)
            if (measure) {
                await memo.fill('가'.repeat(101))
                await (await button(page, '저장')).click()
                await sample('입력 오류 문구', 'message', '주문', '배송 메모는 100자 이하여야 합니다', () => textOf(page, /배송 메모는 100자 이하여야 합니다/))
                await memo.fill('문 앞')
                await (await button(page, '저장')).click()
                await sample('완료 안내', 'message', '주문', '저장했습니다', () => textOf(page, '저장했습니다'))
            }
            await page.keyboard.press('Escape')
            await needGone(page, '주문 상세', { exact: true })
        })

        // ----- 공급처 -----
        await step('공급처', async () => {
            await toSuppliers(page)
            await shot(page, `5-공급처--${variant}`)
            await measureOnly('화면 제목', 'heading', '공급처', '공급처', () => heading(page, '공급처'))
            await measureOnly('목록 글자', 'text', '공급처', '숲속묘목', () => textOf(page, '숲속묘목'))
            const { name, phone } = await openAdd(page)
            const close = await button(page, '닫기')
            await shot(page, `6-공급처 추가--${variant}`)
            await measureOnly('패널', 'panel', '공급처', '공급처 추가', () => containerOf(name, close))
            await measureOnly('입력란', 'input', '공급처', '이름', () => name)
            await measureOnly('입력란', 'input', '공급처', '연락처', () => phone)
            await measureOnly('입력란 라벨', 'text', '공급처', '이름', () => labelOf(name))
            await measureOnly('저장 버튼', 'button', '공급처', '저장', () => button(page, '저장'))
            await measureOnly('닫기 버튼', 'button', '공급처', '닫기', () => close)
            if (measure) {
                await (await button(page, '저장')).click()
                await sample('입력 오류 문구', 'message', '공급처', '이름을 입력해 주세요', () => textOf(page, /이름을 입력해 주세요/))
                await name.fill('바람꽃집')
                await phone.fill('051-555-0177')
                await (await button(page, '저장')).click()
                await sample('완료 안내', 'message', '공급처', '추가했습니다', () => textOf(page, '추가했습니다'))
                await needAddClosed(page)
            } else {
                await page.keyboard.press('Escape')
                await needAddClosed(page)
            }
            await (await rowButton(page, '한빛화훼', /삭제/)).click()
            await need(page, '한빛화훼을(를) 삭제할까요?')
            await shot(page, `7-삭제 확인--${variant}`)
            await measureOnly('확인 창', 'panel', '공급처', '삭제 확인', async () =>
                containerOf(await button(page, '삭제하기'), await textOf(page, '한빛화훼을(를) 삭제할까요?')))
            await (await button(page, '취소')).click()
            await needGone(page, '한빛화훼을(를) 삭제할까요?')
        })

        // ----- 알림 설정 -----
        await step('알림 설정', async () => {
            const form = await toSettings(page)
            await shot(page, `8-알림 설정--${variant}`)
            await measureOnly('화면 제목', 'heading', '알림 설정', '알림 설정', () => heading(page, '알림 설정'))
            await measureOnly('입력란', 'input', '알림 설정', '기준 수량', () => form.threshold)
            await measureOnly('입력란', 'input', '알림 설정', '알림 받을 이메일', () => form.email)
            await measureOnly('입력란 라벨', 'text', '알림 설정', '알림 받을 이메일', () => labelOf(form.email))
            if (measure) {
                await form.email.fill('주소아님')
                await sample('저장 버튼', 'button', '알림 설정', '저장', () => form.save)
                await form.save.click()
                await sample('입력 오류 문구', 'message', '알림 설정', '이메일 형식이 올바르지 않습니다', () => textOf(page, /이메일 형식이 올바르지 않습니다/))
                await form.email.fill('ok@example.com')
                await flip(page, form.order)
                await form.save.click()
                await sample('완료 안내', 'message', '알림 설정', '저장했습니다', () => textOf(page, '저장했습니다'))
            }
        })
    } finally {
        await context.close()
    }
}

/** 불러오기 실패, 불러오는 중, 빈 목록의 모양 */
async function loadStates() {
    const screens = [
        { name: '식물 재고', failure: /식물을 불러오지 못했습니다/, empty: null },
        { name: '주문', failure: /주문을 불러오지 못했습니다/, empty: /조건에 맞는 주문이 없습니다/ },
        { name: '공급처', failure: /공급처를 불러오지 못했습니다/, empty: /등록된 공급처가 없습니다/ },
        { name: '알림 설정', failure: /설정을 불러오지 못했습니다/, empty: null },
    ]
    for (const screen of screens) {
        const isFirst = screen.name === '식물 재고'
        // 실패
        await step(`${screen.name} 실패`, async () => {
            const { page, context } = await openPage({ preload: isFirst ? Array(10).fill(['failOnce', 500]) : [] })
            try {
                if (!isFirst) {
                    await plantsLoaded(page)
                    for (let i = 0; i < 10; i += 1) await api(page, 'failOnce', 500)
                    await (await menuItem(page, screen.name)).click()
                }
                await need(page, screen.failure, { timeout: 20000 })
                await sample('불러오기 실패 문구', 'message', screen.name, String(screen.failure), () => textOf(page, screen.failure))
                await sample('다시 시도 버튼', 'button', screen.name, '다시 시도', () => button(page, '다시 시도'))
                if (screen.name === '주문') await shot(page, '9-주문 불러오기 실패--desktop-light')
            } finally {
                await context.close()
            }
        })
        // 불러오는 중
        await step(`${screen.name} 불러오는 중`, async () => {
            const { page, context } = await openPage({ preload: isFirst ? Array(6).fill(['hangOnce']) : [] })
            try {
                if (!isFirst) {
                    await plantsLoaded(page)
                    for (let i = 0; i < 6; i += 1) await api(page, 'hangOnce')
                    await (await menuItem(page, screen.name)).click()
                }
                await sample('불러오는 중 문구', 'message', screen.name, '불러오는 중', () => textOf(page, /불러오는 중/))
            } finally {
                await context.close()
            }
        })
        // 빈 목록
        if (screen.empty) {
            await step(`${screen.name} 빈 목록`, async () => {
                const { page, context } = await openPage({})
                try {
                    await plantsLoaded(page)
                    for (let i = 0; i < 3; i += 1) await api(page, 'failOnce', 200, []) // 같은 조회를 두 번 보내는 구현이 있음
                    await (await menuItem(page, screen.name)).click()
                    await sample('빈 목록 문구', 'message', screen.name, String(screen.empty), () => textOf(page, screen.empty, { timeout: 8000 }))
                } finally {
                    await context.close()
                }
            })
        }
    }
    await step('식물 재고 빈 목록', async () => {
        const { page, context } = await openPage({})
        try {
            await plantsLoaded(page)
            await (await field(page, '식물 검색')).fill('없는식물')
            await sample('빈 목록 문구', 'message', '식물 재고', '조건에 맞는 식물이 없습니다', () => textOf(page, /조건에 맞는 식물이 없습니다/, { timeout: 8000 }))
        } finally {
            await context.close()
        }
    })
    await step('주문 필터', async () => {
        const { page, context } = await openPage({})
        try {
            await plantsLoaded(page)
            await goTo(page, '주문', /김하늘/)
            const picked = await choose(page, '준비 중')
            await needGone(page, '이도윤')
            await sample('필터 (고른 것)', 'button', '주문', '준비 중', () => picked)
        } finally {
            await context.close()
        }
    })
}

// ---------- 실행 ----------
fs.mkdirSync(shotDir, { recursive: true })
try {
    await setup(appDir, resultDir, Number(portText))
    await walk('desktop-light', {}, { measure: true })
    await loadStates()
    await walk('desktop-dark', { colorScheme: 'dark' }, { measure: false })
    await walk('mobile-light', { width: 375, height: 812 }, { measure: false })
} finally {
    await teardown()
}

// 역할마다 서로 다른 모양이 몇 가지인지 셉니다. 같은 화면 안의 차이는 빼고, 화면 사이의 차이만 봅니다.
const roles = {}
for (const item of samples) {
    const entry = (roles[item.role] ??= { samples: [] })
    entry.samples.push(item)
}
const summary = Object.entries(roles).map(([role, { samples: items }]) => {
    const signatures = new Map()
    for (const item of items) {
        const key = JSON.stringify(item.style)
        if (!signatures.has(key)) signatures.set(key, [])
        signatures.get(key).push(`${item.screen}: ${item.name}`)
    }
    const differing = Object.keys(items[0].style).filter(
        (prop) => new Set(items.map((item) => String(item.style[prop]))).size > 1,
    )
    return {
        role,
        count: items.length,
        screens: new Set(items.map((item) => item.screen)).size,
        distinct: signatures.size,
        differing,
        variants: [...signatures.entries()].map(([key, where]) => ({ where, style: JSON.parse(key) })),
    }
})
fs.writeFileSync(path.join(resultDir, 'probe.json'), JSON.stringify({ summary, errors, samples }, null, 2))

for (const row of summary) {
    console.log(`${row.distinct === 1 ? 'O' : 'X'} ${row.role}: ${row.count}곳 중 모양 ${row.distinct}가지${row.differing.length ? ` (다른 속성: ${row.differing.join(', ')})` : ''}`)
}
const comparable = summary.filter((row) => row.screens > 1)
console.log(`\n여러 화면에 걸친 역할 ${comparable.length}개 중 모양이 하나로 같은 것 ${comparable.filter((row) => row.distinct === 1).length}개`)
if (errors.length > 0) console.log(`측정하지 못한 것 ${errors.length}개:\n  ${errors.join('\n  ')}`)
