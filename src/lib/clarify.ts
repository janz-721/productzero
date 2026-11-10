import type { InterviewAnswer } from "./types";

export const INTERPRETATION_VERSION = 2;

export type RawInterpretation = {
  index?: unknown;
  text?: unknown;
  interpretation?: unknown;
};

export type ClarificationResult = {
  answers: InterviewAnswer[];
  usedFallback: number;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fallbackInterpretation(answer: string) {
  const clean = normalizeText(answer);
  if (!clean) return "";
  return /[。！？!?]$/.test(clean) ? clean : `${clean}。`;
}

function orderItems(rawItems: RawInterpretation[]) {
  const indexes = rawItems.map((item) => Number(item?.index));
  const isZeroBased = rawItems.length === 8 && indexes.every((value, position) => value === position);
  const isOneBased = rawItems.length === 8 && indexes.every((value, position) => value === position + 1);
  if (isZeroBased || isOneBased) {
    return [...rawItems].sort((left, right) => Number(left.index) - Number(right.index));
  }
  return rawItems;
}

export function alignInterpretations(rawItems: unknown, answers: InterviewAnswer[]): ClarificationResult {
  const items = Array.isArray(rawItems) ? orderItems(rawItems as RawInterpretation[]) : [];
  const seen = new Set<string>();
  let usedFallback = 0;

  const aligned = answers.map((item, index) => {
    const raw = items[index];
    let candidate = normalizeText(String(raw?.interpretation || raw?.text || "")).slice(0, 320);
    const key = candidate.toLowerCase();

    // 模型重复输出了同一段整理内容时，宁可保留这一轮原话，也不能把上一轮内容粘贴过来。
    if (candidate && seen.has(key)) candidate = "";
    if (candidate) seen.add(key);
    if (!candidate) usedFallback += 1;

    return {
      ...item,
      interpretation: candidate || fallbackInterpretation(item.answer),
      interpretationVersion: INTERPRETATION_VERSION,
    };
  });

  return { answers: aligned, usedFallback };
}