// @vitest-environment node
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'

import { noCrossFeatureImport } from './noCrossFeatureImport.mjs'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const tester = new RuleTester()
const inCart = '/repo/apps/shop/src/cart/CartPanel.tsx'

tester.run('no-cross-feature-import', noCrossFeatureImport, {
    valid: [
        { name: '같은 기능 안', filename: inCart, code: `import { total } from './cartData'` },
        {
            name: '같은 기능의 하위 폴더에서 위로',
            filename: '/repo/apps/shop/src/cart/parts/Row.tsx',
            code: `import { total } from '../cartData'`,
        },
        { name: 'shared', filename: inCart, code: `import { formatPrice } from '../shared/format'` },
        { name: 'src에 바로 놓인 파일', filename: inCart, code: `import { api } from '../api'` },
        { name: '별칭으로 shared', filename: inCart, code: `import { formatPrice } from '@/shared/format'` },
        { name: '패키지', filename: inCart, code: `import { useState } from 'react'` },
        {
            name: 'src에 바로 놓인 파일은 기능을 조합한다',
            filename: '/repo/apps/shop/src/App.tsx',
            code: `import { CartPanel } from './cart/CartPanel'; import { OrderList } from './orders/OrderList'`,
        },
        {
            name: 'shared 안에서는 서로 가져온다',
            filename: '/repo/apps/shop/src/shared/format.ts',
            code: `import { round } from './math'`,
        },
        { name: 'src 밖의 파일', filename: '/repo/scripts/build.ts', code: `import { run } from '../tools/run'` },
    ],
    invalid: [
        {
            name: '다른 기능의 파일',
            filename: inCart,
            code: `import { orderPrice } from '../orders/orderPrice'`,
            errors: [{ messageId: 'crossFeature', data: { from: 'cart', to: 'orders' } }],
        },
        {
            name: '하위 폴더에서 다른 기능으로',
            filename: '/repo/apps/shop/src/cart/parts/Row.tsx',
            code: `import { orderPrice } from '../../orders/orderPrice'`,
            errors: [{ messageId: 'crossFeature' }],
        },
        {
            name: '별칭',
            filename: inCart,
            code: `import { orderPrice } from '@/orders/orderPrice'`,
            errors: [{ messageId: 'crossFeature' }],
        },
        {
            name: '다시 내보내기와 동적 import',
            filename: inCart,
            code: `export { orderPrice } from '../orders/orderPrice'; export * from '../orders/types'; void import('../orders/OrderList')`,
            errors: [
                { messageId: 'crossFeature' },
                { messageId: 'crossFeature' },
                { messageId: 'crossFeature' },
            ],
        },
        {
            name: 'shared에서 기능으로',
            filename: '/repo/apps/shop/src/shared/format.ts',
            code: `import { orderPrice } from '../orders/orderPrice'`,
            errors: [{ messageId: 'sharedToFeature', data: { to: 'orders' } }],
        },
    ],
})
