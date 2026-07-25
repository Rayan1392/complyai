import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useAuditRun } from "@/hooks/useAuditRuns";
import { historicalAuditService, STAGE_LIST, STAGE_LABEL_FA } from "@/services/auditRuns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toFaDigits, formatIRR } from "@/lib/format";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import type { AuditRun, AuditRunEvent, AuditRunStageId } from "@/types/domain";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";

export const Route = createFileRoute("/app/audit-runs/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `اجرای ${params.id} — دیدبان حسابرسی` },
      { name: "description", content: "جزئیات، پیشرفت و لاگ زندهٔ اجرای حسابرسی." },
    ],
  }),
  component: AuditRunDetailPage,
});

function AuditRunDetailPage() {
  const { id } = useParams({ from: "/app/audit-runs/$id" });
  const run = useAuditRun(id);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!run)
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">
          اجرای موردنظر یافت نشد.
        </div>
        <Link to="/app/audit-runs" className="text-primary text-sm hover:underline">
          بازگشت به فهرست اجراها
        </Link>
      </div>
    );

  const now = Date.now();
  const elapsed =
    run.status === "paused" && run.pausedAt
      ? run.pausedAt - run.startedAt - run.totalPausedMs
      : (run.finishedAt ?? now) - run.startedAt - run.totalPausedMs;
  const remaining =
    run.status === "running"
      ? Math.max(0, run.estimatedDurationMs - elapsed)
      : 0;
  const processed = run.items.filter(
    (i) => i.status !== "queued" && i.status !== "inProgress",
  ).length;
  const inProgress = run.items.filter((i) => i.status === "inProgress").length;
  const queued = run.items.filter((i) => i.status === "queued").length;
  const highRisk = run.items.filter((i) => i.status === "highRisk").length;
  const failed = run.items.filter((i) => i.status === "failed").length;
  const clean = run.items.filter((i) => i.status === "clean").length;
  const speed = elapsed > 0 ? (processed * 1000) / elapsed : 0;
  const amountAtRisk = run.items
    .filter((i) => i.status === "highRisk")
    .reduce((s, i) => s + i.amount, 0);

  const doExport = () => {
    const csv = historicalAuditService.exportResults(run.id);
    if (typeof window === "undefined") return;
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-run-${run.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("خروجی CSV دانلود شد.");
  };

  const rerun = () => {
    if (selected.size === 0) return toast.error("سندی انتخاب نشده است.");
    historicalAuditService.rerunSelected(run.id, [...selected]);
    setSelected(new Set());
    toast.success("اسناد انتخاب‌شده مجدداً در صف قرار گرفتند.");
  };

  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/app/audit-runs"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          اجراهای حسابرسی
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="font-medium">{run.name}</span>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{run.name}</h1>
          <div className="flex gap-2 items-center mt-2 flex-wrap">
            <Badge variant="outline">
              {run.kind === "realtime" ? "بلادرنگ" : "تاریخی/گروهی"}
            </Badge>
            <StatusBadge status={run.status} />
            <span className="text-xs text-muted-foreground">
              {run.scope.companyName} — {run.scope.fiscalYear} — {run.scope.dateFrom} تا {run.scope.dateTo}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {run.status === "running" && (
            <Button variant="outline" size="sm" onClick={() => historicalAuditService.pause(run.id)}>
              <Pause className="h-4 w-4 ms-1" /> توقف
            </Button>
          )}
          {run.status === "paused" && (
            <Button variant="outline" size="sm" onClick={() => historicalAuditService.resume(run.id)}>
              <Play className="h-4 w-4 ms-1" /> ادامه
            </Button>
          )}
          {(run.status === "running" || run.status === "paused") && (
            <Button variant="outline" size="sm" onClick={() => historicalAuditService.cancel(run.id)}>
              <X className="h-4 w-4 ms-1" /> لغو
            </Button>
          )}
          {failed > 0 && (
            <Button variant="outline" size="sm" onClick={() => historicalAuditService.retryFailed(run.id)}>
              <RefreshCw className="h-4 w-4 ms-1" /> تلاش مجدد ناموفق‌ها
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={rerun} disabled={selected.size === 0}>
            <RotateCcw className="h-4 w-4 ms-1" />
            اجرای مجدد ({toFaDigits(selected.size)})
          </Button>
          <Link to="/app/audit-runs/$id/report" params={{ id: run.id }}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 ms-1" /> گزارش اجرا
            </Button>
          </Link>
          <Button size="sm" onClick={doExport}>
            <Download className="h-4 w-4 ms-1" /> خروجی CSV
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>پیشرفت کلی</span>
          <span>{toFaDigits(Math.round(run.progress * 100))}٪</span>
        </div>
        <Progress value={run.progress * 100} className="h-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <Metric label="زمان سپری‌شده" value={formatDuration(elapsed)} />
          <Metric
            label="زمان تخمینی باقی‌مانده"
            value={run.status === "running" ? formatDuration(remaining) : "—"}
          />
          <Metric label="سرعت (سند/ثانیه)" value={toFaDigits(speed.toFixed(1))} />
          <Metric label="مبلغ در معرض ریسک" value={formatIRR(amountAtRisk)} />
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatBox label="کل اسناد" value={run.totalDocuments} />
        <StatBox label="پردازش‌شده" value={processed} tone="ok" />
        <StatBox label="در صف" value={queued} />
        <StatBox label="در حال پردازش" value={inProgress} tone="info" />
        <StatBox label="بدون مغایرت" value={clean} tone="ok" />
        <StatBox label="پرریسک" value={highRisk} tone="warn" />
        <StatBox label="ناموفق" value={failed} tone="bad" />
      </div>

      <Tabs defaultValue="stages" dir="rtl">
        <TabsList>
          <TabsTrigger value="stages">مراحل پردازش</TabsTrigger>
          <TabsTrigger value="live">گزارش اجرای زنده</TabsTrigger>
          <TabsTrigger value="items">اسناد</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
          <TabsTrigger value="errors">
            خطاها ({toFaDigits(run.errors.length)})
          </TabsTrigger>
          {run.summary && <TabsTrigger value="summary">خلاصه نتیجه</TabsTrigger>}
        </TabsList>

        <TabsContent value="stages" className="pt-3">
          <StagesView run={run} />
        </TabsContent>

        <TabsContent value="live" className="pt-3">
          <LiveLog events={run.events} />
        </TabsContent>

        <TabsContent value="items" className="pt-3">
          <ItemsTable
            run={run}
            selected={selected}
            toggle={toggleSel}
          />
        </TabsContent>

        <TabsContent value="checkpoints" className="pt-3">
          <Card className="p-3">
            {run.checkpoints.length ? (
              <div className="rounded-md border divide-y">
                {run.checkpoints.map((c) => (
                  <div key={c.id} className="p-2 flex justify-between text-sm">
                    <span>{c.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {toFaDigits(c.processed)} سند — {new Date(c.at).toLocaleTimeString("fa-IR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                هنوز Checkpoint‌ی ثبت نشده است.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="pt-3">
          <Card className="p-3">
            {run.errors.length ? (
              <div className="rounded-md border divide-y">
                {run.errors.map((e) => (
                  <div key={e.id} className="p-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-destructive">
                        {e.documentNumber ?? "—"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(e.at).toLocaleTimeString("fa-IR")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {e.message} — مرحله {e.stage ? STAGE_LABEL_FA[e.stage] : "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                خطایی ثبت نشده است.
              </div>
            )}
          </Card>
        </TabsContent>

        {run.summary && (
          <TabsContent value="summary" className="pt-3">
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="کل" value={toFaDigits(run.summary.totalDocuments)} />
                <Metric label="پاک" value={toFaDigits(run.summary.clean)} />
                <Metric label="پرریسک" value={toFaDigits(run.summary.highRisk)} />
                <Metric label="ناموفق" value={toFaDigits(run.summary.failed)} />
                <Metric label="یافته‌های تولیدشده" value={toFaDigits(run.summary.findingsCreated)} />
                <Metric label="مبلغ در معرض ریسک" value={formatIRR(run.summary.amountAtRisk)} />
                <Metric label="مدت اجرا" value={formatDuration(run.summary.durationMs)} />
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function StagesView({ run }: { run: AuditRun }) {
  return (
    <ol className="space-y-2">
      {run.stages.map((s, i) => (
        <li key={s.id} className="flex items-center gap-3">
          <div
            className={`grid h-8 w-8 place-items-center rounded-full text-xs shrink-0 ${
              s.status === "done"
                ? "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]"
                : s.status === "active"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s.status === "done" ? (
              <Check className="h-4 w-4" />
            ) : s.status === "active" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span>{toFaDigits(i + 1)}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">
              {STAGE_LABEL_FA[s.id]}
              <span className="text-[11px] text-muted-foreground ms-2">
                ({s.label})
              </span>
            </div>
            {s.startedAt && (
              <div className="text-[10px] text-muted-foreground">
                شروع: {new Date(s.startedAt).toLocaleTimeString("fa-IR")}
                {s.finishedAt && ` — پایان: ${new Date(s.finishedAt).toLocaleTimeString("fa-IR")}`}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function LiveLog({ events }: { events: AuditRunEvent[] }) {
  const rev = useMemo(() => [...events].reverse(), [events]);
  return (
    <Card className="p-0 overflow-hidden">
      <div className="max-h-[500px] overflow-auto font-mono text-xs">
        {rev.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            هنوز رویدادی ثبت نشده است.
          </div>
        )}
        {rev.map((e) => (
          <div
            key={e.id}
            className="grid grid-cols-[auto_auto_auto_1fr] gap-2 items-start px-3 py-1.5 border-b last:border-0"
          >
            <span className="text-muted-foreground">
              {new Date(e.at).toLocaleTimeString("fa-IR")}
            </span>
            <LevelPill level={e.level} />
            <span className="text-muted-foreground">
              {e.stage ? stageShort(e.stage) : "—"}
              {e.documentNumber ? ` · ${e.documentNumber}` : ""}
            </span>
            <span>{e.message}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function stageShort(id: AuditRunStageId) {
  const s = STAGE_LIST.find((x) => x.id === id);
  return s?.label ?? id;
}

function LevelPill({ level }: { level: AuditRunEvent["level"] }) {
  const map: Record<AuditRunEvent["level"], string> = {
    info: "bg-muted text-muted-foreground",
    success: "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]",
    warn: "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]",
    error: "bg-destructive text-destructive-foreground",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] ${map[level]}`}>
      {level.toUpperCase()}
    </span>
  );
}

function ItemsTable({
  run,
  selected,
  toggle,
}: {
  run: AuditRun;
  selected: Set<string>;
  toggle: (id: string) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="max-h-[500px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs sticky top-0">
            <tr>
              <th className="p-2 text-start w-8"></th>
              <th className="p-2 text-start">شماره سند</th>
              <th className="p-2 text-start">وضعیت</th>
              <th className="p-2 text-start">مبلغ</th>
              <th className="p-2 text-start">امتیاز ریسک</th>
            </tr>
          </thead>
          <tbody>
            {run.items.map((it) => (
              <tr key={it.id} className="border-t hover:bg-accent/30">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.has(it.id)}
                    onChange={() => toggle(it.id)}
                  />
                </td>
                <td className="p-2 font-medium">{it.documentNumber}</td>
                <td className="p-2">
                  <ItemStatus status={it.status} />
                </td>
                <td className="p-2">{formatIRR(it.amount)}</td>
                <td className="p-2">
                  {it.riskScore !== undefined ? toFaDigits(it.riskScore) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ItemStatus({ status }: { status: AuditRun["items"][number]["status"] }) {
  const map: Record<typeof status, { cls: string; label: string }> = {
    queued: { cls: "bg-muted text-muted-foreground", label: "در صف" },
    inProgress: { cls: "bg-primary/15 text-primary", label: "در حال پردازش" },
    clean: {
      cls: "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]",
      label: "پاک",
    },
    highRisk: {
      cls: "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]",
      label: "پرریسک",
    },
    failed: { cls: "bg-destructive text-destructive-foreground", label: "ناموفق" },
  };
  const m = map[status];
  return <Badge className={`${m.cls} text-[10px]`}>{m.label}</Badge>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "bad" | "info";
}) {
  const cls =
    tone === "ok"
      ? "text-[color:var(--color-success)]"
      : tone === "warn"
        ? "text-[color:var(--color-warning)]"
        : tone === "bad"
          ? "text-destructive"
          : tone === "info"
            ? "text-primary"
            : "";
  return (
    <Card className="p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${cls}`}>{toFaDigits(value)}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: AuditRun["status"] }) {
  const map = {
    queued: { cls: "bg-muted text-muted-foreground", label: "در صف" },
    running: { cls: "bg-primary/15 text-primary", label: "در حال اجرا" },
    paused: {
      cls: "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]",
      label: "متوقف",
    },
    completed: {
      cls: "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]",
      label: "خاتمه‌یافته",
    },
    cancelled: { cls: "bg-muted text-muted-foreground", label: "لغو شده" },
    failed: { cls: "bg-destructive text-destructive-foreground", label: "ناموفق" },
  } as const;
  const m = map[status];
  return <Badge className={`${m.cls}`}>{m.label}</Badge>;
}

function formatDuration(ms: number) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${toFaDigits(m)}:${toFaDigits(String(sec).padStart(2, "0"))}`;
}

// silence unused-import warning for Circle/CheckCircle2 kept for future use
void Circle;
void CheckCircle2;
