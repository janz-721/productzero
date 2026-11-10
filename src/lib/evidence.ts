import type {
  Assumption,
  EvidenceDimension,
  EvidenceReference,
  InterviewAnswer,
  InterviewQuestion,
  ValidationQuestion,
} from "./types";

export const INSUFFICIENT_EVIDENCE = "证据不足";
const UNSUPPORTED_TEMPLATE_PHRASES = /(不会写\s*PRD|不会画原型|不知道怎么写需求|缺乏产品经验)/i;
const MIN_EVIDENCE_MATCH = 4;
const MAX_EVIDENCE_EXCERPT = 72;

type EvidenceSource = {
  round: number;
  text: string;
  interpretation?: string;
};

export type RawValidationQuestion = {
  assumptionIndex?: unknown;
  question?: unknown;
  gap?: unknown;
  successSignal?: unknown;
  evidence?: unknown;
};

function clip(value: string, max = MAX_EVIDENCE_EXCERPT) {
  const clean = value.replace(/\s+/g, " ").trim().replace(/[：:，,；;]+$/g, "");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function evidenceSpecificityScore(value: string) {
  const objectMatches = value.match(/(GitHub|Figma|PPT|Excel|AI|PRD|前端|页面|代码|文件|上传|提交|部署|开发|技术|原型|面试|外包|教程|仓库|本地运行)/gi)?.length || 0;
  const actionMatches = value.match(/(卡在|卡住|失败|报错|放弃|求助|找人|不会写|不会画|花了|浪费|成本|时间|小时|分钟|晚上|元|次)/gi)?.length || 0;
  const numberMatches = value.match(/\d+(?:\.\d+)?/g)?.length || 0;
  const genericPenalty = /(最后就卡在这一步|卡在这一步|这个问题|那个问题|这种情况)$/i.test(value) ? 30 : 0;
  return objectMatches * 7 + actionMatches * 4 + numberMatches * 3 + Math.min(value.length, 48) / 8 - genericPenalty;
}

function normalizeText(value: string) {
  return value
    .replace(/[“”"'‘’「」『』]/g, "")
    .replace(/[\s，。！？、；：,.!?;:（）()【】\[\]]/g, "")
    .toLowerCase();
}

export function countQuestionMarks(value: string) {
  return (value.match(/[?？]/g) || []).length;
}

export function isSingleQuestion(value: string) {
  const clean = value.trim();
  return clean.length > 0 && countQuestionMarks(clean) === 1;
}

function longestCommonSubstring(leftValue: string, rightValue: string) {
  const left = normalizeText(leftValue);
  const right = normalizeText(rightValue);
  if (!left || !right) return { text: "", length: 0 };

  let previous = new Array<number>(right.length + 1).fill(0);
  let current = new Array<number>(right.length + 1).fill(0);
  let bestLength = 0;
  let bestEnd = 0;

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      if (left[leftIndex - 1] === right[rightIndex - 1]) {
        current[rightIndex] = previous[rightIndex - 1] + 1;
        if (current[rightIndex] > bestLength) {
          bestLength = current[rightIndex];
          bestEnd = leftIndex;
        }
      } else {
        current[rightIndex] = 0;
      }
    }
    [previous, current] = [current, previous];
    current.fill(0);
  }

  return {
    text: left.slice(bestEnd - bestLength, bestEnd),
    length: bestLength,
  };
}

function extractQuotedText(value: string) {
  return [...value.matchAll(/[“"「『']([^”"」』']{2,40})[”"」』']/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

export function questionReferencesAnswer(question: string, answer: string) {
  if (!question.trim() || !answer.trim()) return false;
  const normalizedQuestion = normalizeText(question);
  const normalizedAnswer = normalizeText(answer);

  if (extractQuotedText(question).some((quote) => {
    const normalizedQuote = normalizeText(quote);
    return normalizedQuote.length >= 2 && normalizedAnswer.includes(normalizedQuote);
  })) {
    return true;
  }

  const numbers = answer.match(/\d+(?:\.\d+)?(?:分钟|小时|天|周|个月|年|元|次|个|%|MB|GB)?/gi) || [];
  if (numbers.some((number) => normalizedQuestion.includes(normalizeText(number)))) return true;

  return longestCommonSubstring(normalizedQuestion, normalizedAnswer).length >= MIN_EVIDENCE_MATCH;
}

export function extractEvidenceAnchor(answer: string, max = 48) {
  const clauses = answer
    .split(/[。！？；\n，,]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4);
  if (!clauses.length) return clip(answer, max);

  const ranked = clauses
    .map((clause, index) => {
      const blockerPriority = /(卡在|卡住|失败|报错|做不到|没法|放弃)/i.test(clause) ? 20 : 0;
      const detailPriority = /(替代|无需部署|本地运行|多久|多少时间|耗时|花了|小时|分钟|结果|成功)/i.test(clause) ? 3 : 0;
      return { clause, index, score: blockerPriority + detailPriority + evidenceSpecificityScore(clause) };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);
  return clip(ranked[0].clause, max);
}

export function makeGroundedFallbackQuestion(
  step: number,
  base: InterviewQuestion,
  history: InterviewAnswer[],
) {
  if (step === 0 || history.length === 0) return base;
  const anchor = extractEvidenceAnchor(history[history.length - 1].answer, 18);
  const questions = [
    "",
    `你提到“${anchor}”，当时正在做什么？`,
    `你提到“${anchor}”，哪一步最麻烦、最容易卡住？`,
    `你提到“${anchor}”，当时怎么凑合解决？`,
    `你提到“${anchor}”，后来发生了什么？`,
    `你提到“${anchor}”，这件事一共花了多久？`,
    `你提到“${anchor}”，过去一个月发生过几次？`,
    `你提到“${anchor}”，哪个判断如果错了最危险？`,
  ];
  return {
    ...base,
    question: questions[step] || base.question,
    helper: "只回答这一件事：尽量写具体动作、原话、结果或数字。",
  };
}

function evidenceSources(idea: string, answers: InterviewAnswer[]): EvidenceSource[] {
  return [
    ...(idea.trim() ? [{ round: 0, text: idea.trim() }] : []),
    ...answers.map((item, index) => ({
      round: index + 1,
      text: item.answer.trim(),
      interpretation: item.interpretation?.trim(),
    })),
  ].filter((item) => item.text);
}

function evidenceFromSource(source: EvidenceSource, excerpt: string): EvidenceReference {
  const evidence: EvidenceReference = { round: source.round, excerpt };
  if (source.interpretation) evidence.interpretation = source.interpretation;
  return evidence;
}

function evidenceFromRound(round: number, excerpt: string, idea: string, answers: InterviewAnswer[]): EvidenceReference {
  const source = evidenceSources(idea, answers).find((item) => item.round === round);
  return source ? evidenceFromSource(source, excerpt) : { round, excerpt };
}

function rawEvidenceParts(raw: unknown) {
  if (typeof raw === "string") return { round: null, text: raw.trim() };
  if (!raw || typeof raw !== "object") return { round: null, text: "" };
  const record = raw as Record<string, unknown>;
  const roundValue = Number(record.round);
  return {
    round: Number.isInteger(roundValue) ? roundValue : null,
    text: String(record.quote || record.excerpt || record.summary || "").trim(),
  };
}

export function insufficientEvidence(): EvidenceReference {
  return { round: null, excerpt: INSUFFICIENT_EVIDENCE };
}

export function isEvidenceGrounded(evidence: EvidenceReference) {
  return evidence.round !== null && evidence.excerpt !== INSUFFICIENT_EVIDENCE;
}

function bestOverlappingClause(text: string, sources: EvidenceSource[], claimedRound: number | null) {
  let best: { source: EvidenceSource; excerpt: string; score: number } | null = null;
  for (const source of sources) {
    const clauses = source.text.split(/[。！？；\n，,]/).map((item) => item.trim()).filter(Boolean);
    for (const clause of clauses.length ? clauses : [source.text]) {
      const common = longestCommonSubstring(text, clause);
      const roundBonus = claimedRound === source.round ? 2 : 0;
      const score = common.length + roundBonus;
      if (common.length >= MIN_EVIDENCE_MATCH && (!best || score > best.score)) {
        best = { source, excerpt: clip(clause), score };
      }
    }
  }
  return best;
}

export function groundEvidence(
  raw: unknown,
  idea: string,
  answers: InterviewAnswer[],
  context = "",
): EvidenceReference {
  const parts = rawEvidenceParts(raw);
  if (parts.text === INSUFFICIENT_EVIDENCE) return insufficientEvidence();

  const sources = evidenceSources(idea, answers);
  if (!sources.length) return insufficientEvidence();

  const claimedRound = parts.round !== null && parts.round >= 0 && parts.round <= answers.length ? parts.round : null;
  const normalizedCandidate = normalizeText(parts.text);

  if (normalizedCandidate.length >= 2) {
    const claimedSource = sources.find((source) => source.round === claimedRound);
    if (claimedSource && normalizeText(claimedSource.text).includes(normalizedCandidate)) {
      return evidenceFromSource(claimedSource, clip(parts.text));
    }
    const exactSource = sources.find((source) => normalizeText(source.text).includes(normalizedCandidate));
    if (exactSource) return evidenceFromSource(exactSource, clip(parts.text));
  }

  if (parts.text) {
    const overlap = bestOverlappingClause(parts.text, sources, claimedRound);
    if (overlap) return evidenceFromSource(overlap.source, overlap.excerpt);
  }

  if (context.trim()) {
    const overlap = bestOverlappingClause(context, sources, claimedRound);
    if (overlap) return evidenceFromSource(overlap.source, overlap.excerpt);
  }

  return insufficientEvidence();
}

function classifyDimension(value: string): EvidenceDimension {
  if (/(替代|无需部署|不用部署|本地运行|其他方式|替代方案)/i.test(value)) return "alternative";
  if (/(多久|多少时间|耗时|时间成本|花了|分钟|小时|天|周)/i.test(value)) return "time";
  if (/(卡在|卡住|阻塞|失败|报错|具体步骤|提交|部署)/i.test(value)) return "blocker";
  if (/(结果|最后|放弃|成功|完成|求助|影响)/i.test(value)) return "result";
  return "other";
}

export function isOpenEndedValidationQuestion(value: string) {
  const text = value.trim();
  if (!isSingleQuestion(text)) return false;
  if (/(是否|会不会|能不能|愿不愿意|可不可以|同意吗|可以吗|是吗|对吗|吗[?？]$)/i.test(text)) return false;
  return /(什么|哪|怎么|如何|为什么|多少|多久|几次|谁|哪些|具体)/i.test(text);
}

function normalizeQuestion(value: unknown, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text.length > max || !isOpenEndedValidationQuestion(text)) return "";
  return text;
}

function findAssumptionIndex(raw: RawValidationQuestion, assumptions: Assumption[]) {
  const index = Number(raw.assumptionIndex);
  if (Number.isInteger(index) && index >= 0 && index < assumptions.length) return index;
  return -1;
}

export function normalizeValidationQuestions(
  rawQuestions: unknown,
  assumptions: Assumption[],
  idea: string,
  answers: InterviewAnswer[],
) {
  const normalized: ValidationQuestion[] = [];
  const seen = new Set<string>();
  const connectedText = [idea, ...answers.map((item) => item.answer)].join("\n");
  const allowsTemplatePhrase = UNSUPPORTED_TEMPLATE_PHRASES.test(connectedText);

  if (Array.isArray(rawQuestions)) {
    for (const rawItem of rawQuestions) {
      if (!rawItem || typeof rawItem !== "object") continue;
      const raw = rawItem as RawValidationQuestion;
      const assumptionIndex = findAssumptionIndex(raw, assumptions);
      if (assumptionIndex < 0) continue;
      const assumption = assumptions[assumptionIndex];
      const question = normalizeQuestion(raw.question);
      if (!question || (!allowsTemplatePhrase && UNSUPPORTED_TEMPLATE_PHRASES.test(question))) continue;

      const key = normalizeText(question);
      if (seen.has(key)) continue;
      seen.add(key);

      const gap = clip(String(raw.gap || "尚未完成外部行为验证"), 120);
      const successSignal = clip(String(raw.successSignal || "能获得可追溯到具体回答的行为或结果"), 120);
      const evidence = groundEvidence(raw.evidence, idea, answers, `${question} ${gap} ${assumption.title}`);
      const linkedEvidence = isEvidenceGrounded(evidence) ? evidence : assumption.evidence;
      if (isEvidenceGrounded(linkedEvidence) && !questionReferencesAnswer(question, linkedEvidence.excerpt)) continue;
      normalized.push({
        question,
        assumptionTitle: assumption.title,
        gap,
        successSignal,
        evidence: linkedEvidence,
        dimension: classifyDimension(`${question} ${gap}`),
      });
    }
  }

  const detailPatterns: Record<Exclude<EvidenceDimension, "other">, RegExp> = {
    alternative: /(替代方案|替代方式|其他方式|办法|工具|Figma|PPT|外包|找人|求助)/i,
    blocker: /(卡在|卡住|失败|报错|无法|没能|难点|缺少|阻塞)/i,
    result: /(最后|结果|最终|放弃|成功|完成|做成|没做成)/i,
    time: /(多久|多少时间|耗时|花了|小时|分钟|天|周|晚上)/i,
  };

  const dimensionQuestions: ValidationQuestion[] = [];
  for (const dimension of ["alternative", "blocker", "result", "time"] as const) {
    if (!detailPatterns[dimension].test(connectedText)) continue;
    if (normalized.some((item) => item.dimension === dimension)) continue;
    const question = makeDimensionQuestion(dimension, assumptions, idea, answers);
    if (!question) continue;
    const key = normalizeText(question.question);
    if (seen.has(key)) continue;
    seen.add(key);
    dimensionQuestions.push(question);
  }

  const combined = [...dimensionQuestions, ...normalized];
  if (combined.length < 4) {
    for (const assumption of assumptions) {
      if (combined.length >= 4) break;
      const question = makeAssumptionQuestion(assumption);
      const key = normalizeText(question.question);
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(question);
    }
  }

  return combined.slice(0, 6);
}

function findDimensionAnchor(
  dimension: Exclude<EvidenceDimension, "other">,
  idea: string,
  answers: InterviewAnswer[],
) {
  const weightedPatterns: Record<Exclude<EvidenceDimension, "other">, Array<[RegExp, number]>> = {
    alternative: [[/(替代方案|替代方式|其他方式|办法|Figma|PPT|外包|找人|求助|试过)/gi, 5]],
    blocker: [[/(卡在|卡住|失败|报错|无法|没能|难点|缺少)/gi, 6], [/(GitHub|提交|部署|前端|页面|步骤)/gi, 2]],
    result: [[/(放弃|求助|成功|完成|结果|最终|停在那里|只能)/gi, 4], [/最后/gi, 1]],
    time: [[/\d+(?:\.\d+)?\s*(?:个)?\s*(?:分钟|小时|天|周|晚上)/gi, 6], [/(多久|多少时间|耗时|花了)/gi, 4]],
  };
  const primaryPatterns: Record<Exclude<EvidenceDimension, "other">, RegExp> = {
    alternative: /(替代方案|替代方式|其他方式|办法|Figma|PPT|外包|找人|求助|试过)/i,
    blocker: /(卡在|卡住|失败|报错|无法|没能|难点|缺少|找不到|抽不出)/i,
    result: /(最后|结果|最终|放弃|成功|完成|做成|没做成|只能)/i,
    time: /\d+(?:\.\d+)?\s*(?:个)?\s*(?:分钟|小时|天|周|晚上)|(多久|多少时间|耗时|花了)/i,
  };
  let best: { round: number; excerpt: string; score: number } | null = null;
  for (const source of evidenceSources(idea, answers)) {
    const clauses = source.text.split(/[。！？；\n，,]/).map((item) => item.trim()).filter(Boolean);
    for (const clause of clauses) {
      if (!primaryPatterns[dimension].test(clause)) continue;
      const dimensionScore = weightedPatterns[dimension].reduce((total, [pattern, weight]) => {
        return total + ((clause.match(pattern) || []).length * weight);
      }, 0);
      const score = dimensionScore + evidenceSpecificityScore(clause) * 0.35 + (source.round > 0 ? 0.25 : 0);
      if (!best || score > best.score) best = { round: source.round, excerpt: clip(clause, 56), score };
    }
  }
  return best;
}

function chooseAssumption(assumptions: Assumption[], anchor: string, dimension: EvidenceDimension) {
  const dimensionWords: Record<EvidenceDimension, RegExp> = {
    alternative: /(替代|部署|运行|方式|方案|门槛)/i,
    blocker: /(卡|失败|提交|步骤|原因|风险)/i,
    result: /(结果|影响|成功|失败|代价)/i,
    time: /(时间|耗时|多久|频率|代价)/i,
    other: /.*/,
  };
  let best = assumptions[0];
  let bestScore = -1;
  for (const assumption of assumptions) {
    const text = `${assumption.title} ${assumption.detail} ${assumption.evidence.excerpt}`;
    const keywordScore = (text.match(dimensionWords[dimension]) || []).length * 2;
    const overlapScore = longestCommonSubstring(text, anchor).length;
    const score = keywordScore + overlapScore;
    if (score > bestScore) {
      best = assumption;
      bestScore = score;
    }
  }
  return best;
}

function makeDimensionQuestion(
  dimension: Exclude<EvidenceDimension, "other">,
  assumptions: Assumption[],
  idea: string,
  answers: InterviewAnswer[],
) {
  const anchor = findDimensionAnchor(dimension, idea, answers);
  if (!anchor || !assumptions.length) return null;
  const assumption = chooseAssumption(assumptions, anchor.excerpt, dimension);
  const templates = {
    alternative: {
      question: `你提到“${anchor.excerpt}”，当时用哪个办法凑合解决？`,
      gap: "目前还不知道当时具体试过什么，或找过谁帮忙",
      successSignal: "能说出一种具体做法或求助对象，并说明为什么不够用",
    },
    blocker: {
      question: `你提到“${anchor.excerpt}”，当时最麻烦的是哪一步？`,
      gap: "目前还不知道最麻烦的一步具体发生了什么",
      successSignal: "能指出一个具体步骤，或当时看到的错误",
    },
    result: {
      question: `你提到“${anchor.excerpt}”，后来最后发生了什么？`,
      gap: "目前还不知道那次经历最后是什么结果",
      successSignal: "能说清最后做了什么，以及结果怎样",
    },
    time: {
      question: `你提到“${anchor.excerpt}”，这件事从开始到结束花了多久？`,
      gap: "目前还不知道这件事实际占用了多少时间",
      successSignal: "能给出一个时长，或可换算成时长的范围",
    },
  } satisfies Record<Exclude<EvidenceDimension, "other">, { question: string; gap: string; successSignal: string }>;
  const item = templates[dimension];
  return {
    ...item,
    assumptionTitle: assumption.title,
    evidence: evidenceFromRound(anchor.round, anchor.excerpt, idea, answers),
    dimension,
  } satisfies ValidationQuestion;
}

function makeAssumptionQuestion(assumption: Assumption): ValidationQuestion {
  const grounded = isEvidenceGrounded(assumption.evidence);
  return {
    question: grounded
      ? `你提到“${assumption.evidence.excerpt}”，下次看到什么结果，才知道这个假设可能成立？`
      : `关于“${assumption.title}”，最近一次真实经历里能补充哪个具体动作、结果或数字？`,
    assumptionTitle: assumption.title,
    gap: grounded ? "已有访谈线索，但尚未完成外部行为验证" : "缺少可追溯到访谈回答的具体证据",
    successSignal: grounded ? "能指出一个可观察、可记录的结果信号" : "能补充一个来自具体场景的事实",
    evidence: assumption.evidence,
    dimension: classifyDimension(`${assumption.title} ${assumption.detail}`),
  };
}

export function evidenceSourceLabel(round: number | null) {
  if (round === null) return INSUFFICIENT_EVIDENCE;
  if (round === 0) return "产品想法";
  return `第 ${round} 轮`;
}