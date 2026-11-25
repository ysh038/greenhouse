import { createEslintConfig } from '@agent-greenhouse/framework/eslint'

export default await createEslintConfig({
    rootDir: import.meta.dirname,
    // 제품 구역: 샘플 앱과, 금지 규칙이 걸리는지 보는 위반 예제
    productFiles: [
        'apps/**/*.{ts,tsx}',
        'packages/framework/src/*/fixtures/**/*.{ts,tsx}',
        'lint/fixtures/product/**/*.{ts,tsx}',
    ],
    ignores: ['tools/**', 'packages/framework/template/**'],
})
