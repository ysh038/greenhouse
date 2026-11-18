# agent-greenhouse

에이전트가 쓴 코드를 믿을 수 있게 만드는 React FE용 프레임워크입니다. 까다로운 처리를 한 번만 제대로 만든 API와, 제품 코드가 그 API만 쓰도록 강제하는 린트 규칙을 한 세트로 쌓습니다.

온실이 식물이 자라는 환경을 통제하듯, 에이전트가 일하는 환경(코드베이스)을 통제한다는 뜻에서 붙인 이름입니다.

## 배경

발표 ["모든 코드는 슬롭이다, 내 것만 빼고"](https://www.youtube.com/watch?v=ueA116hO_ho)의 역피라미드에서 출발했습니다. 에이전트 환경에 들이는 시간은 코드베이스와 정적 분석에 가장 많이, 규칙 파일 같은 산문에 가장 적게 써야 한다는 내용입니다.

이 저장소의 원칙은 하나입니다. **에이전트를 교정할 일이 생기면 규칙 파일에 한 줄 보태지 않고, 린트 규칙이나 API 설계로 옮깁니다.**

기능 하나는 아래 세 가지가 한 세트입니다.

1. **안전한 API**: 까다로운 처리를 한 번만 제대로 만든 것
2. **금지 규칙**: 제품 코드에서 원본을 직접 못 쓰게 하는 린트. 에러 메시지가 대안을 알려 줍니다.
3. **구역 구분**: 폴더로 프레임워크 구역과 제품 구역을 나눈 것

## 구조

| 위치 | 내용 |
|---|---|
| `packages/framework` | 프레임워크 구역. 모듈 추가 방법은 [packages/framework/README.md](packages/framework/README.md) |
| `apps/sample` | 제품 구역. 프레임워크를 `@agent-greenhouse/framework/<모듈>`로만 가져옵니다 |
| `lint` | 모든 코드에 적용하는 규칙, 모듈 규칙 수집기, 위반 예제 검사기 |
| `tools/measure` | 기존 프로젝트에 후보 규칙을 경고로 돌려 보는 측정 도구 |
| `docs` | [규칙 후보 카탈로그](docs/fe-rule-catalog.md), [측정 결과](docs/measurement-2026-11-18.md), [실전 시험 1회](docs/trial-1-2026-11-18.md), [2회](docs/trial-2-2026-11-18.md) |

## 시작하기

```bash
pnpm install
```

```bash
pnpm check
```

`pnpm check`는 피어 의존성, 타입 검사, 린트, 위반 예제, 테스트, 샘플 앱 빌드를 차례로 돌립니다.

```bash
pnpm deps:update
```

`pnpm deps:update`는 오래된 의존성을 하나씩 최신으로 올리고 `pnpm check`를 돌립니다. 실패하는 것은 되돌리고 보류 목록으로 알려 줍니다.

## 진행 상황

| 단계 | 내용 | 상태 |
|---|---|---|
| 0. 결정 | 규칙 후보 카탈로그 작성, 팀 코드에 돌려 채택 여부 판정 | 완료 |
| 1. 뼈대 | 모노레포, 구역 분리, 규칙 자동 수집, `pnpm check` | 완료 |
| 2. 기능 모듈 | 모듈마다 API + 금지 규칙 + 위반 예제 + 테스트 | Effect, 데이터 모듈 완료. UI, 구조 모듈은 시작 전 |
| 3. 검증 도구 | 에이전트가 샘플 앱을 띄우고 스크린샷을 증거로 남기는 CLI | 시작 전 |
| 4. 실전 시험 | 맥락 없는 새 에이전트 세션에 프레임워크만 주고 기능을 구현시킴 | 2회 완료. 1회차는 새 기능 구현(교정 0건), 2회차는 린트 메시지만으로 기존 코드 고치기(교정 1건) |
| 5. 반복 | 실전 시험에서 교정한 것을 규칙이나 API로 옮기고 다시 시험 | 1회차 개선 8개 중 7개, 2회차 메시지 개선 3개 반영 |

### 2단계 모듈 후보

측정 결과에서 근거가 많은 순서입니다.

- **Effect 모듈 (완료)**: `useEventListener`, `useClickOutside`, `useKeydown`, `useTimeout`, `useInterval`, `useDebouncedValue`, `useAnimationFrame`. 제품 코드에서 `useEffect`, 타이머, `addEventListener`를 금지합니다. 크기 측정이나 스크롤 맞추기처럼 아직 훅이 없는 용도는 실전 시험에서 필요가 확인되면 추가합니다.
- **데이터 모듈 (완료)**: `createApiClient`(응답 스키마 필수), `defineQuery`와 `useData`, `defineMutation`과 `useMutate`, `DataBoundary`, `DataProvider`. 제품 코드에서 `axios`, `fetch`, `@tanstack/react-query` 직접 사용을 금지합니다. 검색처럼 인자가 자주 바뀌는 조회는 `useDeferredData`를 씁니다. 조건부 조회, 무한 스크롤, 낙관적 갱신은 아직 없고 실전 시험에서 필요가 확인되면 추가합니다.
- **가짜 서버와 테스트 도우미 (완료)**: `fake-api`의 `createFakeApi`(지연, 한 번 실패, 요청 기록)와 `testing`의 `renderWithData`, `advanceTime`. 실전 시험에서 에이전트가 직접 만들어 쓰던 것을 프레임워크로 옮겼습니다.
- **UI 모듈**: 디자인 토큰, 기본 컴포넌트. 생 `<button>`과 고정 값 인라인 스타일을 금지합니다.
- **구조 모듈**: 기능 폴더 규칙과 폴더 간 import 금지.

모듈은 자기 폴더만 건드리므로 여러 세션이 동시에 작업할 수 있습니다.

### 아직 정하지 않은 것

- 샘플 앱 주제. 실제로 만드는 화면과 비슷할수록(목록, 상세, 폼, 로그인) 실전 시험이 쓸모 있습니다.
- `pnpm deps:update`를 주기적으로 돌리는 장치(CI 예약 실행).

### 알아 둘 것

- TypeScript는 6.0에 머뭅니다. 7.0이 나와 있지만 typescript-eslint 8.73이 6.1 미만만 지원합니다. 지원이 추가되면 `pnpm deps:update`가 올립니다.
- `eslint-plugin-react` 7.37은 ESLint 10을 공식 지원 범위에 넣지 않았지만 동작합니다. `pnpm-workspace.yaml`에서 예외로 허용했고, 이 플러그인의 규칙은 위반 예제로 동작을 확인합니다.
- React Router, React Compiler, CSS 규칙은 해당 모듈을 만들 때 넣습니다.
- HTTP 요청은 axios가 아니라 `fetch` 위에 만들었습니다. 응답 검증은 zod를 씁니다.
- 샘플 앱은 백엔드 없이 동작하도록 `createFakeApi`로 만든 가짜 서버(`apps/sample/src/fake`)를 API 클라이언트에 끼워 넣었습니다. 브라우저에서는 400ms 지연이 있고 테스트에서는 지연이 없습니다.
- 샘플 앱은 `pnpm --filter @agent-greenhouse/sample dev`로 띄웁니다.
