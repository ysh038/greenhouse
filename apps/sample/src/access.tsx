import { defineAccess, type Access } from '@agent-greenhouse/framework/router'
import { invariant } from '@agent-greenhouse/framework/assert'
import { createContext, use, useState, type ReactNode } from 'react'

import { accountRoute, loginRoute } from './routes'

export type Role = 'admin' | 'member'

const { AccessProvider, ProtectedRoute } = defineAccess<Role>()

export { ProtectedRoute }

type Session = {
    access: Access<Role>
    signIn: (role: Role) => void
    signOut: () => void
}

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
    const [access, setAccess] = useState<Access<Role>>({ status: 'signedOut' })
    const session: Session = {
        access,
        signIn: (role) => {
            setAccess({ status: 'signedIn', role })
        },
        signOut: () => {
            setAccess({ status: 'signedOut' })
        },
    }

    return (
        <SessionContext value={session}>
            <AccessProvider
                access={access}
                loginPath={loginRoute.href()}
                deniedPath={accountRoute.href()}
            >
                {children}
            </AccessProvider>
        </SessionContext>
    )
}

export function useSession(): Session {
    const session = use(SessionContext)
    invariant(session, 'useSession은 SessionProvider 안에서만 쓸 수 있습니다')
    return session
}
