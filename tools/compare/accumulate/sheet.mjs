// 조건을 가린 평가용 모아 보기. 한 제품의 스크린샷을 두 장으로 묶습니다.
//   node tools/compare/accumulate/sheet.mjs <shots 폴더> <결과 폴더>
// 1-넓은 화면.png: 밝은 넓은 화면 8장 (화면 4개와 패널·확인 창)
// 2-어두운 화면과 좁은 화면.png: 어두운 넓은 화면 2장, 좁은 화면 4장
import fs from 'node:fs'
import path from 'node:path'

import { chromium } from 'playwright-core'

const [shotDir, outDir] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })

const SHEETS = {
    '1-넓은 화면': {
        columns: 2,
        cellWidth: 800,
        items: [
            ['1-식물 재고--desktop-light', '식물 재고'],
            ['2-식물 상세--desktop-light', '식물 상세 패널'],
            ['3-주문--desktop-light', '주문'],
            ['4-주문 상세--desktop-light', '주문 상세 패널'],
            ['5-공급처--desktop-light', '공급처'],
            ['6-공급처 추가--desktop-light', '공급처 추가 패널'],
            ['7-삭제 확인--desktop-light', '삭제 확인 창'],
            ['8-알림 설정--desktop-light', '알림 설정'],
        ],
    },
    '2-어두운 화면과 좁은 화면': {
        columns: 4,
        cellWidth: 400,
        items: [
            ['3-주문--mobile-light', '주문 (375px)'],
            ['4-주문 상세--mobile-light', '주문 상세 패널 (375px)'],
            ['6-공급처 추가--mobile-light', '공급처 추가 패널 (375px)'],
            ['8-알림 설정--mobile-light', '알림 설정 (375px)'],
            ['4-주문 상세--desktop-dark', '주문 상세 패널 (어두운 화면)'],
            ['7-삭제 확인--desktop-dark', '삭제 확인 창 (어두운 화면)'],
            ['8-알림 설정--desktop-dark', '알림 설정 (어두운 화면)'],
            ['9-주문 불러오기 실패--desktop-light', '주문 불러오기 실패'],
        ],
    },
}

const browser = await chromium.launch({ channel: 'chrome' })
try {
    for (const [name, sheet] of Object.entries(SHEETS)) {
        const cells = sheet.items
            .filter(([file]) => fs.existsSync(path.join(shotDir, `${file}.png`)))
            .map(([file, label]) => `<figure><figcaption>${label}</figcaption><img src="data:image/png;base64,${fs.readFileSync(path.join(shotDir, `${file}.png`)).toString('base64')}"></figure>`)
            .join('')
        const html = `<!doctype html><meta charset="utf-8"><style>
            body { margin: 0; padding: 12px; background: #777; font: 14px system-ui; }
            main { display: grid; grid-template-columns: repeat(${sheet.columns}, ${sheet.cellWidth}px); gap: 12px; }
            figure { margin: 0; background: #fff; }
            figcaption { padding: 4px 8px; background: #222; color: #fff; }
            img { display: block; width: 100%; }
        </style><main>${cells}</main>`
        const page = await browser.newPage({ viewport: { width: sheet.columns * (sheet.cellWidth + 12) + 12, height: 800 } })
        await page.setContent(html, { waitUntil: 'load' })
        await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true })
        await page.close()
    }
} finally {
    await browser.close()
}
