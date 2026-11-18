import type { ComponentProps } from 'react'

import styles from './Button.module.css'

export type ButtonProps = Omit<ComponentProps<'button'>, 'className' | 'style'> & {
    /** primary는 화면의 주된 동작 하나에만 씁니다. 기본값은 secondary. */
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md'
}

/**
 * type의 기본값이 "button"입니다. 폼을 제출하는 버튼에만 type="submit"을 줍니다.
 * 켜짐/꺼짐이나 선택 상태는 aria-pressed로 알리면 모양도 같이 바뀝니다.
 */
export function Button({
    variant = 'secondary',
    size = 'md',
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
        />
    )
}
