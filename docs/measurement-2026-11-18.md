# 팀 코드 측정 결과 (2026-11-18)

[후보 카탈로그](fe-rule-catalog.md)의 규칙을 팀 프로젝트 두 개에 경고로 돌려, 위반 횟수를 세고 표본을 읽어 오탐 여부를 판정했습니다.

## 요약

- **바로 켤 수 있는 규칙이 많습니다.** `any`, `@ts-ignore`, 빈 `catch`는 두 프로젝트 모두 0건이고, `eslint-disable`은 9건뿐입니다. 탈출구(D 묶음)를 지금 막아도 고칠 것이 거의 없습니다.
- **`useEffect`는 141곳에서 쓰이고, 그중 상당수가 이벤트 리스너 등록과 타이머입니다.** 표본에서 이 둘은 대부분 정당한 용도였습니다. 금지보다 대체 훅(`useEventListener`, `useClickOutside`, `useDebounce`, `useAnimationFrame`)이 먼저입니다.
- **오탐이 많아 채택하지 않을 규칙을 확인했습니다.** `no-event-handler`, `no-initialize-state`, `document.createElement` 금지, `no-confusing-void-expression`, `restrict-template-expressions`입니다.
- **옵션을 조정해야 쓸 수 있는 규칙이 있습니다.** `no-floating-promises`는 위반의 약 60%가 `navigate()` 호출이라 그대로 켜면 소음입니다.
- **카탈로그에 없던 문제를 찾았습니다.** API 응답에 대한 방어적 `?.`과 `??`가 279곳 있습니다. 타입은 값이 있다고 하는데 코드는 믿지 않는다는 뜻이라, 응답 검증(B4)이 필요하다는 증거입니다.

## 측정 방법

- **대상**: 사내 팀 프로젝트 두 개입니다. 프로젝트 A(455개 파일)와 프로젝트 B(447개 파일)로 표기합니다. 프로젝트 이름, 내부 파일 이름, 식별자는 가렸습니다.
- **스택**: 둘 다 Vite, React 19, TypeScript, TanStack Query, axios, zustand, React Router 7, CSS 모듈, React Compiler.
- **팀 코드는 수정하지 않았습니다.** 플러그인과 설정은 임시 폴더에 두고, 팀 프로젝트 폴더에서 그 설정을 지정해 ESLint와 stylelint를 실행했습니다. 실행 전후 `git status`가 같습니다.
- **`eslint-disable` 주석은 무시하고 셌습니다**(`--no-inline-config`). 가려진 위반도 횟수에 들어갑니다.
- **측정 도구**는 [tools/measure](../tools/measure)에 복사해 뒀습니다. 다시 돌리려면 그 폴더에서 `pnpm install` 후, 팀 프로젝트 폴더에서 `eslint --no-config-lookup -c <tools/measure 경로>/measure.config.mjs --no-inline-config -f json -o out-<프로젝트>.json src`를 실행합니다.

## 한계

- **오탐 판정은 표본 기준입니다.** 규칙마다 3~14개를 코드 조각으로 읽고 제가 판단했습니다. 전수 조사가 아니고, 팀의 의도를 모르는 상태의 판단입니다.
- **0건으로 나온 규칙 중 두 개는 동작을 확인하지 못했습니다.** `import-x/no-cycle`과 `@tanstack/query/exhaustive-deps`입니다. 정말 0건인지 규칙이 제대로 안 돈 것인지 모릅니다.
- **B2(서버 데이터를 상태에 복사)는 측정하지 못했습니다.** zustand 스토어에 넣는 경우를 잡는 규칙이 없습니다.
- **기능 폴더 간 import는 세지 못했습니다.** 이유는 E1 항목에 있습니다.
- knip, jscpd는 실행하지 않았습니다.

## 항목별 결과

횟수는 프로젝트 A / 프로젝트 B 순서이고, 따로 적지 않으면 테스트 폴더를 뺀 숫자입니다.

### A. Effect와 상태

| 항목 | 규칙 | 횟수 | 표본 판정 | 결론 |
|---|---|---|---|---|
| A1 | `useEffect` 호출 수 | 78 / 63 | 측정용 숫자 | 대체 훅이 생긴 뒤 금지 |
| A2 | `react-hooks/set-state-in-effect` | 16 / 16 | 5개 모두 실제 문제 | 채택 |
| A2 | `no-effect/no-adjust-state-on-prop-change` | 4 / 18 | 4개 모두 실제 문제 | 채택 |
| A2 | `no-effect/no-derived-state` | 13 / 5 | 4개 중 3개는 안내가 틀림 | 메시지를 바꿔서 채택 |
| A3 | `no-effect/no-event-handler` | 10 / 11 | 4개 중 3개 오탐 | 채택 안 함 |
| A3 | `no-effect/no-initialize-state` | 8 / 0 | 3개 모두 부정확 | 채택 안 함 |
| A4 | 타이머 전역 함수 | 29 / 10 | 11개 중 9개 정당 | 대체 훅 먼저 |
| A5 | `react-hooks/exhaustive-deps` | 7 / 3 | 4개 모두 실제 문제 | 에러로 올림 |
| A6 | `addEventListener` | 31 / 24 | 6개 모두 정당한 용도 | 대체 훅 먼저 |
| A7 | `document.*` | 3 / 6 | 9개 모두 정당 | 채택 안 함 |
| A8 | `react-hooks/refs` | 20 / 3 | 5개 중 2개 실제, 3개 판단 필요 | 보류 |
| A8 | `react/no-unstable-nested-components` | 3 / 0 | 읽지 않음 | 채택 |

- **A2 `no-derived-state`**: 잡힌 코드는 "prop이 바뀌면 폼 입력값을 초기화"하는 패턴입니다. 문제인 것은 맞지만 규칙의 안내("렌더 중에 계산하라")는 수정 가능한 입력값에는 맞지 않습니다. 맞는 답은 `key`로 컴포넌트를 새로 만드는 것입니다.
- **A3 오탐 예**: 새 메시지가 오면 맨 아래로 스크롤, `autoFocus`일 때 포커스 주기. 둘 다 Effect가 맞는 자리입니다.
- **A4**: 정당한 용도는 애니메이션 루프, 검색 디바운스, 닫힘 애니메이션 대기, 툴팁 페이드였습니다. 땜질은 `setTimeout(remove, 0)`과 입력 직후 커서 위치를 `requestAnimationFrame`으로 되돌리는 코드 2개였습니다.
- **A5**: 프로젝트 A의 7건은 표본 4건 모두 `eslint-disable`로 가려져 있었습니다. 이 프로젝트의 `eslint-disable` 8개 중 5개가 이 규칙을 끄는 용도입니다.
- **A6**: 키 입력, 바깥 클릭, 리사이즈, 탭 전환 감지였습니다. 같은 등록·해제 코드가 55곳에 반복됩니다.
- **A7**: `createRoot`용 `getElementById`, 파일 다운로드용 `<a>` 생성, 외부 스크립트 로드였습니다. React가 관리하는 DOM을 건드리는 코드는 0건입니다. 다만 다운로드용 `<a>` 생성 코드가 5곳에 복사돼 있습니다.
- **A8 `refs`**: 렌더 중 ref 값을 읽어 화면에 쓰는 2건은 실제 문제입니다. 나머지 3건은 "최신 값을 ref에 저장"하는 흔한 패턴입니다. 두 프로젝트가 React Compiler를 쓰고 있어서 이 규칙의 의미가 큰데, 팀이 판단해야 합니다.

### B. 데이터와 서버 상태

| 항목 | 규칙 | 횟수 | 표본 판정 | 결론 |
|---|---|---|---|---|
| B1 | `axios` import | 16 / 5 | 13개 중 약 절반은 타입·에러 판별용 | 옵션 조정 후 채택 |
| B1 | `fetch` | 1 / 0 | SSE 전용 코드, 정당 | 그 파일만 예외 |
| B3 | `@tanstack/query/prefer-query-options` | 32 / 17 | 오탐은 아니나 팀 관례와 다름 | 팀 결정 필요 |
| B5 | `useQuery` import | 21 / 14 | 대부분 `hooks/` 안 | `hooks/` 밖만 금지 |
| B6 | `useMutation` import | 11 / 16 | 대부분 `hooks/` 안 | `hooks/` 밖만 금지 |
| B4 | `no-unsafe-*` 계열 | 4 / 8 | `import.meta.env` 타입 누락 | 환경 변수 타입 선언으로 해결 |

- **B1**: `import type { AxiosError }`와 `isAxiosError`가 절반입니다. 타입 import는 허용(`allowTypeImports`)하고 에러 판별 함수를 공용 axios 인스턴스 쪽에서 내보내면 됩니다. 공용 axios 인스턴스가 이미 있는데도 `axios`를 직접 쓰는 파일이 있습니다.
- **B3**: 두 프로젝트 모두 쿼리 키 팩토리를 이미 쓰고 있습니다. `queryOptions`로 바꾸는 것은 관례 변경이라 급하지 않습니다.
- **B5, B6**: 팀이 이미 "쿼리는 `hooks/`에서만"이라는 구조를 쓰고 있습니다. `hooks/` 밖에서 `useQuery`를 쓰는 곳은 프로젝트 A 6곳, 프로젝트 B 1곳입니다. 폴더 예외만 두면 지금 구조를 그대로 강제할 수 있습니다.

### C. 타입

| 항목 | 규칙 | 횟수 | 표본 판정 | 결론 |
|---|---|---|---|---|
| C1 | `no-explicit-any` | 0 / 0 | | 채택 |
| C2 | `consistent-type-assertions` (`never`) | 87 / 68 | 14개 중 대부분 대안이 필요한 정당한 용도 | 한 번에 못 올림 |
| C3 | `no-non-null-assertion` | 9 / 1 | 4개 중 3개 실제 | 테스트 제외하고 채택 |
| C4 | `no-floating-promises` | 24 / 12 | `navigate()`가 14 / 8 | 옵션 조정 후 채택 |
| C4 | `no-misused-promises` | 24 / 11 | `navigate()`가 12 / 1 | 옵션 조정 후 채택 |
| C5 | `switch-exhaustiveness-check` | 2 / 0 | 읽지 않음 | 채택 |
| | `no-unnecessary-condition` | 117 / 162 | 6개 모두 방어 코드 | 응답 검증 전에는 켜지 않음 |
| | `no-confusing-void-expression` | 250 / 158 | 대부분 한 줄 핸들러 | 끔 |
| | `restrict-template-expressions` | 183 / 103 | 숫자를 문자열에 넣는 경우 | 숫자 허용 옵션 |

- **C2**: 문자열을 유니언 타입으로 좁히기(`value as 유니언타입`), `AxiosError` 캐스팅, CSS 변수 객체(`as CSSProperties`), `unknown` 응답 다루기였습니다. 타입 가드 유틸과 에러 판별 함수가 먼저 있어야 줄일 수 있습니다. 테스트 코드에는 216건이 더 있습니다.
- **C3**: `enabled`로 막아 둔 쿼리에서 인자에 `!`를 붙이는 패턴이 반복됩니다. `main.tsx`의 `getElementById('root')!`는 예외로 둡니다.
- **C4**: React Router 7의 `navigate()`가 `Promise | void`를 반환해서 걸립니다. `allowForKnownSafeCalls` 옵션으로 제외합니다. 남는 것 중 `invalidateQueries`를 기다리지 않는 10건은 실제 문제입니다. `no-misused-promises`는 `onSubmit={async 함수}`도 잡는데, 이건 `checksVoidReturn.attributes`를 끄는 것이 일반적입니다.
- **`no-unnecessary-condition`**: `adapters/`와 `mappers/`에 131건이 몰려 있습니다. 타입상 값이 있는 API 응답에 `?.`과 `??`를 붙인 것입니다. 이 규칙을 켜면 에이전트가 방어 코드를 지우게 되므로, 응답을 스키마로 검증하기 전에는 켜면 안 됩니다. 두 프로젝트 모두 zod 같은 검증 라이브러리가 없습니다.

### D. 탈출구

| 항목 | 규칙 | 횟수 | 결론 |
|---|---|---|---|
| D1 | `eslint-disable` 사용 | 8 / 1 | 채택 |
| D2 | `ban-ts-comment` | 0 / 0 | 채택 |
| D3 | `no-empty` | 0 / 0 | 채택하되 실제 패턴은 못 잡음 |
| D4 | `no-warning-comments` | 8 / 0 | 용어 조정 후 채택 |

- **D1**: 프로젝트 A의 8건은 `exhaustive-deps` 5건, 네이밍 규칙 3건입니다. 네이밍 3건은 설정 파일의 예외로 옮길 수 있습니다.
- **D3**: 빈 `catch`는 없지만, `catch` 안에서 `console.error`만 하고 끝나는 코드가 텍스트 검색으로 프로젝트 A 약 4곳, 프로젝트 B 약 35곳입니다. 기존 규칙으로는 못 잡아서 직접 만든 선택자가 필요합니다.
- **D4**: 금지 용어에 넣은 "임시"가 "임시 저장" 같은 정상 주석을 잡았습니다. 용어를 `todo`, `fixme`, `hack`으로 줄입니다.

### E. 구조

- **E1**: 두 프로젝트는 레이어가 먼저인 구조입니다(`components/기능`, `hooks/기능`, `queries/기능`). 그런데 같은 기능의 폴더 이름이 레이어마다 다릅니다(예: `components/SomeFeature`와 `hooks/feature`처럼 단어와 대소문자가 다름). 그래서 기능 간 import를 기계로 셀 수 없었고, 지금 구조로는 기능 경계 규칙도 만들 수 없습니다. 레이어 역방향 import는 셀 수 있었습니다: `hooks → components`가 13건 / 2건입니다.
- **E2**: 300줄을 넘는 파일이 34개 / 27개, 500줄 초과 12개 / 8개, 1000줄 초과 3개 / 2개입니다. 가장 큰 파일 세 개는 1565줄, 1326줄, 1124줄입니다. 100줄 넘는 함수는 59개 / 39개, 복잡도 15 초과는 28개 / 8개입니다. 중앙값은 58줄이라 기준 300줄은 무리가 없습니다.
- **E3**: 안 쓰는 변수는 3건 / 0건입니다. TypeScript의 `noUnusedLocals`가 이미 켜져 있습니다.

### F. UI

| 항목 | 규칙 | 횟수 | 표본 판정 | 결론 |
|---|---|---|---|---|
| F1 | `style` 속성 | 93 / 38 | 7개 중 3개는 동적 값이라 정당 | 전면 금지는 안 됨 |
| F1 | CSS의 hex 색상 | 1453 / 763 | 읽지 않음 | 토큰 먼저 |
| F2 | 생 `<button>` | 140 / 101 | 5개 모두 실제 | 공용 컴포넌트 폴더 밖만 금지 |
| F2 | 생 `<input>` | 28 / 38 | | 같음 |
| F3 | jsx-a11y 전체 | 84 / 51 | 규칙마다 다름 | 일부만 채택 |

- **F1 `style`**: 막대 너비(`${percent}%`)나 계산된 색처럼 실행 중에 정해지는 값은 `style`이 맞습니다. 고정 값(고정 여백, 고정 색상)만 문제입니다. 고정 값만 잡는 선택자를 직접 만들어야 합니다.
- **F1 색상**: 프로젝트 A는 CSS 변수 정의가 29개인데 서로 다른 hex 값이 138종입니다. 프로젝트 B는 변수 100개에 hex 63종으로 토큰화가 더 진행돼 있습니다. hex 횟수에는 토큰을 정의하는 줄도 포함돼 있습니다.
- **F2**: 두 프로젝트 모두 `components/shared`에 `Button`과 `Input`이 있는데, 생 `<button>`이 241곳입니다. 카탈로그에서 가장 뚜렷하게 확인된 문제입니다.
- **F3**: `click-events-have-key-events`는 4개 중 3개가 실제 문제(`div`에 `onClick`)이고 1개는 모달 배경 클릭입니다. `label-has-associated-control`은 3개 중 2개가 오탐입니다(`aria-labelledby`로 연결한 커스텀 컨트롤).

### G. 테스트

| 규칙 | 횟수 | 표본 판정 | 결론 |
|---|---|---|---|
| `vitest/expect-expect` | 9 / 4 | 3개 모두 오탐 | 옵션 조정 후 채택 |
| `vitest/valid-expect` | 5 / 0 | 2개 중 1개 오탐 | 옵션 조정 후 채택 |
| `vitest/no-commented-out-tests` | 8 / 9 | 읽지 않음 | 채택 |
| `testing-library/no-node-access` | 123 / 149 | 3개 모두 실제 | 양이 많아 경고로 시작 |
| `testing-library/no-container` | 34 / 36 | | 같음 |
| `testing-library/prefer-user-event` | 98 / 37 | 2개 모두 실제 | 같음 |

- **`expect-expect` 오탐**: `expectXxx(...)` 형태의 직접 만든 단언 함수를 쓰는 테스트를 "단언 없음"으로 잡습니다. `assertFunctionNames`에 `expect*`를 등록하면 됩니다.
- **`valid-expect` 오탐**: `expect(값, '설명')`처럼 두 번째 인자로 메시지를 주는 것은 vitest가 지원하는 문법입니다. `maxArgs: 2`로 둡니다.

## 채택 순서 제안

1. **지금 에러로 켜도 되는 것**(고칠 것이 20건 미만): D1, D2, C1, C5, A5, `no-unstable-nested-components`, `hooks/` 밖의 `useQuery`·`useMutation`, `no-empty`.
2. **옵션을 맞춰서 켤 것**: C3(테스트 제외), C4(`navigate` 제외), B1(타입 import 허용), D4(용어 축소), G1.
3. **경고로 두고 줄여 갈 것**: A2(Effect 안 `setState`, 약 70건), F2(생 `<button>`), 테스트의 DOM 직접 접근.
4. **대체 API가 먼저인 것**: A6 이벤트 리스너 훅, A4 타이머 훅, C2 타입 가드 유틸, F1 토큰, B4 응답 검증.
5. **채택하지 않을 것**: `no-event-handler`, `no-initialize-state`, `document.createElement` 금지, `no-confusing-void-expression`, 응답 검증 전의 `no-unnecessary-condition`.

## 프레임워크 모듈에 주는 근거

- **Effect 모듈이 가장 효과가 큽니다.** `useEffect` 141곳 중 이벤트 리스너 55곳, 타이머 39곳이 훅 몇 개로 대체됩니다. `useEventListener`, `useClickOutside`, `useKeydown`, `useDebounce`, `useAnimationFrame`이 후보입니다.
- **데이터 모듈은 이미 절반쯤 있습니다.** 공용 axios 인스턴스, 쿼리 키 팩토리, `hooks/`에 모은 쿼리가 있습니다. 빠진 것은 강제하는 규칙과 응답 검증입니다.
- **UI 모듈은 컴포넌트보다 강제가 문제입니다.** `Button`과 `Input`은 있는데 쓰이지 않습니다.
- **스택은 이 두 프로젝트와 같게 가는 것이 맞습니다.** Vite, React 19, TanStack Query, axios, zustand, React Router 7, CSS 모듈입니다.
