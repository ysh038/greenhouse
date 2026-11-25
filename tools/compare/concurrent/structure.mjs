// 구조 측정: 기능 폴더 사이의 import(프레임워크의 구조 규칙을 그대로 적용)와 모달·메뉴 구현의 수.
//   node tools/compare/concurrent/structure.mjs <앱 폴더(src가 든 폴더)>
// 한 줄짜리 JSON을 출력합니다. 규칙이 없는 조건의 코드에도 같은 규칙을 돌려 위반을 셉니다.
import fs from 'node:fs'
import path from 'node:path'

import { ESLint } from 'eslint'
import tseslint from 'typescript-eslint'

import { noCrossFeatureImport } from '../../../packages/framework/src/structure/noCrossFeatureImport.mjs'

const appDir = path.resolve(process.argv[2])
const srcDir = path.join(appDir, 'src')

const eslint = new ESLint({
    cwd: appDir,
    overrideConfigFile: true,
    overrideConfig: [
        {
            files: ['**/*.{ts,tsx}'],
            languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
            plugins: { structure: { rules: { 'no-cross-feature-import': noCrossFeatureImport } } },
            rules: { 'structure/no-cross-feature-import': 'error' },
        },
    ],
})
const results = await eslint.lintFiles(['src/**/*.{ts,tsx}'])
const crossImports = results.flatMap((result) =>
    result.messages
        .filter((message) => message.ruleId === 'structure/no-cross-feature-import')
        .map((message) => `${path.relative(srcDir, result.filePath)}:${message.line}`),
)

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? walk(full) : [full]
    })
}
const code = walk(srcDir)
    .filter((file) => /\.tsx$/.test(file) && !/\.(test|verify)\.tsx?$/.test(file))
    .map((file) => ({ file: path.relative(srcDir, file), text: fs.readFileSync(file, 'utf8') }))
const filesWith = (pattern) => code.filter(({ text }) => pattern.test(text)).map(({ file }) => file)

console.log(
    JSON.stringify({
        folders: fs.readdirSync(srcDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name),
        crossImports,
        // 모달을 직접 구현한 파일 (역할을 직접 붙인 곳)
        ownModalFiles: filesWith(/role=["'](dialog|alertdialog)["']|aria-modal|<dialog[\s>]/),
        // 모달을 쓰는 파일 (프레임워크 것이든 직접 만든 것이든)
        modalUsers: filesWith(/<(Dialog|ConfirmDialog|Modal|[A-Z]\w*(Dialog|Modal|Panel))[\s>]/),
        // 2초 안내를 타이머로 직접 구현한 파일
        timerFiles: filesWith(/setTimeout\(|useTimeout\(/),
    }),
)
