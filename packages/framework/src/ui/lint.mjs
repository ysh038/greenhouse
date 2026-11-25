const FROM = '@agent-greenhouse/framework/ui'

const BUTTON_MESSAGE = [
    `제품 코드에서는 <button>을 직접 쓸 수 없습니다. Button을 쓰세요 (${FROM}).`,
    '· type의 기본값이 "button"입니다. 폼을 제출하는 버튼에만 type="submit"을 주세요.',
    '· 모양은 variant("primary" | "secondary" | "ghost")와 size("sm" | "md")로 고릅니다.',
    '· 삭제처럼 되돌릴 수 없는 동작은 tone="danger"를 줍니다.',
    '· 선택·펼침 상태는 aria-pressed, aria-expanded를 주면 모양도 같이 바뀝니다.',
].join('\n')

const INPUT_MESSAGE = [
    `제품 코드에서는 <input>을 직접 쓸 수 없습니다 (${FROM}).`,
    '· 글자 입력: TextField(label, value, onChange). 입력 오류는 errorMessage에, 옆에 붙일 제출 버튼은 trailing에 넘깁니다.',
    '· 체크박스: Checkbox(label, checked, onChange)',
    '· 여럿 가운데 하나 고르기: Select(label, value, options, onChange)',
    '· 모두 label이 필수라 <label>로 따로 감싸지 않고, onChange는 이벤트가 아니라 바뀐 값을 받습니다: onChange={setName}',
    '라디오나 파일처럼 맞는 것이 없으면 packages/framework/src/ui에 컴포넌트를 추가하세요.',
    '추가할 때는 테스트를 같이 쓰고 index.ts에서 내보냅니다. 방법은 packages/framework/README.md에 있습니다.',
].join('\n')

const SELECT_MESSAGE = [
    `제품 코드에서는 <select>를 직접 쓸 수 없습니다. Select를 쓰세요 (${FROM}).`,
    '· Select(label, value, options, onChange). options는 [{ value, label }]이고, onChange는 이벤트가 아니라 고른 value를 받습니다.',
    '· "선택 안 함"이 필요하면 value가 \'\'인 항목을 options에 넣습니다.',
    '· 입력 오류는 errorMessage에 넘깁니다.',
].join('\n')

const STATIC_STYLE_MESSAGE = [
    '고정 값을 인라인 style에 쓸 수 없습니다. 화면마다 값이 달라지고 다크 모드가 깨집니다.',
    `· 배치와 간격: Stack(direction, gap, align, justify, wrap) (${FROM})`,
    `· 테두리 있는 상자와 안쪽 여백: Card(padding, gap) (${FROM})`,
    `· 글의 색, 크기, 굵기: Text(tone, size, weight) (${FROM})`,
    `· 화면 바깥 틀: Page(title) (${FROM})`,
    `· 위 컴포넌트로 안 되는 고정 값(크기, 위치): 같은 폴더의 *.module.css로 옮기고 className으로 연결. 값은 var(--gh-space-sm) 같은 토큰 변수를 씁니다. 토큰 이름은 tokens에 있습니다 (${FROM})`,
    '막대 너비처럼 실행 중에 정해지는 값만 style에 남기세요. 그때 색과 간격은 tokens에서 가져옵니다.',
].join('\n')

const CLICK_MESSAGE = [
    '누를 수 없는 요소에 onClick을 달 수 없습니다. 키보드로 누를 수 없고 스크린 리더가 버튼으로 읽지 않습니다.',
    `· 누르는 것: Button. 줄 전체를 누르게 하려면 줄 안에 Button variant="ghost"를 넣기 (${FROM})`,
    '· 바깥을 눌러 닫기: useClickOutside(ref, 핸들러) (@agent-greenhouse/framework/effect)',
].join('\n')

const DIALOG_MESSAGE = [
    `제품 코드에서는 모달을 직접 만들 수 없습니다 (${FROM}).`,
    '포커스 가두기, Escape와 바깥 클릭으로 닫기, 닫은 뒤 포커스 되돌리기를 화면마다 다시 만들게 되고 빠뜨리기 쉽습니다.',
    '· 화면 위에 뜨는 창(상세 보기, 입력 폼): Dialog(title, onClose). 열려 있을 때만 그립니다: {isOpen && <Dialog ...>}',
    '· 되돌릴 수 없는 동작을 하기 전에 묻기: ConfirmDialog(message, confirmLabel, onConfirm, onCancel). 삭제면 tone="danger"',
    '· 요청하는 동안 닫히지 않게: Dialog는 isDismissible={false}, ConfirmDialog는 isPending',
    'window.confirm도 쓰지 않습니다. 모양을 바꿀 수 없고 화면 검증에서 스크린샷으로 남지 않습니다.',
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
    restrictedGlobals: [{ name: 'confirm', message: DIALOG_MESSAGE }],
    restrictedProperties: [
        { object: 'window', property: 'confirm', message: DIALOG_MESSAGE },
    ],
    restrictedSyntax: [
        {
            selector:
                "JSXAttribute[name.name='role'][value.value=/^(dialog|alertdialog)$/], JSXAttribute[name.name='aria-modal']",
            message: DIALOG_MESSAGE,
        },
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
                    { element: 'select', message: SELECT_MESSAGE },
                    { element: 'dialog', message: DIALOG_MESSAGE },
                ],
            },
        ],
    },
}
