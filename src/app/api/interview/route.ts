import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { countQuestionMarks, questionReferencesAnswer } from "@/lib/evidence";
import { getFallbackQuestion, INTERVIEW_STAGES, INTERVIEW_TOTAL_STEPS } from "@/lib/interview";
import type { InterviewAnswer, InterviewQuestion } from "@/lib/types";

type ResponseShape = { question?: Partial<InterviewQuestion> };
type NormalizedCandidate = {
  valid: boolean;
  reason: string;
  question: InterviewQuestion;
};

function cleanHistory(value: unknown): InterviewAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, INTERVIEW_TOTAL_STEPS).map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      question: String(record.question || "").trim().slice(0, 220),
      answer: String(record.answer || "").trim().slice(0, 1200),
    };
  }).filter((item) => item.question && item.answer);
}

function withoutQuestionMarks(value: string) {
  return value.replace(/[?？]+/g, "。").replace(/\s+/g, " ").trim();
}

function normalizeCandidate(candidate: Partial<InterviewQuestion>, fallback: InterviewQuestion, history: InterviewAnswer[], stage: (typeof INTERVIEW_STAGES)[number]): NormalizedCandidate {
  const rawQuestion = String(candidate.question || "").replace(/\s+/g, " ").trim();
  let reason = "";

  if (!rawQuestion) reason = "question 为空";
  else if (countQuestionMarks(rawQuestion) === 0) reason = "question 不是疑问句";
  else if (countQuestionMarks(rawQuestion) > 1) reason = "question 包含多个问号";
  else if (rawQuestion.length > 60) reason = "question 过长，必须控制在 60 个汉字以内";
  else if (history.length > 0 && !questionReferencesAnswer(rawQuestion, history[history.length - 1].answer)) {
    reason = "question 没有引用上一轮回答中的具体对象、动作、原话或数字";
  } else if (!stage.signal.test(rawQuestion)) {
    reason = "question 没有围绕本轮要补的证据";
  } else if (history.some((item) => item.question.trim() === rawQuestion)) {
    reason = "question 与历史问题重复";
  }

  const suggestions = Array.isArray(candidate.suggestions)
    ? candidate.suggestions.slice(0, 3).map((item) => withoutQuestionMarks(String(item)).slice(0, 80)).filter(Boolean)
    : [];

  return {
    valid: !reason,
    reason,
    question: {
      eyebrow: withoutQuestionMarks(String(candidate.eyebrow || fallback.eyebrow)).slice(0, 20),
      question: reason ? fallback.question : rawQuestion,
      helper: withoutQuestionMarks(String(candidate.helper || fallback.helper)).slice(0, 120),
      suggestions: suggestions.length === 3 ? suggestions : fallback.suggestions,
    },
  };
}

function messagesForAttempt(
  idea: string,
  history: InterviewAnswer[],
  step: number,
  correction?: { question: string; reason: string },
) {
  const stage = INTERVIEW_STAGES[step];
  const historyText = history.length
    ? history.map((item, index) => `第 ${index + 1} 轮\n问题：${item.question}\n回答：${item.answer}`).join("\n\n")
    : "暂无。请先提出第 1 轮问题。";
  const correctionText = correction
    ? `\n上一次输出不合格，原因是：${correction.reason}\n不合格问题：${correction.question || "空"}\n必须改成一个单问，不能截断成病句。\n`
    : "";

  return [
    {
      role: "system" as const,
      content:
        "你是 ProductZero 的访谈编辑。面对没有产品专业背景的普通用户，你要用日常中文，基于真实经历一次只问一个具体事实。只输出 JSON。",
    },
    {
      role: "user" as const,
      content: `产品想法：\n<idea>${idea}</idea>\n\n已有访谈：\n<history>${historyText}</history>\n\n当前是第 ${step + 1} / ${INTERVIEW_TOTAL_STEPS} 轮。本轮目标：${stage.goal}\n${correctionText}\n硬性规则：\n1. question 字段必须恰好有 1 个问号，只能问一件事；禁止“做了什么？结果如何？多久？”这类多问。\n2. helper 和 suggestions 不得出现问号。\n3. 如果已有回答，question 必须先用中文引号原样引用上一轮回答中的一个 2–18 字具体片段，再只追问一个点。\n4. 引用必须是上一轮回答里的具体对象、动作、原话或数字，不能改写成泛泛的“这个需求”“遇到的问题”。\n5. 不得编造用户没有说过的信息，不得重复历史问题。\n6. question 不超过 70 个汉字；helper 不超过 60 个汉字；suggestions 恰好 3 条。\n\n只返回：{"question":{"eyebrow":"2-8字中文短标签","question":"一个且只含一个问号的问题","helper":"一句提示，不含问号","suggestions":["回答1","回答2","回答3"]}}`,
    },
  ];
}

export async function POST(request: Request) {
  try {
    const { idea, answers } = (await request.json()) as { idea?: string; answers?: unknown };
    const cleanIdea = idea?.trim();
    const history = cleanHistory(answers);
    const step = history.length;

    if (!cleanIdea || cleanIdea.length < 8) {
      return NextResponse.json({ error: "请先输入更完整的产品想法" }, { status: 400 });
    }

    if (step >= INTERVIEW_TOTAL_STEPS) {
      return NextResponse.json({ error: "访谈已经完成，可以生成 Product Brief" }, { status: 400 });
    }

    const fallback = getFallbackQuestion(step, history);
    let correction: { question: string; reason: string } | undefined;
    let invalidQuestion = "";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await generateJson<ResponseShape>(messagesForAttempt(cleanIdea, history, step, correction), 650);
        const candidate = normalizeCandidate(result.question || {}, fallback, history, INTERVIEW_STAGES[step]);
        if (candidate.valid) {
          return NextResponse.json({
            question: candidate.question,
            step: step + 1,
            total: INTERVIEW_TOTAL_STEPS,
            source: "model",
          });
        }
        invalidQuestion = String(result.question?.question || "").trim();
        correction = { question: invalidQuestion, reason: candidate.reason };
      } catch (error) {
        console.error("Interview model attempt failed", error);
        break;
      }
    }

    return NextResponse.json({
      question: fallback,
      step: step + 1,
      total: INTERVIEW_TOTAL_STEPS,
      source: "fallback",
      notice: correction
        ? "AI 返回了多问或未承接上一答，已自动改用会引用上一轮回答的单问备用问题。"
        : "AI 暂时不可用，已改用会承接上一轮回答的单问备用问题。",
    });
  } catch (error) {
    console.error("Interview generation failed", error);
    const message = error instanceof Error ? error.message : "生成下一轮问题时出错";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}