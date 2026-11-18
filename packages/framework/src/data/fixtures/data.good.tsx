import {
    createApiClient,
    DataBoundary,
    DataProvider,
    defineMutation,
    defineQuery,
    isApiError,
    useData,
    useDeferredData,
    useMutate,
} from '@agent-greenhouse/framework/data'
import { z } from 'zod'

const UserSchema = z.object({ id: z.string(), name: z.string() })

const api = createApiClient({ baseUrl: '/api' })

const userQuery = defineQuery({
    scope: 'users',
    load: ({ signal }, id: string) =>
        api.get(`/users/${id}`, { schema: UserSchema, signal }),
})

const userSearchQuery = defineQuery({
    scope: ['users', 'search'],
    load: ({ signal }, keyword: string) =>
        api.get('/users', {
            schema: z.array(UserSchema),
            query: { keyword },
            signal,
        }),
})

const renameUser = defineMutation({
    run: (input: { id: string; name: string }) =>
        api.patch(`/users/${input.id}`, {
            schema: UserSchema,
            body: { name: input.name },
        }),
    invalidates: (input) => [userQuery(input.id)],
})

function UserName({ id }: { id: string }) {
    const user = useData(userQuery(id))
    const { mutate, isPending, isError } = useMutate(renameUser)
    return (
        <button
            type="button"
            disabled={isPending}
            aria-invalid={isError}
            onClick={() => {
                mutate({ id, name: '새 이름' })
            }}
        >
            {user.name}
        </button>
    )
}

function SearchResults({ keyword }: { keyword: string }) {
    const { data: users, isUpdating } = useDeferredData(
        userSearchQuery(keyword),
    )
    return (
        <ul aria-busy={isUpdating}>
            {users.map((user) => (
                <li key={user.id}>{user.name}</li>
            ))}
        </ul>
    )
}

export function UserSearch({ keyword }: { keyword: string }) {
    return (
        <DataBoundary
            pending={<p>불러오는 중</p>}
            renderError={({ retry }) => (
                <button type="button" onClick={retry}>
                    다시 시도
                </button>
            )}
            resetKeys={[keyword]}
        >
            <SearchResults keyword={keyword} />
        </DataBoundary>
    )
}

export function UserPage({ id }: { id: string }) {
    return (
        <DataProvider>
            <DataBoundary
                pending={<p>불러오는 중</p>}
                renderError={({ error, retry }) => (
                    <button type="button" onClick={retry}>
                        {isApiError(error) ? `실패 (${error.status})` : '실패'}
                    </button>
                )}
            >
                <UserName id={id} />
            </DataBoundary>
        </DataProvider>
    )
}
