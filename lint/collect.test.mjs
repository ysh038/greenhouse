// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { collectModuleLint, toRules } from './collect.mjs'

const created = []

function makeModules(modules) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'af-lint-'))
    created.push(dir)
    for (const [name, source] of Object.entries(modules)) {
        fs.mkdirSync(path.join(dir, name))
        if (source !== null) {
            fs.writeFileSync(path.join(dir, name, 'lint.mjs'), source)
        }
    }
    return dir
}

afterEach(() => {
    for (const dir of created.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

describe('collectModuleLint', () => {
    it('여러 모듈의 금지 목록을 한 규칙으로 합친다', async () => {
        const dir = makeModules({
            data: `export default { restrictedImports: [{ name: 'axios', message: 'apiClient를 쓰세요.' }] }`,
            effect: `export default {
                restrictedImports: [{ name: 'react', importNames: ['useEffect'], message: '프레임워크 훅을 쓰세요.' }],
                restrictedGlobals: [{ name: 'setTimeout', message: 'useTimeout을 쓰세요.' }],
            }`,
            plain: null,
        })

        const rules = toRules(await collectModuleLint(dir))

        expect(rules['no-restricted-imports'][1].paths.map((p) => p.name)).toEqual(
            ['axios', 'react'],
        )
        expect(rules['no-restricted-globals']).toEqual([
            'error',
            { name: 'setTimeout', message: 'useTimeout을 쓰세요.' },
        ])
        expect(rules['no-restricted-syntax']).toBeUndefined()
    })

    it('처음에 넘긴 구역 규칙과 모듈 규칙을 함께 합친다', async () => {
        const dir = makeModules({
            data: `export default { restrictedImportPatterns: [{ group: ['axios/*'], message: 'apiClient를 쓰세요.' }] }`,
        })

        const merged = await collectModuleLint(dir, {
            zone: {
                restrictedImportPatterns: [
                    { group: ['@agent-greenhouse/framework/src/**'], message: '공개 진입점을 쓰세요.' },
                ],
            },
        })

        expect(merged.restrictedImportPatterns).toHaveLength(2)
    })

    it('message가 없는 금지 항목은 거부한다', async () => {
        const dir = makeModules({
            data: `export default { restrictedImports: [{ name: 'axios' }] }`,
        })

        await expect(collectModuleLint(dir)).rejects.toThrow(/message가 없습니다/)
    })

    it('합쳐지는 규칙을 rules에 직접 쓰면 거부한다', async () => {
        const dir = makeModules({
            data: `export default { rules: { 'no-restricted-imports': 'error' } }`,
        })

        await expect(collectModuleLint(dir)).rejects.toThrow(/직접 쓸 수 없습니다/)
    })

    it('두 모듈이 같은 규칙을 설정하면 거부한다', async () => {
        const dir = makeModules({
            a: `export default { rules: { 'react/forbid-elements': 'error' } }`,
            b: `export default { rules: { 'react/forbid-elements': 'off' } }`,
        })

        await expect(collectModuleLint(dir)).rejects.toThrow(/이미 \[a\] 모듈이/)
    })

    it('알 수 없는 키는 거부한다', async () => {
        const dir = makeModules({
            data: `export default { restrictedImport: [] }`,
        })

        await expect(collectModuleLint(dir)).rejects.toThrow(/알 수 없는 키/)
    })
})
