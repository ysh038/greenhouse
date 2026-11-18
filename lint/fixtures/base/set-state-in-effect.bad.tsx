// expect: react-hooks/set-state-in-effect
import { useEffect, useState } from 'react'

export function FullName({ first, last }: { first: string; last: string }) {
    const [fullName, setFullName] = useState('')
    useEffect(() => {
        setFullName(`${first} ${last}`)
    }, [first, last])
    return <p>{fullName}</p>
}
