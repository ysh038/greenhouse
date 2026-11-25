// 화면을 서로 잇는 과제(실전 시험 8회) 채점. 구현을 모르는 채로 브라우저에서 화면만 보고 검사합니다.
//   COMPARE_CONTROL=route COMPARE_HOME_TEXT='식물 재고 화면은 아직 없습니다' \
//     node tools/compare/linked/accept.mjs <앱 폴더> <결과 폴더> <포트> [검사 id 앞글자...]
import {
    api,
    button,
    define,
    field,
    menuItem,
    need,
    needGone,
    overflowPx,
    rowButton,
    runChecks,
    seen,
    setup,
    sleep,
    teardown,
    textOf,
    withPage,
} from '../accumulate/lib.mjs'
import { openAdd, openOrder, plantsLoaded, toOrders, toSettings, toSuppliers, flip, isOn } from '../accumulate/flows.mjs'

const [appDir, resultDir, portText, ...only] = process.argv.slice(2)

const CUSTOMERS = ['김하늘', '이도윤', '박서연', '최민준', '정유나']
const SUPPLIERS = ['초록농원', '한빛화훼', '숲속묘목', '새싹원예']

/** 글자가 든 줄의 글자: 다른 줄의 이름이 섞이지 않는 가장 큰 조상 */
async function rowText(page, value) {
    const cell = await textOf(page, value)
    const others = (CUSTOMERS.includes(value) ? CUSTOMERS : SUPPLIERS).filter((name) => name !== value)
    return cell.evaluate((element, otherNames) => {
        let node = element
        while (node.parentElement && !otherNames.some((name) => (node.parentElement.innerText ?? '').includes(name))) {
            node = node.parentElement
        }
        return node.innerText
    }, others)
}

async function waitRowText(page, value, pattern, message) {
    const deadline = Date.now() + 6000
    for (;;) {
        const text = await rowText(page, value)
        if (pattern.test(text)) return text
        if (Date.now() > deadline) throw new Error(`${message} (줄: ${text.replace(/\s+/g, ' ')})`)
        await sleep(150)
    }
}

async function openSupplierOrders(page, supplier) {
    await (await rowButton(page, supplier, '주문 보기')).click()
    await need(page, `${supplier}의 주문`, { exact: true })
}

/** 창 요소를 찾는 함수(브라우저 안에서 실행). 창 역할이 있으면 그것, 없으면 제목에서 올라가며 "닫기" 버튼과 제목 밖의 글자를 함께 품은 첫 조상. */
const FIND_DIALOG = `(element) => {
    const byRole = element.closest('[role="dialog"], [role="alertdialog"], dialog')
    if (byRole) return byRole
    let node = element
    while (node.parentElement && ![...node.querySelectorAll('button')].some((b) => (b.textContent ?? '').trim() === '닫기')) {
        node = node.parentElement
    }
    return node
}`

/** 창 안의 글자 */
async function dialogText(page, title) {
    const heading = await textOf(page, title, { exact: true })
    return heading.evaluate(new Function('element', `return (${FIND_DIALOG})(element).innerText`))
}

define('적힌 요구', 'L1', '주문 목록에 주문마다 공급처 이름이 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await waitRowText(page, '김하늘', /초록농원/, '김하늘 주문 줄에 "초록농원"이 없음')
        await waitRowText(page, '박서연', /숲속묘목/, '박서연 주문 줄에 "숲속묘목"이 없음')
    }, { expectClean: true }),
)

define('적힌 요구', 'L2', '주문 상세에 공급처 이름과 연락처가 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await openOrder(page, '이도윤', '')
        await need(page, '주문 상세', { exact: true })
        await need(page, '02-555-0199', { timeout: 6000 })
        await need(page, '공급처', { exact: true })
    }),
)

define('적힌 요구', 'L3', '주문 화면에 새 주문 알림이 꺼져 있다는 문장이 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await need(page, '새 주문 알림이 꺼져 있습니다', { timeout: 6000 })
    }),
)

define('적힌 요구', 'L4', '공급처마다 주문 수가 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        await waitRowText(page, '초록농원', /주문\s*2\s*건/, '초록농원 줄에 "주문 2건"이 없음')
        await waitRowText(page, '숲속묘목', /주문\s*1\s*건/, '숲속묘목 줄에 "주문 1건"이 없음')
    }, { expectClean: true }),
)

define('적힌 요구', 'L5', '"주문 보기"를 누르면 그 공급처의 주문만 든 창이 열린다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        await openSupplierOrders(page, '초록농원')
        const text = await dialogText(page, '초록농원의 주문')
        for (const value of ['김하늘', '최민준', '몬스테라', '유칼립투스', '준비 중', '발송됨']) {
            if (!text.includes(value)) throw new Error(`창에 "${value}"이(가) 없음`)
        }
        if (!/2\s*개/.test(text) || !/3\s*개/.test(text)) throw new Error('창에 수량이 없음')
        if (text.includes('이도윤') || text.includes('박서연')) throw new Error('다른 공급처의 주문이 섞임')
    }),
)

define('적힌 요구', 'L6', '창이 Escape, 바깥 클릭, "닫기"로 닫힌다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const title = '한빛화훼의 주문'
        await openSupplierOrders(page, '한빛화훼')
        await page.keyboard.press('Escape')
        await needGone(page, title, { exact: true })
        await openSupplierOrders(page, '한빛화훼')
        await page.mouse.click(8, 790)
        if (await seen(page, title, { timeout: 0, exact: true })) {
            await sleep(700)
            // 왼쪽 아래가 창에 가려 있을 수 있어 다른 구석도 눌러 봅니다.
            if (await seen(page, title, { timeout: 0, exact: true })) await page.mouse.click(1272, 8)
        }
        await needGone(page, title, { exact: true })
        await openSupplierOrders(page, '한빛화훼')
        await (await button(page, '닫기')).click()
        await needGone(page, title, { exact: true })
    }),
)

define('적힌 요구', 'L7', '추가한 공급처는 "주문 0건"이고 창에 "주문이 없습니다"가 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name, phone } = await openAdd(page)
        await name.fill('새싹원예')
        await phone.fill('010-555-0000')
        await (await button(page, '저장')).click()
        await waitRowText(page, '새싹원예', /주문\s*0\s*건/, '새 공급처 줄에 "주문 0건"이 없음')
        await openSupplierOrders(page, '새싹원예')
        await need(page, '주문이 없습니다')
    }),
)

define('적힌 요구', 'L8', '발송 처리한 주문이 공급처의 "주문 보기"에서도 "발송됨"이다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        // 공급처 화면을 먼저 열어 그 화면이 주문 데이터를 받아 둔 상태로 만듭니다.
        await toSuppliers(page)
        await waitRowText(page, '숲속묘목', /주문\s*1\s*건/, '숲속묘목 줄에 "주문 1건"이 없음')
        await toOrders(page)
        await openOrder(page, '박서연', '')
        await (await button(page, '발송 처리')).click()
        await need(page, '발송 처리했습니다')
        await page.keyboard.press('Escape')
        await toSuppliers(page)
        await openSupplierOrders(page, '숲속묘목')
        const deadline = Date.now() + 6000
        for (;;) {
            const text = await dialogText(page, '숲속묘목의 주문')
            if (text.includes('발송됨') && !text.includes('준비 중')) return
            if (Date.now() > deadline) throw new Error(`창의 상태가 "발송됨"으로 바뀌지 않음 (${text.replace(/\s+/g, ' ')})`)
            await sleep(150)
        }
    }),
)

define('적힌 요구', 'L9', '알림 설정에서 새 주문 알림을 켜고 저장하면 주문 화면의 문장이 바뀐다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await need(page, '새 주문 알림이 꺼져 있습니다', { timeout: 6000 })
        const settings = await toSettings(page)
        if (!(await isOn(settings.order))) await flip(page, settings.order)
        await settings.save.click()
        await need(page, '저장했습니다')
        await toOrders(page)
        await need(page, '새 주문 알림이 켜져 있습니다', { timeout: 6000 })
        if (await seen(page, '새 주문 알림이 꺼져 있습니다', { timeout: 0 })) throw new Error('예전 문장이 남음')
    }),
)

define('적힌 요구', 'L10', '너비 375px에서 주문, 공급처, 주문 보기 창이 가로로 넘치지 않는다', () =>
    withPage({ width: 375, height: 800 }, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await need(page, '초록농원', { timeout: 6000 })
        let overflow = await overflowPx(page)
        if (overflow > 1) throw new Error(`주문 화면이 ${overflow}px 넘침`)
        await toSuppliers(page)
        await need(page, /주문\s*2\s*건/, { timeout: 6000 })
        overflow = await overflowPx(page)
        if (overflow > 1) throw new Error(`공급처 화면이 ${overflow}px 넘침`)
        await openSupplierOrders(page, '초록농원')
        overflow = await overflowPx(page)
        if (overflow > 1) throw new Error(`주문 보기 창이 ${overflow}px 넘침`)
    }),
)

// 기존 채점의 O6은 "다음 요청 몇 개를 빈 목록으로" 바꾸는데, 이제 주문 화면이 공급처와 설정도 같이 받으므로
// 그 요청들까지 빈 목록이 됩니다. 주문 목록 요청만 빈 목록으로 바꿔 다시 봅니다.
define('기존 동작', 'LO6', '주문 결과가 없으면 안내를 보여 준다 (주문 목록 요청만 빈 목록)', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await page.route(
            (url) => url.pathname === '/api/orders',
            (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
        )
        await (await menuItem(page, '주문')).click()
        await need(page, /조건에 맞는 주문이 없습니다/, { timeout: 8000 })
    }),
)

// 기존 채점의 O5는 "다시 시도" 버튼 하나를 누르는데, 이제 주문 화면에 알림 설정 문장의 "다시 시도"도 있을 수 있습니다.
// 보이는 "다시 시도"를 모두 눌러 주문 목록이 돌아오는지 봅니다.
define('기존 동작', 'LO5', '주문을 불러오지 못하면 알리고 "다시 시도"로 복구한다 (보이는 "다시 시도"를 모두 누름)', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        for (let i = 0; i < 12; i += 1) await api(page, 'failOnce', 500)
        await (await menuItem(page, '주문')).click()
        await need(page, /주문을 불러오지 못했습니다/, { timeout: 20000 })
        await api(page, 'reset')
        const deadline = Date.now() + 12000
        for (;;) {
            if (await seen(page, '김하늘', { timeout: 0 })) return
            if (Date.now() > deadline) throw new Error('"다시 시도"를 눌러도 주문 목록이 돌아오지 않음')
            const retries = page.getByRole('button', { name: '다시 시도' })
            for (let i = 0; i < (await retries.count()); i += 1) await retries.nth(i).click().catch(() => {})
            await sleep(900)
        }
    }),
)

define('견고성', 'LR1', '공급처를 불러오지 못해도 주문 목록은 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        // 주문 화면이 보내는 요청 가운데 공급처 조회만 계속 실패시킵니다.
        await page.route(
            (url) => url.pathname === '/api/suppliers',
            (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
        )
        await (await menuItem(page, '주문')).click()
        await need(page, '김하늘', { timeout: 15000 })
    }),
)

define('견고성', 'LR2', '주문 보기 창이 열리면 포커스가 창 안으로 간다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        await openSupplierOrders(page, '초록농원')
        await sleep(300)
        const heading = await textOf(page, '초록농원의 주문', { exact: true })
        const isInside = await heading.evaluate(
            new Function('element', `const box = (${FIND_DIALOG})(element); return box.contains(document.activeElement) && document.activeElement !== document.body`),
        )
        if (!isInside) throw new Error('포커스가 창 밖에 있음')
    }),
)

try {
    await setup(appDir, resultDir, Number(portText))
    await runChecks('linked.json', { only: only.length > 0 ? only : null })
} finally {
    await teardown()
}
void field
