/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowIcon, BrandMark, SparkIcon } from "@/components/brand";
import { getFallbackQuestion, INTERVIEW_TOTAL_STEPS } from "@/lib/interview";
import type { InterviewAnswer, InterviewQuestion } from "@/lib/types";

type QuestionResponse = {
  question?: InterviewQuestion;
  error?: string;
  notice?: string;
  source?: "model" | "fallback";
};

type NextQuestionResult = {
  question: InterviewQuestion;
  notice: string;
};

async function requestNextQuestion(
  idea: string,
  history: InterviewAnswer[],
  signal?: AbortSignal,
): Promise<NextQuestionResult> {
  const response = await fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, answers: history }),
    signal,
  });
  const data = (await response.json()) as QuestionResponse;
  if (!response.ok || !data.question) {
    throw new Error(data.error || "生成下一轮问题时出错");
  }
  return { question: data.question, notice: data.notice || "" };
}

function parseSavedAnswers(value: string | null): InterviewAnswer[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as { answers?: unknown } | InterviewAnswer[];
    const source = Array.isArray(parsed) ? parsed : parsed.answers;
    if (!Array.isArray(source)) return [];
    return source.slice(0, INTERVIEW_TOTAL_STEPS).map((item) => {
      const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        question: String(record.question || ""),
        answer: String(record.answer || ""),
        interpretation: String(record.interpretation || ""),
        interpretationConfirmed: Boolean(record.interpretationConfirmed),
        interpretationVersion: Number(record.interpretationVersion) || undefined,
      };
    }).filter((item) => item.question && item.answer);
  } catch {
    return [];
  }
}

function readSavedAnswers(): InterviewAnswer[] {
  const partial = parseSavedAnswers(localStorage.getItem("productzero:partial-answers"));
  if (partial.length) return partial;

  // 兼容旧版 5 轮访谈：已完成的旧回答也继续带入新版流程。
  return parseSavedAnswers(localStorage.getItem("productzero:answers"));
}

export default function InterviewPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion>(getFallbackQuestion(0));
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [questionError, setQuestionError] = useState("");
  const [questionNotice, setQuestionNotice] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const savedIdea = localStorage.getItem("productzero:idea") ?? "";
    const savedAnswers = readSavedAnswers();
    setIdea(savedIdea);
    setAnswers(savedAnswers);

    if (savedAnswers.length >= INTERVIEW_TOTAL_STEPS) {
      localStorage.setItem("productzero:answers", JSON.stringify(savedAnswers));
      localStorage.removeItem("productzero:partial-answers");
      router.replace(savedAnswers.every((item) => item.interpretationConfirmed) ? "/result" : "/confirm");
      return;
    }

    if (!savedIdea) {
      setLoadingQuestion(false);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      setLoadingQuestion(true);
      setQuestionError("");
      setQuestionNotice("");
      try {
        const next = await requestNextQuestion(savedIdea, savedAnswers, controller.signal);
        setCurrentQuestion(next.question);
        setQuestionNotice(next.notice);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCurrentQuestion(getFallbackQuestion(savedAnswers.length, savedAnswers));
        setQuestionError("AI 暂时没有接上上一轮回答，已切换为承接上一答的单问备用问题，不影响继续。");
      } finally {
        if (!controller.signal.aborted) setLoadingQuestion(false);
      }
    })();

    return () => controller.abort();
  }, [router]);

  const currentStep = Math.min(answers.length + 1, INTERVIEW_TOTAL_STEPS);
  const progress = (currentStep / INTERVIEW_TOTAL_STEPS) * 100;
  const isAdaptiveFollowUp = answers.length > 0;
  const isFinalStep = answers.length === INTERVIEW_TOTAL_STEPS - 1;

  async function submitAnswer() {
    const cleanAnswer = answer.trim();
    if (!cleanAnswer || !idea || loadingQuestion) return;

    const nextAnswers = [...answers, { question: currentQuestion.question, answer: cleanAnswer }];
    setAnswer("");

    if (nextAnswers.length >= INTERVIEW_TOTAL_STEPS) {
      localStorage.setItem("productzero:answers", JSON.stringify(nextAnswers));
      localStorage.removeItem("productzero:partial-answers");
      setLoadingQuestion(true);
      router.push("/confirm");
      return;
    }

    setAnswers(nextAnswers);
    localStorage.setItem("productzero:partial-answers", JSON.stringify({ answers: nextAnswers }));
    setLoadingQuestion(true);
    setQuestionError("");
    setQuestionNotice("");

    try {
      const next = await requestNextQuestion(idea, nextAnswers);
      setCurrentQuestion(next.question);
      setQuestionNotice(next.notice);
    } catch {
      setCurrentQuestion(getFallbackQuestion(nextAnswers.length, nextAnswers));
      setQuestionError("AI 暂时没有接上上一轮回答，已切换为承接上一答的单问备用问题，不影响继续。");
    } finally {
      setLoadingQuestion(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/[0.06] bg-[#f7f5ef]">
        <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between px-5 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-4">
            <span className="hidden text-[11px] font-medium text-[#8c877d] sm:block">{INTERVIEW_TOTAL_STEPS} 轮访谈 · 每轮只问一件事 · 约 8–16 分钟</span>
            <Link href="/new" className="text-[12px] font-semibold text-[#77746c] transition-colors hover:text-[#171714]">重新开始</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-8 lg:px-8 lg:py-12">
        <div className="mb-6 flex items-center gap-4">
          <span className="text-[11px] font-bold text-[#5d5a53]">第 {currentStep} / {INTERVIEW_TOTAL_STEPS} 轮</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.07]">
            <div className="h-full rounded-full bg-[#ef5b37] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] font-semibold tracking-[0.08em] text-[#9c978d]">逐轮接续</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-[3px] border border-black/[0.08] bg-[#ede9df]/80 p-5">
              <p className="text-[10px] font-bold tracking-[0.1em] text-[#938e84]">你最初写下的想法</p>
              <p className="mt-4 max-h-52 overflow-y-auto text-[14px] font-semibold leading-6 text-[#3d3a34]">
                {idea || "还没有输入产品想法。"}
              </p>
              <Link href="/new" className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[#ef5b37] hover:underline">
                修改想法 <span aria-hidden="true">↗</span>
              </Link>
            </div>

            <div className="rounded-[3px] border border-black/[0.08] bg-white/50 p-5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#4e4b44]">
                <SparkIcon className="size-4 text-[#ef5b37]" />
                AI 会接着上一句继续问
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[#827d73]">下一问只问一件事，并接着上一答里的具体对象、动作、原话或数字继续问。</p>
              <div className="mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-4">
                <span className="size-1.5 rounded-full bg-[#7c9678]" />
                <span className="text-[10px] font-medium text-[#7d8878]">内容只保存在你的浏览器</span>
              </div>
            </div>

            <div className="border-l-2 border-[#ef5b37] pl-4">
              <p className="text-[10px] font-bold text-[#6f695f]">已记录 {answers.length} / {INTERVIEW_TOTAL_STEPS} 轮</p>
              <p className="mt-1 text-[10px] leading-5 text-[#938e84]">最后先由你核对原话与整理内容，再生成 Product Brief（用来判断下一步做什么的证据整理稿）。</p>
            </div>
          </aside>

          {!idea && !loadingQuestion ? (
            <section className="paper-card grid min-h-[430px] place-items-center rounded-[4px] p-8 text-center">
              <div>
                <h1 className="text-2xl font-black tracking-[-0.04em] text-[#2b2925]">先写下一个产品想法</h1>
                <p className="mt-3 text-[12px] leading-6 text-[#857f75]">没有起点时，AI 无法生成真正相关的追问。</p>
                <Link href="/new" className="mt-5 inline-flex h-10 items-center justify-center rounded-[2px] bg-[#171714] px-5 text-[11px] font-bold text-white">返回输入</Link>
              </div>
            </section>
          ) : loadingQuestion ? (
            <section className="paper-card grid min-h-[430px] place-items-center rounded-[4px] p-8 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#ef5b37]/20 bg-[#fff3ee]">
                  <SparkIcon className="size-6 animate-pulse text-[#ef5b37]" />
                </span>
                <h1 className="mt-5 text-balance text-2xl font-black tracking-[-0.04em] text-[#2b2925]">
                  {answers.length === 0 ? "正在准备第一个问题" : "正在根据上一轮回答生成下一问"}
                </h1>
                <p className="mt-3 text-[12px] leading-5 text-[#857f75]">正在读取前文，寻找还需要问清楚的具体经历。</p>
              </div>
            </section>
          ) : (
            <section key={currentQuestion.question} className="paper-card animate-rise rounded-[4px] p-2">
              <div className="rounded-[2px] border border-black/[0.06] bg-[#fffefa]">
                {questionError && (
                  <div className="mx-6 mt-5 rounded-[2px] border border-[#d8b56b]/30 bg-[#fff7e4] px-4 py-3 text-[10px] leading-5 text-[#8a6b26] sm:mx-8">
                    {questionError}
                  </div>
                )}
                {questionNotice && !questionError && (
                  <div className="mx-6 mt-5 border-b border-black/[0.06] pb-3 text-[10px] leading-5 text-[#8a6b26] sm:mx-8">
                    {questionNotice}
                  </div>
                )}

                <div className="border-b border-black/[0.06] px-6 py-5 sm:px-8">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-[0.1em] text-[#ef5b37]">{currentQuestion.eyebrow}</p>
                    <span className="rounded-[2px] bg-[#f1eee6] px-2.5 py-1 text-[9px] font-bold text-[#8b867c]">
                      {isAdaptiveFollowUp ? "接续上一答" : "AI 提问"}
                    </span>
                  </div>
                  <h1 className="mt-4 text-balance text-2xl font-black tracking-[-0.04em] text-[#24231f] sm:text-3xl">{currentQuestion.question}</h1>
                  <p className="mt-3 text-[12px] leading-6 text-[#837e74]">{currentQuestion.helper}</p>
                </div>

                {answers.length > 0 && (
                  <div className="border-b border-black/[0.06] bg-[#faf8f3] px-6 py-4 sm:px-8">
                    <p className="text-[9px] font-bold tracking-[0.1em] text-[#a29d93]">上一轮记录</p>
                    <div className="mt-3 space-y-2.5">
                      {answers.slice(-2).map((item, index) => (
                        <div key={`${item.question}-${index}`} className="flex gap-2 text-[11px] leading-5">
                          <span className="mt-1 size-1 shrink-0 rounded-full bg-[#aab5a4]" />
                          <span className="text-[#777268]"><strong className="font-semibold text-[#4c4942]">{item.question}</strong>　{item.answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="answer" className="text-[11px] font-bold text-[#4f4b44]">你的回答</label>
                    <span className="text-[10px] tabular-nums text-[#a19c92]">{answer.length} / 1200</span>
                  </div>
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value.slice(0, 1200))}
                    rows={5}
                    autoFocus
                    placeholder="写下具体经历、原话或数字。例如：上周他连续看了 6 套房，其中 3 套是虚假房源……"
                    className="mt-3 w-full resize-none rounded-[2px] border border-black/[0.09] bg-white/75 p-4 text-[15px] leading-7 text-[#2e2c28] outline-none transition-colors placeholder:text-[#b5b0a6] focus:border-[#ef5b37]/45"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    {currentQuestion.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setAnswer(suggestion)}
                        className="rounded-[2px] border border-black/[0.08] bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-[#716d64] transition-colors hover:border-[#ef5b37]/30 hover:text-[#b64e34]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-4 border-t border-black/[0.06] pt-5">
                    <p className="hidden text-[10px] leading-5 text-[#a19c92] sm:block">最后一轮结束后，会先请你核对每条回答的原话与整理后的意思。</p>
                    <button
                      type="button"
                      onClick={submitAnswer}
                      disabled={!answer.trim() || loadingQuestion}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[2px] bg-[#171714] px-6 text-[12px] font-semibold text-white transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-[#ef5b37] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {isFinalStep ? "核对理解" : "记录并继续"}
                      <ArrowIcon />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}