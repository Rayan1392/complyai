import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { phase4, services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EngagementStatus } from "@/types/domain";
import { toFaDigits } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  FileText,
  Plus,
  Target,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/app/engagements/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `مأموریت ${params.id} — دیدبان حسابرسی` },
      { name: "description", content: "جزئیات، تیم، وظایف و اسناد مأموریت حسابرسی." },
    ],
  }),
  component: EngagementDetailPage,
});

function EngagementDetailPage() {
  const { id } = useParams({ from: "/app/engagements/$id" });
  const qc = useQueryClient();
  const { data: e } = useQuery({
    queryKey: ["engagement", id],
    queryFn: () => phase4.engagements.get(id),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => services.users.list(),
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => services.documents.list(),
  });
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<string | undefined>();
  const [taskDue, setTaskDue] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["engagement", id] });
    qc.invalidateQueries({ queryKey: ["engagements"] });
  };

  if (!e)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        در حال بارگذاری…
      </div>
    );

  const lead = users.find((u) => u.id === e.leadAuditorId);
  const team = users.filter((u) => e.teamIds.includes(u.id));
  const scopedDocs = docs.filter((d) => e.documentIds.includes(d.id));

  const changeStatus = async (v: EngagementStatus) => {
    await phase4.engagements.updateStatus(e.id, v);
    invalidate();
    toast.success("وضعیت مأموریت به‌روزرسانی شد.");
  };
  const toggleTask = async (taskId: string) => {
    await phase4.engagements.toggleTask(e.id, taskId);
    invalidate();
  };
  const addTask = async () => {
    if (!taskTitle.trim()) return;
    await phase4.engagements.addTask(e.id, {
      title: taskTitle,
      assigneeId: taskAssignee,
      dueDate: taskDue || undefined,
    });
    setTaskTitle("");
    setTaskDue("");
    invalidate();
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/app/engagements"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          مأموریت‌ها
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="font-medium">{e.code}</span>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{e.title}</h1>
          <div className="flex gap-2 items-center mt-2 flex-wrap">
            <Badge variant="outline">{e.code}</Badge>
            <Badge variant="outline">
              اولویت{" "}
              {e.priority === "high" ? "زیاد" : e.priority === "medium" ? "متوسط" : "کم"}
            </Badge>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {e.startDate} → {e.endDate}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">وضعیت:</span>
          <Select value={e.status} onValueChange={(v) => changeStatus(v as EngagementStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Planned">برنامه‌ریزی</SelectItem>
              <SelectItem value="InProgress">در حال اجرا</SelectItem>
              <SelectItem value="Review">بازبینی</SelectItem>
              <SelectItem value="Closed">خاتمه‌یافته</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">پیشرفت</div>
          <div className="text-2xl font-bold">{toFaDigits(e.progress)}٪</div>
          <Progress value={e.progress} className="h-2 mt-2" />
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">تیم حسابرسی</div>
          <div className="text-sm font-semibold inline-flex items-center gap-1">
            <Users className="h-4 w-4" />
            سرپرست: {lead?.fullName ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {team.map((u) => u.fullName).join("، ") || "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">دامنه</div>
          <div className="text-sm">{e.scope}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">هدف</div>
        <p className="text-sm text-muted-foreground">{e.objective}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold inline-flex items-center gap-1">
              <Target className="h-4 w-4" />
              وظایف ({toFaDigits(e.tasks.filter((t) => t.done).length)}/
              {toFaDigits(e.tasks.length)})
            </div>
          </div>
          <div className="space-y-2">
            {e.tasks.map((t) => {
              const a = users.find((u) => u.id === t.assigneeId);
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-2 py-2 border-b last:border-0"
                >
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={() => toggleTask(t.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm ${
                        t.done ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex gap-3 mt-0.5">
                      {a && <span>مسئول: {a.fullName}</span>}
                      {t.dueDate && <span>سررسید: {t.dueDate}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {!e.tasks.length && (
              <div className="text-xs text-muted-foreground py-4 text-center">
                وظیفه‌ای ثبت نشده است.
              </div>
            )}
          </div>
          <div className="pt-2 border-t space-y-2">
            <Input
              placeholder="عنوان وظیفه جدید…"
              value={taskTitle}
              onChange={(ev) => setTaskTitle(ev.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="مسئول" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="سررسید (مثلاً ۱۴۰۵/۰۵/۰۱)"
                value={taskDue}
                onChange={(ev) => setTaskDue(ev.target.value)}
              />
            </div>
            <Button onClick={addTask} size="sm" className="w-full">
              <Plus className="h-4 w-4 ms-1" />
              افزودن وظیفه
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold inline-flex items-center gap-1">
            <FileText className="h-4 w-4" />
            اسناد در دامنهٔ مأموریت ({toFaDigits(scopedDocs.length)})
          </div>
          {scopedDocs.length ? (
            <div className="rounded-md border divide-y">
              {scopedDocs.map((d) => (
                <Link
                  key={d.id}
                  to="/app/documents/$id"
                  params={{ id: d.id }}
                  className="flex items-center justify-between p-2 hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{d.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.number} — امتیاز {toFaDigits(d.riskScore)}
                    </div>
                  </div>
                  <Badge
                    className={
                      d.riskScore >= 70
                        ? "bg-destructive text-destructive-foreground"
                        : d.riskScore >= 40
                          ? "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]"
                          : "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]"
                    }
                  >
                    {d.riskScore >= 70 ? "زیاد" : d.riskScore >= 40 ? "متوسط" : "کم"}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">
              سندی به این مأموریت تخصیص نیافته است.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
