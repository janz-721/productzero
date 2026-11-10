import { NextResponse } from "next/server";
import { normalizeEvidenceStatus, normalizeRiskLevel, toneForRisk } from "@/lib/brief-language";
import { INTERPRETATION_VERSION } from "@/lib/clarify";
import { generateJson } from "@/lib/ai";
import { extractEvidenceAnchor, groundEvidence, insufficientEvidence, isEvidenceGrounded, normalizeValidationQuestions, questionReferencesAnswer } from "@/lib/evidence";
import { INTERVIEW_TOTAL_STEPS } from "@/lib/interview";
import type { Assumption, Decision, EvidenceReference, InterviewAnswer, ProductBrief, ValidationQuestion } from "@/lib/types";

const UNSUPPORTED_TEMPLATE_PHRASES = /(不会写\s*PRD|不会画原型|不知道怎么写需求|缺乏产品经验)/i;
type ResponseShape = Partial<ProductBrief> & {
  problemEvidence?: unknown;
  targetUserEvidence?: unknown;
  valueFocusEvidence?: unknown;
  riskEvidence?: unknown;
  assumptions?: Array<Partial<Assumption> & { evidence?: unknown }>;
  decisions?: Array<Partial<Decision> & { evidence?: unknown }>;
};

function text(value: unknown, fallback: string, max = 600) {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, max);
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return String(record.name || record.title || record.user || record.label || "");
        }
        return "";
      })
      .filter(Boolean)
      .join("；");
    if (joined) return joined.slice(0, max);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return text(record.name || record.title || record.user || record.label, fallback, max);
  }
  return fallback;
}


function normalizeAnswers(value: unknown): InterviewAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, INTERVIEW_TOTAL_STEPS).map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      question: String(record.question || "").trim().slice(0, 220),
      answer: String(record.answer || "").trim().slice(0, 1200),
      interpretation: String(record.interpretation || "").trim().slice(0, 320),
      interpretationConfirmed: Boolean(record.interpretationConfirmed),
      interpretationVersion: Number(record.interpretationVersion) || undefined,
    };
  }).filter((item) => item.question && item.answer);
}

function hasUnsupportedTemplate(value: string, sourceText: string) {
  return UNSUPPORTED_TEMPLATE_PHRASES.test(value) && !UNSUPPORTED_TEMPLATE_PHRASES.test(sourceText);
}
function evidenceBackedConclusion(value: string, evidence: EvidenceReference) {
  return isEvidenceGrounded(evidence) ? value : "当前证据不足，暂不形成结论。";
}

function fallbackQuestion(assumption: Assumption): ValidationQuestion {
  return {
    question: isEvidenceGrounded(assumption.evidence)
      ? `你提到“${assumption.evidence.excerpt}”，下次看到什么结果，才知道这个假设可能成立？`
      : `关于“${assumption.title}”，最近一次真实经历里能补充哪个具体动作、结果或数字？`,
    assumptionTitle: assumption.title,
    gap: isEvidenceGrounded(assumption.evidence) ? "已有访谈线索，但还没有在真实行动中确认" : "目前还没有可追溯到访谈原话的证据",
    successSignal: "能看到一个来自真实场景、可以记录的行为或结果",
    evidence: assumption.evidence,
    dimension: "other",
  };
}

export async function POST(request: Request) {
  try {
    const { idea, answers } = (await request.json()) as { idea?: string; answers?: unknown };
    const cleanIdea = idea?.trim();
    const cleanAnswers = normalizeAnswers(answers);
    const sourceText = [cleanIdea, ...cleanAnswers.map((item) => item.answer)].join("\n");

    if (!cleanIdea || cleanIdea.length < 8 || cleanAnswers.length < INTERVIEW_TOTAL_STEPS || !cleanAnswers.every((item) => item.interpretationConfirmed && item.interpretation?.trim() && item.interpretationVersion === INTERPRETATION_VERSION)) {
      return NextResponse.json({ error: "请先完成并确认 8 轮访谈，再生成 Product Brief" }, { status: 400 });
    }

    const answerText = cleanAnswers
      .map((item, index) => `[第 ${index + 1} 轮]\n问题：${item.question}\n用户原话：${item.answer}\n整理后的意思：${item.interpretation || "未整理"}`)
      .join("\n\n");

    const result = await generateJson<ResponseShape>([
      {
        role: "system",
        content:
          "你是 ProductZero 的产品发现编辑。你要从真实经历中识别谁遇到问题、当时在做什么、哪一步最麻烦、现在怎么凑合解决、后来怎样、花了多久。你要用普通用户能看懂的中文写 Product Brief，同时保留必要的专业词和判断边界。用户原话是最终证据，整理后的意思只能帮助理解，不能替代原话。凡是回答没有覆盖的判断，必须明确写证据不足。只输出 JSON。",
      },
      {
        role: "user",
        content: `产品想法：\n<idea>${cleanIdea}</idea>\n\n${cleanAnswers.length} 轮访谈记录：\n<interview>${answerText}</interview>\n\n请生成中文 Product Brief。你的目标不是把访谈改写成一份更长的 PRD，而是让普通用户清楚看到：已经知道什么、还不知道什么、下一轮该问什么。能用日常中文说清楚的地方，不要堆专业术语。

最重要的规则：
1. 每条 evidence 必须引用用户原话：round 为 0（产品想法）或 1–8（访谈轮次），quote 必须从对应“用户原话”中原样复制 4–40 个字的片段；不能引用“整理后的意思”。
2. 找不到原话依据时，evidence 必须写成 {"round":null,"quote":"证据不足"}；禁止用常识补全。
3. problemStatement、targetUser、valueFocus、risk 都要尽量用日常中文，并优先写清谁、什么时候、当时在做什么、哪一步最麻烦、现在怎么凑合解决、后来怎样、花了多久。
4. assumptions 恰好 4 条，必须是四个不同层面的可验证假设（目前还不能确认、需要验证的判断）：问题有多严重或多常发生、现在怎么凑合解决以及为什么不够用、你的方案可能带来什么价值、用户是否愿意采用或有什么风险。禁止把“会用 PPT / 会用 Figma / 会找外包”这类工具使用行为直接当假设，也禁止四条假设只是同义改写。
5. decisions 恰好 2 条，必须是基于现有证据的取舍；理由里不要重复空话。
6. validationQuestions 生成 4–6 条，只针对尚未验证的关键假设和目前还不知道什么。每个问题必须开放式，不能用“你是否 / 会不会 / 愿不愿意 / 继续使用吗”这类只能回答是或否的问法。
7. validationQuestions 要优先补当前回答里尚未确认的替代方案、具体卡点、最终结果、耗时或频率；已经明确回答的维度不要重复问，而要继续追问更深一层。
8. 每条 validationQuestion 用 assumptionIndex 指向 assumptions 的 0–3 序号，并引用对应原文。问题要沿用访谈里的具体对象和场景，不能退回“用户最大痛点是什么”这类泛问。
9. nextActions 写 3 条一周内可完成的验证行动，不开发完整 MVP（第一版先做什么）。
10. evidenceStatus 只能写“证据不足 / 有部分线索 / 有明确访谈证据 / 已验证”；riskLevel 只能写“高 / 中 / 低”。不要把风险等级写进 evidenceStatus，也不要输出百分比数值。

只返回：{\n  "problemStatement":"2–4句，具体且克制",\n  "problemEvidence":{"round":1,"quote":"原文片段"},\n  "targetUser":"一个具体用户群",\n  "targetUserEvidence":{"round":1,"quote":"原文片段"},\n  "valueFocus":"本轮最值得验证的价值",\n  "valueFocusEvidence":{"round":1,"quote":"原文片段"},\n  "risk":"最危险且尚未验证的一个风险",\n  "riskEvidence":{"round":1,"quote":"原文片段"},\n  "assumptions":[{"title":"一句可验证判断","detail":"为什么重要、下一步如何验证，80字内","evidenceStatus":"证据不足|有部分线索|有明确访谈证据|已验证","riskLevel":"高|中|低","evidence":{"round":2,"quote":"原文片段"}}],\n  "decisions":[{"title":"一个关键取舍","reason":"证据和理由，100字内","evidence":{"round":3,"quote":"原文片段"}}],\n  "nextActions":["3条一周内可完成的验证行动，不开发完整MVP"],\n  "validationQuestions":[{"assumptionIndex":0,"question":"只含一个问号的下一次访谈问题","gap":"仍未验证的具体缺口","successSignal":"什么答案算确认或推翻","evidence":{"round":2,"quote":"原文片段"}}]\n}`,
      },
    ], 2600);

    const assumptions: Assumption[] = Array.isArray(result.assumptions)
      ? result.assumptions.slice(0, 4).map((item, index) => {
          const rawTitle = text(item?.title, `关键假设 ${index + 1}`, 120);
          const rawDetail = text(item?.detail, "需要进一步验证。", 240);
          const unsupportedTemplate = hasUnsupportedTemplate(`${rawTitle} ${rawDetail}`, sourceText);
          const title = unsupportedTemplate ? "当前证据不足，暂不形成这条假设" : rawTitle;
          const detail = unsupportedTemplate ? "访谈中尚未出现支持这条判断的具体内容。" : rawDetail;
          const evidence = unsupportedTemplate
            ? insufficientEvidence()
            : groundEvidence(item?.evidence, cleanIdea, cleanAnswers, `${title} ${detail}`);
          const evidenceStatus = normalizeEvidenceStatus(item?.evidenceStatus, evidence);
          const riskLevel = normalizeRiskLevel(item?.riskLevel, item?.tone);
          return {
            title,
            detail,
            evidenceStatus,
            riskLevel,
            tone: toneForRisk(riskLevel),
            evidence,
          };
        })
      : [];

    const decisions: Decision[] = Array.isArray(result.decisions)
      ? result.decisions.slice(0, 2).map((item, index) => {
          const rawTitle = text(item?.title, `关键决策 ${index + 1}`, 120);
          const rawReason = text(item?.reason, "需要补充决策依据。", 240);
          const unsupportedTemplate = hasUnsupportedTemplate(`${rawTitle} ${rawReason}`, sourceText);
          const title = unsupportedTemplate ? "当前证据不足，暂不形成决策" : rawTitle;
          const reason = unsupportedTemplate ? "现有回答没有支持这条决策的内容。" : rawReason;
          return {
            title,
            reason,
            evidence: unsupportedTemplate
              ? insufficientEvidence()
              : groundEvidence(item?.evidence, cleanIdea, cleanAnswers, `${title} ${reason}`),
          };
        })
      : [];

    if (assumptions.length !== 4 || decisions.length !== 2) {
      throw new Error("AI 返回的 Brief 结构不完整");
    }

    const problemCandidate = text(result.problemStatement, "当前证据不足，暂不形成问题判断。", 800);
    const targetUserCandidate = text(result.targetUser, "当前证据不足", 180);
    const valueFocusCandidate = text(result.valueFocus, "当前证据不足", 180);
    const riskCandidate = text(result.risk, "当前证据不足", 180);
    let rawProblem = hasUnsupportedTemplate(problemCandidate, sourceText) ? "当前证据不足，暂不形成问题判断。" : problemCandidate;
    const rawTargetUser = hasUnsupportedTemplate(targetUserCandidate, sourceText) ? "当前证据不足" : targetUserCandidate;
    const rawValueFocus = hasUnsupportedTemplate(valueFocusCandidate, sourceText) ? "当前证据不足" : valueFocusCandidate;
    const rawRisk = hasUnsupportedTemplate(riskCandidate, sourceText) ? "当前证据不足" : riskCandidate;
    const sourceAnchor = extractEvidenceAnchor(sourceText, 80);
    const keyEvidence = groundEvidence({ quote: sourceAnchor }, cleanIdea, cleanAnswers);
    if (isEvidenceGrounded(keyEvidence) && !questionReferencesAnswer(rawProblem, keyEvidence.excerpt)) {
      rawProblem = `从现有访谈看，用户的具体经历是：“${keyEvidence.excerpt}”。这说明问题至少发生在这一真实场景中；其余原因仍需要下一轮证据确认。`;
    }
    const generatedProblemEvidence = groundEvidence(result.problemEvidence, cleanIdea, cleanAnswers, rawProblem);
    const problemEvidence = isEvidenceGrounded(generatedProblemEvidence) ? generatedProblemEvidence : keyEvidence;
    const targetUserEvidence = groundEvidence(result.targetUserEvidence, cleanIdea, cleanAnswers, rawTargetUser);
    const valueFocusEvidence = groundEvidence(result.valueFocusEvidence, cleanIdea, cleanAnswers, rawValueFocus);
    const riskEvidence = groundEvidence(result.riskEvidence, cleanIdea, cleanAnswers, rawRisk);

    const validationQuestions = normalizeValidationQuestions(result.validationQuestions, assumptions, cleanIdea, cleanAnswers);
    if (validationQuestions.length < 4) {
      const existingTitles = new Set(validationQuestions.map((item) => item.assumptionTitle));
      for (const assumption of assumptions) {
        if (validationQuestions.length >= 4) break;
        if (existingTitles.has(assumption.title)) continue;
        validationQuestions.push(fallbackQuestion(assumption));
      }
    }

    const evidenceGaps = [...new Set(validationQuestions.map((item) => item.gap))];
    const generatedActions = Array.isArray(result.nextActions) && result.nextActions.length
      ? result.nextActions.slice(0, 3).map((item) => text(item, "问清一个目前还不知道的事", 180))
      : [];
    const buildAction = /(开发|搭建|上线|实现).*(MVP|最小可行|小程序|App|应用|产品)|MVP/i;
    const nextActions = generatedActions.length === 3 && !generatedActions.some((item) => buildAction.test(item))
      ? generatedActions
      : [
          `先验证：${validationQuestions[0]?.assumptionTitle || assumptions[0].title}`,
          "逐条记录下一轮回答的原话、结果和时间数字",
          "用新证据保留、修改或删除当前假设，不为填满文档补写空话",
        ];

    const brief: ProductBrief = {
      problemStatement: evidenceBackedConclusion(rawProblem, problemEvidence),
      problemEvidence,
      targetUser: evidenceBackedConclusion(rawTargetUser, targetUserEvidence),
      targetUserEvidence,
      valueFocus: evidenceBackedConclusion(rawValueFocus, valueFocusEvidence),
      valueFocusEvidence,
      risk: evidenceBackedConclusion(rawRisk, riskEvidence),
      riskEvidence,
      assumptions,
      decisions,
      nextActions,
      evidenceGaps: evidenceGaps.length ? evidenceGaps : ["当前访谈还不足以验证关键假设"],
      validationQuestions,
    };

    return NextResponse.json({ brief });
  } catch (error) {
    console.error("Brief generation failed", error);
    const message = error instanceof Error ? error.message : "生成 Product Brief 时出错";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}