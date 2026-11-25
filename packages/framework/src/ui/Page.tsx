import type { ReactNode } from 'react'

import styles from './Page.module.css'

export type PageProps = {
    /** 화면 제목. h1으로 들어갑니다. */
    title: string
    /**
     * 제목 위에 놓을 것. 보통 모든 화면에 보이는 메뉴입니다.
     * 본문과 같은 너비와 좌우 여백에 맞춰 놓이므로, 메뉴를 Page 바깥에 두고 CSS로 맞추지 않아도 됩니다.
     */
    header?: ReactNode
    children: ReactNode
}

/** 화면 하나의 바깥 틀. 너비와 바깥 여백을 정하고 제목을 h1으로 넣습니다. */
export function Page({ title, header, children }: PageProps) {
    return (
        <>
            {header !== undefined && (
                <header className={styles.header}>{header}</header>
            )}
            <main className={styles.page}>
                <h1>{title}</h1>
                {children}
            </main>
        </>
    )
}
