import type { ReactNode } from 'react'

import styles from './Page.module.css'

export type PageProps = {
    /** 화면 제목. h1으로 들어갑니다. */
    title: string
    children: ReactNode
}

/** 화면 하나의 바깥 틀. 너비와 바깥 여백을 정하고 제목을 h1으로 넣습니다. */
export function Page({ title, children }: PageProps) {
    return (
        <main className={styles.page}>
            <h1>{title}</h1>
            {children}
        </main>
    )
}
