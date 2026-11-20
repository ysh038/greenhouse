// 로그인과 게시판 관리 화면 채점. 구현을 모르는 채로 브라우저에서 화면만 보고 검사합니다.
//   node tools/compare/board/accept.mjs <앱 폴더> <결과 폴더> <포트> [검사 id 앞글자...]
// 가짜 서버를 에이전트가 직접 만드는 과제라서, 서버를 바깥에서 조작하지 않고 화면 조작만으로 검사합니다.
import fs from 'node:fs'
import path from 'node:path'

import {
    button,
    define,
    doubleClickAt,
    field,
    firstVisible,
    need,
    needContrast,
    needGone,
    openPage,
    outDir,
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

const [appDir, resultDir, port, ...only] = process.argv.slice(2)

const EMAIL = 'admin@example.com'
const PASSWORD = 'greenhouse1'
const WRONG = '이메일 또는 비밀번호가 올바르지 않습니다'
const ASK = '이 게시글을 삭제할까요?'
const FIRST = '봄맞이 분갈이 안내'
const SECOND = '온실 휴무일 공지'
const HIDDEN = '지난 행사 사진'

const heading = async (page, name) => {
    const found = await firstVisible(page.getByRole('heading', { name, exact: true }))
    if (!found) {
        await sleep(600)
        const again = await firstVisible(page.getByRole('heading', { name, exact: true }))
        if (!again) throw new Error(`제목 "${name}" 없음`)
        return again
    }
    return found
}

async function fillLogin(page, password = PASSWORD) {
    await (await field(page, '이메일')).fill(EMAIL)
    await (await field(page, '비밀번호')).fill(password)
}

async function login(page, password = PASSWORD) {
    await fillLogin(page, password)
    await (await button(page, '로그인')).click()
}

/** 로그인해서 목록이 보일 때까지 */
async function enter(page) {
    await login(page)
    await need(page, FIRST, { timeout: 8000 })
}

/** 글 한 줄에 보이는 글자와 버튼 이름 */
async function rowInfo(page, title) {
    const cell = await textOf(page, title, { exact: true })
    return cell.evaluate((element) => {
        let node = element
        while (node.parentElement && ![...node.querySelectorAll('button')].some((b) => /삭제/.test(b.textContent ?? b.getAttribute('aria-label') ?? ''))) {
            node = node.parentElement
        }
        return {
            text: node.innerText,
            buttons: [...node.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim() || (b.getAttribute('aria-label') ?? '')),
        }
    })
}

async function waitRow(page, title, test, message) {
    const deadline = Date.now() + 4000
    for (;;) {
        const info = await rowInfo(page, title)
        if (test(info)) return info
        if (Date.now() > deadline) throw new Error(`${message} (줄: ${info.text.replace(/\s+/g, ' ')} / 버튼: ${info.buttons.join(', ')})`)
        await sleep(100)
    }
}

/** 줄의 "삭제"를 누르고 확인 창에 답합니다. 브라우저 기본 확인 창과 화면 안의 확인 창을 모두 다룹니다. */
async function askDelete(page, title, answer, { onOpen } = {}) {
    const native = []
    const onDialog = (dialog) => {
        native.push(dialog.message())
        void (answer === '삭제' ? dialog.accept() : dialog.dismiss())
    }
    page.on('dialog', onDialog)
    try {
        await (await rowButton(page, title, /삭제/)).click()
        await sleep(150)
        if (native.length > 0) {
            if (!native[0].includes(ASK)) throw new Error(`확인 창 문구가 다름: ${native[0]}`)
            return 'native'
        }
        await need(page, ASK)
        await onOpen?.()
        if (answer === 'escape') {
            await page.keyboard.press('Escape')
        } else {
            await (await rowButton(page, ASK, new RegExp(`^${answer}$`))).click()
        }
        return 'in-page'
    } finally {
        page.off('dialog', onDialog)
    }
}

const shot = (page, name) => {
    fs.mkdirSync(path.join(outDir, 'shots'), { recursive: true })
    return page.screenshot({ path: path.join(outDir, 'shots', `${name}.png`), fullPage: true })
}

// ---------- 적힌 요구 ----------
define('적힌 요구', 'L1', '로그인 화면에 제목, 입력란 둘, 버튼이 있다', () =>
    withPage({}, async (page) => {
        await heading(page, '로그인')
        await field(page, '이메일')
        await field(page, '비밀번호')
        await button(page, '로그인')
        if (await seen(page, '게시판 관리', { timeout: 300 })) throw new Error('로그인 전에 게시판 관리가 보임')
        await shot(page, '1-로그인--desktop-light')
    }))

define('적힌 요구', 'L2', '틀린 비밀번호면 안내 문구가 보이고 로그인 화면에 남는다', () =>
    withPage({}, async (page) => {
        await login(page, 'wrong-password')
        await need(page, WRONG)
        await heading(page, '로그인')
        if (await seen(page, '게시판 관리', { timeout: 300 })) throw new Error('게시판 관리로 넘어감')
        await shot(page, '2-로그인 실패--desktop-light')
    }))

define('적힌 요구', 'L3', '요청을 보내는 동안 로그인 버튼을 누를 수 없다', () =>
    withPage({}, async (page) => {
        await fillLogin(page)
        const handle = await (await button(page, '로그인')).elementHandle()
        await handle.click()
        let wasDisabled = false
        for (let i = 0; i < 6 && !wasDisabled; i += 1) {
            wasDisabled = await handle
                .evaluate((el) => !el.isConnected || el.disabled === true || el.getAttribute('aria-disabled') === 'true')
                .catch(() => true)
            await sleep(40)
        }
        if (!wasDisabled) throw new Error('요청 중에도 버튼이 눌릴 수 있는 상태')
    }))

define('적힌 요구', 'L4', '로그인에 성공하면 게시판 관리 화면, 이름, 로그아웃 버튼이 보인다', () =>
    withPage({}, async (page) => {
        await login(page)
        await heading(page, '게시판 관리').catch(async () => {
            await need(page, FIRST, { timeout: 8000 })
            await heading(page, '게시판 관리')
        })
        await need(page, '관리자님')
        await button(page, '로그아웃')
    }))

define('적힌 요구', 'P1', '불러오는 동안 "불러오는 중"이 보인다', () =>
    withPage({}, async (page) => {
        await login(page)
        await need(page, '불러오는 중', { timeout: 3000 })
        await need(page, FIRST, { timeout: 8000 })
        await needGone(page, '불러오는 중')
    }))

define('적힌 요구', 'P2', '목록에 제목, 작성자, 작성일, 숨김 표시가 있다', () =>
    withPage({}, async (page) => {
        await enter(page)
        const rows = [
            [FIRST, '관리자', '2026-03-02', false],
            [SECOND, '김하늘', '2026-03-10', false],
            [HIDDEN, '이도윤', '2026-02-14', true],
        ]
        for (const [title, author, date, isHidden] of rows) {
            const info = await rowInfo(page, title)
            if (!info.text.includes(author)) throw new Error(`"${title}" 줄에 작성자 ${author} 없음`)
            if (!info.text.includes(date)) throw new Error(`"${title}" 줄에 작성일 ${date} 없음: ${info.text.replace(/\s+/g, ' ')}`)
            if (info.text.includes('숨김') !== isHidden) throw new Error(`"${title}" 줄의 숨김 표시가 틀림`)
            const wanted = isHidden ? '보이기' : '숨기기'
            if (!info.buttons.some((name) => name.includes(wanted))) throw new Error(`"${title}" 줄에 ${wanted} 버튼 없음`)
        }
        await shot(page, '3-게시판 관리--desktop-light')
    }))

define('적힌 요구', 'P3', '글을 추가하면 목록에 보이고 입력란이 비워진다', () =>
    withPage({}, async (page) => {
        await enter(page)
        const input = await field(page, '제목')
        await input.fill('새 화분 입고 안내')
        await (await button(page, '추가')).click()
        await waitRow(page, '새 화분 입고 안내', (info) => info.text.includes('관리자'), '추가한 글의 작성자가 관리자가 아님')
        const deadline = Date.now() + 3000
        while ((await input.inputValue()) !== '') {
            if (Date.now() > deadline) throw new Error('입력란이 비워지지 않음')
            await sleep(100)
        }
    }))

define('적힌 요구', 'P4', '제목이 비어 있으면 "제목을 입력해 주세요"가 보인다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await (await button(page, '추가')).click()
        await need(page, '제목을 입력해 주세요')
    }))

define('적힌 요구', 'P5', '숨기기와 보이기로 숨김 여부가 바뀐다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await (await rowButton(page, SECOND, /숨기기/)).click()
        await waitRow(page, SECOND, (info) => info.text.includes('숨김') && info.buttons.some((n) => n.includes('보이기')), '숨긴 뒤 표시가 안 바뀜')
        await (await rowButton(page, SECOND, /보이기/)).click()
        await waitRow(page, SECOND, (info) => !info.text.includes('숨김') && info.buttons.some((n) => n.includes('숨기기')), '보이게 한 뒤 표시가 안 바뀜')
    }))

define('적힌 요구', 'P6', '삭제를 누르면 확인 창이 뜨고, 취소하면 글이 그대로다', () =>
    withPage({}, async (page) => {
        await enter(page)
        const kind = await askDelete(page, SECOND, '취소')
        if (kind === 'in-page') await needGone(page, ASK)
        await sleep(700)
        await need(page, SECOND)
    }))

define('적힌 요구', 'P7', '확인 창에서 삭제를 누르면 글이 지워진다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await askDelete(page, SECOND, '삭제', { onOpen: () => shot(page, '4-삭제 확인--desktop-light') })
        await needGone(page, SECOND)
        await need(page, FIRST)
    }))

define('적힌 요구', 'P8', '글을 모두 지우면 "게시글이 없습니다"가 보인다', () =>
    withPage({}, async (page) => {
        await enter(page)
        for (const title of [FIRST, SECOND, HIDDEN]) {
            await askDelete(page, title, '삭제')
            await needGone(page, title)
        }
        await need(page, '게시글이 없습니다')
    }))

define('적힌 요구', 'S1', '로그아웃하면 로그인 화면으로 돌아간다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await (await button(page, '로그아웃')).click()
        await heading(page, '로그인')
        await needGone(page, '게시판 관리')
    }))

define('적힌 요구', 'S2', '로그인한 채로 새로고침하면 로그인이 유지된다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await page.reload({ waitUntil: 'load' })
        await need(page, FIRST, { timeout: 8000 })
        await need(page, '관리자님')
    }))

define('적힌 요구', 'S3', '너비 375px에서 가로로 넘치지 않는다', () =>
    withPage({ width: 375, height: 760 }, async (page) => {
        await heading(page, '로그인')
        const loginOverflow = await overflowPx(page)
        await shot(page, '1-로그인--mobile-light')
        await enter(page)
        const boardOverflow = await overflowPx(page)
        await shot(page, '3-게시판 관리--mobile-light')
        if (loginOverflow > 1 || boardOverflow > 1) throw new Error(`가로 넘침: 로그인 ${loginOverflow}px, 게시판 ${boardOverflow}px`)
        for (const name of ['숨기기', '삭제']) {
            const target = await rowButton(page, FIRST, new RegExp(name))
            const box = await target.boundingBox()
            if (!box || box.x < 0 || box.x + box.width > 376) throw new Error(`"${name}" 버튼이 화면 밖에 있음`)
        }
    }))

define('적힌 요구', 'S4', '어두운 화면에서 글자의 명암비가 4.5 이상이다', () =>
    withPage({ colorScheme: 'dark' }, async (page) => {
        const loginHeading = await heading(page, '로그인')
        const emailLabel = await textOf(page, '이메일', { exact: true })
        await needContrast({ '로그인 제목': loginHeading, '이메일 라벨': emailLabel })
        const background = await page.evaluate(() => {
            const read = (el) => getComputedStyle(el).backgroundColor
            return [read(document.body), read(document.documentElement)]
        })
        await shot(page, '1-로그인--desktop-dark')
        await enter(page)
        await needContrast({
            '게시판 제목': await heading(page, '게시판 관리'),
            '글 제목': await textOf(page, FIRST, { exact: true }),
            작성자: await textOf(page, '김하늘', { exact: true }),
        })
        await shot(page, '3-게시판 관리--desktop-dark')
        const isLight = background.every((color) => {
            const parts = color.match(/[\d.]+/g)?.map(Number) ?? []
            if (parts.length === 4 && parts[3] === 0) return true
            return parts.slice(0, 3).reduce((sum, value) => sum + value, 0) > 600
        })
        if (isLight && background.some((color) => !/, 0\)$/.test(color))) throw new Error(`어두운 화면인데 배경이 밝음: ${background.join(' / ')}`)
    }))

// ---------- 적지 않은 견고성 ----------
define('적지 않은 견고성', 'R1', '비밀번호 입력란이 글자를 가린다', () =>
    withPage({}, async (page) => {
        const type = await (await field(page, '비밀번호')).getAttribute('type')
        if (type !== 'password') throw new Error(`type="${type}"`)
    }))

define('적지 않은 견고성', 'R2', 'Enter 키로 로그인할 수 있다', () =>
    withPage({}, async (page) => {
        await fillLogin(page)
        await page.keyboard.press('Enter')
        await need(page, FIRST, { timeout: 8000 })
    }))

define('적지 않은 견고성', 'R3', 'Enter 키로 글을 추가할 수 있다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await (await field(page, '제목')).fill('엔터로 추가한 글')
        await page.keyboard.press('Enter')
        await need(page, '엔터로 추가한 글')
    }))

define('적지 않은 견고성', 'R4', '추가 버튼을 연달아 두 번 눌러도 글이 하나만 생긴다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await (await field(page, '제목')).fill('두 번 누른 글')
        await doubleClickAt(page, await button(page, '추가'))
        await need(page, '두 번 누른 글')
        await sleep(1500)
        const count = await page.getByText('두 번 누른 글', { exact: true }).count()
        if (count !== 1) throw new Error(`글이 ${count}개 생김`)
    }))

define('적지 않은 견고성', 'R5', '로그아웃한 뒤 새로고침해도 로그인 화면이다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await (await button(page, '로그아웃')).click()
        await heading(page, '로그인')
        await page.reload({ waitUntil: 'load' })
        await heading(page, '로그인')
        if (await seen(page, '게시판 관리', { timeout: 1200 })) throw new Error('새로고침하니 게시판 관리가 보임')
    }))

define('적지 않은 견고성', 'R6', '로그인 실패를 스크린 리더에 알린다', () =>
    withPage({}, async (page) => {
        await login(page, 'wrong-password')
        const message = await textOf(page, WRONG)
        const isLive = await message.evaluate((element) => {
            for (let node = element; node; node = node.parentElement) {
                const role = node.getAttribute('role')
                const live = node.getAttribute('aria-live')
                if (role === 'alert' || role === 'status' || (live && live !== 'off')) return true
            }
            const id = element.id || element.closest('[id]')?.id
            return Boolean(id && document.querySelector(`[aria-describedby~="${id}"], [aria-errormessage="${id}"]`))
        })
        if (!isLive) throw new Error('role=alert, aria-live, aria-describedby 어느 것도 없음')
    }))

define('적지 않은 견고성', 'R7', '틀린 뒤 맞는 비밀번호로 다시 로그인하면 실패 문구 없이 들어간다', () =>
    withPage({}, async (page) => {
        await login(page, 'wrong-password')
        await need(page, WRONG)
        const loginButton = await button(page, '로그인')
        const deadline = Date.now() + 3000
        while (await loginButton.isDisabled().catch(() => false)) {
            if (Date.now() > deadline) throw new Error('실패 뒤 로그인 버튼이 계속 잠겨 있음')
            await sleep(100)
        }
        await login(page)
        await need(page, FIRST, { timeout: 8000 })
        if (await seen(page, WRONG, { timeout: 300 })) throw new Error('들어간 뒤에도 실패 문구가 보임')
    }))

define('적지 않은 견고성', 'R8', '확인 창을 Escape 키로 닫을 수 있고 글이 그대로다', () =>
    withPage({}, async (page) => {
        await enter(page)
        const kind = await askDelete(page, SECOND, 'escape')
        if (kind === 'in-page') await needGone(page, ASK, { timeout: 2000 })
        await need(page, SECOND)
    }))

define('적지 않은 견고성', 'R9', '확인 창이 열리면 포커스가 창 안으로 간다', () =>
    withPage({}, async (page) => {
        await enter(page)
        const native = []
        const remember = (dialog) => {
            native.push(dialog.message())
            void dialog.dismiss()
        }
        page.on('dialog', remember)
        await (await rowButton(page, SECOND, /삭제/)).click()
        await sleep(300)
        page.off('dialog', remember)
        if (native.length > 0) return
        const where = await page.evaluate((ask) => {
            const active = document.activeElement
            if (!active || active === document.body) return 'body'
            for (let node = active; node; node = node.parentElement) {
                if ((node.textContent ?? '').includes(ask)) return node === document.body || node.id === 'root' ? 'outside' : 'inside'
            }
            return 'outside'
        }, ASK)
        if (where !== 'inside') throw new Error(`포커스 위치: ${where}`)
    }))

define('적지 않은 견고성', 'R10', '삭제를 확인한 뒤 숨기기를 눌러도 다른 글이 바뀌지 않는다', () =>
    withPage({}, async (page) => {
        await enter(page)
        await askDelete(page, FIRST, '삭제')
        await needGone(page, FIRST)
        await (await rowButton(page, SECOND, /숨기기/)).click()
        await waitRow(page, SECOND, (info) => info.text.includes('숨김'), '숨김 표시가 안 생김')
        const other = await rowInfo(page, HIDDEN)
        if (!other.text.includes('숨김')) throw new Error('다른 글의 숨김 표시가 바뀜')
    }))

define('적지 않은 견고성', 'R11', '처음부터 끝까지 쓰는 동안 콘솔 에러가 없다', () =>
    withPage({}, async (page) => {
        await login(page, 'wrong-password')
        await need(page, WRONG)
        await sleep(300)
        await enter(page)
        await (await field(page, '제목')).fill('콘솔 확인용 글')
        await (await button(page, '추가')).click()
        await need(page, '콘솔 확인용 글')
        await (await rowButton(page, '콘솔 확인용 글', /숨기기/)).click()
        await waitRow(page, '콘솔 확인용 글', (info) => info.text.includes('숨김'), '숨김 표시가 안 생김')
        await askDelete(page, '콘솔 확인용 글', '삭제')
        await needGone(page, '콘솔 확인용 글')
        await (await button(page, '로그아웃')).click()
        await heading(page, '로그인')
    }, { expectClean: true }))

// ---------- 참고 (점수 없음) ----------
const notes = {}

define('참고', 'N1', '저장된 로그인 정보를 망가뜨리고 새로고침하면 무엇이 보이는가', () =>
    withPage({}, async (page) => {
        await enter(page)
        notes.storage = await page.evaluate(() => {
            const dump = (storage) => Object.fromEntries(Object.keys(storage).map((key) => [key, String(storage.getItem(key)).slice(0, 160)]))
            return { localStorage: dump(localStorage), sessionStorage: dump(sessionStorage), cookie: document.cookie.slice(0, 160) }
        })
        await page.evaluate(() => {
            const breakTokens = (value) => {
                if (Array.isArray(value)) return value.map(breakTokens)
                if (value && typeof value === 'object') {
                    return Object.fromEntries(
                        Object.entries(value).map(([key, inner]) => [key, typeof inner === 'string' && /token/i.test(key) ? 'broken-token' : breakTokens(inner)]),
                    )
                }
                return value
            }
            for (const storage of [localStorage, sessionStorage]) {
                for (const key of Object.keys(storage)) {
                    const raw = storage.getItem(key) ?? ''
                    try {
                        const parsed = JSON.parse(raw)
                        storage.setItem(key, typeof parsed === 'string' ? JSON.stringify('broken-token') : JSON.stringify(breakTokens(parsed)))
                    } catch {
                        storage.setItem(key, 'broken-token')
                    }
                }
            }
        })
        await page.reload({ waitUntil: 'load' })
        await sleep(2500)
        notes.afterBrokenToken = {
            login: await seen(page, '로그인', { timeout: 200, exact: true }),
            board: await seen(page, '게시판 관리', { timeout: 200 }),
            failed: await seen(page, '게시글을 불러오지 못했습니다', { timeout: 200 }),
            posts: await seen(page, FIRST, { timeout: 200 }),
        }
        await shot(page, '5-망가진 로그인 정보--desktop-light')
    }))

define('참고', 'N2', '요청이 어떤 길로 나가는가', async () => {
    const session = await openPage({})
    try {
        const { page } = session
        const network = []
        page.on('request', (request) => {
            if (new URL(request.url()).pathname.startsWith('/api/')) network.push(`${request.method()} ${new URL(request.url()).pathname}`)
        })
        await page.addInitScript(() => {
            window.__seenFetch = []
            let inner = window.fetch
            const outer = function (input, init) {
                const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
                window.__seenFetch.push(`${(init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()} ${url}`)
                return inner.call(this, input, init)
            }
            Object.defineProperty(window, 'fetch', {
                configurable: true,
                get: () => outer,
                set: (next) => {
                    inner = next
                },
            })
        })
        await page.reload({ waitUntil: 'load' })
        await enter(page)
        notes.requests = { globalFetch: await page.evaluate(() => window.__seenFetch), network }
    } finally {
        await session.context.close()
    }
})

await setup(appDir, resultDir, Number(port))
try {
    await runChecks('accept.json', { only: only.length > 0 ? only : null })
    fs.writeFileSync(path.join(outDir, 'notes.json'), JSON.stringify(notes, null, 2))
    console.log(JSON.stringify(notes, null, 2))
} finally {
    await teardown()
}
