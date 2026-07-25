import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuditRuns } from "@/hooks/useAuditRuns";
import { historicalAuditService } from "@/services/auditRuns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toFaDigits, formatIRR } from "@/lib/format";
import type { AuditRun, AuditRunStatus } from "@/types/domain";
import {
  Plus,
  Play,
  Pause,
  X,
  Trash2,
  Radio,
  History,
} from "lucide-react";

export const Route = createFileRoute("/app/audit-runs/")({
  head: () => ({
    meta: [
      { title: "اجراهای حسابرسی — دیدبان حسابرسی" },
      {
        name: "description",
        content:
          "پیگیری اجراهای حسابرسی بلادرنگ و تاریخی، وضعیت پیشرفت و نتایج.",
      },
    ],
  }),
  component: AuditRunsListPage,
});

function AuditRunsListPage() {
  const runs = useAuditRuns();

  const active = runs.filter((r) => r.status === "running" || r.status === "paused");
  const done = runs.filter(
    (r) => r.status === "completed" || r.status === "cancelled" || r.status === "failed",
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">اجراهای حسابرسی</h1>
          <p className="text-sm text-muted-foreground mt-1">
            اجرای بلادرنگ روی اسناد جدید و اجراهای تاریخی/گروهی برای دوره‌های
            گذشته.
          </p>
        </div>
        <Link to="/app/audit-runs/new">
          <Button>
            <Plus className="h-4 w-4 ms-1" />
            اجرای جدید
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="در حال اجرا" value={runs.filter((r) => r.status === "running").length} />
        <StatCard label="متوقف‌شده" value={runs.filter((r) => r.status === "paused").length} />
        <StatCard label="خاتمه‌یافته" value={runs.filter((r) => r.status === "completed").length} />
        <StatCard label="کل اجراها" value={runs.length} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          اجراهای فعال ({toFaDigits(active.length)})
        </h2>
        {active.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            اجرای فعالی وجود ندارد.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {active.map((r) => (
              <RunCard key={r.id} run={r} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          سابقهٔ اجراها ({toFaDigits(done.length)})
        </h2>
        {done.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            اجرای خاتمه‌یافته‌ای وجود ندارد.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {done.map((r) => (
              <RunCard key={r.id} run={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{toFaDigits(value)}</div>
    </Card>
  );
}

function RunCard({ run }: { run: AuditRun }) {
  const pct = Math.round(run.progress * 100);
  const processed = run.items.filter((i) => i.status !== "queued" && i.status !== "inProgress").length;
  const highRisk = run.items.filter((i) => i.status === "highRisk").length;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <KindBadge kind={run.kind} />
            <StatusBadge status={run.status} />
          </div>
          <Link
            to="/app/audit-runs/$id"
            params={{ id: run.id }}
            className="block mt-1 text-sm font-semibold hover:underline"
          >
            {run.name}
          </Link>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {run.scope.companyName} — {run.scope.fiscalYear} — {toFaDigits(run.totalDocuments)} سند
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {run.status === "running" && (
            <Button size="icon" variant="ghost" onClick={() => historicalAuditService.pause(run.id)}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {run.status === "paused" && (
            <Button size="icon" variant="ghost" onClick={() => historicalAuditService.resume(run.id)}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          {(run.status === "running" || run.status === "paused") && (
            <Button size="icon" variant="ghost" onClick={() => historicalAuditService.cancel(run.id)}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          )}
          {(run.status === "completed" || run.status === "cancelled" || run.status === "failed") && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => historicalAuditService.remove(run.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>پیشرفت {toFaDigits(pct)}٪</span>
          <span>
            {toFaDigits(processed)}/{toFaDigits(run.totalDocuments)} پردازش‌شده
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>پرریسک: <span className="text-destructive font-medium">{toFaDigits(highRisk)}</span></span>
        {run.summary && (
          <span className="ms-auto">مبلغ در معرض ریسک: {formatIRR(run.summary.amountAtRisk)}</span>
        )}
      </div>
    </Card>
  );
}

function KindBadge({ kind }: { kind: AuditRun["kind"] }) {
  return kind === "realtime" ? (
    <Badge className="bg-primary/15 text-primary text-[10px]">
      <Radio className="h-3 w-3 ms-1" /> بلادرنگ
    </Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground text-[10px]">
      <History className="h-3 w-3 ms-1" /> تاریخی/گروهی
    </Badge>
  );
}

function StatusBadge({ status }: { status: AuditRunStatus }) {
  const map: Record<AuditRunStatus, { cls: string; label: string }> = {
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
  };
  const m = map[status];
  return <Badge className={`${m.cls} text-[10px]`}>{m.label}</Badge>;
}
