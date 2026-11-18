import {
    DataBoundary,
    defineMutation,
    defineQuery,
    isApiError,
    useDeferredData,
    useMutate,
} from '@agent-greenhouse/framework/data'
import {
    useClickOutside,
    useDebouncedValue,
    useKeydown,
    useTimeout,
} from '@agent-greenhouse/framework/effect'
import { useRef, useState, type SyntheticEvent } from 'react'
import { z } from 'zod'

import { api } from '../api'

const NoticeSchema = z.object({ id: z.number(), title: z.string() })
const NoticeListSchema = z.array(NoticeSchema)

type Notice = z.infer<typeof NoticeSchema>

const noticesQuery = defineQuery<{ keyword: string }, Notice[]>({
    scope: 'notices',
    load: ({ signal }, { keyword }) =>
        api.get('/notices', {
            schema: NoticeListSchema,
            query: keyword ? { keyword } : undefined,
            signal,
        }),
})

const createNoticeMutation = defineMutation<{ title: string }, Notice>({
    run: (input) => api.post('/notices', { schema: NoticeSchema, body: input }),
    invalidates: () => [noticesQuery.all()],
})

function NoticeList({ keyword }: { keyword: string }) {
    const { data: notices } = useDeferredData(noticesQuery({ keyword }))
    return (
        <>
            <p>공지 {notices.length}건</p>
            <ul aria-label="공지 목록">
                {notices.map((notice) => (
                    <li key={notice.id}>{notice.title}</li>
                ))}
            </ul>
        </>
    )
}

function HelpMenu() {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useClickOutside([ref], () => setOpen(false), { isEnabled: open })
    useKeydown('Escape', () => setOpen(false), { isEnabled: open })

    return (
        <div ref={ref}>
            <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
                도움말
            </button>
            {open && <p role="note">공지는 최신순으로 보입니다.</p>}
        </div>
    )
}

function NoticeForm() {
    const [title, setTitle] = useState('')
    const [added, setAdded] = useState(false)
    const [addedSeq, setAddedSeq] = useState(0)
    const createNotice = useMutate(createNoticeMutation)
    useTimeout(() => setAdded(false), added ? 2000 : null, addedSeq)

    const saveErrorStatus =
        createNotice.isError && isApiError(createNotice.error)
            ? createNotice.error.status
            : null

    const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault()
        createNotice.mutate(
            { title },
            {
                onSuccess: () => {
                    setTitle('')
                    setAdded(true)
                    setAddedSeq((seq) => seq + 1)
                },
            },
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <label>
                새 공지{' '}
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>{' '}
            <button type="submit" disabled={createNotice.isPending}>
                등록
            </button>
            {saveErrorStatus !== null && (
                <p role="alert">등록하지 못했습니다 ({saveErrorStatus})</p>
            )}
            {added && <p role="status">등록했습니다</p>}
        </form>
    )
}

export function NoticeBoard() {
    const [keyword, setKeyword] = useState('')
    const searchKeyword = useDebouncedValue(keyword, 300)

    return (
        <section>
            <h2>공지사항</h2>
            <HelpMenu />
            <label>
                공지 검색{' '}
                <input
                    type="search"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                />
            </label>
            <DataBoundary
                pending={<p>불러오는 중</p>}
                resetKeys={[searchKeyword]}
                renderError={({ retry }) => (
                    <div role="alert">
                        <p>공지를 불러오지 못했습니다</p>
                        <button type="button" onClick={retry}>
                            다시 시도
                        </button>
                    </div>
                )}
            >
                <NoticeList keyword={searchKeyword} />
            </DataBoundary>
            <NoticeForm />
        </section>
    )
}
