export type Space = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export type Tone = 'default' | 'muted' | 'danger' | 'success'

/**
 * 실행 중에 값이 정해지는 스타일에서 토큰을 쓸 때 사용합니다.
 * 예: style={{ color: isOver ? tokens.color.danger : tokens.color.text }}
 */
export const tokens = {
    color: {
        text: 'var(--gh-color-text)',
        textMuted: 'var(--gh-color-text-muted)',
        background: 'var(--gh-color-background)',
        surface: 'var(--gh-color-surface)',
        border: 'var(--gh-color-border)',
        primary: 'var(--gh-color-primary)',
        onPrimary: 'var(--gh-color-on-primary)',
        selected: 'var(--gh-color-selected)',
        danger: 'var(--gh-color-danger)',
        success: 'var(--gh-color-success)',
    },
    space: {
        none: 'var(--gh-space-none)',
        xs: 'var(--gh-space-xs)',
        sm: 'var(--gh-space-sm)',
        md: 'var(--gh-space-md)',
        lg: 'var(--gh-space-lg)',
        xl: 'var(--gh-space-xl)',
        '2xl': 'var(--gh-space-2xl)',
    },
    radius: {
        sm: 'var(--gh-radius-sm)',
        md: 'var(--gh-radius-md)',
    },
} as const satisfies {
    color: Record<string, string>
    space: Record<Space, string>
    radius: Record<string, string>
}
