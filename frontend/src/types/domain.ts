// Domain models for «دیدبان حسابرسی»
// All models are Mock-backed in phase 1.

export type Role = "auditor" | "manager" | "admin";

export type UserStatus = "active" | "invited" | "disabled";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  avatar?: string;
  email?: string;
  status?: UserStatus;
  lastActiveAt?: string;
  permissions?: string[];
}


export interface Company {
  id: string;
  name: string;
}

export interface FiscalPeriod {
  id: string;
  year: string; // e.g. "۱۴۰۵"
  label: string; // e.g. "سه‌ماهه دوم"
  startDate: string;
  endDate: string;
}

// ---------- Vendors ----------
export interface VendorRiskSignal {
  id: string;
  vendorId: string;
  label: string;
  severity: "low" | "medium" | "high";
  detectedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  nationalId: string;
  category: string;
  riskScore: number; // 0-100
  totalPurchase: number; // ریال
  activeContracts: number;
  signals: VendorRiskSignal[];
  onboardedAt?: string;
  status?: "active" | "watchlist" | "blocked";
  contactName?: string;
  phone?: string;
}

export interface VendorTransactionEntry {
  id: string;
  vendorId: string;
  date: string;
  documentNumber: string;
  documentId?: string;
  amount: number;
  kind: string;
  riskScore: number;
}

export interface VendorConflictAlert {
  id: string;
  vendorId: string;
  label: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

// ---------- Accounting Document ----------
export type DocumentReviewStatus =

  | "pending"
  | "needsReview"
  | "legalIssue"
  | "accountingIssue"
  | "approved"
  | "returned";

export interface JournalLine {
  id: string;
  account: string;
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

export interface AccountingDocument {
  id: string;
  number: string;
  date: string; // شمسی e.g. "۱۴۰۵/۰۴/۱۵"
  isoDate: string; // "2026-07-06"
  title: string;
  description: string;
  amount: number; // ریال
  vendorId: string;
  organizationUnit: string;
  documentType: string;
  transactionKind: "goodsPurchase" | "servicePurchase" | "contract" | "payroll" | "other";
  riskScore: number;
  status: DocumentReviewStatus;
  assignee: string;
  lines: JournalLine[];
  createdAt: string;
}

// ---------- Evidence ----------
export type EvidenceKind =
  | "purchaseRequest"
  | "purchaseApproval"
  | "priceInquiry"
  | "purchaseOrder"
  | "goodsReceipt"
  | "invoice"
  | "eInvoice"
  | "bankPayment"
  | "contract"
  | "insuranceClearance"
  | "vatCertificate"
  | "other";

export interface EvidenceRequirement {
  id: string;
  kind: EvidenceKind;
  title: string;
  mandatory: boolean;
  rationale: string;
}

export interface Attachment {
  id: string;
  documentId: string;
  filename: string;
  fileType: "pdf" | "image" | "excel" | "word";
  size: number;
  uploadedAt: string;
  ocrConfidence: number; // 0-1
  relevanceScore: number; // 0-1  (نسبت به سند حسابداری)
  detectedKind?: EvidenceKind;
  extractedSummary: string;
}

export interface EvidenceMatch {
  requirementId: string;
  attachmentId?: string;
  status: "present" | "missing" | "weak";
  note?: string;
}

// ---------- Transaction Classification ----------
export interface TransactionClassification {
  documentId: string;
  primaryKind: AccountingDocument["transactionKind"];
  category: string; // "خرید کالای مصرفی"
  subCategory?: string;
  confidence: number;
  rationale: string;
}

// ---------- Knowledge Base ----------
export type KnowledgeSourceStatus = "active" | "needsReview" | "outdated" | "archived";

export interface KnowledgeSource {
  id: string;
  title: string;
  publisher: string;
  category: "tax" | "insurance" | "accountingStandard" | "auditingStandard" | "internal" | "circular";
  versionLabel: string;
  effectiveFrom: string; // شمسی
  effectiveTo?: string; // شمسی or undefined
  pageCount: number;
  status: KnowledgeSourceStatus;
  chunkCount: number;
  lastProcessedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  articleNumber?: string;
  clauseNumber?: string;
  pageNumber: number;
  text: string;
}

export interface KnowledgeCitation {
  id: string;
  sourceId: string;
  sourceTitle: string;
  publisher: string;
  articleNumber?: string;
  clauseNumber?: string;
  pageNumber: number;
  versionLabel: string;
  effectiveFrom: string;
  effectiveTo?: string;
  snippet: string;
}

// ---------- Compliance ----------
export type ComplianceCategory =
  | "tax"
  | "insurance"
  | "accountingStandard"
  | "auditingStandard"
  | "internalControl"
  | "anomaly"
  | "evidenceRelevance";

export interface ComplianceRule {
  id: string;
  title: string;
  description: string;
  category: ComplianceCategory;
  appliesToKinds: AccountingDocument["transactionKind"][];
  amountThreshold?: number; // اگر مبلغ سند > آستانه → applicable
  active: boolean;
  scope: "documentControl" | "auditorEvaluation";
  currentVersionId: string;
}

export interface ComplianceRuleVersion {
  id: string;
  ruleId: string;
  versionLabel: string;
  effectiveFrom: string; // شمسی
  effectiveTo?: string;
  sourceId: string;
  articleNumber?: string;
  clauseNumber?: string;
  pageNumber: number;
}

export type RuleEvaluationStatus =
  | "Applicable"
  | "NotApplicable"
  | "NeedsReview"
  | "Pass"
  | "Fail";
export type EvaluationMode = "Deterministic" | "AI" | "Hybrid";

export interface RuleEvaluation {
  id: string;
  ruleId: string;
  ruleVersionId: string;
  documentId: string;
  status: RuleEvaluationStatus;
  evaluationMode: EvaluationMode;
  confidence: number; // 0..1
  requiresHumanReview: boolean;
  evidenceIds: string[];
  citationIds: string[];
  rationale: string;
  evaluatedAt: string;
}

// ---------- Anomaly ----------
export interface BenchmarkComparison {
  documentAmount: number;
  internalAverage: number;
  internalSampleSize: number;
  marketMin: number;
  marketMax: number;
  deviationPercent: number;
}

export interface AnomalySignal {
  id: string;
  documentId: string;
  kind: "price" | "quantity" | "duplicatePayment" | "roundAmount" | "unusualVendor";
  severity: "low" | "medium" | "high";
  description: string;
  benchmark?: BenchmarkComparison;
}

// ---------- Matching Chain ----------
export type MatchingNodeKind =
  | "purchaseRequest"
  | "priceInquiry"
  | "purchaseOrder"
  | "goodsReceipt"
  | "invoice"
  | "accountingDocument"
  | "bankPayment";

export interface MatchingNode {
  id: string;
  kind: MatchingNodeKind;
  label: string;
  reference?: string;
  date?: string;
  status: "present" | "missing" | "mismatch";
  note?: string;
}

export interface MatchingChain {
  documentId: string;
  nodes: MatchingNode[];
}

// ---------- AI Interpretation / Risk / Finding ----------
export interface AIInterpretation {
  documentId: string;
  summary: string;
  keyPoints: string[];
  citationIds: string[];
  generatedAt: string;
}

export interface RiskScore {
  documentId: string;
  score: number; // 0-100
  band: "low" | "medium" | "high" | "critical";
  contributingFactors: { label: string; weight: number }[];
}

export type FindingStatus =
  | "Suggested"
  | "Confirmed"
  | "Edited"
  | "Dismissed"
  | "NeedsInvestigation"
  | "InRemediation"
  | "Closed";

export interface CorrectiveAction {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "open" | "done";
}

export interface AuditFinding {
  id: string;
  documentId: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  category: ComplianceCategory;
  status: FindingStatus;
  createdBy: "ai" | "auditor";
  rootCause: string;
  auditorSuggestion: string;
  managementResponse?: string;
  correctiveActions: CorrectiveAction[];
  evaluationIds: string[];
  citationIds: string[];
  createdAt: string;
}

// ---------- Audit Trail ----------
export interface AuditTrailEntry {
  id: string;
  entityId: string;
  entityKind: "document" | "finding";
  actor: string;
  action: string;
  detail?: string;
  timestamp: string; // شمسی + ساعت
}

// ---------- Assistant ----------
export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: KnowledgeCitation[];
  createdAt: string;
}

// ---------- Orchestration ----------
export type PipelineStageKey =
  | "TransactionClassification"
  | "EvidenceExtraction"
  | "ApplicableRuleSelection"
  | "ApplicabilityDetermination"
  | "ValidRuleVersionResolution"
  | "RuleEvaluation"
  | "KnowledgeRetrieval"
  | "AIInterpretation"
  | "RiskScoring"
  | "SuggestedAuditFinding";

export interface PipelineStage {
  key: PipelineStageKey;
  label: string;
  status: "pass" | "fail" | "warn" | "info";
  summary: string;
}

export interface OrchestrationResult {
  documentId: string;
  stages: PipelineStage[];
  classification: TransactionClassification;
  evidenceMatches: EvidenceMatch[];
  applicableRuleIds: string[];
  evaluations: RuleEvaluation[];
  citations: KnowledgeCitation[];
  interpretation: AIInterpretation;
  risk: RiskScore;
  suggestedFinding: AuditFinding;
  anomalies: AnomalySignal[];
  matchingChain: MatchingChain;
  ranAt: string;
}

// ---------- Dashboard ----------
export interface DashboardMetrics {
  documentsReviewed: number;
  highRiskDocuments: number;
  incompleteEvidence: number;
  legalIssues: number;
  accountingIssues: number;
  amountAtRisk: number;
  openFindings: number;
  resolvedFindings: number;
  coveragePercent: number;
  riskTrend: { period: string; score: number }[];
  findingsBySeverity: { severity: string; count: number }[];
  findingsByCategory: { category: string; count: number }[];
}

// ---------- System Settings ----------
export interface RiskThresholds {
  lowMax: number;   // 0..lowMax  → low
  mediumMax: number; // lowMax+1..mediumMax → medium; above → high
  autoDismissBelow: number;
}

export interface AISettings {
  model: string;
  temperature: number; // 0..1
  minConfidence: number; // 0..1 — below → requiresHumanReview
  useHybrid: boolean;
}

export interface NotificationSettings {
  emailOnNewFinding: boolean;
  emailOnHighRisk: boolean;
  digestFrequency: "off" | "daily" | "weekly";
}

export interface SystemSettings {
  organizationName: string;
  fiscalYear: string;
  currency: "IRR";
  language: "fa";
  timezone: string;
  risk: RiskThresholds;
  ai: AISettings;
  notifications: NotificationSettings;
  directPurchaseCap: number; // ریال — سقف خرید مستقیم
}

// ---------- Executive KPIs ----------
export interface ExecutiveKPIs {
  totalDocuments: number;
  totalAmountReviewed: number;
  amountAtRisk: number;
  controlCoverage: number; // 0..100
  avgTimeToClose: number;  // days
  slaCompliance: number;   // 0..100
  openFindings: number;
  overdueFindings: number;
  suggestedFindings: number;
  approvedFindings: number;
  riskTrend: { period: string; score: number }[];
  categoryBreakdown: { category: string; count: number; amount: number }[];
  topRiskVendors: { vendorId: string; name: string; riskScore: number; amount: number }[];
  monthlyThroughput: { period: string; reviewed: number; flagged: number }[];
}

// ================= Phase 4 =================

// ---------- Engagements (Audit Planning) ----------
export type EngagementStatus = "Planned" | "InProgress" | "Review" | "Closed";
export type EngagementPriority = "low" | "medium" | "high";

export interface EngagementTask {
  id: string;
  title: string;
  done: boolean;
  assigneeId?: string;
  dueDate?: string;
}

export interface Engagement {
  id: string;
  code: string;                // e.g. ENG-1405-07
  title: string;
  scope: string;               // شرح دامنه
  objective: string;
  status: EngagementStatus;
  priority: EngagementPriority;
  leadAuditorId: string;
  teamIds: string[];
  startDate: string;           // شمسی
  endDate: string;             // شمسی
  progress: number;            // 0..100
  documentIds: string[];       // اسناد در دامنه
  vendorIds: string[];
  tasks: EngagementTask[];
  createdAt: string;
}

// ---------- Integrations ----------
export type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing";
export type IntegrationKind =
  | "erp" | "tax" | "bank" | "email" | "ocr" | "identity" | "storage";

export interface Integration {
  id: string;
  name: string;
  provider: string;
  kind: IntegrationKind;
  status: IntegrationStatus;
  description: string;
  lastSyncAt?: string;
  itemsSynced?: number;
  nextSyncAt?: string;
  configFields: { key: string; label: string; masked?: boolean; value?: string }[];
  events?: { at: string; message: string; level: "info" | "warn" | "error" }[];
}

// ---------- Notifications / Inbox ----------
export type NotificationLevel = "info" | "warn" | "critical";
export type NotificationChannel = "app" | "email" | "sms";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  level: NotificationLevel;
  channels: NotificationChannel[];
  createdAt: string;
  read: boolean;
  link?: { label: string; to: string };
  category: "finding" | "document" | "vendor" | "system" | "engagement" | "integration";
}

// ---------- Assistant Threads (Phase 4) ----------
export interface AssistantThread {
  id: string;
  title: string;
  createdAt: string;
  messages: AssistantMessage[];
  documentId?: string;         // scope, optional
}

// ---------- Audit Runs (Phase 5) ----------
export type AuditRunKind = "realtime" | "historical";
export type AuditRunStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

export type AuditRunStageId =
  | "scope"
  | "retrieval"
  | "attachment"
  | "ocr"
  | "classification"
  | "applicability"
  | "ruleVersion"
  | "ruleEvaluation"
  | "anomaly"
  | "risk"
  | "findings"
  | "finalization";

export type RuleVersionMode =
  | "historical" // نسخه معتبر در تاریخ سند (default)
  | "latest"     // آخرین نسخه فعال
  | "compare";   // مقایسه هر دو

export interface AuditRunScope {
  companyId: string;
  companyName: string;
  unit: string;
  fiscalYear: string;
  dateFrom: string;
  dateTo: string;
  documentTypes: string[];
  amountMin?: number;
  amountMax?: number;
  vendorIds: string[];
  accountCodes: string[];
  costCenters: string[];
  ruleIds: string[];
  ruleVersionMode: RuleVersionMode;
  parallelism: number;
  aiConfidenceMin: number;
  stopOnErrorRate: number;
}

export interface AuditRunItemBrief {
  id: string;
  documentNumber: string;
  status: "queued" | "inProgress" | "clean" | "highRisk" | "failed";
  amount: number;
  riskScore?: number;
  stage?: AuditRunStageId;
}

export interface AuditRunEvent {
  id: string;
  at: number;             // ms epoch
  level: "info" | "warn" | "error" | "success";
  documentNumber?: string;
  stage?: AuditRunStageId;
  message: string;
}

export interface AuditRunStage {
  id: AuditRunStageId;
  label: string;
  status: "pending" | "active" | "done";
  startedAt?: number;
  finishedAt?: number;
}

export interface AuditRunCheckpoint {
  id: string;
  at: number;
  progress: number;         // 0..1
  processed: number;
  message: string;
}

export interface AuditRunError {
  id: string;
  at: number;
  documentNumber?: string;
  stage?: AuditRunStageId;
  message: string;
  retriable: boolean;
}

export interface AuditRunSummary {
  totalDocuments: number;
  processed: number;
  clean: number;
  highRisk: number;
  failed: number;
  amountAtRisk: number;
  findingsCreated: number;
  durationMs: number;
}

export interface AuditRun {
  id: string;
  name: string;
  kind: AuditRunKind;
  status: AuditRunStatus;
  scope: AuditRunScope;
  totalDocuments: number;
  startedAt: number;              // ms epoch
  estimatedDurationMs: number;    // simulated duration
  totalPausedMs: number;
  pausedAt?: number;
  finishedAt?: number;
  progress: number;               // 0..1 (derived, but persisted for cheap reads)
  currentStage: AuditRunStageId;
  stages: AuditRunStage[];
  items: AuditRunItemBrief[];
  events: AuditRunEvent[];        // capped rolling log
  checkpoints: AuditRunCheckpoint[];
  errors: AuditRunError[];
  summary?: AuditRunSummary;
  createdBy: string;
  createdAt: number;
}
