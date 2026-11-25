# @agent-greenhouse/framework

에이전트가 쓴 React 화면 코드를 믿을 수 있게 하려는 얇은 프레임워크입니다. 세 가지를 한 세트로 줍니다.

- **안전한 API**: 화면 부품, 서버 데이터, 타이머와 이벤트, 주소와 화면 이동
- **그것만 쓰게 하는 린트 규칙**: 직접 쓰면 안 되는 것(`useEffect`, `fetch`, 생 `<button>` 등)을 막고, 에러 메시지가 대신 무엇을 쓸지 알려 줍니다
- **화면 검증**: 화면 시나리오를 실제 브라우저에서 돌려 스크린샷을 남기고, 새로 생겼거나 달라진 스크린샷은 검토를 기록해야 통과합니다

React 19, Vite 8, TypeScript 6, ESLint 10, Vitest 5에 맞춰져 있습니다. Node 22 이상이 필요하고, 화면 검증은 컴퓨터에 설치된 Chrome을 씁니다.

## 새 프로젝트 시작

```bash
npx @agent-greenhouse/framework init my-app
```

```bash
cd my-app && npm install
```

```bash
npm run check
```

만들어진 프로젝트에는 설정 파일, 빈 화면 하나, 에이전트가 읽을 `CLAUDE.md`가 들어 있습니다.

이미 만든 저장소의 루트에 바로 풀려면 그 폴더에서 `.`을 줍니다.

```bash
npx @agent-greenhouse/framework init .
```

지금 있는 파일은 덮어쓰지 않습니다. 틀의 파일과 이름이 겹치는 것(`package.json`, `src/main.tsx` 등)이 있으면 아무것도 만들지 않고 멈춥니다. `README.md`는 있던 것을 그대로 두고, `.gitignore`는 없는 줄만 덧붙입니다.

## 문서

- [GUIDE.md](GUIDE.md): 모듈마다 무엇이 있고 무엇이 막혀 있는지. 에이전트가 작업 전에 읽는 문서입니다.
- 각 API의 인자와 설명은 타입 선언(`dist/<모듈>/*.d.ts`)에 있습니다.

## 설정을 직접 넣을 때

```js
// eslint.config.mjs
import { createEslintConfig } from '@agent-greenhouse/framework/eslint'
export default await createEslintConfig({ rootDir: import.meta.dirname })
```

```js
// stylelint.config.mjs
import { createStylelintConfig } from '@agent-greenhouse/framework/stylelint'
export default createStylelintConfig()
```

```ts
// vite.config.ts
import { greenhouseTest } from '@agent-greenhouse/framework/vitest'
export default defineConfig({ plugins: [react()], test: greenhouseTest() })
```

```json
// tsconfig.json
{ "extends": "@agent-greenhouse/framework/tsconfig.base.json" }
```

앱 폴더가 프로젝트 루트가 아니거나 `check`가 돌릴 단계를 바꾸려면 루트에 `greenhouse.config.mjs`를 둡니다.

```js
export default {
    appDir: 'apps/web',
    check: [['타입 검사', 'typecheck'], ['린트', 'lint'], ['테스트', 'test'], ['화면 검증', 'verify']],
}
```

## 알아 둘 것

- npm 10(Node 22에 딸려 오는 버전)은 vitest의 피어 의존성을 풀다가 오류로 끝납니다. `init`이 만드는 `.npmrc`의 `legacy-peer-deps=true`가 이것을 피합니다. npm 11 이상에서는 필요 없습니다.
- 금지 규칙은 `src` 아래의 코드에 적용됩니다. 기존 프로젝트에 넣으면 위반이 한꺼번에 나옵니다. 새 프로젝트에서 시작하는 것을 전제로 만들었습니다.
- 화면을 가리는 `ProtectedRoute`는 서버의 권한 검사를 대신하지 않습니다.

## 라이선스

MIT
