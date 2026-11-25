// 배포할 JS와 CSS를 만듭니다 (dist/<모듈>/index.js). 타입 선언은 tsc가 따로 만듭니다.
import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'vite'

const srcDir = path.join(import.meta.dirname, 'src')
const entries = Object.fromEntries(
    fs
        .readdirSync(srcDir, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isDirectory() &&
                fs.existsSync(path.join(srcDir, entry.name, 'index.ts')),
        )
        .map((entry) => [`${entry.name}/index`, path.join(srcDir, entry.name, 'index.ts')]),
)

/**
 * 묶음마다 자기 CSS를 가져오는 import를 붙입니다.
 * 이것이 없으면 쓰는 쪽이 CSS 파일을 따로 불러와야 합니다.
 */
function importOwnCss() {
    return {
        name: 'greenhouse-import-own-css',
        generateBundle(_options, bundle) {
            for (const chunk of Object.values(bundle)) {
                if (chunk.type !== 'chunk') continue
                const cssFiles = [...(chunk.viteMetadata?.importedCss ?? [])]
                if (cssFiles.length === 0) continue
                const imports = cssFiles
                    .map((file) => {
                        const relative = path.posix.relative(
                            path.posix.dirname(chunk.fileName),
                            file,
                        )
                        return `import '${relative.startsWith('.') ? relative : `./${relative}`}';`
                    })
                    .join('\n')
                chunk.code = `${imports}\n${chunk.code}`
            }
        },
    }
}

export default defineConfig({
    plugins: [importOwnCss()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: true,
        minify: false,
        sourcemap: true,
        lib: { entry: entries, formats: ['es'] },
        rollupOptions: {
            // 쓰는 쪽이 설치한 것을 그대로 씁니다. 묶어 넣으면 React가 둘이 됩니다.
            external: [
                /^react($|\/)/,
                /^react-dom($|\/)/,
                /^react-router($|\/)/,
                /^@tanstack\//,
                /^@testing-library\//,
                /^vitest($|\/)/,
                'zod',
            ],
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            },
        },
    },
})
