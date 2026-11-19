// 숨겨 둔 채점 스크립트. 구현을 모르는 채로 브라우저에서 화면만 보고 검사합니다.
//   node accept.mjs <앱 폴더> <결과 폴더> <포트>
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { chromium } from 'playwright-core'

const [appDir, outDir, portText] = process.argv.slice(2)
const port = Number(portText)
const baseUrl = `http://localhost:${port}/`
fs.mkdirSync(outDir, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ---------- 서버 ----------
const server = spawn('pnpm', ['exec', 'vite', '--port', String(port), '--strictPort'], {
    cwd: appDir,
    stdio: 'ignore',
})
async function waitForServer() {
    for (let i = 0; i < 100; i += 1) {
        try {
            const response = await fetch(baseUrl)
            if (response.ok) return
        } catch {
            // 아직 안 떴음
        }
        await sleep(200)
    }
    throw new Error('dev 서버가 뜨지 않았습니다')
}

// ---------- 도우미 ----------
const browser = await chromium.launch({ channel: 'chrome' })

/** 가짜 서버가 window에 달리는 순간 미리 정한 조작을 적용합니다 (첫 요청보다 먼저). */
function preloadScript(commands) {
    return `
        const commands = ${JSON.stringify(commands)};
        Object.defineProperty(window, '__fakeApi', {
            configurable: true,
            set(api) {
                Object.defineProperty(window, '__fakeApi', { value: api, writable: true, configurable: true });
                for (const [name, ...args] of commands) api[name](...args);
            },
        });
    `
}

async function openPage({ width = 1280, height = 800, colorScheme = 'light', preload = [] } = {}) {
    const context = await browser.newContext({
        viewport: { width, height },
        colorScheme,
        reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    page.setDefaultTimeout(4000)
    const consoleErrors = []
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 200))
    })
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${String(error).slice(0, 200)}`))
    if (preload.length > 0) await page.addInitScript(preloadScript(preload))
    await page.goto(baseUrl, { waitUntil: 'load' })
    return { page, context, consoleErrors }
}

const api = (page, name, ...args) =>
    page.evaluate(([n, a]) => window.__fakeApi[n](...a), [name, args])
const requests = (page) => page.evaluate(() => [...window.__fakeApi.requests()])

const text = (page, value) => page.getByText(value).first()
const visible = async (locator, timeout = 4000) => {
    try {
        await locator.waitFor({ state: 'visible', timeout })
        return true
    } catch {
        return false
    }
}
const hidden = async (locator, timeout = 4000) => {
    try {
        await locator.waitFor({ state: 'hidden', timeout })
        return true
    } catch {
        return false
    }
}

/** 접근성 정보로 먼저 찾고, 없으면 글자나 위치로 찾습니다. 접근성 자체는 따로 검사합니다. */
async function searchInput(page) {
    const byLabel = page.getByLabel('식물 검색', { exact: true })
    if ((await byLabel.count()) > 0) return byLabel.first()
    return page.locator('input').first()
}
async function stockInput(page) {
    const byLabel = page.getByLabel('재고', { exact: true })
    if ((await byLabel.count()) > 0) return byLabel.first()
    return page.locator('input').last()
}
async function button(page, name) {
    const byRole = page.getByRole('button', { name, exact: true })
    if ((await byRole.count()) > 0) return byRole.first()
    return page.getByText(name, { exact: true }).first()
}
async function clickAt(page, locator) {
    const box = await locator.boundingBox()
    if (!box) throw new Error('누를 대상의 위치를 알 수 없음')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}
/** 실패를 사용자에게 알렸는가: 글자가 든 role=alert가 보이거나 실패를 뜻하는 문장이 보임 */
async function isFailureReported(page) {
    const alerts = page.getByRole('alert')
    for (let i = 0; i < (await alerts.count()); i += 1) {
        const alert = alerts.nth(i)
        if ((await alert.isVisible()) && (await alert.innerText()).trim() !== '') return true
    }
    // 같은 글자가 든 숨은 요소가 앞에 있을 수 있으므로 보이는 것이 하나라도 있는지 봅니다.
    const messages = page.getByText(/못했습니다|오류|실패/)
    for (let i = 0; i < Math.min(await messages.count(), 20); i += 1) {
        if (await messages.nth(i).isVisible()) return true
    }
    return false
}
async function waitForFailureReport(page, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        if (await isFailureReported(page)) return true
        await sleep(300)
    }
    return false
}
const plant = (page, name) => page.getByText(new RegExp(name)).first()
const panelTitle = (page) => page.getByText('식물 상세', { exact: true }).first()

async function loaded(page) {
    if (!(await visible(text(page, /유칼립투스/), 8000))) throw new Error('목록이 뜨지 않음')
}
async function openPanel(page, name = '스킨답서스') {
    await plant(page, name).click()
    if (!(await visible(panelTitle(page)))) throw new Error('상세 패널이 열리지 않음')
    const input = await stockInput(page)
    await input.waitFor({ state: 'visible' })
    // 상세를 불러와 값이 채워질 때까지 기다립니다.
    for (let i = 0; i < 40; i += 1) {
        if ((await input.inputValue()) !== '') break
        await sleep(100)
    }
    return input
}

/** 글자색과 그 뒤 배경색의 명암비. 색은 캔버스로 정규화합니다. */
async function contrastOf(locator) {
    return locator.evaluate((element) => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d', { willReadFrequently: true })
        const toRgba = (color) => {
            context.clearRect(0, 0, 1, 1)
            context.fillStyle = '#000'
            context.fillStyle = color
            context.fillRect(0, 0, 1, 1)
            const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
            return [r, g, b, a / 255]
        }
        const isDark = matchMedia('(prefers-color-scheme: dark)').matches
        const rootScheme = getComputedStyle(document.documentElement).colorScheme
        // 배경을 아무도 칠하지 않았을 때 브라우저가 쓰는 색
        let background = isDark && rootScheme.includes('dark') ? [18, 18, 18, 1] : [255, 255, 255, 1]
        const layers = []
        for (let node = element; node; node = node.parentElement) {
            const color = toRgba(getComputedStyle(node).backgroundColor)
            if (color[3] > 0) layers.push(color)
            if (color[3] === 1) break
        }
        for (const [r, g, b, a] of layers.reverse()) {
            background = [
                r * a + background[0] * (1 - a),
                g * a + background[1] * (1 - a),
                b * a + background[2] * (1 - a),
                1,
            ]
        }
        const [fr, fg, fb, fa] = toRgba(getComputedStyle(element).color)
        const foreground = [
            fr * fa + background[0] * (1 - fa),
            fg * fa + background[1] * (1 - fa),
            fb * fa + background[2] * (1 - fa),
        ]
        const luminance = ([r, g, b]) => {
            const channel = (value) => {
                const s = value / 255
                return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            }
            return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
        }
        const a = luminance(foreground)
        const b = luminance(background)
        return {
            ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100,
            backgroundLuminance: Math.round(b * 1000) / 1000,
        }
    })
}

async function contrastCheck(colorScheme) {
    const { page, context } = await openPage({ colorScheme })
    try {
        await loaded(page)
        const input = await openPanel(page)
        const targets = {
            '목록의 식물 이름': plant(page, '올리브나무'),
            '패널의 메모': text(page, '물을 좋아합니다.'),
            '패널 제목': panelTitle(page),
            '재고 입력란': input,
            '검색 입력란': await searchInput(page),
        }
        const low = []
        let backgroundLuminance = 0
        for (const [name, locator] of Object.entries(targets)) {
            const result = await contrastOf(locator)
            if (name === '패널의 메모') backgroundLuminance = result.backgroundLuminance
            if (result.ratio < 4.5) low.push(`${name} ${result.ratio}:1`)
        }
        if (colorScheme === 'dark' && backgroundLuminance > 0.2) {
            throw new Error(`어두운 화면인데 패널 배경이 밝음 (밝기 ${backgroundLuminance})`)
        }
        if (low.length > 0) throw new Error(`명암비 4.5 미만: ${low.join(', ')}`)
    } finally {
        await context.close()
    }
}

const overflowPx = (page) =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

// ---------- 검사 ----------
const checks = []
const define = (group, id, title, run) => checks.push({ group, id, title, run })
const cleanRunErrors = []

async function withPage(options, body, { expectClean = false } = {}) {
    const session = await openPage(options)
    try {
        await body(session.page)
        if (expectClean) cleanRunErrors.push(...session.consoleErrors)
    } finally {
        await session.context.close()
    }
}

// ----- 과제에 적힌 요구 -----
define('stated', 'S1', '목록에 식물 이름과 재고가 보인다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        for (const name of ['몬스테라', '스킨답서스', '올리브나무', '유칼립투스']) {
            if (!(await visible(plant(page, name)))) throw new Error(`${name} 없음`)
        }
        if (!(await visible(text(page, /재고\s*30\s*개/)))) throw new Error('"재고 30개" 없음')
        if (!(await visible(text(page, '식물 재고')))) throw new Error('제목 "식물 재고" 없음')
    }, { expectClean: true }),
)

define('stated', 'S2', '불러오는 동안 "불러오는 중"을 보여 준다', () =>
    withPage({ preload: Array(6).fill(['hangOnce']) }, async (page) => {
        if (!(await visible(text(page, /불러오는 중/), 3000))) throw new Error('"불러오는 중" 없음')
    }),
)

define('stated', 'S3', '실패하면 알리고 "다시 시도"로 복구한다', () =>
    withPage({ preload: Array(10).fill(['failOnce', 500]) }, async (page) => {
        if (!(await visible(text(page, /식물을 불러오지 못했습니다/), 20000))) {
            throw new Error('"식물을 불러오지 못했습니다" 없음 (20초 대기)')
        }
        await api(page, 'reset')
        await (await button(page, '다시 시도')).click()
        await loaded(page)
    }),
)

define('stated', 'S4', '입력이 멈추고 300ms 뒤에 한 번만 조회한다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        await api(page, 'reset')
        const input = await searchInput(page)
        await input.click()
        await input.pressSequentially('몬스테', { delay: 120 })
        await sleep(150)
        const early = (await requests(page)).filter((r) => r.url.includes('keyword'))
        if (early.length > 0) throw new Error(`입력 직후에 이미 조회함: ${early.map((r) => r.url).join(', ')}`)
        await sleep(1500)
        const sent = (await requests(page)).filter((r) => r.method === 'GET' && r.url.includes('keyword'))
        const keywords = sent.map((r) => new URL(r.url, 'http://x').searchParams.get('keyword'))
        if (keywords.length !== 1 || keywords[0] !== '몬스테') {
            throw new Error(`검색 요청이 ${JSON.stringify(keywords)}`)
        }
        if (!(await visible(plant(page, '몬스테라 아단소니')))) throw new Error('검색 결과 없음')
        if (!(await hidden(plant(page, '스킨답서스')))) throw new Error('검색 뒤에도 다른 식물이 남음')
    }, { expectClean: true }),
)

define('stated', 'S5', '결과가 없으면 안내를 보여 준다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        await (await searchInput(page)).fill('없는식물')
        if (!(await visible(text(page, /조건에 맞는 식물이 없습니다/), 5000))) throw new Error('빈 결과 안내 없음')
    }),
)

define('stated', 'S6', '식물을 누르면 상세 패널이 열리고 재고 입력란에 포커스가 간다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await openPanel(page)
        if ((await input.inputValue()) !== '30') throw new Error(`재고 값이 ${await input.inputValue()}`)
        if (!(await visible(text(page, '물을 좋아합니다.')))) throw new Error('메모 없음')
        if (!(await visible(await button(page, '저장')))) throw new Error('"저장" 없음')
        if (!(await visible(await button(page, '닫기')))) throw new Error('"닫기" 없음')
        const isFocused = await input.evaluate((element) => document.activeElement === element)
        if (!isFocused) throw new Error('재고 입력란에 포커스가 없음')
    }, { expectClean: true }),
)

define('stated', 'S7', '저장하면 "저장했습니다"가 2초 보이고 목록의 재고가 바뀐다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await openPanel(page)
        await input.fill('25')
        await (await button(page, '저장')).click()
        const notice = text(page, '저장했습니다')
        if (!(await visible(notice, 4000))) throw new Error('"저장했습니다" 없음')
        const shownAt = Date.now()
        if (!(await visible(text(page, /재고\s*25\s*개/), 3000))) throw new Error('목록의 재고가 안 바뀜')
        await sleep(Math.max(0, 1300 - (Date.now() - shownAt)))
        if (!(await notice.isVisible())) throw new Error('1.3초 만에 안내가 사라짐')
        await sleep(Math.max(0, 3200 - (Date.now() - shownAt)))
        if (await notice.isVisible()) throw new Error('3.2초가 지나도 안내가 남아 있음')
    }, { expectClean: true }),
)

define('stated', 'S8', '서버가 400을 주면 "재고는 0 이상의 정수여야 합니다"를 보여 준다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await openPanel(page)
        await input.fill('-3')
        await (await button(page, '저장')).click()
        if (!(await visible(text(page, /재고는 0 이상의 정수여야 합니다/), 4000))) throw new Error('400 안내 없음')
        if (!(await visible(text(page, /재고\s*30\s*개/)))) throw new Error('목록의 재고가 바뀜')
        if (await text(page, '저장했습니다').isVisible()) throw new Error('실패인데 "저장했습니다"가 보임')
    }),
)

define('stated', 'S9', '저장하는 동안 "저장" 버튼이 비활성이다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await openPanel(page)
        await input.fill('21')
        await api(page, 'setDelayMs', 1500)
        const save = await button(page, '저장')
        await save.click()
        await sleep(300)
        const isDisabled = await save.evaluate(
            (element) => element.disabled === true || element.getAttribute('aria-disabled') === 'true',
        )
        if (!isDisabled) throw new Error('저장 중인데 버튼이 눌릴 수 있는 상태')
    }),
)

define('stated', 'S10', 'Escape, 바깥 클릭, "닫기"로 닫히고 안쪽 클릭으로는 안 닫힌다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        await openPanel(page)
        await page.keyboard.press('Escape')
        if (!(await hidden(panelTitle(page), 2000))) throw new Error('Escape로 안 닫힘')

        await openPanel(page)
        await text(page, '물을 좋아합니다.').click()
        await sleep(300)
        if (!(await panelTitle(page).isVisible())) throw new Error('안쪽을 눌렀는데 닫힘')
        await clickAt(page, page.getByRole('heading', { name: '온실 관리' }))
        if (!(await hidden(panelTitle(page), 2000))) throw new Error('바깥 클릭으로 안 닫힘')

        await openPanel(page)
        await (await button(page, '닫기')).click()
        if (!(await hidden(panelTitle(page), 2000))) throw new Error('"닫기"로 안 닫힘')
    }, { expectClean: true }),
)

define('stated', 'S11', '너비 375px에서 가로로 넘치지 않는다', () =>
    withPage({ width: 375, height: 812 }, async (page) => {
        await loaded(page)
        const before = await overflowPx(page)
        if (before > 0) throw new Error(`목록 상태에서 ${before}px 넘침`)
        await openPanel(page)
        const after = await overflowPx(page)
        if (after > 0) throw new Error(`패널을 연 상태에서 ${after}px 넘침`)
        const box = await (await stockInput(page)).boundingBox()
        if (!box || box.x < 0 || box.x + box.width > 375) throw new Error('재고 입력란이 화면 밖으로 나감')
    }),
)

define('stated', 'S12', '어두운 화면에서 글자를 읽을 수 있다 (명암비 4.5 이상)', () => contrastCheck('dark'))

// ----- 적지 않았지만 챙겨야 하는 것 -----
define('unstated', 'R1', '늦게 온 이전 검색 응답이 최신 결과를 덮지 않는다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await searchInput(page)
        await api(page, 'setDelayMs', 1800)
        await input.fill('몬')
        await sleep(500)
        await api(page, 'setDelayMs', 100)
        await input.fill('유칼')
        await sleep(3000)
        if (!(await plant(page, '유칼립투스').isVisible())) throw new Error('최신 검색 결과가 안 보임')
        if (await plant(page, '몬스테라').isVisible()) throw new Error('이전 검색의 결과가 화면을 덮음')
    }),
)

define('unstated', 'R2', '서버 응답이 약속과 다르면 깨지지 않고 실패로 알린다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const broken = [{ id: 1 }, { id: 'x', name: null, stock: '많음' }]
        for (let i = 0; i < 8; i += 1) await api(page, 'failOnce', 200, broken)
        await (await searchInput(page)).fill('올리')
        await sleep(1200)
        const isReported = await waitForFailureReport(page, 12000)
        const body = await page.locator('body').innerText()
        if (/undefined|NaN|null/.test(body)) throw new Error(`화면에 깨진 값이 보임: ${body.match(/.{0,15}(undefined|NaN|null).{0,15}/)?.[0]}`)
        if (body.trim() === '') throw new Error('화면이 비어 버림')
        if (!isReported) throw new Error('깨진 응답을 실패로 알리지 않음')
    }),
)

define('unstated', 'R3', '상세를 불러오지 못하면 패널에서 알린다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        for (let i = 0; i < 8; i += 1) await api(page, 'failOnce', 500)
        await plant(page, '스킨답서스').click()
        const isReported = await waitForFailureReport(page, 20000)
        if ((await page.locator('body').innerText()).trim() === '') throw new Error('화면이 비어 버림')
        if (!isReported) throw new Error('상세 실패를 알리지 않음 (20초 대기)')
    }),
)

define('unstated', 'R4', '식물을 빠르게 바꿔 눌러도 나중에 누른 식물의 상세가 보인다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        await api(page, 'setDelayMs', 1800)
        await plant(page, '스킨답서스').click()
        await sleep(200)
        await api(page, 'setDelayMs', 100)
        // 다른 식물을 누릅니다. 패널이 화면을 덮는 방식이면 첫 클릭은 패널을 닫기만 하므로 한 번 더 누릅니다.
        const other = plant(page, '올리브나무')
        await clickAt(page, other)
        await sleep(300)
        if (!(await text(page, '햇빛이 많이 필요합니다.').isVisible()) && !(await panelTitle(page).isVisible())) {
            await clickAt(page, other)
        }
        await sleep(3000)
        if (!(await panelTitle(page).isVisible())) throw new Error('패널이 닫혀 있음')
        if (!(await text(page, '햇빛이 많이 필요합니다.').isVisible())) throw new Error('나중에 누른 식물의 메모가 없음')
        if (await text(page, '물을 좋아합니다.').isVisible()) throw new Error('먼저 누른 식물의 메모가 보임')
        const value = await (await stockInput(page)).inputValue()
        if (value !== '0') throw new Error(`재고 값이 ${value}`)
    }),
)

define('unstated', 'R5', '저장이 400이 아닌 이유로 실패해도 알리고 다시 저장할 수 있다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await openPanel(page)
        await input.fill('9')
        for (let i = 0; i < 8; i += 1) await api(page, 'failOnce', 500)
        const save = await button(page, '저장')
        await save.click()
        const isReported = await waitForFailureReport(page, 15000)
        if (await text(page, '저장했습니다').isVisible()) throw new Error('실패인데 "저장했습니다"가 보임')
        if (!isReported) throw new Error('저장 실패를 알리지 않음')
        // 남은 실패 예약을 치우고, 버튼이 다시 눌릴 수 있게 될 때까지 잠깐 기다립니다.
        await api(page, 'reset')
        let isDisabled = true
        for (let i = 0; i < 15 && isDisabled; i += 1) {
            isDisabled = await save.evaluate((element) => element.disabled === true)
            if (isDisabled) await sleep(200)
        }
        if (isDisabled) throw new Error('실패 뒤 3초가 지나도 저장 버튼이 계속 비활성')
    }),
)

define('unstated', 'R6', '키보드만으로 식물을 골라 패널을 열 수 있다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        await (await searchInput(page)).focus()
        let isFound = false
        for (let i = 0; i < 12 && !isFound; i += 1) {
            await page.keyboard.press('Tab')
            isFound = await page.evaluate(() => (document.activeElement?.textContent ?? '').includes('스킨답서스')
                && !(document.activeElement?.textContent ?? '').includes('유칼립투스'))
        }
        if (!isFound) throw new Error('Tab으로 식물 항목에 닿지 못함')
        await page.keyboard.press('Enter')
        if (!(await visible(panelTitle(page), 3000))) throw new Error('Enter로 패널이 안 열림')
    }),
)

define('unstated', 'R7', '입력란에 라벨이 연결돼 있다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        if ((await page.getByLabel('식물 검색', { exact: true }).count()) === 0) throw new Error('"식물 검색" 라벨이 입력란과 연결 안 됨')
        await openPanel(page)
        if ((await page.getByLabel('재고', { exact: true }).count()) === 0) throw new Error('"재고" 라벨이 입력란과 연결 안 됨')
    }),
)

define('unstated', 'R8', '오류와 완료 안내를 스크린 리더에 알린다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await openPanel(page)
        await input.fill('-3')
        await (await button(page, '저장')).click()
        const error = text(page, /재고는 0 이상의 정수여야 합니다/)
        await error.waitFor({ state: 'visible' })
        const isLive = (locator) =>
            locator.evaluate((element) => {
                for (let node = element; node; node = node.parentElement) {
                    const role = node.getAttribute('role')
                    if (role === 'alert' || role === 'status' || node.hasAttribute('aria-live')) return true
                    if (node.tagName === 'OUTPUT') return true
                }
                return false
            })
        if (!(await isLive(error))) throw new Error('400 안내에 role=alert나 aria-live가 없음')
        await input.fill('3')
        await (await button(page, '저장')).click()
        const notice = text(page, '저장했습니다')
        await notice.waitFor({ state: 'visible' })
        if (!(await isLive(notice))) throw new Error('"저장했습니다"에 role=status나 aria-live가 없음')
    }),
)

define('unstated', 'R9', '안내가 떠 있는 중에 다시 저장하면 2초를 새로 센다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await openPanel(page)
        await api(page, 'setDelayMs', 50)
        const save = await button(page, '저장')
        const notice = text(page, '저장했습니다')
        await input.fill('14')
        await save.click()
        await notice.waitFor({ state: 'visible' })
        const firstAt = Date.now()
        await sleep(1400)
        await input.fill('15')
        await save.click()
        await sleep(Math.max(0, 2500 - (Date.now() - firstAt)))
        if (!(await notice.isVisible())) throw new Error('두 번째 저장 1.1초 뒤에 안내가 이미 사라짐')
    }),
)

define('unstated', 'R10', 'Enter를 연달아 눌러도 저장 요청은 한 번만 간다', () =>
    withPage({}, async (page) => {
        await loaded(page)
        const input = await openPanel(page)
        await input.fill('18')
        await api(page, 'reset')
        await api(page, 'setDelayMs', 800)
        // 사람이 Enter를 두세 번 연달아 누르는 간격
        await input.press('Enter')
        await sleep(80)
        await input.press('Enter')
        await sleep(80)
        await input.press('Enter')
        await sleep(1500)
        const patches = (await requests(page)).filter((r) => r.method === 'PATCH')
        if (patches.length !== 1) throw new Error(`PATCH 요청이 ${patches.length}번`)
    }),
)

define('unstated', 'R11', '밝은 화면에서 글자를 읽을 수 있다 (명암비 4.5 이상)', () => contrastCheck('light'))

// ----- 스크린샷 (조건을 가린 검토용) -----
async function takeShots() {
    const variants = {
        'desktop-light': { width: 1280, height: 800, colorScheme: 'light' },
        'desktop-dark': { width: 1280, height: 800, colorScheme: 'dark' },
        'mobile-light': { width: 375, height: 812, colorScheme: 'light' },
    }
    for (const [name, options] of Object.entries(variants)) {
        const { page, context } = await openPage(options)
        try {
            const shot = async (step) => {
                await sleep(700)
                await page.screenshot({ path: path.join(outDir, `${step}--${name}.png`), fullPage: true, animations: 'disabled' })
            }
            await loaded(page)
            await shot('1-목록')
            const input = await openPanel(page)
            await shot('2-상세 패널')
            await input.fill('-3')
            await (await button(page, '저장')).click()
            await sleep(900)
            await shot('3-저장 실패')
            await input.fill('25')
            await (await button(page, '저장')).click()
            await sleep(700)
            await shot('4-저장 성공')
        } catch (error) {
            fs.appendFileSync(path.join(outDir, 'shots-errors.txt'), `${name}: ${String(error).split('\n')[0]}\n`)
        } finally {
            await context.close()
        }
    }
}

// ---------- 실행 ----------
const results = []
try {
    await waitForServer()
    for (const check of checks) {
        const started = Date.now()
        let isOk = true
        let note = ''
        try {
            await check.run()
        } catch (error) {
            isOk = false
            note = String(error instanceof Error ? error.message : error).split('\n')[0].slice(0, 200)
        }
        results.push({ group: check.group, id: check.id, title: check.title, isOk, note, ms: Date.now() - started })
        console.log(`${isOk ? 'O' : 'X'} ${check.id} ${check.title}${note ? ` — ${note}` : ''}`)
    }
    const unique = [...new Set(cleanRunErrors)]
    results.push({
        group: 'unstated',
        id: 'R12',
        title: '정상 흐름에서 콘솔 에러가 없다',
        isOk: unique.length === 0,
        note: unique.slice(0, 3).join(' | '),
        ms: 0,
    })
    console.log(`${unique.length === 0 ? 'O' : 'X'} R12 정상 흐름에서 콘솔 에러가 없다${unique.length ? ` — ${unique[0]}` : ''}`)
    await takeShots()
} finally {
    await browser.close()
    server.kill('SIGTERM')
}

const count = (group) => results.filter((r) => r.group === group && r.isOk).length
const total = (group) => results.filter((r) => r.group === group).length
const summary = {
    stated: `${count('stated')}/${total('stated')}`,
    unstated: `${count('unstated')}/${total('unstated')}`,
    results,
}
fs.writeFileSync(path.join(outDir, 'accept.json'), JSON.stringify(summary, null, 2))
console.log(`\n적힌 요구 ${summary.stated}, 적지 않은 견고성 ${summary.unstated}`)
process.exit(0)
