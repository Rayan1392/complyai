import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { phase4 } from "@/services";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { AppNotification, NotificationLevel } from "@/types/domain";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Info,
  Mail,
  MessageSquare,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/app/inbox/")({
  head: () => ({
    meta: [
      { title: "صندوق اعلان‌ها — دیدبان حسابرسی" },
      { name: "description", content: "اعلان‌ها، هشدارها و پیام‌های سامانه." },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => phase4.notifications.list(),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["notifications"] });

  const markAll = async () => {
    await phase4.notifications.markAllRead();
    invalidate();
    toast.success("همهٔ اعلان‌ها به‌عنوان خوانده‌شده علامت‌گذاری شدند.");
  };

  const unread = data.filter((n) => !n.read);
  const critical = data.filter((n) => n.level === "critical");

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">صندوق اعلان‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">
            هشدارهای سامانه، رویدادهای یافته‌ها و پیام‌های یکپارچه‌سازی.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            <Bell className="h-3.5 w-3.5 ms-1" />
            {unread.length} خوانده‌نشده
          </Badge>
          <Button variant="outline" onClick={markAll} disabled={!unread.length}>
            <CheckCheck className="h-4 w-4 ms-1" />
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" dir="rtl">
        <TabsList>
          <TabsTrigger value="all">همه ({data.length})</TabsTrigger>
          <TabsTrigger value="unread">خوانده‌نشده ({unread.length})</TabsTrigger>
          <TabsTrigger value="critical">
            بحرانی ({critical.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <NotificationList items={data} onChange={invalidate} />
        </TabsContent>
        <TabsContent value="unread">
          <NotificationList items={unread} onChange={invalidate} />
        </TabsContent>
        <TabsContent value="critical">
          <NotificationList items={critical} onChange={invalidate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({
  items,
  onChange,
}: {
  items: AppNotification[];
  onChange: () => void;
}) {
  if (!items.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        اعلانی برای نمایش وجود ندارد.
      </Card>
    );
  }
  return (
    <div className="space-y-2 mt-3">
      {items.map((n) => (
        <NotificationRow key={n.id} n={n} onChange={onChange} />
      ))}
    </div>
  );
}

function NotificationRow({
  n,
  onChange,
}: {
  n: AppNotification;
  onChange: () => void;
}) {
  const markRead = async () => {
    await phase4.notifications.markRead(n.id);
    onChange();
  };
  const remove = async () => {
    await phase4.notifications.remove(n.id);
    onChange();
    toast.success("حذف شد.");
  };
  return (
    <Card
      className={`p-3 flex gap-3 items-start ${
        n.read ? "opacity-70" : "border-primary/30"
      }`}
    >
      <LevelIcon level={n.level} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-semibold">{n.title}</div>
          {!n.read && (
            <Badge className="bg-primary/15 text-primary text-[10px]">جدید</Badge>
          )}
          <span className="text-[11px] text-muted-foreground ms-auto">
            {n.createdAt}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{n.body}</div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {n.channels.includes("email") && (
            <Badge variant="outline" className="text-[10px]">
              <Mail className="h-3 w-3 ms-1" />
              ایمیل
            </Badge>
          )}
          {n.channels.includes("sms") && (
            <Badge variant="outline" className="text-[10px]">
              <MessageSquare className="h-3 w-3 ms-1" />
              پیامک
            </Badge>
          )}
          {n.link && (
            <Link
              to={n.link.to}
              className="text-xs text-primary hover:underline"
            >
              {n.link.label} ←
            </Link>
          )}
          <div className="ms-auto flex gap-1">
            {!n.read && (
              <Button size="sm" variant="ghost" onClick={markRead}>
                <Check className="h-4 w-4 ms-1" />
                خوانده شد
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={remove}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LevelIcon({ level }: { level: NotificationLevel }) {
  if (level === "critical")
    return (
      <div className="grid h-9 w-9 place-items-center rounded-md bg-destructive/15 text-destructive shrink-0">
        <AlertTriangle className="h-4 w-4" />
      </div>
    );
  if (level === "warn")
    return (
      <div className="grid h-9 w-9 place-items-center rounded-md bg-[color:var(--color-warning)]/20 text-[color:var(--color-warning)] shrink-0">
        <AlertTriangle className="h-4 w-4" />
      </div>
    );
  return (
    <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 text-primary shrink-0">
      <Info className="h-4 w-4" />
    </div>
  );
}
