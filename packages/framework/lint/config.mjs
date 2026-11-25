// 프로젝트의 eslint.config.mjs가 가져다 쓰는 설정입니다.
//
//     import { createEslintConfig } from '@agent-greenhouse/framework/eslint'
//     export default await createEslintConfig({ rootDir: import.meta.dirname })
//
// 모든 코드에 적용하는 규칙과, 제품 코드에만 적용하는 금지 규칙(프레임워크의 모듈마다 정의)을 합쳐 돌려줍니다.
import path from 'node:path'

import { createBase } from './base.mjs'
import { collectModuleLint, toRules } from './collect.mjs'
import { productZoneFragment } from './zones.mjs'

const MODULES_DIR = path.join(import.meta.dirname, '../src')

/**
 * @param {object} options
 * @param {string} options.rootDir 프로젝트 루트. tsconfig를 찾는 기준입니다.
 * @param {string[]} [options.productFiles] 제품 코드. 금지 규칙이 적용됩니다. 기본값은 src 아래의 ts, tsx.
 * @param {string[]} [options.ignores] 검사하지 않을 경로. dist와 node_modules는 늘 빠집니다.
 */
export async function createEslintConfig({
    rootDir,
    productFiles = ['src/**/*.{ts,tsx}'],
    ignores = [],
}) {
    const productLint = await collectModuleLint(MODULES_DIR, {
        'product-zone': productZoneFragment,
    })
    return [
        { ignores: ['**/dist/**', '**/node_modules/**', 'evidence/**', ...ignores] },
        ...createBase(rootDir),
        {
            files: productFiles,
            plugins: productLint.plugins,
            rules: toRules(productLint),
        },
    ]
}
