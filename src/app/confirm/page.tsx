/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, BrandMark, SparkIcon } from "@/components/brand";
import { INTERPRETATION_VERSION } from "@/lib/clarify";
import { INTERVIEW_TOTAL_STEPS } from "@/lib/interview";
import type { InterviewAnswer } from "@/lib/types";

type ReviewAnswer = InterviewAnswer & {
  interpretation: string;
  interpretationConfirmed: boolean;
};

type ClarifyResponse = {
  answers?: InterviewAnswer[];
  notice?: string;
  error?: string;
};

function parseAnswers(value: string | null): InterviewAnswer[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as { answers?: unknown } | InterviewAnswer[];
    const source = Array.isArray(parsed) ? parsed : parsed.answers;
    if (!Array.isArray(source)) return [];
    return source.slice(0, INTERVIEW_TOTAL_STEPS).map((item) => {
      const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        question: String(record.question || "").trim(),
        answer: String(record.answer || "").trim(),
        interpretation: String(record.interpretation || "").trim(),
        interpretationConfirmed: Boolean(record.interpretationConfirmed),
        interpretationVersion: Number(record.interpretationVersion) || undefined,
      };
    }).filter((item) => item.question && item.answer);
  } catch {
    return [];
  }
}

function toReviewAnswers(answers: InterviewAnswer[]): ReviewAnswer[] {
  return answers.map((item) => ({
    ...item,
    interpretation: item.interpretation || "",
    interpretationConfirmed: Boolean(item.interpretationConfirmed),
  }));
}

function persistAnswers(answers: ReviewAnswer[]) {
  localStorage.setItem("productzero:answers", JSON.stringify(answers.map((item) => ({
    question: item.question,
    answer: item.answer,
    interpretation: item.interpretation,
    interpretationConfirmed: item.interpretationConfirmed,
    interpretationVersion: item.interpretationVersion,
  }))));
}

function fallbackInterpretation(answer: string) {
  return /[。！？!?]$/.test(answer) ? answer : `${answer}。`;
}

export default function ConfirmPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const savedIdea = localStorage.getItem("productzero:idea") ?? "";
    const partial = parseAnswers(localStorage.getItem("productzero:partial-answers"));
    const completed = parseAnswers(localStorage.getItem("productzero:answers"));
    const savedAnswers = completed.length >= INTERVIEW_TOTAL_STEPS ? completed : partial;

    if (!savedIdea || savedAnswers.length < INTERVIEW_TOTAL_STEPS) {
      setLoading(false);
      setError("还没有完成 8 轮访谈，暂时不能生成 Product Brief。");
      return;
    }

    const initial = toReviewAnswers(savedAnswers);
    setItems(initial);
    if (initial.every((item) => item.interpretation && item.interpretationVersion === INTERPRETATION_VERSION)) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: savedIdea, answers: initial }),
          signal: controller.signal,
        });
        const data = (await response.json()) as ClarifyResponse;
        if (!response.ok || !data.answers) throw new Error(data.error || "整理回答时出错");
        const clarified = toReviewAnswers(data.answers);
        setItems(clarified);
        persistAnswers(clarified);
        setNotice(data.notice || "请逐条核对你原来的回答，以及整理后的意思。");
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        const fallback = initial.map((item) => ({
          ...item,
          interpretation: item.interpretation || fallbackInterpretation(item.answer),
          interpretationConfirmed: false,
          interpretationVersion: INTERPRETATION_VERSION,
        }));
        setItems(fallback);
        persistAnswers(fallback);
        setNotice("AI 暂时无法整理回答，已先保留原话。你可以直接修改整理内容后再确认。");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const confirmedCount = useMemo(() => items.filter((item) => item.interpretationConfirmed).length, [items]);
  const allConfirmed = items.length === INTERVIEW_TOTAL_STEPS && items.every((item) => item.interpretationConfirmed && item.interpretation.trim());
  const progress = (confirmedCount / INTERVIEW_TOTAL_STEPS) * 100;

  function updateInterpretation(index: number, value: string) {
    setItems((current) => {
      const next = current.map((item, itemIndex) => (
        itemIndex === index
          ? { ...item, interpretation: value.slice(0, 320), interpretationConfirmed: false }
          : item
      ));
      persistAnswers(next);
      return next;
    });
  }

  function confirmItem(index: number) {
    setItems((current) => {
      const next = current.map((item, itemIndex) => (
        itemIndex === index && item.interpretation.trim()
          ? { ...item, interpretation: item.interpretation.trim(), interpretationConfirmed: true }
          : item
      ));
      persistAnswers(next);
      return next;
    });
    setEditingIndex(null);
  }

  function generateBrief() {
    if (!allConfirmed) return;
    persistAnswers(items.map((item) => ({ ...item, interpretationConfirmed: true })));
    router.push("/result");
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/[0.06] bg-[#f7f5ef]">
        <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between px-5 lg:px-8">
          <BrandMark />
          <Link href="/" className="text-[12px] font-semibold text-[#77746c] transition-colors hover:text-[#171714]">返回首页</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-5 py-10 lg:px-8 lg:py-16">
        <div className="max-w-[780px]">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-[#a7523e]">
            <span className="grid size-5 place-items-center rounded-[2px] border border-[#ef5b37]/35 bg-[#fff3ee]">3</span>
            生成前确认
          </div>
          <h1 className="mt-6 text-balance font-display text-4xl font-black leading-[1.12] tracking-[-0.045em] text-[#171714] sm:text-5xl">先核对你说的，再生成 Product Brief</h1>
          <p className="mt-5 text-[16px] leading-8 text-[#625d53]">
            你的原话会作为最终证据（用户原话、实际行为、结果或数字）保留；整理后的意思只负责让表达更清楚。Product Brief（用来判断下一步做什么的证据整理稿）只会使用你确认过的内容。
          </p>
        </div>

        {loading ? (
          <section className="paper-card mt-10 grid min-h-[360px] place-items-center rounded-[4px] p-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#ef5b37]/20 bg-[#fff3ee]">
                <SparkIcon className="size-6 animate-pulse text-[#ef5b37]" />
              </span>
              <p className="mt-5 text-[16px] font-bold text-[#37342d]">正在逐条整理你的回答</p>
              <p className="mt-2 text-[13px] leading-6 text-[#857f75]">不会覆盖原话，也不会替你增加没说过的信息。</p>
            </div>
          </section>
        ) : error ? (
          <section className="paper-card mt-10 grid min-h-[300px] place-items-center rounded-[4px] p-8 text-center">
            <div>
              <h2 className="text-2xl font-black text-[#2b2925]">还差完整访谈</h2>
              <p className="mt-3 text-[14px] leading-7 text-[#7b756b]">{error}</p>
              <Link href="/interview" className="mt-6 inline-flex h-11 items-center justify-center rounded-[2px] bg-[#171714] px-5 text-[12px] font-bold text-white">回到访谈</Link>
            </div>
          </section>
        ) : (
          <>
            <div className="sticky top-0 z-20 mt-10 border-y border-black/[0.09] bg-[#f3efe5] py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4 text-[12px] font-semibold text-[#6b665c]">
                    <span>已确认 {confirmedCount} / {INTERVIEW_TOTAL_STEPS} 轮</span>
                    <span>{allConfirmed ? "可以生成" : "请逐条核对"}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.07]">
                    <div className="h-full rounded-full bg-[#ef5b37] transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={generateBrief}
                  disabled={!allConfirmed}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[2px] bg-[#171714] px-5 text-[12px] font-bold text-white transition-colors enabled:hover:bg-[#ef5b37] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  确认完成，生成 Brief <ArrowIcon />
                </button>
              </div>
            </div>

            {notice && (
              <p className="mt-5 border-l-2 border-[#d8b56b] pl-4 text-[13px] leading-6 text-[#806426]">{notice}</p>
            )}

            <div className="mt-8 space-y-5">
              {items.map((item, index) => {
                const editing = editingIndex === index;
                return (
                  <article key={`${item.question}-${index}`} className="paper-card rounded-[4px] p-2">
                    <div className="rounded-[2px] border border-black/[0.06] bg-[#fffefa]">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.07] px-5 py-4 sm:px-7">
                        <div className="flex min-w-0 gap-3">
                          <span className="font-display text-xl font-bold text-[#b2aa9d]">R{index + 1}</span>
                          <h2 className="text-[16px] font-bold leading-7 text-[#37342d]">{item.question}</h2>
                        </div>
                        <span className={`rounded-[2px] px-2.5 py-1 text-[11px] font-bold ${item.interpretationConfirmed ? "bg-[#e8f0e5] text-[#4e684b]" : "bg-[#f4ecd3] text-[#806426]"}`}>
                          {item.interpretationConfirmed ? "已确认理解" : "待确认"}
                        </span>
                      </div>

                      <div className="grid gap-0 md:grid-cols-2">
                        <div className="border-b border-black/[0.07] px-5 py-5 md:border-b-0 md:border-r sm:px-7">
                          <p className="text-[11px] font-bold tracking-[0.08em] text-[#9a9489]">你的原话</p>
                          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[#4c4942]">{item.answer}</p>
                          <p className="mt-3 text-[11px] leading-5 text-[#a19c92]">原话不会被修改，也会一直作为最终证据来源。</p>
                        </div>

                        <div className="px-5 py-5 sm:px-7">
                          <p className="text-[11px] font-bold tracking-[0.08em] text-[#9a9489]">整理后的意思</p>
                          {editing ? (
                            <textarea
                              value={item.interpretation}
                              onChange={(event) => updateInterpretation(index, event.target.value)}
                              rows={4}
                              autoFocus
                              className="mt-3 w-full resize-none rounded-[2px] border border-[#ef5b37]/30 bg-white p-3 text-[15px] leading-7 text-[#3f3b34] outline-none focus:border-[#ef5b37]"
                            />
                          ) : (
                            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[#5f594f]">{item.interpretation || "尚未整理"}</p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {editing ? (
                              <>
                                <button type="button" onClick={() => confirmItem(index)} disabled={!item.interpretation.trim()} className="h-9 rounded-[2px] bg-[#171714] px-4 text-[12px] font-bold text-white disabled:opacity-35">保存并确认</button>
                                <button type="button" onClick={() => setEditingIndex(null)} className="h-9 rounded-[2px] border border-black/[0.12] bg-white px-4 text-[12px] font-bold text-[#5f594f]">取消修改</button>
                              </>
                            ) : (
                              <>
                                {!item.interpretationConfirmed && (
                                  <button type="button" onClick={() => confirmItem(index)} className="h-9 rounded-[2px] bg-[#171714] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#ef5b37]">理解正确</button>
                                )}
                                <button type="button" onClick={() => setEditingIndex(index)} className="h-9 rounded-[2px] border border-black/[0.12] bg-white px-4 text-[12px] font-bold text-[#5f594f] transition-colors hover:border-[#ef5b37]/35">修改整理内容</button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col justify-between gap-4 border-t border-black/[0.09] pt-6 sm:flex-row sm:items-center">
              <p className="max-w-[680px] text-[13px] leading-6 text-[#7b756b]">确认完成后才会生成 Product Brief。生成失败时，页面和导出文件都会明确标记为演示内容。</p>
              <button
                type="button"
                onClick={generateBrief}
                disabled={!allConfirmed}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[2px] bg-[#171714] px-6 text-[13px] font-bold text-white transition-colors enabled:hover:bg-[#ef5b37] disabled:cursor-not-allowed disabled:opacity-35"
              >
                生成 Product Brief <ArrowIcon />
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}