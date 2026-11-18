const FROM = '@agent-greenhouse/framework/data'

const REQUEST_MESSAGE = [
    '제품 코드에서는 HTTP 요청을 직접 보낼 수 없습니다. 인증, 에러 처리, 응답 검증이 호출마다 달라집니다.',
    `· createApiClient로 만든 클라이언트를 쓰세요 (${FROM})`,
    "· 예: api.get('/users/1', { schema: UserSchema, signal })",
    '· 응답 스키마(zod)는 필수이고, 반환값은 그 스키마로 검증된 값입니다.',
    `· 에러 종류 확인: isApiError(error) (${FROM})`,
    `· 컴포넌트에서 조회: defineQuery + useData(query). 검색어처럼 인자가 자주 바뀌면 useDeferredData(query) (${FROM})`,
    `· 컴포넌트에서 저장·수정·삭제: defineMutation + useMutate(mutation) (${FROM})`,
].join('\n')

const QUERY_MESSAGE = [
    '제품 코드에서는 @tanstack/react-query를 직접 쓸 수 없습니다.',
    `· 조회: defineQuery로 정의하고 useData(query)로 읽기 (${FROM})`,
    `· 검색어처럼 인자가 자주 바뀌는 조회: useDeferredData(query). 새 결과가 올 때까지 이전 결과를 유지 (${FROM})`,
    `· 변경: defineMutation으로 정의하고 useMutate(mutation)로 실행 (${FROM})`,
    `· 로딩과 에러 화면: DataBoundary의 pending, renderError. 조건이 바뀌면 에러를 풀려면 resetKeys (${FROM})`,
    `· 앱 최상단: DataProvider (${FROM})`,
    '필요한 기능이 없으면 packages/framework/src/data에 추가하세요.',
].join('\n')

export default {
    restrictedImports: [
        { name: 'axios', message: REQUEST_MESSAGE },
        { name: '@tanstack/react-query', message: QUERY_MESSAGE },
    ],
    restrictedGlobals: [
        { name: 'fetch', message: REQUEST_MESSAGE },
        { name: 'XMLHttpRequest', message: REQUEST_MESSAGE },
    ],
    restrictedProperties: ['window', 'globalThis'].flatMap((object) =>
        ['fetch', 'XMLHttpRequest'].map((property) => ({
            object,
            property,
            message: REQUEST_MESSAGE,
        })),
    ),
}
