# @agent-greenhouse/framework

제품 코드(`apps/*`)가 쓰는 안전한 API를 모아 둔 패키지입니다. 모듈 하나는 폴더 하나이고, 자기 폴더 안에서 API, 금지 규칙, 위반 예제, 테스트를 모두 가집니다. 다른 모듈의 파일이나 저장소 루트의 설정은 건드리지 않습니다.

## 모듈 폴더 구성

```
src/<모듈>/
  index.ts          공개 진입점. 제품 코드는 @agent-greenhouse/framework/<모듈>로만 가져옵니다.
                    파일 이름은 반드시 index.ts입니다. index.tsx는 찾지 못합니다.
  *.ts(x)           구현
  *.module.css      스타일 (UI 모듈). 값은 tokens.css의 변수만 씁니다.
  *.test.ts(x)      테스트
  lint.mjs          제품 코드에 적용할 금지 규칙 (선택)
  cssLint.mjs       제품 CSS에 적용할 stylelint 규칙 (UI 모듈만. 루트의 stylelint.config.mjs가 가져갑니다)
  fixtures/         위반 예제 (lint.mjs가 있으면 필수)
    *.bad.ts(x)     걸려야 하는 코드
    *.good.ts(x)    통과해야 하는 코드
    *.bad.css       걸려야 하는 CSS
    *.good.css      통과해야 하는 CSS
```

`src/assert`가 가장 작은 예입니다.

`src/verify`는 화면 시나리오의 타입과 `defineScenario`만 가집니다. 시나리오를 실제로 돌리는 것은 저장소 루트의 `scripts/verify.mjs`입니다.

다른 모듈의 통과 예제(`*.good.*`)도 제품 코드와 같은 규칙으로 검사됩니다. 새 금지 규칙을 넣으면 기존 예제가 걸릴 수 있고, 그때는 예제를 새 API로 고칩니다.

## lint.mjs

루트의 `eslint.config.mjs`가 모든 모듈의 `lint.mjs`를 자동으로 모아 제품 코드에 적용합니다. 모듈을 추가할 때 루트 설정을 고칠 필요가 없습니다.

```js
export default {
    restrictedImports: [
        { name: 'axios', message: 'axios를 직접 쓸 수 없습니다. @agent-greenhouse/framework/data의 apiClient를 쓰세요.' },
    ],
    restrictedImportPatterns: [],
    restrictedGlobals: [{ name: 'fetch', message: '...' }],
    restrictedProperties: [{ object: 'window', property: 'fetch', message: '...' }],
    restrictedSyntax: [{ selector: "CallExpression[callee.property.name='addEventListener']", message: '...' }],
    rules: { 'react/forbid-elements': ['error', { forbid: [] }] },
}
```

지켜야 할 것은 수집기(`lint/collect.mjs`)가 검사하고, 어기면 린트가 시작되지 않습니다.

- `restricted*` 항목에는 `message`가 반드시 있어야 합니다. 대신 무엇을 쓸지 적습니다.
- `no-restricted-*` 규칙은 `rules`에 직접 쓸 수 없습니다. `restricted*` 목록에 넣어야 다른 모듈의 항목과 합쳐집니다.
- 두 모듈이 같은 규칙을 `rules`에 넣을 수 없습니다.

## 위반 예제

`*.bad.*` 파일은 첫 줄에 걸려야 하는 규칙을 적습니다. 적은 규칙과 실제로 걸린 규칙이 정확히 같아야 통과합니다.

```ts
// expect: no-restricted-imports
import axios from 'axios'
```

CSS 예제는 주석 모양만 다릅니다.

```css
/* expect: color-no-hex */
.badge {
    color: #b3261e;
}
```

`*.good.*` 파일은 아무 규칙에도 걸리지 않아야 합니다. `fixtures/` 안의 파일은 제품 코드와 같은 규칙으로 검사됩니다.

## 확인

저장소 루트에서 실행합니다.

```bash
pnpm check
```
