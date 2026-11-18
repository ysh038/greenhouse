import { isApiError, type DataErrorProps } from '@agent-greenhouse/framework/data'

function describe(error: unknown): string {
    if (isApiError(error) && error.status === 404) {
        return '사용자를 찾을 수 없습니다 (404)'
    }
    if (isApiError(error)) return `불러오지 못했습니다 (${error.status})`
    return '불러오지 못했습니다'
}

export function renderLoadError({ error, retry }: DataErrorProps) {
    return (
        <div role="alert">
            <p>{describe(error)}</p>
            <button type="button" onClick={retry}>
                다시 시도
            </button>
        </div>
    )
}
