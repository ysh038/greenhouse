import type { HTMLAttributes } from 'react'

import styles from './Stack.module.css'
import type { Space } from './tokens'

export type StackProps = Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> & {
    /** 목록이면 ul이나 ol. 글머리표와 들여쓰기는 없앱니다. 기본값은 div. */
    as?: 'div' | 'ul' | 'ol'
    /** column은 위에서 아래로, row는 왼쪽에서 오른쪽으로 놓습니다. 기본값은 column. */
    direction?: 'column' | 'row'
    /** 자식 사이 간격. 기본값은 md. */
    gap?: Space
    /** 교차 축 정렬. 기본값은 column이면 stretch, row면 center. */
    align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
    justify?: 'start' | 'center' | 'end' | 'between'
    /** row에서 자리가 모자라면 다음 줄로 넘깁니다. */
    wrap?: boolean
}

/** 요소를 한 방향으로 늘어놓고 간격을 줍니다. 여백과 정렬은 이것으로 해결합니다. */
export function Stack({
    as: Tag = 'div',
    direction = 'column',
    gap = 'md',
    align = direction === 'row' ? 'center' : 'stretch',
    justify = 'start',
    wrap = false,
    ...rest
}: StackProps) {
    return (
        <Tag
            {...rest}
            className={styles.stack}
            data-direction={direction}
            data-gap={gap}
            data-align={align}
            data-justify={justify}
            data-wrap={wrap ? 'true' : undefined}
        />
    )
}
