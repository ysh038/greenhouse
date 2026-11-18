import fs from 'node:fs'
import path from 'node:path'

import { ESLint } from 'eslint'

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

const files = fixtureDirs.flatMap(walk)
const failures = []

function readExpected(file) {
    const firstLine = fs.readFileSync(file, 'utf8').split('\n')[0] ?? ''
    const match = /^\/\/ expect:\s*(.+)$/.exec(firstLine)
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
const results = await eslint.lintFiles(files)

for (const result of results) {
    const relative = path.relative(rootDir, result.filePath)
    const reported = [
        ...new Set(
            result.messages.map((message) => message.ruleId ?? 'parse-error'),
        ),
    ].sort()

    if (/\.good\.tsx?$/.test(relative)) {
        if (reported.length > 0) {
            failures.push(
                `${relative}: 통과해야 하는데 걸렸습니다 → ${reported.join(', ')}`,
            )
        }
        continue
    }

    if (/\.bad\.tsx?$/.test(relative)) {
        const expected = readExpected(result.filePath)
        if (expected === null) {
            failures.push(
                `${relative}: 첫 줄에 "// expect: 규칙이름, ..."이 없습니다.`,
            )
        } else if (expected.join() !== reported.join()) {
            failures.push(
                `${relative}: 기대 [${expected.join(', ')}] / 실제 [${reported.join(', ')}]`,
            )
        }
        continue
    }

    failures.push(
        `${relative}: 예제 파일 이름은 *.bad.ts(x) 또는 *.good.ts(x)여야 합니다.`,
    )
}

if (failures.length > 0) {
    console.error(`위반 예제 검사 실패 (${failures.length}건)`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
}

console.log(`위반 예제 검사 통과 (${results.length}개 파일)`)
