// expect: no-restricted-imports
import { invariant } from '../../../packages/framework/src/assert/invariant'

export function requireValue(value: string | null): string {
    invariant(value, '값이 없습니다')
    return value
}
