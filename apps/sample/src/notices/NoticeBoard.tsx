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
import {
    Button,
    Card,
    ErrorNotice,
    Stack,
    Text,
    TextField,
} from '@agent-greenhouse/framework/ui'
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
            <Text tone="muted">공지 {notices.length}건</Text>
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
            <Stack direction="row" gap="sm">
                <Button size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
                    도움말
                </Button>
                {open && (
                    <Text role="note" tone="muted">
                        공지는 최신순으로 보입니다.
                    </Text>
                )}
            </Stack>
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
            <Stack gap="sm">
                <Stack direction="row" align="end" gap="sm">
                    <TextField label="새 공지" value={title} onChange={setTitle} />
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={createNotice.isPending}
                    >
                        등록
                    </Button>
                </Stack>
                {saveErrorStatus !== null && (
                    <Text role="alert" tone="danger">
                        등록하지 못했습니다 ({saveErrorStatus})
                    </Text>
                )}
                {added && (
                    <Text role="status" tone="success">
                        등록했습니다
                    </Text>
                )}
            </Stack>
        </form>
    )
}

export function NoticeBoard() {
    const [keyword, setKeyword] = useState('')
    const searchKeyword = useDebouncedValue(keyword, 300)

    return (
        <Card>
            <h2>공지사항</h2>
            <HelpMenu />
            <TextField
                type="search"
                label="공지 검색"
                value={keyword}
                onChange={setKeyword}
            />
            <DataBoundary
                pending={<Text tone="muted">불러오는 중</Text>}
                resetKeys={[searchKeyword]}
                renderError={({ retry }) => (
                    <ErrorNotice message="공지를 불러오지 못했습니다" onRetry={retry} />
                )}
            >
                <NoticeList keyword={searchKeyword} />
            </DataBoundary>
            <NoticeForm />
        </Card>
    )
}
