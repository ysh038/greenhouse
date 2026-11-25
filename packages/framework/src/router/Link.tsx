import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

import styles from './Link.module.css'

export type LinkProps = {
    /** 갈 주소. defineRoute로 만든 주소의 href()를 넘깁니다. */
    to: string
    /**
     * 'text'는 글 속의 링크, 'nav'는 메뉴 항목입니다.
     * 어느 쪽이든 지금 보고 있는 화면을 가리키면 aria-current="page"가 붙고, 'nav'는 모양도 바뀝니다.
     */
    appearance?: 'text' | 'nav'
    children: ReactNode
}

/**
 * 앱 안의 다른 화면으로 가는 링크. 페이지를 새로 불러오지 않고 화면만 바꿉니다.
 * '/plants'를 가리키는 링크는 '/plants/3'을 보고 있을 때도 지금 화면으로 표시됩니다. '/'는 정확히 '/'일 때만입니다.
 */
export function Link({ to, appearance = 'text', children }: LinkProps) {
    return (
        <NavLink to={to} className={styles.link} data-appearance={appearance}>
            {children}
        </NavLink>
    )
}

export type ExternalLinkProps = {
    /** 앱 밖의 주소. https://로 시작합니다. */
    href: `https://${string}` | `http://${string}` | `mailto:${string}`
    children: ReactNode
}

/** 앱 밖으로 나가는 링크. 새 탭에서 엽니다. */
export function ExternalLink({ href, children }: ExternalLinkProps) {
    return (
        <a
            href={href}
            className={styles.link}
            data-appearance="text"
            target="_blank"
            rel="noreferrer"
        >
            {children}
        </a>
    )
}
