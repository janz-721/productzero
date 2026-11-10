/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, BrandMark, SparkIcon } from "@/components/brand";
import { INTERPRETATION_VERSION } from "@/lib/clarify";
import { evidenceSourceLabel, isEvidenceGrounded } from "@/lib/evidence";
import { INTERVIEW_TOTAL_STEPS } from "@/lib/interview";
import type { EvidenceReference, InterviewAnswer, ProductBrief, ValidationQuestion } from "@/lib/types";

const FALLBACK_BRIEF: ProductBrief = {
  problemStatement: "当前证据不足，暂不形成问题判断。请重新完成一轮访谈，让 Product Brief 只引用你的具体回答。",
  problemEvidence: { round: null, excerpt: "证据不足" },
  targetUser: "当前证据不足",
  targetUserEvidence: { round: null, excerpt: "证据不足" },
  valueFocus: "当前证据不足",
  valueFocusEvidence: { round: null, excerpt: "证据不足" },
  risk: "当前证据不足",
  riskEvidence: { round: null, excerpt: "证据不足" },
  assumptions: [
    { title: "这个人和这个问题值得优先解决", detail: "需要用真实经历确认问题是否反复发生、是否真的造成麻烦。", evidenceStatus: "证据不足", riskLevel: "高", tone: "red", evidence: { round: null, excerpt: "证据不足" } },
    { title: "现在的凑合办法确实不够用", detail: "需要知道对方实际试过什么，以及为什么最后还是没解决。", evidenceStatus: "证据不足", riskLevel: "高", tone: "red", evidence: { round: null, excerpt: "证据不足" } },
    { title: "新方案能明显减少时间或麻烦", detail: "需要比较新方案与现有做法在真实任务里的结果。", evidenceStatus: "证据不足", riskLevel: "中", tone: "amber", evidence: { round: null, excerpt: "证据不足" } },
    { title: "用户愿意改变现在的做法", detail: "需要观察对方是否愿意试用、切换或付出学习成本。", evidenceStatus: "证据不足", riskLevel: "中", tone: "amber", evidence: { round: null, excerpt: "证据不足" } },
  ],
  decisions: [
    { title: "先补齐证据，再形成判断", reason: "没有可追溯的原话时，不把模型常识包装成用户事实。", evidence: { round: null, excerpt: "证据不足" } },
    { title: "下一轮只问最危险的一处", reason: "集中补一个目前还不知道的事，避免继续扩写完整文档。", evidence: { round: null, excerpt: "证据不足" } },
  ],
  nextActions: ["重新完成 8 轮访谈", "记录下一轮回答的原话和数字", "只为有原话依据的判断保留结论"],
  evidenceGaps: ["当前缺少完整访谈证据"],
  validationQuestions: [
    { question: "最近一次真实遇到这个问题时，具体发生了什么？", assumptionTitle: "这个人和这个问题值得优先解决", gap: "缺少真实场景和具体行为", successSignal: "能说出可核实的时间、动作和结果", evidence: { round: null, excerpt: "证据不足" }, dimension: "other" },
  ],
};

function EvidenceNote({ evidence, larger = false }: { evidence: EvidenceReference; larger?: boolean }) {
  const grounded = isEvidenceGrounded(evidence);
  if (!grounded) {
    return (
      <div className={`flex flex-wrap items-center gap-2 text-[#8a6b26] ${larger ? "text-[14px]" : "text-[13px]"}`}>
        <span className="rounded-[2px] border border-[#c9ae72]/35 bg-[#f6ecd3] px-2 py-1 text-[12px] font-bold">当前证据不足</span>
        <span>不据此形成结论</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 text-[#625d53] ${larger ? "text-[15px] leading-7" : "text-[13px] leading-6"}`}>
      <p><span className="font-bold text-[#554f46]">来源轮次：</span>{evidenceSourceLabel(evidence.round)}</p>
      <p><span className="font-bold text-[#554f46]">用户原话：</span>“{evidence.excerpt}”</p>
      <p><span className="font-bold text-[#554f46]">整理后的意思：</span>{evidence.interpretation || "尚未整理"}</p>
    </div>
  );
}

function toneClasses(tone: string) {
  if (tone === "green") return "border-[#9eb09a]/45 bg-[#e8f0e5] text-[#4e684b]";
  if (tone === "red") return "border-[#d9a08f]/40 bg-[#f9e3dc] text-[#984632]";
  return "border-[#d8c28c]/40 bg-[#f4ecd3] text-[#806426]";
}

function suggestedProbes(item: ValidationQuestion) {
  if (item.dimension === "alternative") {
    return ["这些替代办法里，哪一种最接近你真正想要的演示效果？", "你当时为什么没有继续使用其中一种办法？"];
  }
  if (item.dimension === "blocker") {
    return ["当时最先尝试的操作是什么？", "哪一个错误或限制让你确定这条路走不通？"];
  }
  if (item.dimension === "result") {
    return ["最终你用了什么方式完成演示？", "这个结果对面试、汇报或验证想法造成了什么影响？"];
  }
  if (item.dimension === "time") {
    return ["这些时间主要花在哪几个步骤？", "哪一步最希望被工具直接省掉？"];
  }
  return ["最近一次验证这条判断是在什么具体场景？", "出现什么结果会让你改变现在的做法？"];
}

function markdownEvidenceBlock(evidence: EvidenceReference) {
  if (!isEvidenceGrounded(evidence)) return "> **当前证据不足，不据此形成结论。**";
  return [
    `> **来源轮次**：${evidenceSourceLabel(evidence.round)}`,
    `> **用户原话**：“${evidence.excerpt}”`,
    `> **整理后的意思**：${evidence.interpretation || "尚未整理"}`,
  ].join("\n>\n");
}

function markdownEvidenceInline(evidence: EvidenceReference) {
  if (!isEvidenceGrounded(evidence)) return "当前证据不足";
  return `${evidenceSourceLabel(evidence.round)} · “${evidence.excerpt}” · 整理：${evidence.interpretation || "尚未整理"}`;
}

function markdownSafe(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

function todayLabel() {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date());
}

function failureBanner(failed: boolean) {
  return failed ? "> **本次生成失败，以下为演示内容，不可作为正式 Brief。**\n\n" : "";
}

function buildBriefMarkdown(idea: string, brief: ProductBrief, answers: InterviewAnswer[], generatedAt: string, failed: boolean) {
  const assumptionDetails = brief.assumptions.map((item, index) => `### A${index + 1}. ${item.title}

- **证据状态**：${item.evidenceStatus}
- **风险等级**：${item.riskLevel}

${item.detail}

${markdownEvidenceBlock(item.evidence)}`).join("\n\n");

  const decisionDetails = brief.decisions.map((item, index) => `### D${index + 1}. ${item.title}

${item.reason}

${markdownEvidenceBlock(item.evidence)}`).join("\n\n");

  const validationDetails = brief.validationQuestions.map((item, index) => `### Q${index + 1}. ${item.question}

- **要验证的假设**：${item.assumptionTitle}
- **目前还不知道什么**：${item.gap}
- **看到什么算有进展**：${item.successSignal}
- **依据**：${markdownEvidenceInline(item.evidence)}

**建议追问**

${suggestedProbes(item).map((probe) => `- ${probe}`).join("\n")}`).join("\n\n---\n\n");

  const transcript = answers.map((item, index) => `### 第 ${index + 1} 轮

**问题**：${item.question}

**你的原话**：${item.answer}

**整理后的意思（已确认）**：${item.interpretation || "尚未整理"}`).join("\n\n");

  return `${failureBanner(failed)}# ProductZero Product Brief（证据整理稿）

> 这是一份用来判断下一步做什么的证据整理稿，不是 PRD（准备开发时使用的详细需求文档）。

**生成日期**：${generatedAt}
**访谈轮次**：${answers.length} 轮
**产品想法**：${idea}

---

## 先看关键结论

### 要解决的问题

${brief.problemStatement}

${markdownEvidenceBlock(brief.problemEvidence)}

### 谁最需要它

${brief.targetUser}

${markdownEvidenceBlock(brief.targetUserEvidence)}

### 这次先关注什么

${brief.valueFocus}

${markdownEvidenceBlock(brief.valueFocusEvidence)}

### 主要风险

${brief.risk}

${markdownEvidenceBlock(brief.riskEvidence)}

---

## 关键判断与依据

以下关键假设（目前还不能确认、需要验证的判断）都单独标出证据状态与风险等级，不把两件事混在一起。

${assumptionDetails}

---

## 决策（下一步做什么）与下一步行动

${decisionDetails}

### 下一步行动

${brief.nextActions.map((item) => `- [ ] ${item}`).join("\n")}

---

## 目前还不知道什么

${brief.evidenceGaps.map((item, index) => `${index + 1}. ${item}`).join("\n")}

---

## 下一轮还要问什么

${validationDetails}

---

## 附录：原始访谈与确认理解

${transcript}

---

> 说明：本报告只把用户原话当作最终证据。整理后的意思用于帮助理解，不能替代原话。没有原话依据的部分明确标记为“当前证据不足”。
`;
}

function buildValidationMarkdown(idea: string, brief: ProductBrief, generatedAt: string, failed: boolean) {
  const map = brief.validationQuestions.map((item, index) => (
    `| Q${index + 1} | ${markdownSafe(item.question)} | ${markdownSafe(item.assumptionTitle)} | ${markdownSafe(item.gap)} |`
  )).join("\n");
  const questions = brief.validationQuestions.map((item, index) => `## Q${index + 1}. 主问题

> ${item.question}

### 要验证的假设（目前还不能确认的判断）

${item.assumptionTitle}

### 目前还不知道什么

${item.gap}

### 看到什么算有进展

${item.successSignal}

### 依据

${markdownEvidenceBlock(item.evidence)}

### 建议追问

${suggestedProbes(item).map((probe) => `- ${probe}`).join("\n")}

### 访谈记录

- 受访者：
- 访谈日期：
- 受访者原话：
- 具体结果 / 数字：
- 这条回答如何影响关键假设：
`).join("\n---\n\n");

  return `${failureBanner(failed)}# ProductZero 下一轮验证问题

> 不重新问一遍已知事实，只围绕还没确认的关键假设（目前还不能确认、需要验证的判断）和目前还不知道什么继续追问。

**生成日期**：${generatedAt}
**产品想法**：${idea}

## 访谈规则

1. 一次只问一个问题。
2. 先追问最近一次真实发生的行为，再问结果和数字。
3. 不诱导用户回答“是”或“否”，让用户用自己的话描述。
4. 记录原话、具体对象、动作、结果和时间。
5. 回答不能支持假设时，保留“当前证据不足”，不要替用户补全。

## 验证地图

| 问题 | 主问题 | 要验证的假设 | 目前还不知道什么 |
| --- | --- | --- | --- |
${map}

---

${questions}

---

## 访谈结束检查

- [ ] 每个问题只出现一个问号
- [ ] 每条关键回答包含具体对象、动作或场景
- [ ] 至少记录一个结果、时间或数字
- [ ] 已标记回答支持、推翻或仍不足以判断哪条假设
`;
}
export default function ResultPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [brief, setBrief] = useState<ProductBrief>(FALLBACK_BRIEF);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [copiedQuestion, setCopiedQuestion] = useState<number | null>(null);

  useEffect(() => {
    const savedIdea = localStorage.getItem("productzero:idea") ?? "一个还没有被完整定义的产品想法";
    setIdea(savedIdea);

    let savedAnswers: InterviewAnswer[] = [];
    const saved = localStorage.getItem("productzero:answers");
    if (saved) {
      try {
        savedAnswers = JSON.parse(saved) as InterviewAnswer[];
        setAnswers(savedAnswers);
      } catch {
        setAnswers([]);
      }
    }

    if (savedAnswers.length > 0 && savedAnswers.length < INTERVIEW_TOTAL_STEPS) {
      localStorage.setItem("productzero:partial-answers", JSON.stringify({ answers: savedAnswers }));
      router.replace("/interview");
      return;
    }

    if (savedAnswers.length < INTERVIEW_TOTAL_STEPS) {
      setLoading(false);
      setError("缺少完整访谈回答，当前显示演示内容");
      return;
    }

    if (!savedAnswers.every((item) => item.interpretationConfirmed && item.interpretation?.trim() && item.interpretationVersion === INTERPRETATION_VERSION)) {
      router.replace("/confirm");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    setBrief(FALLBACK_BRIEF);

    fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: savedIdea, answers: savedAnswers }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as { brief?: ProductBrief; error?: string };
        if (!response.ok || !data.brief) throw new Error(data.error || "生成 Product Brief 时出错");
        setBrief(data.brief);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "AI 暂时不可用");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [retry, router]);

  const generatedAt = useMemo(() => todayLabel(), []);
  const generationFailed = Boolean(error);
  const markdown = useMemo(() => buildBriefMarkdown(idea, brief, answers, generatedAt, generationFailed), [answers, brief, generatedAt, generationFailed, idea]);
  const groundedAssumptions = brief.assumptions.filter((item) => isEvidenceGrounded(item.evidence)).length;

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadValidationQuestions() {
    download("productzero-next-validation.md", buildValidationMarkdown(idea, brief, generatedAt, generationFailed));
  }

  async function copyQuestion(question: string, index: number) {
    try {
      await navigator.clipboard.writeText(question);
      setCopiedQuestion(index);
      window.setTimeout(() => setCopiedQuestion((current) => current === index ? null : current), 1800);
    } catch {
      setCopiedQuestion(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <header className="border-b border-black/[0.06] bg-[#f7f5ef]">
          <div className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-5 lg:px-8">
            <BrandMark />
            <span className="text-[13px] font-semibold text-[#625d53]">正在整理关键判断</span>
          </div>
        </header>
        <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1120px] place-items-center px-5 py-16">
          <div className="max-w-[620px] text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff3ee]">
              <SparkIcon className="size-7 animate-pulse text-[#ef5b37]" />
            </span>
            <h1 className="mt-7 font-display text-4xl font-black tracking-[-0.04em] text-[#24231f] sm:text-5xl">正在生成 Product Brief</h1>
            <p className="mt-5 text-[16px] leading-8 text-[#6c665c]">系统正在核对原文、整理假设，并把尚未验证的内容放到下一轮验证问题里。通常需要 10–30 秒。</p>
            <div className="mx-auto mt-8 h-1 w-56 overflow-hidden rounded-full bg-black/[0.07]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#ef5b37]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-[#f3efe5]/95">
        <div className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between gap-5 px-5 lg:px-8">
          <BrandMark />
          <nav aria-label="报告导航" className="hidden items-center gap-8 text-[13px] font-semibold text-[#625e54] lg:flex">
            <a className="transition-colors hover:text-[#171714]" href="#conclusion">结论</a>
            <a className="transition-colors hover:text-[#171714]" href="#evidence">关键判断</a>
            <a className="transition-colors hover:text-[#171714]" href="#validation">验证问题</a>
            <a className="transition-colors hover:text-[#171714]" href="#transcript">原始访谈</a>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => download("productzero-brief.md", markdown)} className="inline-flex h-11 items-center justify-center rounded-[2px] border border-black/[0.12] bg-white/55 px-4 text-[13px] font-bold text-[#3f3b35] transition-colors hover:bg-white">
              导出 Product Brief
            </button>
            <Link href="/prototype" className="hidden h-11 items-center justify-center gap-2 rounded-[2px] bg-[#171714] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#ef5b37] sm:inline-flex">
              原型工作台 <ArrowIcon />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-5 lg:px-8">
        {error && (
          <div className="mt-6 flex flex-col justify-between gap-4 border border-[#d8b56b]/35 bg-[#fff7e4] px-5 py-4 text-[14px] leading-6 text-[#806426] sm:flex-row sm:items-center">
            <span><strong>本次生成失败，以下为演示内容，不可作为正式 Brief。</strong> {error}。请检查 AI 配置后重试。</span>
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="h-10 shrink-0 rounded-[2px] border border-[#9b782f]/25 bg-white/60 px-4 font-bold">
              重新生成
            </button>
          </div>
        )}

        <section className="pb-12 pt-16 sm:pt-20 lg:pb-16 lg:pt-24" aria-labelledby="report-title">
          <div className="max-w-[930px]">
            <h1 id="report-title" className="font-display text-[clamp(3.25rem,8vw,6rem)] font-black leading-[0.98] tracking-[-0.045em] text-[#171714]">
              产品发现整理稿
            </h1>
            <p className="mt-5 text-[15px] font-bold tracking-[0.02em] text-[#a93420]">Product Brief · 第 1 版</p>
            <p className="mt-8 max-w-[850px] text-[clamp(1.15rem,2.2vw,1.45rem)] leading-[1.65] text-[#4d493f]">{idea}</p>
            <p className="mt-5 max-w-[780px] text-[16px] leading-8 text-[#625d53]">这是 Product Brief（用来判断下一步做什么的证据整理稿），不是 PRD（准备开发时使用的详细需求文档）。它只整理访谈中已经出现的具体事实，并明确标出哪些判断还没有确认。</p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <button type="button" onClick={() => download("productzero-brief.md", markdown)} className="inline-flex h-12 items-center justify-center gap-2 rounded-[2px] bg-[#171714] px-6 text-[14px] font-bold text-white transition-colors hover:bg-[#ef5b37]">
              导出完整 Product Brief <ArrowIcon />
            </button>
            <button type="button" onClick={downloadValidationQuestions} className="inline-flex h-12 items-center justify-center gap-2 rounded-[2px] border border-black/[0.14] bg-white/55 px-6 text-[14px] font-bold text-[#3f3b35] transition-colors hover:bg-white">
              导出验证问题 <ArrowIcon />
            </button>
            <Link href="/prototype" className="inline-flex h-12 items-center justify-center gap-2 rounded-[2px] px-3 text-[14px] font-bold text-[#a93420] transition-colors hover:text-[#171714] sm:hidden">
              进入原型工作台 <ArrowIcon />
            </Link>
          </div>

          <div className="mt-12 grid gap-8 border-y border-black/[0.09] py-7 sm:grid-cols-3">
            <div>
              <p className="text-[13px] font-bold text-[#6f695f]">访谈记录</p>
              <p className="mt-2 text-[18px] font-bold text-[#2d2b27]">{answers.length || INTERVIEW_TOTAL_STEPS} 轮原始回答</p>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#6f695f]">原话依据</p>
              <p className="mt-2 text-[18px] font-bold text-[#2d2b27]">{groundedAssumptions} / {brief.assumptions.length} 条假设有原文来源</p>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#6f695f]">还要确认</p>
              <p className="mt-2 text-[18px] font-bold text-[#2d2b27]">{brief.validationQuestions.length} 个验证问题待完成</p>
            </div>
          </div>
        </section>

        <section id="conclusion" className="scroll-mt-28 border-t border-black/[0.09] pt-12 lg:pt-16" aria-labelledby="conclusion-title">
          <div className="max-w-[760px]">
            <h2 id="conclusion-title" className="font-display text-4xl font-black tracking-[-0.04em] text-[#171714] sm:text-5xl">先看关键判断</h2>
            <p className="mt-4 text-[16px] leading-8 text-[#6f695f]">每条重要判断都同时给出用户原话和整理后的意思。找不到原话时，直接显示“当前证据不足”。</p>
          </div>

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <article>
              <h3 className="text-[14px] font-bold text-[#6f695f]">要解决的问题</h3>
              <p className="mt-4 text-[19px] leading-9 text-[#302e29]">{brief.problemStatement}</p>
              <div className="mt-5 border-t border-black/[0.08] pt-5">
                <EvidenceNote evidence={brief.problemEvidence} larger />
              </div>
            </article>

            <div className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {[
                ["谁最需要它", brief.targetUser, brief.targetUserEvidence],
                ["这次先关注什么", brief.valueFocus, brief.valueFocusEvidence],
                ["主要风险", brief.risk, brief.riskEvidence],
              ].map(([label, value, evidence]) => (
                <article key={String(label)} className="py-6 first:pt-0 last:pb-0">
                  <h3 className="text-[14px] font-bold text-[#6f695f]">{String(label)}</h3>
                  <p className="mt-3 text-[17px] font-semibold leading-8 text-[#38362f]">{String(value)}</p>
                  <div className="mt-3">
                    <EvidenceNote evidence={evidence as EvidenceReference} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="evidence" className="scroll-mt-28 border-t border-black/[0.09] pt-12 lg:pt-16" aria-labelledby="evidence-title">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-[760px]">
              <h2 id="evidence-title" className="font-display text-4xl font-black tracking-[-0.04em] text-[#171714] sm:text-5xl">关键判断与依据</h2>
              <p className="mt-4 text-[16px] leading-8 text-[#6f695f]">关键假设（目前还不能确认、需要验证的判断）不是已经成立的事实。每条都分开标出证据状态与风险等级。</p>
            </div>
            <p className="text-[14px] font-semibold text-[#6f695f]">{groundedAssumptions} 条有原话依据 · {brief.assumptions.length - groundedAssumptions} 条证据不足</p>
          </div>

          <div className="mt-10 border-t border-black/[0.09]">
            {brief.assumptions.map((item, index) => (
              <article key={`${item.title}-${index}`} className="grid gap-6 border-b border-black/[0.09] py-8 lg:grid-cols-[64px_minmax(0,1fr)_270px] lg:gap-8">
                <span className="font-display text-3xl font-bold text-[#b2aa9d]">A{index + 1}</span>
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="max-w-[660px] text-[22px] font-bold leading-8 tracking-[-0.02em] text-[#2e2c27]">{item.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-[2px] border border-black/[0.1] bg-white/55 px-2.5 py-1 text-[12px] font-bold text-[#5e584e]">证据状态：{item.evidenceStatus}</span>
                      <span className={`rounded-[2px] border px-2.5 py-1 text-[12px] font-bold ${toneClasses(item.tone)}`}>风险：{item.riskLevel}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[16px] leading-8 text-[#625d53]">{item.detail}</p>
                </div>
                <div className="border-t border-black/[0.08] pt-4 lg:border-t-0 lg:pt-1">
                  <p className="text-[13px] font-bold text-[#6f695f]">判断依据</p>
                  <div className="mt-3">
                    <EvidenceNote evidence={item.evidence} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-black/[0.09] pt-12 lg:pt-16" aria-labelledby="decisions-title">
          <div className="max-w-[760px]">
            <h2 id="decisions-title" className="font-display text-4xl font-black tracking-[-0.04em] text-[#171714] sm:text-5xl">决策与下一步行动</h2>
            <p className="mt-4 text-[16px] leading-8 text-[#6f695f]">决策（下一步做什么）只基于已有原话。先做能补上关键证据的动作，不用继续堆功能或扩写文档。</p>
          </div>

          <div className="mt-10 grid gap-12 border-t border-black/[0.09] pt-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="text-[14px] font-bold text-[#6f695f]">产品决策</h3>
              <div className="mt-5 divide-y divide-black/[0.08]">
                {brief.decisions.map((item, index) => (
                  <article key={`${item.title}-${index}`} className="py-6 first:pt-0">
                    <div className="flex gap-4">
                      <span className="font-display text-2xl font-bold text-[#b2aa9d]">D{index + 1}</span>
                      <div>
                        <h4 className="text-[18px] font-bold leading-7 text-[#37342d]">{item.title}</h4>
                        <p className="mt-2 text-[15px] leading-7 text-[#696359]">{item.reason}</p>
                        <div className="mt-3"><EvidenceNote evidence={item.evidence} /></div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-[#6f695f]">下一步行动</h3>
              <ol className="mt-5 divide-y divide-black/[0.08] border-y border-black/[0.08]">
                {brief.nextActions.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-4 py-6 text-[16px] leading-7 text-[#4f4a40]">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-black/[0.1] text-[12px] font-bold text-[#6f695f]">{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 bg-[#ebe4d8] p-5">
                <p className="text-[13px] font-bold text-[#8a6b26]">现在最需要问清的事</p>
                <p className="mt-2 text-[15px] leading-7 text-[#5d574d]">{brief.evidenceGaps[0]}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="validation" className="scroll-mt-28 border-t border-black/[0.09] pt-12 lg:pt-16" aria-labelledby="validation-title">
          <div className="max-w-[800px]">
            <h2 id="validation-title" className="font-display text-4xl font-black tracking-[-0.04em] text-[#171714] sm:text-5xl">下一轮验证问题</h2>
            <p className="mt-4 text-[16px] leading-8 text-[#6f695f]">这些问题只围绕还没确认的关键假设和目前还不知道什么。展开后可查看看到什么算有进展、建议追问和原话依据。</p>
          </div>

          <div className="mt-10 border-t border-black/[0.09]">
            {brief.validationQuestions.map((item, index) => (
              <details key={`${item.question}-${index}`} open={index === 0} className="group border-b border-black/[0.09]">
                <summary className="flex cursor-pointer list-none items-start gap-5 py-7">
                  <span className="w-10 shrink-0 pt-1 font-display text-2xl font-bold text-[#b2aa9d]">Q{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-6 text-[#a7523e]">要验证的假设：{item.assumptionTitle}</p>
                    <h3 className="mt-2 text-[20px] font-bold leading-8 tracking-[-0.015em] text-[#302e29] sm:text-[22px]">{item.question}</h3>
                  </div>
                  <span className="shrink-0 pt-1 text-[13px] font-bold text-[#6f695f] group-open:hidden">展开</span>
                  <span className="hidden shrink-0 pt-1 text-[13px] font-bold text-[#6f695f] group-open:inline">收起</span>
                </summary>

                <div className="grid gap-8 pb-8 lg:grid-cols-2 lg:pl-[60px]">
                  <div className="space-y-6 border-t border-black/[0.08] pt-6">
                    <div>
                      <p className="text-[13px] font-bold text-[#6f695f]">目前还不知道什么</p>
                      <p className="mt-2 text-[15px] leading-7 text-[#5e584e]">{item.gap}</p>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#6f695f]">看到什么算有进展</p>
                      <p className="mt-2 text-[15px] leading-7 text-[#5e584e]">{item.successSignal}</p>
                    </div>
                    <EvidenceNote evidence={item.evidence} />
                  </div>

                  <div className="border-t border-black/[0.08] pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-bold text-[#6f695f]">建议追问</p>
                      <button type="button" onClick={() => copyQuestion(item.question, index)} className="rounded-[2px] border border-black/[0.12] bg-white/55 px-3 py-1.5 text-[12px] font-bold text-[#4f4a40] transition-colors hover:bg-white">
                        {copiedQuestion === index ? "已复制" : "复制主问题"}
                      </button>
                    </div>
                    <ol className="mt-4 space-y-3">
                      {suggestedProbes(item).map((probe, probeIndex) => (
                        <li key={probe} className="flex gap-3 text-[15px] leading-7 text-[#5e584e]">
                          <span className="font-display text-lg font-bold text-[#b2aa9d]">{probeIndex + 1}</span>
                          <span>{probe}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 overflow-hidden bg-[#171714] px-6 py-10 text-white sm:px-10 lg:mt-20 lg:px-12 lg:py-14" aria-labelledby="prototype-title">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 id="prototype-title" className="font-display text-4xl font-black tracking-[-0.04em] sm:text-5xl">从报告走到可以点击的原型</h2>
              <p className="mt-5 max-w-[520px] text-[16px] leading-8 text-white/65">上传一张参考截图，生成单屏 HTML 原型，在安全 sandbox 中预览，并查看设计分析和主动修改说明。</p>
              <Link href="/prototype" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-[2px] bg-[#ef5b37] px-6 text-[14px] font-bold text-white transition-colors hover:bg-[#ff704c]">
                进入原型工作台 <ArrowIcon />
              </Link>
            </div>

            <div className="animate-settle mx-auto w-full max-w-[480px] overflow-hidden rounded-[6px] border border-white/15 bg-[#efe9dd] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
              <div className="flex h-9 items-center gap-2 rounded-t-[3px] border-b border-black/[0.08] bg-[#f8f5ee] px-3">
                <span className="size-2 rounded-full bg-[#d8a092]" />
                <span className="size-2 rounded-full bg-[#d8c28c]" />
                <span className="size-2 rounded-full bg-[#9eb09a]" />
                <span className="ml-3 h-5 flex-1 rounded-[2px] border border-black/[0.06] bg-white/70" />
              </div>
              <div className="min-h-[290px] bg-[#fffdf8] p-5 sm:p-7">
                <div className="flex items-center justify-between border-b border-black/[0.07] pb-4">
                  <div className="h-3 w-20 rounded-full bg-[#2b2925]" />
                  <div className="flex gap-2">
                    <div className="h-2 w-10 rounded-full bg-[#c9c1b4]" />
                    <div className="h-2 w-10 rounded-full bg-[#c9c1b4]" />
                    <div className="h-7 w-16 rounded-[2px] bg-[#ef5b37]" />
                  </div>
                </div>
                <div className="mt-8 max-w-[280px]">
                  <div className="h-3 w-24 rounded-full bg-[#e2d9ca]" />
                  <div className="mt-4 h-7 w-full rounded-full bg-[#37342d]" />
                  <div className="mt-2 h-7 w-4/5 rounded-full bg-[#37342d]" />
                  <div className="mt-4 h-3 w-full rounded-full bg-[#e2d9ca]" />
                  <div className="mt-2 h-3 w-5/6 rounded-full bg-[#e2d9ca]" />
                  <div className="mt-6 flex gap-2">
                    <div className="h-9 w-24 rounded-[2px] bg-[#ef5b37]" />
                    <div className="h-9 w-20 rounded-[2px] border border-black/[0.12]" />
                  </div>
                </div>
                <div className="mt-7 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-16 rounded-[2px] border border-black/[0.08] bg-[#f7f2e8] p-3">
                      <div className="h-2 w-8 rounded-full bg-[#d8cdbd]" />
                      <div className="mt-3 h-2 w-full rounded-full bg-[#e7dfd2]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="transcript" className="mt-16 scroll-mt-28 border-t border-black/[0.09] pt-10" aria-labelledby="transcript-title">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-end justify-between gap-5 py-3">
              <div>
                <h2 id="transcript-title" className="font-display text-3xl font-black tracking-[-0.035em] text-[#171714] sm:text-4xl">查看原始访谈</h2>
                <p className="mt-3 text-[15px] leading-7 text-[#625d53]">完整保留 {answers.length || INTERVIEW_TOTAL_STEPS} 轮问答，方便核对每条证据。</p>
              </div>
              <span className="shrink-0 text-[13px] font-bold text-[#6f695f] group-open:hidden">展开记录</span>
              <span className="hidden shrink-0 text-[13px] font-bold text-[#6f695f] group-open:inline">收起记录</span>
            </summary>
            <div className="mt-8 space-y-8 border-t border-black/[0.08] pt-8">
              {answers.map((item, index) => (
                <article key={`${item.question}-${index}`} className="grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)]">
                  <p className="font-display text-2xl font-bold text-[#b2aa9d]">R{index + 1}</p>
                  <div>
                    <h3 className="text-[18px] font-bold leading-7 text-[#37342d]">{item.question}</h3>
                    <p className="mt-1 text-[12px] font-bold text-[#9a9489]">你的原话</p>
                    <p className="mt-2 text-[16px] leading-8 text-[#625d53]">{item.answer}</p>
                    <p className="mt-3 text-[12px] font-bold text-[#9a9489]">整理后的意思（已确认）</p>
                    <p className="mt-2 text-[15px] leading-7 text-[#706a60]">{item.interpretation || "尚未整理"}</p>
                  </div>
                </article>
              ))}
            </div>
          </details>
        </section>

        <footer className="mt-16 flex flex-col justify-between gap-5 border-t border-black/[0.09] py-8 sm:flex-row sm:items-center">
          <p className="text-[14px] leading-6 text-[#625d53]">本报告只把有原文依据的内容当作当前结论。© ProductZero</p>
          <Link href="/new" className="inline-flex items-center gap-2 text-[14px] font-bold text-[#a93420] transition-colors hover:text-[#171714]">
            开始另一个产品推演 <span aria-hidden="true">↗</span>
          </Link>
        </footer>
      </div>
    </main>
  );
}