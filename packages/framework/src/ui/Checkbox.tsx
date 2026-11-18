import styles from './Checkbox.module.css'

export type CheckboxProps = {
    /** 체크박스 옆에 보이고 스크린 리더도 읽는 이름. */
    label: string
    checked: boolean
    /** 이벤트가 아니라 바뀐 참/거짓 값을 받습니다. */
    onChange: (checked: boolean) => void
    disabled?: boolean
}

export function Checkbox({ label, checked, onChange, disabled = false }: CheckboxProps) {
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
            <span>{label}</span>
        </label>
    )
}
