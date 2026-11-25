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
| `src/test` | 테스트 준비 코드와 도우미(`connectFakeApi`) |
| `fakeServer.plugin.mjs` | 개발 서버가 `/api` 요청을 가짜 서버로 넘기게 하는 Vite 플러그인 |

## 가짜 서버

백엔드가 없습니다. 앱은 실제 HTTP 요청을 `/api/...`로 보내고, 개발 서버가 그 요청을 받아 가짜 서버(`src/fake/fakeApi.ts`의 `createFakeServer`)로 넘깁니다. 개발 서버에서는 응답이 400ms 늦게 옵니다. 라우트 목록은 그 파일의 주석에 있습니다.

테스트에서는 요청이 네트워크로 나가지 않습니다. `connectFakeApi(createFakeServer())`가 `fetch`를 테스트마다 새로 만든 가짜 서버에 연결하고, 그 가짜 서버를 돌려줍니다. 돌려받은 것으로 `failOnce(500)`(다음 요청을 실패시킴), `hangOnce()`(다음 요청을 응답 없이 멈춤), `requests()`(받은 요청 목록)를 쓸 수 있습니다.
