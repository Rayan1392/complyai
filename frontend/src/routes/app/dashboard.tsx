import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { formatCompactIRR, toFaDigits } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  Coins,
  CheckCircle2,
  Percent,
  Files,
  FileWarning,
} from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "داشبورد حسابرسی — دیدبان حسابرسی" }] }),
  component: DashboardPage,
});

const SEVERITY_COLORS = [
  "var(--color-destructive)",
  "var(--color-warning)",
  "var(--color-chart-1)",
  "var(--color-chart-2)",
];

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => services.dashboard.getMetrics(),
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">داشبورد حسابرسی داخلی</h1>
          <p className="text-sm text-muted-foreground mt-1">
            نمای مدیریتی از ریسک، یافته‌ها و پوشش حسابرسی هوشمند.
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Kpi
          icon={<FileText className="h-4 w-4" />}
          label="اسناد بررسی‌شده"
          value={data ? toFaDigits(data.documentsReviewed) : "—"}
          hint="از ابتدای سال مالی"
        />
        <Kpi
          icon={<ShieldAlert className="h-4 w-4" />}
          label="اسناد پرریسک"
          value={data ? toFaDigits(data.highRiskDocuments) : "—"}
          tone="destructive"
        />
        <Kpi
          icon={<FileWarning className="h-4 w-4" />}
          label="مدارک ناقص"
          value={data ? toFaDigits(data.incompleteEvidence) : "—"}
          tone="warning"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="مغایرت قانونی"
          value={data ? toFaDigits(data.legalIssues) : "—"}
          tone="destructive"
        />
        <Kpi
          icon={<Files className="h-4 w-4" />}
          label="مغایرت حسابداری"
          value={data ? toFaDigits(data.accountingIssues) : "—"}
        />
        <Kpi
          icon={<Coins className="h-4 w-4" />}
          label="مبلغ در معرض ریسک"
          value={data ? formatCompactIRR(data.amountAtRisk) : "—"}
          tone="destructive"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="یافته‌های باز"
          value={data ? toFaDigits(data.openFindings) : "—"}
          tone="warning"
        />
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="یافته‌های رفع‌شده"
          value={data ? toFaDigits(data.resolvedFindings) : "—"}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">روند ریسک در شش ماه اخیر</div>
              <div className="text-xs text-muted-foreground">میانگین ماهانه امتیاز ریسک</div>
            </div>
            <div className="text-2xl font-bold text-primary">
              {data ? toFaDigits(data.riskTrend.at(-1)?.score ?? 0) : "—"}
            </div>
          </div>
          <div className="h-64">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer>
                <LineChart data={data?.riskTrend}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold">توزیع یافته‌ها بر اساس شدت</div>
            <div className="text-xs text-muted-foreground">مجموع یافته‌های تولیدشده</div>
          </div>
          <div className="h-64">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data?.findingsBySeverity}
                    dataKey="count"
                    nameKey="severity"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data?.findingsBySeverity.map((_, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[i % SEVERITY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {data?.findingsBySeverity.map((s, i) => (
              <div key={s.severity} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: SEVERITY_COLORS[i % SEVERITY_COLORS.length] }}
                />
                <span>{s.severity}</span>
                <span className="ms-auto text-muted-foreground">{toFaDigits(s.count)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">یافته‌ها بر اساس دسته</div>
            <div className="text-xs text-muted-foreground">
              تفکیک بر اساس مالیات، بیمه، استانداردها و کنترل داخلی
            </div>
          </div>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="h-64">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer>
              <BarChart data={data?.findingsByCategory}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-[color:var(--color-success)]",
    warning: "text-[color:var(--color-warning)]",
    destructive: "text-destructive",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>{label}</span>
        <span>{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function ChartSkeleton() {
  return <div className="h-full w-full rounded-md bg-muted animate-pulse" />;
}

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
} as const;
