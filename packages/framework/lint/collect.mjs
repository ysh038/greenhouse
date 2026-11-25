import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const LIST_KEYS = [
    'restrictedImports',
    'restrictedImportPatterns',
    'restrictedGlobals',
    'restrictedProperties',
    'restrictedSyntax',
]

const MERGED_RULES = [
    'no-restricted-imports',
    'no-restricted-globals',
    'no-restricted-properties',
    'no-restricted-syntax',
]

function emptyFragment() {
    return {
        ...Object.fromEntries(LIST_KEYS.map((key) => [key, []])),
        rules: {},
        plugins: {},
    }
}

export function mergeFragment(merged, owners, name, fragment) {
    if (fragment === null || typeof fragment !== 'object') {
        throw new Error(`[${name}] lint.mjs의 default export는 객체여야 합니다.`)
    }

    for (const key of Object.keys(fragment)) {
        if (!LIST_KEYS.includes(key) && key !== 'rules' && key !== 'plugins') {
            throw new Error(
                `[${name}] 알 수 없는 키 "${key}". 쓸 수 있는 키: ${[...LIST_KEYS, 'rules', 'plugins'].join(', ')}`,
            )
        }
    }

    for (const key of LIST_KEYS) {
        for (const entry of fragment[key] ?? []) {
            if (typeof entry.message !== 'string' || entry.message.trim() === '') {
                throw new Error(
                    `[${name}] ${key} 항목에 message가 없습니다. 금지 규칙은 대신 무엇을 쓸지 알려 줘야 합니다: ${JSON.stringify(entry)}`,
                )
            }
            merged[key].push(entry)
        }
    }

    // 모듈이 직접 만든 규칙은 plugins로 등록하고 rules에서 "<플러그인>/<규칙>"으로 켭니다.
    for (const [pluginName, plugin] of Object.entries(fragment.plugins ?? {})) {
        if (pluginName in merged.plugins) {
            throw new Error(
                `[${name}] "${pluginName}" 플러그인은 이미 다른 모듈이 등록했습니다.`,
            )
        }
        merged.plugins[pluginName] = plugin
    }

    for (const [rule, setting] of Object.entries(fragment.rules ?? {})) {
        if (MERGED_RULES.includes(rule)) {
            throw new Error(
                `[${name}] "${rule}"는 rules에 직접 쓸 수 없습니다. restricted* 목록에 넣으면 다른 모듈의 항목과 합쳐집니다.`,
            )
        }
        if (rule in owners) {
            throw new Error(
                `[${name}] "${rule}" 규칙은 이미 [${owners[rule]}] 모듈이 설정했습니다.`,
            )
        }
        owners[rule] = name
        merged.rules[rule] = setting
    }
}

export async function collectModuleLint(modulesDir, initial = {}) {
    const merged = emptyFragment()
    const owners = {}

    for (const [name, fragment] of Object.entries(initial)) {
        mergeFragment(merged, owners, name, fragment)
    }

    const moduleNames = fs
        .readdirSync(modulesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()

    for (const name of moduleNames) {
        const file = path.join(modulesDir, name, 'lint.mjs')
        if (!fs.existsSync(file)) continue
        const loaded = await import(pathToFileURL(file).href)
        mergeFragment(merged, owners, name, loaded.default)
    }

    return merged
}

export function toRules(merged) {
    const rules = { ...merged.rules }

    if (
        merged.restrictedImports.length > 0 ||
        merged.restrictedImportPatterns.length > 0
    ) {
        rules['no-restricted-imports'] = [
            'error',
            {
                paths: merged.restrictedImports,
                patterns: merged.restrictedImportPatterns,
            },
        ]
    }
    if (merged.restrictedGlobals.length > 0) {
        rules['no-restricted-globals'] = ['error', ...merged.restrictedGlobals]
    }
    if (merged.restrictedProperties.length > 0) {
        rules['no-restricted-properties'] = [
            'error',
            ...merged.restrictedProperties,
        ]
    }
    if (merged.restrictedSyntax.length > 0) {
        rules['no-restricted-syntax'] = ['error', ...merged.restrictedSyntax]
    }

    return rules
}
