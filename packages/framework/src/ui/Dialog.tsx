import {
    useEffect,
    useId,
    useRef,
    type KeyboardEvent,
    type MouseEvent,
    type ReactNode,
} from 'react'

import { Button } from './Button'
import styles from './Dialog.module.css'

const FOCUSABLE = [
    'a[href]',
    'button:not(:disabled)',
    'input:not(:disabled)',
    'select:not(:disabled)',
    'textarea:not(:disabled)',
    '[tabindex]:not([tabindex="-1"])',
].join(', ')

type FrameProps = {
    role: 'dialog' | 'alertdialog'
    labelledBy: string
    describedBy?: string
    /** Escape나 바깥을 눌렀을 때 부릅니다. 안 주면 그 둘로는 닫히지 않습니다. */
    onDismiss?: () => void
    children: ReactNode
}

/**
 * 모달의 공통 동작: 화면을 덮고, 포커스를 창 안에 가두고, 닫히면 열기 전 자리로 돌려줍니다.
 * 브라우저 기본 <dialog>의 showModal은 jsdom에 없어 테스트할 수 없어서 직접 처리합니다.
 */
function ModalFrame({ role, labelledBy, describedBy, onDismiss, children }: FrameProps) {
    const dialogRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const opener = document.activeElement
        const dialog = dialogRef.current
        if (dialog && !dialog.contains(document.activeElement)) {
            // 안에서 autoFocus로 자리를 정하지 않았으면 첫 번째로 누를 수 있는 것에 둡니다.
            const first = dialog.querySelector<HTMLElement>(FOCUSABLE)
            ;(first ?? dialog).focus()
        }
        return () => {
            if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
        }
    }, [])

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape' && onDismiss) {
            event.stopPropagation()
            onDismiss()
            return
        }
        if (event.key !== 'Tab') return

        const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)]
        const first = focusable[0]
        const last = focusable.at(-1)
        if (!first || !last) {
            event.preventDefault()
            return
        }
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }

    function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
        // 창 안에서 누르기 시작해 바깥에서 뗀 것(글자를 끌어 고를 때)은 닫지 않습니다.
        if (event.target === event.currentTarget) onDismiss?.()
    }

    return (
        <div className={styles.backdrop} onMouseDown={handleBackdropMouseDown}>
            <div
                ref={dialogRef}
                className={styles.dialog}
                role={role}
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                {children}
            </div>
        </div>
    )
}

export type DialogProps = {
    /** 창의 제목. 스크린 리더가 창을 이 이름으로 읽습니다. */
    title: string
    /** "닫기" 버튼, Escape, 바깥 클릭에서 부릅니다. */
    onClose: () => void
    /**
     * false이면 Escape와 바깥 클릭으로 닫히지 않고 "닫기" 버튼도 막힙니다.
     * 저장하는 동안 닫히면 안 될 때 씁니다. 기본값은 true.
     */
    isDismissible?: boolean
    closeLabel?: string
    children: ReactNode
}

/**
 * 화면 위에 뜨는 창(상세 보기, 입력 폼). 열려 있을 때만 그립니다.
 * 예: {selected && <Dialog title="식물 상세" onClose={close}>...</Dialog>}
 *
 * 열리면 포커스가 안의 첫 입력란이나 버튼으로 가고, 닫히면 열기 전 자리로 돌아옵니다.
 * 처음 포커스를 다른 곳에 두려면 그 요소에 autoFocus를 줍니다.
 * 묻고 답만 받는 창은 ConfirmDialog를 씁니다.
 */
export function Dialog({
    title,
    onClose,
    isDismissible = true,
    closeLabel = '닫기',
    children,
}: DialogProps) {
    const titleId = useId()
    return (
        <ModalFrame
            role="dialog"
            labelledBy={titleId}
            onDismiss={isDismissible ? onClose : undefined}
        >
            <div className={styles.header}>
                <h2 id={titleId} className={styles.title}>
                    {title}
                </h2>
                <Button variant="ghost" size="sm" onClick={onClose} disabled={!isDismissible}>
                    {closeLabel}
                </Button>
            </div>
            {children}
        </ModalFrame>
    )
}

export type ConfirmDialogProps = {
    /** 묻는 문장. 예: "이 게시글을 삭제할까요?" */
    message: string
    /** 확인 버튼의 글자. 예: "삭제" */
    confirmLabel: string
    cancelLabel?: string
    /** 삭제처럼 되돌릴 수 없는 동작이면 "danger". 확인 버튼이 빨갛게 됩니다. */
    tone?: 'default' | 'danger'
    onConfirm: () => void
    /** "취소" 버튼, Escape, 바깥 클릭에서 부릅니다. */
    onCancel: () => void
    /** 요청을 보내는 동안 true로 두면 두 버튼이 막히고 닫히지 않습니다. */
    isPending?: boolean
    /** 요청이 실패했을 때 창 안에 보여 줄 문장. */
    errorMessage?: string
}

/**
 * 되돌릴 수 없는 동작을 하기 전에 묻는 창. 열려 있을 때만 그립니다.
 * 예: {target && <ConfirmDialog message="이 글을 삭제할까요?" confirmLabel="삭제" tone="danger" onConfirm={remove} onCancel={close} />}
 *
 * 열리면 포커스가 "취소"에 갑니다. Enter를 잘못 눌러도 지워지지 않게 하려는 것입니다.
 */
export function ConfirmDialog({
    message,
    confirmLabel,
    cancelLabel = '취소',
    tone = 'default',
    onConfirm,
    onCancel,
    isPending = false,
    errorMessage,
}: ConfirmDialogProps) {
    const messageId = useId()
    const errorId = useId()
    return (
        <ModalFrame
            role="alertdialog"
            labelledBy={messageId}
            describedBy={errorMessage === undefined ? undefined : errorId}
            onDismiss={isPending ? undefined : onCancel}
        >
            <p id={messageId} className={styles.message}>
                {message}
            </p>
            {errorMessage !== undefined && (
                <p id={errorId} role="alert" className={styles.error}>
                    {errorMessage}
                </p>
            )}
            <div className={styles.actions}>
                <Button onClick={onCancel} disabled={isPending}>
                    {cancelLabel}
                </Button>
                <Button variant="primary" tone={tone} onClick={onConfirm} disabled={isPending}>
                    {confirmLabel}
                </Button>
            </div>
        </ModalFrame>
    )
}
