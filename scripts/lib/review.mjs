// 스크린샷 검토 기록. `pnpm verify`와 `pnpm verify:review`가 같이 씁니다.
//
// 검토한 스크린샷은 evidence/reviewed/ 에 복사해 둡니다. 다음 실행에서 같은 단계의 스크린샷이
// 그 사본과 눈에 띄게 다르지 않으면 다시 검토하지 않습니다. 새로 생겼거나 달라진 것만 모아 보기로 만들고,
// 모아 보기 그림 안에 적힌 확인 코드를 대야 검토한 것으로 기록합니다.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const rootDir = path.resolve(import.meta.dirname, '../..')
export const evidenceDir = path.join(rootDir, 'evidence')
/** 검토를 마친 스크린샷의 사본과 기록. `pnpm verify`가 evidence/를 비울 때 이 폴더는 남깁니다. */
export const reviewedDir = path.join(evidenceDir, 'reviewed')
/** 검토를 기다리는 모아 보기 */
export const pendingDir = path.join(evidenceDir, 'review')

const storeFile = path.join(reviewedDir, 'reviews.json')
const pendingFile = path.join(pendingDir, 'pending.json')

function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
        return fallback
    }
}

/** { [스크린샷 키]: { file, note, at } } */
export function readStore() {
    return readJson(storeFile, {})
}

export function writeStore(store) {
    fs.mkdirSync(reviewedDir, { recursive: true })
    fs.writeFileSync(storeFile, `${JSON.stringify(store, null, 2)}\n`)
}

/** { sheets: [{ id, file, codeHash, isReviewed, note, shots: [{ key, file }] }] } */
export function readPending() {
    return readJson(pendingFile, { sheets: [] })
}

export function writePending(pending) {
    fs.mkdirSync(pendingDir, { recursive: true })
    fs.writeFileSync(pendingFile, `${JSON.stringify(pending, null, 2)}\n`)
}

/** 검토한 사본의 파일 이름. 키에 한글과 빈칸이 있어서 해시로 만듭니다. */
export function reviewedFileName(key) {
    return `${crypto.createHash('sha256').update(key).digest('hex').slice(0, 24)}.png`
}

export function newCode() {
    return String(crypto.randomInt(0, 10_000)).padStart(4, '0')
}

/** 확인 코드는 모아 보기 그림 안에만 있습니다. 파일에는 맞는지 견줄 값만 남깁니다. */
export function hashCode(sheetId, code) {
    return crypto.createHash('sha256').update(`${sheetId}:${code}`).digest('hex')
}

/** PNG의 가로세로 픽셀 수 (IHDR) */
export function pngSize(buffer) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

// 같은 화면을 다시 찍어도 긴 스크린샷에서는 픽셀 몇백 개가 조금씩 달라집니다(색 차이 16 이하, 직접 측정함).
// 그 정도는 같은 것으로 보고, 색이 뚜렷이 다른 픽셀이 하나라도 있거나 흐릿한 차이가 넓게 퍼져 있으면 다른 것으로 봅니다.
const CLEAR_DIFFERENCE = 24
const MAX_FAINT_RATIO = 0.0005

const COMPARE_IN_BROWSER = `async ([a, b, clear, maxFaintRatio]) => {
    const load = (uri) => new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('그림을 읽지 못했습니다'))
        image.src = uri
    })
    const [first, second] = await Promise.all([load(a), load(b)])
    if (first.width !== second.width || first.height !== second.height) return false
    const pixels = (image) => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, image.width, image.height).data
    }
    const one = pixels(first)
    const other = pixels(second)
    let faint = 0
    for (let i = 0; i < one.length; i += 4) {
        const difference = Math.max(
            Math.abs(one[i] - other[i]),
            Math.abs(one[i + 1] - other[i + 1]),
            Math.abs(one[i + 2] - other[i + 2]),
        )
        if (difference > clear) return false
        if (difference > 0) faint += 1
    }
    return faint <= (one.length / 4) * maxFaintRatio
}`

const toDataUri = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`

/** 두 스크린샷이 눈에 띄게 다르지 않은가. page는 비교에 쓸 빈 브라우저 페이지입니다. */
export async function looksSame(page, firstBuffer, secondBuffer) {
    if (firstBuffer.equals(secondBuffer)) return true
    const first = pngSize(firstBuffer)
    const second = pngSize(secondBuffer)
    if (first.width !== second.width || first.height !== second.height) return false
    return page.evaluate(
        `(${COMPARE_IN_BROWSER})(${JSON.stringify([
            toDataUri(firstBuffer),
            toDataUri(secondBuffer),
            CLEAR_DIFFERENCE,
            MAX_FAINT_RATIO,
        ])})`,
    )
}

// ---------- 모아 보기 ----------
// 한 장을 열었을 때 글자가 읽히도록 크기를 제한합니다.
const SHEET_WIDTH = 1800
const SHEET_PADDING = 20
const CELL_GAP = 16
const ROW_WIDTH = SHEET_WIDTH - SHEET_PADDING * 2
/** 이보다 넓은 스크린샷은 이 너비로 줄여, 한 줄에 두 장이 들어가게 합니다. */
const MAX_CELL_WIDTH = (ROW_WIDTH - CELL_GAP) / 2
/** 이보다 긴 스크린샷은 위에서부터 여러 조각으로 나눕니다. */
const MAX_CELL_HEIGHT = 1700
const MAX_SHEET_HEIGHT = 1900
const CAPTION_HEIGHT = 30
const HEADER_HEIGHT = 96

const escapeHtml = (text) =>
    text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** 스크린샷 하나를 모아 보기에 놓을 조각들로 바꿉니다. */
function toCells(shot) {
    const buffer = fs.readFileSync(path.join(evidenceDir, shot.file))
    const size = pngSize(buffer)
    const naturalWidth = size.width / shot.scale
    const naturalHeight = size.height / shot.scale
    const shrink = Math.min(1, MAX_CELL_WIDTH / naturalWidth)
    const width = Math.round(naturalWidth * shrink)
    const height = Math.round(naturalHeight * shrink)
    const pieceCount = Math.ceil(height / MAX_CELL_HEIGHT)
    const pieceHeight = Math.ceil(height / pieceCount)
    return Array.from({ length: pieceCount }, (_, index) => ({
        shot,
        uri: toDataUri(buffer),
        width,
        fullHeight: height,
        offset: index * pieceHeight,
        height: Math.min(pieceHeight, height - index * pieceHeight),
        // 좁은 칸에서는 뒤가 잘리므로 단계 이름을 맨 뒤에 둡니다.
        caption:
            `${shot.step}. ${shot.variant} · ${shot.isChanged ? '바뀜' : '새로 생김'}` +
            (pieceCount > 1 ? ` · 위에서 ${index + 1}/${pieceCount}번째 조각` : '') +
            ` · ${shot.name}`,
    }))
}

/** 같은 단계의 화면 조건끼리 한 줄에 놓고, 너비가 넘치면 줄을 바꿉니다. */
function toRows(shots) {
    const rows = []
    let row = null
    let rowStep = null
    for (const shot of shots) {
        for (const cell of toCells(shot)) {
            const usedWidth = row
                ? row.cells.reduce((sum, placed) => sum + placed.width + CELL_GAP, 0)
                : 0
            if (!row || rowStep !== shot.step || usedWidth + cell.width > ROW_WIDTH) {
                row = { cells: [], height: 0 }
                rowStep = shot.step
                rows.push(row)
            }
            row.cells.push(cell)
            row.height = Math.max(row.height, cell.height + CAPTION_HEIGHT)
        }
    }
    return rows
}

function toPages(rows) {
    const pages = []
    let page = null
    let pageHeight = 0
    for (const row of rows) {
        if (!page || pageHeight + row.height + CELL_GAP > MAX_SHEET_HEIGHT - HEADER_HEIGHT) {
            page = []
            pageHeight = 0
            pages.push(page)
        }
        page.push(row)
        pageHeight += row.height + CELL_GAP
    }
    return pages
}

function sheetHtml({ title, position, code, rows }) {
    const cells = (row) =>
        row.cells
            .map(
                (cell) => `<figure style="width:${cell.width}px">
                    <figcaption>${escapeHtml(cell.caption)}</figcaption>
                    <div class="crop" style="height:${cell.height}px">
                        <img src="${cell.uri}" style="width:${cell.width}px;height:${cell.fullHeight}px;margin-top:-${cell.offset}px">
                    </div>
                </figure>`,
            )
            .join('')
    return `<!doctype html><meta charset="utf-8"><style>
        body { margin: 0; padding: ${SHEET_PADDING}px; width: ${ROW_WIDTH}px; background: #8a8a8a; font: 15px system-ui, sans-serif; }
        header { display: flex; justify-content: space-between; align-items: center; height: ${HEADER_HEIGHT - 20}px; margin-bottom: 20px; padding: 0 20px; background: #111; color: #fff; }
        header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        header .code { font: 700 44px ui-monospace, Menlo, monospace; letter-spacing: 10px; }
        header .code small { font: 400 18px system-ui, sans-serif; letter-spacing: 0; margin-right: 14px; }
        .row { display: flex; gap: ${CELL_GAP}px; align-items: flex-start; margin-bottom: ${CELL_GAP}px; }
        figure { margin: 0; flex: none; }
        figcaption { box-sizing: border-box; height: ${CAPTION_HEIGHT}px; padding: 5px 8px; background: #222; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .crop { overflow: hidden; background: #fff; }
        img { display: block; }
    </style>
    <header>
        <h1>${escapeHtml(title)} · ${position}</h1>
        <div class="code"><small>확인 코드</small>${code}</div>
    </header>
    ${rows.map((row) => `<div class="row">${cells(row)}</div>`).join('')}`
}

/**
 * 검토가 필요한 스크린샷을 시나리오별 모아 보기로 만듭니다.
 * shots: [{ key, file, scenarioName, folder, step, name, variant, scale, isChanged }]
 * 돌려주는 값: [{ id, file, shotCount }]
 */
export async function buildSheets(browser, shots) {
    fs.rmSync(pendingDir, { recursive: true, force: true })
    if (shots.length === 0) return []
    fs.mkdirSync(pendingDir, { recursive: true })

    const byFolder = new Map()
    for (const shot of shots) {
        byFolder.set(shot.folder, [...(byFolder.get(shot.folder) ?? []), shot])
    }

    const sheets = []
    // 높이는 내용에 맞춰 찍히도록 작게 둡니다.
    const page = await browser.newPage({ viewport: { width: SHEET_WIDTH, height: 200 } })
    try {
        for (const [folder, folderShots] of byFolder) {
            const pages = toPages(toRows(folderShots))
            for (const [index, rows] of pages.entries()) {
                const id = `${folder}-${index + 1}`
                const code = newCode()
                const file = path.join('review', `${id}.png`)
                await page.setContent(
                    sheetHtml({
                        title: `검토할 스크린샷 · ${folderShots[0].scenarioName}`,
                        position: `${index + 1}/${pages.length}장`,
                        code,
                        rows,
                    }),
                    { waitUntil: 'load' },
                )
                await page.screenshot({ path: path.join(evidenceDir, file), fullPage: true })
                const shotsOnSheet = new Map(
                    rows
                        .flatMap((row) => row.cells)
                        .map((cell) => [cell.shot.key, cell.shot.file]),
                )
                sheets.push({
                    id,
                    file,
                    codeHash: hashCode(id, code),
                    isReviewed: false,
                    // 긴 스크린샷은 여러 장에 나뉘어 들어갑니다. 그 장들을 모두 검토해야 기록됩니다.
                    shots: [...shotsOnSheet].map(([key, shotFile]) => ({ key, file: shotFile })),
                    shotCount: shotsOnSheet.size,
                })
            }
        }
    } finally {
        await page.close()
    }

    writePending({ sheets })
    return sheets
}
