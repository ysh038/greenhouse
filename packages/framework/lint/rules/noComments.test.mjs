// @vitest-environment node
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tseslint from 'typescript-eslint'

import { noComments } from './noComments.mjs'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const tester = new RuleTester({
    languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
})

const error = { messageId: 'comment' }

tester.run('no-comments', noComments, {
    valid: [
        { name: '주석 없는 코드', code: `const url = 'https://example.com/a//b'\n` },
        {
            name: '테스트 파일은 검사하지 않는다',
            filename: 'src/orders/OrdersScreen.test.tsx',
            code: `// 서버가 거절하는 경우\nexport const a = 1\n`,
        },
        {
            name: '화면 시나리오 파일은 검사하지 않는다',
            filename: 'src/orders/OrdersScreen.verify.ts',
            code: `// 요청을 가로채서 만듭니다\nexport const a = 1\n`,
        },
        {
            name: '가짜 서버 폴더는 검사하지 않는다',
            filename: 'src/shared/fake/fakeApi.ts',
            code: `// GET /api/orders 주문 목록\nexport const a = 1\n`,
        },
        {
            name: '위반 예제의 첫 줄 표시',
            filename: 'fixtures/raw-button.bad.tsx',
            code: `// expect: react/forbid-elements\nexport const a = 1\n`,
        },
    ],
    invalid: [
        {
            name: '한 줄 주석은 줄째로 지운다',
            code: `const a = 1\n// 설명\nconst b = 2\n`,
            output: `const a = 1\nconst b = 2\n`,
            errors: [error],
        },
        {
            name: '코드 뒤에 붙은 주석은 앞의 공백과 함께 지운다',
            code: `const a = 1 // 설명\n`,
            output: `const a = 1\n`,
            errors: [error],
        },
        {
            name: '여러 줄 주석과 문서 주석',
            code: `/**\n * 설명\n */\nexport function f() {\n    /* 안쪽 */\n    return 1\n}\n`,
            output: `export function f() {\n    return 1\n}\n`,
            errors: [error, error],
        },
        {
            name: 'JSX 안의 주석은 중괄호까지 지운다',
            filename: 'Panel.tsx',
            code: `const a = (\n    <div>\n        {/* 설명 */}\n        <p>글</p>\n    </div>\n)\n`,
            output: `const a = (\n    <div>\n        <p>글</p>\n    </div>\n)\n`,
            errors: [error],
        },
        {
            name: '위반 예제라도 첫 줄 표시가 아닌 주석은 걸린다',
            filename: 'fixtures/raw-button.bad.tsx',
            code: `// expect: react/forbid-elements\n// 다른 주석\nexport const a = 1\n`,
            output: `// expect: react/forbid-elements\nexport const a = 1\n`,
            errors: [error],
        },
        {
            name: '위반 예제가 아닌 파일의 expect 주석은 걸린다',
            filename: 'Panel.tsx',
            code: `// expect: something\nexport const a = 1\n`,
            output: `export const a = 1\n`,
            errors: [error],
        },
    ],
})
