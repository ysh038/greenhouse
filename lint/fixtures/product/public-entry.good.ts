import { invariant } from '@agent-greenhouse/framework/assert'

export function requireValue(value: string | null): string {
    invariant(value, '값이 없습니다')
    return value
}
