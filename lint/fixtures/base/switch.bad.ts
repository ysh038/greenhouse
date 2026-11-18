// expect: @typescript-eslint/switch-exhaustiveness-check
type Status = 'idle' | 'loading' | 'done'

export function label(status: Status): string {
    switch (status) {
        case 'idle':
            return '대기'
        case 'loading':
            return '불러오는 중'
    }
    return '완료'
}
