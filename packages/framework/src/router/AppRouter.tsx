import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

export type AppRouterProps = {
    children: ReactNode
}

/**
 * 앱 전체를 한 번 감쌉니다. 이 안에서 Link, RouteView, useNavigate 등을 쓸 수 있습니다.
 * 메뉴처럼 모든 화면에 보이는 것은 RouteView 바깥, AppRouter 안에 둡니다.
 */
export function AppRouter({ children }: AppRouterProps) {
    return <BrowserRouter>{children}</BrowserRouter>
}

export type RouteScreen = {
    /** defineRoute로 만든 주소 */
    route: { readonly path: string }
    /** 그 주소에서 보여 줄 화면 */
    screen: ReactNode
}

export type RouteViewProps = {
    routes: readonly RouteScreen[]
    /** 어느 주소에도 맞지 않을 때 보여 줄 화면. 주소를 잘못 친 경우가 있으므로 필수입니다. */
    notFound: ReactNode
}

/** 지금 주소에 맞는 화면 하나를 그립니다. */
export function RouteView({ routes, notFound }: RouteViewProps) {
    return (
        <Routes>
            {routes.map(({ route, screen }) => (
                <Route key={route.path} path={route.path} element={screen} />
            ))}
            <Route path="*" element={notFound} />
        </Routes>
    )
}

export type RedirectProps = {
    /** 보낼 주소. defineRoute로 만든 주소의 href()를 넘깁니다. */
    to: string
}

/**
 * 이 화면에 오면 곧바로 다른 주소로 보냅니다. 예: '/'로 들어오면 목록으로.
 * 지금 주소는 기록에 남기지 않으므로 뒤로 가기로 이 화면에 돌아오지 않습니다.
 *
 *     { route: homeRoute, screen: <Redirect to={ordersRoute.href()} /> }
 */
export function Redirect({ to }: RedirectProps) {
    return <Navigate to={to} replace />
}
