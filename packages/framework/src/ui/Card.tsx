import type { HTMLAttributes, Ref } from 'react'

import styles from './Card.module.css'
import type { Space } from './tokens'

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> & {
    /** 화면의 한 구역이면 section(기본값), 옆에 붙는 보조 패널이면 aside, 독립된 글이면 article. */
    as?: 'section' | 'aside' | 'article'
    /** 안쪽 여백. 기본값은 lg. */
    padding?: Space
    /** 안의 요소 사이 간격. 기본값은 md. */
    gap?: Space
    ref?: Ref<HTMLElement>
}

/** 테두리와 배경이 있는 상자. 안의 요소는 위에서 아래로 놓입니다. */
export function Card({
    as: Tag = 'section',
    padding = 'lg',
    gap = 'md',
    ...rest
}: CardProps) {
    return (
        <Tag
            {...rest}
            className={styles.card}
            data-padding={padding}
            data-gap={gap}
        />
    )
}
