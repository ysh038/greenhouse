import { generatePath } from 'react-router'

/** 주소 틀에서 `:이름` 자리의 이름들. 예: '/plants/:id' → 'id' */
export type RouteParamName<Path extends string> =
    Path extends `${string}:${infer Name}/${infer Rest}`
        ? Name | RouteParamName<`/${Rest}`>
        : Path extends `${string}:${infer Name}`
          ? Name
          : never

/** 주소에서 읽은 값. 주소에 적힌 글자 그대로라서 모두 문자열입니다. */
export type RouteParams<Path extends string> = Record<RouteParamName<Path>, string>

type HrefArgs<Path extends string> = [RouteParamName<Path>] extends [never]
    ? []
    : [params: Record<RouteParamName<Path>, string | number>]

export type RouteDef<Path extends string> = {
    /** 주소 틀. 예: '/plants/:id' */
    readonly path: Path
    /** 이 화면의 주소를 만듭니다. `:이름` 자리가 있으면 그 값을 넘겨야 합니다. */
    href: (...args: HrefArgs<Path>) => string
}

/**
 * 화면 하나의 주소를 정의합니다. 주소를 문자열로 여기저기 적지 않고 이것으로 만들어 씁니다.
 *
 *     export const plantDetailRoute = defineRoute('/plants/:id')
 *     plantDetailRoute.href({ id: 3 })   // '/plants/3'
 *
 * 화면에 연결하는 것은 RouteView, 주소의 값을 읽는 것은 useRouteParams입니다.
 */
export function defineRoute<const Path extends `/${string}`>(
    path: Path,
): RouteDef<Path> {
    return {
        path,
        href: (...args: HrefArgs<Path>) => {
            const params: Record<string, string | number> = args[0] ?? {}
            return generatePath<string>(
                path,
                Object.fromEntries(
                    Object.entries(params).map(([name, value]) => [name, String(value)]),
                ),
            )
        },
    }
}
