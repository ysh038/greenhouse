// 화면 2~4(주문, 공급처, 알림 설정) 채점.
//   node tools/compare/accumulate/screens.mjs <앱 폴더> <결과 폴더> <포트> [검사 id 앞글자...]
// 화면마다 "적힌 요구"와 "적지 않은 견고성"을 나눠 셉니다.
import {
    api,
    button,
    choose,
    clickAt,
    contrastOf,
    define,
    doubleClickAt,
    field,
    firstVisible,
    goTo,
    hasButton,
    isDisabled,
    isMarkedSelected,
    menuItem,
    need,
    needContrast,
    needGone,
    overflowPx,
    requests,
    rowButton,
    runChecks,
    seen,
    setup,
    sleep,
    tabUntil,
    teardown,
    textOf,
    waitEnabled,
    waitForFailureReport,
    withPage,
} from './lib.mjs'
import {
    HOME_MARK, flip, isAddOpen, isLive, isOn, needAddClosed, needFocus, needNotice, openAdd, openOrder,
    plantsLoaded, toOrders, toSettings, toSuppliers, waitGone,
} from './flows.mjs'

const [appDir, resultDir, portText, ...only] = process.argv.slice(2)

// 식물 재고 화면에만 있는 글자 (식물 이름은 주문 목록에도 나옵니다)
const PLANT_ROW = HOME_MARK ?? /재고\s*30\s*개/

/** 패널이 Escape, 바깥 클릭, "닫기"로 닫히고 안쪽 클릭으로는 안 닫히는가 */
async function needClosable(page, title, open) {
    const isOpen = () => seen(page, title, { timeout: 0, exact: true })
    await open()
    await clickAt(page, await textOf(page, title, { exact: true }))
    await sleep(300)
    if (!(await isOpen())) throw new Error('패널 안쪽을 눌렀는데 닫힘')
    await page.keyboard.press('Escape')
    await needGone(page, title, { exact: true })
    await open()
    await page.mouse.click(8, 790)
    if (!(await waitGone(page, title, 2000))) {
        // 왼쪽 아래가 패널에 가려 있을 수 있어 다른 구석도 눌러 봅니다.
        await page.mouse.click(1272, 8)
        if (!(await waitGone(page, title, 2000))) throw new Error('바깥을 눌러도 안 닫힘')
    }
    await open()
    await (await button(page, '닫기')).click()
    await needGone(page, title, { exact: true })
}

async function loadFailure(page, menuName, message, readyText) {
    await plantsLoaded(page)
    for (let i = 0; i < 10; i += 1) await api(page, 'failOnce', 500)
    await (await menuItem(page, menuName)).click()
    await need(page, message, { timeout: 20000 })
    await api(page, 'reset')
    await (await button(page, '다시 시도')).click()
    await need(page, readyText, { timeout: 8000 })
}

async function loadingText(page, menuName) {
    await plantsLoaded(page)
    for (let i = 0; i < 6; i += 1) await api(page, 'hangOnce')
    await (await menuItem(page, menuName)).click()
    await need(page, /불러오는 중/, { timeout: 3000 })
}

// ======================================================================
// 화면 2: 주문
// ======================================================================
define('주문-적힌 요구', 'O1', '메뉴로 주문 화면에 가면 고객, 식물, 수량, 상태가 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        for (const value of ['김하늘', '이도윤', '올리브나무', /2\s*개/, '준비 중', '발송됨']) await need(page, value)
        if (!(await firstVisible(page.getByRole('heading', { name: '주문', exact: true })))) {
            await need(page, '주문', { exact: true })
        }
    }, { expectClean: true }),
)

define('주문-적힌 요구', 'O2', '처음에는 식물 재고만 보이고, 고른 화면만 보이며, 고른 메뉴 항목이 구분된다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        if (await seen(page, '김하늘', { timeout: 0 })) throw new Error('처음부터 주문 화면이 보임')
        await toOrders(page)
        if (await seen(page, PLANT_ROW, { timeout: 0 })) throw new Error('주문을 골랐는데 식물 목록이 남음')
        const signature = (locator) =>
            locator.evaluate((element) => {
                const style = getComputedStyle(element)
                return [style.color, style.backgroundColor, style.borderBottomColor, style.fontWeight,
                    style.textDecorationLine, style.boxShadow].join('|')
            })
        const selected = await menuItem(page, '주문')
        const other = await menuItem(page, '식물 재고')
        if ((await signature(selected)) === (await signature(other)) && !(await isMarkedSelected(selected))) {
            throw new Error('고른 메뉴 항목이 다른 항목과 똑같이 보임')
        }
        await goTo(page, '식물 재고', PLANT_ROW)
        if (await seen(page, '김하늘', { timeout: 0 })) throw new Error('식물 재고로 돌아왔는데 주문 목록이 남음')
    }),
)

define('주문-적힌 요구', 'O3', '상태 필터로 준비 중, 발송됨, 전체를 고른다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await choose(page, '준비 중')
        await needGone(page, '이도윤')
        await need(page, '김하늘')
        await choose(page, '발송됨')
        await needGone(page, '김하늘')
        await need(page, '이도윤')
        await choose(page, '전체')
        await need(page, '김하늘')
        await need(page, '이도윤')
        const urls = (await requests(page)).map((r) => r.url)
        if (!urls.some((url) => url.includes('status=pending')) || !urls.some((url) => url.includes('status=shipped'))) {
            throw new Error(`서버에 상태를 넘기지 않음: ${urls.filter((url) => url.includes('orders')).join(', ')}`)
        }
    }, { expectClean: true }),
)

define('주문-적힌 요구', 'O4', '불러오는 동안 "불러오는 중"', () => withPage({}, (page) => loadingText(page, '주문')))

define('주문-적힌 요구', 'O5', '실패하면 알리고 "다시 시도"로 복구한다', () =>
    withPage({}, (page) => loadFailure(page, '주문', /주문을 불러오지 못했습니다/, /김하늘/)),
)

define('주문-적힌 요구', 'O6', '결과가 없으면 안내를 보여 준다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        for (let i = 0; i < 3; i += 1) await api(page, 'failOnce', 200, []) // 같은 조회를 두 번 보내는 구현이 있음
        await (await menuItem(page, '주문')).click()
        await need(page, /조건에 맞는 주문이 없습니다/, { timeout: 8000 })
    }),
)

define('주문-적힌 요구', 'O7', '주문을 누르면 상세 패널이 열리고 배송 메모에 포커스가 간다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        if ((await memo.inputValue()) !== '문 앞에 놓아 주세요.') throw new Error(`메모가 "${await memo.inputValue()}"`)
        await needFocus(memo, '배송 메모')
        if (!(await hasButton(page, '발송 처리'))) throw new Error('준비 중인 주문인데 "발송 처리" 버튼 없음')
        await (await button(page, '닫기')).click()
        await needGone(page, '주문 상세', { exact: true })
        await openOrder(page, '이도윤', '')
        if (await hasButton(page, '발송 처리')) throw new Error('발송된 주문인데 "발송 처리" 버튼이 있음')
    }, { expectClean: true }),
)

define('주문-적힌 요구', 'O8', '저장하면 "저장했습니다"가 2초 보이고 메모가 남는다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        await memo.fill('경비실에 맡겨 주세요.')
        await (await button(page, '저장')).click()
        await needNotice(page, '저장했습니다')
        await (await button(page, '닫기')).click()
        await needGone(page, '주문 상세', { exact: true })
        const again = await openOrder(page)
        if ((await again.inputValue()) !== '경비실에 맡겨 주세요.') throw new Error(`다시 열었더니 메모가 "${await again.inputValue()}"`)
    }, { expectClean: true }),
)

define('주문-적힌 요구', 'O9', '100자를 넘기면 "배송 메모는 100자 이하여야 합니다"', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        await memo.fill('가'.repeat(101))
        await (await button(page, '저장')).click()
        await need(page, /배송 메모는 100자 이하여야 합니다/)
    }),
)

define('주문-적힌 요구', 'O10', '저장하는 동안 "저장" 버튼이 비활성이다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        await memo.fill('천천히')
        await api(page, 'setDelayMs', 1500)
        const save = await button(page, '저장')
        await save.click()
        await sleep(300)
        if (!(await isDisabled(save))) throw new Error('저장 중인데 버튼이 활성')
    }),
)

define('주문-적힌 요구', 'O11', '발송 처리하면 안내가 뜨고 패널과 목록이 "발송됨"으로 바뀐다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await choose(page, '준비 중')
        await needGone(page, '이도윤')
        await openOrder(page, '박서연', '')
        await (await button(page, '발송 처리')).click()
        await need(page, '발송 처리했습니다')
        for (let i = 0; i < 30 && (await hasButton(page, '발송 처리')); i += 1) await sleep(100)
        if (await hasButton(page, '발송 처리')) throw new Error('처리 뒤에도 "발송 처리" 버튼이 남음')
        await need(page, '발송됨')
        if (!(await waitGone(page, '발송 처리했습니다', 4000))) throw new Error('"발송 처리했습니다"가 4초 뒤에도 남음')
        if (await seen(page, '주문 상세', { timeout: 0, exact: true })) await (await button(page, '닫기')).click()
        await choose(page, '발송됨')
        await need(page, '박서연')
    }, { expectClean: true }),
)

define('주문-적힌 요구', 'O12', 'Escape, 바깥 클릭, "닫기"로 닫히고 안쪽 클릭으로는 안 닫힌다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await needClosable(page, '주문 상세', () => openOrder(page))
    }),
)

define('주문-적힌 요구', 'O13', '너비 375px에서 가로로 넘치지 않는다', () =>
    withPage({ width: 375, height: 812 }, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        if ((await overflowPx(page)) > 1) throw new Error(`목록에서 ${await overflowPx(page)}px 넘침`)
        await openOrder(page)
        if ((await overflowPx(page)) > 1) throw new Error(`패널을 열면 ${await overflowPx(page)}px 넘침`)
        const save = await button(page, '저장')
        const box = await save.boundingBox()
        if (!box || box.x < 0 || box.x + box.width > 376) throw new Error('"저장" 버튼이 화면 밖으로 나감')
    }),
)

define('주문-적힌 요구', 'O14', '어두운 화면에서 글자를 읽을 수 있다 (명암비 4.5 이상)', () =>
    withPage({ colorScheme: 'dark' }, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        const title = await textOf(page, '주문 상세', { exact: true })
        if ((await contrastOf(title)).backgroundLuminance > 0.2) throw new Error('어두운 화면인데 패널 배경이 밝음')
        await needContrast({
            '목록의 고객 이름': await textOf(page, '이도윤'),
            '패널 제목': title,
            '배송 메모 입력란': memo,
            '메뉴의 주문': await menuItem(page, '주문'),
            '메뉴의 식물 재고': await menuItem(page, '식물 재고'),
        })
    }),
)

define('주문-견고성', 'OR1', '필터를 빠르게 바꿔도 나중에 고른 필터의 결과가 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await api(page, 'setDelayMs', 1500)
        await choose(page, '준비 중')
        await sleep(100)
        await api(page, 'setDelayMs', 100)
        await choose(page, '발송됨')
        await sleep(2200)
        if (!(await seen(page, '이도윤'))) throw new Error('발송됨을 골랐는데 발송된 주문이 없음')
        if (await seen(page, '김하늘', { timeout: 0 })) throw new Error('늦게 온 "준비 중" 결과가 화면을 덮음')
    }),
)

define('주문-견고성', 'OR2', '발송 처리가 실패하면 알리고 다시 누를 수 있다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await openOrder(page)
        const ship = await button(page, '발송 처리')
        await api(page, 'failOnce', 500) // 변경 요청 한 번만 실패 (뒤따르는 조회는 정상)
        await ship.click()
        if (!(await waitForFailureReport(page, 12000))) throw new Error('실패를 알리지 않음 (12초 대기)')
        await api(page, 'reset')
        if (!(await hasButton(page, '발송 처리'))) throw new Error('실패했는데 "발송 처리" 버튼이 사라짐')
        if (!(await waitEnabled(await button(page, '발송 처리')))) throw new Error('실패 뒤 버튼이 계속 비활성')
    }),
)

define('주문-견고성', 'OR3', '"저장"을 연달아 눌러도 요청은 한 번만 간다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        await memo.fill('두 번 누름')
        await api(page, 'reset')
        await api(page, 'setDelayMs', 800)
        await doubleClickAt(page, await button(page, '저장'))
        await sleep(1600)
        const patches = (await requests(page)).filter((r) => r.method === 'PATCH')
        if (patches.length !== 1) throw new Error(`PATCH 요청이 ${patches.length}번`)
    }),
)

define('주문-견고성', 'OR4', '키보드만으로 주문을 골라 패널을 열 수 있다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        await (await menuItem(page, '주문')).focus()
        if (!(await tabUntil(page, { includes: '박서연', excludes: ['김하늘', '정유나'] }))) {
            throw new Error('Tab으로 주문 항목에 닿지 못함')
        }
        await page.keyboard.press('Enter')
        await need(page, '주문 상세', { exact: true, timeout: 3000 })
    }),
)

define('주문-견고성', 'OR5', '고른 필터와 메뉴 항목을 접근성 정보로 알린다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const filter = await choose(page, '준비 중')
        await needGone(page, '이도윤')
        if (!(await isMarkedSelected(filter))) throw new Error('고른 필터에 aria-pressed, aria-checked 같은 표시가 없음')
        if (!(await isMarkedSelected(await menuItem(page, '주문')))) throw new Error('고른 메뉴 항목에 aria-current 같은 표시가 없음')
    }),
)

define('주문-견고성', 'OR6', '오류와 완료 안내를 스크린 리더에 알린다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        await memo.fill('가'.repeat(101))
        await (await button(page, '저장')).click()
        if (!(await isLive(await textOf(page, /배송 메모는 100자 이하여야 합니다/)))) throw new Error('400 안내에 role=alert나 aria-live가 없음')
        await memo.fill('짧게')
        await (await button(page, '저장')).click()
        if (!(await isLive(await textOf(page, '저장했습니다')))) throw new Error('"저장했습니다"에 role=status나 aria-live가 없음')
    }),
)

define('주문-견고성', 'OR7', '다른 주문을 열면 앞 주문의 입력과 안내가 남지 않는다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toOrders(page)
        const memo = await openOrder(page)
        await memo.fill('가'.repeat(101))
        await (await button(page, '저장')).click()
        await need(page, /배송 메모는 100자 이하여야 합니다/)
        await (await button(page, '닫기')).click()
        await needGone(page, '주문 상세', { exact: true })
        const other = await openOrder(page, '최민준', '부재 시 경비실에 맡겨 주세요.')
        if ((await other.inputValue()) !== '부재 시 경비실에 맡겨 주세요.') throw new Error(`다른 주문의 메모가 "${(await other.inputValue()).slice(0, 30)}"`)
        if (await seen(page, /배송 메모는 100자 이하여야 합니다/, { timeout: 0 })) throw new Error('앞 주문의 오류 안내가 남음')
    }),
)

// ======================================================================
// 화면 3: 공급처
// ======================================================================
define('공급처-적힌 요구', 'P1', '메뉴로 공급처 화면에 가면 이름, 연락처, "삭제" 버튼이 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        for (const value of ['초록농원', '031-555-0101', '한빛화훼', '숲속묘목']) await need(page, value)
        await rowButton(page, '한빛화훼', /삭제/)
        if (await seen(page, PLANT_ROW, { timeout: 0 })) throw new Error('공급처를 골랐는데 식물 목록이 남음')
        await goTo(page, '주문', /김하늘/)
    }, { expectClean: true }),
)

define('공급처-적힌 요구', 'P2', '불러오는 동안 "불러오는 중"', () => withPage({}, (page) => loadingText(page, '공급처')))

define('공급처-적힌 요구', 'P3', '실패하면 알리고 "다시 시도"로 복구한다', () =>
    withPage({}, (page) => loadFailure(page, '공급처', /공급처를 불러오지 못했습니다/, /초록농원/)),
)

define('공급처-적힌 요구', 'P4', '하나도 없으면 안내를 보여 준다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        for (let i = 0; i < 3; i += 1) await api(page, 'failOnce', 200, []) // 같은 조회를 두 번 보내는 구현이 있음
        await (await menuItem(page, '공급처')).click()
        await need(page, /등록된 공급처가 없습니다/, { timeout: 8000 })
    }),
)

define('공급처-적힌 요구', 'P5', '"공급처 추가"를 누르면 패널이 열리고 이름에 포커스가 간다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name } = await openAdd(page)
        await needFocus(name, '이름 입력란')
        if (!(await firstVisible(page.getByRole('heading', { name: '공급처 추가', exact: true })))) {
            const titles = page.getByText('공급처 추가', { exact: true })
            let visibleCount = 0
            for (let i = 0; i < (await titles.count()); i += 1) if (await titles.nth(i).isVisible()) visibleCount += 1
            if (visibleCount < 2) throw new Error('패널 제목 "공급처 추가" 없음')
        }
        await button(page, '닫기')
    }, { expectClean: true }),
)

define('공급처-적힌 요구', 'P6', '저장하면 패널이 닫히고 목록에 보이며 "추가했습니다"가 2초 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name, phone } = await openAdd(page)
        await name.fill('바람꽃집')
        await phone.fill('051-555-0177')
        await (await button(page, '저장')).click()
        await need(page, '추가했습니다')
        await needAddClosed(page)
        await need(page, '바람꽃집')
        await need(page, '051-555-0177')
        await sleep(1000)
        if (!(await waitGone(page, '추가했습니다', 3000))) throw new Error('"추가했습니다"가 4초 뒤에도 남음')
    }, { expectClean: true }),
)

define('공급처-적힌 요구', 'P7', '입력 오류를 서버 코드에 맞는 문구로 알린다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name, phone } = await openAdd(page)
        await phone.fill('02-555-0100')
        await (await button(page, '저장')).click()
        await need(page, /이름을 입력해 주세요/)
        await name.fill('새싹')
        await phone.fill('전화없음')
        await (await button(page, '저장')).click()
        await need(page, /연락처는 숫자와 -만 쓸 수 있습니다/)
        if (!(await isAddOpen(page))) throw new Error('입력 오류인데 패널이 닫힘')
    }),
)

define('공급처-적힌 요구', 'P8', '저장하는 동안 "저장" 버튼이 비활성이다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name, phone } = await openAdd(page)
        await name.fill('느린집')
        await phone.fill('010-5555-0000')
        await api(page, 'setDelayMs', 1500)
        const save = await button(page, '저장')
        await save.click()
        await sleep(300)
        if (!(await isDisabled(save))) throw new Error('저장 중인데 버튼이 활성')
    }),
)

define('공급처-적힌 요구', 'P9', '"삭제"를 누르면 확인 창이 열리고, "취소"와 Escape로는 지우지 않는다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        await (await rowButton(page, '한빛화훼', /삭제/)).click()
        await need(page, '한빛화훼을(를) 삭제할까요?')
        await button(page, '삭제하기')
        await (await button(page, '취소')).click()
        await needGone(page, '한빛화훼을(를) 삭제할까요?')
        await (await rowButton(page, '한빛화훼', /삭제/)).click()
        await need(page, '한빛화훼을(를) 삭제할까요?')
        await page.keyboard.press('Escape')
        await needGone(page, '한빛화훼을(를) 삭제할까요?')
        await need(page, '한빛화훼')
        if ((await requests(page)).some((r) => r.method === 'DELETE')) throw new Error('취소했는데 DELETE 요청이 감')
    }, { expectClean: true }),
)

define('공급처-적힌 요구', 'P10', '"삭제하기"를 누르면 목록에서 사라지고 "삭제했습니다"가 2초 보인다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        await (await rowButton(page, '한빛화훼', /삭제/)).click()
        await (await button(page, '삭제하기')).click()
        await need(page, '삭제했습니다')
        await needGone(page, '02-555-0199')
        await needGone(page, '한빛화훼을(를) 삭제할까요?')
        await need(page, '초록농원')
        await sleep(1000)
        if (!(await waitGone(page, '삭제했습니다', 3000))) throw new Error('"삭제했습니다"가 4초 뒤에도 남음')
    }, { expectClean: true }),
)

define('공급처-적힌 요구', 'P11', '패널이 Escape, 바깥 클릭, "닫기"로 닫힌다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        await openAdd(page)
        await clickAt(page, await field(page, '연락처'))
        await sleep(300)
        if (!(await isAddOpen(page))) throw new Error('패널 안쪽을 눌렀는데 닫힘')
        await page.keyboard.press('Escape')
        await needAddClosed(page)
        await openAdd(page)
        await page.mouse.click(8, 790)
        await sleep(600)
        if (await isAddOpen(page)) {
            await page.mouse.click(1272, 8)
            await needAddClosed(page)
        }
        await openAdd(page)
        await (await button(page, '닫기')).click()
        await needAddClosed(page)
    }),
)

define('공급처-적힌 요구', 'P12', '너비 375px에서 가로로 넘치지 않는다', () =>
    withPage({ width: 375, height: 812 }, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        if ((await overflowPx(page)) > 1) throw new Error(`목록에서 ${await overflowPx(page)}px 넘침`)
        const remove = await rowButton(page, '숲속묘목', /삭제/)
        const removeBox = await remove.boundingBox()
        if (!removeBox || removeBox.x + removeBox.width > 376) throw new Error('"삭제" 버튼이 화면 밖으로 나감')
        await openAdd(page)
        if ((await overflowPx(page)) > 1) throw new Error(`패널을 열면 ${await overflowPx(page)}px 넘침`)
    }),
)

define('공급처-적힌 요구', 'P13', '어두운 화면에서 글자를 읽을 수 있다 (명암비 4.5 이상)', () =>
    withPage({ colorScheme: 'dark' }, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const targets = {
            '목록의 공급처 이름': await textOf(page, '숲속묘목'),
            '목록의 연락처': await textOf(page, '041-555-0142'),
            '줄의 삭제 버튼': await rowButton(page, '숲속묘목', /삭제/),
            '공급처 추가 버튼': await button(page, '공급처 추가'),
        }
        await needContrast(targets)
        const { name } = await openAdd(page)
        if ((await contrastOf(name)).backgroundLuminance > 0.2) throw new Error('어두운 화면인데 입력란 배경이 밝음')
        await needContrast({ '이름 입력란': name, '저장 버튼': await button(page, '저장') })
    }),
)

define('공급처-견고성', 'PR1', '추가가 실패하면 알리고 입력을 그대로 둔다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name, phone } = await openAdd(page)
        await name.fill('실패집')
        await phone.fill('010-5555-0001')
        await api(page, 'failOnce', 500) // 변경 요청 한 번만 실패 (뒤따르는 조회는 정상)
        await (await button(page, '저장')).click()
        if (!(await waitForFailureReport(page, 12000))) throw new Error('실패를 알리지 않음 (12초 대기)')
        await api(page, 'reset')
        if (!(await isAddOpen(page))) throw new Error('실패했는데 패널이 닫힘')
        if ((await (await field(page, '이름')).inputValue()) !== '실패집') throw new Error('실패 뒤 입력이 사라짐')
        if (!(await waitEnabled(await button(page, '저장')))) throw new Error('실패 뒤 저장 버튼이 계속 비활성')
    }),
)

define('공급처-견고성', 'PR2', '삭제가 실패하면 알리고 목록에 그대로 둔다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        await (await rowButton(page, '한빛화훼', /삭제/)).click()
        const confirm = await button(page, '삭제하기')
        await api(page, 'failOnce', 500) // 변경 요청 한 번만 실패 (뒤따르는 조회는 정상)
        await confirm.click()
        if (!(await waitForFailureReport(page, 12000))) throw new Error('실패를 알리지 않음 (12초 대기)')
        await api(page, 'reset')
        await sleep(1500)
        await need(page, '02-555-0199', { timeout: 6000 })
    }),
)

define('공급처-견고성', 'PR3', '"저장"을 연달아 눌러도 추가 요청은 한 번만 간다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const { name, phone } = await openAdd(page)
        await name.fill('두번집')
        await phone.fill('010-5555-0002')
        await api(page, 'reset')
        await api(page, 'setDelayMs', 800)
        await doubleClickAt(page, await button(page, '저장'))
        await sleep(2200)
        const posts = (await requests(page)).filter((r) => r.method === 'POST')
        if (posts.length !== 1) throw new Error(`POST 요청이 ${posts.length}번`)
    }),
)

define('공급처-견고성', 'PR4', '패널을 다시 열면 앞의 입력과 오류가 남지 않는다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const first = await openAdd(page)
        await first.phone.fill('잘못')
        await first.name.fill('남으면 안 됨')
        await (await button(page, '저장')).click()
        await need(page, /연락처는 숫자와 -만 쓸 수 있습니다/)
        await (await button(page, '닫기')).click()
        await needAddClosed(page)
        const second = await openAdd(page)
        if ((await second.name.inputValue()) !== '' || (await second.phone.inputValue()) !== '') throw new Error('다시 열었는데 앞의 입력이 남음')
        if (await seen(page, /연락처는 숫자와 -만 쓸 수 있습니다/, { timeout: 0 })) throw new Error('다시 열었는데 앞의 오류가 남음')
    }),
)

define('공급처-견고성', 'PR5', '줄마다 "삭제" 버튼의 접근 이름이 구분된다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const names = await page.getByRole('button', { name: /삭제/ }).evaluateAll((elements) =>
            elements.map((element) => `${element.getAttribute('aria-label') ?? ''}|${element.getAttribute('aria-labelledby') ?? ''}|${element.getAttribute('aria-describedby') ?? ''}|${element.textContent ?? ''}`),
        )
        if (new Set(names).size !== names.length) throw new Error(`버튼 ${names.length}개의 이름이 모두 같음`)
    }),
)

define('공급처-견고성', 'PR6', '확인 창을 키보드로 쓸 수 있다 (열리면 포커스가 창 안으로)', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        await toSuppliers(page)
        const remove = await rowButton(page, '한빛화훼', /삭제/)
        await remove.focus()
        await page.keyboard.press('Enter')
        await need(page, '한빛화훼을(를) 삭제할까요?')
        await sleep(300)
        const where = await page.evaluate(() => {
            const active = document.activeElement
            if (!active || active === document.body) return 'body'
            const question = [...document.querySelectorAll('*')].find((element) =>
                element.children.length === 0 && (element.textContent ?? '').includes('삭제할까요?'))
            for (let node = question; node; node = node.parentElement) {
                if (node.contains(active)) return node.querySelectorAll('button').length <= 4 ? 'inside' : 'outside'
            }
            return 'outside'
        })
        if (where !== 'inside') throw new Error(`확인 창이 열렸는데 포커스가 ${where === 'body' ? '어디에도 없음' : '창 밖에 있음'}`)
    }),
)

// ======================================================================
// 화면 4: 알림 설정
// ======================================================================
define('알림 설정-적힌 요구', 'T1', '메뉴로 알림 설정에 가면 서버 값이 들어 있다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        if (!(await isOn(form.lowStock))) throw new Error('"재고 부족 알림"이 꺼져 있음')
        if (await isOn(form.order)) throw new Error('"새 주문 알림"이 켜져 있음')
        if ((await form.threshold.inputValue()) !== '5') throw new Error(`기준 수량이 "${await form.threshold.inputValue()}"`)
        if ((await form.email.inputValue()) !== 'owner@example.com') throw new Error(`이메일이 "${await form.email.inputValue()}"`)
        if (await seen(page, PLANT_ROW, { timeout: 0 })) throw new Error('알림 설정을 골랐는데 식물 목록이 남음')
    }, { expectClean: true }),
)

define('알림 설정-적힌 요구', 'T2', '불러오는 동안 "불러오는 중"', () => withPage({}, (page) => loadingText(page, '알림 설정')))

define('알림 설정-적힌 요구', 'T3', '실패하면 알리고 "다시 시도"로 복구한다', () =>
    withPage({}, (page) => loadFailure(page, '알림 설정', /설정을 불러오지 못했습니다/, '알림 받을 이메일')),
)

define('알림 설정-적힌 요구', 'T4', '바꾼 것이 없으면 "저장"과 "되돌리기"를 누를 수 없다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        if (!(await isDisabled(form.save)) || !(await isDisabled(form.revert))) throw new Error('바꾸지 않았는데 버튼이 활성')
        await form.email.fill('new@example.com')
        if ((await isDisabled(form.save)) || (await isDisabled(form.revert))) throw new Error('바꿨는데 버튼이 비활성')
        await form.email.fill('owner@example.com')
        await sleep(200)
        if (!(await isDisabled(form.save))) throw new Error('원래 값으로 다시 입력했는데 "저장"이 활성')
    }),
)

define('알림 설정-적힌 요구', 'T5', '"재고 부족 알림"을 끄면 "기준 수량"을 입력할 수 없다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        if (await isDisabled(form.threshold)) throw new Error('켜져 있는데 기준 수량이 비활성')
        await flip(page, form.lowStock)
        await sleep(200)
        const isLocked = await form.threshold.evaluate((element) => element.disabled || element.readOnly || element.getAttribute('aria-disabled') === 'true')
        if (!isLocked) throw new Error('껐는데 기준 수량을 입력할 수 있음')
    }),
)

define('알림 설정-적힌 요구', 'T6', '"되돌리기"를 누르면 저장된 값으로 돌아간다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.email.fill('other@example.com')
        await form.threshold.fill('9')
        await flip(page, form.order)
        await form.revert.click()
        await sleep(300)
        if ((await form.email.inputValue()) !== 'owner@example.com') throw new Error('이메일이 안 돌아옴')
        if ((await form.threshold.inputValue()) !== '5') throw new Error('기준 수량이 안 돌아옴')
        if (await isOn(form.order)) throw new Error('"새 주문 알림"이 안 돌아옴')
        if (!(await isDisabled(form.save))) throw new Error('되돌린 뒤에도 "저장"이 활성')
    }, { expectClean: true }),
)

define('알림 설정-적힌 요구', 'T7', '저장하면 "저장했습니다"가 2초 보이고 값이 남는다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.threshold.fill('8')
        await flip(page, form.order)
        await form.save.click()
        await needNotice(page, '저장했습니다')
        if (!(await isDisabled(form.save))) throw new Error('저장한 뒤에도 "저장"이 활성')
        const sent = (await requests(page)).filter((r) => r.method === 'PUT')
        if (sent.length !== 1) throw new Error(`PUT 요청이 ${sent.length}번`)
        await goTo(page, '식물 재고', PLANT_ROW)
        const again = await toSettings(page)
        if ((await again.threshold.inputValue()) !== '8') throw new Error('다시 들어오니 기준 수량이 안 남음')
        if (!(await isOn(again.order))) throw new Error('다시 들어오니 "새 주문 알림"이 안 남음')
    }, { expectClean: true }),
)

define('알림 설정-적힌 요구', 'T8', '입력 오류를 서버 코드에 맞는 문구로 알린다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.threshold.fill('0')
        await form.save.click()
        await need(page, /기준 수량은 1 이상의 정수여야 합니다/)
        await form.threshold.fill('3')
        await form.email.fill('주소아님')
        await form.save.click()
        await need(page, /이메일 형식이 올바르지 않습니다/)
    }),
)

define('알림 설정-적힌 요구', 'T9', '저장하는 동안 "저장" 버튼이 비활성이다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.threshold.fill('7')
        await api(page, 'setDelayMs', 1500)
        await form.save.click()
        await sleep(300)
        if (!(await isDisabled(form.save))) throw new Error('저장 중인데 버튼이 활성')
    }),
)

define('알림 설정-적힌 요구', 'T10', '너비 375px에서 가로로 넘치지 않는다', () =>
    withPage({ width: 375, height: 812 }, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        if ((await overflowPx(page)) > 1) throw new Error(`${await overflowPx(page)}px 넘침`)
        for (const [name, locator] of Object.entries({ 저장: form.save, 되돌리기: form.revert, 이메일: form.email })) {
            const box = await locator.boundingBox()
            if (!box || box.x < 0 || box.x + box.width > 376) throw new Error(`${name}이(가) 화면 밖으로 나감`)
        }
        // 메뉴 항목 네 개가 모두 닿는 곳에 있는가
        for (const name of ['식물 재고', '주문', '공급처', '알림 설정']) {
            const box = await (await menuItem(page, name)).boundingBox()
            if (!box || box.x < -1 || box.x + box.width > 376) throw new Error(`메뉴의 "${name}"이(가) 화면 밖으로 나감`)
        }
    }),
)

define('알림 설정-적힌 요구', 'T11', '어두운 화면에서 글자를 읽을 수 있다 (명암비 4.5 이상)', () =>
    withPage({ colorScheme: 'dark' }, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        if ((await contrastOf(form.email)).backgroundLuminance > 0.2) throw new Error('어두운 화면인데 입력란 배경이 밝음')
        await form.threshold.fill('6')
        await needContrast({
            '이메일 입력란': form.email,
            '기준 수량 입력란': form.threshold,
            '체크박스 라벨': await textOf(page, '새 주문 알림'),
            '저장 버튼': form.save,
            '되돌리기 버튼': form.revert,
        })
    }),
)

define('알림 설정-견고성', 'TR1', '저장이 실패하면 알리고 입력을 그대로 둔다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.email.fill('keep@example.com')
        await api(page, 'failOnce', 500) // 변경 요청 한 번만 실패 (뒤따르는 조회는 정상)
        await form.save.click()
        if (!(await waitForFailureReport(page, 12000))) throw new Error('실패를 알리지 않음 (12초 대기)')
        await api(page, 'reset')
        if ((await form.email.inputValue()) !== 'keep@example.com') throw new Error('실패 뒤 입력이 사라짐')
        if (!(await waitEnabled(form.save))) throw new Error('실패 뒤 저장 버튼이 계속 비활성')
    }),
)

define('알림 설정-견고성', 'TR2', '기준 수량을 비우거나 소수로 넣어도 깨지지 않고 알린다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.threshold.fill('')
        await form.email.fill('a@example.com')
        if (!(await isDisabled(form.save))) await form.save.click()
        await sleep(900)
        const isEmptyHandled = (await isDisabled(form.save)) || (await seen(page, /기준 수량은 1 이상의 정수여야 합니다/, { timeout: 2000 }))
        if (!isEmptyHandled) throw new Error('기준 수량을 비우고 저장했는데 아무 안내가 없음')
        await form.threshold.fill('1.5')
        if (!(await isDisabled(form.save))) await form.save.click()
        if (!(await seen(page, /기준 수량은 1 이상의 정수여야 합니다/, { timeout: 3000 })) && !(await isDisabled(form.save))) {
            throw new Error('1.5를 넣고 저장했는데 안내가 없음')
        }
        await need(page, '알림 받을 이메일')
    }, { expectClean: true }),
)

define('알림 설정-견고성', 'TR3', '"저장"을 연달아 눌러도 요청은 한 번만 간다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.threshold.fill('4')
        await api(page, 'reset')
        await api(page, 'setDelayMs', 800)
        await doubleClickAt(page, form.save)
        await sleep(1800)
        const puts = (await requests(page)).filter((r) => r.method === 'PUT')
        if (puts.length !== 1) throw new Error(`PUT 요청이 ${puts.length}번`)
    }),
)

define('알림 설정-견고성', 'TR4', '저장한 뒤의 "되돌리기"는 새로 저장한 값으로 돌아간다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.threshold.fill('8')
        await form.save.click()
        await need(page, '저장했습니다')
        await form.threshold.fill('2')
        await form.revert.click()
        await sleep(300)
        if ((await form.threshold.inputValue()) !== '8') throw new Error(`되돌렸더니 "${await form.threshold.inputValue()}" (저장한 값은 8)`)
    }),
)

define('알림 설정-견고성', 'TR5', '오류와 완료 안내를 스크린 리더에 알린다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await form.email.fill('주소아님')
        await form.save.click()
        if (!(await isLive(await textOf(page, /이메일 형식이 올바르지 않습니다/)))) throw new Error('400 안내에 role=alert나 aria-live가 없음')
        await form.email.fill('ok@example.com')
        await form.save.click()
        if (!(await isLive(await textOf(page, '저장했습니다')))) throw new Error('"저장했습니다"에 role=status나 aria-live가 없음')
    }),
)

define('알림 설정-견고성', 'TR6', '끈 "재고 부족 알림"으로 저장해도 기준 수량 때문에 막히지 않는다', () =>
    withPage({}, async (page) => {
        await plantsLoaded(page)
        const form = await toSettings(page)
        await flip(page, form.lowStock)
        await form.save.click()
        await need(page, '저장했습니다')
        const sent = (await requests(page)).filter((r) => r.method === 'PUT')
        if (sent.length !== 1) throw new Error(`PUT 요청이 ${sent.length}번`)
    }),
)

// ---------- 실행 ----------
try {
    await setup(appDir, resultDir, Number(portText))
    await runChecks('screens.json', { only: only.length > 0 ? only : null })
} finally {
    await teardown()
}
