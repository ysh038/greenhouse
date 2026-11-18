import fs from 'node:fs'
import path from 'node:path'

import { ESLint } from 'eslint'
import stylelint from 'stylelint'

const rootDir = path.resolve(import.meta.dirname, '..')
const modulesDir = path.join(rootDir, 'packages/framework/src')

function walk(dir) {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? walk(full) : [full]
    })
}

const fixtureDirs = [
    path.join(rootDir, 'lint/fixtures'),
    ...fs
        .readdirSync(modulesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(modulesDir, entry.name, 'fixtures')),
]

const allFiles = fixtureDirs.flatMap(walk).filter((file) => !file.endsWith('.d.ts'))
const cssFiles = allFiles.filter((file) => file.endsWith('.css'))
const files = allFiles.filter((file) => !file.endsWith('.css'))
const failures = []

// 코드 예제는 "// expect: 규칙", CSS 예제는 "/* expect: 규칙 */"으로 시작합니다.
function readExpected(file) {
    const firstLine = fs.readFileSync(file, 'utf8').split('\n')[0] ?? ''
    const match = /^(?:\/\/|\/\*) expect:\s*(.+?)(?:\s*\*\/)?$/.exec(firstLine)
    if (!match) return null
    return match[1]
        .split(',')
        .map((rule) => rule.trim())
        .filter(Boolean)
        .sort()
}

if (files.length === 0) {
    failures.push('위반 예제가 하나도 없습니다.')
}

const eslint = new ESLint({ cwd: rootDir })
const codeResults = await eslint.lintFiles(files)

const cssResults =
    cssFiles.length === 0
        ? []
        : (await stylelint.lint({ files: cssFiles, cwd: rootDir })).results

for (const result of cssResults) {
    for (const problem of [
        ...result.invalidOptionWarnings,
        ...result.parseErrors,
    ]) {
        failures.push(
            `${path.relative(rootDir, result.source)}: stylelint 설정이나 문법 오류 → ${problem.text}`,
        )
    }
}

const results = [
    ...codeResults.map((result) => ({
        filePath: result.filePath,
        rules: result.messages.map((message) => message.ruleId ?? 'parse-error'),
    })),
    ...cssResults.map((result) => ({
        filePath: result.source,
        rules: result.warnings.map((warning) => warning.rule),
    })),
]

for (const result of results) {
    const relative = path.relative(rootDir, result.filePath)
    const reported = [...new Set(result.rules)].sort()

    if (/\.good\.(tsx?|css)$/.test(relative)) {
        if (reported.length > 0) {
            failures.push(
                `${relative}: 통과해야 하는데 걸렸습니다 → ${reported.join(', ')}`,
            )
        }
        continue
    }

    if (/\.bad\.(tsx?|css)$/.test(relative)) {
        const expected = readExpected(result.filePath)
        if (expected === null) {
            failures.push(
                `${relative}: 첫 줄에 "// expect: 규칙이름, ..."(CSS는 "/* expect: ... */")이 없습니다.`,
            )
        } else if (expected.join() !== reported.join()) {
            failures.push(
                `${relative}: 기대 [${expected.join(', ')}] / 실제 [${reported.join(', ')}]`,
            )
        }
        continue
    }

    failures.push(
        `${relative}: 예제 파일 이름은 *.bad.ts(x), *.good.ts(x), *.bad.css, *.good.css 중 하나여야 합니다.`,
    )
}

if (failures.length > 0) {
    console.error(`위반 예제 검사 실패 (${failures.length}건)`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
}

console.log(`위반 예제 검사 통과 (${results.length}개 파일)`)
