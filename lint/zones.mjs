export const PRODUCT_FILES = [
    'apps/**/*.{ts,tsx}',
    'packages/framework/src/*/fixtures/**/*.{ts,tsx}',
    'lint/fixtures/product/**/*.{ts,tsx}',
]

export const productZoneFragment = {
    restrictedImportPatterns: [
        {
            group: [
                '@agent-greenhouse/framework/src',
                '@agent-greenhouse/framework/src/**',
                '**/packages/framework/**',
            ],
            message:
                '프레임워크 내부 파일을 직접 가져올 수 없습니다. 공개 진입점 @agent-greenhouse/framework/<모듈>을 쓰세요.',
        },
    ],
}
