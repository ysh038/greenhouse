import { describe, expect, it } from 'vitest'

import { invariant } from './invariant'

describe('invariant', () => {
    it('조건이 참이면 아무 일도 하지 않는다', () => {
        expect(() => {
            invariant(true, '실패하면 안 된다')
        }).not.toThrow()
    })

    it('조건이 거짓이면 주어진 메시지로 던진다', () => {
        expect(() => {
            invariant(null, '#root 요소가 없습니다')
        }).toThrow('#root 요소가 없습니다')
    })

    it('통과한 뒤에는 타입이 좁혀진다', () => {
        const value: string | undefined = ['a'][0]
        invariant(value, '값이 없습니다')
        expect(value.length).toBe(1)
    })
})
