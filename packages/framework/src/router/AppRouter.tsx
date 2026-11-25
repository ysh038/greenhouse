import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'

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
