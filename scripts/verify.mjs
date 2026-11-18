// 화면 시나리오(*.verify.ts)를 실제 브라우저에서 돌려 스크린샷과 보고서를 남깁니다.
//   pnpm verify            모든 시나리오
//   pnpm verify invites    경로에 "invites"가 들어간 시나리오만
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { chromium } from 'playwright-core'
import { createServer } from 'vite'

const rootDir = path.resolve(import.meta.dirname, '..')
const appDir = path.join(rootDir, 'apps/sample')
const outDir = path.join(rootDir, 'evidence')
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

function firstLine(error) {
    const message = error instanceof Error ? error.message : String(error)
    return message.split('\n').slice(0, 3).join(' ').replaceAll(/\s+/g, ' ').trim()
}

async function runVariant({ browser, baseUrl, scenario, folder, variantName }) {
    const variant = VARIANTS[variantName]
    const context = await browser.newContext({ ...variant, reducedMotion: 'reduce' })
    const page = await context.newPage()
    page.setDefaultTimeout(STEP_TIMEOUT_MS)

    const shots = []
    const problems = []
    const consoleErrors = []
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
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

    const api = {
        shot,
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
    } catch (error) {
        problems.push(
            `단계 실패 (${shots.length}번째 스크린샷 다음): ${firstLine(error)}`,
        )
        await shot('실패한 순간').catch(() => undefined)
    }

    const expected = scenario.expectedConsoleErrors ?? []
    let expectedCount = 0
    for (const text of consoleErrors) {
        if (expected.some((part) => text.includes(part))) {
            expectedCount += 1
        } else {
            problems.push(`콘솔 에러: ${firstLine(text)}`)
        }
    }

    await context.close()
    return { variantName, shots, problems, expectedCount }
}

function gitState() {
    const run = (args) =>
        spawnSync('git', args, { cwd: rootDir, encoding: 'utf8' }).stdout.trim()
    const commit = run(['rev-parse', '--short', 'HEAD'])
    const isDirty = run(['status', '--porcelain']) !== ''
    return `${commit}${isDirty ? ' (커밋하지 않은 변경 있음)' : ''}`
}

function writeReport(results, startedAt) {
    const shotCount = results
        .flatMap((result) => result.runs)
        .reduce((sum, run) => sum + run.shots.length, 0)
    const problemCount = results
        .flatMap((result) => result.runs)
        .reduce((sum, run) => sum + run.problems.length, 0)

    const lines = [
        '# 검증 증거',
        '',
        `- 실행: ${startedAt.toLocaleString('sv-SE').slice(0, 16)}`,
        `- 코드: ${gitState()}`,
        `- 결과: 시나리오 ${results.length}개, 스크린샷 ${shotCount}장, 문제 ${problemCount}건`,
        '',
        '자동으로 잡는 것은 단계 실패, 콘솔 에러, 가로 넘침뿐입니다. 모양이 맞는지는 스크린샷을 직접 보고 판단합니다.',
    ]

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

if (files.length === 0) {
    console.error(
        filter === ''
            ? '시나리오 파일(*.verify.ts)이 없습니다.'
            : `경로에 "${filter}"가 들어간 시나리오 파일(*.verify.ts)이 없습니다.`,
    )
    process.exit(2)
}

const startedAt = new Date()
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const server = await createServer({
    root: appDir,
    logLevel: 'error',
    // 브라우저의 콘솔 에러는 보고서에 모으므로 터미널로 다시 내보내지 않습니다.
    server: { port: 5199, forwardConsole: false },
})
await server.listen()
const baseUrl = server.resolvedUrls.local[0]
const browser = await launchBrowser()

const results = []
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
} finally {
    await browser.close()
    await server.close()
}

const { shotCount, problemCount } = writeReport(results, startedAt)
console.log(
    `\n스크린샷 ${shotCount}장, 문제 ${problemCount}건. 보고서: evidence/report.md`,
)
console.log('모양이 맞는지는 스크린샷을 열어 직접 확인하세요.')
process.exit(problemCount === 0 ? 0 : 1)
