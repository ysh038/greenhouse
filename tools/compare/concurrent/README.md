# 동시 작업 비교 시험 재료

여러 에이전트가 서로를 보지 못한 채 동시에 화면을 만들 때 프레임워크가 있을 때와 없을 때가 어떻게 달라지는지 본 시험(실전 시험 7회)에 쓴 재료입니다. 화면 과제와 채점 스크립트는 6회차의 것(`../accumulate`)을 이어 씁니다.

## 순서

1. 조건마다 출발점을 만듭니다.
   - 프레임워크 있음: 이 저장소를 복사하고(`node_modules`, `.git`, `evidence`, `tools` 제외), `docs/trial-*.md`와 README의 시험 결과를 걷어 냅니다. `apps/sample/src`의 화면 폴더를 지우고 `start-a/`의 파일을 넣습니다. `shared/fake/fakeApi.ts`는 `createFakeApi`를 프레임워크에서 가져오는 import 한 줄 뒤에 `specs/fakeApi.body.ts`를 붙여 만듭니다.
   - 프레임워크 없음: `../baseline`을 복사하고 `src/fake/installFakeFetch.ts`와 `src/test/render.tsx`를 지운 뒤 `start-b/`의 파일을 덮어씁니다.
2. 출발점에서 `pnpm install`과 `pnpm check`가 통과하는지 확인합니다. 프레임워크 조건은 첫 스크린샷의 검토 기록까지 남겨 둡니다.
3. 조건마다 출발점을 네 벌 복사합니다(화면 셋과 합치기용 하나).
4. 화면 셋은 `specs/head.md` + `specs/<화면>.md` + `specs/tail.md`를 이어 붙인 지시문으로 동시에 시킵니다.
5. 셋이 끝나면 `specs/merge.md`로 합치기를 시킵니다.

지시문의 `{{SCREEN}}`, `{{FOLDER}}`, `{{SRC}}`, `{{PROJECT_DIR}}`, `{{PORT}}`, `{{COPY_*}}` 자리만 바꿔 넣습니다.

## 채점과 측정

저장소 루트에서 실행합니다. 앱이 실제 HTTP 요청을 보내므로 두 환경 변수를 줍니다.

```bash
COMPARE_CONTROL=route COMPARE_HOME_TEXT='식물 재고 화면은 아직 없습니다' node tools/compare/accumulate/screens.mjs <앱 폴더> <결과 폴더> <포트>
```

```bash
COMPARE_CONTROL=route COMPARE_HOME_TEXT='식물 재고 화면은 아직 없습니다' node tools/compare/concurrent/consistency.mjs <앱 폴더> <결과 폴더> <포트>
```

```bash
node tools/compare/concurrent/structure.mjs <앱 폴더>
```

```bash
node tools/compare/accumulate/static.mjs <제품 코드 폴더(src)> [이름]
```

- `COMPARE_CONTROL=route`: 가짜 서버를 `window.__fakeApi`로 조작하지 않고, 브라우저에서 `/api` 요청을 가로채 실패, 멈춤, 지연, 요청 기록을 만듭니다. 서버의 지연(400ms)보다 빠르게는 만들 수 없습니다.
- `COMPARE_HOME_TEXT`: 식물 재고 화면이 없으므로 첫 화면을 이 문장으로 알아봅니다.
- `structure.mjs`가 세는 기능 폴더 사이의 import에는 `fake`, `test` 폴더를 가져오는 것도 잡힙니다(프레임워크 없는 조건에는 `shared`가 없어서). 화면 폴더끼리의 것만 골라 읽습니다.

## 7회차 뒤에 바뀐 것

7회차에서는 가짜 서버 플러그인이 취소된 요청을 오류로 넘겨 개발 서버가 오류 화면을 띄웠습니다. 두 조건의 플러그인을 모두 고쳤으므로, 다시 돌리면 그때와 이 점이 다릅니다.
