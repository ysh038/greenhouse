const FROM = '@agent-greenhouse/framework/effect'
const DATA = '@agent-greenhouse/framework/data'

const EFFECT_MESSAGE = [
    '제품 코드에서는 Effect를 직접 쓸 수 없습니다. 하려는 일에 맞는 것을 고르세요.',
    `· 서버 데이터 불러오기: defineQuery로 정의하고 useData(query)로 읽기. 로딩과 에러 화면은 DataBoundary (${DATA})`,
    `· 이벤트 리스너: useEventListener, useClickOutside, useKeydown (${FROM})`,
    `· 지연·반복·애니메이션: useTimeout, useInterval, useDebouncedValue, useAnimationFrame (${FROM})`,
    '· 다른 값에서 계산되는 값: 상태로 두지 말고 렌더 중에 계산',
    '· prop이 바뀌면 상태 초기화: 컴포넌트에 key를 줘서 새로 만들기',
    '· 사용자 동작에 따른 처리: 이벤트 핸들러 안에서 실행',
    '맞는 것이 없으면 packages/framework/src/effect에 훅을 추가하세요.',
].join('\n')

const TIMER_MESSAGE = [
    '제품 코드에서는 타이머를 직접 쓸 수 없습니다.',
    `· 일정 시간 뒤 한 번: useTimeout(콜백, 시간, 다시시작키). 키가 바뀌면 처음부터 다시 셈 (${FROM})`,
    `· 일정 간격 반복: useInterval (${FROM})`,
    `· 입력이 멈춘 뒤 반영: useDebouncedValue (${FROM})`,
    `· 프레임마다 실행: useAnimationFrame (${FROM})`,
    '순서 문제를 가리려고 setTimeout(fn, 0)을 넣으려던 것이라면 원인을 고치세요.',
].join('\n')

const LISTENER_MESSAGE = [
    '제품 코드에서는 addEventListener를 직접 쓸 수 없습니다. 해제를 빼먹기 쉽습니다.',
    `· 일반 이벤트: useEventListener(대상, 이벤트, 핸들러) (${FROM})`,
    `· 바깥 클릭: useClickOutside(ref, 핸들러). mousedown이 아니라 pointerdown에 반응 (${FROM})`,
    `· 키 입력: useKeydown('Escape', 핸들러) (${FROM})`,
].join('\n')

const EFFECT_HOOKS = ['useEffect', 'useLayoutEffect', 'useInsertionEffect']
const TIMERS = [
    'setTimeout',
    'setInterval',
    'requestAnimationFrame',
    'requestIdleCallback',
]

export default {
    restrictedImports: [
        { name: 'react', importNames: EFFECT_HOOKS, message: EFFECT_MESSAGE },
    ],
    restrictedGlobals: TIMERS.map((name) => ({ name, message: TIMER_MESSAGE })),
    restrictedProperties: ['window', 'globalThis'].flatMap((object) =>
        TIMERS.map((property) => ({ object, property, message: TIMER_MESSAGE })),
    ),
    restrictedSyntax: [
        {
            selector: `MemberExpression[property.name=/^(${EFFECT_HOOKS.join('|')})$/]`,
            message: EFFECT_MESSAGE,
        },
        {
            selector: "CallExpression[callee.property.name='addEventListener']",
            message: LISTENER_MESSAGE,
        },
    ],
}
