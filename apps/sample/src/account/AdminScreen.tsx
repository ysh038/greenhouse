import { Link } from '@agent-greenhouse/framework/router'
import { Card, Text } from '@agent-greenhouse/framework/ui'

import { accountRoute } from '../routes'

export function AdminScreen() {
    return (
        <Card>
            <h2>관리자 화면</h2>
            <Text>관리자만 들어올 수 있습니다.</Text>
            <Link to={accountRoute.href()}>내 계정으로</Link>
        </Card>
    )
}
