# @agent-greenhouse/framework 안내

이 프로젝트의 화면 코드는 이 프레임워크의 API로 만듭니다. 직접 쓰면 안 되는 것은 린트가 막고, 에러 메시지가 대신 무엇을 쓸지 알려 줍니다. 이 문서는 무엇이 어디에 있는지를 알려 줍니다.

## 먼저 알 것

- 작업을 마쳤다고 하기 전에 `npm run check`가 통과해야 합니다. 타입 검사, 린트, 테스트, 빌드, 화면 검증을 차례로 돌립니다.
- 린트 규칙을 끄는 주석(`eslint-disable`)은 쓸 수 없습니다. 에러 메시지가 알려 주는 API로 바꿉니다.
- 프레임워크에 없는 것이 필요하면 `node_modules` 안을 고치지 않습니다. 제품 폴더에 만들 수 있는 것은 만들고, 린트가 막는 것(생 `<button>` 등)이라면 사람에게 알립니다.
- 각 API의 인자와 설명은 타입 선언에 있습니다: `node_modules/@agent-greenhouse/framework/dist/<모듈>/*.d.ts`. 소스는 같은 패키지의 `src/<모듈>`에 있습니다.

## 폴더 약속

```
src/
  main.tsx, App.tsx     앱의 바깥 틀. 화면들을 조합합니다.
  api.ts                서버와 통신하는 클라이언트
  routes.ts             여러 기능이 가리키는 주소
  shared/               여러 기능이 같이 쓰는 코드
  <기능>/               기능 하나. 화면, 데이터, 테스트, 시나리오를 같이 둡니다.
```

- 기능 폴더는 자기 폴더, `shared/`, `src`에 바로 놓인 파일만 가져올 수 있습니다. 다른 기능 폴더는 가져올 수 없습니다. 같이 쓰는 코드는 `shared/`로 옮깁니다.
- 화면 코드(`.tsx`)가 있는 기능 폴더에는 화면 시나리오(`*.verify.ts`)가 하나 이상 있어야 합니다.
- 화면 코드에는 주석을 쓰지 않습니다. 테스트, 화면 시나리오, `fake` 폴더에는 쓸 수 있습니다.

## 모듈

모두 `@agent-greenhouse/framework/<모듈>`에서 가져옵니다.

### ui: 화면 부품

`Page`, `Card`, `Stack`, `Text`, `Button`, `TextField`, `Checkbox`, `Select`, `ErrorNotice`, `Dialog`, `ConfirmDialog`, `tokens`

- 생 `<button>`, `<input>`, `<select>`, `<dialog>`와 고정 값 인라인 `style`, `div`의 `onClick`은 쓸 수 없습니다.
- 모양은 `className`이 아니라 속성(`variant`, `tone`, `size`, `gap`)으로 고릅니다.
- 입력 컴포넌트는 `label`이 필수이고 `onChange`는 이벤트가 아니라 바뀐 값을 받습니다.
- 되돌릴 수 없는 동작은 `Button tone="danger"`와 `ConfirmDialog`를 씁니다.
- 컴포넌트로 안 되는 배치는 같은 폴더의 `*.module.css`에 쓰고, 값은 `var(--gh-space-md)` 같은 토큰 변수를 씁니다.
- ui를 가져오면 토큰과 기본 스타일이 전역으로 들어갑니다. 따로 불러올 CSS는 없습니다.
- 모든 화면에 보이는 메뉴는 `Page`의 `header`에 넘깁니다. 본문과 같은 너비에 맞춰 놓입니다.
- 폼은 `<form onSubmit>`을 그대로 씁니다. 제출 버튼은 `Button type="submit"`입니다.
- 테스트와 시나리오에서 역할로 찾을 때: `Dialog`는 `dialog`, `ConfirmDialog`는 `alertdialog`, `Select`는 `combobox`, `ErrorNotice`와 입력 오류 문장은 `alert`입니다.

### data: 서버 데이터

`createApiClient`, `defineQuery`, `defineMutation`, `useData`, `useDeferredData`, `useMutate`, `DataBoundary`, `DataProvider`, `isApiError`

```ts
const TaskSchema = z.object({ id: z.number(), title: z.string() })

export const taskListQuery = defineQuery({
    scope: ['tasks', 'list'],
    load: ({ signal }, status: string) =>
        api.get('/tasks', { schema: z.array(TaskSchema), query: { status }, signal }),
})

export const addTask = defineMutation({
    run: (input: { title: string }) => api.post('/tasks', { schema: TaskSchema, body: input }),
    invalidates: () => [taskListQuery.all()],
})
```

- `fetch`, `axios`, `@tanstack/react-query`는 직접 쓸 수 없습니다. `useEffect`로 데이터를 불러오지 않습니다.
- 응답 스키마(zod)는 필수입니다.
- 조회는 `useData(taskListQuery(status))`로 읽고, 불러오는 중과 실패는 그 컴포넌트를 감싼 `DataBoundary(pending, renderError)`가 그립니다.
- 검색어처럼 인자가 자주 바뀌는 조회는 `useDeferredData`를 씁니다.
- 변경은 `useMutate(addTask)`로 하고 `isPending`, `isError`, `error`로 상태를 그립니다.
- 주소나 필터가 바뀌어 다른 데이터를 받을 때, 이미 그려진 화면은 새 데이터가 올 때까지 이전 내용을 그대로 보여 줍니다. 그때도 "불러오는 중"을 보여야 하면 `DataBoundary`에 `key`를 줘서 새로 그리게 합니다: `<DataBoundary key={status} ...>`.
- 서버가 준 상태 코드는 `isApiError(error) && error.status === 404`처럼 읽습니다.

### effect: 타이머와 이벤트

`useTimeout`, `useInterval`, `useDebouncedValue`, `useEventListener`, `useClickOutside`, `useKeydown`, `useAnimationFrame`

- `useEffect`, `setTimeout`, `setInterval`, `addEventListener`는 직접 쓸 수 없습니다.

### router: 주소와 화면

`defineRoute`, `AppRouter`, `RouteView`, `Link`, `ExternalLink`, `useNavigate`, `useRouteParams`, `useSearchParam`, `defineAccess`, `useLoginReturn`

```tsx
export const plantDetailRoute = defineRoute('/plants/:id')

<Link to={plantDetailRoute.href({ id: 3 })}>3번 식물</Link>
const { id } = useRouteParams(plantDetailRoute)
const [sort, setSort] = useSearchParam('sort', 'name')
```

- `react-router`와 생 `<a>`는 직접 쓸 수 없습니다.
- 화면은 `App.tsx`의 `RouteView`에 `{ route, screen }`으로 연결합니다.
- 어떤 주소에 오면 곧바로 다른 주소로 보내려면 `Redirect`를 화면으로 연결합니다: `{ route: homeRoute, screen: <Redirect to={ordersRoute.href()} /> }`.
- 메뉴 항목은 `Link appearance="nav"`입니다. 지금 화면이면 `aria-current`가 붙습니다.

#### 로그인해야 들어갈 수 있는 화면

로그인 상태 자체(누가 로그인했는지)는 앱이 `createContext`와 `useState`로 들고 있고, 프레임워크에는 그 상태를 `access`로 알려 줍니다.

```tsx
// src/access.ts
export type Role = 'admin' | 'staff'
export const { AccessProvider, ProtectedRoute } = defineAccess<Role>()

// App.tsx: AppRouter 안에서 화면들을 감쌉니다.
<AccessProvider
    access={user ? { status: 'signedIn', role: user.role } : { status: 'signedOut' }}
    loginPath={loginRoute.href()}
    deniedPath={ordersRoute.href()}
>
    <RouteView
        routes={[
            { route: loginRoute, screen: <LoginScreen /> },
            { route: ordersRoute, screen: <ProtectedRoute><OrdersScreen /></ProtectedRoute> },
            { route: adminRoute, screen: <ProtectedRoute requiredRoles={['admin']}><AdminScreen /></ProtectedRoute> },
        ]}
        notFound={<NotFound />}
    />
</AccessProvider>

// 로그인 화면
const { returnPath, wasSentHere } = useLoginReturn(ordersRoute.href())
// wasSentHere이면 "로그인이 필요합니다"를 보여 줍니다.
// 로그인에 성공하면: navigate(returnPath, { replace: true })
```

- `access`의 `status`는 `'checking'`(아직 모름), `'signedOut'`, `'signedIn'`입니다. `role`이 `null`이면 역할을 아직 받지 못한 것입니다.
- 로그인하지 않았으면 `loginPath`로, 역할이 맞지 않으면 `deniedPath`로 보냅니다. 확인 중이면 기다립니다.
- 로그아웃은 로그인 상태만 `signedOut`으로 바꾸면 됩니다. 보고 있던 화면이 로그인 화면으로 보내고, 스스로 나간 것이므로 `wasSentHere`는 거짓입니다.
- 화면을 가리는 것일 뿐이므로 서버도 같은 권한을 검사해야 합니다.

### assert

`invariant(조건, 메시지)`. `!`(non-null 단언) 대신 씁니다.

### fake-api: 가짜 서버

`createFakeApi`. 백엔드가 아직 없을 때 `src/shared/fake/fakeApi.ts`에 `createFakeServer`를 만들어 내보내고, `vite.config.ts`에 플러그인을 넣습니다.

```ts
// src/shared/fake/fakeApi.ts
import { createFakeApi, type FakeApi } from '@agent-greenhouse/framework/fake-api'

export function createFakeServer(options: { delayMs?: number } = {}): FakeApi {
    const orders = [{ id: 1, customer: '김하늘', status: 'pending' }]
    return createFakeApi({
        delayMs: options.delayMs ?? 0,
        routes: [
            {
                method: 'GET',
                path: '/api/orders/:id',
                handler: ({ params, query, body }) => {
                    const order = orders.find((candidate) => candidate.id === Number(params.id))
                    return order ? { body: order } : { status: 404, body: { code: 'NOT_FOUND' } }
                },
            },
        ],
    })
}
```

- `path`는 `/api`부터 적습니다. `:이름` 자리는 `params`로, `?` 뒤는 `query.get('이름')`으로, 요청 본문은 `body`로 받습니다.
- 데이터는 `createFakeServer`를 부를 때마다 처음 상태입니다. 개발 서버는 응답을 400ms 늦추고 테스트는 바로 받습니다.

```ts
import { fakeServerPlugin } from '@agent-greenhouse/framework/vite'
plugins: [react(), fakeServerPlugin({ entry: '/src/shared/fake/fakeApi.ts' })]
```

화면 코드는 실제 서버가 있을 때와 똑같이 `/api/...`로 요청을 보냅니다. 백엔드가 생기면 플러그인을 빼고 Vite의 프록시로 바꿉니다.

### testing: 테스트 도우미

`renderWithData(ui, { path })`, `connectFakeApi(fakeServer)`, `advanceTime(ms)`

- `renderWithData`는 데이터 모듈을 연결해 화면을 그립니다. `path`를 주면 그 주소에서 연 것처럼 그립니다.
- `connectFakeApi(createFakeServer())`는 테스트 동안 요청을 가짜 서버로 보냅니다. `beforeEach`에서 새로 만들면 테스트마다 데이터가 처음 상태입니다.
- 타이머는 `vi.useFakeTimers()`와 `advanceTime`으로 넘깁니다.
- `connectFakeApi`가 돌려준 가짜 서버로 상황을 만듭니다: `failOnce(500)`은 다음 요청 하나를 실패시키고, `hangOnce()`는 다음 요청 하나를 응답 없이 붙잡아 "불러오는 중"이나 "저장 중"을 볼 수 있게 하고, `requests()`는 받은 요청 목록을 줍니다. 화면이 요청을 여러 개 보내면 "다음 요청"이 어느 것인지 순서를 확인하고 씁니다.

### verify: 화면 시나리오

`defineScenario`. 화면 파일 옆에 `<이름>.verify.ts`로 두면 `npm run verify`가 실제 브라우저(Chrome)에서 돌립니다.

```ts
export default defineScenario({
    name: '식물',
    path: '/plants',
    steps: async (page) => {
        await page.see({ role: 'heading', name: '식물' })
        await page.shot('목록')
        await page.select({ label: '정렬' }, '재고 많은 순')
        await page.shot('재고 많은 순')
    },
})
```

- 대상은 사용자가 보는 것으로 고릅니다: `{ role, name }`, `{ label }`, `{ text }`.
- 서버가 정상일 때 볼 수 없는 화면(불러오는 중, 실패, 빈 목록)은 `page.hold`, `page.fail`, `page.respond`로 요청을 가로채 만듭니다.
- 화면을 덮는 창은 `page.shot(이름, { area: 'viewport' })`로 찍습니다.
- 밝은 화면, 어두운 화면, 너비 375px 세 조건에서 돌립니다.
- 시나리오는 파일 하나에 하나입니다(`export default`). 여러 개면 파일을 나눕니다.
- `page.reload()`는 페이지를 새로 불러오므로 메모리에만 있는 상태(로그인 등)가 사라집니다. 로그인한 뒤의 "불러오는 중"은 로그인 버튼을 누르기 전에 `page.hold`를 걸어 만듭니다.
- 이미 받아 둔 데이터는 다시 요청하지 않을 수 있습니다. 실패 화면은 아직 받지 않은 데이터로 만듭니다.
- 시나리오가 일부러 내는 서버 실패는 `expectedConsoleErrors`에 적습니다. 서버의 실패 응답은 `응답 404: GET /api/orders/99` 모양으로, 화면이 그 에러를 콘솔에 남긴 것은 요청 글자(`GET /api/orders/99`)가 든 메시지로 걸리므로 `'GET /api/orders/99'`처럼 요청 글자를 적으면 둘 다 걸러집니다.

## 스크린샷 검토

새로 생겼거나 달라진 스크린샷이 있으면 `npm run verify`가 실패하고, 검토할 모아 보기 그림(`evidence/review/*.png`)을 알려 줍니다.

1. 모아 보기 그림을 엽니다. 잘림, 겹침, 어긋난 정렬, 안 보이는 글자, 틀린 문구가 있는지 봅니다.
2. 문제가 있으면 기록하지 말고 코드를 고친 뒤 다시 돌립니다.
3. 문제가 없으면 그림 위쪽의 확인 코드와 본 내용을 기록합니다.

```bash
npx greenhouse verify:review <장 이름> <확인 코드> "<무엇을 확인했는지>"
```

`evidence/` 폴더는 커밋하지 않습니다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run check` | 타입 검사, 린트, 테스트, 빌드, 화면 검증을 차례로 |
| `npm run verify` | 화면 시나리오만. 뒤에 경로 일부를 붙이면 그 시나리오만 (`npm run verify -- plants`) |
| `npx greenhouse verify:review` | 검토가 남은 모아 보기 목록 |
| `npx eslint --fix <파일>` | 자동으로 고칠 수 있는 것(주석 등)을 고침 |
