import type {
  AuditRun,
  AuditRunEvent,
  AuditRunItemBrief,
  AuditRunScope,
  AuditRunStage,
  AuditRunStageId,
  AuditRunStatus,
} from "@/types/domain";
import { toFaDigits } from "@/lib/format";

const STORAGE_KEY = "dideban.auditRuns.v1";
const MAX_EVENTS = 300;
const TICK_MS = 800;

export const STAGE_LIST: { id: AuditRunStageId; label: string }[] = [
  { id: "scope", label: "Scope Preparation" },
  { id: "retrieval", label: "Document Retrieval" },
  { id: "attachment", label: "Attachment Retrieval" },
  { id: "ocr", label: "OCR & Extraction" },
  { id: "classification", label: "Transaction Classification" },
  { id: "applicability", label: "Applicability Determination" },
  { id: "ruleVersion", label: "Rule Version Resolution" },
  { id: "ruleEvaluation", label: "Rule Evaluation" },
  { id: "anomaly", label: "Anomaly Analysis" },
  { id: "risk", label: "Risk Scoring" },
  { id: "findings", label: "Suggested Findings" },
  { id: "finalization", label: "Finalization" },
];

export const STAGE_LABEL_FA: Record<AuditRunStageId, string> = {
  scope: "آماده‌سازی دامنه",
  retrieval: "بازیابی اسناد",
  attachment: "بازیابی پیوست‌ها",
  ocr: "پردازش OCR",
  classification: "طبقه‌بندی تراکنش",
  applicability: "تعیین قابلیت اعمال",
  ruleVersion: "تعیین نسخه قانون",
  ruleEvaluation: "ارزیابی قوانین",
  anomaly: "تحلیل ناهنجاری",
  risk: "امتیازدهی ریسک",
  findings: "پیشنهاد یافته‌ها",
  finalization: "نهایی‌سازی",
};

type Listener = () => void;

interface StoreState {
  runs: AuditRun[];
}

const listeners = new Set<Listener>();
let state: StoreState = { runs: [] };
let notifyOnFinish: ((run: AuditRun) => void) | null = null;

// -------- persistence --------
function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
function hydrate() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as StoreState;
  } catch {
    state = { runs: [] };
  }
}

function emit() {
  for (const l of listeners) l();
}

function setState(next: StoreState) {
  state = next;
  persist();
  emit();
}

// -------- helpers --------
function makeStages(): AuditRunStage[] {
  return STAGE_LIST.map((s, i) => ({
    id: s.id,
    label: s.label,
    status: i === 0 ? "active" : "pending",
  }));
}

function ratiosFromSeed(seed: number) {
  // Deterministic ratios per run so re-hydration is stable
  const r = (seed * 9301 + 49297) % 233280;
  const rnd = r / 233280;
  const highRiskRatio = 0.08 + rnd * 0.14; // 8-22%
  const failedRatio = 0.01 + ((rnd * 3) % 1) * 0.03; // 1-4%
  return { highRiskRatio, failedRatio };
}

function makeItems(total: number, seed: number): AuditRunItemBrief[] {
  const arr: AuditRunItemBrief[] = [];
  for (let i = 0; i < total; i++) {
    const s = (seed + i) * 131;
    const amount = 50_000_000 + ((s * 7919) % 3_500_000_000);
    arr.push({
      id: `it-${seed}-${i}`,
      documentNumber: `SND-۱۴۰۵-${toFaDigits(String(1000 + i).padStart(5, "0"))}`,
      status: "queued",
      amount,
    });
  }
  return arr;
}

function elapsedMs(run: AuditRun, now: number) {
  if (run.status === "paused" && run.pausedAt)
    return run.pausedAt - run.startedAt - run.totalPausedMs;
  if (run.status === "completed" || run.status === "cancelled")
    return (run.finishedAt ?? now) - run.startedAt - run.totalPausedMs;
  return now - run.startedAt - run.totalPausedMs;
}

function stageForProgress(progress: number): AuditRunStageId {
  const idx = Math.min(
    STAGE_LIST.length - 1,
    Math.floor(progress * STAGE_LIST.length),
  );
  return STAGE_LIST[idx].id;
}

function pushEvent(run: AuditRun, ev: Omit<AuditRunEvent, "id" | "at">) {
  const e: AuditRunEvent = {
    id: `ev-${run.id}-${run.events.length}-${Date.now()}`,
    at: Date.now(),
    ...ev,
  };
  run.events.push(e);
  if (run.events.length > MAX_EVENTS)
    run.events.splice(0, run.events.length - MAX_EVENTS);
}

function advanceRun(run: AuditRun, now: number): boolean {
  if (run.status !== "running") return false;
  const el = Math.max(0, elapsedMs(run, now));
  const rawProgress = Math.min(1, el / run.estimatedDurationMs);
  const total = run.totalDocuments;
  const targetProcessed = Math.min(total, Math.floor(rawProgress * total));
  const currentProcessed = run.items.filter((i) => i.status !== "queued" && i.status !== "inProgress").length;
  let changed = false;

  const { highRiskRatio, failedRatio } = ratiosFromSeed(run.createdAt);

  // Advance items up to targetProcessed
  for (let i = currentProcessed; i < targetProcessed; i++) {
    const item = run.items[i];
    if (!item) break;
    const seed = (run.createdAt + i) & 0xffff;
    const r = ((seed * 2654435761) >>> 0) / 0x100000000;
    if (r < failedRatio) {
      item.status = "failed";
      run.errors.push({
        id: `er-${run.id}-${i}`,
        at: now,
        documentNumber: item.documentNumber,
        stage: "ruleEvaluation",
        message: "خطا در ارتباط با موتور قوانین (Timeout).",
        retriable: true,
      });
      pushEvent(run, {
        level: "error",
        documentNumber: item.documentNumber,
        stage: "ruleEvaluation",
        message: "پردازش سند با خطا مواجه شد؛ قابل تلاش مجدد.",
      });
    } else if (r < failedRatio + highRiskRatio) {
      item.status = "highRisk";
      item.riskScore = 60 + Math.floor(r * 40);
      pushEvent(run, {
        level: "warn",
        documentNumber: item.documentNumber,
        stage: "risk",
        message: `سند پرریسک شناسایی شد (امتیاز ${toFaDigits(item.riskScore ?? 0)}).`,
      });
      pushEvent(run, {
        level: "info",
        documentNumber: item.documentNumber,
        stage: "findings",
        message: "یافته‌ی حسابرسی پیشنهادی تولید شد.",
      });
    } else {
      item.status = "clean";
      item.riskScore = Math.floor(r * 30);
      pushEvent(run, {
        level: "success",
        documentNumber: item.documentNumber,
        stage: "finalization",
        message: "بدون مغایرت — سند پاک است.",
      });
    }
    item.stage = "finalization";
    changed = true;
  }

  // Advance stages
  const currentStage = stageForProgress(rawProgress);
  if (run.currentStage !== currentStage) {
    for (const s of run.stages) {
      if (s.status !== "done" && s.id !== currentStage) {
        const idxCur = STAGE_LIST.findIndex((x) => x.id === currentStage);
        const idxS = STAGE_LIST.findIndex((x) => x.id === s.id);
        if (idxS < idxCur) {
          s.status = "done";
          s.finishedAt = now;
          pushEvent(run, {
            level: "info",
            stage: s.id,
            message: `مرحله «${s.label}» تکمیل شد.`,
          });
        }
      }
    }
    const cur = run.stages.find((s) => s.id === currentStage);
    if (cur && cur.status !== "done") {
      cur.status = "active";
      cur.startedAt ??= now;
    }
    run.currentStage = currentStage;
    changed = true;
  }

  run.progress = rawProgress;

  // Checkpoints every 20%
  const bucket = Math.floor(rawProgress * 5);
  if (bucket > run.checkpoints.length && rawProgress > 0) {
    run.checkpoints.push({
      id: `cp-${run.id}-${bucket}`,
      at: now,
      progress: bucket / 5,
      processed: targetProcessed,
      message: `Checkpoint در ${toFaDigits(bucket * 20)}٪`,
    });
    changed = true;
  }

  if (rawProgress >= 1 && run.status === "running") {
    run.status = "completed";
    run.finishedAt = now;
    for (const s of run.stages) {
      s.status = "done";
      s.finishedAt ??= now;
    }
    run.currentStage = "finalization";
    const clean = run.items.filter((i) => i.status === "clean").length;
    const highRisk = run.items.filter((i) => i.status === "highRisk").length;
    const failed = run.items.filter((i) => i.status === "failed").length;
    const amountAtRisk = run.items
      .filter((i) => i.status === "highRisk")
      .reduce((s, i) => s + i.amount, 0);
    run.summary = {
      totalDocuments: total,
      processed: clean + highRisk + failed,
      clean,
      highRisk,
      failed,
      amountAtRisk,
      findingsCreated: highRisk,
      durationMs: elapsedMs(run, now),
    };
    pushEvent(run, {
      level: "success",
      message: `اجرای «${run.name}» با موفقیت خاتمه یافت.`,
    });
    changed = true;
    if (notifyOnFinish) {
      try {
        notifyOnFinish(run);
      } catch {
        /* noop */
      }
    }
  }
  return changed;
}

// -------- simulator loop --------
let ticker: ReturnType<typeof setInterval> | null = null;
function startTicker() {
  if (typeof window === "undefined" || ticker) return;
  ticker = setInterval(() => {
    const now = Date.now();
    let mutated = false;
    for (const run of state.runs) {
      if (advanceRun(run, now)) mutated = true;
    }
    if (mutated) {
      state = { runs: [...state.runs] };
      persist();
      emit();
    }
  }, TICK_MS);
}

// initialize
hydrate();
startTicker();

// -------- public API --------
export const auditRunStore = {
  getState: () => state,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setFinishHandler(fn: ((run: AuditRun) => void) | null) {
    notifyOnFinish = fn;
  },
};

export interface CreateRunInput {
  name: string;
  kind: AuditRun["kind"];
  scope: AuditRunScope;
  totalDocuments: number;
  estimatedDurationMs: number;
  createdBy: string;
}

export const historicalAuditService = {
  list(): AuditRun[] {
    return [...state.runs].sort((a, b) => b.createdAt - a.createdAt);
  },
  get(id: string): AuditRun | undefined {
    return state.runs.find((r) => r.id === id);
  },
  create(input: CreateRunInput): AuditRun {
    const now = Date.now();
    const id = `run-${now.toString(36)}`;
    const run: AuditRun = {
      id,
      name: input.name,
      kind: input.kind,
      status: "running",
      scope: input.scope,
      totalDocuments: input.totalDocuments,
      startedAt: now,
      estimatedDurationMs: input.estimatedDurationMs,
      totalPausedMs: 0,
      progress: 0,
      currentStage: "scope",
      stages: makeStages(),
      items: makeItems(input.totalDocuments, now & 0xffff),
      events: [
        {
          id: `ev-init-${now}`,
          at: now,
          level: "info",
          message: `اجرای «${input.name}» آغاز شد — ${toFaDigits(input.totalDocuments)} سند در دامنه.`,
        },
      ],
      checkpoints: [],
      errors: [],
      createdBy: input.createdBy,
      createdAt: now,
    };
    setState({ runs: [run, ...state.runs] });
    return run;
  },
  pause(id: string) {
    const runs = state.runs.map((r) => {
      if (r.id !== id || r.status !== "running") return r;
      return { ...r, status: "paused" as AuditRunStatus, pausedAt: Date.now() };
    });
    setState({ runs });
  },
  resume(id: string) {
    const runs = state.runs.map((r) => {
      if (r.id !== id || r.status !== "paused" || !r.pausedAt) return r;
      const now = Date.now();
      return {
        ...r,
        status: "running" as AuditRunStatus,
        totalPausedMs: r.totalPausedMs + (now - r.pausedAt),
        pausedAt: undefined,
      };
    });
    setState({ runs });
  },
  cancel(id: string) {
    const runs = state.runs.map((r) => {
      if (r.id !== id || r.status === "completed" || r.status === "cancelled") return r;
      const now = Date.now();
      const cancelled: AuditRun = {
        ...r,
        status: "cancelled",
        finishedAt: now,
      };
      pushEvent(cancelled, {
        level: "warn",
        message: "اجرا توسط کاربر لغو شد.",
      });
      return cancelled;
    });
    setState({ runs });
  },
  retryFailed(id: string) {
    const runs = state.runs.map((r) => {
      if (r.id !== id) return r;
      const items = r.items.map((it) =>
        it.status === "failed" ? { ...it, status: "queued" as const } : it,
      );
      const clone: AuditRun = {
        ...r,
        items,
        errors: [],
        status: r.status === "completed" ? "running" : r.status,
        estimatedDurationMs:
          r.status === "completed"
            ? r.estimatedDurationMs +
              Math.max(3000, items.filter((i) => i.status === "queued").length * 400)
            : r.estimatedDurationMs,
        finishedAt: undefined,
        summary: undefined,
      };
      if (clone.status === "running" && r.status === "completed") {
        clone.startedAt = Date.now();
        clone.totalPausedMs = 0;
        clone.progress = 0;
        clone.currentStage = "ruleEvaluation";
        clone.stages = makeStages().map((s) =>
          s.id === "ruleEvaluation" ? { ...s, status: "active" as const } : s,
        );
      }
      pushEvent(clone, {
        level: "info",
        message: `تلاش مجدد برای ${toFaDigits(items.filter((i) => i.status === "queued").length)} سند ناموفق.`,
      });
      return clone;
    });
    setState({ runs });
  },
  rerunSelected(id: string, itemIds: string[]) {
    const runs = state.runs.map((r) => {
      if (r.id !== id) return r;
      const items = r.items.map((it) =>
        itemIds.includes(it.id) ? { ...it, status: "queued" as const, riskScore: undefined } : it,
      );
      const clone: AuditRun = { ...r, items };
      pushEvent(clone, {
        level: "info",
        message: `اجرای مجدد برای ${toFaDigits(itemIds.length)} سند انتخاب‌شده در صف قرار گرفت.`,
      });
      return clone;
    });
    setState({ runs });
  },
  exportResults(id: string): string {
    const r = state.runs.find((x) => x.id === id);
    if (!r) return "";
    const rows = [
      ["شماره سند", "وضعیت", "مبلغ (ریال)", "امتیاز ریسک"].join(","),
      ...r.items.map((i) =>
        [i.documentNumber, i.status, String(i.amount), String(i.riskScore ?? "")].join(","),
      ),
    ].join("\n");
    return rows;
  },
  remove(id: string) {
    setState({ runs: state.runs.filter((r) => r.id !== id) });
  },
};

export type HistoricalAuditService = typeof historicalAuditService;
