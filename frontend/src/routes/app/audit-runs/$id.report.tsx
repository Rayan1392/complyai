import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useAuditRun } from "@/hooks/useAuditRuns";
import { historicalAuditService, STAGE_LABEL_FA } from "@/services/auditRuns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toFaDigits, formatIRR } from "@/lib/format";
import { toast } from "sonner";
import { useMemo } from "react";
import type { AuditRun } from "@/types/domain";
import { ArrowRight, Download, FileText, Printer } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/app/audit-runs/$id/report")({
  head: ({ params }) => ({
    meta: [
      { title: `گزارش اجرای ${params.id} — دیدبان حسابرسی` },
      { name: "description", content: "خلاصه، نمودارها و خطاهای اجرای حسابرسی با قابلیت خروجی PDF/CSV." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = useParams({ from: "/app/audit-runs/$id/report" });
  const run = useAuditRun(id);

  const stats = useMemo(() => computeStats(run), [run]);

  if (!run) {
    return (
      <div className="p-6 space-y-2">
        <div className="text-sm text-muted-foreground">اجرای موردنظر یافت نشد.</div>
        <Link to="/app/audit-runs" className="text-primary text-sm hover:underline">
          بازگشت به فهرست اجراها
        </Link>
      </div>
    );
  }

  const doExportCsv = () => {
    const csv = historicalAuditService.exportResults(run.id);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-run-${run.id}-items.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("خروجی CSV اسناد دانلود شد.");
  };

  const doExportErrorsCsv = () => {
    const header = "شناسه,زمان,شماره سند,مرحله,پیام\n";
    const rows = run.errors
      .map((e) =>
        [
          e.id,
          new Date(e.at).toISOString(),
          e.documentNumber ?? "",
          e.stage ? STAGE_LABEL_FA[e.stage] : "",
          (e.message ?? "").replace(/"/g, '""'),
        ]
          .map((v) => `"${v}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${header}${rows}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-run-${run.id}-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("خروجی CSV خطاها دانلود شد.");
  };

  const doPrintPdf = () => {
    window.print();
  };

  const statusColor: Record<string, string> = {
    clean: "hsl(142 71% 45%)",
    highRisk: "hsl(38 92% 50%)",
    failed: "hsl(0 84% 60%)",
    queued: "hsl(220 9% 60%)",
    inProgress: "hsl(217 91% 60%)",
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 print:p-0">
      {/* Toolbar - hidden in print */}
      <div className="flex items-center gap-2 text-sm print:hidden">
        <Link
          to="/app/audit-runs/$id"
          params={{ id: run.id }}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به جزئیات اجرا
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap print:block">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            گزارش اجرای حسابرسی
          </h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {run.name} — {run.scope.companyName} — سال مالی {toFaDigits(run.scope.fiscalYear)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            بازه: {run.scope.dateFrom} تا {run.scope.dateTo} — تاریخ تولید گزارش:{" "}
            {new Date().toLocaleString("fa-IR")}
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={doExportErrorsCsv} disabled={run.errors.length === 0}>
            <Download className="h-4 w-4 ms-1" /> CSV خطاها
          </Button>
          <Button variant="outline" size="sm" onClick={doExportCsv}>
            <Download className="h-4 w-4 ms-1" /> CSV اسناد
          </Button>
          <Button size="sm" onClick={doPrintPdf}>
            <Printer className="h-4 w-4 ms-1" /> خروجی PDF (چاپ)
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SummaryCard label="وضعیت" value={statusFa(run.status)} />
        <SummaryCard label="کل اسناد" value={toFaDigits(stats.total)} />
        <SummaryCard label="پاک" value={toFaDigits(stats.clean)} tone="ok" />
        <SummaryCard label="پرریسک" value={toFaDigits(stats.highRisk)} tone="warn" />
        <SummaryCard label="ناموفق" value={toFaDigits(stats.failed)} tone="bad" />
        <SummaryCard label="مبلغ در معرض ریسک" value={formatIRR(stats.amountAtRisk)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="پیشرفت" value={`${toFaDigits(Math.round(run.progress * 100))}٪`} />
        <SummaryCard label="مدت اجرا" value={formatDuration(stats.durationMs)} />
        <SummaryCard label="سرعت (سند/ثانیه)" value={toFaDigits(stats.speed.toFixed(2))} />
        <SummaryCard label="یافته‌های تولیدشده" value={toFaDigits(run.summary?.findingsCreated ?? 0)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">توزیع وضعیت اسناد</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusDist}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={(e: { value?: number }) => toFaDigits(e.value ?? 0)}
                >
                  {stats.statusDist.map((s) => (
                    <Cell key={s.key} fill={statusColor[s.key]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => toFaDigits(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">پیشرفت مراحل پردازش</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.stageProgress} layout="vertical" margin={{ right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${toFaDigits(v)}٪`} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${toFaDigits(v)}٪`} />
                <Bar dataKey="percent" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="text-sm font-semibold mb-2">روند پردازش در طول زمان</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="t" tickFormatter={(v) => toFaDigits(v)} />
                <YAxis tickFormatter={(v) => toFaDigits(v)} />
                <Tooltip formatter={(v: number) => toFaDigits(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="processed"
                  name="پردازش‌شده"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="highRisk"
                  name="پرریسک"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  name="ناموفق"
                  stroke="hsl(0 84% 60%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Errors */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">
            خطاها ({toFaDigits(run.errors.length)})
          </div>
          {run.errors.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              نیازمند بررسی
            </Badge>
          )}
        </div>
        {run.errors.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            هیچ خطایی در این اجرا ثبت نشده است.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="p-2 text-start">زمان</th>
                  <th className="p-2 text-start">شماره سند</th>
                  <th className="p-2 text-start">مرحله</th>
                  <th className="p-2 text-start">پیام</th>
                </tr>
              </thead>
              <tbody>
                {run.errors.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.at).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 font-medium">{e.documentNumber ?? "—"}</td>
                    <td className="p-2 text-xs">
                      {e.stage ? STAGE_LABEL_FA[e.stage] : "—"}
                    </td>
                    <td className="p-2 text-xs text-destructive">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Top risk items */}
      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">
          پرریسک‌ترین اسناد ({toFaDigits(stats.topRisk.length)})
        </div>
        {stats.topRisk.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            سند پرریسکی ثبت نشده است.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="p-2 text-start">شماره سند</th>
                  <th className="p-2 text-start">مبلغ</th>
                  <th className="p-2 text-start">امتیاز ریسک</th>
                  <th className="p-2 text-start">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {stats.topRisk.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2 font-medium">{it.documentNumber}</td>
                    <td className="p-2">{formatIRR(it.amount)}</td>
                    <td className="p-2">
                      {it.riskScore !== undefined ? toFaDigits(it.riskScore) : "—"}
                    </td>
                    <td className="p-2 text-xs">{itemStatusFa(it.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-[11px] text-muted-foreground text-center pt-2 print:pt-6">
        این گزارش توسط سامانه دیدبان حسابرسی داخلی هوشمند تولید شده است.
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "ok" | "warn" | "bad";
}) {
  const cls =
    tone === "ok"
      ? "text-[color:var(--color-success)]"
      : tone === "warn"
        ? "text-[color:var(--color-warning)]"
        : tone === "bad"
          ? "text-destructive"
          : "";
  return (
    <Card className="p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-base font-bold mt-1 ${cls}`}>{value}</div>
    </Card>
  );
}

function computeStats(run: AuditRun | undefined) {
  if (!run) {
    return {
      total: 0,
      clean: 0,
      highRisk: 0,
      failed: 0,
      queued: 0,
      inProgress: 0,
      amountAtRisk: 0,
      speed: 0,
      durationMs: 0,
      statusDist: [] as { key: string; name: string; value: number }[],
      stageProgress: [] as { label: string; percent: number }[],
      timeline: [] as { t: string; processed: number; highRisk: number; failed: number }[],
      topRisk: [] as AuditRun["items"],
    };
  }
  const total = run.items.length;
  const clean = run.items.filter((i) => i.status === "clean").length;
  const highRisk = run.items.filter((i) => i.status === "highRisk").length;
  const failed = run.items.filter((i) => i.status === "failed").length;
  const queued = run.items.filter((i) => i.status === "queued").length;
  const inProgress = run.items.filter((i) => i.status === "inProgress").length;
  const amountAtRisk = run.items
    .filter((i) => i.status === "highRisk")
    .reduce((s, i) => s + i.amount, 0);
  const now = Date.now();
  const durationMs = (run.finishedAt ?? now) - run.startedAt - run.totalPausedMs;
  const processed = clean + highRisk + failed;
  const speed = durationMs > 0 ? (processed * 1000) / durationMs : 0;

  const statusDist = [
    { key: "clean", name: "پاک", value: clean },
    { key: "highRisk", name: "پرریسک", value: highRisk },
    { key: "failed", name: "ناموفق", value: failed },
    { key: "inProgress", name: "در حال پردازش", value: inProgress },
    { key: "queued", name: "در صف", value: queued },
  ].filter((s) => s.value > 0);

  const stageProgress = run.stages.map((s) => ({
    label: STAGE_LABEL_FA[s.id],
    percent: s.status === "done" ? 100 : s.status === "active" ? 50 : 0,
  }));

  // Timeline built from events: bucket by 10% of elapsed
  const buckets = 10;
  const bucketMs = Math.max(1, durationMs / buckets);
  const timeline = Array.from({ length: buckets }, (_, i) => ({
    t: `${toFaDigits(Math.round(((i + 1) / buckets) * 100))}٪`,
    processed: 0,
    highRisk: 0,
    failed: 0,
  }));
  // Use events with a document number as proxy for item completion
  const seen = new Set<string>();
  for (const ev of run.events) {
    if (!ev.documentNumber || seen.has(ev.documentNumber + ev.level)) continue;
    if (ev.level !== "success" && ev.level !== "error" && ev.level !== "warn") continue;
    seen.add(ev.documentNumber + ev.level);
    const rel = ev.at - run.startedAt - run.totalPausedMs;
    const idx = Math.min(buckets - 1, Math.max(0, Math.floor(rel / bucketMs)));
    if (ev.level === "success") timeline[idx].processed += 1;
    if (ev.level === "warn") timeline[idx].highRisk += 1;
    if (ev.level === "error") timeline[idx].failed += 1;
  }
  // cumulative
  for (let i = 1; i < timeline.length; i++) {
    timeline[i].processed += timeline[i - 1].processed;
    timeline[i].highRisk += timeline[i - 1].highRisk;
    timeline[i].failed += timeline[i - 1].failed;
  }

  const topRisk = [...run.items]
    .filter((i) => i.status === "highRisk" || i.status === "failed")
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 10);

  return {
    total,
    clean,
    highRisk,
    failed,
    queued,
    inProgress,
    amountAtRisk,
    speed,
    durationMs,
    statusDist,
    stageProgress,
    timeline,
    topRisk,
  };
}

function statusFa(s: AuditRun["status"]) {
  return (
    {
      queued: "در صف",
      running: "در حال اجرا",
      paused: "متوقف",
      completed: "خاتمه‌یافته",
      cancelled: "لغو شده",
      failed: "ناموفق",
    } as const
  )[s];
}

function itemStatusFa(s: AuditRun["items"][number]["status"]) {
  return (
    {
      queued: "در صف",
      inProgress: "در حال پردازش",
      clean: "پاک",
      highRisk: "پرریسک",
      failed: "ناموفق",
    } as const
  )[s];
}

function formatDuration(ms: number) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => toFaDigits(String(n).padStart(2, "0"));
  return h > 0 ? `${toFaDigits(h)}:${pad(m)}:${pad(sec)}` : `${toFaDigits(m)}:${pad(sec)}`;
}
