// expect: no-restricted-imports, no-restricted-syntax
import * as React from 'react'

export function PageTitle({ title }: { title: string }) {
    React.useLayoutEffect(() => {
        document.title = title
    }, [title])
    return null
}
