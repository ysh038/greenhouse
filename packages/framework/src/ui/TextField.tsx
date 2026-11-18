import { useId, type ComponentProps, type ReactNode } from 'react'

import styles from './TextField.module.css'

export type TextFieldProps = Omit<
    ComponentProps<'input'>,
    | 'className'
    | 'style'
    | 'id'
    | 'type'
    | 'value'
    | 'onChange'
    | 'aria-invalid'
    | 'aria-describedby'
> & {
    /** 입력란의 이름. 화면에 보이고 스크린 리더도 읽습니다. */
    label: string
    value: string
    /** 이벤트가 아니라 바뀐 문자열을 받습니다. */
    onChange: (value: string) => void
    type?: 'text' | 'search' | 'email' | 'password' | 'tel' | 'url'
    /** 값이 있으면 입력란을 오류 상태로 표시하고 아래에 이 문장을 보여 줍니다. */
    errorMessage?: string
    /** 라벨을 화면에서 숨깁니다. 스크린 리더는 계속 읽습니다. */
    isLabelHidden?: boolean
    /**
     * 입력란 오른쪽에 붙일 것. 보통 제출 버튼입니다.
     * Stack으로 나란히 놓으면 오류 문장이 나올 때 버튼이 어긋나므로 이것을 씁니다.
     */
    trailing?: ReactNode
}

export function TextField({
    label,
    value,
    onChange,
    type = 'text',
    errorMessage,
    isLabelHidden = false,
    trailing,
    ...rest
}: TextFieldProps) {
    const id = useId()
    const errorId = `${id}-error`
    const hasError = errorMessage !== undefined && errorMessage !== ''

    return (
        <div className={styles.field}>
            <label
                htmlFor={id}
                className={isLabelHidden ? styles.hiddenLabel : styles.label}
            >
                {label}
            </label>
            <div className={styles.row}>
                <input
                    {...rest}
                    id={id}
                    type={type}
                    value={value}
                    className={styles.input}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                    onChange={(event) => {
                        onChange(event.target.value)
                    }}
                />
                {trailing}
            </div>
            {hasError && (
                <span id={errorId} role="alert" className={styles.error}>
                    {errorMessage}
                </span>
            )}
        </div>
    )
}
