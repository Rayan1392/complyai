import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowRightCircle, CheckCircle2, Circle, ListChecks } from "lucide-react";
import { documents } from "@/services/mockData";
import { useState } from "react";
import { toast } from "sonner";
import type { FindingStatus } from "@/types/domain";
import { toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/app/findings/$id")({
  head: () => ({ meta: [{ title: "یافته حسابرسی — دیدبان حسابرسی" }] }),
  component: FindingDetail,
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

function FindingDetail() {
  const { id } = useParams({ from: "/app/findings/$id" });
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["finding", id],
    queryFn: () => services.findings.get(id),
  });
  const trail = useQuery({
    queryKey: ["finding-trail", id, data?.documentId],
    queryFn: async () => {
      if (!data) return [];
      const all = await services.trail.listForDocument(data.documentId);
      return all.filter((t) => t.entityKind === "finding" || t.entityId === id);
    },
    enabled: !!data,
  });

  const [response, setResponse] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDue, setActionDue] = useState("");

  const statusMut = useMutation({
    mutationFn: (s: FindingStatus) => services.findings.updateStatus(id, s, "علی محمدی"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finding", id] });
      qc.invalidateQueries({ queryKey: ["findings"] });
      qc.invalidateQueries({ queryKey: ["finding-trail", id] });
      toast.success("وضعیت به‌روزرسانی شد");
    },
  });

  const respMut = useMutation({
    mutationFn: () => services.findings.setManagementResponse(id, response, "علی محمدی"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finding", id] });
      qc.invalidateQueries({ queryKey: ["finding-trail", id] });
      setResponse("");
      toast.success("پاسخ مدیریت ثبت شد");
    },
  });

  const addAction = useMutation({
    mutationFn: () =>
      services.findings.addCorrectiveAction(
        id,
        { title: actionTitle, owner: actionOwner, dueDate: actionDue },
        "علی محمدی",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finding", id] });
      qc.invalidateQueries({ queryKey: ["finding-trail", id] });
      setActionTitle("");
      setActionOwner("");
      setActionDue("");
      toast.success("اقدام اصلاحی افزوده شد");
    },
  });

  const toggleAction = useMutation({
    mutationFn: (aid: string) => services.findings.toggleCorrectiveAction(id, aid, "علی محمدی"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finding", id] });
      qc.invalidateQueries({ queryKey: ["finding-trail", id] });
    },
  });

  if (!data) return <div className="p-6 text-muted-foreground">در حال بارگذاری…</div>;
  const d = documents.find((x) => x.id === data.documentId);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <Link
        to="/app/findings"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowRightCircle className="h-3 w-3" />
        بازگشت به مرکز یافته‌ها
      </Link>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-destructive text-destructive-foreground">شدت {data.severity}</Badge>
        <Badge variant="outline">{STATUS_LABEL[data.status] ?? data.status}</Badge>
        <Badge variant="outline">
          {data.createdBy === "ai" ? "تولید AI" : "دستی"}
        </Badge>
      </div>

      <h1 className="text-2xl font-bold">{data.title}</h1>
      <div className="text-sm text-muted-foreground">
        سند مرتبط:{" "}
        <Link
          to="/app/documents/$id"
          params={{ id: data.documentId }}
          className="text-primary hover:underline"
        >
          {d?.number} — {d?.title}
        </Link>
      </div>

      <Card className="p-4 space-y-4">
        <Section title="علت ریشه‌ای" content={data.rootCause} />
        <Section title="پیشنهاد حسابرس" content={data.auditorSuggestion} />
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">اقدامات حسابرس</div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["Confirmed", "تأیید یافته"],
              ["Edited", "علامت‌گذاری به عنوان ویرایش‌شده"],
              ["NeedsInvestigation", "نیازمند بررسی بیشتر"],
              ["InRemediation", "شروع مرحلهٔ اصلاح"],
              ["Closed", "بستن یافته"],
              ["Dismissed", "رد یافته"],
            ] as [FindingStatus, string][]
          ).map(([s, label]) => (
            <Button
              key={s}
              size="sm"
              variant={data.status === s ? "default" : "outline"}
              disabled={data.status === s || statusMut.isPending}
              onClick={() => statusMut.mutate(s)}
              className={s === "Dismissed" ? "text-destructive" : undefined}
            >
              {label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">پاسخ مدیریت</div>
        {data.managementResponse ? (
          <div className="rounded-md bg-muted p-3 text-sm leading-7">{data.managementResponse}</div>
        ) : (
          <div className="text-xs text-muted-foreground">پاسخ مدیریتی هنوز ثبت نشده است.</div>
        )}
        <Textarea
          placeholder="متن پاسخ مدیریت به این یافته را وارد کنید…"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={3}
        />
        <div>
          <Button
            size="sm"
            disabled={!response.trim() || respMut.isPending}
            onClick={() => respMut.mutate()}
          >
            ثبت پاسخ مدیریت
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          اقدامات اصلاحی ({toFaDigits(data.correctiveActions.length)})
        </div>
        {data.correctiveActions.length === 0 ? (
          <div className="text-xs text-muted-foreground">هنوز اقدام اصلاحی ثبت نشده است.</div>
        ) : (
          <ul className="space-y-2">
            {data.correctiveActions.map((a) => (
              <li
                key={a.id}
                className="rounded-md border p-3 text-sm flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    مسئول: {a.owner || "—"} • موعد: {a.dueDate || "—"} • وضعیت:{" "}
                    {a.status === "done" ? "انجام‌شده" : "باز"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleAction.mutate(a.id)}
                  className="gap-1"
                >
                  {a.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  {a.status === "done" ? "بازگردانی" : "علامت انجام‌شده"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid md:grid-cols-3 gap-2 pt-2 border-t">
          <Input
            placeholder="عنوان اقدام"
            value={actionTitle}
            onChange={(e) => setActionTitle(e.target.value)}
          />
          <Input
            placeholder="مسئول"
            value={actionOwner}
            onChange={(e) => setActionOwner(e.target.value)}
          />
          <Input
            placeholder="موعد (مثلاً ۱۴۰۵/۰۵/۰۱)"
            value={actionDue}
            onChange={(e) => setActionDue(e.target.value)}
          />
        </div>
        <div>
          <Button
            size="sm"
            disabled={!actionTitle.trim() || addAction.isPending}
            onClick={() => addAction.mutate()}
          >
            افزودن اقدام اصلاحی
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">تاریخچه رویدادها</div>
        {trail.data && trail.data.length > 0 ? (
          <ul className="space-y-2">
            {trail.data.map((t) => (
              <li key={t.id} className="text-xs border-r-2 border-primary/40 pr-3">
                <div className="font-medium">{t.action}</div>
                <div className="text-muted-foreground">
                  {t.actor} — {t.timestamp}
                  {t.detail ? ` — ${t.detail}` : ""}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-muted-foreground">رویدادی ثبت نشده است.</div>
        )}
      </Card>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <p className="text-sm leading-7">{content}</p>
    </div>
  );
}
