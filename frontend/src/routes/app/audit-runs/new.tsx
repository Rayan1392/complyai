import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import type {
  AuditRunKind,
  AuditRunScope,
  RuleVersionMode,
} from "@/types/domain";
import { historicalAuditService } from "@/services/auditRuns";
import { services } from "@/services";
import { toFaDigits, formatIRR } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";

export const Route = createFileRoute("/app/audit-runs/new")({
  head: () => ({
    meta: [
      { title: "ایجاد اجرای حسابرسی — دیدبان حسابرسی" },
      { name: "description", content: "پیکربندی اجرای حسابرسی تاریخی یا بلادرنگ." },
    ],
  }),
  component: NewAuditRunPage,
});

const STEPS = [
  "شرکت و واحد",
  "دورهٔ مالی",
  "نوع اسناد",
  "مبلغ",
  "تأمین‌کنندگان",
  "حساب‌ها",
  "کنترل‌ها",
  "نسخهٔ قوانین",
  "تنظیمات",
];

const DOC_TYPES = [
  { id: "purchase", label: "خرید" },
  { id: "expense", label: "هزینه" },
  { id: "asset", label: "دارایی ثابت" },
  { id: "payroll", label: "حقوق و دستمزد" },
  { id: "tax", label: "مالیاتی" },
];

function NewAuditRunPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [kind, setKind] = useState<AuditRunKind>("historical");
  const [name, setName] = useState("اجرای حسابرسی سه‌ماههٔ دوم ۱۴۰۵");
  const [company, setCompany] = useState("شرکت پرشیا");
  const [unit, setUnit] = useState("مالی و اداری");
  const [fiscalYear, setFiscalYear] = useState("1405");
  const [dateFrom, setDateFrom] = useState("۱۴۰۵/۰۴/۰۱");
  const [dateTo, setDateTo] = useState("۱۴۰۵/۰۶/۳۱");
  const [docTypes, setDocTypes] = useState<string[]>(["purchase", "expense"]);
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [accountCodes, setAccountCodes] = useState("6101, 6102, 7401");
  const [costCenters, setCostCenters] = useState("CC-100, CC-200");
  const [ruleIds, setRuleIds] = useState<string[]>([]);
  const [ruleVersionMode, setRuleVersionMode] =
    useState<RuleVersionMode>("historical");
  const [parallelism, setParallelism] = useState<number>(4);
  const [aiConfidenceMin, setAiConfidenceMin] = useState<number>(0.7);
  const [stopOnErrorRate, setStopOnErrorRate] = useState<number>(0.1);
  const [totalDocs, setTotalDocs] = useState<number>(120);
  const [durationSec, setDurationSec] = useState<number>(90);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => services.vendors.list(),
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["rules"],
    queryFn: () => services.compliance.listRules(),
  });

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const submit = () => {
    if (!name.trim()) return toast.error("نام اجرا الزامی است.");
    const scope: AuditRunScope = {
      companyId: "co-1",
      companyName: company,
      unit,
      fiscalYear,
      dateFrom,
      dateTo,
      documentTypes: docTypes,
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
      vendorIds,
      accountCodes: accountCodes.split(",").map((s) => s.trim()).filter(Boolean),
      costCenters: costCenters.split(",").map((s) => s.trim()).filter(Boolean),
      ruleIds,
      ruleVersionMode,
      parallelism,
      aiConfidenceMin,
      stopOnErrorRate,
    };
    const run = historicalAuditService.create({
      name,
      kind,
      scope,
      totalDocuments: totalDocs,
      estimatedDurationMs: durationSec * 1000,
      createdBy: services.auth.currentUser()?.fullName ?? "کاربر",
    });
    toast.success("اجرا آغاز شد؛ می‌توانید صفحه را ترک کنید — پردازش ادامه دارد.");
    navigate({ to: "/app/audit-runs/$id", params: { id: run.id } });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">ایجاد اجرای حسابرسی</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wizard پیکربندی دامنه، قوانین و تنظیمات اجرا.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs border ${
              i === step
                ? "bg-primary text-primary-foreground border-primary"
                : i < step
                  ? "bg-muted text-foreground border-border"
                  : "text-muted-foreground border-border"
            }`}
          >
            {toFaDigits(i + 1)}. {s}
          </button>
        ))}
      </div>

      <Card className="p-4 space-y-4">
        {step === 0 && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">نوع حسابرسی</Label>
              <RadioGroup
                value={kind}
                onValueChange={(v) => setKind(v as AuditRunKind)}
                className="grid grid-cols-1 md:grid-cols-2 gap-2"
              >
                <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer">
                  <RadioGroupItem value="historical" className="mt-1" />
                  <div>
                    <div className="text-sm font-medium">تاریخی / گروهی</div>
                    <div className="text-[11px] text-muted-foreground">
                      اجرا روی اسناد یک دورهٔ گذشته
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer">
                  <RadioGroupItem value="realtime" className="mt-1" />
                  <div>
                    <div className="text-sm font-medium">بلادرنگ</div>
                    <div className="text-[11px] text-muted-foreground">
                      شبیه‌سازی جریان ورود اسناد جدید
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label className="text-xs mb-1 block">نام اجرا</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">شرکت</Label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="شرکت پرشیا">شرکت پرشیا</SelectItem>
                    <SelectItem value="شرکت دوم">شرکت دوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">واحد سازمانی</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">سال مالی</Label>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1405">۱۴۰۵</SelectItem>
                  <SelectItem value="1404">۱۴۰۴</SelectItem>
                  <SelectItem value="1403">۱۴۰۳</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">از تاریخ</Label>
                <Input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">تا تاریخ</Label>
                <Input value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label className="text-xs">انواع اسناد</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {DOC_TYPES.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 rounded-md border p-2 cursor-pointer"
                >
                  <Checkbox
                    checked={docTypes.includes(d.id)}
                    onCheckedChange={() => setDocTypes(toggle(docTypes, d.id))}
                  />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">حداقل مبلغ (ریال)</Label>
              <Input
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value.replace(/\D/g, ""))}
                placeholder="بدون محدودیت"
              />
              {amountMin && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  {formatIRR(Number(amountMin))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs mb-1 block">حداکثر مبلغ (ریال)</Label>
              <Input
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value.replace(/\D/g, ""))}
                placeholder="بدون محدودیت"
              />
              {amountMax && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  {formatIRR(Number(amountMax))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            <Label className="text-xs">تأمین‌کنندگان (خالی = همه)</Label>
            <div className="max-h-64 overflow-auto rounded-md border divide-y">
              {vendors.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent/40"
                >
                  <Checkbox
                    checked={vendorIds.includes(v.id)}
                    onCheckedChange={() => setVendorIds(toggle(vendorIds, v.id))}
                  />
                  <span className="text-sm flex-1">{v.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    ریسک {toFaDigits(v.riskScore)}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">کدهای حساب (با کاما جدا کنید)</Label>
              <Input value={accountCodes} onChange={(e) => setAccountCodes(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">مراکز هزینه</Label>
              <Input value={costCenters} onChange={(e) => setCostCenters(e.target.value)} />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-2">
            <Label className="text-xs">کنترل‌های مورد استفاده (خالی = همه)</Label>
            <div className="max-h-64 overflow-auto rounded-md border divide-y">
              {rules.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent/40"
                >
                  <Checkbox
                    checked={ruleIds.includes(r.id)}
                    onCheckedChange={() => setRuleIds(toggle(ruleIds, r.id))}
                  />
                  <div className="flex-1">
                    <div className="text-sm">{r.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.category} — {r.id}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-2">
            <Label className="text-xs mb-1 block">نوع نسخه قوانین</Label>
            <RadioGroup
              value={ruleVersionMode}
              onValueChange={(v) => setRuleVersionMode(v as RuleVersionMode)}
              className="space-y-2"
            >
              {(
                [
                  {
                    v: "historical",
                    t: "نسخه معتبر قانون در تاریخ هر سند (پیش‌فرض)",
                    d: "برای هر سند، نسخه‌ای از قانون که در تاریخ سند اعتبار داشته اعمال می‌شود.",
                  },
                  {
                    v: "latest",
                    t: "آخرین نسخه فعال قوانین",
                    d: "همهٔ اسناد با آخرین نسخه فعال قوانین سنجیده می‌شوند.",
                  },
                  {
                    v: "compare",
                    t: "مقایسه هر دو مبنا",
                    d: "هر سند دوبار ارزیابی می‌شود و تفاوت نتیجه گزارش می‌گردد.",
                  },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.v}
                  className="flex items-start gap-2 rounded-md border p-3 cursor-pointer"
                >
                  <RadioGroupItem value={opt.v} className="mt-1" />
                  <div>
                    <div className="text-sm font-medium">{opt.t}</div>
                    <div className="text-[11px] text-muted-foreground">{opt.d}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">
                تعداد اسناد در دامنه (Mock): {toFaDigits(totalDocs)}
              </Label>
              <Slider
                value={[totalDocs]}
                min={20}
                max={500}
                step={10}
                onValueChange={([v]) => setTotalDocs(v)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">
                زمان تخمینی اجرا: {toFaDigits(durationSec)} ثانیه
              </Label>
              <Slider
                value={[durationSec]}
                min={30}
                max={300}
                step={10}
                onValueChange={([v]) => setDurationSec(v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">
                  موازی‌سازی: {toFaDigits(parallelism)}
                </Label>
                <Slider
                  value={[parallelism]}
                  min={1}
                  max={16}
                  step={1}
                  onValueChange={([v]) => setParallelism(v)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">
                  حداقل اطمینان AI: {toFaDigits(Math.round(aiConfidenceMin * 100))}٪
                </Label>
                <Slider
                  value={[aiConfidenceMin * 100]}
                  min={40}
                  max={95}
                  step={5}
                  onValueChange={([v]) => setAiConfidenceMin(v / 100)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">
                توقف در صورت نرخ خطا از: {toFaDigits(Math.round(stopOnErrorRate * 100))}٪
              </Label>
              <Slider
                value={[stopOnErrorRate * 100]}
                min={5}
                max={50}
                step={5}
                onValueChange={([v]) => setStopOnErrorRate(v / 100)}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowRight className="h-4 w-4 ms-1" />
          قبلی
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
            بعدی
            <ArrowLeft className="h-4 w-4 me-1" />
          </Button>
        ) : (
          <Button onClick={submit}>
            <Play className="h-4 w-4 ms-1" />
            شروع اجرا
          </Button>
        )}
      </div>
    </div>
  );
}
