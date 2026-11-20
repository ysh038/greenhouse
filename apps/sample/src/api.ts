import { createApiClient } from '@agent-greenhouse/framework/data'

// 요청은 실제 HTTP로 나갑니다. 개발 서버에서는 fakeServer.plugin.ts가 /api를 받아 가짜 서버로 넘기고,
// 테스트에서는 connectFakeApi가 fetch를 가짜 서버에 연결합니다.
export const api = createApiClient({ baseUrl: '/api' })
