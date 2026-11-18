// expect: react-hooks/exhaustive-deps
import { useEffect } from 'react'

export function Tracker({ pageId }: { pageId: string }) {
    useEffect(() => {
        document.title = pageId
    }, [])
    return null
}
