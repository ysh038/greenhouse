import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
    AppRouter,
    defineAccess,
    defineRoute,
    RouteView,
    useLoginReturn,
    useNavigate,
    type Access,
} from './index'

type Role = 'admin' | 'member'

const { AccessProvider, ProtectedRoute } = defineAccess<Role>()

const homeRoute = defineRoute('/')
const loginRoute = defineRoute('/login')
const accountRoute = defineRoute('/account')
const adminRoute = defineRoute('/admin')

function Login({ onSignIn }: { onSignIn: (role: Role) => void }) {
    const { returnPath, wasSentHere } = useLoginReturn(homeRoute.href())
    const navigate = useNavigate()
    return (
        <div>
            <h2>로그인</h2>
            {wasSentHere && <p>로그인이 필요합니다</p>}
            <p>돌아갈 곳 {returnPath}</p>
            <button
                type="button"
                onClick={() => {
                    onSignIn('member')
                    navigate(returnPath, { replace: true })
                }}
            >
                구성원으로 로그인
            </button>
        </div>
    )
}

function App({ initial }: { initial: Access<Role> }) {
    const [access, setAccess] = useState(initial)
    return (
        <AppRouter>
            <button
                type="button"
                onClick={() => {
                    setAccess({ status: 'signedOut' })
                }}
            >
                로그아웃
            </button>
            <AccessProvider
                access={access}
                loginPath={loginRoute.href()}
                deniedPath={homeRoute.href()}
                checking={<p>확인 중</p>}
            >
                <RouteView
                    routes={[
                        { route: homeRoute, screen: <h2>홈</h2> },
                        {
                            route: loginRoute,
                            screen: (
                                <Login
                                    onSignIn={(role) => {
                                        setAccess({ status: 'signedIn', role })
                                    }}
                                />
                            ),
                        },
                        {
                            route: accountRoute,
                            screen: (
                                <ProtectedRoute>
                                    <h2>내 계정</h2>
                                </ProtectedRoute>
                            ),
                        },
                        {
                            route: adminRoute,
                            screen: (
                                <ProtectedRoute requiredRoles={['admin']}>
                                    <h2>관리자</h2>
                                </ProtectedRoute>
                            ),
                        },
                    ]}
                    notFound={<h2>화면을 찾을 수 없습니다</h2>}
                />
            </AccessProvider>
        </AppRouter>
    )
}

function openAt(path: string, initial: Access<Role>) {
    window.history.replaceState(null, '', path)
    render(<App initial={initial} />)
}

const heading = () => screen.queryByRole('heading')?.textContent

beforeEach(() => {
    window.history.replaceState(null, '', '/')
})

describe('ProtectedRoute', () => {
    it('확인 중이면 화면을 그리지도 내보내지도 않고 기다린다', () => {
        openAt('/account', { status: 'checking' })

        expect(screen.getByText('확인 중')).toBeDefined()
        expect(heading()).toBeUndefined()
        expect(window.location.pathname).toBe('/account')
    })

    it('로그인하지 않았으면 로그인 화면으로 보낸다', () => {
        openAt('/account?tab=orders', { status: 'signedOut' })

        expect(heading()).toBe('로그인')
        expect(window.location.pathname).toBe('/login')
        expect(screen.getByText('로그인이 필요합니다')).toBeDefined()
        expect(screen.getByText('돌아갈 곳 /account?tab=orders')).toBeDefined()
    })

    it('로그인하면 들어가려던 화면으로 돌아간다', () => {
        openAt('/account', { status: 'signedOut' })

        fireEvent.click(screen.getByRole('button', { name: '구성원으로 로그인' }))

        expect(heading()).toBe('내 계정')
        expect(window.location.pathname).toBe('/account')
    })

    it('로그인했으면 역할을 요구하지 않는 화면에 들어간다. 역할을 아직 몰라도 된다', () => {
        openAt('/account', { status: 'signedIn', role: null })
        expect(heading()).toBe('내 계정')
    })

    it('역할이 맞으면 들어간다', () => {
        openAt('/admin', { status: 'signedIn', role: 'admin' })
        expect(heading()).toBe('관리자')
    })

    it('역할이 맞지 않으면 deniedPath로 보낸다', () => {
        openAt('/admin', { status: 'signedIn', role: 'member' })

        expect(heading()).toBe('홈')
        expect(window.location.pathname).toBe('/')
    })

    it('역할이 필요한데 아직 모르면 내보내지 않고 기다린다', () => {
        openAt('/admin', { status: 'signedIn', role: null })

        expect(screen.getByText('확인 중')).toBeDefined()
        expect(window.location.pathname).toBe('/admin')
    })

    it('들어와 있다가 로그아웃하면 "로그인이 필요합니다" 없이 로그인 화면으로 보낸다', () => {
        openAt('/account', { status: 'signedIn', role: 'member' })
        expect(heading()).toBe('내 계정')

        fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

        expect(heading()).toBe('로그인')
        expect(window.location.pathname).toBe('/login')
        expect(screen.queryByText('로그인이 필요합니다')).toBeNull()
        expect(screen.getByText('돌아갈 곳 /')).toBeDefined()
    })

    it('AccessProvider 밖에서 쓰면 이유를 알려 주며 실패한다', () => {
        expect(() =>
            render(
                <AppRouter>
                    <ProtectedRoute>
                        <p>화면</p>
                    </ProtectedRoute>
                </AppRouter>,
            ),
        ).toThrow(/AccessProvider 안에서만/)
    })
})

describe('useLoginReturn', () => {
    it('로그인 화면에 직접 들어왔으면 기본 주소를 주고, 보내진 것이 아니라고 알린다', () => {
        openAt('/login', { status: 'signedOut' })

        expect(screen.getByText('돌아갈 곳 /')).toBeDefined()
        expect(screen.queryByText('로그인이 필요합니다')).toBeNull()
    })

    it('기록에 남은 돌아갈 곳을 읽는다 (로그인 화면에서 새로고침한 경우)', () => {
        window.history.replaceState(
            { usr: { from: '/account' }, key: 'k', idx: 0 },
            '',
            '/login',
        )
        render(<App initial={{ status: 'signedOut' }} />)

        expect(screen.getByText('돌아갈 곳 /account')).toBeDefined()
    })

    it('앱 밖의 주소는 돌아갈 곳으로 받지 않는다', () => {
        window.history.replaceState(
            { usr: { from: '//evil.example.com' }, key: 'k', idx: 0 },
            '',
            '/login',
        )
        render(<App initial={{ status: 'signedOut' }} />)

        expect(screen.getByText('돌아갈 곳 /')).toBeDefined()
    })
})
