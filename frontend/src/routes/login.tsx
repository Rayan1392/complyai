import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { services } from "@/services";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "ورود — دیدبان حسابرسی" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (services.auth.currentUser()) throw redirect({ to: "/app/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError("نام کاربری و رمز عبور الزامی است.");
      return;
    }
    setLoading(true);
    try {
      await services.auth.login(username, password);
      toast.success("ورود موفق. خوش آمدید.");
      navigate({ to: "/app/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ورود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand side */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-bl from-primary to-primary/70 p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 backdrop-blur">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-xl font-bold">دیدبان حسابرسی</div>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            حسابرسی داخلی هوشمند،
            <br />
            کنترل مستمر تراکنش‌ها.
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-8">
            بررسی خودکار اسناد، شناسایی مغایرت‌های قانونی و حسابداری، تحلیل شواهد پشتیبان و
            تولید یافته‌های حسابرسی با استناد مستقیم به منابع دانش.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <Metric value="۱۲۸۴" label="سند بررسی‌شده" />
            <Metric value="۸۲٪" label="پوشش هوشمند" />
            <Metric value="۳۴" label="یافته باز" />
          </div>
        </div>
        <div className="text-xs text-primary-foreground/70">
          © ۱۴۰۵ — نسخه پروتوتایپ داخلی
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <Card className="w-full max-w-md p-8 space-y-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">ورود به سامانه</h2>
            <p className="text-sm text-muted-foreground">
              با نام کاربری سازمانی خود وارد شوید.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="u">نام کاربری</Label>
              <Input
                id="u"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="مثلاً auditor"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">رمز عبور</Label>
              <div className="relative">
                <Input
                  id="p"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  dir="ltr"
                  className="text-left pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 left-2 grid place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={show ? "پنهان کردن" : "نمایش"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              ورود
            </Button>
          </form>

          <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
            <div className="font-medium text-foreground">اطلاعات ورود دمو</div>
            <div className="flex justify-between font-mono" dir="ltr">
              <span>auditor</span>
              <span className="text-muted-foreground">username</span>
            </div>
            <div className="flex justify-between font-mono" dir="ltr">
              <span>Audit@1405</span>
              <span className="text-muted-foreground">password</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-6">
            این بخش با <span className="font-mono">MockAuthService</span> پیاده شده و در آینده با
            سرویس واقعی Authentication/Authorization/RBAC جایگزین خواهد شد.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3 backdrop-blur">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-primary-foreground/80 mt-1">{label}</div>
    </div>
  );
}
