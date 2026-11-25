import { createContext, use, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { invariant } from '../assert'

/**
 * 지금 사용자가 어떤 상태인가. 앱의 로그인 상태에서 만들어 AccessProvider에 넘깁니다.
 *
 * - checking: 로그인했는지 아직 모릅니다 (새로고침 직후 토큰을 확인하는 동안).
 * - signedOut: 로그인하지 않았습니다.
 * - signedIn: 로그인했습니다. role이 null이면 로그인은 했지만 역할을 아직 받지 못한 것입니다.
 */
export type Access<Role extends string> =
    | { status: 'checking' }
    | { status: 'signedOut' }
    | { status: 'signedIn'; role: Role | null }

export type AccessProviderProps<Role extends string> = {
    access: Access<Role>
    /** 로그인하지 않은 사람을 보낼 주소. 로그인 화면의 route.href()를 넘깁니다. */
    loginPath: string
    /** 로그인은 했지만 역할이 맞지 않는 사람을 보낼 주소. */
    deniedPath: string
    /** 확인하는 동안 보호된 화면 자리에 보여 줄 것. 안 주면 아무것도 그리지 않습니다. */
    checking?: ReactNode
    children: ReactNode
}

export type ProtectedRouteProps<Role extends string> = {
    /** 주면 이 역할 가운데 하나여야 들어올 수 있습니다. 안 주면 로그인만 하면 됩니다. */
    requiredRoles?: readonly Role[]
    children: ReactNode
}

export type LoginReturn = {
    /** 로그인에 성공하면 갈 주소. 보호된 화면에서 보내졌으면 그 화면, 아니면 fallback입니다. */
    returnPath: string
    /** 보호된 화면에 들어가려다 여기로 보내졌는가. "로그인이 필요합니다" 안내를 보여 줄 때 씁니다. */
    wasSentHere: boolean
}

type AccessContextValue<Role extends string> = Omit<
    AccessProviderProps<Role>,
    'children'
>

type SentFrom = { from: string }

function readSentFrom(state: unknown): string | null {
    if (typeof state !== 'object' || state === null || !('from' in state)) {
        return null
    }
    const { from } = state as SentFrom
    // 앱 안의 주소만 받습니다. 바깥 주소로 돌려보내지 않습니다.
    return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
        ? from
        : null
}

/**
 * 로그인 화면에서 씁니다. 로그인에 성공한 뒤 어디로 갈지 알려 줍니다.
 *
 *     const { returnPath, wasSentHere } = useLoginReturn(homeRoute.href())
 *     // 로그인 성공 뒤: navigate(returnPath, { replace: true })
 */
export function useLoginReturn(fallbackPath: string): LoginReturn {
    const location = useLocation()
    const from = readSentFrom(location.state)
    return { returnPath: from ?? fallbackPath, wasSentHere: from !== null }
}

/**
 * 로그인해야 들어갈 수 있는 화면을 만드는 도구를 앱의 역할 이름에 맞춰 만듭니다. 앱에서 한 번만 부릅니다.
 *
 *     // src/access.ts
 *     export const { AccessProvider, ProtectedRoute } = defineAccess<'admin' | 'member'>()
 *
 * AccessProvider는 AppRouter 안에서 화면들을 감싸고, 지금 사용자의 상태(access)를 받습니다.
 * ProtectedRoute는 RouteView의 screen을 감쌉니다.
 *
 *     { route: adminRoute, screen: <ProtectedRoute requiredRoles={['admin']}><Admin /></ProtectedRoute> }
 *
 * ProtectedRoute가 하는 일:
 * - 확인 중이면(checking, 또는 역할이 필요한데 role이 null) 기다립니다. 화면을 그리지도 내보내지도 않습니다.
 * - 로그인하지 않았으면 loginPath로 보냅니다. 돌아올 주소를 같이 넘기므로 로그인 화면은 useLoginReturn으로 읽습니다.
 * - 화면에 들어와 있다가 로그아웃하면 돌아올 주소 없이 loginPath로 보냅니다. 스스로 나간 것이므로
 *   로그인 화면에 "로그인이 필요합니다"가 뜨지 않습니다. 로그아웃 버튼은 로그인 상태만 바꾸면 됩니다.
 * - 역할이 맞지 않으면 deniedPath로 보냅니다.
 *
 * 화면을 가리는 것일 뿐입니다. 데이터를 지키는 것은 서버의 일이므로, 서버도 같은 권한을 검사해야 합니다.
 */
export function defineAccess<Role extends string>(): {
    AccessProvider: (props: AccessProviderProps<Role>) => ReactNode
    ProtectedRoute: (props: ProtectedRouteProps<Role>) => ReactNode
} {
    const AccessContext = createContext<AccessContextValue<Role> | null>(null)

    function AccessProvider({ children, ...value }: AccessProviderProps<Role>) {
        return <AccessContext value={value}>{children}</AccessContext>
    }

    function ProtectedRoute({ requiredRoles, children }: ProtectedRouteProps<Role>) {
        const context = use(AccessContext)
        invariant(
            context,
            'ProtectedRoute는 AccessProvider 안에서만 쓸 수 있습니다. AppRouter 안에서 화면들을 AccessProvider로 감싸세요.',
        )
        const location = useLocation()
        const { access, loginPath, deniedPath, checking = null } = context
        // 이 화면을 한 번이라도 보여 줬는가. 들어와 있다가 로그아웃한 것과 들어오려다 막힌 것을 가릅니다.
        const [hasEntered, setHasEntered] = useState(false)

        if (access.status === 'checking') return checking

        if (access.status === 'signedOut') {
            if (hasEntered) return <Navigate to={loginPath} replace />
            const sentFrom: SentFrom = {
                from: `${location.pathname}${location.search}`,
            }
            return <Navigate to={loginPath} replace state={sentFrom} />
        }

        if (requiredRoles !== undefined) {
            // 역할을 아직 모르면 "권한 없음"으로 보지 않고 기다립니다. 여기서 내보내면 새로고침할 때마다 튕깁니다.
            if (access.role === null) return checking
            if (!requiredRoles.includes(access.role)) {
                return <Navigate to={deniedPath} replace />
            }
        }

        if (!hasEntered) setHasEntered(true)
        return children
    }

    return { AccessProvider, ProtectedRoute }
}
