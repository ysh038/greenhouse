import { Link } from '@agent-greenhouse/framework/router'
import { Button, Card, Stack, Text } from '@agent-greenhouse/framework/ui'

import { useSession, type Role } from '../access'
import { adminRoute } from '../routes'

const ROLE_LABEL: Record<Role, string> = { admin: '관리자', member: '구성원' }

export function AccountScreen() {
    const { access, signOut } = useSession()
    const role = access.status === 'signedIn' ? access.role : null

    return (
        <Card>
            <h2>내 계정</h2>
            <Text>역할: {role === null ? '확인 중' : ROLE_LABEL[role]}</Text>
            <Stack direction="row" gap="md" justify="between" wrap>
                <Link to={adminRoute.href()}>관리자 화면</Link>
                <Button size="sm" onClick={signOut}>
                    로그아웃
                </Button>
            </Stack>
        </Card>
    )
}
