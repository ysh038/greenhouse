import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
    AppRouter,
    defineRoute,
    ExternalLink,
    Link,
    RouteView,
    useNavigate,
    useRouteParams,
    useSearchParam,
} from './index'

const homeRoute = defineRoute('/')
const plantListRoute = defineRoute('/plants')
const plantDetailRoute = defineRoute('/plants/:id')
const noteRoute = defineRoute('/plants/:plantId/notes/:noteId')

function PlantList() {
    const [sort, setSort] = useSearchParam('sort', 'name')
    return (
        <div>
            <h2>식물 목록</h2>
            <p>정렬 {sort}</p>
            <button
                type="button"
                onClick={() => {
                    setSort('stock')
                }}
            >
                재고순
            </button>
            <button
                type="button"
                onClick={() => {
                    setSort('name')
                }}
            >
                이름순
            </button>
            <Link to={plantDetailRoute.href({ id: 3 })}>3번 식물</Link>
        </div>
    )
}

function PlantDetail() {
    const { id } = useRouteParams(plantDetailRoute)
    const navigate = useNavigate()
    return (
        <div>
            <h2>{id}번 식물</h2>
            <button
                type="button"
                onClick={() => {
                    navigate(plantListRoute.href())
                }}
            >
                목록으로
            </button>
        </div>
    )
}

function App() {
    return (
        <AppRouter>
            <nav>
                <Link to={homeRoute.href()} appearance="nav">
                    홈
                </Link>
                <Link to={plantListRoute.href()} appearance="nav">
                    식물
                </Link>
            </nav>
            <RouteView
                routes={[
                    { route: homeRoute, screen: <h2>홈 화면</h2> },
                    { route: plantListRoute, screen: <PlantList /> },
                    { route: plantDetailRoute, screen: <PlantDetail /> },
                ]}
                notFound={<h2>화면을 찾을 수 없습니다</h2>}
            />
        </AppRouter>
    )
}

function openAt(path: string) {
    window.history.replaceState(null, '', path)
    render(<App />)
}

const heading = () => screen.getByRole('heading').textContent
const navLink = (name: string) => screen.getByRole('link', { name })

beforeEach(() => {
    window.history.replaceState(null, '', '/')
})

describe('defineRoute', () => {
    it('주소 틀의 자리에 값을 넣어 주소를 만든다', () => {
        expect(homeRoute.href()).toBe('/')
        expect(plantListRoute.href()).toBe('/plants')
        expect(plantDetailRoute.href({ id: 3 })).toBe('/plants/3')
        expect(noteRoute.href({ plantId: 'a b', noteId: 7 })).toBe(
            '/plants/a%20b/notes/7',
        )
    })
})

describe('RouteView', () => {
    it('주소에 맞는 화면을 그린다', () => {
        openAt('/plants')
        expect(heading()).toBe('식물 목록')
    })

    it('주소의 값을 화면이 읽는다', () => {
        openAt('/plants/12')
        expect(heading()).toBe('12번 식물')
    })

    it('맞는 주소가 없으면 notFound를 그린다', () => {
        openAt('/nothing/here')
        expect(heading()).toBe('화면을 찾을 수 없습니다')
    })
})

describe('Link', () => {
    it('누르면 페이지를 새로 불러오지 않고 화면과 주소가 바뀐다', () => {
        openAt('/plants')

        fireEvent.click(screen.getByRole('link', { name: '3번 식물' }))

        expect(heading()).toBe('3번 식물')
        expect(window.location.pathname).toBe('/plants/3')
    })

    it('지금 화면을 가리키는 링크에 aria-current가 붙는다. 하위 주소에서도 유지되고, "/"는 정확히 "/"일 때만이다', () => {
        openAt('/plants/3')

        expect(navLink('식물').getAttribute('aria-current')).toBe('page')
        expect(navLink('홈').getAttribute('aria-current')).toBeNull()

        fireEvent.click(navLink('홈'))

        expect(navLink('홈').getAttribute('aria-current')).toBe('page')
        expect(navLink('식물').getAttribute('aria-current')).toBeNull()
    })
})

describe('ExternalLink', () => {
    it('새 탭에서 열고 연 쪽 정보를 넘기지 않는다', () => {
        render(<ExternalLink href="https://example.com/guide">재배 안내</ExternalLink>)

        const link = screen.getByRole('link', { name: '재배 안내' })
        expect(link.getAttribute('href')).toBe('https://example.com/guide')
        expect(link.getAttribute('target')).toBe('_blank')
        expect(link.getAttribute('rel')).toBe('noreferrer')
    })
})

describe('useNavigate', () => {
    it('코드에서 화면을 옮긴다', () => {
        openAt('/plants/3')

        fireEvent.click(screen.getByRole('button', { name: '목록으로' }))

        expect(heading()).toBe('식물 목록')
        expect(window.location.pathname).toBe('/plants')
    })
})

describe('useSearchParam', () => {
    it('주소에 값이 없으면 기본값을 준다', () => {
        openAt('/plants')
        expect(screen.getByText('정렬 name')).toBeDefined()
    })

    it('주소에 있는 값을 읽는다', () => {
        openAt('/plants?sort=stock')
        expect(screen.getByText('정렬 stock')).toBeDefined()
    })

    it('바꾸면 주소에 남고, 기본값으로 되돌리면 주소에서 지운다', () => {
        openAt('/plants')

        fireEvent.click(screen.getByRole('button', { name: '재고순' }))
        expect(screen.getByText('정렬 stock')).toBeDefined()
        expect(window.location.search).toBe('?sort=stock')

        fireEvent.click(screen.getByRole('button', { name: '이름순' }))
        expect(screen.getByText('정렬 name')).toBeDefined()
        expect(window.location.search).toBe('')
    })

    it('바꿔도 기록을 새로 쌓지 않는다', () => {
        openAt('/plants')
        const before = window.history.length

        fireEvent.click(screen.getByRole('button', { name: '재고순' }))

        expect(window.history.length).toBe(before)
    })
})

describe('useRouteParams', () => {
    it('그 route의 화면 밖에서 쓰면 이유를 알려 주며 실패한다', () => {
        function Wrong() {
            const { id } = useRouteParams(plantDetailRoute)
            return <p>{id}</p>
        }

        expect(() =>
            render(
                <AppRouter>
                    <Wrong />
                </AppRouter>,
            ),
        ).toThrow(/\/plants\/:id 화면 안에서만/)
    })
})
