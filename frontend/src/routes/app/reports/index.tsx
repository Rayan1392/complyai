import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import type { DocumentComplianceReport } from "@/services";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileBarChart2, Printer } from "lucide-react";
import { formatIRR, toFaDigits } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reports/")({
  head: () => ({ meta: [{ title: "گزارش‌ها و خروجی — دیدبان حسابرسی" }] }),
  component: ReportsPage,
});

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderReportHtml(r: DocumentComplianceReport): string {
  const evals = r.result.evaluations
    .map(
      (e) => `
      <tr>
        <td>${e.status}</td>
        <td>${e.rationale}</td>
        <td>${(e.confidence * 100).toFixed(0)}٪</td>
        <td>${e.evaluationMode}</td>
      </tr>`,
    )
    .join("");
  const f = r.result.suggestedFinding;
  const cits = (f?.citationIds ?? [])
    .map((id) => r.result.citations.find((c) => c.id === id))
    .filter(Boolean)
    .map(
      (c) =>
        `<li>${c!.sourceTitle} — ماده ${c!.articleNumber ?? "—"} صفحه ${c!.pageNumber ?? "—"} (اعتبار: ${c!.effectiveFrom})</li>`,
    )
    .join("");
  return `<!doctype html>
<html dir="rtl" lang="fa"><head><meta charset="utf-8" />
<title>گزارش انطباق ${r.document.number}</title>
<style>
  body { font-family: Vazirmatn, Tahoma, sans-serif; padding: 24px; color:#111; }
  h1 { margin:0 0 8px 0; } h2 { margin-top:24px; border-bottom:1px solid #ddd; padding-bottom:4px; }
  .meta { color:#555; font-size: 13px; }
  table { width:100%; border-collapse: collapse; margin-top:8px; font-size:13px; }
  th, td { border:1px solid #e5e5e5; padding:6px 8px; text-align:right; }
  th { background:#f6f6f6; }
  .risk { display:inline-block; padding:4px 10px; border-radius:6px; background:#fde8e8; color:#9b1c1c; font-weight:600; }
  .footer { margin-top:32px; font-size:12px; color:#666; border-top:1px dashed #ccc; padding-top:10px; }
</style></head>
<body>
  <h1>گزارش انطباق سند ${r.document.number}</h1>
  <div class="meta">${r.document.title} — تاریخ سند: ${r.document.date} — تولید گزارش: ${r.generatedAt}</div>
  <p><b>فروشنده:</b> ${r.vendor?.name ?? "—"} &nbsp;|&nbsp; <b>مبلغ:</b> ${formatIRR(r.document.amount)}</p>
  <p><span class="risk">امتیاز ریسک: ${r.result.risk.score} — ${r.result.risk.band}</span></p>

  <h2>ارزیابی کنترل‌ها</h2>
  <table><thead><tr><th>وضعیت</th><th>توضیح</th><th>اطمینان</th><th>حالت اجرا</th></tr></thead>
  <tbody>${evals}</tbody></table>

  <h2>تفسیر هوش مصنوعی</h2>
  <p>${r.result.interpretation.summary}</p>

  ${
    f
      ? `<h2>یافتهٔ حسابرسی پیشنهادی</h2>
    <p><b>${f.title}</b></p>
    <p><b>علت ریشه‌ای:</b> ${f.rootCause}</p>
    <p><b>پیشنهاد حسابرس:</b> ${f.auditorSuggestion}</p>
    <p><b>وضعیت فعلی:</b> ${f.status}</p>
    <h3>استنادات</h3><ul>${cits}</ul>`
      : ""
  }

  <div class="footer">
    این گزارش توسط سامانه دیدبان حسابرسی داخلی هوشمند تولید شده است.
  </div>
  <script>window.onload = () => window.print();</script>
</body></html>`;
}

function ReportsPage() {
  const { data: docs = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => services.documents.list(),
  });
  const [selected, setSelected] = useState<string>("");

  const build = useMutation({
    mutationFn: () => services.reports.buildDocumentReport(selected),
    onSuccess: (r) => {
      const html = renderReportHtml(r);
      const w = window.open("", "_blank");
      if (!w) {
        download(`report-${r.document.number}.html`, html, "text/html;charset=utf-8");
        toast.success("گزارش دانلود شد (پنجرهٔ پاپ‌آپ مسدود بود)");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      toast.success("گزارش انطباق آماده شد");
    },
    onError: () => toast.error("تولید گزارش ناموفق بود"),
  });

  async function downloadFindings() {
    const csv = await services.reports.findingsCsv();
    download("findings.csv", csv, "text/csv;charset=utf-8");
    toast.success("خروجی CSV یافته‌ها دانلود شد");
  }
  async function downloadDocs() {
    const csv = await services.reports.documentsCsv();
    download("documents.csv", csv, "text/csv;charset=utf-8");
    toast.success("خروجی CSV اسناد دانلود شد");
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileBarChart2 className="h-6 w-6 text-primary" />
          گزارش‌ها و خروجی
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          تولید گزارش انطباق قابل چاپ برای یک سند، و خروجی CSV از یافته‌ها و اسناد.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="text-sm font-semibold">گزارش انطباق سند</div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px]">
            <div className="text-xs text-muted-foreground mb-1">انتخاب سند</div>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="یک سند را انتخاب کنید…" />
              </SelectTrigger>
              <SelectContent>
                {docs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.number} — {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => build.mutate()}
            disabled={!selected || build.isPending}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {build.isPending ? "در حال تولید…" : "تولید گزارش قابل چاپ"}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          گزارش شامل ارزیابی کنترل‌ها، تفسیر AI، یافتهٔ پیشنهادی و استنادات پایگاه دانش است.
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="text-sm font-semibold">خروجی داده‌ها (CSV)</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">همهٔ یافته‌های حسابرسی</div>
              <div className="text-xs text-muted-foreground mt-1">
                خروجی فهرست کامل یافته‌ها به همراه وضعیت و ارجاع به سند.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadFindings} className="gap-2">
              <Download className="h-4 w-4" /> دانلود
            </Button>
          </div>
          <div className="rounded-lg border p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">اسناد حسابداری</div>
              <div className="text-xs text-muted-foreground mt-1">
                خروجی اسناد ثبت‌شده به همراه امتیاز ریسک و فروشنده.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadDocs} className="gap-2">
              <Download className="h-4 w-4" /> دانلود
            </Button>
          </div>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        برای گزارش‌های فردی یافته، از{" "}
        <Link to="/app/findings" className="text-primary hover:underline">
          مرکز یافته‌ها
        </Link>{" "}
        وارد شوید. تعداد اسناد جاری: {toFaDigits(docs.length)}
      </div>
    </div>
  );
}
