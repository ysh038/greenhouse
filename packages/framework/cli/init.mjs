// 새 프로젝트의 틀을 만듭니다.
//   npx @agent-greenhouse/framework init <폴더>    새 폴더에 만듭니다
//   npx @agent-greenhouse/framework init .         지금 폴더에 만듭니다 (이미 만든 저장소의 루트 등)
//
// 지금 있는 파일은 덮어쓰지 않습니다. 틀의 파일과 이름이 겹치는 것이 있으면 아무것도 만들지 않고 멈춥니다.
// 예외는 둘입니다: README.md는 있던 것을 그대로 두고, .gitignore는 없는 줄만 덧붙입니다.
import fs from 'node:fs'
import path from 'node:path'

const [target] = process.argv.slice(2)

if (target === undefined) {
    console.error(
        [
            '만들 폴더를 적어 주세요.',
            '  npx @agent-greenhouse/framework init my-app    새 폴더에 만듭니다',
            '  npx @agent-greenhouse/framework init .         지금 폴더에 만듭니다',
        ].join('\n'),
    )
    process.exit(1)
}

const packageDir = path.join(import.meta.dirname, '..')
const templateDir = path.join(packageDir, 'template')
const targetDir = path.resolve(process.cwd(), target)

// npm은 패키지 안의 .gitignore와 .npmrc를 빼고 배포하므로 다른 이름으로 넣어 두고 여기서 되돌립니다.
const RENAMED = { gitignore: '.gitignore', npmrc: '.npmrc' }
const KEEP_EXISTING = new Set(['README.md'])
const MERGE_LINES = new Set(['.gitignore'])

function listFiles(dir, base = dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)]
    })
}

const files = listFiles(templateDir).map((source) => ({
    source,
    destination: RENAMED[source] ?? source,
}))

if (fs.existsSync(targetDir) && !fs.statSync(targetDir).isDirectory()) {
    console.error(`${targetDir}은(는) 폴더가 아닙니다.`)
    process.exit(1)
}

const conflicts = files
    .map(({ destination }) => destination)
    .filter(
        (destination) =>
            !KEEP_EXISTING.has(destination) &&
            !MERGE_LINES.has(destination) &&
            fs.existsSync(path.join(targetDir, destination)),
    )

if (conflicts.length > 0) {
    console.error(
        [
            `${targetDir}에 틀의 파일과 이름이 같은 파일이 이미 있어서 만들지 않았습니다:`,
            ...conflicts.map((file) => `  ${file}`),
            '',
            '이 틀은 새 프로젝트를 시작할 때 쓰는 것입니다. 위 파일을 옮기거나 지운 뒤 다시 실행하세요.',
        ].join('\n'),
    )
    process.exit(1)
}

const kept = []
for (const { source, destination } of files) {
    const from = path.join(templateDir, source)
    const to = path.join(targetDir, destination)
    fs.mkdirSync(path.dirname(to), { recursive: true })

    if (!fs.existsSync(to)) {
        fs.copyFileSync(from, to)
    } else if (MERGE_LINES.has(destination)) {
        const existing = fs.readFileSync(to, 'utf8')
        const present = new Set(existing.split('\n').map((line) => line.trim()))
        const missing = fs
            .readFileSync(from, 'utf8')
            .split('\n')
            .filter((line) => line.trim() !== '' && !present.has(line.trim()))
        if (missing.length > 0) {
            fs.writeFileSync(
                to,
                `${existing.replace(/\n*$/, '\n')}${missing.join('\n')}\n`,
            )
        }
    } else {
        kept.push(destination)
    }
}

const { version } = JSON.parse(
    fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'),
)
const appPackageFile = path.join(targetDir, 'package.json')
const appPackage = JSON.parse(fs.readFileSync(appPackageFile, 'utf8'))
appPackage.name =
    path
        .basename(targetDir)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'greenhouse-app'
appPackage.dependencies['@agent-greenhouse/framework'] = `^${version}`
fs.writeFileSync(appPackageFile, `${JSON.stringify(appPackage, null, 2)}\n`)

const isHere = targetDir === process.cwd()
console.log(
    [
        `${targetDir}에 새 프로젝트의 틀을 만들었습니다.`,
        ...(kept.length > 0
            ? [`있던 파일은 그대로 뒀습니다: ${kept.join(', ')}`]
            : []),
        '',
        ...(isHere ? [] : [`  cd ${target}`]),
        '  npm install',
        '  npm run check',
        '',
        '화면 검증은 이 컴퓨터에 설치된 Chrome을 씁니다.',
        '에이전트가 읽을 안내는 CLAUDE.md와 node_modules/@agent-greenhouse/framework/GUIDE.md에 있습니다.',
    ].join('\n'),
)
