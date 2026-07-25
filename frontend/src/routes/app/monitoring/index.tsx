import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/services";
import type { MonitoringRun } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, PlayCircle, AlertOctagon, ShieldAlert } from "lucide-react";
import { toFaDigits } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/monitoring/")({
  head: () => ({ meta: [{ title: "کنترل‌های پیوسته — دیدبان حسابرسی" }] }),
  component: MonitoringPage,
});

function bandLabel(b: string) {
  return b === "critical" ? "بحرانی" : b === "high" ? "بالا" : b === "medium" ? "متوسط" : "پایین";
}
function bandClass(b: string) {
  if (b === "critical" || b === "high") return "bg-destructive text-destructive-foreground";
  if (b === "medium")
    return "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]";
  return "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]";
}

function MonitoringPage() {
  const qc = useQueryClient();
  const [run, setRun] = useState<MonitoringRun | null>(() => services.monitoring.lastRun());

  const mut = useMutation({
    mutationFn: () => services.monitoring.runBatch(),
    onSuccess: (r) => {
      setRun(r);
      qc.invalidateQueries({ queryKey: ["findings"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(`اجرای دسته‌ای روی ${toFaDigits(r.totalDocuments)} سند تکمیل شد`);
    },
    onError: () => toast.error("اجرای دسته‌ای با خطا مواجه شد"),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            کنترل‌های پیوسته
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            اجرای دسته‌ای ارکستراتور انطباق روی همه اسناد ثبت‌شده و پایش سیگنال‌های ریسک.
          </p>
        </div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-2">
          <PlayCircle className="h-4 w-4" />
          {mut.isPending ? "در حال اجرا…" : "اجرای دسته‌ای"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="اسناد بررسی‌شده" value={run ? toFaDigits(run.totalDocuments) : "—"} />
        <Metric
          label="اسناد پرریسک"
          value={run ? toFaDigits(run.highRiskCount) : "—"}
          tone="danger"
        />
        <Metric label="کنترل‌های ناموفق" value={run ? toFaDigits(run.failCount) : "—"} />
        <Metric
          label="یافته‌های پیشنهادی"
          value={run ? toFaDigits(run.suggestedFindings) : "—"}
          tone="warn"
        />
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            نتیجهٔ آخرین اجرا
          </div>
          <div className="text-xs text-muted-foreground">
            {run ? `اجرا در ${run.ranAt}` : "هنوز اجرایی انجام نشده است"}
          </div>
        </div>
        {!run ? (
          <div className="p-8 text-center text-sm text-muted-foreground space-y-3">
            <AlertOctagon className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <div>برای پایش پیوسته، دکمهٔ «اجرای دسته‌ای» را بزنید.</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">شمارهٔ سند</TableHead>
                <TableHead className="text-start">عنوان</TableHead>
                <TableHead className="text-start">امتیاز ریسک</TableHead>
                <TableHead className="text-start">سطح</TableHead>
                <TableHead className="text-start">کنترل‌های ناموفق</TableHead>
                <TableHead className="text-start">یافته پیشنهادی</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.items.map((i) => (
                <TableRow key={i.documentId} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/app/documents/$id"
                      params={{ id: i.documentId }}
                      className="text-primary hover:underline"
                    >
                      {i.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{i.documentTitle}</TableCell>
                  <TableCell className="text-sm">{toFaDigits(i.riskScore)}</TableCell>
                  <TableCell>
                    <Badge className={bandClass(i.band)}>{bandLabel(i.band)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{toFaDigits(i.failedRules)}</TableCell>
                  <TableCell>
                    {i.suggestedFindingId ? (
                      <Link
                        to="/app/findings/$id"
                        params={{ id: i.suggestedFindingId }}
                        className="text-xs text-primary hover:underline"
                      >
                        مشاهدهٔ یافته
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "warn";
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          "text-2xl font-bold mt-1 " +
          (tone === "danger"
            ? "text-destructive"
            : tone === "warn"
              ? "text-[color:var(--color-warning)]"
              : "")
        }
      >
        {value}
      </div>
    </Card>
  );
}
