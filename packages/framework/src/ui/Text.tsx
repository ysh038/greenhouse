import type { HTMLAttributes } from 'react'

import styles from './Text.module.css'
import type { Tone } from './tokens'

export type TextProps = Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> & {
    /** 문단이면 p(기본값), 문장 안의 일부면 span. */
    as?: 'p' | 'span'
    /** 색. muted는 보조 설명, danger는 오류, success는 완료 안내. */
    tone?: Tone
    size?: 'sm' | 'md' | 'lg'
    weight?: 'regular' | 'bold'
}

/** 색, 크기, 굵기가 정해진 글. role="alert"나 role="status"도 그대로 줄 수 있습니다. */
export function Text({
    as: Tag = 'p',
    tone = 'default',
    size = 'md',
    weight = 'regular',
    ...rest
}: TextProps) {
    return (
        <Tag
            {...rest}
            className={styles.text}
            data-tone={tone}
            data-size={size}
            data-weight={weight}
        />
    )
}
