# FE 규칙 후보 카탈로그 (React + TypeScript)

에이전트가 쓴 코드에서 반복되는 문제를 린트 규칙이나 API 설계로 막기 위한 후보 30개입니다.
**채택 목록이 아니라 후보 목록입니다.** 팀 코드에 경고로 돌려 위반이 관측되는 것만 채택합니다.

팀 프로젝트 두 개에 돌린 결과와 항목별 채택 여부는 [measurement-2026-11-18.md](measurement-2026-11-18.md)에 있습니다. 아래 본문은 측정 전에 쓴 내용이라, 두 문서가 다르면 측정 결과가 우선입니다.

이 파일은 이전 컴퓨터에서 쓴 원본을 같은 기준으로 다시 작성한 것이라, 항목 번호와 세부 내용은 원본과 다를 수 있습니다.

## 후보 기준

아래 셋 다 "예"인 것을 후보로 넣었습니다.

- 대부분의 용도를 덮는 더 안전한 대안이 있는가?
- 위반을 기계가 잡을 수 있는가?
- 잘못 써도 일단 돌아가서 티가 안 나는가?

## 확인한 범위

- **확인함**: 아래 버전을 임시 폴더에 설치해 규칙 이름이 실제로 있는지 확인했습니다. "실행 확인"이라고 적은 규칙은 일부러 위반한 예제 파일 하나에서 실제로 걸리는 것까지 봤습니다.
- **확인 안 함**: 팀 코드에서의 오탐률, 옵션의 세부 동작, "실행 확인" 표시가 없는 규칙의 동작, knip과 jscpd.
- 예시의 `framework/*` 훅과 함수(`apiClient`, `defineQuery`, `defineMutation`, `useEventListener`, `useTimeout` 등)는 설명용 이름이고 아직 없습니다.

| 패키지 | 버전 |
|---|---|
| eslint | 9.39.5 |
| typescript-eslint | 8.73.0 |
| eslint-plugin-react-hooks | 7.1.1 |
| eslint-plugin-react | 7.37.5 |
| eslint-plugin-react-you-might-not-need-an-effect | 1.2.0 |
| @tanstack/eslint-plugin-query | 5.108.0 |
| eslint-plugin-jsx-a11y | 6.10.2 |
| @eslint-community/eslint-plugin-eslint-comments | 4.8.1 |
| eslint-plugin-import-x | 4.18.1 |
| eslint-plugin-boundaries | 7.4.4 |
| @vitest/eslint-plugin | 1.6.28 |
| eslint-plugin-testing-library | 7.16.2 |
| stylelint | 17.16.0 |

## 한눈에 보기

도입 방식은 네 가지로 나눴습니다.

- **켜기만**: 기존 규칙을 켜면 됩니다. 첫 위반 측정은 이 17개로 합니다.
- **설정 필요**: 기존 규칙이지만 폴더 구조나 금지 대상을 정해야 합니다.
- **API 먼저**: 대체 API를 먼저 만들어야 금지할 수 있습니다. 프레임워크 모듈 후보입니다.
- **리뷰 위주**: 기계로는 일부만 잡힙니다.

| 번호 | 항목 | 도입 방식 | 모듈 |
|---|---|---|---|
| A1 | `useEffect`로 데이터 불러오기 | API 먼저 | 데이터 |
| A2 | 이펙트 안에서 파생 상태 계산 | 켜기만 | |
| A3 | 이펙트로 이벤트 처리, 상태 연쇄 | 켜기만 | |
| A4 | 타이머 땜질 | API 먼저 | 이펙트 |
| A5 | 의존성 배열 누락 | 켜기만 | |
| A6 | 이벤트 리스너와 구독 수동 등록 | API 먼저 | 이펙트 |
| A7 | DOM 직접 조작 | 설정 필요 | |
| A8 | 렌더 중 부수효과, 컴포넌트 안 컴포넌트 | 켜기만 | |
| B1 | `fetch`/`axios` 직접 호출 | API 먼저 | 데이터 |
| B2 | 서버 데이터를 상태에 복사 | 리뷰 위주 | |
| B3 | 손으로 쓴 쿼리 키 | API 먼저 | 데이터 |
| B4 | 응답을 검증 없이 단언 | API 먼저 | 데이터 |
| B5 | 로딩과 에러 처리 누락 | API 먼저 | 데이터 |
| B6 | 변경 후 캐시 무효화 누락 | API 먼저 | 데이터 |
| C1 | `any` | 켜기만 | |
| C2 | `as` 단언 | 켜기만 | |
| C3 | `!` 단언 | 켜기만 | |
| C4 | 처리 안 된 Promise | 켜기만 | |
| C5 | 유니언 분기 누락 | 켜기만 | |
| D1 | `eslint-disable` | 켜기만 | |
| D2 | `@ts-ignore`, `@ts-expect-error` | 켜기만 | |
| D3 | 에러 삼키기 | 켜기만 | |
| D4 | 땜질 주석 | 켜기만 | |
| E1 | 기능 폴더 간 직접 import | 설정 필요 | 구조 |
| E2 | 비대한 파일과 함수 | 켜기만 | |
| E3 | 중복 코드와 죽은 코드 | 켜기만 | |
| F1 | 인라인 스타일, 생 색상값 | 설정 필요 | UI |
| F2 | 생 HTML 요소 | API 먼저 | UI |
| F3 | 접근성 | 켜기만 | |
| G1 | 가짜 테스트 | 켜기만 | |

**먼저 할 것**: D 묶음(탈출구)을 가장 먼저 켭니다. 이게 없으면 다른 규칙이 주석 한 줄로 무력화됩니다.

**기계로 일부만 잡히는 항목**: A3, B2, B5, B6, D3, G1.

---

## A. 이펙트와 상태

### A1. `useEffect`로 데이터 불러오기

- **문제**: 요청 경합(늦게 온 이전 응답이 최신 값을 덮음), 로딩·에러 상태 누락, 언마운트 후 `setState`가 생깁니다. 돌아가긴 해서 리뷰에서 놓치기 쉽습니다.
- **대안**: 프레임워크의 쿼리 훅(TanStack Query 기반).
- **탐지**: 제품 코드에서 `useEffect`, `useLayoutEffect` import 자체를 금지합니다. `no-restricted-imports`의 `importNames` (실행 확인). 프레임워크 구역만 예외로 둡니다.
- **주의**: 전면 금지는 A4, A6의 대체 훅이 준비된 뒤에 켭니다. 그 전에는 A2, A3 규칙으로 오용만 잡습니다.

```tsx
// 나쁨
const [user, setUser] = useState(null);
useEffect(() => {
  fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
}, [id]);

// 좋음
const { data: user } = useUser(id);
```

- **출처**: react.dev "You Might Not Need an Effect", "Synchronizing with Effects"의 데이터 패칭 절

### A2. 이펙트 안에서 파생 상태 계산

- **문제**: 다른 값에서 계산할 수 있는 것을 상태로 두고 이펙트에서 `setState`하면, 한 박자 늦은 값으로 한 번 더 렌더되고 두 값이 어긋날 수 있습니다.
- **대안**: 렌더 중에 계산합니다. 비싸면 `useMemo`.
- **탐지**: `react-hooks/set-state-in-effect`, `react-hooks/no-deriving-state-in-effects`, `react-you-might-not-need-an-effect/no-derived-state` (셋 다 실행 확인).

```tsx
// 나쁨
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(first + ' ' + last); }, [first, last]);

// 좋음
const fullName = first + ' ' + last;
```

- **출처**: react.dev "You Might Not Need an Effect"

### A3. 이펙트로 이벤트 처리, 상태 연쇄

- **문제**: "이 상태가 바뀌면 저걸 해라" 식으로 이펙트를 이어 붙이면 왜 실행됐는지 추적이 안 되고, 렌더가 여러 번 연쇄됩니다.
- **대안**: 사용자 동작으로 생긴 일은 이벤트 핸들러 안에서 처리합니다.
- **탐지**: `react-you-might-not-need-an-effect/no-event-handler`, `no-chain-state-updates`, `no-pass-data-to-parent`, `no-reset-all-state-on-prop-change`. 패턴이 다양해서 일부만 잡힙니다.

```tsx
// 나쁨
useEffect(() => {
  if (submitted) { post('/api/order', form); }
}, [submitted]);

// 좋음
function handleSubmit() { post('/api/order', form); }
```

- **출처**: react.dev "You Might Not Need an Effect"

### A4. 타이머 땜질

- **문제**: `setTimeout(fn, 0)`, `requestAnimationFrame`으로 순서 문제를 가립니다. 근본 원인은 남고, 타이머가 퍼지면 성능도 나빠집니다. 발표에서 Cursor 사례로 나온 것입니다.
- **대안**: 진짜 지연이 필요한 경우(디바운스, 토스트 자동 닫기)는 프레임워크 훅(`useTimeout`, `useDebouncedValue`)으로만 씁니다. 순서 문제는 원인을 고칩니다.
- **탐지**: `no-restricted-globals`로 `setTimeout`, `setInterval`, `requestAnimationFrame`, `requestIdleCallback` 금지 (실행 확인). `window.setTimeout` 형태는 `no-restricted-properties`로 막습니다.

```tsx
// 나쁨
setTimeout(() => inputRef.current?.focus(), 0);

// 좋음: 요소가 실제로 생기는 시점에 처리
<input ref={node => node?.focus()} />
```

- **출처**: 발표의 타이머 사례

### A5. 의존성 배열 누락

- **문제**: 오래된 값을 잡은 클로저가 실행됩니다. 에이전트는 경고를 없애려고 배열을 비우는 경우가 많습니다.
- **대안**: 의존성을 다 적습니다. 적었더니 무한 루프가 되면 그 이펙트는 A1~A3에 해당할 가능성이 큽니다.
- **탐지**: `react-hooks/exhaustive-deps`를 error로 (실행 확인). 기본은 경고입니다.

```tsx
// 나쁨
useEffect(() => { track(pageId); }, []);

// 좋음
useEffect(() => { track(pageId); }, [pageId]);
```

- **출처**: react.dev "Lifecycle of Reactive Effects"

### A6. 이벤트 리스너와 구독 수동 등록

- **문제**: 정리(cleanup)를 빼먹거나, 매 렌더마다 새 함수로 다시 등록합니다.
- **대안**: 프레임워크 훅 `useEventListener`, 외부 저장소는 `useSyncExternalStore` 기반 훅.
- **탐지**: 제품 코드에서 `addEventListener` 호출 금지. `no-restricted-syntax` 선택자 `CallExpression[callee.property.name='addEventListener']` (실행 확인). `react-you-might-not-need-an-effect/no-external-store-subscription`도 있습니다.

```tsx
// 나쁨
useEffect(() => {
  window.addEventListener('resize', onResize);
}, []);

// 좋음
useEventListener(window, 'resize', onResize);
```

- **출처**: react.dev "useSyncExternalStore", "Reusing Logic with Custom Hooks"

### A7. DOM 직접 조작

- **문제**: `document.querySelector`로 React가 관리하는 요소를 건드리면 React가 아는 상태와 화면이 어긋납니다.
- **대안**: ref, 또는 상태로 표현합니다.
- **탐지**: `no-restricted-properties`로 `document.querySelector`, `querySelectorAll`, `getElementById` 금지 (실행 확인). 렌더 중 ref 접근은 `react-hooks/refs`.

```tsx
// 나쁨
document.querySelector('#modal')?.classList.add('open');

// 좋음
<Modal open={isOpen} />
```

- **출처**: react.dev "Manipulating the DOM with Refs"

### A8. 렌더 중 부수효과, 컴포넌트 안 컴포넌트

- **문제**: 렌더 중에 props를 변경하거나 `Math.random()`, `Date.now()`를 부르면 렌더마다 결과가 달라집니다. 컴포넌트 안에서 컴포넌트를 정의하면 렌더마다 새 컴포넌트가 되어 상태가 날아갑니다.
- **대안**: 렌더는 순수하게 두고, 컴포넌트는 파일 최상위에 정의합니다.
- **탐지**: `react-hooks/purity`, `react-hooks/immutability`, `react-hooks/static-components`, `react/no-unstable-nested-components`.

```tsx
// 나쁨
function List({ items }) {
  const Row = ({ item }) => <li>{item.name}</li>;
  items.sort(byName);
  return <ul>{items.map(i => <Row key={i.id} item={i} />)}</ul>;
}

// 좋음
function Row({ item }) { return <li>{item.name}</li>; }
function List({ items }) {
  const sorted = [...items].sort(byName);
  return <ul>{sorted.map(i => <Row key={i.id} item={i} />)}</ul>;
}
```

- **출처**: react.dev "Keeping Components Pure"

---

## B. 데이터와 서버 상태

### B1. `fetch`/`axios` 직접 호출

- **문제**: 인증 헤더, 기본 URL, 에러 변환, 타임아웃이 호출마다 제각각이 됩니다.
- **대안**: 프레임워크의 `apiClient` 하나만 씁니다.
- **탐지**: `no-restricted-globals`로 `fetch` 금지, `no-restricted-imports`로 `axios` 금지 (둘 다 실행 확인).

```ts
// 나쁨
const res = await axios.get(`/api/users/${id}`, { headers: { Authorization: token } });

// 좋음
const user = await apiClient.get(`/users/${id}`, UserSchema);
```

- **출처**: bulletproof-react의 API 계층 문서

### B2. 서버 데이터를 상태에 복사

- **문제**: 쿼리 결과를 `useState`나 전역 스토어에 복사하면 원본이 둘이 되어, 다시 불러와도 화면이 안 바뀝니다.
- **대안**: 쿼리 캐시만 원본으로 씁니다. 폼 초기값처럼 복사가 필요한 경우는 `key`로 폼을 새로 만듭니다.
- **탐지**: `react-you-might-not-need-an-effect/no-initialize-state`, `no-derived-state`가 이펙트를 거친 복사는 잡습니다. `useState(query.data)`나 스토어에 넣는 경우는 못 잡아서 리뷰 몫입니다.

```tsx
// 나쁨
const { data } = useUser(id);
const [user, setUser] = useState(data);

// 좋음
const { data: user } = useUser(id);
```

- **출처**: TkDodo "Practical React Query", TanStack Query 문서

### B3. 손으로 쓴 쿼리 키

- **문제**: 키에 변수를 빼먹으면 다른 ID인데 같은 캐시를 씁니다. 문자열 오타가 나면 무효화가 조용히 실패합니다.
- **대안**: 키와 `queryFn`을 한곳에서 만드는 `queryOptions` 팩토리(프레임워크의 `defineQuery`).
- **탐지**: `@tanstack/query/exhaustive-deps`, `@tanstack/query/prefer-query-options` (둘 다 실행 확인).

```ts
// 나쁨
useQuery({ queryKey: ['user'], queryFn: () => getUser(id) });

// 좋음
const userQuery = (id: string) =>
  queryOptions({ queryKey: ['user', id], queryFn: () => getUser(id) });
```

- **출처**: TanStack Query 문서 "Query Options", ESLint 플러그인 문서

### B4. 응답을 검증 없이 단언

- **문제**: `res.json() as User`는 서버가 다른 모양을 줘도 통과하고, 한참 뒤 엉뚱한 곳에서 터집니다.
- **대안**: `apiClient`가 스키마(zod 등)를 필수 인자로 받아 경계에서 검증합니다.
- **탐지**: `@typescript-eslint/no-unsafe-assignment`, `no-unsafe-return`, `no-unsafe-member-access`(strictTypeChecked에 포함), 그리고 C2의 `as` 금지. B1로 통로를 `apiClient` 하나로 좁히면 검증이 빠질 수 없습니다.

```ts
// 나쁨
const user = (await res.json()) as User;

// 좋음
const user = UserSchema.parse(await res.json());
```

- **출처**: zod 문서, typescript-eslint `no-unsafe-*` 규칙 문서

### B5. 로딩과 에러 처리 누락

- **문제**: `data`가 `undefined`인 경우를 빼먹거나 `data?.` 로 뭉개서 빈 화면이 됩니다. 화면마다 스피너와 에러 UI도 제각각입니다.
- **대안**: 서스펜스 쿼리와 에러 경계를 씁니다. 컴포넌트는 데이터가 있는 경우만 다룹니다. **서스펜스를 쓴다는 전제**이고, 쓰지 않기로 하면 다르게 설계해야 합니다.
- **탐지**: 제품 코드에서 `@tanstack/react-query`의 `useQuery` import 금지. `no-restricted-imports`의 `importNames` (실행 확인). 경계를 실제로 감쌌는지는 못 잡습니다.

```tsx
// 나쁨
const { data } = useQuery(userQuery(id));
return <h1>{data?.name}</h1>;

// 좋음
const { data } = useSuspenseQuery(userQuery(id));
return <h1>{data.name}</h1>;
```

- **출처**: TanStack Query 문서 "Suspense"

### B6. 변경 후 캐시 무효화 누락

- **문제**: 저장은 됐는데 목록이 옛날 값 그대로입니다. 에이전트는 이를 `refetch()`나 타이머로 땜질하는 경우가 많습니다.
- **대안**: 무효화할 쿼리를 필수로 받는 `defineMutation`.
- **탐지**: 제품 코드에서 `useMutation` import 금지 (실행 확인). 무효화 대상이 맞는지는 못 잡습니다.

```ts
// 나쁨
useMutation({ mutationFn: updateUser });

// 좋음
defineMutation({ mutationFn: updateUser, invalidates: (v) => [userQuery(v.id)] });
```

- **출처**: TanStack Query 문서 "Invalidations from Mutations"

---

## C. 타입

### C1. `any`

- **문제**: 타입 검사가 꺼지고, `any`는 닿는 곳마다 퍼집니다.
- **대안**: `unknown`과 타입 가드, 또는 스키마 검증.
- **탐지**: `@typescript-eslint/no-explicit-any` (실행 확인)과 `no-unsafe-*` 계열. `strictTypeChecked`에 포함됩니다.

```ts
// 나쁨
function parse(input: any) { return input.items.length; }

// 좋음
function parse(input: unknown) { return ItemsSchema.parse(input).items.length; }
```

- **출처**: typescript-eslint 문서

### C2. `as` 단언

- **문제**: 컴파일러에게 "내 말을 믿어라"라고 하는 것이라, 틀려도 통과합니다. `as unknown as X`는 어떤 타입이든 뚫습니다.
- **대안**: 타입 가드, `satisfies`, 스키마 검증.
- **탐지**: `@typescript-eslint/consistent-type-assertions`에 `assertionStyle: 'never'` (실행 확인). 덜 엄격하게는 `no-unsafe-type-assertion`. 둘 다 `strictTypeChecked`에 없어서 따로 켜야 합니다.

```ts
// 나쁨
const el = event.target as HTMLInputElement;

// 좋음
if (!(event.target instanceof HTMLInputElement)) return;
const el = event.target;
```

- **출처**: typescript-eslint 문서

### C3. `!` 단언

- **문제**: `null`일 수 있다는 경고를 지워 버려서 런타임에 터집니다.
- **대안**: 명시적 분기, 또는 없을 때 의미 있는 에러를 던집니다.
- **탐지**: `@typescript-eslint/no-non-null-assertion` (실행 확인, `strictTypeChecked`에 포함).

```ts
// 나쁨
const name = user!.profile!.name;

// 좋음
if (!user?.profile) throw new Error('프로필이 없습니다');
const name = user.profile.name;
```

- **출처**: typescript-eslint 문서

### C4. 처리 안 된 Promise

- **문제**: `await`를 빼먹으면 실패가 조용히 사라지고 순서가 꼬입니다. `onClick={async () => ...}` 안의 실패도 마찬가지입니다.
- **대안**: `await`하거나, 일부러 기다리지 않는다면 `void`로 표시하고 에러 처리를 붙입니다.
- **탐지**: `@typescript-eslint/no-floating-promises` (실행 확인), `no-misused-promises`. 타입 정보가 필요한 규칙입니다.

```ts
// 나쁨
function handleSave() { save(form); close(); }

// 좋음
async function handleSave() { await save(form); close(); }
```

- **출처**: typescript-eslint 문서

### C5. 유니언 분기 누락

- **문제**: 상태 종류가 하나 늘었는데 `switch`가 그대로면, 새 경우가 조용히 기본 분기로 빠집니다.
- **대안**: 모든 경우를 다루고, 빠지면 컴파일이 깨지게 합니다.
- **탐지**: `@typescript-eslint/switch-exhaustiveness-check` (실행 확인, `strictTypeChecked`에 없어서 따로 켬). `no-unnecessary-condition`도 도움이 됩니다.

```ts
// 나쁨
switch (status) {
  case 'idle': return <Idle />;
  default: return <Done />;
}

// 좋음
switch (status) {
  case 'idle': return <Idle />;
  case 'loading': return <Spinner />;
  case 'done': return <Done />;
}
```

- **출처**: typescript-eslint 문서

---

## D. 탈출구

### D1. `eslint-disable`

- **문제**: 주석 한 줄로 어떤 규칙이든 끌 수 있으면 다른 규칙이 전부 의미가 없습니다. 에이전트는 막히면 이걸 먼저 씁니다.
- **대안**: 근본 원인을 고칩니다. 예외가 정말 필요하면 설정 파일에서 폴더 단위로 둡니다.
- **탐지**: `@eslint-community/eslint-comments/no-use` (실행 확인), 또는 ESLint 설정의 `linterOptions.noInlineConfig`. 단계적으로 가려면 `require-description`과 `linterOptions.reportUnusedDisableDirectives`부터 켭니다.

```ts
// 나쁨
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { load(id); }, []);

// 좋음: 주석 없이 원인을 고침 (A1)
const { data } = useItem(id);
```

- **출처**: ESLint 문서 "Configure Rules", eslint-comments 플러그인 문서

### D2. `@ts-ignore`, `@ts-expect-error`

- **문제**: 그 줄의 타입 오류를 전부 가립니다. 나중에 생긴 다른 오류도 같이 가려집니다.
- **대안**: 타입을 고칩니다. 외부 라이브러리 타입이 틀렸으면 선언 파일에서 보정합니다.
- **탐지**: `@typescript-eslint/ban-ts-comment` (실행 확인, `strictTypeChecked`에 포함).

```ts
// 나쁨
// @ts-ignore
const total: number = response.total;

// 좋음
const total = TotalSchema.parse(response).total;
```

- **출처**: typescript-eslint 문서

### D3. 에러 삼키기

- **문제**: 빈 `catch`나 `console.log`만 하는 `catch`는 실패를 성공처럼 보이게 합니다.
- **대안**: 처리할 수 없으면 잡지 않고 에러 경계까지 올립니다. 잡는다면 사용자에게 보이는 상태로 바꿉니다.
- **탐지**: `no-empty` (실행 확인), `@typescript-eslint/use-unknown-in-catch-callback-variable`, `only-throw-error`. 로그만 찍고 넘어가는 `catch`는 못 잡습니다.

```ts
// 나쁨
try { await save(form); } catch {}

// 좋음
try { await save(form); }
catch (error) { showToast(toMessage(error)); throw error; }
```

- **출처**: ESLint 문서 `no-empty`

### D4. 땜질 주석

- **문제**: `TODO`, `HACK`, "임시로" 같은 주석은 옳은 일을 안 한 이유를 적어 두는 곳이 되고, 다음 에이전트가 그 땜질을 패턴으로 복사합니다.
- **대안**: 지금 고치거나 이슈로 옮깁니다.
- **탐지**: `no-warning-comments`에 `todo`, `fixme`, `hack`, `workaround` 등록 (실행 확인). 발표처럼 주석을 거의 다 금지하는 것은 별도 결정입니다.

```ts
// 나쁨
// HACK: 렌더 순서 때문에 한 틱 늦춤
setTimeout(scrollToBottom, 0);

// 좋음: 주석과 땜질을 함께 없애고 원인을 고침 (A4)
```

- **출처**: 발표의 주석 사례, ESLint 문서 `no-warning-comments`

---

## E. 구조

### E1. 기능 폴더 간 직접 import

- **문제**: 기능 A가 기능 B의 내부 파일을 가져다 쓰면 결합이 퍼지고, 한쪽을 고칠 때 다른 쪽이 깨집니다.
- **대안**: 기능은 공개 진입점(`index.ts`)으로만 노출하고, 의존 방향은 한쪽(app → features → shared)으로만 둡니다.
- **탐지**: `eslint-plugin-boundaries`의 `boundaries/dependencies`, `boundaries/entry-point`, `boundaries/no-private`. 또는 `import-x/no-restricted-paths`, `import-x/no-internal-modules`, `import-x/no-cycle`. 폴더 구조를 설정에 적어야 합니다. boundaries 7.4.4에는 `dependencies`와 `element-types`가 둘 다 있는데, 어느 쪽이 권장인지는 확인하지 않았습니다.

```ts
// 나쁨
import { formatPrice } from '@/features/cart/utils/formatPrice';

// 좋음
import { formatPrice } from '@/shared/format';
```

- **출처**: bulletproof-react "Project Structure", Feature-Sliced Design

### E2. 비대한 파일과 함수

- **문제**: 에이전트는 기존 파일에 계속 덧붙입니다. 큰 파일은 사람도 에이전트도 전체를 못 읽고 일부만 보고 고칩니다.
- **대안**: 훅, 하위 컴포넌트, 순수 함수로 나눕니다.
- **탐지**: `max-lines`, `max-lines-per-function`, `complexity`. 기준 숫자는 팀 코드의 현재 분포를 보고 정합니다.

- **출처**: ESLint 문서, Frontend Fundamentals(토스)의 응집도 항목

### E3. 중복 코드와 죽은 코드

- **문제**: 에이전트는 기존 유틸을 찾지 않고 새로 만들고, 안 쓰게 된 코드를 남깁니다. 남은 코드는 다음 에이전트가 살아 있는 패턴으로 봅니다.
- **대안**: 안 쓰는 export와 파일, 의존성을 지웁니다.
- **탐지**: `@typescript-eslint/no-unused-vars`, `import-x/no-unused-modules`. 프로젝트 전체는 knip, 복붙 중복은 jscpd를 씁니다. knip과 jscpd는 설치해서 확인하지 않았습니다.

- **출처**: knip 문서, 발표의 정원 비유

---

## F. UI

### F1. 인라인 스타일, 생 색상값

- **문제**: `style={{ color: '#ff0000' }}`나 임의 픽셀 값이 흩어지면 디자인이 화면마다 달라지고 다크 모드가 깨집니다.
- **대안**: 디자인 토큰(CSS 변수)과 정해진 스타일 방식 하나.
- **탐지**: `react/forbid-dom-props`로 `style` 금지 (실행 확인). CSS 쪽은 stylelint `color-no-hex`, `color-named`, `declaration-property-value-disallowed-list`. Tailwind를 쓰면 임의 값(`w-[137px]`) 금지 규칙이 따로 필요합니다.

```tsx
// 나쁨
<p style={{ color: '#ff0000', marginTop: 13 }}>오류</p>

// 좋음
<Text tone="danger">오류</Text>
```

- **출처**: stylelint 문서, eslint-plugin-react 문서

### F2. 생 HTML 요소

- **문제**: `<button>`, `<input>`, `<select>`를 화면마다 직접 꾸미면 크기, 포커스 표시, 비활성 상태가 제각각이 됩니다.
- **대안**: 디자인 시스템의 `Button`, `Input`, `Select`. 이 컴포넌트가 먼저 있어야 금지할 수 있습니다.
- **탐지**: `react/forbid-elements`에 요소와 안내 메시지 등록 (실행 확인). UI 컴포넌트 폴더만 예외로 둡니다.

```tsx
// 나쁨
<button className="px-3 py-1 bg-blue-500 rounded" onClick={save}>저장</button>

// 좋음
<Button onClick={save}>저장</Button>
```

- **출처**: eslint-plugin-react 문서, shadcn/ui와 Radix Primitives의 컴포넌트 구성

### F3. 접근성

- **문제**: `div`에 `onClick`을 달아 키보드로 못 누르는 버튼, `alt` 없는 이미지, 라벨 없는 입력을 만듭니다. 화면으로는 멀쩡해 보입니다.
- **대안**: 의미에 맞는 요소(F2의 컴포넌트)와 라벨.
- **탐지**: `eslint-plugin-jsx-a11y`의 `strict` 설정. `click-events-have-key-events`, `no-static-element-interactions`, `alt-text`는 실행 확인.

```tsx
// 나쁨
<div onClick={open}>열기</div>

// 좋음
<Button onClick={open}>열기</Button>
```

- **출처**: eslint-plugin-jsx-a11y 문서, WAI-ARIA Authoring Practices

---

## G. 테스트

### G1. 가짜 테스트

- **문제**: 단언이 없는 테스트, `if` 안에 든 `expect`, `.skip`으로 꺼 둔 테스트, 구현을 그대로 베낀 모킹은 통과하지만 아무것도 확인하지 않습니다. 에이전트는 테스트가 실패하면 테스트 쪽을 약하게 고치기도 합니다.
- **대안**: 사용자에게 보이는 동작을 단언합니다.
- **탐지**: `vitest/expect-expect`, `vitest/no-conditional-expect`, `vitest/no-disabled-tests`, `vitest/no-focused-tests`, `vitest/valid-expect`, `testing-library/no-node-access`, `testing-library/no-container`. 단언이 의미 있는지는 못 잡아서, 변이 테스트(Stryker)나 리뷰가 필요합니다.

```ts
// 나쁨
it('저장한다', async () => {
  render(<Form />);
  await userEvent.click(screen.getByText('저장'));
});

// 좋음
it('저장하면 완료 문구가 보인다', async () => {
  render(<Form />);
  await userEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(await screen.findByText('저장했습니다')).toBeVisible();
});
```

- **출처**: Testing Library 문서 "Guiding Principles", @vitest/eslint-plugin 문서
