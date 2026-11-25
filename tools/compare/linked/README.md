# 화면을 서로 잇는 과제의 재료

한 화면이 다른 화면의 데이터와 코드를 쓰고 싶어지는 과제(실전 시험 8회)에 쓴 재료입니다. 구조 규칙이 막으려는 코드를 에이전트가 실제로 쓰는지 보려고 만들었습니다.

| 파일 | 내용 |
|---|---|
| `spec.md` | 과제 지시문. `{{SRC}}`, `{{PROJECT_DIR}}`, `{{PORT}}` 자리만 바꿔 넣습니다 |
| `fakeApi.body.ts` | 주문에 `supplierId`가 든 가짜 서버. 첫 줄에 `createFakeApi`를 가져오는 import만 조건에 맞게 붙입니다 |
| `accept.mjs` | 새 동작 채점 12개와, 기존 채점 가운데 이 과제에서 틀리게 채점되는 두 항목을 다시 보는 검사 |

## 순서

1. 출발점은 7회차에서 합친 앱입니다(`../concurrent`의 순서로 만든 것). 가짜 서버를 `fakeApi.body.ts`로 바꾸고 `pnpm check`가 통과하는지 확인합니다.
2. 조건마다 출발점을 복사해 맥락 없는 에이전트에게 `spec.md`를 줍니다.
3. 저장소 루트에서 채점합니다.

```bash
COMPARE_CONTROL=route COMPARE_HOME_TEXT='식물 재고 화면은 아직 없습니다' node tools/compare/linked/accept.mjs <앱 폴더> <결과 폴더> <포트>
```

```bash
COMPARE_CONTROL=route COMPARE_HOME_TEXT='식물 재고 화면은 아직 없습니다' node tools/compare/accumulate/screens.mjs <앱 폴더> <결과 폴더> <포트>
```

```bash
node tools/compare/concurrent/structure.mjs <앱 폴더>
```

## 기존 채점을 읽을 때

`screens.mjs`의 O5와 O6은 이 과제에서 틀리게 떨어질 수 있습니다. 주문 화면이 공급처와 설정도 같이 받게 되어, "다음 요청 몇 개"를 바꾸는 조작이 다른 요청에 걸리기 때문입니다. `accept.mjs`의 LO5와 LO6이 같은 동작을 주문 요청만 겨냥해 다시 봅니다.
