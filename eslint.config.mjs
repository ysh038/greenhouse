import path from 'node:path'

import { createBase } from './lint/base.mjs'
import { collectModuleLint, toRules } from './lint/collect.mjs'
import { PRODUCT_FILES, productZoneFragment } from './lint/zones.mjs'

const rootDir = import.meta.dirname

const productLint = await collectModuleLint(
    path.join(rootDir, 'packages/framework/src'),
    { 'product-zone': productZoneFragment },
)

export default [
    { ignores: ['**/dist/**', '**/node_modules/**', 'tools/**'] },
    ...createBase(rootDir),
    {
        files: PRODUCT_FILES,
        plugins: productLint.plugins,
        rules: toRules(productLint),
    },
]
