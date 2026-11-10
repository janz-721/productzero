# ProductZero Agent Instructions

## 开始工作前

1. 读取 `docs/PROJECT_STATUS.md`
2. 读取 `docs/NEXT_STEPS.md`
3. 读取 `docs/DECISIONS.md`
4. 必要时再读取具体源码，不要重新探索整个仓库

## 项目背景

ProductZero 是面向学生创业团队和独立开发者的 AI 产品发现与原型生成工作台。用户是非技术产品方向学习者，需要一步一步指导。

## 开发规则

- 使用中文沟通，避免不必要术语
- 一次只推进一个可验收目标
- 修改后运行：
  - `node node_modules/typescript/bin/tsc --noEmit`
  - `node node_modules/eslint/bin/eslint.js src`
- 重要变更提交并推送到 GitHub `main`
- Netlify 会从 `main` 自动部署
- 不要读取、打印、提交或截图 `.env.local`、`netlify.env` 或任何真实密钥
- 不要创建重复的 Vercel 账号
- 原型 HTML 必须保留在无脚本 iframe sandbox 中

## 当前关键约束

- Netlify 同步函数约 30 秒超时
- 视觉原型采用单次免费视觉调用
- `glm-4v-flash` 最多输出 1024 tokens
- 免费模型可能返回 429，要有备用模型和友好错误提示

## 每个开发阶段结束时

1. 更新 `docs/PROJECT_STATUS.md`
2. 更新 `docs/NEXT_STEPS.md`
3. 提交并推送
4. 明确告诉用户可以新开一个对话
5. 给出 `docs/NEW_THREAD_PROMPT.md` 中的开场提示
