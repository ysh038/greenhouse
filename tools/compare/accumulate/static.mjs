// 코드 측정: 줄 수, 직접 쓴 색, 손으로 쓴 Effect·리스너·타이머, 화면 사이의 중복.
//   node tools/compare/accumulate/static.mjs <제품 코드 폴더(src)> [이름]
// 한 줄짜리 JSON을 출력합니다.
import fs from 'node:fs'
import path from 'node:path'

const [srcDir, name = path.basename(srcDir)] = process.argv.slice(2)

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? walk(full) : [full]
    })
}

const all = walk(srcDir).map((file) => path.relative(srcDir, file))
const isTest = (file) => /\.(test|verify)\.tsx?$/.test(file) || file.startsWith('test/')
const isFake = (file) => file.startsWith('fake/')
const isGiven = (file) => isFake(file) || file === 'main.tsx' || file === 'css.d.ts' || file === 'vite-env.d.ts'
const code = all.filter((file) => /\.tsx?$/.test(file) && !isTest(file) && !isGiven(file))
const tests = all.filter((file) => /\.tsx?$/.test(file) && isTest(file))
const css = all.filter((file) => file.endsWith('.css'))

const read = (file) => fs.readFileSync(path.join(srcDir, file), 'utf8')
const lineCount = (files) => files.reduce((sum, file) => sum + read(file).split('\n').filter((line) => line.trim() !== '').length, 0)
const countIn = (files, pattern) => files.reduce((sum, file) => sum + (read(file).match(pattern) ?? []).length, 0)

// 화면 폴더: src 바로 아래 폴더 가운데 공용이 아닌 것
const screenDirs = ['plants', 'orders', 'suppliers', 'settings'].filter((dir) => all.some((file) => file.startsWith(`${dir}/`)))
const inScreen = (file) => screenDirs.some((dir) => file.startsWith(`${dir}/`))
const sharedCode = code.filter((file) => !inScreen(file) && !['App.tsx'].includes(file))
const sharedCss = css.filter((file) => !inScreen(file))

// ----- 색 -----
const COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/g
const colorUses = { inVariables: [], direct: [] }
const pxValues = new Set()
const fontSizes = new Set()
for (const file of css) {
    for (const rawLine of read(file).split('\n')) {
        const line = rawLine.trim()
        const colors = line.match(COLOR) ?? []
        if (colors.length > 0) {
            const bucket = line.startsWith('--') ? colorUses.inVariables : colorUses.direct
            for (const color of colors) bucket.push(color.toLowerCase().replace(/\s+/g, ''))
        }
        if (!line.startsWith('--')) {
            for (const value of line.match(/\b\d+(\.\d+)?(px|rem)\b/g) ?? []) pxValues.add(value)
            const font = line.match(/^font-size:\s*([^;]+);/)
            if (font) fontSizes.add(font[1].trim())
        }
    }
}

// ----- 중복 -----
// 서로 다른 파일에 똑같이 나오는 줄의 비율. 여섯 줄 이상 이어진 덩어리만 셉니다.
function duplication(files) {
    const WINDOW = 6
    const normalized = files.map((file) => ({
        file,
        lines: read(file).split('\n').map((line) => line.trim()).filter((line) => line !== '' && !line.startsWith('import ') && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*')),
    }))
    const seen = new Map()
    for (const { file, lines } of normalized) {
        for (let i = 0; i + WINDOW <= lines.length; i += 1) {
            const key = lines.slice(i, i + WINDOW).join('\n')
            if (!seen.has(key)) seen.set(key, new Set())
            seen.get(key).add(file)
        }
    }
    let duplicated = 0
    let total = 0
    for (const { file, lines } of normalized) {
        const marked = new Array(lines.length).fill(false)
        for (let i = 0; i + WINDOW <= lines.length; i += 1) {
            const owners = seen.get(lines.slice(i, i + WINDOW).join('\n'))
            if (owners.size > 1) for (let j = i; j < i + WINDOW; j += 1) marked[j] = true
        }
        duplicated += marked.filter(Boolean).length
        total += lines.length
        void file
    }
    return { duplicated, total, percent: total === 0 ? 0 : Math.round((duplicated / total) * 1000) / 10 }
}

const result = {
    name,
    screens: screenDirs.length,
    codeFiles: code.length,
    codeLines: lineCount(code),
    testLines: lineCount(tests),
    cssFiles: css.length,
    cssLines: lineCount(css),
    sharedCodeFiles: sharedCode,
    sharedCodeLines: lineCount(sharedCode),
    sharedCssFiles: sharedCss,
    sharedCssLines: lineCount(sharedCss),
    useEffect: countIn(code, /\buse(Layout)?Effect\(/g),
    listeners: countIn(code, /addEventListener\(/g),
    timers: countIn(code, /\bset(Timeout|Interval)\(/g),
    colorsInVariables: new Set(colorUses.inVariables).size,
    colorsDirect: new Set(colorUses.direct).size,
    colorsDirectUses: colorUses.direct.length,
    lengthValues: pxValues.size,
    fontSizes: fontSizes.size,
    codeDuplication: duplication(code),
    cssDuplication: duplication(css),
}
console.log(JSON.stringify(result))
