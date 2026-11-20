// 모아 보기 한 장을 검토했다고 기록합니다.
//   pnpm verify:review <장 이름> <확인 코드> "<무엇을 확인했는지>"
//   pnpm verify:review                 검토가 남은 장 목록
//
// 확인 코드는 모아 보기 그림 위쪽에만 적혀 있습니다. 그림을 열어야 알 수 있습니다.
import fs from 'node:fs'
import path from 'node:path'

import {
    evidenceDir,
    hashCode,
    readPending,
    readStore,
    reviewedDir,
    reviewedFileName,
    writePending,
    writeStore,
} from './lib/review.mjs'

const [sheetId, code, ...noteParts] = process.argv.slice(2)
const note = noteParts.join(' ').trim()
const pending = readPending()
const remaining = () => pending.sheets.filter((sheet) => !sheet.isReviewed)

function listRemaining() {
    const sheets = remaining()
    if (sheets.length === 0) {
        console.log('검토가 남은 모아 보기가 없습니다. pnpm verify(또는 pnpm check)를 다시 돌리세요.')
        return
    }
    console.log('검토가 남은 모아 보기:')
    for (const sheet of sheets) {
        console.log(`  ${sheet.id}  evidence/${sheet.file}`)
    }
}

function fail(message) {
    console.error(message)
    process.exit(1)
}

if (sheetId === undefined) {
    listRemaining()
    process.exit(0)
}

const sheet = pending.sheets.find((candidate) => candidate.id === sheetId)
if (!sheet) {
    listRemaining()
    fail(`\n"${sheetId}"라는 모아 보기가 없습니다. 위 목록의 이름을 쓰세요.`)
}
if (sheet.isReviewed) {
    listRemaining()
    fail(`\n"${sheetId}"는 이미 기록했습니다.`)
}
if (code === undefined || hashCode(sheet.id, code) !== sheet.codeHash) {
    fail(
        `확인 코드가 맞지 않습니다. evidence/${sheet.file} 을 열면 위쪽 검은 띠에 네 자리 코드가 있습니다.`,
    )
}
if (note === '') {
    fail('무엇을 확인했는지 적어야 합니다. 예: "세 화면 조건 모두 잘림과 겹침 없음, 오류 문구가 입력란 아래에 붙어 있음"')
}

sheet.isReviewed = true
sheet.note = note

// 긴 스크린샷은 여러 장에 나뉘어 들어갑니다. 그것이 든 장을 모두 검토했을 때 검토한 것으로 남깁니다.
const store = readStore()
const at = new Date().toLocaleString('sv-SE').slice(0, 16)
let recordedCount = 0
for (const shot of sheet.shots) {
    const sheetsWithShot = pending.sheets.filter((candidate) =>
        candidate.shots.some((other) => other.key === shot.key),
    )
    if (!sheetsWithShot.every((candidate) => candidate.isReviewed)) continue
    const file = reviewedFileName(shot.key)
    fs.mkdirSync(reviewedDir, { recursive: true })
    fs.copyFileSync(path.join(evidenceDir, shot.file), path.join(reviewedDir, file))
    store[shot.key] = {
        file,
        note: [...new Set(sheetsWithShot.map((candidate) => candidate.note))].join(' / '),
        at,
    }
    recordedCount += 1
}
writeStore(store)
writePending(pending)

console.log(`"${sheet.id}"를 기록했습니다 (스크린샷 ${recordedCount}장).`)
listRemaining()
