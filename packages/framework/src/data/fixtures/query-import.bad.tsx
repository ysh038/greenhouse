// expect: no-restricted-imports
import { useQuery } from '@tanstack/react-query'

export function UserName({ id }: { id: string }) {
    const { data } = useQuery({
        queryKey: ['user', id],
        queryFn: () => Promise.resolve({ name: '이름' }),
    })
    return <p>{data?.name}</p>
}
