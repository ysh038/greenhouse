import styles from './Checkbox.module.css'

export type CheckboxProps = {
    /** 체크박스 옆에 보이고 스크린 리더도 읽는 이름. */
    label: string
    checked: boolean
    /** 이벤트가 아니라 바뀐 참/거짓 값을 받습니다. */
    onChange: (checked: boolean) => void
    disabled?: boolean
    /** 켜면 라벨에 취소선을 긋고 흐리게 보입니다. 완료한 항목처럼 "끝난 것"을 구분할 때 씁니다. */
    isStruck?: boolean
}

export function Checkbox({
    label,
    checked,
    onChange,
    disabled = false,
    isStruck = false,
}: CheckboxProps) {
    return (
        <label className={styles.checkbox}>
            <input
                type="checkbox"
                className={styles.input}
                checked={checked}
                disabled={disabled}
                onChange={(event) => {
                    onChange(event.target.checked)
                }}
            />
            <span
                className={styles.label}
                data-struck={isStruck ? 'true' : undefined}
            >
                {label}
            </span>
        </label>
    )
}
