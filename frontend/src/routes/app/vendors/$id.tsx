import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowRightCircle, ShieldAlert, Users } from "lucide-react";
import { formatCompactIRR, formatIRR, toFaDigits } from "@/lib/format";
import { documents } from "@/services/mockData";

export const Route = createFileRoute("/app/vendors/$id")({
  head: () => ({
    meta: [
      { title: "پروفایل تأمین‌کننده — دیدبان حسابرسی" },
      { name: "description", content: "پروفایل ریسک، تراکنش‌ها و هشدارهای تضاد منافع." },
    ],
  }),
  component: VendorProfile,
});

function VendorProfile() {
  const { id } = useParams({ from: "/app/vendors/$id" });
  const { data } = useQuery({ queryKey: ["vendor", id], queryFn: () => services.vendors.get(id) });
  const { data: txs = [] } = useQuery({
    queryKey: ["vendor-tx", id],
    queryFn: () => services.vendorExtras.listTransactions(id),
  });
  const { data: conflicts = [] } = useQuery({
    queryKey: ["vendor-conflicts", id],
    queryFn: () => services.vendorExtras.listConflicts(id),
  });
  const { data: findings = [] } = useQuery({
    queryKey: ["findings-all"],
    queryFn: () => services.findings.list(),
  });

  if (!data) return <div className="p-6 text-muted-foreground">در حال بارگذاری…</div>;

  const vendorDocs = documents.filter((d) => d.vendorId === id);
  const vendorDocIds = new Set(vendorDocs.map((d) => d.id));
  const vendorFindings = findings.filter((f) => vendorDocIds.has(f.documentId));
  const avgTx = txs.length > 0 ? txs.reduce((s, t) => s + t.amount, 0) / txs.length : 0;

  const riskColor =
    data.riskScore >= 70
      ? "bg-destructive text-destructive-foreground"
      : data.riskScore >= 40
        ? "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]"
        : "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]";

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <Link
        to="/app/vendors"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowRightCircle className="h-3 w-3" />
        بازگشت به فهرست
      </Link>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {data.category} — شناسه ملی: {data.nationalId}
          </div>
        </div>
        <Badge className={riskColor}>امتیاز ریسک: {toFaDigits(data.riskScore)}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">مجموع خرید</div>
          <div className="text-lg font-bold mt-1">{formatCompactIRR(data.totalPurchase)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">قرارداد فعال</div>
          <div className="text-lg font-bold mt-1">{toFaDigits(data.activeContracts)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">میانگین مبلغ سند</div>
          <div className="text-lg font-bold mt-1">{formatCompactIRR(avgTx)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">یافته‌های حسابرسی</div>
          <div className="text-lg font-bold mt-1">{toFaDigits(vendorFindings.length)}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">پروفایل ریسک</div>
        <Progress value={data.riskScore} className="h-2" />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
          <span>کم</span>
          <span>متوسط</span>
          <span>زیاد</span>
        </div>
      </Card>

      <Tabs defaultValue="signals" dir="rtl" className="space-y-3">
        <TabsList className="flex flex-wrap justify-start">
          <TabsTrigger value="signals">سیگنال‌های ریسک</TabsTrigger>
          <TabsTrigger value="conflicts">تضاد منافع</TabsTrigger>
          <TabsTrigger value="transactions">تراکنش‌ها</TabsTrigger>
          <TabsTrigger value="findings">یافته‌های حسابرسی</TabsTrigger>
          <TabsTrigger value="documents">اسناد</TabsTrigger>
        </TabsList>

        <TabsContent value="signals">
          <Card className="p-4">
            <ul className="space-y-2">
              {data.signals.map((s) => (
                <li key={s.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{s.label}</span>
                    <Badge variant="outline">{s.severity}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    شناسایی: {s.detectedAt}
                  </div>
                </li>
              ))}
              {data.signals.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  سیگنال ریسکی ثبت نشده است.
                </div>
              )}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts">
          <Card className="p-4">
            {conflicts.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> هشدار تضاد منافعی یافت نشد.
              </div>
            ) : (
              <ul className="space-y-2">
                {conflicts.map((c) => (
                  <li key={c.id} className="rounded-md border-2 border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        {c.label}
                      </span>
                      <Badge variant="outline">{c.severity}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{c.detail}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="p-4">
            <ul className="space-y-2">
              {txs.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent"
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs">{t.documentNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.kind} — {t.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        t.riskScore >= 70
                          ? "bg-destructive text-destructive-foreground"
                          : t.riskScore >= 40
                            ? "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]"
                            : "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]"
                      }
                    >
                      {toFaDigits(t.riskScore)}
                    </Badge>
                    <span className="text-xs">{formatIRR(t.amount)}</span>
                    {t.documentId && (
                      <Link
                        to="/app/documents/$id"
                        params={{ id: t.documentId }}
                        className="text-xs text-primary hover:underline"
                      >
                        مشاهده
                      </Link>
                    )}
                  </div>
                </li>
              ))}
              {txs.length === 0 && (
                <div className="text-xs text-muted-foreground">تراکنشی ثبت نشده است.</div>
              )}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="findings">
          <Card className="p-4">
            {vendorFindings.length === 0 ? (
              <div className="text-sm text-muted-foreground">یافته‌ای برای این تأمین‌کننده ثبت نشده است.</div>
            ) : (
              <ul className="space-y-2">
                {vendorFindings.map((f) => (
                  <li key={f.id}>
                    <Link
                      to="/app/findings/$id"
                      params={{ id: f.id }}
                      className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent"
                    >
                      <span>
                        <span className="font-mono text-xs me-2">{f.id}</span>
                        {f.title}
                      </span>
                      <Badge variant="outline">{f.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="p-4">
            <ul className="space-y-2">
              {vendorDocs.map((d) => (
                <li key={d.id}>
                  <Link
                    to="/app/documents/$id"
                    params={{ id: d.id }}
                    className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent"
                  >
                    <span>
                      <span className="font-mono text-xs me-2">{d.number}</span>
                      {d.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{d.date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
