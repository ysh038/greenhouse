import { useId } from 'react'

import styles from './Select.module.css'

export type SelectOption<Value extends string> = {
    value: Value
    /** 화면에 보이는 이름 */
    label: string
}

export type SelectProps<Value extends string> = {
    /** 입력의 이름. 화면에 보이고 스크린 리더도 읽습니다. */
    label: string
    value: Value
    /** 고를 수 있는 것들. "선택 안 함"이 필요하면 value가 ''인 항목을 넣습니다. */
    options: readonly SelectOption<Value>[]
    /** 이벤트가 아니라 고른 항목의 value를 받습니다. */
    onChange: (value: Value) => void
    disabled?: boolean
    /** 값이 있으면 오류 상태로 표시하고 아래에 이 문장을 보여 줍니다. */
    errorMessage?: string
    /** 라벨을 화면에서 숨깁니다. 스크린 리더는 계속 읽습니다. */
    isLabelHidden?: boolean
}

/**
 * 여럿 가운데 하나를 고르는 드롭다운. 브라우저의 기본 select라서 키보드와 모바일의 선택 화면이 그대로 동작합니다.
 * 고를 것이 두세 개뿐이고 한눈에 보여야 하면 aria-pressed를 준 Button 여러 개가 더 맞습니다.
 */
export function Select<Value extends string>({
    label,
    value,
    options,
    onChange,
    disabled = false,
    errorMessage,
    isLabelHidden = false,
}: SelectProps<Value>) {
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
            <select
                id={id}
                value={value}
                disabled={disabled}
                className={styles.select}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                onChange={(event) => {
                    const picked = options.find(
                        (option) => option.value === event.target.value,
                    )
                    if (picked) onChange(picked.value)
                }}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {hasError && (
                <span id={errorId} role="alert" className={styles.error}>
                    {errorMessage}
                </span>
            )}
        </div>
    )
}
