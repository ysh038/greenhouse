import { invariant } from '@agent-greenhouse/framework/assert'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'

const container = document.getElementById('root')
invariant(container, '#root 요소가 없습니다')

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
