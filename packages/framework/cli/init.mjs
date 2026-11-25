// 새 프로젝트의 틀을 만듭니다.
//   npx @agent-greenhouse/framework init <폴더>
import fs from 'node:fs'
import path from 'node:path'

const [target] = process.argv.slice(2)

if (target === undefined) {
    console.error('만들 폴더 이름을 적어 주세요. 예: npx @agent-greenhouse/framework init my-app')
    process.exit(1)
}

const packageDir = path.join(import.meta.dirname, '..')
const templateDir = path.join(packageDir, 'template')
const targetDir = path.resolve(process.cwd(), target)

if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`${targetDir} 폴더가 비어 있지 않습니다. 빈 폴더나 없는 폴더 이름을 주세요.`)
    process.exit(1)
}

fs.cpSync(templateDir, targetDir, { recursive: true })
// npm은 패키지 안의 .gitignore를 빼고 배포하므로 다른 이름으로 넣어 두고 여기서 되돌립니다.
// .npmrc도 같은 이유로 다른 이름으로 넣어 둡니다.
for (const name of ['gitignore', 'npmrc']) {
    fs.renameSync(path.join(targetDir, name), path.join(targetDir, `.${name}`))
}

const { version } = JSON.parse(
    fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'),
)
const appPackageFile = path.join(targetDir, 'package.json')
const appPackage = JSON.parse(fs.readFileSync(appPackageFile, 'utf8'))
appPackage.name = path
    .basename(targetDir)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
appPackage.dependencies['@agent-greenhouse/framework'] = `^${version}`
fs.writeFileSync(appPackageFile, `${JSON.stringify(appPackage, null, 2)}\n`)

console.log(
    [
        `${targetDir}에 새 프로젝트를 만들었습니다.`,
        '',
        `  cd ${target}`,
        '  npm install',
        '  npm run check',
        '',
        '화면 검증은 이 컴퓨터에 설치된 Chrome을 씁니다.',
        '에이전트가 읽을 안내는 CLAUDE.md와 node_modules/@agent-greenhouse/framework/GUIDE.md에 있습니다.',
    ].join('\n'),
)
