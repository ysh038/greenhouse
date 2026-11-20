// 화면 시나리오(*.verify.ts)를 실제 브라우저에서 돌려 스크린샷과 보고서를 남깁니다.
//   pnpm verify            모든 시나리오
//   pnpm verify invites    경로에 "invites"가 들어간 시나리오만
//
// 새로 생겼거나 달라진 스크린샷은 모아 보기(evidence/review/)로 만들어 검토를 요구합니다.
// 검토는 `pnpm verify:review`로 기록하고, 검토가 남아 있으면 이 명령은 실패로 끝납니다.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { chromium } from 'playwright-core'
import { createServer } from 'vite'

import {
    buildSheets,
    evidenceDir as outDir,
    looksSame,
    readStore,
    reviewedDir,
    rootDir,
    writeStore,
} from './lib/review.mjs'

const appDir = path.join(rootDir, 'apps/sample')
const filter = process.argv[2] ?? ''

const STEP_TIMEOUT_MS = 5000

// 화면이 바뀌는 중에 찍으면 잘리거나 밀린 사진이 나옵니다.
// DOM이 0.5초 동안 변하지 않을 때까지(최대 5초) 기다린 뒤 찍습니다.
// 그보다 오래 걸리는 불러오기는 시나리오에서 see로 기다려야 합니다.
const WAIT_UNTIL_QUIET = `new Promise((resolve) => {
    let quiet = setTimeout(finish, 500)
    const limit = setTimeout(finish, 5000)
    const observer = new MutationObserver(() => {
        clearTimeout(quiet)
        quiet = setTimeout(finish, 500)
    })
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
    })
    function finish() {
        observer.disconnect()
        clearTimeout(quiet)
        clearTimeout(limit)
        resolve()
    }
})`

const VARIANTS = {
    'desktop-light': {
        viewport: { width: 1280, height: 800 },
        colorScheme: 'light',
        deviceScaleFactor: 1,
    },
    'desktop-dark': {
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark',
        deviceScaleFactor: 1,
    },
    'mobile-light': {
        viewport: { width: 375, height: 812 },
        colorScheme: 'light',
        deviceScaleFactor: 2,
    },
}

function findScenarioFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return findScenarioFiles(full)
        return entry.name.endsWith('.verify.ts') ? [full] : []
    })
}

/** 폴더 안(하위 폴더 포함)의 파일 이름을 모읍니다. */
function listFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? listFiles(full) : [full]
    })
}

/**
 * 화면 코드(.tsx)가 있는데 시나리오(*.verify.ts)가 하나도 없는 기능 폴더를 찾습니다.
 * 기능 폴더는 src 바로 아래의 폴더입니다. src에 바로 놓인 파일(App.tsx, main.tsx)은 보지 않습니다.
 */
function findFoldersWithoutScenario(srcDir) {
    return fs
        .readdirSync(srcDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(srcDir, entry.name))
        .filter((folder) => {
            const names = listFiles(folder)
            const hasScreen = names.some(
                (name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'),
            )
            return hasScreen && !names.some((name) => name.endsWith('.verify.ts'))
        })
        .map((folder) => path.relative(rootDir, folder))
        .sort()
}

function locate(page, target) {
    const base = target.within === undefined ? page : locate(page, target.within)
    let locator
    if ('role' in target) {
        locator = base.getByRole(
            target.role,
            target.name === undefined ? {} : { name: target.name, exact: true },
        )
    } else if ('label' in target) {
        locator = base.getByLabel(target.label, { exact: true })
    } else {
        locator = base.getByText(target.text, { exact: true })
    }
    return target.closest === undefined
        ? locator
        : locator.locator(`xpath=ancestor::${target.closest}[1]`)
}

const REQUEST_PATTERN = /^(GET|POST|PUT|PATCH|DELETE) (\/[^\s?]*)$/

/** 'GET /api/tasks/*' 같은 글자를 메서드와 경로 검사로 바꿉니다. */
function parseRequestPattern(pattern) {
    const match = REQUEST_PATTERN.exec(pattern)
    if (!match) {
        throw new Error(
            `가로챌 요청은 "GET /api/tasks"처럼 메서드와 경로로 적습니다 (쿼리는 빼고, 한 칸은 *로 대신할 수 있음). 받은 값: "${pattern}"`,
        )
    }
    const [, method, pathPattern] = match
    const parts = pathPattern.split('/')
    return {
        method,
        matchesPath: (pathname) => {
            const actual = pathname.split('/')
            return (
                actual.length === parts.length &&
                parts.every((part, index) => part === '*' || part === actual[index])
            )
        },
    }
}

function firstLine(error) {
    const message = error instanceof Error ? error.message : String(error)
    return message.split('\n').slice(0, 3).join(' ').replaceAll(/\s+/g, ' ').trim()
}

async function runVariant({ browser, baseUrl, scenario, folder, variantName }) {
    const variant = VARIANTS[variantName]
    const context = await browser.newContext({
        ...variant,
        reducedMotion: 'reduce',
        // 실행마다 다른 값을 보냅니다. 서버가 이 값으로 데이터를 따로 두면
        // 동시에 도는 실행이 서로 영향을 주지 않습니다 (샘플 앱의 가짜 서버가 그렇게 합니다).
        extraHTTPHeaders: {
            'x-verify-run': `${variantName}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
    })
    const page = await context.newPage()
    page.setDefaultTimeout(STEP_TIMEOUT_MS)

    const shots = []
    const problems = []
    const consoleErrors = []
    // 콘솔 메시지의 인자를 읽는 일은 비동기라서, 끝나기를 기다렸다가 문제를 셉니다.
    const pendingConsoleReads = []
    page.on('console', (message) => {
        if (message.type() !== 'error') return
        const text = message.text()
        // 서버가 실패 응답을 주면 브라우저가 남기는 메시지입니다. 주소도 메서드도 없어서
        // 아래 response에서 "응답 400: POST /api/tasks" 모양으로 대신 남깁니다.
        if (text.startsWith('Failed to load resource: the server responded')) return
        if (text.startsWith('Failed to load resource')) {
            consoleErrors.push(`${text} (${message.location().url})`)
            return
        }
        // React는 console.error('%o\n\n%s', 에러, 설명)처럼 남깁니다. text()는 서식 글자만 주므로
        // 인자를 하나씩 글자로 바꿔 붙입니다.
        pendingConsoleReads.push(
            Promise.all(
                message.args().map((arg) =>
                    arg
                        .evaluate((value) =>
                            value instanceof Error
                                ? `${value.name}: ${value.message}`
                                : String(value),
                        )
                        .catch(() => ''),
                ),
            ).then((parts) => {
                const readable = parts
                    .filter((part) => !/^[%\s\w]*%[os][%\s\w]*$/.test(part))
                    .join(' ')
                    .trim()
                consoleErrors.push(readable === '' ? text : readable)
            }),
        )
    })
    // 가로채서 일부러 실패시킨 요청은 문제로 세지 않습니다.
    // 그 실패를 화면이 콘솔에 다시 남긴 것도, 메시지에 "GET /api/tasks"처럼 그 요청이 들어 있으면 세지 않습니다.
    const deliberatelyFailed = new WeakSet()
    const deliberatelyFailedNames = new Set()
    page.on('response', (response) => {
        const request = response.request()
        if (response.status() < 400 || deliberatelyFailed.has(request)) return
        consoleErrors.push(
            `응답 ${response.status()}: ${request.method()} ${new URL(request.url()).pathname}`,
        )
    })
    page.on('pageerror', (error) => {
        consoleErrors.push(String(error))
    })

    async function shot(name, options = {}) {
        const index = String(shots.length + 1).padStart(2, '0')
        const file = path.join(folder, `${index}--${variantName}.png`)
        const settings = { path: path.join(outDir, file), animations: 'disabled' }
        await page.evaluate(WAIT_UNTIL_QUIET)
        if (options.of === undefined) {
            await page.screenshot({ ...settings, fullPage: true })
        } else {
            await locate(page, options.of).screenshot(settings)
        }
        const overflowPx = await page.evaluate(
            'document.documentElement.scrollWidth - document.documentElement.clientWidth',
        )
        if (overflowPx > 0) {
            problems.push(`"${name}"에서 화면이 가로로 ${overflowPx}px 넘칩니다`)
        }
        shots.push({ name, file })
    }

    // ---- 요청 가로채기 ----
    const interceptions = []

    await page.route(
        (url) =>
            interceptions.some(
                (entry) => entry.isActive && entry.matchesPath(url.pathname),
            ),
        async (route) => {
            const request = route.request()
            const entry = interceptions.find(
                (candidate) =>
                    candidate.isActive &&
                    candidate.method === request.method() &&
                    candidate.matchesPath(new URL(request.url()).pathname),
            )
            if (!entry) {
                await route.fallback()
                return
            }
            entry.hitCount += 1
            if (entry.kind === 'hold') {
                entry.held.push(route)
                return
            }
            const status = entry.reply.status ?? 200
            if (status >= 400) {
                deliberatelyFailed.add(request)
                deliberatelyFailedNames.add(
                    `${request.method()} ${new URL(request.url()).pathname}`,
                )
            }
            await route.fulfill({
                status,
                contentType: 'application/json',
                body: entry.reply.body === undefined ? '' : JSON.stringify(entry.reply.body),
            })
        },
    )

    function intercept(pattern, kind, reply) {
        const entry = {
            ...parseRequestPattern(pattern),
            pattern,
            kind,
            reply,
            isActive: true,
            hitCount: 0,
            held: [],
        }
        interceptions.push(entry)
        return Promise.resolve({
            stop: async () => {
                entry.isActive = false
                // 붙잡아 둔 요청을 서버로 보냅니다. 그 사이 화면이 요청을 취소했으면 보낼 것이 없습니다.
                await Promise.all(
                    entry.held.splice(0).map((route) => route.continue().catch(() => undefined)),
                )
            },
        })
    }

    const api = {
        shot,
        reload: () => page.reload({ waitUntil: 'load' }),
        hold: (pattern) => intercept(pattern, 'hold'),
        fail: (pattern, status = 500) =>
            intercept(pattern, 'reply', { status, body: { code: 'VERIFY_FAILURE' } }),
        respond: (pattern, reply) => intercept(pattern, 'reply', reply),
        click: (target) => locate(page, target).click(),
        fill: (target, value) => locate(page, target).fill(value),
        press: (key) => page.keyboard.press(key),
        hover: (target) => locate(page, target).hover(),
        see: (target) => locate(page, target).waitFor({ state: 'visible' }),
        gone: (target) => locate(page, target).waitFor({ state: 'hidden' }),
    }

    try {
        await page.goto(new URL(scenario.path ?? '/', baseUrl).href, {
            waitUntil: 'load',
        })
        await scenario.steps(api)
        if (shots.length === 0) {
            problems.push(
                '스크린샷을 한 장도 남기지 않았습니다. 볼 만한 상태마다 page.shot을 부르세요',
            )
        }
        for (const entry of interceptions) {
            if (entry.hitCount === 0) {
                problems.push(
                    `"${entry.pattern}" 요청을 가로채도록 했지만 그런 요청이 오지 않았습니다`,
                )
            }
        }
    } catch (error) {
        problems.push(
            `단계 실패 (${shots.length}번째 스크린샷 다음): ${firstLine(error)}`,
        )
        await shot('실패한 순간').catch(() => undefined)
    }

    await Promise.all(pendingConsoleReads)
    const expected = scenario.expectedConsoleErrors ?? []
    let expectedCount = 0
    for (const text of consoleErrors) {
        if (expected.some((part) => text.includes(part))) {
            expectedCount += 1
        } else if ([...deliberatelyFailedNames].some((name) => text.includes(name))) {
            // 시나리오가 fail이나 respond로 낸 실패의 결과입니다.
        } else {
            problems.push(`콘솔 에러: ${firstLine(text)}`)
        }
    }

    await context.close()
    return {
        variantName,
        scale: variant.deviceScaleFactor,
        shots,
        problems,
        expectedCount,
    }
}

/**
 * 검토가 필요한 스크린샷을 고릅니다: 검토한 사본이 없거나, 사본과 눈에 띄게 다른 것.
 * 키는 시나리오 파일, 단계 이름, 화면 조건으로 만듭니다. 단계를 사이에 끼워 넣어도 다른 단계의 검토는 유지됩니다.
 */
async function findUnreviewed(browser, results, store) {
    const page = await browser.newPage()
    const unreviewed = []
    const currentKeys = new Set()
    try {
        for (const { file, scenario, runs } of results) {
            for (const run of runs) {
                const seen = new Map()
                for (const [index, shot] of run.shots.entries()) {
                    const occurrence = (seen.get(shot.name) ?? 0) + 1
                    seen.set(shot.name, occurrence)
                    const key = [
                        file,
                        occurrence === 1 ? shot.name : `${shot.name} (${occurrence})`,
                        run.variantName,
                    ].join(' :: ')
                    currentKeys.add(key)

                    const reviewed = store[key]
                    const reviewedPath = reviewed && path.join(reviewedDir, reviewed.file)
                    const hasCopy = reviewedPath !== undefined && fs.existsSync(reviewedPath)
                    if (
                        hasCopy &&
                        (await looksSame(
                            page,
                            fs.readFileSync(reviewedPath),
                            fs.readFileSync(path.join(outDir, shot.file)),
                        ))
                    ) {
                        continue
                    }
                    unreviewed.push({
                        key,
                        file: shot.file,
                        scenarioName: scenario.name,
                        folder: path.dirname(shot.file),
                        step: index + 1,
                        name: shot.name,
                        variant: run.variantName,
                        scale: run.scale,
                        isChanged: hasCopy,
                    })
                }
            }
        }
    } finally {
        await page.close()
    }
    // 단계마다 화면 조건이 나란히 놓이도록 정렬합니다.
    unreviewed.sort(
        (a, b) => a.folder.localeCompare(b.folder) || a.step - b.step,
    )
    return { unreviewed, currentKeys }
}

function gitState() {
    const run = (args) =>
        spawnSync('git', args, { cwd: rootDir, encoding: 'utf8' }).stdout.trim()
    const commit = run(['rev-parse', '--short', 'HEAD'])
    const isDirty = run(['status', '--porcelain']) !== ''
    return `${commit}${isDirty ? ' (커밋하지 않은 변경 있음)' : ''}`
}

function writeReport(results, startedAt, review, foldersWithoutScenario) {
    const shotCount = results
        .flatMap((result) => result.runs)
        .reduce((sum, run) => sum + run.shots.length, 0)
    const problemCount =
        foldersWithoutScenario.length +
        results
            .flatMap((result) => result.runs)
            .reduce((sum, run) => sum + run.problems.length, 0)

    const lines = [
        '# 검증 증거',
        '',
        `- 실행: ${startedAt.toLocaleString('sv-SE').slice(0, 16)}`,
        `- 코드: ${gitState()}`,
        `- 결과: 시나리오 ${results.length}개, 스크린샷 ${shotCount}장, 문제 ${problemCount}건`,
        '',
        '자동으로 잡는 것은 단계 실패, 콘솔 에러, 가로 넘침, 오지 않은 가로채기 대상뿐입니다. 모양이 맞는지는 스크린샷을 직접 보고 판단합니다.',
    ]

    if (foldersWithoutScenario.length > 0) {
        lines.push(
            '',
            '## 시나리오가 없는 화면',
            '',
            ...foldersWithoutScenario.map((folder) => `- \`${folder}\``),
        )
    }

    lines.push('', '## 스크린샷 검토', '')
    if (review === null) {
        lines.push('문제가 있어 검토 단계로 넘어가지 않았습니다. 문제를 먼저 고칩니다.')
    } else if (review.sheets.length === 0) {
        lines.push(
            `스크린샷 ${shotCount}장이 모두 검토한 것과 같습니다.`,
            '',
            ...review.notes.map((entry) => `- ${entry.at} (${entry.count}장): ${entry.note}`),
        )
    } else {
        lines.push(
            `검토가 남은 스크린샷 ${review.unreviewedCount}장을 모아 보기 ${review.sheets.length}장으로 만들었습니다.`,
            '',
            ...review.sheets.map((sheet) => `- \`${sheet.id}\`: ![](${sheet.file})`),
        )
    }

    for (const { file, scenario, runs } of results) {
        lines.push('', `## ${scenario.name}`, '', `\`${file}\``)

        const problems = runs.flatMap((run) =>
            run.problems.map((problem) => `- **${run.variantName}**: ${problem}`),
        )
        lines.push('', problems.length === 0 ? '문제 없음.' : '문제:', ...problems)

        const expectedCount = runs.reduce((sum, run) => sum + run.expectedCount, 0)
        if (expectedCount > 0) {
            lines.push(
                '',
                `예상된 콘솔 에러 ${expectedCount}건은 세지 않았습니다 (${(scenario.expectedConsoleErrors ?? []).join(', ')}).`,
            )
        }

        const stepCount = Math.max(...runs.map((run) => run.shots.length))
        for (let step = 0; step < stepCount; step += 1) {
            const name = runs.map((run) => run.shots[step]?.name).find(Boolean)
            lines.push(
                '',
                `### ${step + 1}. ${name}`,
                '',
                `| ${runs.map((run) => run.variantName).join(' | ')} |`,
                `| ${runs.map(() => '---').join(' | ')} |`,
                `| ${runs
                    .map((run) =>
                        run.shots[step] ? `![](${run.shots[step].file})` : '(없음)',
                    )
                    .join(' | ')} |`,
            )
        }
    }

    fs.writeFileSync(path.join(outDir, 'report.md'), `${lines.join('\n')}\n`)
    return { shotCount, problemCount }
}

async function launchBrowser() {
    const channel = process.env.VERIFY_BROWSER ?? 'chrome'
    try {
        return await chromium.launch({ channel })
    } catch (error) {
        console.error(
            [
                `브라우저("${channel}")를 띄우지 못했습니다: ${firstLine(error)}`,
                'pnpm verify는 이 컴퓨터에 설치된 Chrome을 씁니다.',
                '다른 브라우저를 쓰려면 VERIFY_BROWSER=msedge 처럼 지정하세요.',
            ].join('\n'),
        )
        process.exit(2)
    }
}

const files = findScenarioFiles(path.join(appDir, 'src'))
    .filter((file) => file.includes(filter))
    .sort()
// 일부만 돌릴 때도 봅니다. 화면을 보지 않고 파일만 보는 검사입니다.
const foldersWithoutScenario = findFoldersWithoutScenario(path.join(appDir, 'src'))

if (files.length === 0) {
    console.error(
        filter === ''
            ? '시나리오 파일(*.verify.ts)이 없습니다.'
            : `경로에 "${filter}"가 들어간 시나리오 파일(*.verify.ts)이 없습니다.`,
    )
    process.exit(2)
}

const startedAt = new Date()
// 검토한 사본(reviewed/)은 남기고 나머지를 비웁니다.
fs.mkdirSync(outDir, { recursive: true })
for (const entry of fs.readdirSync(outDir)) {
    if (path.join(outDir, entry) === reviewedDir) continue
    fs.rmSync(path.join(outDir, entry), { recursive: true, force: true })
}

const server = await createServer({
    root: appDir,
    logLevel: 'error',
    // 브라우저의 콘솔 에러는 보고서에 모으므로 터미널로 다시 내보내지 않습니다.
    // 포트 0은 운영체제가 비어 있는 포트를 골라 줍니다. 여러 작업이 동시에 검증을 돌려도 겹치지 않습니다.
    server: { port: 0, strictPort: true, forwardConsole: false },
})
await server.listen()
const address = server.httpServer?.address()
if (typeof address !== 'object' || address === null) {
    throw new Error('개발 서버의 포트를 알아내지 못했습니다.')
}
const baseUrl = `http://localhost:${address.port}/`
const browser = await launchBrowser()

const results = []
let review = null
try {
    for (const file of files) {
        const relative = path.relative(rootDir, file)
        const loaded = await server.ssrLoadModule(file)
        const scenario = loaded.default
        if (typeof scenario?.steps !== 'function') {
            throw new Error(
                `${relative}: defineScenario(...)의 결과를 default export 해야 합니다.`,
            )
        }

        const folder = path.basename(file, '.verify.ts')
        fs.mkdirSync(path.join(outDir, folder), { recursive: true })

        // 화면 조건끼리는 서로 영향을 주지 않으므로 동시에 돌립니다.
        const runs = await Promise.all(
            (scenario.variants ?? Object.keys(VARIANTS)).map((variantName) =>
                runVariant({ browser, baseUrl, scenario, folder, variantName }),
            ),
        )
        results.push({ file: relative, scenario, runs })

        const problemCount = runs.reduce((sum, run) => sum + run.problems.length, 0)
        console.log(
            `${problemCount === 0 ? '통과' : '문제'}  ${scenario.name} (${relative})`,
        )
        for (const run of runs) {
            for (const problem of run.problems) {
                console.log(`      ${run.variantName}: ${problem}`)
            }
        }
    }

    // 문제가 있으면 고친 뒤 화면이 달라지므로, 문제가 없을 때만 검토를 요구합니다.
    const hasProblems =
        foldersWithoutScenario.length > 0 ||
        results.some(({ runs }) => runs.some((run) => run.problems.length > 0))
    if (!hasProblems) {
        const store = readStore()
        const { unreviewed, currentKeys } = await findUnreviewed(browser, results, store)
        // 전체를 돌렸을 때는 없어진 단계의 기록과 사본을 지웁니다.
        if (filter === '') {
            for (const [key, entry] of Object.entries(store)) {
                if (currentKeys.has(key)) continue
                fs.rmSync(path.join(reviewedDir, entry.file), { force: true })
                delete store[key]
            }
            writeStore(store)
        }
        const notes = new Map()
        for (const key of currentKeys) {
            const entry = store[key]
            if (!entry) continue
            const id = `${entry.at}\n${entry.note}`
            notes.set(id, { at: entry.at, note: entry.note, count: (notes.get(id)?.count ?? 0) + 1 })
        }
        review = {
            unreviewedCount: unreviewed.length,
            sheets: await buildSheets(browser, unreviewed),
            notes: [...notes.values()].sort((a, b) => a.at.localeCompare(b.at)),
        }
    }
} finally {
    await browser.close()
    await server.close()
}

const { shotCount, problemCount } = writeReport(
    results,
    startedAt,
    review,
    foldersWithoutScenario,
)
if (foldersWithoutScenario.length > 0) {
    console.log(
        [
            '',
            '문제  화면 코드(.tsx)가 있는데 시나리오(*.verify.ts)가 없는 폴더:',
            ...foldersWithoutScenario.map((folder) => `      ${folder}`),
            '      화면 파일 옆에 <화면 이름>.verify.ts를 만들고, 사용자가 쓰는 순서대로 조작하며 볼 만한 상태마다 page.shot으로 남기세요.',
            '      쓰는 법은 packages/framework/src/verify/scenario.ts의 주석에 있습니다.',
        ].join('\n'),
    )
}
console.log(
    `\n스크린샷 ${shotCount}장, 문제 ${problemCount}건. 보고서: evidence/report.md`,
)

if (review === null) {
    console.log('문제를 먼저 고치세요. 스크린샷 검토는 문제가 없을 때 요구합니다.')
    process.exit(1)
}
if (review.sheets.length === 0) {
    console.log('스크린샷이 모두 검토한 것과 같습니다.')
    process.exit(0)
}

console.log(
    [
        '',
        `검토하지 않은 스크린샷이 ${review.unreviewedCount}장 있습니다 (새로 생겼거나 달라진 것).`,
        `모아 보기 ${review.sheets.length}장으로 만들었습니다. 한 장씩 열어 모양이 맞는지 확인하세요:`,
        ...review.sheets.map((sheet) => `  evidence/${sheet.file}  (스크린샷 ${sheet.shotCount}장)`),
        '',
        '확인한 장마다 그림 위쪽에 적힌 확인 코드와 본 내용을 기록합니다:',
        `  pnpm verify:review ${review.sheets[0].id} <확인 코드> "<무엇을 확인했는지>"`,
        '',
        '잘림, 겹침, 어긋난 정렬, 안 보이는 글자, 틀린 문구가 보이면 기록하지 말고 고친 뒤 다시 돌립니다.',
        '모두 기록한 뒤 이 명령을 다시 돌리면 통과합니다.',
    ].join('\n'),
)
process.exit(1)
