import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { fakeApi } from './fake/fakeApi'
import { installFakeFetch } from './fake/installFakeFetch'
import './index.css'

// 백엔드가 없어서 /api 로 가는 fetch를 가짜 서버가 대신 받습니다.
installFakeFetch()
// 브라우저에서 가짜 서버를 조작할 수 있게 열어 둡니다 (지연, 실패 시키기).
Object.assign(window, { __fakeApi: fakeApi })

const queryClient = new QueryClient()

const container = document.getElementById('root')
if (!container) throw new Error('#root 요소가 없습니다')

createRoot(container).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </StrictMode>,
)
