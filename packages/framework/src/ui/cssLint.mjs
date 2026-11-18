// 제품 구역의 CSS 파일에 적용하는 stylelint 규칙입니다.
// 저장소 루트의 stylelint.config.mjs가 가져가 씁니다.
import fs from 'node:fs'
import path from 'node:path'

const FROM = '@agent-greenhouse/framework/ui'
const TOKENS_FILE = 'packages/framework/src/ui/tokens.css'

const tokensCss = fs.readFileSync(
    path.join(import.meta.dirname, 'tokens.css'),
    'utf8',
)

/** px 값 → 그 값을 가진 간격·모서리 토큰 이름들. 예: 8 → ['--gh-space-sm', '--gh-radius-md'] */
const tokensByPx = new Map()
for (const [, name, px] of tokensCss.matchAll(
    /(--gh-(?:space|radius)-[a-z0-9]+):\s*(\d+)px/g,
)) {
    tokensByPx.set(px, [...(tokensByPx.get(px) ?? []), name])
}

const colorNames = [
    ...new Set(
        [...tokensCss.matchAll(/--gh-color-([a-z-]+):/g)].map(([, name]) => name),
    ),
]

const TOKEN_PX = new RegExp(`(^|[^\\w.-])(${[...tokensByPx.keys()].join('|')})px\\b`)

const SELECTOR_MESSAGE = (selector) =>
    [
        `"${selector}": 제품 CSS에서 요소 선택자(button, li 등)와 *를 쓸 수 없습니다. 프레임워크 컴포넌트의 모양을 바깥에서 덮어쓰게 됩니다.`,
        '· 직접 그린 요소: className을 붙이고 .클래스 이름으로만 고르기',
        `· 컴포넌트의 모양: variant, size, tone, gap 같은 속성으로 고르기 (${FROM})`,
        '· 속성으로 안 되는 모양: packages/framework/src/ui의 컴포넌트에 속성을 추가하기',
    ].join('\n')

const HEX_MESSAGE = (hex) =>
    [
        `"${hex}": 색을 직접 쓸 수 없습니다. 다크 모드에서 깨집니다. 토큰 변수를 쓰세요.`,
        `· var(--gh-color-이름). 이름: ${colorNames.join(', ')}`,
        `· 값은 ${TOKENS_FILE}에 있습니다. 맞는 색이 없으면 거기에 밝은 모드와 다크 모드 값을 같이 추가하세요.`,
    ].join('\n')

// 모서리 속성에는 모서리 토큰을, 그 밖의 속성에는 간격 토큰을 먼저 권합니다.
function suggestTokens(property, px) {
    const names = tokensByPx.get(px)
    const wanted = property.includes('radius') ? '--gh-radius-' : '--gh-space-'
    const preferred = names.filter((name) => name.startsWith(wanted))
    return (preferred.length > 0 ? preferred : names)
        .map((name) => `var(${name})`)
        .join(' 또는 ')
}

const PX_MESSAGE = (property, value) => {
    const matches = [...value.matchAll(new RegExp(TOKEN_PX, 'g'))].map(
        ([, , px]) => `${px}px → ${suggestTokens(property, px)}`,
    )
    return [
        `"${property}: ${value}": 토큰과 같은 값을 직접 쓸 수 없습니다. 토큰 변수를 쓰세요.`,
        ...[...new Set(matches)].map((match) => `· ${match}`),
    ].join('\n')
}

/** 프레임워크와 제품의 CSS 모두에 적용합니다. */
export const tokenRules = {
    'color-no-hex': [true, { message: HEX_MESSAGE }],
    'declaration-property-value-disallowed-list': [
        { '/.*/': [TOKEN_PX] },
        { message: PX_MESSAGE },
    ],
}

/** 제품 CSS에만 적용합니다. 프레임워크의 기본 스타일은 요소 선택자를 씁니다. */
export const productRules = {
    ...tokenRules,
    'selector-max-type': [0, { message: SELECTOR_MESSAGE }],
    'selector-max-universal': [0, { message: SELECTOR_MESSAGE }],
}
