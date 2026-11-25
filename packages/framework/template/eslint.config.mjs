import { createEslintConfig } from '@agent-greenhouse/framework/eslint'

export default await createEslintConfig({ rootDir: import.meta.dirname })
