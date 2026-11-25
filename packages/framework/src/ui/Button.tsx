import type { ComponentProps } from 'react'

import styles from './Button.module.css'

export type ButtonProps = Omit<ComponentProps<'button'>, 'className' | 'style'> & {
    /** primary는 화면의 주된 동작 하나에만 씁니다. 기본값은 secondary. */
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md'
    /**
     * 삭제처럼 되돌릴 수 없는 동작에는 "danger"를 줍니다.
     * 목록의 "삭제"는 tone="danger"만, 확인 창에서 실제로 지우는 버튼은 variant="primary"와 같이 씁니다.
     */
    tone?: 'default' | 'danger'
}

/**
 * type의 기본값이 "button"입니다. 폼을 제출하는 버튼에만 type="submit"을 줍니다.
 * 켜짐/꺼짐이나 선택 상태는 aria-pressed로 알리면 모양도 같이 바뀝니다.
 */
export function Button({
    variant = 'secondary',
    size = 'md',
    tone = 'default',
    type = 'button',
    ...rest
}: ButtonProps) {
    return (
        <button
            {...rest}
            type={type}
            className={styles.button}
            data-variant={variant}
            data-size={size}
            data-tone={tone}
        />
    )
}
