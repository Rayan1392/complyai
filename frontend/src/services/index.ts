// Service interfaces + mock implementations + factory for «دیدبان حسابرسی».
// UI never imports Mock* directly — it calls `services.<name>` from this file.
// To swap in real HTTP services, replace the factory bindings below.

import type {
  AccountingDocument,
  AIInterpretation,
  AnomalySignal,
  AssistantMessage,
  Attachment,
  AuditFinding,
  AuditTrailEntry,
  ComplianceRule,
  ComplianceRuleVersion,
  CorrectiveAction,
  DashboardMetrics,
  EvidenceMatch,
  EvidenceRequirement,
  FindingStatus,
  KnowledgeCitation,
  KnowledgeSource,
  KnowledgeSourceStatus,
  MatchingChain,
  OrchestrationResult,
  PipelineStage,
  RiskScore,
  RuleEvaluation,
  TransactionClassification,
  User,
  Vendor,
} from "@/types/domain";

import {
  anomalies,
  attachments,
  citations,
  complianceRules,
  dashboardMetrics,
  documents,
  evidenceRequirements,
  initialFindings,
  knowledgeSources,
  matchingChains,
  mockUser,
  ruleVersions,
  seedAuditTrail,
  vendors,
} from "@/services/mockData";

const delay = (ms = 250) => new Promise<void>((r) => setTimeout(r, ms));

// ============================================================
// Interfaces
// ============================================================

export interface AuthService {
  login(username: string, password: string): Promise<User>;
  currentUser(): User | null;
  logout(): void;
}

export interface DashboardService {
  getMetrics(): Promise<DashboardMetrics>;
}

export interface AccountingDocumentService {
  list(): Promise<AccountingDocument[]>;
  get(id: string): Promise<AccountingDocument>;
  getAttachments(documentId: string): Promise<Attachment[]>;
  updateStatus(id: string, status: AccountingDocument["status"]): Promise<void>;
}

export interface EvidenceService {
  getRequirements(kind: AccountingDocument["transactionKind"]): Promise<EvidenceRequirement[]>;
  matchForDocument(documentId: string): Promise<EvidenceMatch[]>;
}

export interface ComplianceService {
  listRules(): Promise<ComplianceRule[]>;
  getRule(id: string): Promise<ComplianceRule>;
  listVersions(ruleId: string): Promise<ComplianceRuleVersion[]>;
}

export interface FindingService {
  list(): Promise<AuditFinding[]>;
  get(id: string): Promise<AuditFinding | undefined>;
  listForDocument(documentId: string): Promise<AuditFinding[]>;
  updateStatus(id: string, status: FindingStatus, actor: string): Promise<AuditFinding>;
  setManagementResponse(id: string, response: string, actor: string): Promise<AuditFinding>;
  addCorrectiveAction(
    id: string,
    action: Omit<CorrectiveAction, "id" | "status">,
    actor: string,
  ): Promise<AuditFinding>;
  toggleCorrectiveAction(findingId: string, actionId: string, actor: string): Promise<AuditFinding>;
}

export interface VendorService {
  list(): Promise<Vendor[]>;
  get(id: string): Promise<Vendor>;
}

export interface KnowledgeSourceVersion {
  id: string;
  sourceId: string;
  versionLabel: string;
  effectiveFrom: string;
  effectiveTo?: string;
  pageCount: number;
  isCurrent: boolean;
}

export interface KnowledgeSourceInput {
  title: string;
  publisher: string;
  category: KnowledgeSource["category"];
  versionLabel: string;
  effectiveFrom: string;
  pageCount: number;
  ingestMode: "upload" | "url" | "crawl";
  sourceRef?: string; // filename or URL
}

export interface KnowledgeService {
  listSources(): Promise<KnowledgeSource[]>;
  getSource(id: string): Promise<KnowledgeSource>;
  getCitation(id: string): Promise<KnowledgeCitation | undefined>;
  listCitations(): Promise<KnowledgeCitation[]>;
  addSource(input: KnowledgeSourceInput): Promise<KnowledgeSource>;
  reprocess(id: string): Promise<KnowledgeSource>;
  remove(id: string): Promise<void>;
  listVersions(sourceId: string): Promise<KnowledgeSourceVersion[]>;
}

export interface MonitoringRun {
  id: string;
  ranAt: string;
  totalDocuments: number;
  highRiskCount: number;
  failCount: number;
  suggestedFindings: number;
  items: {
    documentId: string;
    documentNumber: string;
    documentTitle: string;
    riskScore: number;
    band: RiskScore["band"];
    failedRules: number;
    suggestedFindingId?: string;
  }[];
}

export interface MonitoringService {
  runBatch(): Promise<MonitoringRun>;
  lastRun(): MonitoringRun | null;
}

export interface DocumentComplianceReport {
  document: AccountingDocument;
  vendor?: Vendor;
  result: OrchestrationResult;
  generatedAt: string;
}

export interface ReportsService {
  buildDocumentReport(documentId: string): Promise<DocumentComplianceReport>;
  findingsCsv(): Promise<string>;
  documentsCsv(): Promise<string>;
}

export interface ComplianceOrchestrationService {
  evaluateDocument(documentId: string): Promise<OrchestrationResult>;
}

export interface AuditTrailService {
  listForDocument(documentId: string): Promise<AuditTrailEntry[]>;
  append(entry: Omit<AuditTrailEntry, "id" | "timestamp">): Promise<AuditTrailEntry>;
}

export interface AuditAssistantService {
  ask(documentId: string, question: string): Promise<AssistantMessage>;
  suggestedQuestions(documentId: string): Promise<string[]>;
}

// ============================================================
// In-memory state (mock)
// ============================================================

const findingsState: AuditFinding[] = [...initialFindings];
const trailState: AuditTrailEntry[] = [...seedAuditTrail];

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowStamp() {
  // شمسی نمای نمایشی — برای Mock کافی است
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `۱۴۰۵/۰۴/۲۰ ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============================================================
// Mock Implementations
// ============================================================

const AUTH_KEY = "didban-auth";

export class MockAuthService implements AuthService {
  async login(username: string, password: string): Promise<User> {
    await delay(600);
    if (username !== "auditor" || password !== "Audit@1405") {
      throw new Error("نام کاربری یا رمز عبور نادرست است.");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
    }
    return mockUser;
  }
  currentUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }
  logout(): void {
    if (typeof window !== "undefined") window.localStorage.removeItem(AUTH_KEY);
  }
}

export class MockDashboardService implements DashboardService {
  async getMetrics() {
    await delay();
    return dashboardMetrics;
  }
}

export class MockAccountingDocumentService implements AccountingDocumentService {
  async list() {
    await delay();
    return documents;
  }
  async get(id: string) {
    await delay();
    const d = documents.find((x) => x.id === id);
    if (!d) throw new Error("سند یافت نشد.");
    return d;
  }
  async getAttachments(documentId: string) {
    await delay();
    return attachments.filter((a) => a.documentId === documentId);
  }
  async updateStatus(id: string, status: AccountingDocument["status"]) {
    await delay(150);
    const d = documents.find((x) => x.id === id);
    if (d) d.status = status;
  }
}

export class MockEvidenceService implements EvidenceService {
  async getRequirements(kind: AccountingDocument["transactionKind"]) {
    await delay(150);
    // خرید ساده کالا: بدون الزام بیمه/قرارداد
    return evidenceRequirements;
  }
  async matchForDocument(documentId: string): Promise<EvidenceMatch[]> {
    await delay(150);
    const atts = attachments.filter((a) => a.documentId === documentId);
    const matches: EvidenceMatch[] = evidenceRequirements.map((req) => {
      const att = atts.find((a) => a.detectedKind === req.kind);
      if (!att) return { requirementId: req.id, status: "missing" };
      if (att.relevanceScore < 0.4)
        return {
          requirementId: req.id,
          attachmentId: att.id,
          status: "weak",
          note: "ارتباط معنایی ضعیف",
        };
      return { requirementId: req.id, attachmentId: att.id, status: "present" };
    });
    return matches;
  }
}

export class MockComplianceService implements ComplianceService {
  async listRules() {
    await delay();
    return complianceRules;
  }
  async getRule(id: string) {
    await delay();
    const r = complianceRules.find((x) => x.id === id);
    if (!r) throw new Error("قانون یافت نشد.");
    return r;
  }
  async listVersions(ruleId: string) {
    await delay();
    return ruleVersions.filter((v) => v.ruleId === ruleId);
  }
}

export class MockFindingService implements FindingService {
  async list() {
    await delay();
    return findingsState;
  }
  async get(id: string) {
    await delay();
    return findingsState.find((f) => f.id === id);
  }
  async listForDocument(documentId: string) {
    await delay();
    return findingsState.filter((f) => f.documentId === documentId);
  }
  async updateStatus(id: string, status: FindingStatus, actor: string) {
    await delay(150);
    const f = findingsState.find((x) => x.id === id);
    if (!f) throw new Error("یافته موجود نیست.");
    f.status = status;
    trailState.push({
      id: newId("at"),
      entityId: f.documentId,
      entityKind: "finding",
      actor,
      action: `تغییر وضعیت یافته به «${status}»`,
      detail: f.title,
      timestamp: nowStamp(),
    });
    return f;
  }
  async setManagementResponse(id: string, response: string, actor: string) {
    await delay(150);
    const f = findingsState.find((x) => x.id === id);
    if (!f) throw new Error("یافته موجود نیست.");
    f.managementResponse = response;
    trailState.push({
      id: newId("at"),
      entityId: f.documentId,
      entityKind: "finding",
      actor,
      action: "ثبت پاسخ مدیریت",
      detail: f.title,
      timestamp: nowStamp(),
    });
    return f;
  }
  async addCorrectiveAction(
    id: string,
    action: Omit<CorrectiveAction, "id" | "status">,
    actor: string,
  ) {
    await delay(150);
    const f = findingsState.find((x) => x.id === id);
    if (!f) throw new Error("یافته موجود نیست.");
    const ca: CorrectiveAction = { ...action, id: newId("ca"), status: "open" };
    f.correctiveActions = [...f.correctiveActions, ca];
    trailState.push({
      id: newId("at"),
      entityId: f.documentId,
      entityKind: "finding",
      actor,
      action: "افزودن اقدام اصلاحی",
      detail: ca.title,
      timestamp: nowStamp(),
    });
    return f;
  }
  async toggleCorrectiveAction(findingId: string, actionId: string, actor: string) {
    await delay(120);
    const f = findingsState.find((x) => x.id === findingId);
    if (!f) throw new Error("یافته موجود نیست.");
    f.correctiveActions = f.correctiveActions.map((a) =>
      a.id === actionId ? { ...a, status: a.status === "open" ? "done" : "open" } : a,
    );
    const a = f.correctiveActions.find((x) => x.id === actionId);
    trailState.push({
      id: newId("at"),
      entityId: f.documentId,
      entityKind: "finding",
      actor,
      action: `تغییر وضعیت اقدام اصلاحی به «${a?.status === "done" ? "انجام‌شده" : "باز"}»`,
      detail: a?.title,
      timestamp: nowStamp(),
    });
    return f;
  }
  _upsert(finding: AuditFinding) {
    const idx = findingsState.findIndex((f) => f.id === finding.id);
    if (idx >= 0) {
      // preserve auditor-added fields when orchestrator re-runs
      const prev = findingsState[idx];
      findingsState[idx] = {
        ...finding,
        status: prev.status !== "Suggested" ? prev.status : finding.status,
        managementResponse: prev.managementResponse ?? finding.managementResponse,
        correctiveActions: prev.correctiveActions.length
          ? prev.correctiveActions
          : finding.correctiveActions,
      };
    } else findingsState.push(finding);
  }
}

export class MockVendorService implements VendorService {
  async list() {
    await delay();
    return vendors;
  }
  async get(id: string) {
    await delay();
    const v = vendors.find((x) => x.id === id);
    if (!v) throw new Error("فروشنده یافت نشد.");
    return v;
  }
}

const kbVersionsState: Record<string, KnowledgeSourceVersion[]> = {};

function seedVersionsFor(s: KnowledgeSource): KnowledgeSourceVersion[] {
  return [
    {
      id: newId("kv"),
      sourceId: s.id,
      versionLabel: s.versionLabel,
      effectiveFrom: s.effectiveFrom,
      effectiveTo: s.effectiveTo,
      pageCount: s.pageCount,
      isCurrent: true,
    },
  ];
}

export class MockKnowledgeService implements KnowledgeService {
  async listSources() {
    await delay();
    return knowledgeSources;
  }
  async getSource(id: string) {
    await delay();
    const s = knowledgeSources.find((x) => x.id === id);
    if (!s) throw new Error("منبع یافت نشد.");
    return s;
  }
  async getCitation(id: string) {
    await delay(80);
    return citations.find((c) => c.id === id);
  }
  async listCitations() {
    await delay(80);
    return citations;
  }
  async addSource(input: KnowledgeSourceInput) {
    await delay(300);
    const s: KnowledgeSource = {
      id: newId("ks"),
      title: input.title,
      publisher: input.publisher,
      category: input.category,
      versionLabel: input.versionLabel,
      effectiveFrom: input.effectiveFrom,
      pageCount: input.pageCount,
      status: "needsReview",
      chunkCount: 0,
      lastProcessedAt: "—",
    };
    knowledgeSources.push(s);
    trailState.push({
      id: newId("at"),
      entityId: s.id,
      entityKind: "document",
      actor: "علی محمدی",
      action: `افزودن منبع دانش (${input.ingestMode === "upload" ? "بارگذاری فایل" : input.ingestMode === "url" ? "URL" : "Crawl"})`,
      detail: `${s.title} — ${input.sourceRef ?? ""}`,
      timestamp: nowStamp(),
    });
    return s;
  }
  async reprocess(id: string) {
    await delay(600);
    const s = knowledgeSources.find((x) => x.id === id);
    if (!s) throw new Error("منبع یافت نشد.");
    // simulate chunking + embeddings
    s.chunkCount = Math.max(s.chunkCount, Math.round(s.pageCount * 4.2));
    s.status = "active";
    s.lastProcessedAt = nowStamp();
    trailState.push({
      id: newId("at"),
      entityId: s.id,
      entityKind: "document",
      actor: "سیستم",
      action: "پردازش مجدد منبع دانش (Chunk + Embedding)",
      detail: `${s.chunkCount} chunk`,
      timestamp: nowStamp(),
    });
    return s;
  }
  async remove(id: string) {
    await delay(150);
    const idx = knowledgeSources.findIndex((x) => x.id === id);
    if (idx >= 0) knowledgeSources.splice(idx, 1);
    delete kbVersionsState[id];
  }
  async listVersions(sourceId: string) {
    await delay(80);
    if (!kbVersionsState[sourceId]) {
      const s = knowledgeSources.find((x) => x.id === sourceId);
      kbVersionsState[sourceId] = s ? seedVersionsFor(s) : [];
    }
    return kbVersionsState[sourceId];
  }
}

export class MockAuditTrailService implements AuditTrailService {
  async listForDocument(documentId: string) {
    await delay(100);
    return trailState.filter((t) => t.entityId === documentId);
  }
  async append(entry: Omit<AuditTrailEntry, "id" | "timestamp">) {
    const full: AuditTrailEntry = { ...entry, id: newId("at"), timestamp: nowStamp() };
    trailState.push(full);
    return full;
  }
}

export class MockAuditAssistantService implements AuditAssistantService {
  async suggestedQuestions(_documentId: string) {
    await delay(100);
    return [
      "چرا این سند پرریسک ارزیابی شده است؟",
      "کدام کنترل‌های قانونی نقض شده‌اند؟",
      "قیمت این خرید چگونه با بازار مقایسه می‌شود؟",
      "چه مدارک پشتیبانی مفقود است؟",
    ];
  }

  async ask(_documentId: string, question: string): Promise<AssistantMessage> {
    await delay(500);
    const q = question.trim();
    const pick = (ids: string[]) => citations.filter((c) => ids.includes(c.id));
    let text = "";
    let cites: KnowledgeCitation[] = [];

    if (/قیمت|بازار|بنچمارک/.test(q)) {
      text =
        "قیمت این خرید حدود ۱۸۲٪ بالاتر از میانگین شش خرید داخلی مشابه و بازه معمول بازار است. علاوه بر این، مبلغ ۲٬۴۰۰٬۰۰۰٬۰۰۰ ریال از سقف خرید مستقیم بدون استعلام (۱٬۵۰۰٬۰۰۰٬۰۰۰ ریال) طبق آیین‌نامه معاملات داخلی شرکت عبور کرده است.";
      cites = pick(["ct-internal-12"]);
    } else if (/مدرک|مستند|شواهد|ضمیمه/.test(q)) {
      text =
        "صورتحساب الکترونیکی معتبر در سامانه مؤدیان یافت نشد و فایل فاکتور بارگذاری‌شده از نظر معنایی به موضوع سند مرتبط نیست (شامل اقلام لپ‌تاپ). طبق استاندارد حسابرسی ۵۰۰، این شواهد فاقد کفایت و قابلیت اتکای لازم هستند.";
      cites = pick(["ct-vat-19", "ct-audit-500"]);
    } else if (/قانون|نقض|کنترل/.test(q)) {
      text =
        "دو کنترل Fail شده‌اند: (۱) نبود صورتحساب الکترونیکی معتبر در سامانه مؤدیان طبق مادهٔ ۱۹ ق.م.ب.ا.ک، (۲) عبور از سقف خرید مستقیم طبق مادهٔ ۱۲ آیین‌نامه معاملات داخلی. کنترل مادهٔ ۳۸ تأمین اجتماعی برای این نوع تراکنش (خرید کالا) قابل اعمال نیست.";
      cites = pick(["ct-vat-19", "ct-internal-12"]);
    } else {
      text =
        "این سند از سه جهت پرریسک است: قیمت غیرعادی، مدرک الزامی مفقود و یک ضمیمه با ارتباط ضعیف. جزئیات و منابع در تب‌های انطباق و ناهنجاری قابل مشاهده است.";
      cites = pick(["ct-internal-12", "ct-vat-19", "ct-audit-500"]);
    }

    return {
      id: newId("am"),
      role: "assistant",
      text,
      citations: cites,
      createdAt: nowStamp(),
    };
  }
}

// ============================================================
// Compliance Orchestration
// ============================================================

function isApplicable(rule: ComplianceRule, doc: AccountingDocument): RuleEvaluationStatus {
  if (!rule.appliesToKinds.includes(doc.transactionKind)) return "NotApplicable";
  if (rule.amountThreshold !== undefined && doc.amount <= rule.amountThreshold) {
    // برای سقف خرید: زیر آستانه یعنی مشمول نیست
    if (rule.id === "r-internal-cap") return "NotApplicable";
  }
  return "Applicable";
}

function findVersionAt(ruleId: string, isoDate: string): ComplianceRuleVersion | undefined {
  const matching = ruleVersions
    .filter((v) => v.ruleId === ruleId)
    .filter((v) => v.effectiveFrom <= toShamsi(isoDate));
  return matching.at(-1);
}

function toShamsi(_iso: string): string {
  // Mock: تمام نسخه‌ها قبل از تاریخ سند نمونه هستند
  return "۱۴۰۵/۰۴/۱۵";
}

type RuleEvaluationStatus = RuleEvaluation["status"];

export class MockComplianceOrchestrationService implements ComplianceOrchestrationService {
  constructor(private findingService: MockFindingService, private trail: AuditTrailService) {}

  async evaluateDocument(documentId: string): Promise<OrchestrationResult> {
    await delay(400);

    const doc = documents.find((d) => d.id === documentId);
    if (!doc) throw new Error("سند یافت نشد.");

    // 1) Transaction Classification
    const classification: TransactionClassification = {
      documentId,
      primaryKind: doc.transactionKind,
      category:
        doc.transactionKind === "contract"
          ? "قرارداد پیمانکاری خدمات"
          : doc.transactionKind === "servicePurchase"
            ? "خرید خدمات"
            : "خرید کالای مصرفی",
      confidence: 0.94,
      rationale: "تحلیل شرح سند و سرفصل حساب بستانکار → طبقه‌بندی تعیین شد.",
    };

    // 2) Evidence Extraction / Match
    const evidenceMatches: EvidenceMatch[] = evidenceRequirements.map((req) => {
      const att = attachments.find(
        (a) => a.documentId === documentId && a.detectedKind === req.kind,
      );
      if (!att) return { requirementId: req.id, status: "missing" };
      if (att.relevanceScore < 0.4)
        return {
          requirementId: req.id,
          attachmentId: att.id,
          status: "weak",
          note: "ارتباط معنایی ضعیف",
        };
      return { requirementId: req.id, attachmentId: att.id, status: "present" };
    });

    // 3) Applicable Rule Selection (کاندید اولیه: همه فعال‌ها)
    const candidates = complianceRules.filter((r) => r.active);
    const applicableRuleIds: string[] = [];

    // 4) Applicability Determination + 5) Version Resolution + 6) Rule Evaluation
    const evaluations: RuleEvaluation[] = [];
    const usedCitationIds = new Set<string>();

    for (const rule of candidates) {
      const applicability = isApplicable(rule, doc);
      const version = findVersionAt(rule.id, doc.isoDate);
      if (!version) continue;
      const citation = citations.find((c) => c.sourceId === version.sourceId);
      const citationIds = citation ? [citation.id] : [];
      const evidenceIds = attachments.filter((a) => a.documentId === documentId).map((a) => a.id);

      if (applicability === "NotApplicable") {
        evaluations.push({
          id: newId("ev"),
          ruleId: rule.id,
          ruleVersionId: version.id,
          documentId,
          status: "NotApplicable",
          evaluationMode: "Deterministic",
          confidence: 0.99,
          requiresHumanReview: false,
          evidenceIds,
          citationIds,
          rationale:
            rule.id === "r-ss-38"
              ? "این تراکنش یک خرید ساده کالا است و مشمول مادهٔ ۳۸ (قراردادهای پیمانکاری) نمی‌شود."
              : `مبلغ سند از آستانه اعمال قانون کمتر است.`,
          evaluatedAt: nowStamp(),
        });
        continue;
      }

      applicableRuleIds.push(rule.id);
      citation && usedCitationIds.add(citation.id);

      // Scenario-specific evaluation
      let status: RuleEvaluationStatus = "Pass";
      let rationale = "کنترل با موفقیت انجام شد.";
      let mode: RuleEvaluation["evaluationMode"] = "Deterministic";
      let confidence = 0.9;
      let requiresHumanReview = false;

      if (rule.id === "r-vat-einvoice") {
        status = "Fail";
        rationale =
          "صورتحساب الکترونیکی معتبر با شماره منحصربه‌فرد مالیاتی در سامانه مؤدیان یافت نشد یا توسط خریدار تأیید نشده است.";
        mode = "Hybrid";
        confidence = 0.88;
      } else if (rule.id === "r-internal-cap") {
        status = "Fail";
        rationale = `مبلغ سند (۲٬۴۰۰٬۰۰۰٬۰۰۰ ریال) از سقف خرید مستقیم شرکت (۱٬۵۰۰٬۰۰۰٬۰۰۰ ریال) عبور کرده و استعلام رقابتی صورت نگرفته است.`;
        confidence = 0.97;
      } else if (rule.id === "r-acc-8") {
        status = "Pass";
        rationale = "طبقه‌بندی هزینه در سرفصل «تبلیغات و روابط عمومی» مطابق استاندارد است.";
        confidence = 0.92;
      } else if (rule.id === "r-audit-500") {
        status = "NeedsReview";
        rationale =
          "شواهد جمع‌آوری‌شده از نظر کفایت و قابلیت اتکا نیازمند بررسی حسابرس هستند (فاکتور با ارتباط ضعیف، فقدان صورتحساب الکترونیکی معتبر).";
        mode = "AI";
        confidence = 0.72;
        requiresHumanReview = true;
      }

      evaluations.push({
        id: newId("ev"),
        ruleId: rule.id,
        ruleVersionId: version.id,
        documentId,
        status,
        evaluationMode: mode,
        confidence,
        requiresHumanReview,
        evidenceIds,
        citationIds,
        rationale,
        evaluatedAt: nowStamp(),
      });
    }

    // 7) Knowledge Retrieval
    const usedCitations = citations.filter((c) => usedCitationIds.has(c.id));

    // 8) AI Interpretation
    const interpretation: AIInterpretation = {
      documentId,
      summary:
        "خرید ۴۰۰ شاخه گل رز به مبلغ ۲٫۴ میلیارد ریال، از منظر قیمت (~‏+‏۱۸۲٪ بالاتر از میانگین)، مدارک الزامی (فقدان صورتحساب الکترونیکی معتبر) و کنترل داخلی (عبور از سقف خرید مستقیم) پرریسک است. یک ضمیمه با محتوای نامرتبط نیز شواهد را از نظر قابلیت اتکا تضعیف می‌کند.",
      keyPoints: [
        "قیمت شاخه گل حدود ۶ برابر میانگین داخلی است.",
        "صورتحساب الکترونیکی معتبر در سامانه مؤدیان یافت نشد.",
        "استعلام رقابتی برای مبلغ بالای سقف انجام نشده است.",
        "یک فایل ضمیمه با ارتباط معنایی ضعیف (اقلام لپ‌تاپ) کشف شد.",
      ],
      citationIds: usedCitations.map((c) => c.id),
      generatedAt: nowStamp(),
    };

    // 9) Risk Scoring
    const risk: RiskScore = {
      documentId,
      score: doc.riskScore,
      band: doc.riskScore >= 80 ? "critical" : doc.riskScore >= 60 ? "high" : "medium",
      contributingFactors: [
        { label: "انحراف قیمت", weight: 40 },
        { label: "کنترل داخلی نقض‌شده", weight: 25 },
        { label: "مدرک مالیاتی مفقود", weight: 20 },
        { label: "ضمیمه با ارتباط ضعیف", weight: 15 },
      ],
    };

    // 10) Suggested Audit Finding
    const failed = evaluations.filter((e) => e.status === "Fail");
    const suggestedFinding: AuditFinding = {
      id: `f-${documentId}`,
      documentId,
      title: "خرید گلستان پارس با انحراف قیمت شدید و فقدان کنترل‌های الزامی",
      severity: "high",
      category: "anomaly",
      status: "Suggested",
      createdBy: "ai",
      rootCause:
        "خرید بدون طی فرآیند رقابتی و بدون دریافت صورتحساب الکترونیکی معتبر، همراه با انحراف چشمگیر قیمت نسبت به سوابق داخلی.",
      auditorSuggestion:
        "استرداد مبلغ مازاد از فروشنده، اخذ صورتحساب الکترونیکی معتبر یا کسر مالیات علی‌الرأس، بازنگری فرآیند خرید تشریفاتی و اعمال آموزش کنترل داخلی برای واحد روابط عمومی.",
      correctiveActions: [],
      evaluationIds: failed.map((e) => e.id),
      citationIds: usedCitations.map((c) => c.id),
      createdAt: nowStamp(),
    };
    this.findingService._upsert(suggestedFinding);

    // Anomalies + Matching Chain
    const anoms = anomalies.filter((a) => a.documentId === documentId);
    const chain =
      matchingChains[documentId] ?? {
        documentId,
        nodes: [],
      };

    // Pipeline stages
    const stages: PipelineStage[] = [
      {
        key: "TransactionClassification",
        label: "طبقه‌بندی تراکنش",
        status: "pass",
        summary: classification.category,
      },
      {
        key: "EvidenceExtraction",
        label: "استخراج شواهد",
        status: evidenceMatches.some((m) => m.status === "missing")
          ? "warn"
          : evidenceMatches.some((m) => m.status === "weak")
            ? "warn"
            : "pass",
        summary: `${evidenceMatches.filter((m) => m.status === "present").length} از ${evidenceMatches.length} مدرک موجود`,
      },
      {
        key: "ApplicableRuleSelection",
        label: "انتخاب قوانین کاندید",
        status: "info",
        summary: `${candidates.length} قانون کاندید`,
      },
      {
        key: "ApplicabilityDetermination",
        label: "تعیین قابلیت اعمال",
        status: "info",
        summary: `${applicableRuleIds.length} قابل اعمال / ${candidates.length - applicableRuleIds.length} غیرمرتبط`,
      },
      {
        key: "ValidRuleVersionResolution",
        label: "resolveٔ نسخه معتبر قانون",
        status: "pass",
        summary: `بر اساس تاریخ ${doc.date}`,
      },
      {
        key: "RuleEvaluation",
        label: "ارزیابی قوانین",
        status: failed.length ? "fail" : "pass",
        summary: `${failed.length} Fail / ${evaluations.filter((e) => e.status === "Pass").length} Pass / ${evaluations.filter((e) => e.status === "NeedsReview").length} NeedsReview`,
      },
      {
        key: "KnowledgeRetrieval",
        label: "بازیابی از پایگاه دانش",
        status: "pass",
        summary: `${usedCitations.length} Citation`,
      },
      {
        key: "AIInterpretation",
        label: "تفسیر هوشمند",
        status: "info",
        summary: "خلاصهٔ AI با استناد",
      },
      {
        key: "RiskScoring",
        label: "امتیازدهی ریسک",
        status: risk.band === "critical" || risk.band === "high" ? "fail" : "warn",
        summary: `امتیاز ${risk.score} — ${risk.band}`,
      },
      {
        key: "SuggestedAuditFinding",
        label: "پیشنهاد یافتهٔ حسابرسی",
        status: "warn",
        summary: "یافته با وضعیت Suggested تولید شد",
      },
    ];

    await this.trail.append({
      entityId: documentId,
      entityKind: "document",
      actor: "دیدبان حسابرسی",
      action: "اجرای ارکستراتور انطباق",
      detail: `تولید یافتهٔ Suggested و ${failed.length} کنترل Fail`,
    });

    return {
      documentId,
      stages,
      classification,
      evidenceMatches,
      applicableRuleIds,
      evaluations,
      citations: usedCitations,
      interpretation,
      risk,
      suggestedFinding,
      anomalies: anoms,
      matchingChain: chain,
      ranAt: nowStamp(),
    };
  }
}

// ============================================================
// Monitoring (Continuous Controls)
// ============================================================

let lastMonitoringRun: MonitoringRun | null = null;

export class MockMonitoringService implements MonitoringService {
  constructor(private orch: ComplianceOrchestrationService) {}
  async runBatch(): Promise<MonitoringRun> {
    const items: MonitoringRun["items"] = [];
    let failCount = 0;
    let highRisk = 0;
    let suggested = 0;
    for (const doc of documents) {
      const r = await this.orch.evaluateDocument(doc.id);
      const failed = r.evaluations.filter((e) => e.status === "Fail").length;
      failCount += failed;
      if (r.risk.band === "high" || r.risk.band === "critical") highRisk += 1;
      if (r.suggestedFinding) suggested += 1;
      items.push({
        documentId: doc.id,
        documentNumber: doc.number,
        documentTitle: doc.title,
        riskScore: r.risk.score,
        band: r.risk.band,
        failedRules: failed,
        suggestedFindingId: r.suggestedFinding?.id,
      });
    }
    lastMonitoringRun = {
      id: newId("mr"),
      ranAt: nowStamp(),
      totalDocuments: documents.length,
      highRiskCount: highRisk,
      failCount,
      suggestedFindings: suggested,
      items,
    };
    return lastMonitoringRun;
  }
  lastRun() {
    return lastMonitoringRun;
  }
}

// ============================================================
// Reports
// ============================================================

export class MockReportsService implements ReportsService {
  constructor(private orch: ComplianceOrchestrationService) {}
  async buildDocumentReport(documentId: string): Promise<DocumentComplianceReport> {
    const doc = documents.find((d) => d.id === documentId);
    if (!doc) throw new Error("سند یافت نشد.");
    const result = await this.orch.evaluateDocument(documentId);
    const vendor = vendors.find((v) => v.id === doc.vendorId);
    return { document: doc, vendor, result, generatedAt: nowStamp() };
  }
  async findingsCsv() {
    await delay(100);
    const header = ["شناسه", "عنوان", "شدت", "دسته", "وضعیت", "ایجادکننده", "تاریخ", "سند"];
    const rows = findingsState.map((f) => {
      const d = documents.find((x) => x.id === f.documentId);
      return [
        f.id,
        f.title.replace(/,/g, "،"),
        f.severity,
        f.category,
        f.status,
        f.createdBy,
        f.createdAt,
        `${d?.number ?? ""} — ${(d?.title ?? "").replace(/,/g, "،")}`,
      ].join(",");
    });
    return "\uFEFF" + [header.join(","), ...rows].join("\n");
  }
  async documentsCsv() {
    await delay(100);
    const header = ["شماره", "تاریخ", "عنوان", "مبلغ (ریال)", "فروشنده", "امتیاز ریسک", "وضعیت"];
    const rows = documents.map((d) => {
      const v = vendors.find((x) => x.id === d.vendorId);
      return [
        d.number,
        d.date,
        d.title.replace(/,/g, "،"),
        d.amount,
        v?.name ?? "",
        d.riskScore,
        d.status,
      ].join(",");
    });
    return "\uFEFF" + [header.join(","), ...rows].join("\n");
  }
}

// ============================================================
// Factory
// ============================================================

const _finding = new MockFindingService();
const _trail = new MockAuditTrailService();
const _orch = new MockComplianceOrchestrationService(_finding, _trail);

export const services = {
  auth: new MockAuthService() as AuthService,
  dashboard: new MockDashboardService() as DashboardService,
  documents: new MockAccountingDocumentService() as AccountingDocumentService,
  evidence: new MockEvidenceService() as EvidenceService,
  compliance: new MockComplianceService() as ComplianceService,
  findings: _finding as FindingService,
  vendors: new MockVendorService() as VendorService,
  knowledge: new MockKnowledgeService() as KnowledgeService,
  orchestration: _orch as ComplianceOrchestrationService,
  trail: _trail as AuditTrailService,
  assistant: new MockAuditAssistantService() as AuditAssistantService,
  monitoring: new MockMonitoringService(_orch) as MonitoringService,
  reports: new MockReportsService(_orch) as ReportsService,
  users: null as unknown as UserService,
  settings: null as unknown as SettingsService,
  executive: null as unknown as ExecutiveService,
  vendorExtras: null as unknown as typeof vendorExtras,
};

export type Services = typeof services;


// ============================================================
// Phase 3 — Users, Settings, Executive
// ============================================================

import type {
  ExecutiveKPIs,
  SystemSettings,
  UserStatus,
  VendorConflictAlert,
  VendorTransactionEntry,
} from "@/types/domain";
import {
  defaultSettings,
  executiveKPIs,
  users as seedUsers,
  vendorConflicts,
  vendorTransactions,
} from "@/services/mockData";

export interface UserService {
  list(): Promise<User[]>;
  get(id: string): Promise<User | undefined>;
  create(input: Omit<User, "id" | "lastActiveAt">): Promise<User>;
  updateRole(id: string, role: User["role"]): Promise<User>;
  updateStatus(id: string, status: UserStatus): Promise<User>;
  remove(id: string): Promise<void>;
}

export interface SettingsService {
  get(): Promise<SystemSettings>;
  update(patch: Partial<SystemSettings>): Promise<SystemSettings>;
  reset(): Promise<SystemSettings>;
}

export interface ExecutiveService {
  getKPIs(): Promise<ExecutiveKPIs>;
}

const usersState: User[] = [...seedUsers];
let settingsState: SystemSettings = { ...defaultSettings };

export class MockUserService implements UserService {
  async list() { await delay(80); return [...usersState]; }
  async get(id: string) { await delay(50); return usersState.find((u) => u.id === id); }
  async create(input: Omit<User, "id" | "lastActiveAt">) {
    await delay(120);
    const u: User = { ...input, id: newId("u"), lastActiveAt: "—" };
    usersState.push(u);
    return u;
  }
  async updateRole(id: string, role: User["role"]) {
    await delay(80);
    const u = usersState.find((x) => x.id === id);
    if (!u) throw new Error("کاربر یافت نشد.");
    u.role = role;
    return u;
  }
  async updateStatus(id: string, status: UserStatus) {
    await delay(80);
    const u = usersState.find((x) => x.id === id);
    if (!u) throw new Error("کاربر یافت نشد.");
    u.status = status;
    return u;
  }
  async remove(id: string) {
    await delay(80);
    const i = usersState.findIndex((x) => x.id === id);
    if (i >= 0) usersState.splice(i, 1);
  }
}

export class MockSettingsService implements SettingsService {
  async get() { await delay(60); return settingsState; }
  async update(patch: Partial<SystemSettings>) {
    await delay(120);
    settingsState = {
      ...settingsState,
      ...patch,
      risk: { ...settingsState.risk, ...(patch.risk ?? {}) },
      ai: { ...settingsState.ai, ...(patch.ai ?? {}) },
      notifications: { ...settingsState.notifications, ...(patch.notifications ?? {}) },
    };
    return settingsState;
  }
  async reset() {
    await delay(80);
    settingsState = { ...defaultSettings };
    return settingsState;
  }
}

export class MockExecutiveService implements ExecutiveService {
  async getKPIs() { await delay(120); return executiveKPIs; }
}

// Vendor extensions (transactions & conflicts) — attach to existing service export
export const vendorExtras = {
  listTransactions(vendorId: string): Promise<VendorTransactionEntry[]> {
    return delay(80).then(() => vendorTransactions.filter((t) => t.vendorId === vendorId));
  },
  listConflicts(vendorId: string): Promise<VendorConflictAlert[]> {
    return delay(80).then(() => vendorConflicts.filter((c) => c.vendorId === vendorId));
  },
};

(services as unknown as Record<string, unknown>).users = new MockUserService();
(services as unknown as Record<string, unknown>).settings = new MockSettingsService();
(services as unknown as Record<string, unknown>).executive = new MockExecutiveService();
(services as unknown as Record<string, unknown>).vendorExtras = vendorExtras;

// ============================================================
// Phase 4 — Engagements, Integrations, Notifications, Assistant threads
// ============================================================

import type {
  AppNotification,
  AssistantThread,
  Engagement,
  EngagementStatus,
  EngagementTask,
  Integration,
  IntegrationStatus,
} from "@/types/domain";
import {
  engagements as seedEngagements,
  initialNotifications,
  integrations as seedIntegrations,
} from "@/services/mockData";

export interface EngagementService {
  list(): Promise<Engagement[]>;
  get(id: string): Promise<Engagement | undefined>;
  create(input: Omit<Engagement, "id" | "createdAt" | "progress" | "tasks"> & {
    tasks?: EngagementTask[];
  }): Promise<Engagement>;
  updateStatus(id: string, status: EngagementStatus): Promise<Engagement>;
  toggleTask(engagementId: string, taskId: string): Promise<Engagement>;
  addTask(engagementId: string, task: Omit<EngagementTask, "id" | "done">): Promise<Engagement>;
  remove(id: string): Promise<void>;
}

export interface IntegrationService {
  list(): Promise<Integration[]>;
  get(id: string): Promise<Integration | undefined>;
  connect(id: string): Promise<Integration>;
  disconnect(id: string): Promise<Integration>;
  sync(id: string): Promise<Integration>;
}

export interface NotificationService {
  list(): Promise<AppNotification[]>;
  unreadCount(): Promise<number>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  remove(id: string): Promise<void>;
  add(input: Omit<AppNotification, "id" | "createdAt" | "read">): Promise<AppNotification>;
}

export interface AssistantThreadService {
  listThreads(): Promise<AssistantThread[]>;
  getThread(id: string): Promise<AssistantThread | undefined>;
  createThread(title: string, documentId?: string): Promise<AssistantThread>;
  ask(threadId: string, question: string): Promise<AssistantThread>;
  removeThread(id: string): Promise<void>;
}

const engagementsState: Engagement[] = [...seedEngagements];
const integrationsState: Integration[] = [...seedIntegrations];
const notificationsState: AppNotification[] = [...initialNotifications];
const threadsState: AssistantThread[] = [];

function computeProgress(tasks: EngagementTask[]) {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t.done).length;
  return Math.round((done / tasks.length) * 100);
}

export class MockEngagementService implements EngagementService {
  async list() { await delay(80); return [...engagementsState]; }
  async get(id: string) { await delay(60); return engagementsState.find((e) => e.id === id); }
  async create(input: Omit<Engagement, "id" | "createdAt" | "progress" | "tasks"> & { tasks?: EngagementTask[] }) {
    await delay(150);
    const tasks = input.tasks ?? [];
    const e: Engagement = {
      ...input,
      tasks,
      id: newId("eng"),
      createdAt: nowStamp(),
      progress: computeProgress(tasks),
    };
    engagementsState.push(e);
    return e;
  }
  async updateStatus(id: string, status: EngagementStatus) {
    await delay(80);
    const e = engagementsState.find((x) => x.id === id);
    if (!e) throw new Error("مأموریت یافت نشد.");
    e.status = status;
    if (status === "Closed") e.progress = 100;
    return e;
  }
  async toggleTask(engagementId: string, taskId: string) {
    await delay(60);
    const e = engagementsState.find((x) => x.id === engagementId);
    if (!e) throw new Error("مأموریت یافت نشد.");
    const t = e.tasks.find((x) => x.id === taskId);
    if (!t) throw new Error("وظیفه یافت نشد.");
    t.done = !t.done;
    e.progress = computeProgress(e.tasks);
    return e;
  }
  async addTask(engagementId: string, task: Omit<EngagementTask, "id" | "done">) {
    await delay(60);
    const e = engagementsState.find((x) => x.id === engagementId);
    if (!e) throw new Error("مأموریت یافت نشد.");
    e.tasks.push({ ...task, id: newId("t"), done: false });
    e.progress = computeProgress(e.tasks);
    return e;
  }
  async remove(id: string) {
    await delay(60);
    const i = engagementsState.findIndex((x) => x.id === id);
    if (i >= 0) engagementsState.splice(i, 1);
  }
}

export class MockIntegrationService implements IntegrationService {
  async list() { await delay(80); return [...integrationsState]; }
  async get(id: string) { await delay(50); return integrationsState.find((i) => i.id === id); }
  async connect(id: string) {
    await delay(500);
    const it = integrationsState.find((x) => x.id === id);
    if (!it) throw new Error("سرویس یافت نشد.");
    it.status = "connected" satisfies IntegrationStatus;
    it.lastSyncAt = nowStamp();
    it.events = [{ at: nowStamp(), message: "اتصال با موفقیت برقرار شد.", level: "info" }, ...(it.events ?? [])];
    return it;
  }
  async disconnect(id: string) {
    await delay(200);
    const it = integrationsState.find((x) => x.id === id);
    if (!it) throw new Error("سرویس یافت نشد.");
    it.status = "disconnected";
    it.events = [{ at: nowStamp(), message: "اتصال قطع شد.", level: "warn" }, ...(it.events ?? [])];
    return it;
  }
  async sync(id: string) {
    await delay(700);
    const it = integrationsState.find((x) => x.id === id);
    if (!it) throw new Error("سرویس یافت نشد.");
    if (it.status === "disconnected") throw new Error("ابتدا اتصال را برقرار کنید.");
    it.status = "connected";
    it.lastSyncAt = nowStamp();
    const added = Math.floor(Math.random() * 40) + 5;
    it.itemsSynced = (it.itemsSynced ?? 0) + added;
    it.events = [{ at: nowStamp(), message: `همگام‌سازی موفق — ${added} آیتم جدید.`, level: "info" }, ...(it.events ?? [])];
    return it;
  }
}

export class MockNotificationService implements NotificationService {
  async list() { await delay(50); return [...notificationsState].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); }
  async unreadCount() { await delay(20); return notificationsState.filter((n) => !n.read).length; }
  async markRead(id: string) {
    await delay(30);
    const n = notificationsState.find((x) => x.id === id);
    if (n) n.read = true;
  }
  async markAllRead() {
    await delay(60);
    notificationsState.forEach((n) => (n.read = true));
  }
  async remove(id: string) {
    await delay(30);
    const i = notificationsState.findIndex((x) => x.id === id);
    if (i >= 0) notificationsState.splice(i, 1);
  }
  async add(input: Omit<AppNotification, "id" | "createdAt" | "read">) {
    await delay(30);
    const n: AppNotification = { ...input, id: newId("n"), createdAt: nowStamp(), read: false };
    notificationsState.unshift(n);
    return n;
  }
}

const baseAssistant = new MockAuditAssistantService();

export class MockAssistantThreadService implements AssistantThreadService {
  async listThreads() { await delay(60); return [...threadsState].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); }
  async getThread(id: string) { await delay(40); return threadsState.find((t) => t.id === id); }
  async createThread(title: string, documentId?: string) {
    await delay(100);
    const t: AssistantThread = {
      id: newId("th"),
      title: title || "گفت‌وگوی جدید",
      createdAt: nowStamp(),
      messages: [
        {
          id: newId("am"),
          role: "assistant",
          text:
            "سلام. من دستیار حسابرسی هستم. می‌توانید دربارهٔ ریسک اسناد، کنترل‌های قانونی، شواهد و ارجاع به پایگاه دانش سؤال کنید.",
          citations: [],
          createdAt: nowStamp(),
        },
      ],
      documentId,
    };
    threadsState.unshift(t);
    return t;
  }
  async ask(threadId: string, question: string) {
    const t = threadsState.find((x) => x.id === threadId);
    if (!t) throw new Error("گفت‌وگو یافت نشد.");
    t.messages.push({
      id: newId("am"),
      role: "user",
      text: question,
      createdAt: nowStamp(),
    });
    const answer = await baseAssistant.ask(t.documentId ?? "d-flower-1405", question);
    t.messages.push(answer);
    return t;
  }
  async removeThread(id: string) {
    await delay(40);
    const i = threadsState.findIndex((x) => x.id === id);
    if (i >= 0) threadsState.splice(i, 1);
  }
}

(services as unknown as Record<string, unknown>).engagements = new MockEngagementService();
(services as unknown as Record<string, unknown>).integrations = new MockIntegrationService();
(services as unknown as Record<string, unknown>).notifications = new MockNotificationService();
(services as unknown as Record<string, unknown>).assistantThreads = new MockAssistantThreadService();

export const phase4 = {
  engagements: services["engagements" as keyof typeof services] as unknown as EngagementService,
  integrations: services["integrations" as keyof typeof services] as unknown as IntegrationService,
  notifications: services["notifications" as keyof typeof services] as unknown as NotificationService,
  assistantThreads: services["assistantThreads" as keyof typeof services] as unknown as AssistantThreadService,
};
