#!/usr/bin/env node
// greenhouse <명령> [인자...]
const COMMANDS = {
    check: '../cli/check.mjs',
    verify: '../cli/verify.mjs',
    'verify:review': '../cli/verify-review.mjs',
    'verify:attach': '../cli/verify-attach.mjs',
    init: '../cli/init.mjs',
}

const [command] = process.argv.slice(2)

if (command === undefined || !(command in COMMANDS)) {
    console.error(
        [
            '사용법: greenhouse <명령>',
            '  check                     타입 검사, 린트, 테스트, 빌드, 화면 검증을 차례로 돌립니다',
            '  verify [경로 일부]        화면 시나리오(*.verify.ts)를 브라우저에서 돌리고 스크린샷을 남깁니다',
            '  verify:review [장 코드 내용]   모아 보기 한 장을 검토했다고 기록합니다',
            '  verify:attach [--clean]   검토한 모아 보기를 PR 본문에 붙입니다 (GitHub)',
            '  init <폴더>               새 프로젝트의 틀을 만듭니다. 지금 폴더에 만들려면 init .',
        ].join('\n'),
    )
    process.exit(command === undefined ? 0 : 1)
}

// 각 명령은 process.argv.slice(2)를 자기 인자로 읽습니다.
process.argv.splice(2, 1)
await import(COMMANDS[command])
