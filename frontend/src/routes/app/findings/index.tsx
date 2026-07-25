import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toFaDigits } from "@/lib/format";
import { documents } from "@/services/mockData";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { FindingStatus } from "@/types/domain";

export const Route = createFileRoute("/app/findings/")({
  head: () => ({ meta: [{ title: "مرکز یافته‌ها — دیدبان حسابرسی" }] }),
  component: FindingsPage,
});

const STATUS_LABEL: Record<FindingStatus, string> = {
  Suggested: "پیشنهادی",
  Confirmed: "تأییدشده",
  Edited: "ویرایش‌شده",
  Dismissed: "رد‌شده",
  NeedsInvestigation: "نیازمند بررسی",
  InRemediation: "در حال اصلاح",
  Closed: "بسته‌شده",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "پایین",
  medium: "متوسط",
  high: "بالا",
  critical: "بحرانی",
};

function badgeClass(sev: string) {
  if (sev === "critical" || sev === "high") return "bg-destructive text-destructive-foreground";
  if (sev === "medium")
    return "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]";
  return "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]";
}

function FindingsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["findings"],
    queryFn: () => services.findings.list(),
  });

  const [status, setStatus] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");

  const filtered = useMemo(
    () =>
      data.filter(
        (f) =>
          (status === "all" || f.status === status) &&
          (severity === "all" || f.severity === severity),
      ),
    [data, status, severity],
  );

  const update = useMutation({
    mutationFn: (v: { id: string; s: FindingStatus }) =>
      services.findings.updateStatus(v.id, v.s, "علی محمدی"),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["findings"] });
      qc.invalidateQueries({ queryKey: ["finding", v.id] });
      toast.success("وضعیت یافته به‌روزرسانی شد");
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">مرکز یافته‌ها</h1>
        <p className="text-sm text-muted-foreground mt-1">
          یافته‌های حسابرسی تولیدشده توسط ارکستراتور یا ثبت‌شده توسط حسابرس.
        </p>
      </div>

      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1">وضعیت</div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <div className="text-xs text-muted-foreground mb-1">شدت</div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(SEVERITY_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground ms-auto">
          نمایش {toFaDigits(filtered.length)} از {toFaDigits(data.length)} یافته
        </div>
      </Card>

      {isLoading ? (
        <div className="h-40 bg-muted animate-pulse rounded" />
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground space-y-3">
          <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <div>یافته‌ای مطابق فیلترها وجود ندارد.</div>
          <div className="text-xs">
            برای تولید یافته‌ها، از{" "}
            <Link to="/app/monitoring" className="text-primary hover:underline">
              کنترل‌های پیوسته
            </Link>{" "}
            اجرای دسته‌ای بگیرید یا یک سند را باز کنید.
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((f) => {
            const d = documents.find((x) => x.id === f.documentId);
            return (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={badgeClass(f.severity)}>
                        {SEVERITY_LABEL[f.severity] ?? f.severity}
                      </Badge>
                      <Badge variant="outline">{STATUS_LABEL[f.status] ?? f.status}</Badge>
                      <Badge variant="outline">
                        {f.createdBy === "ai" ? "تولید AI" : "دستی"}
                      </Badge>
                    </div>
                    <Link
                      to="/app/findings/$id"
                      params={{ id: f.id }}
                      className="text-sm font-semibold hover:underline"
                    >
                      {f.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      سند: {d?.number} — {d?.title}
                    </div>
                  </div>
                  <Link
                    to="/app/documents/$id"
                    params={{ id: f.documentId }}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    مشاهده در سند <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-7 text-foreground/90">{f.rootCause}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>ایجاد: {f.createdAt}</span>
                  <span>•</span>
                  <span>استنادات: {toFaDigits(f.citationIds.length)}</span>
                  <span>•</span>
                  <span>اقدامات اصلاحی: {toFaDigits(f.correctiveActions.length)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["Confirmed", "تأیید"],
                      ["Edited", "ویرایش"],
                      ["NeedsInvestigation", "بررسی بیشتر"],
                      ["InRemediation", "در حال اصلاح"],
                      ["Closed", "بستن"],
                      ["Dismissed", "رد"],
                    ] as [FindingStatus, string][]
                  ).map(([s, label]) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={f.status === s ? "default" : "outline"}
                      disabled={f.status === s || update.isPending}
                      onClick={() => update.mutate({ id: f.id, s })}
                      className={s === "Dismissed" ? "text-destructive" : undefined}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
