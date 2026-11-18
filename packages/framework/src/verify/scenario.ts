/**
 * 화면에서 요소 하나를 가리키는 방법. 사용자가 보는 것(역할과 이름, 라벨, 글자)으로만 고릅니다.
 *
 * - { role: 'button', name: '저장' }: 역할과 이름. 이름은 정확히 일치해야 합니다.
 * - { label: '이메일' }: 그 라벨이 붙은 입력란
 * - { text: '저장했습니다' }: 그 글자가 보이는 요소
 *
 * closest를 주면 찾은 요소를 감싸는 가장 가까운 그 태그를 가리킵니다.
 * 예: { role: 'heading', name: '구성원 초대', closest: 'section' }은 그 제목이 든 구역 전체.
 *
 * within을 주면 그 요소 안에서만 찾습니다. 같은 이름의 버튼이 페이지에 여럿일 때 씁니다.
 * 예: { role: 'button', name: '추가', within: SECTION }
 *
 * 대상이 여럿 잡히면 시나리오가 실패합니다. within이나 더 정확한 이름으로 하나만 가리키세요.
 */
export type Target = (
    | { role: string; name?: string }
    | { label: string }
    | { text: string }
) & {
    closest?: string
    within?: Target
}

export type ShotOptions = {
    /** 주면 그 요소만 찍습니다. 안 주면 페이지 전체를 찍습니다. */
    of?: Target
}

/** 시나리오가 화면에 할 수 있는 일. 모든 동작은 대상이 나타날 때까지 기다립니다. */
export type ScenarioPage = {
    /** 지금 화면을 증거로 남깁니다. 이름은 보고서에 그대로 나옵니다. */
    shot: (name: string, options?: ShotOptions) => Promise<void>
    click: (target: Target) => Promise<void>
    /** 입력란의 값을 바꿉니다. */
    fill: (target: Target, value: string) => Promise<void>
    /** 키를 누릅니다. 예: 'Escape', 'Enter', 'Tab' */
    press: (key: string) => Promise<void>
    hover: (target: Target) => Promise<void>
    /** 대상이 보일 때까지 기다립니다. 끝내 안 보이면 시나리오가 실패합니다. */
    see: (target: Target) => Promise<void>
    /** 대상이 사라질 때까지 기다립니다. 끝내 남아 있으면 시나리오가 실패합니다. */
    gone: (target: Target) => Promise<void>
}

export type VariantName = 'desktop-light' | 'desktop-dark' | 'mobile-light'

export type Scenario = {
    /** 보고서에 나오는 이름. 보통 화면이나 기능의 이름. */
    name: string
    /** 열 주소. 기본값은 '/'. */
    path?: string
    /** 돌릴 화면 조건. 기본값은 세 가지 모두. */
    variants?: readonly VariantName[]
    /**
     * 이 화면에서 나는 것이 정상인 콘솔 에러. 메시지에 이 글자가 들어 있으면 문제로 세지 않습니다.
     * 그 밖의 콘솔 에러는 모두 문제로 보고합니다.
     */
    expectedConsoleErrors?: readonly string[]
    /** 사용자가 하는 순서대로 조작하고, 볼 만한 상태마다 shot으로 남깁니다. */
    steps: (page: ScenarioPage) => Promise<void>
}

/**
 * 화면 하나를 실제 브라우저에서 돌려 보는 시나리오를 정의합니다.
 * 화면 파일 옆에 `<이름>.verify.ts`로 두고 default export 하면 `pnpm verify`가 찾아 실행합니다.
 */
export function defineScenario(scenario: Scenario): Scenario {
    return scenario
}
