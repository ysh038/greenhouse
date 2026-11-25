// 화면을 오가고 패널을 여는 흐름. 채점, 공통 변경 검사, 일관성 측정이 같이 씁니다.
import { button, field, firstVisible, goTo, need, seen, sleep, textOf } from './lib.mjs'

// 7회차(동시 작업)에는 식물 재고 화면이 없고 그 자리에 안내 문장만 있습니다.
// COMPARE_HOME_TEXT에 그 문장을 넣으면 첫 화면을 그 문장으로 알아봅니다.
const HOME_TEXT = process.env.COMPARE_HOME_TEXT
export const HOME_MARK = HOME_TEXT ? new RegExp(HOME_TEXT) : null

async function plantsLoaded(page) {
    await need(page, HOME_MARK ?? /유칼립투스/, { timeout: 8000 })
}

/** 안내가 2초쯤 보였다가 사라지는가 */
async function needNotice(page, value) {
    await need(page, value)
    await sleep(1200)
    if (!(await seen(page, value, { timeout: 0 }))) throw new Error(`"${value}"이(가) 1.2초 만에 사라짐`)
    if (!(await seen(page, value, { timeout: 0 })) || !(await waitGone(page, value, 2600))) {
        throw new Error(`"${value}"이(가) 3.8초 뒤에도 남음`)
    }
}
async function waitGone(page, value, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        if (!(await seen(page, value, { timeout: 0 }))) return true
        await sleep(100)
    }
    return false
}

const isFocused = (locator) => locator.evaluate((element) => element === document.activeElement)
async function needFocus(locator, what) {
    for (let i = 0; i < 20; i += 1) {
        if (await isFocused(locator)) return
        await sleep(100)
    }
    throw new Error(`${what}에 포커스가 가지 않음`)
}

const isLive = (locator) =>
    locator.evaluate((element) => {
        for (let node = element; node; node = node.parentElement) {
            const role = node.getAttribute('role')
            if (role === 'alert' || role === 'status' || node.hasAttribute('aria-live')) return true
            if (node.tagName === 'OUTPUT') return true
        }
        return false
    })


// ----- 화면 1: 식물 재고 -----
async function openPlant(page, name = '스킨답서스') {
    await (await textOf(page, name)).click()
    await need(page, '식물 상세', { exact: true })
    const stock = await field(page, '재고')
    for (let i = 0; i < 40; i += 1) {
        if ((await stock.inputValue()) !== '') break
        await sleep(100)
    }
    return stock
}

// ----- 화면 2: 주문 -----
const toOrders = (page) => goTo(page, '주문', /김하늘/)

async function openOrder(page, customer = '김하늘', expectedMemo = '문 앞에 놓아 주세요.') {
    await (await textOf(page, customer)).click()
    await need(page, '주문 상세', { exact: true })
    const memo = await field(page, '배송 메모')
    for (let i = 0; i < 40 && expectedMemo !== ''; i += 1) {
        if ((await memo.inputValue()) !== '') break
        await sleep(100)
    }
    return memo
}


// ----- 화면 3: 공급처 -----
const toSuppliers = (page) => goTo(page, '공급처', /초록농원/)

async function openAdd(page) {
    await (await button(page, '공급처 추가')).click()
    const name = await field(page, '이름')
    return { name, phone: await field(page, '연락처') }
}
/** 패널이 열려 있는가: 패널에만 있는 "이름" 입력란으로 판단 */
const isAddOpen = async (page) => (await firstVisible(page.getByLabel('이름', { exact: true }))) !== null
async function needAddClosed(page) {
    for (let i = 0; i < 40; i += 1) {
        if (!(await isAddOpen(page))) return
        await sleep(100)
    }
    throw new Error('공급처 추가 패널이 닫히지 않음')
}


// ----- 화면 4: 알림 설정 -----
async function toggle(page, name) {
    for (const role of ['checkbox', 'switch']) {
        const found = page.getByRole(role, { name, exact: true })
        if ((await found.count()) > 0) return found.first()
    }
    throw new Error(`체크박스 "${name}" 없음`)
}
const isOn = (locator) =>
    locator.evaluate((element) => element.checked === true || element.getAttribute('aria-checked') === 'true')
async function flip(page, locator) {
    await locator.focus()
    await page.keyboard.press('Space')
}

async function toSettings(page) {
    await goTo(page, '알림 설정', '알림 받을 이메일')
    const email = await field(page, '알림 받을 이메일')
    for (let i = 0; i < 40; i += 1) {
        if ((await email.inputValue()) !== '') break
        await sleep(100)
    }
    return {
        lowStock: await toggle(page, '재고 부족 알림'),
        threshold: await field(page, '기준 수량'),
        order: await toggle(page, '새 주문 알림'),
        email,
        save: await button(page, '저장'),
        revert: await button(page, '되돌리기'),
    }
}


export {
    flip, isAddOpen, isFocused, isLive, isOn, needAddClosed, needFocus, needNotice, openAdd, openOrder,
    openPlant, plantsLoaded, toOrders, toSettings, toSuppliers, toggle, waitGone,
}
