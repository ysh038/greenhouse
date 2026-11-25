const FROM = '@agent-greenhouse/framework/router'

const ROUTER_MESSAGE = [
    `제품 코드에서는 react-router를 직접 쓸 수 없습니다 (${FROM}).`,
    '· 주소 정의: defineRoute(\'/plants/:id\'). 주소는 route.href({ id })로 만듭니다.',
    '· 앱 감싸기와 화면 연결: AppRouter, RouteView(routes, notFound)',
    '· 누르는 링크: Link(to). 메뉴 항목은 appearance="nav"',
    '· 코드에서 옮기기: useNavigate(). 어떤 주소에 오면 곧바로 다른 주소로 보내기: Redirect(to)',
    '· 주소의 값 읽기: useRouteParams(route), 필터·정렬처럼 주소에 둘 상태: useSearchParam(이름, 기본값)',
    '· 로그인해야 들어갈 수 있는 화면: defineAccess()로 만든 AccessProvider와 ProtectedRoute. 로그인 화면은 useLoginReturn(기본 주소)',
].join('\n')

const ANCHOR_MESSAGE = [
    `제품 코드에서는 <a>를 직접 쓸 수 없습니다 (${FROM}).`,
    '<a href="/plants">로 앱 안을 옮기면 페이지를 통째로 다시 불러와, 입력하던 값과 받아 둔 데이터가 사라집니다.',
    '· 앱 안의 화면으로: Link(to). 주소는 defineRoute로 만든 route.href()를 넘깁니다.',
    '· 앱 밖으로: ExternalLink(href). 새 탭에서 엽니다.',
].join('\n')

export default {
    restrictedImports: [
        { name: 'react-router', message: ROUTER_MESSAGE },
        { name: 'react-router-dom', message: ROUTER_MESSAGE },
    ],
    restrictedSyntax: [
        { selector: "JSXOpeningElement[name.name='a']", message: ANCHOR_MESSAGE },
    ],
}
