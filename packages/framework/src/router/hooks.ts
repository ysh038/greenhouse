import {
    useNavigate as useRouterNavigate,
    useParams,
    useSearchParams,
} from 'react-router'

import { invariant } from '../assert'

import type { RouteDef, RouteParams } from './defineRoute'

export type Navigate = (
    /** 갈 주소. defineRoute로 만든 주소의 href()를 넘깁니다. */
    to: string,
    options?: {
        /** 켜면 지금 주소를 기록에 남기지 않습니다. 뒤로 가기로 돌아오면 안 되는 화면(저장을 마친 입력 폼)에서 씁니다. */
        replace?: boolean
    },
) => void

/**
 * 코드에서 화면을 옮길 때 씁니다. 예: 저장에 성공한 뒤 목록으로.
 * 사용자가 눌러서 가는 것은 Link를 씁니다.
 */
export function useNavigate(): Navigate {
    const navigate = useRouterNavigate()
    return (to, options) => {
        void navigate(to, { replace: options?.replace ?? false })
    }
}

/**
 * 지금 주소에서 `:이름` 자리의 값을 읽습니다. 그 route의 화면 안에서만 씁니다.
 *
 *     const { id } = useRouteParams(plantDetailRoute)   // '/plants/3'이면 '3'
 *
 * 값은 주소에 적힌 글자 그대로입니다. 숫자가 필요하면 Number(id)로 바꾸고, 사용자가 주소를 직접 고칠 수 있으니
 * 그 값에 맞는 것이 없는 경우를 화면에서 다룹니다.
 */
export function useRouteParams<Path extends string>(
    route: RouteDef<Path>,
): RouteParams<Path> {
    const params = useParams()
    const names = [...route.path.matchAll(/:([A-Za-z0-9_]+)/g)].map(
        ([, name]) => name,
    )
    const entries = names.map((name) => {
        invariant(name !== undefined, '주소 틀을 읽지 못했습니다')
        const value = params[name]
        invariant(
            value !== undefined,
            `지금 주소에 "${name}" 값이 없습니다. useRouteParams는 ${route.path} 화면 안에서만 쓸 수 있습니다.`,
        )
        return [name, value] as const
    })
    return Object.fromEntries(entries) as RouteParams<Path>
}

/**
 * 주소의 `?이름=값` 하나를 상태처럼 읽고 씁니다. 필터, 정렬, 검색어처럼 새로고침하거나 주소를 공유해도
 * 유지돼야 하는 화면 상태에 씁니다.
 *
 *     const [sort, setSort] = useSearchParam('sort', 'name')
 *
 * 값이 주소에 없으면 fallback을 돌려줍니다. fallback과 같은 값으로 바꾸면 주소에서 그 항목을 지웁니다.
 * 바꿀 때 기록을 새로 쌓지 않으므로, 뒤로 가기는 이 화면에 오기 전 화면으로 갑니다.
 */
export function useSearchParam(
    name: string,
    fallback = '',
): [value: string, setValue: (value: string) => void] {
    const [searchParams, setSearchParams] = useSearchParams()
    const value = searchParams.get(name) ?? fallback
    const setValue = (next: string) => {
        setSearchParams(
            (current) => {
                const updated = new URLSearchParams(current)
                if (next === fallback) updated.delete(name)
                else updated.set(name, next)
                return updated
            },
            { replace: true },
        )
    }
    return [value, setValue]
}
