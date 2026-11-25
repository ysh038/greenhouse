import { useLoginReturn, useNavigate } from '@agent-greenhouse/framework/router'
import { Button, Card, Stack, Text } from '@agent-greenhouse/framework/ui'

import { useSession, type Role } from '../access'
import { accountRoute } from '../routes'

export function LoginScreen() {
    const { signIn } = useSession()
    const navigate = useNavigate()
    const { returnPath, wasSentHere } = useLoginReturn(accountRoute.href())

    const signInAs = (role: Role) => {
        signIn(role)
        navigate(returnPath, { replace: true })
    }

    return (
        <Card>
            <h2>로그인</h2>
            {wasSentHere && <Text role="status">로그인이 필요합니다</Text>}
            <Text tone="muted">
                보호된 화면의 예시입니다. 비밀번호 없이 역할만 골라 들어갑니다.
            </Text>
            <Stack direction="row" gap="sm" wrap>
                <Button
                    variant="primary"
                    onClick={() => {
                        signInAs('member')
                    }}
                >
                    구성원으로 로그인
                </Button>
                <Button
                    onClick={() => {
                        signInAs('admin')
                    }}
                >
                    관리자로 로그인
                </Button>
            </Stack>
        </Card>
    )
}
