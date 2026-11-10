# 新对话交接提示

## 推荐开场语（复制给新 AI）

```text
项目路径：
<project-root>

请先完整读取以下文件：
1. AGENTS.md
2. docs/PROJECT_STATUS.md
3. docs/NEXT_STEPS.md
4. docs/DECISIONS.md
5. README.md
6. DESIGN.md

这是 ProductZero 项目。请先给我不超过 10 行的项目现状摘要、当前风险和今天的目标计划，然后开始工作。

今天的目标：
【在这里写今天只做的一件事】

约束：
- 我是非技术用户，请一步一步告诉我操作
- 不要读取、打印或提交 .env.local、netlify.env 或任何 API Key
- 先执行 git status、git fetch 并检查差异，禁止 force push
- 修改后运行 TypeScript、ESLint 和证据回归检查
- 重要变更提交并推送到 GitHub
- 这个任务结束后，提醒我可以新开对话，并更新交接文档
```

## 使用原则

- 一个对话只完成一个目标
- 不要把几天的聊天记录重新粘贴
- 新 AI 通过项目文件恢复上下文
- 长错误只提供关键报错和发生步骤
- 截图只保留相关区域
- 每个阶段结束前更新 `PROJECT_STATUS.md` 和 `NEXT_STEPS.md`
