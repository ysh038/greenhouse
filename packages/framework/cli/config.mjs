// 프로젝트 루트의 greenhouse.config.mjs를 읽습니다. 없으면 기본값을 씁니다.
//
//     export default {
//         appDir: '.',                 // vite를 띄울 앱 폴더. src가 이 안에 있습니다.
//         check: [['타입 검사', 'typecheck'], ...],   // check가 차례로 돌릴 package.json 스크립트
//     }
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const rootDir = process.cwd()

const DEFAULT_CHECK = [
    ['타입 검사', 'typecheck'],
    ['린트', 'lint'],
    ['테스트', 'test'],
    ['빌드', 'build'],
    ['화면 검증', 'verify'],
]

export async function loadConfig() {
    const file = path.join(rootDir, 'greenhouse.config.mjs')
    const loaded = fs.existsSync(file)
        ? ((await import(pathToFileURL(file).href)).default ?? {})
        : {}
    return {
        appDir: path.resolve(rootDir, loaded.appDir ?? '.'),
        check: loaded.check ?? DEFAULT_CHECK,
    }
}

/** 이 프로젝트가 쓰는 패키지 관리자. 스크립트를 부를 때 씁니다. */
export function packageManager() {
    const agent = process.env.npm_config_user_agent ?? ''
    if (agent.startsWith('pnpm')) return 'pnpm'
    if (agent.startsWith('yarn')) return 'yarn'
    if (agent.startsWith('npm')) return 'npm'
    if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm'
    if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) return 'yarn'
    return 'npm'
}
