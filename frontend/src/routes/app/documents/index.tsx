import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft } from "lucide-react";
import { formatIRR } from "@/lib/format";
import { useMemo, useState } from "react";
import { vendors } from "@/services/mockData";
import type { DocumentReviewStatus } from "@/types/domain";

export const Route = createFileRoute("/app/documents/")({
  head: () => ({ meta: [{ title: "اسناد حسابداری — دیدبان حسابرسی" }] }),
  component: DocumentsList,
});

const STATUS_META: Record<DocumentReviewStatus, { label: string; className: string }> = {
  pending: { label: "در انتظار", className: "bg-muted text-foreground" },
  needsReview: {
    label: "نیازمند بررسی",
    className: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
  },
  legalIssue: {
    label: "مغایرت قانونی",
    className: "bg-destructive/15 text-destructive",
  },
  accountingIssue: {
    label: "مغایرت حسابداری",
    className: "bg-destructive/15 text-destructive",
  },
  approved: {
    label: "تأییدشده",
    className: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
  },
  returned: { label: "بازگشت‌داده‌شده", className: "bg-muted text-foreground" },
};

function riskBadge(score: number) {
  if (score >= 80)
    return <Badge className="bg-destructive text-destructive-foreground">بحرانی</Badge>;
  if (score >= 60)
    return (
      <Badge className="bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]">
        بالا
      </Badge>
    );
  if (score >= 40) return <Badge variant="secondary">متوسط</Badge>;
  return (
    <Badge className="bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]">
      پایین
    </Badge>
  );
}

function DocumentsList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => services.documents.list(),
  });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [unit, setUnit] = useState<string>("all");

  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (unit !== "all" && d.organizationUnit !== unit) return false;
      if (q && !(`${d.number} ${d.title} ${d.description}`.includes(q))) return false;
      return true;
    });
  }, [data, q, status, unit]);

  const units = Array.from(new Set(data.map((d) => d.organizationUnit)));

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">اسناد حسابداری</h1>
        <p className="text-sm text-muted-foreground mt-1">
          فهرست اسناد حسابداری با امتیاز ریسک هوشمند و وضعیت بررسی.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جست‌وجو در شماره، عنوان یا توضیح…"
              className="pr-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="واحد سازمانی" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه واحدها</SelectItem>
              {units.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">شماره سند</TableHead>
                <TableHead className="text-start">عنوان</TableHead>
                <TableHead className="text-start">فروشنده</TableHead>
                <TableHead className="text-start">مبلغ</TableHead>
                <TableHead className="text-start">تاریخ</TableHead>
                <TableHead className="text-start">ریسک</TableHead>
                <TableHead className="text-start">وضعیت</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="h-8 rounded bg-muted animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    سندی مطابق فیلترها یافت نشد.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((d) => {
                const vendor = vendors.find((v) => v.id === d.vendorId);
                const st = STATUS_META[d.status];
                return (
                  <TableRow key={d.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs">{d.number}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.organizationUnit}
                      </div>
                    </TableCell>
                    <TableCell>{vendor?.name}</TableCell>
                    <TableCell className="text-xs">{formatIRR(d.amount)}</TableCell>
                    <TableCell className="text-xs">{d.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {riskBadge(d.riskScore)}
                        <span className="text-xs text-muted-foreground">{d.riskScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-left">
                      <Link
                        to="/app/documents/$id"
                        params={{ id: d.id }}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        مشاهده
                        <ChevronLeft className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
