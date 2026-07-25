import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCompactIRR, toFaDigits } from "@/lib/format";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/app/vendors/")({
  head: () => ({
    meta: [
      { title: "تأمین‌کنندگان — دیدبان حسابرسی" },
      { name: "description", content: "پروفایل ریسک و سیگنال‌های تأمین‌کنندگان." },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => services.vendors.list(),
  });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"risk" | "amount" | "name">("risk");
  const [band, setBand] = useState<"all" | "high" | "medium" | "low">("all");

  const filtered = useMemo(() => {
    let items = [...data];
    if (q.trim())
      items = items.filter(
        (v) =>
          v.name.includes(q) ||
          v.category.includes(q) ||
          v.nationalId.includes(q),
      );
    if (band !== "all")
      items = items.filter((v) =>
        band === "high" ? v.riskScore >= 70 : band === "medium" ? v.riskScore >= 40 && v.riskScore < 70 : v.riskScore < 40,
      );
    items.sort((a, b) => {
      if (sort === "risk") return b.riskScore - a.riskScore;
      if (sort === "amount") return b.totalPurchase - a.totalPurchase;
      return a.name.localeCompare(b.name, "fa");
    });
    return items;
  }, [data, q, sort, band]);

  const totalAmount = data.reduce((s, v) => s + v.totalPurchase, 0);
  const highCount = data.filter((v) => v.riskScore >= 70).length;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">تحلیل تأمین‌کنندگان</h1>
        <p className="text-sm text-muted-foreground mt-1">
          پروفایل ریسک تأمین‌کنندگان و سیگنال‌های شناسایی‌شده.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">تعداد تأمین‌کنندگان</div>
          <div className="text-xl font-bold mt-1">{toFaDigits(data.length)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">مجموع خرید سالانه</div>
          <div className="text-xl font-bold mt-1">{formatCompactIRR(totalAmount)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">تأمین‌کنندگان پرریسک</div>
          <div className="text-xl font-bold mt-1 text-destructive">{toFaDigits(highCount)}</div>
        </Card>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="جست‌وجو در نام، دسته یا شناسه ملی…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={band} onValueChange={(v) => setBand(v as typeof band)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه سطوح</SelectItem>
            <SelectItem value="high">ریسک زیاد</SelectItem>
            <SelectItem value="medium">ریسک متوسط</SelectItem>
            <SelectItem value="low">ریسک کم</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="risk">مرتب‌سازی: امتیاز ریسک</SelectItem>
            <SelectItem value="amount">مرتب‌سازی: مجموع خرید</SelectItem>
            <SelectItem value="name">مرتب‌سازی: نام</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {isLoading ? (
        <div className="h-40 bg-muted animate-pulse rounded" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((v) => (
            <Card key={v.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{v.name}</div>
                  <div className="text-xs text-muted-foreground">{v.category}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    شناسه ملی: {v.nationalId}
                  </div>
                </div>
                <Badge
                  className={
                    v.riskScore >= 70
                      ? "bg-destructive text-destructive-foreground"
                      : v.riskScore >= 40
                        ? "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]"
                        : "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]"
                  }
                >
                  ریسک {toFaDigits(v.riskScore)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-muted p-2">
                  <div className="text-muted-foreground">مجموع خرید</div>
                  <div className="font-semibold mt-0.5">{formatCompactIRR(v.totalPurchase)}</div>
                </div>
                <div className="rounded bg-muted p-2">
                  <div className="text-muted-foreground">قرارداد فعال</div>
                  <div className="font-semibold mt-0.5">{toFaDigits(v.activeContracts)}</div>
                </div>
              </div>
              {v.signals.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">سیگنال‌ها:</div>
                  {v.signals.slice(0, 2).map((s) => (
                    <div key={s.id} className="text-xs rounded bg-destructive/5 p-2">
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
              <Link
                to="/app/vendors/$id"
                params={{ id: v.id }}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                پروفایل کامل <ArrowLeft className="h-3 w-3" />
              </Link>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground text-center py-8">
              نتیجه‌ای یافت نشد.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
