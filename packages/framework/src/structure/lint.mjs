import { noCrossFeatureImport } from './noCrossFeatureImport.mjs'

export default {
    plugins: {
        structure: { rules: { 'no-cross-feature-import': noCrossFeatureImport } },
    },
    rules: { 'structure/no-cross-feature-import': 'error' },
}
