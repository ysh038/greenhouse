// 제품 코드에서 주석을 금지하는 규칙입니다. `eslint --fix`로 지울 수 있습니다.
//
// 화면이 되는 코드만 대상입니다. 테스트(*.test.ts(x))와 화면 시나리오(*.verify.ts)는 검사하지 않습니다.
// 무엇을 왜 확인하는지 적은 주석이 그 파일의 내용이기 때문입니다.
// 가짜 서버(fake 폴더)도 검사하지 않습니다. 화면 코드가 아니고, API 목록을 주석으로 적어 두는 자리입니다.
// 위반 예제(*.bad.ts, *.bad.tsx)의 첫 줄 "// expect: 규칙"은 검사기가 읽는 표시라서 허용합니다.

const EXPECT_HEADER = /^\s*expect:/
const BAD_FIXTURE = /\.bad\.tsx?$/
const CHECKING_CODE = /\.(test|verify)\.tsx?$/
const FAKE_SERVER = /[\\/]fake[\\/]/

export const noComments = {
    meta: {
        type: 'suggestion',
        fixable: 'code',
        schema: [],
        messages: {
            comment: [
                '제품 코드에는 주석을 쓰지 않습니다. 주석은 코드와 따로 낡고, 다음 사람이 코드 대신 주석을 믿게 됩니다.',
                '· 무엇을 하는지: 변수, 함수, 컴포넌트의 이름으로 드러냅니다. 설명이 필요한 식은 이름 붙인 변수나 함수로 뽑습니다.',
                '· 왜 그렇게 했는지: 그 동작을 테스트로 고정하고 테스트 이름에 이유를 적습니다.',
                '· 주석 처리한 코드: 지웁니다. 필요하면 git 기록에 있습니다.',
                '`pnpm exec eslint --fix <파일>`로 한 번에 지울 수 있습니다.',
            ].join('\n'),
        },
    },
    create(context) {
        if (CHECKING_CODE.test(context.filename)) return {}
        if (FAKE_SERVER.test(context.filename)) return {}
        const sourceCode = context.sourceCode
        const text = sourceCode.text
        const isBadFixture = BAD_FIXTURE.test(context.filename)

        /** 주석과 함께 지울 범위. JSX의 {주석}은 중괄호까지, 그 줄에 다른 것이 없으면 줄 전체. */
        function removalRange(comment) {
            let [start, end] = comment.range
            const before = text.slice(0, start)
            const after = text.slice(end)
            if (/\{\s*$/.test(before) && /^\s*\}/.test(after)) {
                start = before.lastIndexOf('{')
                end += after.indexOf('}') + 1
            }
            const lineStart = text.lastIndexOf('\n', start - 1) + 1
            const nextBreak = text.indexOf('\n', end)
            const lineEnd = nextBreak === -1 ? text.length : nextBreak
            const isAloneOnLine =
                text.slice(lineStart, start).trim() === '' &&
                text.slice(end, lineEnd).trim() === ''
            if (!isAloneOnLine) {
                // 코드 뒤에 붙은 주석이면 앞의 공백도 같이 지웁니다.
                const leading = /[ \t]*$/.exec(text.slice(lineStart, start))?.[0].length ?? 0
                return [start - leading, end]
            }
            return [lineStart, nextBreak === -1 ? text.length : nextBreak + 1]
        }

        return {
            Program() {
                for (const comment of sourceCode.getAllComments()) {
                    if (comment.type === 'Shebang') continue
                    if (
                        isBadFixture &&
                        comment.loc.start.line === 1 &&
                        EXPECT_HEADER.test(comment.value)
                    ) {
                        continue
                    }
                    context.report({
                        loc: comment.loc,
                        messageId: 'comment',
                        fix: (fixer) => fixer.removeRange(removalRange(comment)),
                    })
                }
            },
        }
    },
}
