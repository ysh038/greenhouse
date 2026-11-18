import { productRules, tokenRules } from './packages/framework/src/ui/cssLint.mjs'

// 제품 구역: 앱의 CSS와 모듈의 위반 예제
const PRODUCT_CSS = ['apps/**/*.css', 'packages/framework/src/*/fixtures/**/*.css']

// 토큰을 정의하는 파일과 전역 기본 스타일은 색과 요소 선택자를 직접 씁니다.
const FRAMEWORK_CSS = ['packages/framework/src/**/*.module.css']

export default {
    // 어느 구역에도 속하지 않는 CSS(토큰 정의, 전역 기본 스타일)에는 규칙이 없습니다.
    rules: {},
    overrides: [
        { files: FRAMEWORK_CSS, rules: tokenRules },
        { files: PRODUCT_CSS, rules: productRules },
    ],
}
