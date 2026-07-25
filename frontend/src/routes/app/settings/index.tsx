import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompactIRR, toFaDigits } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import type { Role, SystemSettings, User, UserStatus } from "@/types/domain";
import { UserPlus, RotateCcw, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/settings/")({
  head: () => ({
    meta: [
      { title: "تنظیمات سیستم — دیدبان حسابرسی" },
      { name: "description", content: "پیکربندی آستانه‌های ریسک، هوش مصنوعی، اعلان‌ها و کاربران." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات سیستم</h1>
        <p className="text-sm text-muted-foreground mt-1">
          پیکربندی سازمان، آستانه‌های ریسک، هوش مصنوعی، اعلان‌ها و مدیریت کاربران.
        </p>
      </div>
      <Tabs defaultValue="general" dir="rtl" className="space-y-4">
        <TabsList className="w-full flex flex-wrap justify-start">
          <TabsTrigger value="general">عمومی</TabsTrigger>
          <TabsTrigger value="risk">آستانه‌های ریسک</TabsTrigger>
          <TabsTrigger value="ai">هوش مصنوعی</TabsTrigger>
          <TabsTrigger value="notifications">اعلان‌ها</TabsTrigger>
          <TabsTrigger value="users">کاربران و نقش‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="risk">
          <RiskTab />
        </TabsContent>
        <TabsContent value="ai">
          <AiTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => services.settings.get() });
  const save = async (patch: Partial<SystemSettings>) => {
    await services.settings.update(patch);
    await qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("تنظیمات ذخیره شد.");
  };
  const reset = async () => {
    await services.settings.reset();
    await qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("به مقادیر پیش‌فرض بازگردانده شد.");
  };
  return { ...q, save, reset };
}

function GeneralTab() {
  const { data, save, reset } = useSettings();
  const [name, setName] = useState<string>();
  const [year, setYear] = useState<string>();
  const [cap, setCap] = useState<number>();
  if (!data) return null;
  const s = data;
  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="نام سازمان">
          <Input
            defaultValue={s.organizationName}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="سال مالی">
          <Input
            defaultValue={s.fiscalYear}
            onChange={(e) => setYear(e.target.value)}
          />
        </Field>
        <Field label="واحد پول">
          <Input value="ریال (IRR)" readOnly />
        </Field>
        <Field label="منطقه زمانی">
          <Input value={s.timezone} readOnly />
        </Field>
        <Field label={`سقف خرید مستقیم — فعلی: ${formatCompactIRR(s.directPurchaseCap)}`}>
          <Input
            type="number"
            defaultValue={s.directPurchaseCap}
            onChange={(e) => setCap(Number(e.target.value))}
          />
          <div className="text-[11px] text-muted-foreground mt-1">
            آیین‌نامه معاملات داخلی — خریدهای بالاتر از این سقف نیاز به مناقصه یا تأیید بالاتر دارند.
          </div>
        </Field>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() =>
            save({
              organizationName: name ?? s.organizationName,
              fiscalYear: year ?? s.fiscalYear,
              directPurchaseCap: cap ?? s.directPurchaseCap,
            })
          }
        >
          <Save className="h-4 w-4 ms-1" />
          ذخیره تغییرات
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4 ms-1" />
          بازگشت به پیش‌فرض
        </Button>
      </div>
    </Card>
  );
}

function RiskTab() {
  const { data, save } = useSettings();
  const [low, setLow] = useState<number>();
  const [med, setMed] = useState<number>();
  const [auto, setAuto] = useState<number>();
  if (!data) return null;
  const r = data.risk;
  const lowV = low ?? r.lowMax;
  const medV = med ?? r.mediumMax;
  const autoV = auto ?? r.autoDismissBelow;
  return (
    <Card className="p-4 space-y-6">
      <div>
        <div className="text-sm font-semibold mb-1">
          آستانهٔ ریسک کم (تا امتیاز {toFaDigits(lowV)})
        </div>
        <Slider
          defaultValue={[r.lowMax]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => setLow(v[0])}
        />
      </div>
      <div>
        <div className="text-sm font-semibold mb-1">
          آستانهٔ ریسک متوسط (تا امتیاز {toFaDigits(medV)}، بالاتر → زیاد)
        </div>
        <Slider
          defaultValue={[r.mediumMax]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => setMed(v[0])}
        />
      </div>
      <div>
        <div className="text-sm font-semibold mb-1">
          آستانهٔ رد خودکار (زیر امتیاز {toFaDigits(autoV)} یافته ایجاد نشود)
        </div>
        <Slider
          defaultValue={[r.autoDismissBelow]}
          min={0}
          max={50}
          step={1}
          onValueChange={(v) => setAuto(v[0])}
        />
      </div>
      <div className="flex gap-2 text-xs">
        <Badge className="bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]">
          کم: ۰ – {toFaDigits(lowV)}
        </Badge>
        <Badge className="bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]">
          متوسط: {toFaDigits(lowV + 1)} – {toFaDigits(medV)}
        </Badge>
        <Badge className="bg-destructive text-destructive-foreground">
          زیاد: {toFaDigits(medV + 1)} – ۱۰۰
        </Badge>
      </div>
      <Button
        onClick={() =>
          save({ risk: { lowMax: lowV, mediumMax: medV, autoDismissBelow: autoV } })
        }
      >
        <Save className="h-4 w-4 ms-1" />
        ذخیره
      </Button>
    </Card>
  );
}

function AiTab() {
  const { data, save } = useSettings();
  const [model, setModel] = useState<string>();
  const [temp, setTemp] = useState<number>();
  const [minConf, setMinConf] = useState<number>();
  const [hybrid, setHybrid] = useState<boolean>();
  if (!data) return null;
  const ai = data.ai;
  return (
    <Card className="p-4 space-y-6">
      <Field label="مدل زبانی">
        <Select defaultValue={ai.model} onValueChange={setModel}>
          <SelectTrigger className="w-full md:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (پیش‌فرض)</SelectItem>
            <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (دقیق‌تر)</SelectItem>
            <SelectItem value="openai/gpt-5-mini">GPT-5 Mini (سریع)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div>
        <div className="text-sm font-semibold mb-1">
          دمای پاسخ (Creativity): {toFaDigits((temp ?? ai.temperature).toFixed(2))}
        </div>
        <Slider
          defaultValue={[ai.temperature * 100]}
          min={0}
          max={100}
          step={5}
          onValueChange={(v) => setTemp(v[0] / 100)}
        />
      </div>
      <div>
        <div className="text-sm font-semibold mb-1">
          حداقل اطمینان برای تولید یافته:{" "}
          {toFaDigits((minConf ?? ai.minConfidence).toFixed(2))}
        </div>
        <Slider
          defaultValue={[ai.minConfidence * 100]}
          min={30}
          max={95}
          step={5}
          onValueChange={(v) => setMinConf(v[0] / 100)}
        />
        <div className="text-[11px] text-muted-foreground mt-1">
          یافته‌های زیر این آستانه با پرچم «نیازمند بررسی انسانی» ثبت می‌شوند.
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">حالت ترکیبی (Deterministic + AI)</div>
          <div className="text-xs text-muted-foreground">
            ابتدا کنترل‌های قطعی اجرا و سپس AI برای تفسیر و امتیازدهی استفاده می‌شود.
          </div>
        </div>
        <Switch
          defaultChecked={ai.useHybrid}
          onCheckedChange={(v) => setHybrid(v)}
        />
      </div>
      <Button
        onClick={() =>
          save({
            ai: {
              model: model ?? ai.model,
              temperature: temp ?? ai.temperature,
              minConfidence: minConf ?? ai.minConfidence,
              useHybrid: hybrid ?? ai.useHybrid,
            },
          })
        }
      >
        <Save className="h-4 w-4 ms-1" />
        ذخیره تنظیمات AI
      </Button>
    </Card>
  );
}

function NotificationsTab() {
  const { data, save } = useSettings();
  const [emailNew, setEmailNew] = useState<boolean>();
  const [emailHigh, setEmailHigh] = useState<boolean>();
  const [digest, setDigest] = useState<"off" | "daily" | "weekly">();
  if (!data) return null;
  const n = data.notifications;
  return (
    <Card className="p-4 space-y-4">
      <Row
        label="ایمیل هنگام ایجاد یافته جدید"
        control={
          <Switch defaultChecked={n.emailOnNewFinding} onCheckedChange={setEmailNew} />
        }
      />
      <Row
        label="ایمیل برای اسناد پرریسک (امتیاز ≥ ۷۰)"
        control={
          <Switch defaultChecked={n.emailOnHighRisk} onCheckedChange={setEmailHigh} />
        }
      />
      <Row
        label="خلاصهٔ دوره‌ای"
        control={
          <Select
            defaultValue={n.digestFrequency}
            onValueChange={(v) => setDigest(v as "off" | "daily" | "weekly")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">غیرفعال</SelectItem>
              <SelectItem value="daily">روزانه</SelectItem>
              <SelectItem value="weekly">هفتگی</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <Button
        onClick={() =>
          save({
            notifications: {
              emailOnNewFinding: emailNew ?? n.emailOnNewFinding,
              emailOnHighRisk: emailHigh ?? n.emailOnHighRisk,
              digestFrequency: digest ?? n.digestFrequency,
            },
          })
        }
      >
        <Save className="h-4 w-4 ms-1" />
        ذخیره
      </Button>
    </Card>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["users"], queryFn: () => services.users.list() });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("auditor");
  const [username, setUsername] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const create = async () => {
    if (!name.trim() || !username.trim()) return toast.error("نام و نام کاربری الزامی است.");
    await services.users.create({
      fullName: name,
      username,
      email,
      role,
      status: "invited",
      permissions: role === "admin" ? ["*"] : ["documents.view", "findings.edit"],
    });
    setName("");
    setEmail("");
    setUsername("");
    setRole("auditor");
    setOpen(false);
    invalidate();
    toast.success("کاربر افزوده شد. دعوت‌نامه ارسال گردید.");
  };

  const changeRole = async (u: User, r: Role) => {
    await services.users.updateRole(u.id, r);
    invalidate();
    toast.success(`نقش «${u.fullName}» به ${roleLabel(r)} تغییر یافت.`);
  };

  const changeStatus = async (u: User, s: UserStatus) => {
    await services.users.updateStatus(u.id, s);
    invalidate();
  };

  const remove = async (u: User) => {
    if (!confirm(`حذف «${u.fullName}» ؟`)) return;
    await services.users.remove(u.id);
    invalidate();
    toast.success("کاربر حذف شد.");
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">کاربران و نقش‌ها</div>
          <div className="text-xs text-muted-foreground">
            نقش‌های استاندارد: حسابرس، مدیر، مدیر سیستم. مجوزها بر مبنای نقش اعمال می‌شود.
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 ms-1" />
              افزودن کاربر
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>افزودن کاربر جدید</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Field label="نام و نام خانوادگی">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="نام کاربری">
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field label="ایمیل">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="نقش">
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auditor">حسابرس</SelectItem>
                    <SelectItem value="manager">مدیر</SelectItem>
                    <SelectItem value="admin">مدیر سیستم</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={create}>ارسال دعوت‌نامه</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>کاربر</TableHead>
              <TableHead>ایمیل</TableHead>
              <TableHead>نقش</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>آخرین فعالیت</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="text-sm font-medium">{u.fullName}</div>
                  <div className="text-xs text-muted-foreground">@{u.username}</div>
                </TableCell>
                <TableCell className="text-xs">{u.email ?? "—"}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={u.role}
                    onValueChange={(v) => changeRole(u, v as Role)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auditor">حسابرس</SelectItem>
                      <SelectItem value="manager">مدیر</SelectItem>
                      <SelectItem value="admin">مدیر سیستم</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={u.status ?? "active"}
                    onToggle={() =>
                      changeStatus(u, u.status === "disabled" ? "active" : "disabled")
                    }
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.lastActiveAt ?? "—"}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(u)}
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">مجوزهای هر نقش</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <PermissionCard
            title="حسابرس"
            perms={[
              "مشاهده و بررسی اسناد",
              "تولید و ویرایش یافته‌ها",
              "ارجاع به مدیر برای تأیید",
              "خروجی گزارش‌ها",
            ]}
          />
          <PermissionCard
            title="مدیر"
            perms={[
              "تأیید نهایی یافته‌های Suggested",
              "ثبت پاسخ مدیریت",
              "دسترسی به داشبورد مدیریتی",
              "پیگیری اقدام‌های اصلاحی",
            ]}
          />
          <PermissionCard
            title="مدیر سیستم"
            perms={[
              "مدیریت کاربران و نقش‌ها",
              "پیکربندی آستانه‌های ریسک و AI",
              "مدیریت پایگاه دانش",
              "دسترسی کامل به همه بخش‌ها",
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, control }: { label: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
      <span className="text-sm">{label}</span>
      {control}
    </div>
  );
}

function StatusBadge({
  status,
  onToggle,
}: {
  status: UserStatus;
  onToggle: () => void;
}) {
  const cls =
    status === "active"
      ? "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]"
      : status === "invited"
        ? "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]"
        : "bg-muted text-muted-foreground";
  const label = status === "active" ? "فعال" : status === "invited" ? "دعوت‌شده" : "غیرفعال";
  return (
    <button onClick={onToggle} className="cursor-pointer" title="تغییر وضعیت">
      <Badge className={cls}>{label}</Badge>
    </button>
  );
}

function PermissionCard({ title, perms }: { title: string; perms: string[] }) {
  return (
    <Card className="p-3">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <ul className="space-y-1 text-muted-foreground list-disc pe-4">
        {perms.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Card>
  );
}

function roleLabel(r: Role) {
  return r === "admin" ? "مدیر سیستم" : r === "manager" ? "مدیر" : "حسابرس";
}
