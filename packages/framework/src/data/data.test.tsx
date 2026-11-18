import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DataBoundary } from './DataBoundary'
import { createDataClient, DataProvider } from './DataProvider'
import { defineMutation } from './defineMutation'
import { defineQuery } from './defineQuery'
import { ApiError, ApiSchemaError } from './errors'
import { useData } from './useData'
import { useDeferredData } from './useDeferredData'
import { useMutate } from './useMutate'

function renderWithData(children: ReactNode) {
    return render(
        <DataProvider client={createDataClient({ retry: false })}>
            <DataBoundary
                pending={<p>불러오는 중</p>}
                renderError={({ error, retry }) => (
                    <div>
                        <p>실패: {String(error)}</p>
                        <button type="button" onClick={retry}>
                            다시 시도
                        </button>
                    </div>
                )}
            >
                {children}
            </DataBoundary>
        </DataProvider>,
    )
}

describe('defineQuery', () => {
    it('키에 scope와 인자가 자동으로 들어간다', () => {
        const userQuery = defineQuery({
            scope: 'users',
            load: (_context, id: string) => Promise.resolve({ id }),
        })
        const listQuery = defineQuery({
            scope: ['users', 'list'],
            load: () => Promise.resolve([]),
        })

        expect(userQuery('1').key).toEqual(['users', '1'])
        expect(userQuery('2').key).toEqual(['users', '2'])
        expect(userQuery.all().key).toEqual(['users'])
        expect(listQuery().key).toEqual(['users', 'list'])
    })

    it('같은 인자로 부르면 같은 객체를 돌려준다', () => {
        const userQuery = defineQuery({
            scope: 'users',
            load: (_context, filter: { keyword: string }) =>
                Promise.resolve(filter),
        })

        expect(userQuery({ keyword: '김' })).toBe(userQuery({ keyword: '김' }))
        expect(userQuery({ keyword: '김' })).not.toBe(
            userQuery({ keyword: '이' }),
        )
    })
})

describe('createDataClient', () => {
    function retryDecision(error: Error, failureCount = 0): unknown {
        const retry = createDataClient().getDefaultOptions().queries?.retry
        return typeof retry === 'function' ? retry(failureCount, error) : retry
    }
    const details = { method: 'GET', url: '/api/users/1' }

    it('4xx 응답과 스키마 오류는 재시도하지 않는다', () => {
        expect(
            retryDecision(new ApiError({ ...details, status: 404, body: null })),
        ).toBe(false)
        expect(
            retryDecision(new ApiError({ ...details, status: 400, body: null })),
        ).toBe(false)
        expect(retryDecision(new ApiSchemaError({ ...details, issues: [] }))).toBe(
            false,
        )
    })

    it('5xx, 408, 429, 네트워크 오류는 한 번 재시도한다', () => {
        expect(
            retryDecision(new ApiError({ ...details, status: 503, body: null })),
        ).toBe(true)
        expect(
            retryDecision(new ApiError({ ...details, status: 429, body: null })),
        ).toBe(true)
        expect(retryDecision(new TypeError('Failed to fetch'))).toBe(true)
        expect(retryDecision(new TypeError('Failed to fetch'), 1)).toBe(false)
    })
})

describe('DataBoundary', () => {
    it('resetKeys가 바뀌면 에러를 풀고 다시 그린다', async () => {
        const userQuery = defineQuery({
            scope: 'reset-keys',
            load: (_context, id: string) =>
                id === 'bad'
                    ? Promise.reject(new Error('없는 사용자'))
                    : Promise.resolve({ name: `사용자 ${id}` }),
        })
        function UserName({ id }: { id: string }) {
            const user = useData(userQuery(id))
            return <p>{user.name}</p>
        }
        function Page({ id }: { id: string }) {
            return (
                <DataBoundary
                    pending={<p>불러오는 중</p>}
                    renderError={({ error }) => <p>실패: {String(error)}</p>}
                    resetKeys={[id]}
                >
                    <UserName id={id} />
                </DataBoundary>
            )
        }
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        const client = createDataClient({ retry: false })

        const { rerender } = render(
            <DataProvider client={client}>
                <Page id="bad" />
            </DataProvider>,
        )
        expect(await screen.findByText('실패: Error: 없는 사용자')).toBeDefined()

        rerender(
            <DataProvider client={client}>
                <Page id="3" />
            </DataProvider>,
        )

        expect(await screen.findByText('사용자 3')).toBeDefined()
        consoleError.mockRestore()
    })
})

describe('useDeferredData', () => {
    it('인자가 바뀌어도 새 결과가 올 때까지 이전 결과를 유지한다', async () => {
        const resolvers = new Map<string, (names: string[]) => void>()
        const searchQuery = defineQuery({
            scope: 'search',
            load: (_context, keyword: string) =>
                new Promise<string[]>((resolve) => {
                    resolvers.set(keyword, resolve)
                }),
        })
        function Results({ keyword }: { keyword: string }) {
            const { data, isUpdating } = useDeferredData(searchQuery(keyword))
            return (
                <p>
                    {data.join(',')} {isUpdating ? '(갱신 중)' : '(최신)'}
                </p>
            )
        }
        const client = createDataClient({ retry: false })
        const view = (keyword: string) => (
            <DataProvider client={client}>
                <DataBoundary
                    pending={<p>불러오는 중</p>}
                    renderError={() => <p>실패</p>}
                >
                    <Results keyword={keyword} />
                </DataBoundary>
            </DataProvider>
        )

        const { rerender } = render(view('김'))
        expect(screen.getByText('불러오는 중')).toBeDefined()
        await act(async () => {
            resolvers.get('김')?.(['김하늘', '김지호'])
            await Promise.resolve()
        })
        expect(await screen.findByText('김하늘,김지호 (최신)')).toBeDefined()

        rerender(view('이'))

        expect(await screen.findByText('김하늘,김지호 (갱신 중)')).toBeDefined()
        expect(screen.queryByText('불러오는 중')).toBeNull()

        await act(async () => {
            resolvers.get('이')?.(['이도윤'])
            await Promise.resolve()
        })
        expect(await screen.findByText('이도윤 (최신)')).toBeDefined()
    })
})

describe('useData', () => {
    it('불러오는 동안 pending을 보여 주고, 끝나면 데이터를 준다', async () => {
        const userQuery = defineQuery({
            scope: 'users',
            load: (_context, id: string) =>
                Promise.resolve({ name: `사용자 ${id}` }),
        })
        function UserName() {
            const user = useData(userQuery('7'))
            return <p>{user.name}</p>
        }

        renderWithData(<UserName />)

        expect(screen.getByText('불러오는 중')).toBeDefined()
        expect(await screen.findByText('사용자 7')).toBeDefined()
    })

    it('실패하면 renderError를 보여 주고, retry로 다시 불러온다', async () => {
        const load = vi
            .fn<() => Promise<{ name: string }>>()
            .mockRejectedValueOnce(new Error('서버 오류'))
            .mockResolvedValueOnce({ name: '복구됨' })
        const userQuery = defineQuery({ scope: 'flaky', load })
        function UserName() {
            const user = useData(userQuery())
            return <p>{user.name}</p>
        }
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)

        renderWithData(<UserName />)

        expect(await screen.findByText('실패: Error: 서버 오류')).toBeDefined()

        fireEvent.click(screen.getByText('다시 시도'))

        expect(await screen.findByText('복구됨')).toBeDefined()
        expect(load).toHaveBeenCalledTimes(2)
        consoleError.mockRestore()
    })
})

describe('useMutate', () => {
    it('성공하면 invalidates가 가리킨 쿼리를 다시 불러온다', async () => {
        let count = 0
        const countQuery = defineQuery({
            scope: 'count',
            load: () => Promise.resolve(count),
        })
        const increment = defineMutation({
            run: (amount: number) => {
                count += amount
                return Promise.resolve(count)
            },
            invalidates: () => [countQuery()],
        })
        const onSuccess = vi.fn()
        function Counter() {
            const value = useData(countQuery())
            const { mutate, isPending } = useMutate(increment)
            return (
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                        mutate(5, { onSuccess })
                    }}
                >
                    값 {value}
                </button>
            )
        }

        renderWithData(<Counter />)
        fireEvent.click(await screen.findByText('값 0'))

        expect(await screen.findByText('값 5')).toBeDefined()
        expect(onSuccess).toHaveBeenCalledExactlyOnceWith(5)
    })

    it('실패하면 error에 담기고 onError를 부른다', async () => {
        const failing = defineMutation({
            run: () => Promise.reject(new Error('저장 실패')),
            invalidates: () => [],
        })
        const onError = vi.fn()
        function SaveButton() {
            const { mutate, isError, error } = useMutate(failing)
            return (
                <>
                    <button
                        type="button"
                        onClick={() => {
                            mutate(undefined, { onError })
                        }}
                    >
                        저장
                    </button>
                    {isError && error instanceof Error && <p>{error.message}</p>}
                </>
            )
        }

        renderWithData(<SaveButton />)
        fireEvent.click(screen.getByText('저장'))

        expect(await screen.findByText('저장 실패')).toBeDefined()
        expect(onError).toHaveBeenCalledExactlyOnceWith(new Error('저장 실패'))
    })
})
