// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const dir = import.meta.dirname

function read(name) {
    return fs.readFileSync(path.join(dir, name), 'utf8')
}

function definedIn(css) {
    return new Set([...css.matchAll(/(--gh-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
}

function usedIn(source) {
    return [...source.matchAll(/var\((--gh-[a-z0-9-]+)\)/g)].map((m) => m[1])
}

const tokensCss = read('tokens.css')
const defined = definedIn(tokensCss)

describe('디자인 토큰', () => {
    it('CSS와 tokens.ts가 쓰는 변수는 모두 tokens.css에 정의돼 있다', () => {
        const sources = fs
            .readdirSync(dir)
            .filter((name) => /\.(css|ts|tsx)$/.test(name))
        const missing = sources.flatMap((name) =>
            usedIn(read(name))
                .filter((variable) => !defined.has(variable))
                .map((variable) => `${name}: ${variable}`),
        )

        expect(sources.length).toBeGreaterThan(5)
        expect(missing).toEqual([])
    })

    it('다크 모드는 밝은 모드에 있는 색 토큰을 빠짐없이 다시 정의한다', () => {
        const [light, dark] = tokensCss.split('@media (prefers-color-scheme: dark)')
        const colors = (css) =>
            [...definedIn(css)].filter((name) => name.startsWith('--gh-color-')).sort()

        expect(colors(dark).length).toBeGreaterThan(0)
        expect(colors(dark)).toEqual(colors(light))
    })

    it('컴포넌트 CSS에는 hex 색상을 직접 쓰지 않는다', () => {
        const offenders = fs
            .readdirSync(dir)
            .filter((name) => name.endsWith('.css') && name !== 'tokens.css')
            .filter((name) => /#[0-9a-fA-F]{3,8}\b/.test(read(name)))

        expect(offenders).toEqual([])
    })
})
