// 작업을 마쳤다고 하기 전에 돌리는 검사. package.json의 스크립트를 차례로 돌리고 결과를 모아 보여 줍니다.
// 돌릴 스크립트는 greenhouse.config.mjs의 check로 바꿀 수 있습니다.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { loadConfig, packageManager, rootDir } from './config.mjs'

const { check: steps } = await loadConfig()
const manager = packageManager()
const scripts =
    JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).scripts ?? {}

const results = []

for (const [label, script] of steps) {
    console.log(`\n▶ ${label} (${manager} run ${script})`)
    const started = Date.now()
    let isOk = false
    if (script in scripts) {
        const { status } = spawnSync(manager, ['run', '--silent', script], {
            stdio: 'inherit',
            shell: process.platform === 'win32',
        })
        isOk = status === 0
    } else {
        console.error(`package.json에 "${script}" 스크립트가 없습니다.`)
    }
    results.push({
        label,
        isOk,
        seconds: ((Date.now() - started) / 1000).toFixed(1),
    })
}

console.log('\n결과')
for (const result of results) {
    console.log(`  ${result.isOk ? '통과' : '실패'}  ${result.label} (${result.seconds}초)`)
}

process.exit(results.every((result) => result.isOk) ? 0 : 1)
