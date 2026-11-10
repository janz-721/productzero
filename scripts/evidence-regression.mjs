import assert from "node:assert/strict";
import {
  countQuestionMarks,
  extractEvidenceAnchor,
  groundEvidence,
  isEvidenceGrounded,
  isOpenEndedValidationQuestion,
  isSingleQuestion,
  makeGroundedFallbackQuestion,
  normalizeValidationQuestions,
  questionReferencesAnswer,
} from "../src/lib/evidence.ts";
import { alignInterpretations, INTERPRETATION_VERSION } from "../src/lib/clarify.ts";

const deploymentIdea = "最近一次我想把产品想法落地时，用 AI 工具生成页面代码并上传文件搭建原型，最后卡在 GitHub 提交和部署。我想知道有没有无需部署、别人下载后本地运行的替代方案，也想知道这类部署问题通常要花多少时间解决。";

const deploymentAnswers = [
  { question: "最近真实遇到这个问题的人是谁？", answer: deploymentIdea },
  { question: "最近一次具体发生了什么？", answer: "具体是在 GitHub 提交代码时反复失败，部署步骤也没走通，最后停在那里。", interpretation: "他在提交代码时反复失败，部署步骤也没有走通，最后停在当前步骤。" },
  { question: "最后用什么办法处理？", answer: "我试过让别人帮我看仓库设置，也在网上搜教程，但都没彻底解决。" },
  { question: "这件事花了多久？", answer: "前后大概花了 3 个小时，最后还是没有部署成功。" },
  { question: "最想先确认什么？", answer: "我想知道有没有无需部署、别人下载后本地运行的替代方案，以及这种部署问题通常要多久解决。" },
];

const baseQuestion = {
  eyebrow: "最近一次",
  question: "最近一次遇到这个问题时具体发生了什么？",
  helper: "写下具体过程。",
  suggestions: ["提交失败", "部署失败", "没有完成"],
};

assert.equal(countQuestionMarks("具体做了什么？结果如何？花了多久？"), 3);
assert.equal(isSingleQuestion("具体做了什么？结果如何？花了多久？"), false);
assert.equal(isSingleQuestion("你提到“GitHub 提交和部署”，当时最先卡住的具体步骤是什么？"), true);
assert.equal(isOpenEndedValidationQuestion("你会继续使用 Figma 吗？"), false);
assert.equal(isOpenEndedValidationQuestion("当时还试过哪些具体替代办法？"), true);

for (const step of [1, 2, 3, 4, 5, 6, 7]) {
  const answerForStep = deploymentAnswers[Math.min(step - 1, deploymentAnswers.length - 1)];
  const fallback = makeGroundedFallbackQuestion(step, baseQuestion, [answerForStep]);
  assert.equal(countQuestionMarks(fallback.question), 1, `第 ${step + 1} 轮备用问题必须只有一个问号`);
  assert.equal(questionReferencesAnswer(fallback.question, answerForStep.answer), true, `第 ${step + 1} 轮备用问题必须承接上一答`);
  assert.ok(fallback.question.length <= 60, `第 ${step + 1} 轮备用问题不能过长`);
}

const deploymentAnchor = extractEvidenceAnchor([deploymentIdea, ...deploymentAnswers.map((item) => item.answer)].join("。"));
assert.match(deploymentAnchor, /GitHub|部署|提交/, "关键证据锚点必须抓出 GitHub 提交/部署卡点");

const exactEvidence = groundEvidence({ round: 2, quote: "GitHub 提交代码时反复失败" }, deploymentIdea, deploymentAnswers);
assert.equal(exactEvidence.round, 2);
assert.equal(isEvidenceGrounded(exactEvidence), true);
assert.match(exactEvidence.excerpt, /GitHub 提交代码时反复失败/);
assert.match(exactEvidence.interpretation || "", /提交代码时反复失败/, "整理后的意思必须跟随原话证据一起返回");

const fabricatedEvidence = groundEvidence({ round: 2, quote: "用户不会写 PRD，也不会画原型" }, deploymentIdea, deploymentAnswers);
assert.equal(isEvidenceGrounded(fabricatedEvidence), false);
assert.equal(fabricatedEvidence.excerpt, "证据不足");
const clarificationAnswers = Array.from({ length: 8 }, (_, index) => ({
  question: `第 ${index + 1} 轮问题`,
  answer: `第 ${index + 1} 轮原话`,
}));
const shiftedIndexItems = clarificationAnswers.map((_, index) => ({
  index: index + 2,
  interpretation: `第 ${index + 1} 轮整理内容`,
}));
const alignedByArrayOrder = alignInterpretations(shiftedIndexItems, clarificationAnswers);
for (let index = 0; index < clarificationAnswers.length; index += 1) {
  assert.equal(alignedByArrayOrder.answers[index].answer, `第 ${index + 1} 轮原话`, `第 ${index + 1} 轮原话不能被整理过程替换`);
  assert.equal(alignedByArrayOrder.answers[index].interpretation, `第 ${index + 1} 轮整理内容`, `第 ${index + 1} 轮整理内容不能错位`);
  assert.equal(alignedByArrayOrder.answers[index].interpretationVersion, INTERPRETATION_VERSION);
}
const duplicateItems = clarificationAnswers.map((_, index) => ({
  index: index + 1,
  interpretation: index === 0 ? "第一段整理内容" : index === 1 ? "第一段整理内容" : `第 ${index + 1} 轮整理内容`,
}));
const alignedDuplicates = alignInterpretations(duplicateItems, clarificationAnswers);
assert.equal(alignedDuplicates.answers[1].interpretation, "第 2 轮原话。", "重复整理内容不能复制到下一轮");
assert.ok(alignedDuplicates.usedFallback >= 1);

const deploymentAssumptions = [
  {
    title: "无需部署、下载后本地运行的替代方案可能成立",
    detail: "需要确认具体安装方式和可运行条件。",
    evidenceStatus: "有部分线索",
    riskLevel: "中",
    tone: "amber",
    evidence: groundEvidence({ round: 5, quote: "无需部署、别人下载后本地运行的替代方案" }, deploymentIdea, deploymentAnswers),
  },
  {
    title: "GitHub 提交和部署是当前主要卡点",
    detail: "需要确认具体失败步骤和错误信息。",
    evidenceStatus: "有明确访谈证据",
    riskLevel: "高",
    tone: "red",
    evidence: groundEvidence({ round: 2, quote: "GitHub 提交代码时反复失败" }, deploymentIdea, deploymentAnswers),
  },
  {
    title: "部署失败会持续消耗数小时时间",
    detail: "需要确认耗时范围和是否反复发生。",
    evidenceStatus: "有部分线索",
    riskLevel: "中",
    tone: "amber",
    evidence: groundEvidence({ round: 4, quote: "前后大概花了 3 个小时" }, deploymentIdea, deploymentAnswers),
  },
  {
    title: "现有求助和搜索教程方式不足",
    detail: "需要确认最终结果和未解决的环节。",
    evidenceStatus: "有明确访谈证据",
    riskLevel: "高",
    tone: "red",
    evidence: groundEvidence({ round: 3, quote: "但都没彻底解决" }, deploymentIdea, deploymentAnswers),
  },
];

const genericModelQuestions = [{
  assumptionIndex: 0,
  question: "用户不会写 PRD，也不知道怎么画原型，最大的痛点是什么？",
  gap: "泛泛了解需求",
  successSignal: "用户说很难",
  evidence: { round: 1, quote: "用户不会写 PRD" },
}, {
  assumptionIndex: 3,
  question: "你会继续使用 Figma 吗？",
  gap: "确认工具使用意愿",
  successSignal: "回答会或不会",
  evidence: { round: 3, quote: "但都没彻底解决" },
}];

const deploymentQuestions = normalizeValidationQuestions(genericModelQuestions, deploymentAssumptions, deploymentIdea, deploymentAnswers);
assert.ok(deploymentQuestions.length >= 4 && deploymentQuestions.length <= 6, "验证问题数量应为 4–6 条");
assert.ok(deploymentQuestions.every((item) => isSingleQuestion(item.question)), "每条验证问题只能有一个问号");
assert.ok(deploymentQuestions.every((item) => isOpenEndedValidationQuestion(item.question)), "验证问题必须是开放式问题");
assert.ok(deploymentQuestions.every((item) => item.assumptionTitle.trim().length > 0), "每条验证问题必须说明对应假设");
assert.ok(deploymentQuestions.every((item) => !/不会写 PRD|不会画原型|继续使用\s*Figma|吗[？?]$/.test(item.question)), "模板空话和是非题必须被过滤");
for (const dimension of ["alternative", "blocker", "result", "time"]) {
  assert.ok(deploymentQuestions.some((item) => item.dimension === dimension), `缺少 ${dimension} 维度验证问题`);
}

const studentIdea = "很多非技术的产品新人、学生只有模糊点子，不会写 PRD、不会画原型，也找不到前端开发，很难快速做出可交互原型去演示和验证。希望用自然语言描述想法，就能生成可点击、可修改、可预览的前端原型。";

const studentAnswers = [
  { question: "具体角色和场景是什么？", answer: "上次我想好一个校园工具的点子，PRD 和草图都整理好了，想做一个能点开演示的网页原型拿去面试。" },
  { question: "最先做了什么？", answer: "先问了身边同学，熟悉前端的很少，大家都很忙不愿意花时间帮我写页面，网上找人又要花钱，我自己不会写代码，最后就卡在这一步。" },
  { question: "具体卡在哪里？", answer: "我找过两个会前端的朋友，一个要赶课程设计，一个在备竞赛，都抽不出好几个小时帮我从零写页面。" },
  { question: "试过哪些替代办法？", answer: "只能退一步，只用 Figma 画静态原型，没有可点击跳转的交互效果。只能截一堆图，做成 PPT，手动翻页模拟流程。" },
  { question: "最终结果是什么？", answer: "最后只能拿静态图片 PPT 去面试，没法让面试官真正点开体验，演示效果大打折扣。" },
  { question: "花了多少时间或代价？", answer: "前后花了 3 个晚上，合计 6～7 小时，还要反复整理截图和预演讲解。" },
  { question: "最关键的风险是什么？", answer: "如果自然语言生成的原型仍然很难修改，或者可交互效果不够真实，用户可能还是回到 Figma 和 PPT。" },
];

const studentAnchor = extractEvidenceAnchor(studentAnswers[1].answer);
assert.doesNotMatch(studentAnchor, /最后就卡在这一步$/, "不能把空泛卡点当成关键证据");
assert.match(studentAnchor, /前端|页面|代码|花钱|同学|Figma|PPT|原型/, "关键证据必须包含具体对象或动作");

const studentAssumptions = [
  {
    title: "非技术用户缺少自行完成可交互原型的路径",
    detail: "如果用户能找到低成本、无需开发者的可交互原型方式，核心问题成立。",
    evidenceStatus: "有明确访谈证据",
    riskLevel: "高",
    tone: "red",
    evidence: groundEvidence({ round: 2, quote: "熟悉前端的很少" }, studentIdea, studentAnswers),
  },
  {
    title: "Figma 和 PPT 静态演示不足以验证交互流程",
    detail: "如果静态方案已经能支持面试演示，产品价值会显著下降。",
    evidenceStatus: "有明确访谈证据",
    riskLevel: "高",
    tone: "red",
    evidence: groundEvidence({ round: 4, quote: "只用 Figma 画静态原型，没有可点击跳转的交互效果" }, studentIdea, studentAnswers),
  },
  {
    title: "自然语言生成能降低原型制作的时间和技能门槛",
    detail: "需要比较从想法到可点击原型的实际耗时与学习成本。",
    evidenceStatus: "有部分线索",
    riskLevel: "中",
    tone: "amber",
    evidence: groundEvidence({ round: 6, quote: "前后花了 3 个晚上，合计 6～7 小时" }, studentIdea, studentAnswers),
  },
  {
    title: "原型必须可快速修改，否则用户会回到旧工具",
    detail: "需要验证修改速度、可点击真实感和演示效果是否足够。",
    evidenceStatus: "有部分线索",
    riskLevel: "中",
    tone: "amber",
    evidence: groundEvidence({ round: 7, quote: "如果自然语言生成的原型仍然很难修改，或者可交互效果不够真实" }, studentIdea, studentAnswers),
  },
];

const studentQuestions = normalizeValidationQuestions([], studentAssumptions, studentIdea, studentAnswers);
assert.ok(studentQuestions.length >= 4 && studentQuestions.length <= 6);
assert.ok(studentQuestions.every((item) => isOpenEndedValidationQuestion(item.question)));
assert.ok(studentQuestions.every((item) => !/(你会继续使用|你是否|会不会|愿不愿意|吗[？?]$)/.test(item.question)));
for (const dimension of ["alternative", "blocker", "result", "time"]) {
  assert.ok(studentQuestions.some((item) => item.dimension === dimension), `学生案例缺少 ${dimension} 维度验证问题`);
}

console.log(`evidence regression passed: deployment=${deploymentQuestions.length}, student=${studentQuestions.length}`);
console.log("deployment:");
console.log(deploymentQuestions.map((item) => `- [${item.dimension}] ${item.question}`).join("\n"));
console.log("student:");
console.log(studentQuestions.map((item) => `- [${item.dimension}] ${item.question}`).join("\n"));