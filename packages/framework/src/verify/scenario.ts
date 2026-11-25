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
    /**
     * 'viewport'를 주면 지금 화면에 보이는 영역만 찍습니다.
     * 화면을 덮는 모달(Dialog, ConfirmDialog)은 이것으로 찍어야 뒤 화면과 함께 제자리에 나옵니다.
     */
    area?: 'page' | 'viewport'
}

/**
 * 서버로 가는 요청을 메서드와 경로로 가리킵니다. 쿼리(`?` 뒤)는 적지 않습니다.
 * 경로의 한 칸은 `*`로 아무 값이나 받을 수 있습니다.
 * 예: 'GET /api/tasks', 'PATCH /api/tasks/*'
 */
export type RequestPattern = `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /${string}`

/** 서버 대신 돌려줄 응답. status를 안 주면 200입니다. body는 JSON으로 보냅니다. */
export type Reply = {
    status?: number
    body?: unknown
}

/** 요청 가로채기 하나. stop을 부를 때까지 그 요청을 계속 가로챕니다. */
export type Interception = {
    /** 가로채기를 끝냅니다. 붙잡아 둔 요청이 있으면 서버로 보냅니다. */
    stop: () => Promise<void>
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
    /** 페이지를 새로 엽니다. 처음 불러올 때의 화면을 보려면 가로채기를 건 뒤에 부릅니다. */
    reload: () => Promise<void>
    /**
     * 그 요청을 서버로 보내지 않고 붙잡아 둡니다. "불러오는 중"이나 "저장 중" 화면을 찍을 때 씁니다.
     * stop을 부르면 붙잡아 둔 요청이 서버로 갑니다.
     */
    hold: (request: RequestPattern) => Promise<Interception>
    /**
     * 그 요청에 서버 대신 실패 응답을 돌려줍니다. status를 안 주면 500입니다.
     * 화면이 다시 시도해도 stop을 부를 때까지 계속 실패합니다.
     */
    fail: (request: RequestPattern, status?: number) => Promise<Interception>
    /** 그 요청에 서버 대신 주어진 응답을 돌려줍니다. 빈 목록 같은 화면을 만들 때 씁니다. */
    respond: (request: RequestPattern, reply: Reply) => Promise<Interception>
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
     *
     * 서버의 실패 응답(400 이상)도 `응답 400: POST /api/tasks` 모양의 메시지로 여기에 걸립니다.
     * 시나리오가 일부러 내는 실패(빈 값으로 저장 등)는 그 글자를 그대로 적습니다.
     * fail이나 respond로 가로채서 낸 실패는 적지 않아도 됩니다. 그 실패를 화면이 콘솔에 다시 남긴 것도
     * 메시지에 그 요청(`GET /api/tasks`)이 들어 있으면 세지 않습니다. 들어 있지 않으면 여기에 적습니다.
     */
    expectedConsoleErrors?: readonly string[]
    /**
     * 사용자가 하는 순서대로 조작하고, 볼 만한 상태마다 shot으로 남깁니다.
     * 서버가 정상일 때는 볼 수 없는 화면(불러오는 중, 실패, 빈 목록)은 hold, fail, respond로 만듭니다.
     * 가로채도록 한 요청이 끝까지 오지 않으면 문제로 보고됩니다.
     */
    steps: (page: ScenarioPage) => Promise<void>
}

/**
 * 화면 하나를 실제 브라우저에서 돌려 보는 시나리오를 정의합니다.
 * 화면 파일 옆에 `<이름>.verify.ts`로 두고 default export 하면 `pnpm verify`가 찾아 실행합니다.
 */
export function defineScenario(scenario: Scenario): Scenario {
    return scenario
}
