import { isEvidenceGrounded } from "@/lib/evidence";
import type { EvidenceReference, EvidenceStatus, RiskLevel } from "@/lib/types";

const EVIDENCE_STATUSES: EvidenceStatus[] = ["证据不足", "有部分线索", "有明确访谈证据", "已验证"];

export function normalizeEvidenceStatus(value: unknown, evidence: EvidenceReference): EvidenceStatus {
  if (!isEvidenceGrounded(evidence)) return "证据不足";

  const label = String(value || "").trim();
  const exact = EVIDENCE_STATUSES.find((status) => label.includes(status));
  if (exact) return exact;
  if (/(部分|线索|待验证|待确认)/.test(label)) return "有部分线索";
  return "有明确访谈证据";
}

export function normalizeRiskLevel(value: unknown, fallbackTone?: unknown): RiskLevel {
  const label = String(value || "").trim();
  if (/高/.test(label)) return "高";
  if (/低/.test(label)) return "低";
  if (/中/.test(label)) return "中";
  if (fallbackTone === "red") return "高";
  if (fallbackTone === "green") return "低";
  return "中";
}

export function toneForRisk(riskLevel: RiskLevel): "amber" | "red" | "green" {
  if (riskLevel === "高") return "red";
  if (riskLevel === "低") return "green";
  return "amber";
}