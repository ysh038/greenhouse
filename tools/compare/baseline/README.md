# 온실 관리 앱

React 19, Vite, TypeScript로 만든 앱입니다.

## 명령

```bash
pnpm install
```

```bash
pnpm dev
```

```bash
pnpm check
```

`pnpm check`는 타입 검사, 린트, 테스트, 빌드를 차례로 돌립니다.

## 구조

| 위치 | 내용 |
|---|---|
| `src/App.tsx` | 앱의 바깥 틀. 화면을 여기에 추가합니다 |
| `src/fake` | 백엔드 대신 쓰는 가짜 서버 |
| `src/test` | 테스트 준비 코드와 도우미(`renderWithProviders`) |

## 규칙

- 기능마다 `src/<기능>/` 폴더를 만들고 테스트를 같이 둡니다.
- 서버 상태는 TanStack Query로 다룹니다.
- 스타일은 CSS 모듈(`*.module.css`)을 씁니다.
- HTTP 요청은 `fetch`로 `/api/...`를 부릅니다.

## 가짜 서버

백엔드가 없어서 `/api`로 가는 `fetch`를 가짜 서버(`src/fake/fakeApi.ts`)가 대신 받습니다. 브라우저에서는 응답이 400ms 늦게 오고 테스트에서는 바로 옵니다. 라우트 목록은 그 파일의 주석에 있습니다.

테스트에서는 `fakeApi.failOnce(500)`으로 다음 요청을 실패시키고, `fakeApi.hangOnce()`로 다음 요청을 응답 없이 멈추고, `fakeApi.requests()`로 받은 요청 목록을 볼 수 있습니다. 테스트마다 가짜 서버와 데이터는 처음 상태로 돌아갑니다.
