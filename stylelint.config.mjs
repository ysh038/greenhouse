import {
    createStylelintConfig,
    tokenRules,
} from '@agent-greenhouse/framework/stylelint'

// 제품 구역: 앱의 CSS와 모듈의 위반 예제
const config = createStylelintConfig({
    productFiles: ['apps/**/*.css', 'packages/framework/src/*/fixtures/**/*.css'],
})

export default {
    ...config,
    overrides: [
        // 프레임워크의 컴포넌트 CSS는 토큰만 쓰는지 봅니다. 토큰 정의와 전역 기본 스타일에는 규칙이 없습니다.
        { files: ['packages/framework/src/**/*.module.css'], rules: tokenRules },
        ...config.overrides,
    ],
}
