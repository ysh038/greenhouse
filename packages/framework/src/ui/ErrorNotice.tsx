import { Button } from './Button'
import styles from './ErrorNotice.module.css'

export type ErrorNoticeProps = {
    /** 사용자에게 보여 줄 문장. */
    message: string
    /** 주면 "다시 시도" 버튼이 생깁니다. DataBoundary의 retry를 그대로 넘기면 됩니다. */
    onRetry?: () => void
    retryLabel?: string
}

/**
 * 불러오기나 저장이 실패했을 때 보여 주는 공용 화면.
 * 예: renderError={({ error, retry }) => <ErrorNotice message={설명(error)} onRetry={retry} />}
 */
export function ErrorNotice({
    message,
    onRetry,
    retryLabel = '다시 시도',
}: ErrorNoticeProps) {
    return (
        <div role="alert" className={styles.notice}>
            <p className={styles.message}>{message}</p>
            {onRetry && (
                <Button size="sm" onClick={onRetry}>
                    {retryLabel}
                </Button>
            )}
        </div>
    )
}
