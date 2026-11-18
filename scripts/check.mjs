import { spawnSync } from 'node:child_process'

const steps = [
    ['피어 의존성', 'peers'],
    ['타입 검사', 'typecheck'],
    ['린트', 'lint'],
    ['위반 예제', 'lint:fixtures'],
    ['테스트', 'test'],
    ['샘플 앱 빌드', 'build'],
    ['화면 검증', 'verify'],
]

const results = []

for (const [label, script] of steps) {
    console.log(`\n▶ ${label} (pnpm run ${script})`)
    const started = Date.now()
    const { status } = spawnSync('pnpm', ['run', '--silent', script], {
        stdio: 'inherit',
    })
    results.push({
        label,
        isOk: status === 0,
        seconds: ((Date.now() - started) / 1000).toFixed(1),
    })
}

console.log('\n결과')
for (const result of results) {
    console.log(`  ${result.isOk ? '통과' : '실패'}  ${result.label} (${result.seconds}초)`)
}

process.exit(results.every((result) => result.isOk) ? 0 : 1)
