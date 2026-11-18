const FROM = '@agent-greenhouse/framework/ui'

const BUTTON_MESSAGE = [
    `제품 코드에서는 <button>을 직접 쓸 수 없습니다. Button을 쓰세요 (${FROM}).`,
    '· type의 기본값이 "button"입니다. 폼을 제출하는 버튼에만 type="submit"을 주세요.',
    '· 모양은 variant("primary" | "secondary" | "ghost")와 size("sm" | "md")로 고릅니다.',
    '· 선택·펼침 상태는 aria-pressed, aria-expanded를 주면 모양도 같이 바뀝니다.',
].join('\n')

const INPUT_MESSAGE = [
    `제품 코드에서는 <input>을 직접 쓸 수 없습니다. TextField를 쓰세요 (${FROM}).`,
    '· label이 필수입니다. <label>로 따로 감싸지 않습니다.',
    '· onChange는 이벤트가 아니라 바뀐 문자열을 받습니다: onChange={setName}',
    '· 입력 오류는 errorMessage에 문장을 넘기면 표시됩니다.',
    '체크박스, 라디오, 파일처럼 TextField가 못 하는 입력은 packages/framework/src/ui에 컴포넌트를 추가하세요.',
].join('\n')

const STATIC_STYLE_MESSAGE = [
    '고정 값을 인라인 style에 쓸 수 없습니다. 화면마다 값이 달라지고 다크 모드가 깨집니다.',
    `· 배치와 간격: Stack(direction, gap, align, justify, wrap) (${FROM})`,
    `· 테두리 있는 상자와 안쪽 여백: Card(padding, gap) (${FROM})`,
    `· 글의 색, 크기, 굵기: Text(tone, size, weight) (${FROM})`,
    `· 화면 바깥 틀: Page(title) (${FROM})`,
    '막대 너비처럼 실행 중에 정해지는 값은 style에 써도 됩니다. 그때 색과 간격은 tokens에서 가져오세요.',
].join('\n')

const CLICK_MESSAGE = [
    '누를 수 없는 요소에 onClick을 달 수 없습니다. 키보드로 누를 수 없고 스크린 리더가 버튼으로 읽지 않습니다.',
    `· 누르는 것: Button. 줄 전체를 누르게 하려면 줄 안에 Button variant="ghost"를 넣기 (${FROM})`,
    '· 바깥을 눌러 닫기: useClickOutside(ref, 핸들러) (@agent-greenhouse/framework/effect)',
].join('\n')

const STATIC_VALUES = [
    "Property[value.type='Literal']",
    "Property[value.type='TemplateLiteral'][value.expressions.length=0]",
    "Property[value.type='UnaryExpression'][value.argument.type='Literal']",
]
// style 속성 하나에 고정 값이 여러 개여도 한 번만 알립니다.
// :has() 안을 ">"로 시작하면 아무것도 잡지 못합니다 (esquery 1.7).
const STATIC_STYLE = `JSXAttribute[name.name='style']:has(JSXExpressionContainer > ObjectExpression > :matches(${STATIC_VALUES.join(', ')}))`
const STATIC_ELEMENTS = ['div', 'span', 'li', 'p', 'td', 'tr', 'img']

export default {
    restrictedSyntax: [
        { selector: STATIC_STYLE, message: STATIC_STYLE_MESSAGE },
        {
            selector: `JSXOpeningElement[name.name=/^(${STATIC_ELEMENTS.join('|')})$/] > JSXAttribute[name.name='onClick']`,
            message: CLICK_MESSAGE,
        },
    ],
    rules: {
        'react/forbid-elements': [
            'error',
            {
                forbid: [
                    { element: 'button', message: BUTTON_MESSAGE },
                    { element: 'input', message: INPUT_MESSAGE },
                ],
            },
        ],
    },
}
