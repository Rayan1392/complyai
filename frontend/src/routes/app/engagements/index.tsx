import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { phase4, services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Engagement,
  EngagementPriority,
  EngagementStatus,
} from "@/types/domain";
import { toFaDigits } from "@/lib/format";
import { Plus, Calendar, Users, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/engagements/")({
  head: () => ({
    meta: [
      { title: "مأموریت‌های حسابرسی — دیدبان حسابرسی" },
      {
        name: "description",
        content: "برنامه‌ریزی، تخصیص و پیگیری مأموریت‌های حسابرسی داخلی.",
      },
    ],
  }),
  component: EngagementsPage,
});

function EngagementsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["engagements"],
    queryFn: () => phase4.engagements.list(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => services.users.list(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    title: "",
    scope: "",
    objective: "",
    priority: "medium" as EngagementPriority,
    leadId: users[0]?.id ?? "u-1",
    startDate: "۱۴۰۵/۰۵/۰۱",
    endDate: "۱۴۰۵/۰۶/۰۱",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["engagements"] });

  const create = async () => {
    if (!form.title.trim() || !form.code.trim())
      return toast.error("کد و عنوان مأموریت الزامی است.");
    await phase4.engagements.create({
      code: form.code,
      title: form.title,
      scope: form.scope,
      objective: form.objective,
      status: "Planned",
      priority: form.priority,
      leadAuditorId: form.leadId,
      teamIds: [form.leadId],
      startDate: form.startDate,
      endDate: form.endDate,
      documentIds: [],
      vendorIds: [],
      tasks: [],
    });
    setOpen(false);
    invalidate();
    toast.success("مأموریت جدید ثبت شد.");
  };

  const grouped: Record<EngagementStatus, Engagement[]> = {
    Planned: [],
    InProgress: [],
    Review: [],
    Closed: [],
  };
  data.forEach((e) => grouped[e.status].push(e));

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">مأموریت‌های حسابرسی</h1>
          <p className="text-sm text-muted-foreground mt-1">
            برنامه‌ریزی، تخصیص تیم و پیگیری وظایف مأموریت‌های حسابرسی داخلی.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ms-1" />
              ایجاد مأموریت جدید
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>ایجاد مأموریت حسابرسی</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">کد مأموریت</Label>
                  <Input
                    value={form.code}
                    placeholder="ENG-1405-09"
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">اولویت</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) =>
                      setForm({ ...form, priority: v as EngagementPriority })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">زیاد</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="low">کم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">عنوان</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">دامنه</Label>
                <Textarea
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">هدف</Label>
                <Textarea
                  value={form.objective}
                  onChange={(e) =>
                    setForm({ ...form, objective: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">تاریخ شروع</Label>
                  <Input
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">تاریخ پایان</Label>
                  <Input
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">حسابرس مسئول</Label>
                <Select
                  value={form.leadId}
                  onValueChange={(v) => setForm({ ...form, leadId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create}>ثبت مأموریت</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {(Object.keys(grouped) as EngagementStatus[]).map((k) => (
          <StatusColumn key={k} status={k} items={grouped[k]} users={users} />
        ))}
      </div>
    </div>
  );
}

function StatusColumn({
  status,
  items,
  users,
}: {
  status: EngagementStatus;
  items: Engagement[];
  users: { id: string; fullName: string }[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground">
          {toFaDigits(items.length)} مورد
        </span>
      </div>
      <div className="space-y-2">
        {items.map((e) => {
          const lead = users.find((u) => u.id === e.leadAuditorId);
          return (
            <Link
              key={e.id}
              to="/app/engagements/$id"
              params={{ id: e.id }}
              className="block"
            >
              <Card className="p-3 space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="text-[11px] text-muted-foreground">{e.code}</div>
                  <PriorityDot p={e.priority} />
                </div>
                <div className="text-sm font-semibold leading-snug">{e.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {lead?.fullName ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {e.endDate}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {toFaDigits(e.tasks.filter((t) => t.done).length)}/
                    {toFaDigits(e.tasks.length)}
                  </span>
                </div>
                <div>
                  <Progress value={e.progress} className="h-1.5" />
                  <div className="text-[10px] text-muted-foreground mt-1 text-end">
                    پیشرفت {toFaDigits(e.progress)}٪
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {!items.length && (
          <Card className="p-4 text-center text-xs text-muted-foreground border-dashed">
            موردی نیست
          </Card>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EngagementStatus }) {
  const map: Record<EngagementStatus, { label: string; cls: string }> = {
    Planned: { label: "برنامه‌ریزی", cls: "bg-muted text-muted-foreground" },
    InProgress: {
      label: "در حال اجرا",
      cls: "bg-primary/15 text-primary",
    },
    Review: {
      label: "بازبینی",
      cls: "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]",
    },
    Closed: {
      label: "خاتمه‌یافته",
      cls: "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]",
    },
  };
  const m = map[status];
  return <Badge className={m.cls}>{m.label}</Badge>;
}

function PriorityDot({ p }: { p: EngagementPriority }) {
  const cls =
    p === "high"
      ? "bg-destructive"
      : p === "medium"
        ? "bg-[color:var(--color-warning)]"
        : "bg-muted-foreground/50";
  return (
    <span className="ms-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${cls}`} />
      {p === "high" ? "زیاد" : p === "medium" ? "متوسط" : "کم"}
    </span>
  );
}
