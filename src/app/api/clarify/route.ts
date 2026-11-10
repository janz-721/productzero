import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { alignInterpretations } from "@/lib/clarify";
import { INTERVIEW_TOTAL_STEPS } from "@/lib/interview";
import type { InterviewAnswer } from "@/lib/types";

type ClarifyShape = {
  interpretations?: Array<{ index?: unknown; text?: unknown; interpretation?: unknown }>;
  items?: Array<{ index?: unknown; text?: unknown; interpretation?: unknown }>;
};

function normalizeAnswers(value: unknown): InterviewAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, INTERVIEW_TOTAL_STEPS).map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      question: String(record.question || "").trim().slice(0, 220),
      answer: String(record.answer || "").trim().slice(0, 1200),
    };
  }).filter((item) => item.question && item.answer);
}

export async function POST(request: Request) {
  let answers: InterviewAnswer[] = [];
  try {
    const body = (await request.json()) as { idea?: string; answers?: unknown };
    const idea = String(body.idea || "").trim();
    answers = normalizeAnswers(body.answers);

    if (idea.length < 8 || answers.length < INTERVIEW_TOTAL_STEPS) {
      return NextResponse.json({ error: "缺少产品想法或完整访谈回答" }, { status: 400 });
    }

    const transcript = answers
      .map((item, index) => `[第 ${index + 1} 轮]\n问题：${item.question}\n用户原话：${item.answer}`)
      .join("\n\n");

    const result = await generateJson<ClarifyShape>([
      {
        role: "system",
        content:
          "你是 ProductZero 的访谈整理编辑。你的任务只是把普通用户的回答整理得更清楚，不能改变原意、补充事实或替用户下结论。只输出 JSON。",
      },
      {
        role: "user",
        content: `产品想法：\n<idea>${idea}</idea>\n\n访谈记录：\n<interview>${transcript}</interview>\n\n请逐轮给出“整理后的意思”，规则如下：\n1. 一共 ${INTERVIEW_TOTAL_STEPS} 条，严格按第 1 轮到第 8 轮的顺序排列，不能错位、合并或省略。\n2. index 从 1 到 ${INTERVIEW_TOTAL_STEPS}，只用于标记轮次；数组顺序也必须与访谈记录一致。\n3. 保留原回答里的对象、动作、数字、结果、责任主体和不确定程度，不得新增原因、判断或事实。\n4. 用普通、清楚、书面的中文，不要使用“价值主张、PMF、闭环、证据缺口”等术语。\n5. 如果原话已经清楚，只做轻微顺句和补标点，不要为了显得专业而改写。\n6. 每条整理内容必须对应当前这一轮原话，不能复制上一轮答案或整理内容。\n7. 每条 20–100 个汉字，只返回整理结果，不评论原话。\n\n只返回：{"interpretations":[{"index":1,"interpretation":"第 1 轮整理后的意思"}]}`,
      },
    ], 1400);

    const aligned = alignInterpretations(result.interpretations ?? result.items, answers);
    return NextResponse.json({
      answers: aligned.answers,
      source: "model",
      notice: aligned.usedFallback ? "有部分整理内容缺失或重复，已对应轮次保留原话，请重点核对。" : "请逐条核对你原来的回答，以及整理后的意思。",
    });
  } catch (error) {
    console.error("Interview clarification failed", error);
    return NextResponse.json({
      answers: alignInterpretations([], answers).answers,
      source: "fallback",
      notice: "AI 暂时无法整理这段话，已先保留原话。你可以直接修改整理内容后再确认。",
    });
  }
}