import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  BookOpen,
  ShieldCheck,
  Building2,
  Library,
  Bell,
  Search,
  LogOut,
  ChevronLeft,
  Menu,
  Activity,
  FileBarChart2,
  BarChart3,
  Settings as SettingsIcon,
  ClipboardList,
  Plug,
  Sparkles,
  PlayCircle,
  Loader2,
} from "lucide-react";

import { phase4, services } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { historicalAuditService, auditRunStore } from "@/services/auditRuns";
import { useAuditRuns } from "@/hooks/useAuditRuns";
import { toFaDigits, formatIRR } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "دیدبان حسابرسی" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!services.auth.currentUser()) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

const NAV = [
  { to: "/app/dashboard", label: "داشبورد حسابرسی", icon: LayoutDashboard },
  { to: "/app/executive", label: "داشبورد مدیریتی", icon: BarChart3 },
  { to: "/app/documents", label: "اسناد حسابداری", icon: FileText },
  { to: "/app/monitoring", label: "کنترل‌های پیوسته", icon: Activity },
  { to: "/app/findings", label: "مرکز یافته‌ها", icon: AlertTriangle },
  { to: "/app/engagements", label: "مأموریت‌های حسابرسی", icon: ClipboardList },
  { to: "/app/audit-runs", label: "اجراهای حسابرسی", icon: PlayCircle },
  { to: "/app/assistant", label: "دستیار حسابرسی", icon: Sparkles },
  { to: "/app/reports", label: "گزارش‌ها و خروجی", icon: FileBarChart2 },
  { to: "/app/rules", label: "کتابخانه کنترل‌ها", icon: ShieldCheck },
  { to: "/app/vendors", label: "تحلیل تأمین‌کنندگان", icon: Building2 },
  { to: "/app/knowledge", label: "مرکز دانش", icon: Library },
  { to: "/app/integrations", label: "یکپارچه‌سازی‌ها", icon: Plug },
  { to: "/app/settings", label: "تنظیمات سیستم", icon: SettingsIcon },
] as const;

const CRUMB_LABELS: Record<string, string> = {
  app: "خانه",
  dashboard: "داشبورد",
  executive: "داشبورد مدیریتی",
  documents: "اسناد حسابداری",
  monitoring: "کنترل‌های پیوسته",
  findings: "یافته‌ها",
  engagements: "مأموریت‌های حسابرسی",
  "audit-runs": "اجراهای حسابرسی",
  new: "اجرای جدید",
  assistant: "دستیار حسابرسی",
  reports: "گزارش‌ها و خروجی",
  rules: "کتابخانه کنترل‌ها",
  vendors: "تأمین‌کنندگان",
  knowledge: "مرکز دانش",
  integrations: "یکپارچه‌سازی‌ها",
  inbox: "صندوق اعلان‌ها",
  settings: "تنظیمات",
};





function AppLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = services.auth.currentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    auditRunStore.setFinishHandler((run) => {
      const highRisk = run.summary?.highRisk ?? 0;
      const failed = run.summary?.failed ?? 0;
      const amt = run.summary?.amountAtRisk ?? 0;
      void phase4.notifications.add({
        title: `اجرای «${run.name}» خاتمه یافت`,
        body: `پرریسک: ${toFaDigits(highRisk)} — ناموفق: ${toFaDigits(failed)} — مبلغ در معرض ریسک: ${formatIRR(amt)}`,
        level: highRisk > 0 ? "warn" : "info",
        channels: ["app"],
        category: "system",
        link: { label: "مشاهده گزارش اجرا", to: `/app/audit-runs/${run.id}/report` },
      });
    });
    return () => auditRunStore.setFinishHandler(null);
  }, []);

  function logout() {
    services.auth.logout();
    navigate({ to: "/login" });
  }

  const initial = user?.fullName?.slice(0, 1) ?? "ح";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar (right side because dir=rtl) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-l border-border bg-sidebar text-sidebar-foreground transition-all",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-md bg-primary">
            <img src="/logo.png" alt="دیدبان حسابرسی" className="h-full w-full object-contain p-1" />
          </div>
          {!collapsed && <div className="font-bold">دیدبان حسابرسی</div>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ms-auto text-muted-foreground hover:text-foreground"
            aria-label="جمع‌کردن نوار کناری"
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-xs text-muted-foreground">
          {!collapsed && <div>نسخه پروتوتایپ ۱٫۰</div>}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card px-4 lg:px-6 flex items-center gap-3 sticky top-0 z-30">
          <button
            className="lg:hidden text-muted-foreground"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="منو"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="جست‌وجوی سراسری…" className="pr-9" />
          </div>

          <div className="hidden md:flex items-center gap-2 ms-2">
            <Select defaultValue="persia">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="persia">شرکت پرشیا</SelectItem>
                <SelectItem value="second">شرکت دوم</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="1405">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1405">۱۴۰۵</SelectItem>
                <SelectItem value="1404">۱۴۰۴</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="q2">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="q1">سه‌ماهه اول</SelectItem>
                <SelectItem value="q2">سه‌ماهه دوم</SelectItem>
                <SelectItem value="q3">سه‌ماهه سوم</SelectItem>
                <SelectItem value="q4">سه‌ماهه چهارم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ms-auto flex items-center gap-2">
            <BackgroundActivities />
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-sm text-start leading-tight">
                    <div className="font-medium">{user?.fullName}</div>
                    <div className="text-xs text-muted-foreground">حسابرس ارشد</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>حساب کاربری</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="ms-2 h-4 w-4" />
                  خروج از سامانه
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Breadcrumb */}
        <BreadcrumbBar pathname={pathname} />

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-b bg-card">
            <nav className="p-2 space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function BreadcrumbBar({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  return (
    <div className="border-b bg-muted/30 px-4 lg:px-6 py-2 text-xs text-muted-foreground flex items-center gap-2">
      {parts.map((p, i) => {
        const isLast = i === parts.length - 1;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className={cn(isLast && "text-foreground font-medium")}>
              {CRUMB_LABELS[p] ?? decodeURIComponent(p)}
            </span>
            {!isLast && <span className="text-muted-foreground/50">/</span>}
          </div>
        );
      })}
    </div>
  );
}

function NotificationBell() {
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => phase4.notifications.list(),
    refetchInterval: 15000,
  });
  const unread = data.filter((n) => !n.read).length;
  return (
    <Link to="/app/inbox">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -left-1 h-4 min-w-4 px-1 text-[10px]">
            {unread}
          </Badge>
        )}
      </Button>
    </Link>
  );
}


function BackgroundActivities() {
  const runs = useAuditRuns();
  const active = runs.filter(
    (r) => r.status === "running" || r.status === "paused" || r.status === "queued",
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {active.length > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          {active.length > 0 && (
            <Badge className="absolute -top-1 -left-1 h-4 min-w-4 px-1 text-[10px]">
              {toFaDigits(active.length)}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>فعالیت‌های پس‌زمینه</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {active.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground text-center">
            اجرای فعالی در حال حاضر وجود ندارد.
          </div>
        )}
        {active.map((r) => (
          <Link
            key={r.id}
            to="/app/audit-runs/$id"
            params={{ id: r.id }}
            className="block px-3 py-2 hover:bg-accent"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[180px]">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                {toFaDigits(Math.round(r.progress * 100))}٪
              </span>
            </div>
            <Progress value={r.progress * 100} className="h-1.5 mt-1" />
            <div className="text-[10px] text-muted-foreground mt-1">
              {r.status === "running"
                ? "در حال اجرا"
                : r.status === "paused"
                  ? "متوقف"
                  : "در صف"}
            </div>
          </Link>
        ))}
        {active.length > 0 && <DropdownMenuSeparator />}
        <Link to="/app/audit-runs">
          <DropdownMenuItem className="justify-center text-primary">
            مشاهده همه اجراها
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
