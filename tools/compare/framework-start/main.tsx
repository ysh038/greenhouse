import { invariant } from '@agent-greenhouse/framework/assert'
import { DataProvider } from '@agent-greenhouse/framework/data'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { fakeApi } from './fake/fakeApi'

// 브라우저에서 가짜 서버를 조작할 수 있게 열어 둡니다 (지연, 실패 시키기).
Object.assign(window, { __fakeApi: fakeApi })

const container = document.getElementById('root')
invariant(container, '#root 요소가 없습니다')

createRoot(container).render(
    <StrictMode>
        <DataProvider>
            <App />
        </DataProvider>
    </StrictMode>,
)
