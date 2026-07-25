import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCompactIRR, toFaDigits } from "@/lib/format";
import {
  TrendingUp,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/app/executive/")({
  head: () => ({
    meta: [
      { title: "داشبورد مدیریتی — دیدبان حسابرسی" },
      { name: "description", content: "شاخص‌های کلیدی عملکرد حسابرسی داخلی و پوشش کنترل‌ها." },
    ],
  }),
  component: ExecutivePage,
});

function ExecutivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["executive-kpis"],
    queryFn: () => services.executive.getKPIs(),
  });

  if (isLoading || !data)
    return <div className="p-6 text-muted-foreground">در حال بارگذاری…</div>;

  const maxTrend = Math.max(...data.riskTrend.map((r) => r.score), 1);
  const maxThroughput = Math.max(...data.monthlyThroughput.map((t) => t.reviewed), 1);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">داشبورد مدیریتی</h1>
        <p className="text-sm text-muted-foreground mt-1">
          نمای اجرایی از عملکرد حسابرسی داخلی، ریسک و پوشش کنترل‌ها.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="مبلغ در معرض ریسک"
          value={formatCompactIRR(data.amountAtRisk)}
          sub={`از ${formatCompactIRR(data.totalAmountReviewed)} بررسی‌شده`}
          tone="destructive"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="پوشش کنترل‌ها"
          value={`${toFaDigits(data.controlCoverage)}٪`}
          progress={data.controlCoverage}
          tone="success"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="میانگین زمان بستن یافته"
          value={`${toFaDigits(data.avgTimeToClose)} روز`}
          sub={`SLA: ${toFaDigits(data.slaCompliance)}٪`}
          tone="default"
        />
        <KpiCard
          icon={<AlertOctagon className="h-5 w-5" />}
          label="یافته‌های معوق"
          value={toFaDigits(data.overdueFindings)}
          sub={`از ${toFaDigits(data.openFindings)} یافته باز`}
          tone="warning"
        />
      </div>

      {/* Findings status bar */}
      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">وضعیت یافته‌ها</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <StatChip label="پیشنهاد AI" value={data.suggestedFindings} tone="warning" />
          <StatChip label="تأییدشده" value={data.approvedFindings} tone="success" />
          <StatChip label="در حال رسیدگی" value={data.openFindings} tone="default" />
          <StatChip label="معوق" value={data.overdueFindings} tone="destructive" />
        </div>
      </Card>

      {/* Risk trend + throughput */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">روند ریسک ماهانه</div>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              افزایشی
            </Badge>
          </div>
          <div className="flex items-end gap-3 h-40">
            {data.riskTrend.map((r) => (
              <div key={r.period} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${(r.score / maxTrend) * 100}%` }}
                  title={`${r.score}`}
                />
                <div className="text-[11px] text-muted-foreground">{r.period}</div>
                <div className="text-xs font-medium">{toFaDigits(r.score)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">ظرفیت رسیدگی ماهانه</div>
          <div className="space-y-2">
            {data.monthlyThroughput.map((m) => (
              <div key={m.period} className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">{m.period}</span>
                  <span>
                    {toFaDigits(m.reviewed)} بررسی‌شده / {toFaDigits(m.flagged)} علامت‌گذاری
                  </span>
                </div>
                <div className="h-2 rounded bg-muted overflow-hidden flex">
                  <div
                    className="bg-primary/70 h-full"
                    style={{ width: `${((m.reviewed - m.flagged) / maxThroughput) * 100}%` }}
                  />
                  <div
                    className="bg-destructive/70 h-full"
                    style={{ width: `${(m.flagged / maxThroughput) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Category breakdown + top vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">تفکیک یافته‌ها بر اساس دسته</div>
          <div className="space-y-3">
            {data.categoryBreakdown.map((c) => {
              const total = data.categoryBreakdown.reduce((s, x) => s + x.count, 0);
              const pct = Math.round((c.count / total) * 100);
              return (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{c.category}</span>
                    <span className="text-muted-foreground">
                      {toFaDigits(c.count)} یافته — {formatCompactIRR(c.amount)}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">تأمین‌کنندگان پرریسک</div>
          <ul className="space-y-2">
            {data.topRiskVendors.map((v) => (
              <li key={v.vendorId}>
                <Link
                  to="/app/vendors/$id"
                  params={{ id: v.vendorId }}
                  className="flex items-center justify-between p-2 rounded hover:bg-accent text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{v.name}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{formatCompactIRR(v.amount)}</span>
                    <Badge
                      className={
                        v.riskScore >= 70
                          ? "bg-destructive text-destructive-foreground"
                          : v.riskScore >= 40
                            ? "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]"
                            : "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]"
                      }
                    >
                      {toFaDigits(v.riskScore)}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  progress,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  progress?: number;
  tone: "default" | "success" | "warning" | "destructive";
}) {
  const toneCls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-[color:var(--color-success)]"
        : tone === "warning"
          ? "text-[color:var(--color-warning)]"
          : "text-primary";
  return (
    <Card className="p-4 space-y-2">
      <div className={`flex items-center gap-2 text-xs ${toneCls}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {progress !== undefined && <Progress value={progress} className="h-1.5" />}
    </Card>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "destructive";
}) {
  const cls =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "success"
        ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"
        : tone === "warning"
          ? "bg-[color:var(--color-warning)]/10 text-[color:var(--color-warning)]"
          : "bg-primary/10 text-primary";
  return (
    <div className={`rounded-md p-3 ${cls}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-lg font-bold mt-1">{toFaDigits(value)}</div>
    </div>
  );
}
