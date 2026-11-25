// 기능 폴더 사이의 import를 막는 규칙입니다.
//
// 폴더 약속: 파일 경로에서 가장 안쪽 `src` 바로 아래의 폴더 하나가 기능 하나입니다.
//   src/App.tsx, src/api.ts   src에 바로 놓인 파일. 기능들을 조합하는 자리라 무엇이든 가져올 수 있습니다.
//   src/shared/**             여러 기능이 같이 쓰는 코드. 기능 폴더를 가져올 수 없습니다.
//   src/<기능>/**             자기 폴더, shared, src에 바로 놓인 파일만 가져올 수 있습니다.
import fs from 'node:fs'
import path from 'node:path'

const SHARED = 'shared'
const ROOT = null

function toPosix(file) {
    return file.split(path.sep).join('/')
}

/** 파일이 속한 src 폴더의 경로. src 안에 있지 않으면 null. */
function findSrcDir(file) {
    const index = file.lastIndexOf('/src/')
    return index === -1 ? null : file.slice(0, index + '/src'.length)
}

function isDirectory(target) {
    try {
        return fs.statSync(target).isDirectory()
    } catch {
        return false
    }
}

/** src 아래 경로가 속한 구역. 기능 폴더 이름, 'shared', 또는 src에 바로 놓인 파일이면 ROOT. */
function areaOf(srcDir, target) {
    const [first, ...rest] = target.slice(srcDir.length + 1).split('/')
    if (rest.length > 0) return first
    // `../orders`처럼 폴더 자체를 가리키면 그 폴더의 index를 가져오는 것입니다.
    return isDirectory(target) ? first : ROOT
}

function resolveSource(source, file, srcDir) {
    if (source.startsWith('.')) {
        return path.posix.resolve(path.posix.dirname(file), source)
    }
    // `@/`는 src를 가리키는 별칭으로 봅니다.
    if (source.startsWith('@/')) return `${srcDir}/${source.slice(2)}`
    return null
}

export const noCrossFeatureImport = {
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            crossFeature:
                "'{{from}}' 기능에서 다른 기능 폴더 '{{to}}'의 파일을 가져올 수 없습니다. 두 기능이 같이 쓰는 코드는 src/shared/로 옮겨 거기서 가져오세요. 두 기능의 화면을 한데 놓아야 하면 src에 바로 놓인 파일(App.tsx 같은)에서 조합하고, 필요한 값은 props로 넘기세요.",
            sharedToFeature:
                "src/shared/에서 기능 폴더 '{{to}}'의 파일을 가져올 수 없습니다. shared는 어느 기능에도 기대지 않아야 합니다. 필요한 코드를 shared로 옮기거나, 값을 인자나 props로 받으세요.",
        },
    },
    create(context) {
        const file = toPosix(context.filename)
        const srcDir = findSrcDir(file)
        if (srcDir === null) return {}
        const from = areaOf(srcDir, file)
        if (from === ROOT) return {}

        function check(node) {
            const source = node.source
            if (!source || typeof source.value !== 'string') return
            const target = resolveSource(source.value, file, srcDir)
            if (target === null || !target.startsWith(`${srcDir}/`)) return
            const to = areaOf(srcDir, target)
            if (to === ROOT || to === from || to === SHARED) return
            context.report({
                node: source,
                messageId: from === SHARED ? 'sharedToFeature' : 'crossFeature',
                data: { from, to },
            })
        }

        return {
            ImportDeclaration: check,
            ExportNamedDeclaration: check,
            ExportAllDeclaration: check,
            ImportExpression: check,
        }
    },
}
