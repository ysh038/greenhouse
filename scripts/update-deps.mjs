import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')

function run(command, args) {
    const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8' })
    return {
        isOk: result.status === 0,
        output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    }
}

function manifestFiles() {
    const files = ['package.json', 'pnpm-lock.yaml']
    for (const group of ['apps', 'packages']) {
        const groupDir = path.join(rootDir, group)
        if (!fs.existsSync(groupDir)) continue
        for (const entry of fs.readdirSync(groupDir, { withFileTypes: true })) {
            const manifest = path.join(group, entry.name, 'package.json')
            if (entry.isDirectory() && fs.existsSync(path.join(rootDir, manifest))) {
                files.push(manifest)
            }
        }
    }
    return files
}

function snapshot() {
    return manifestFiles().map((file) => [
        file,
        fs.readFileSync(path.join(rootDir, file), 'utf8'),
    ])
}

function restore(saved) {
    for (const [file, content] of saved) {
        fs.writeFileSync(path.join(rootDir, file), content)
    }
    run('pnpm', ['install', '--frozen-lockfile'])
}

function listOutdated() {
    const { output } = run('pnpm', ['outdated', '-r', '--format', 'json'])
    const start = output.indexOf('{')
    if (start === -1) return []
    return Object.entries(JSON.parse(output.slice(start))).map(
        ([name, info]) => ({ name, current: info.current, latest: info.latest }),
    )
}

function failedSteps(output) {
    return output
        .split('\n')
        .filter((line) => line.trim().startsWith('실패'))
        .map((line) => line.trim().replace(/^실패\s+/, '').replace(/\s+\(.*$/, ''))
}

const before = run('pnpm', ['run', '--silent', 'check'])
if (!before.isOk) {
    console.error('업데이트 전에 pnpm check가 이미 실패합니다. 먼저 고치세요.')
    process.exit(1)
}

const outdated = listOutdated()
if (outdated.length === 0) {
    console.log('모든 의존성이 최신입니다.')
    process.exit(0)
}

const updated = []
const held = []

for (const dependency of outdated) {
    const label = `${dependency.name} ${dependency.current} → ${dependency.latest}`
    console.log(`▶ ${label}`)
    const saved = snapshot()

    const install = run('pnpm', ['up', '-r', '--latest', dependency.name])
    if (!install.isOk) {
        restore(saved)
        held.push(`${label} (설치 실패)`)
        continue
    }

    const check = run('pnpm', ['run', '--silent', 'check'])
    if (!check.isOk) {
        restore(saved)
        held.push(`${label} (check 실패: ${failedSteps(check.output).join(', ')})`)
        continue
    }

    updated.push(label)
}

console.log(`\n올린 것 (${updated.length})`)
for (const line of updated) console.log(`  ${line}`)
console.log(`\n보류한 것 (${held.length})`)
for (const line of held) console.log(`  ${line}`)
