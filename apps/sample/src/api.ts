import { createApiClient } from '@agent-greenhouse/framework/data'

import { fakeApi } from './fake/fakeApi'

export const api = createApiClient({ baseUrl: '/api', fetch: fakeApi.fetch })
