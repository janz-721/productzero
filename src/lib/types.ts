export type InterviewQuestion = {
  eyebrow: string;
  question: string;
  helper: string;
  suggestions: string[];
};

export type InterviewAnswer = {
  question: string;
  answer: string;
  interpretation?: string;
  interpretationConfirmed?: boolean;
  interpretationVersion?: number;
};

export type EvidenceReference = {
  round: number | null;
  excerpt: string;
  interpretation?: string;
};

export type EvidenceStatus = "证据不足" | "有部分线索" | "有明确访谈证据" | "已验证";
export type RiskLevel = "高" | "中" | "低";

export type Assumption = {
  title: string;
  detail: string;
  evidenceStatus: EvidenceStatus;
  riskLevel: RiskLevel;
  tone: "amber" | "red" | "green";
  evidence: EvidenceReference;
};

export type Decision = {
  title: string;
  reason: string;
  evidence: EvidenceReference;
};

export type EvidenceDimension = "alternative" | "blocker" | "result" | "time" | "other";

export type ValidationQuestion = {
  question: string;
  assumptionTitle: string;
  gap: string;
  successSignal: string;
  evidence: EvidenceReference;
  dimension: EvidenceDimension;
};

export type ProductBrief = {
  problemStatement: string;
  problemEvidence: EvidenceReference;
  targetUser: string;
  targetUserEvidence: EvidenceReference;
  valueFocus: string;
  valueFocusEvidence: EvidenceReference;
  risk: string;
  riskEvidence: EvidenceReference;
  assumptions: Assumption[];
  decisions: Decision[];
  nextActions: string[];
  evidenceGaps: string[];
  validationQuestions: ValidationQuestion[];
};
export type PrototypeResult = {
  summary: string;
  layout: string[];
  colors: string[];
  typography: string;
  components: string[];
  html: string;
  rationale: string[];
  changes: string[];
  warnings: string[];
};