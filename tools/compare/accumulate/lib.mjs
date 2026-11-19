// 누적 비교 시험(6회)의 채점·측정 스크립트가 같이 쓰는 도우미.
// 구현을 모르는 채로 브라우저에서 화면만 보고 검사합니다.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { chromium } from 'playwright-core'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let baseUrl = ''
let browser
let server
export let outDir = ''

/** dev 서버와 브라우저를 띄웁니다. */
export async function setup(appDir, resultDir, port) {
    outDir = resultDir
    fs.mkdirSync(outDir, { recursive: true })
    baseUrl = `http://localhost:${port}/`
    server = spawn('pnpm', ['exec', 'vite', '--port', String(port), '--strictPort'], {
        cwd: appDir,
        stdio: 'ignore',
    })
    browser = await chromium.launch({ channel: 'chrome' })
    for (let i = 0; i < 150; i += 1) {
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

export async function teardown() {
    await browser?.close()
    server?.kill('SIGTERM')
}

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

export async function openPage({ width = 1280, height = 800, colorScheme = 'light', preload = [] } = {}) {
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

export const api = (page, name, ...args) =>
    page.evaluate(([n, a]) => window.__fakeApi[n](...a), [name, args])
export const requests = (page) => page.evaluate(() => [...window.__fakeApi.requests()])

/** 보이는 것 가운데 첫 번째. 같은 글자가 든 숨은 요소가 앞에 있을 수 있어서 하나씩 봅니다. */
export async function firstVisible(locator) {
    const count = Math.min(await locator.count(), 30)
    for (let i = 0; i < count; i += 1) {
        const candidate = locator.nth(i)
        if (await candidate.isVisible().catch(() => false)) return candidate
    }
    return null
}

/** 글자가 화면에 보이는가 (기다림). 문자열은 부분 일치, exact를 주면 완전 일치. */
export async function seen(page, value, { timeout = 4000, exact = false } = {}) {
    const deadline = Date.now() + timeout
    for (;;) {
        if (await firstVisible(page.getByText(value, { exact }))) return true
        if (Date.now() > deadline) return false
        await sleep(100)
    }
}

/** 글자가 화면에서 사라졌는가 (기다림) */
export async function unseen(page, value, { timeout = 4000, exact = false } = {}) {
    const deadline = Date.now() + timeout
    for (;;) {
        if (!(await firstVisible(page.getByText(value, { exact })))) return true
        if (Date.now() > deadline) return false
        await sleep(100)
    }
}

export async function need(page, value, options) {
    if (!(await seen(page, value, options))) throw new Error(`"${String(value)}" 안 보임`)
}
export async function needGone(page, value, options) {
    if (!(await unseen(page, value, options))) throw new Error(`"${String(value)}" 계속 보임`)
}

/** 보이는 글자 요소 하나 (없으면 오류) */
export async function textOf(page, value, options = {}) {
    await need(page, value, options)
    return firstVisible(page.getByText(value, { exact: options.exact ?? false }))
}

async function byRoles(page, name, roles) {
    for (const role of roles) {
        const found = await firstVisible(page.getByRole(role, { name, exact: true }))
        if (found) return found
    }
    return null
}

/** 버튼. 접근성 정보로 먼저 찾고, 없으면 글자로 찾습니다. */
export async function button(page, name, { timeout = 4000 } = {}) {
    const deadline = Date.now() + timeout
    for (;;) {
        const found =
            (await byRoles(page, name, ['button'])) ??
            (await firstVisible(page.getByText(name, { exact: true })))
        if (found) return found
        if (Date.now() > deadline) throw new Error(`"${name}" 버튼 없음`)
        await sleep(100)
    }
}
export async function hasButton(page, name) {
    return (await byRoles(page, name, ['button'])) !== null
}

/** 메뉴 항목. 버튼, 탭, 링크 어느 것으로 만들었든 찾습니다. */
export async function menuItem(page, name) {
    const found = await byRoles(page, name, ['tab', 'link', 'button', 'radio', 'menuitem', 'menuitemradio'])
    if (!found) throw new Error(`메뉴 항목 "${name}" 없음`)
    return found
}

/** 메뉴에서 화면을 고르고, 그 화면의 글자가 보일 때까지 기다립니다. */
export async function goTo(page, name, readyText) {
    const item = await menuItem(page, name)
    await item.click()
    if (readyText && !(await seen(page, readyText, { timeout: 8000 }))) {
        throw new Error(`"${name}" 화면에서 ${String(readyText)}이(가) 안 보임`)
    }
}

/** 라벨로 입력란 찾기 */
export async function field(page, label, { timeout = 4000 } = {}) {
    const deadline = Date.now() + timeout
    for (;;) {
        const found = await firstVisible(page.getByLabel(label, { exact: true }))
        if (found) return found
        if (Date.now() > deadline) throw new Error(`라벨 "${label}"인 입력란 없음`)
        await sleep(100)
    }
}

/** 여럿 중 하나를 고르는 컨트롤(라디오, 버튼, 탭, select)에서 name을 고릅니다. */
export async function choose(page, name) {
    const found = await byRoles(page, name, ['radio', 'tab', 'button', 'menuitemradio'])
    if (found) {
        await found.click({ force: true })
        return found
    }
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: name }) })
    if ((await select.count()) > 0) {
        await select.first().selectOption({ label: name })
        return select.first()
    }
    const label = await firstVisible(page.locator('label').filter({ hasText: name }))
    if (label) {
        await label.click()
        return label
    }
    throw new Error(`"${name}"을(를) 고를 컨트롤 없음`)
}

/** 선택 상태를 접근성 정보로 드러내는가 */
export const isMarkedSelected = (locator) =>
    locator.evaluate((element) => {
        const candidates = [element, ...element.querySelectorAll('input')]
        if (element.tagName === 'SELECT') return true
        return candidates.some(
            (node) =>
                ['aria-pressed', 'aria-selected', 'aria-checked'].some((name) => node.getAttribute(name) === 'true') ||
                (node.getAttribute('aria-current') ?? 'false') !== 'false' ||
                node.checked === true,
        )
    })

/** rowText가 든 줄에서 이름이 buttonName인 버튼 */
export async function rowButton(page, rowText, buttonName) {
    const buttons = page.getByRole('button', { name: buttonName })
    const count = await buttons.count()
    let best = null
    let bestDistance = Infinity
    for (let i = 0; i < count; i += 1) {
        const candidate = buttons.nth(i)
        if (!(await candidate.isVisible().catch(() => false))) continue
        const distance = await candidate.evaluate((element, wanted) => {
            let steps = 0
            for (let node = element; node; node = node.parentElement) {
                if ((node.textContent ?? '').includes(wanted)) return steps
                steps += 1
            }
            return 9999
        }, rowText)
        if (distance < bestDistance) {
            best = candidate
            bestDistance = distance
        }
    }
    if (!best) throw new Error(`"${rowText}" 줄에 ${String(buttonName)} 버튼 없음`)
    return best
}

export async function clickAt(page, locator) {
    const box = await locator.boundingBox()
    if (!box) throw new Error('누를 대상의 위치를 알 수 없음')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** 사람이 버튼을 두 번 연달아 누름 */
export async function doubleClickAt(page, locator) {
    const box = await locator.boundingBox()
    if (!box) throw new Error('누를 대상의 위치를 알 수 없음')
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.click(x, y)
    await sleep(90)
    await page.mouse.click(x, y)
}

/** 실패를 사용자에게 알렸는가: 글자가 든 role=alert가 보이거나 실패를 뜻하는 문장이 보임 */
export async function isFailureReported(page) {
    const alerts = page.getByRole('alert')
    for (let i = 0; i < (await alerts.count()); i += 1) {
        const alert = alerts.nth(i)
        if ((await alert.isVisible()) && (await alert.innerText()).trim() !== '') return true
    }
    return (await firstVisible(page.getByText(/못했습니다|오류|실패/))) !== null
}
export async function waitForFailureReport(page, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        if (await isFailureReported(page)) return true
        await sleep(300)
    }
    return false
}

export const isDisabled = (locator) =>
    locator.evaluate((element) => element.disabled === true || element.getAttribute('aria-disabled') === 'true')

/** 버튼이 다시 눌릴 수 있게 될 때까지 기다립니다 */
export async function waitEnabled(locator, timeoutMs = 4000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        if (!(await isDisabled(locator))) return true
        await sleep(100)
    }
    return false
}

export const overflowPx = (page) =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

/** 글자색과 그 뒤 배경색의 명암비. 색은 캔버스로 정규화합니다. */
export async function contrastOf(locator) {
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
            background: background.slice(0, 3).map(Math.round),
        }
    })
}

/** 여러 요소의 명암비를 재서 4.5 미만인 것을 오류로 냅니다 */
export async function needContrast(targets) {
    const low = []
    for (const [name, locator] of Object.entries(targets)) {
        const result = await contrastOf(locator)
        if (result.ratio < 4.5) low.push(`${name} ${result.ratio}:1`)
    }
    if (low.length > 0) throw new Error(`명암비 4.5 미만: ${low.join(', ')}`)
}

/** Tab을 눌러 가며 조건에 맞는 요소에 포커스가 닿게 합니다 */
export async function tabUntil(page, { includes, excludes = [], max = 40 }) {
    for (let i = 0; i < max; i += 1) {
        await page.keyboard.press('Tab')
        const isFound = await page.evaluate(
            ([wanted, unwanted]) => {
                const active = document.activeElement
                if (!active || active === document.body) return false
                const label = `${active.textContent ?? ''} ${active.getAttribute('aria-label') ?? ''}`
                return label.includes(wanted) && unwanted.every((value) => !label.includes(value))
            },
            [includes, excludes],
        )
        if (isFound) return true
    }
    return false
}

// ---------- 검사 틀 ----------
const checks = []
const cleanRunErrors = []
export const define = (group, id, title, run) => checks.push({ group, id, title, run })

export async function withPage(options, body, { expectClean = false } = {}) {
    const session = await openPage(options)
    try {
        await body(session.page)
        if (expectClean) cleanRunErrors.push(...session.consoleErrors)
    } finally {
        await session.context.close()
    }
}

/** 정의한 검사를 차례로 돌리고 결과를 파일로 남깁니다 */
export async function runChecks(fileName, { only = null } = {}) {
    const results = []
    for (const check of checks) {
        if (only && !only.some((prefix) => check.id.startsWith(prefix))) continue
        const started = Date.now()
        let isOk = true
        let note = ''
        try {
            await check.run()
        } catch (error) {
            isOk = false
            note = String(error instanceof Error ? error.message : error).split('\n')[0].slice(0, 240)
        }
        results.push({ group: check.group, id: check.id, title: check.title, isOk, note, ms: Date.now() - started })
        console.log(`${isOk ? 'O' : 'X'} ${check.id} ${check.title}${note ? ` — ${note}` : ''}`)
    }
    const unique = [...new Set(cleanRunErrors)]
    const groups = [...new Set(results.map((r) => r.group))]
    const summary = Object.fromEntries(
        groups.map((group) => {
            const inGroup = results.filter((r) => r.group === group)
            return [group, `${inGroup.filter((r) => r.isOk).length}/${inGroup.length}`]
        }),
    )
    fs.writeFileSync(
        path.join(outDir, fileName),
        JSON.stringify({ summary, consoleErrors: unique, results }, null, 2),
    )
    console.log(`\n${Object.entries(summary).map(([group, score]) => `${group} ${score}`).join(', ')}` +
        `${unique.length ? `, 콘솔 에러 ${unique.length}종: ${unique[0]}` : ''}`)
    return results
}
