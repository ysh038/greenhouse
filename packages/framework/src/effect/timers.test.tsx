import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAnimationFrame, type AnimationFrame } from './useAnimationFrame'
import { useDebouncedValue } from './useDebouncedValue'
import { useInterval } from './useInterval'
import { useTimeout } from './useTimeout'

beforeEach(() => {
    vi.useFakeTimers()
})

describe('useTimeout', () => {
    it('지정한 시간이 지나면 한 번 부른다', () => {
        const callback = vi.fn()
        renderHook(() => {
            useTimeout(callback, 200)
        })

        vi.advanceTimersByTime(199)
        expect(callback).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('delayMs가 null이면 예약하지 않고, 값이 생기면 그때부터 센다', () => {
        const callback = vi.fn()
        const initialProps: { delayMs: number | null } = { delayMs: null }
        const { rerender } = renderHook(
            ({ delayMs }) => {
                useTimeout(callback, delayMs)
            },
            { initialProps },
        )

        vi.advanceTimersByTime(1000)
        expect(callback).not.toHaveBeenCalled()

        rerender({ delayMs: 100 })
        vi.advanceTimersByTime(100)
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('restartKey가 바뀌면 처음부터 다시 센다', () => {
        const callback = vi.fn()
        const { rerender } = renderHook(
            ({ restartKey }) => {
                useTimeout(callback, 200, restartKey)
            },
            { initialProps: { restartKey: 1 } },
        )

        vi.advanceTimersByTime(150)
        rerender({ restartKey: 2 })
        vi.advanceTimersByTime(150)
        expect(callback).not.toHaveBeenCalled()

        vi.advanceTimersByTime(50)
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('언마운트하면 취소한다', () => {
        const callback = vi.fn()
        const { unmount } = renderHook(() => {
            useTimeout(callback, 200)
        })

        unmount()
        vi.advanceTimersByTime(1000)

        expect(callback).not.toHaveBeenCalled()
    })
})

describe('useInterval', () => {
    it('간격마다 부르고 언마운트하면 멈춘다', () => {
        const callback = vi.fn()
        const { unmount } = renderHook(() => {
            useInterval(callback, 100)
        })

        vi.advanceTimersByTime(350)
        expect(callback).toHaveBeenCalledTimes(3)

        unmount()
        vi.advanceTimersByTime(1000)
        expect(callback).toHaveBeenCalledTimes(3)
    })
})

describe('useDebouncedValue', () => {
    it('값이 멈춘 뒤 지정한 시간이 지나야 반영한다', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, 300),
            { initialProps: { value: 'a' } },
        )

        rerender({ value: 'ab' })
        act(() => {
            vi.advanceTimersByTime(200)
        })
        rerender({ value: 'abc' })
        act(() => {
            vi.advanceTimersByTime(200)
        })
        expect(result.current).toBe('a')

        act(() => {
            vi.advanceTimersByTime(100)
        })
        expect(result.current).toBe('abc')
    })
})

describe('useAnimationFrame', () => {
    it('활성일 때 프레임마다 경과 시간을 넘겨 부른다', () => {
        const frames: AnimationFrame[] = []
        renderHook(() => {
            useAnimationFrame((frame) => {
                frames.push(frame)
            })
        })

        vi.advanceTimersToNextFrame()
        vi.advanceTimersToNextFrame()
        vi.advanceTimersToNextFrame()

        expect(frames).toHaveLength(3)
        expect(frames[0]).toEqual({ deltaMs: 0, elapsedMs: 0 })
        expect(frames[2]?.elapsedMs).toBeGreaterThan(0)
        expect(frames[2]?.deltaMs).toBeGreaterThan(0)
    })

    it('비활성이면 부르지 않고, 비활성으로 바뀌면 멈춘다', () => {
        const callback = vi.fn()
        const { rerender } = renderHook(
            ({ isActive }) => {
                useAnimationFrame(callback, isActive)
            },
            { initialProps: { isActive: false } },
        )

        vi.advanceTimersToNextFrame()
        expect(callback).not.toHaveBeenCalled()

        rerender({ isActive: true })
        vi.advanceTimersToNextFrame()
        expect(callback).toHaveBeenCalledTimes(1)

        rerender({ isActive: false })
        vi.advanceTimersToNextFrame()
        expect(callback).toHaveBeenCalledTimes(1)
    })
})
