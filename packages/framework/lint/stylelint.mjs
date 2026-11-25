// 프로젝트의 stylelint.config.mjs가 가져다 쓰는 설정입니다.
//
//     import { createStylelintConfig } from '@agent-greenhouse/framework/stylelint'
//     export default createStylelintConfig()
import { productRules, tokenRules } from '../src/ui/cssLint.mjs'

export { productRules, tokenRules }

/**
 * @param {object} [options]
 * @param {string[]} [options.productFiles] 제품 코드의 CSS. 기본값은 src 아래의 css.
 */
export function createStylelintConfig({ productFiles = ['src/**/*.css'] } = {}) {
    return {
        rules: {},
        overrides: [{ files: productFiles, rules: productRules }],
    }
}
