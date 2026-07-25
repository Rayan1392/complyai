import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/services";
import type { KnowledgeSourceInput } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toFaDigits } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Layers, Upload, Link as LinkIcon, Globe } from "lucide-react";

export const Route = createFileRoute("/app/knowledge/")({
  head: () => ({ meta: [{ title: "مرکز دانش — دیدبان حسابرسی" }] }),
  component: KnowledgePage,
});

const CATEGORY: Record<string, string> = {
  tax: "مالیاتی",
  insurance: "بیمه",
  accountingStandard: "استاندارد حسابداری",
  auditingStandard: "استاندارد حسابرسی",
  internal: "داخلی شرکت",
  circular: "بخشنامه",
};

const STATUS_LABEL: Record<string, string> = {
  active: "فعال",
  needsReview: "نیازمند بررسی",
  outdated: "منسوخ",
  archived: "بایگانی",
};

function statusBadge(s: string) {
  if (s === "active")
    return "bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)]";
  if (s === "needsReview")
    return "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]";
  return "bg-muted text-foreground";
}

function KnowledgePage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["knowledge-sources"],
    queryFn: () => services.knowledge.listSources(),
  });

  const [openAdd, setOpenAdd] = useState(false);
  const [openVersions, setOpenVersions] = useState<string | null>(null);

  const reprocess = useMutation({
    mutationFn: (id: string) => services.knowledge.reprocess(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-sources"] });
      toast.success("پردازش مجدد کامل شد");
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => services.knowledge.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-sources"] });
      toast.success("منبع حذف شد");
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">مرکز دانش</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مدیریت منابع مرجع (قوانین، آیین‌نامه‌ها، استانداردها) که در ارزیابی انطباق استناد
            می‌شوند.
          </p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> افزودن منبع دانش
            </Button>
          </DialogTrigger>
          <AddSourceDialog onDone={() => setOpenAdd(false)} />
        </Dialog>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">عنوان</TableHead>
              <TableHead className="text-start">دسته</TableHead>
              <TableHead className="text-start">نسخه</TableHead>
              <TableHead className="text-start">اعتبار از</TableHead>
              <TableHead className="text-start">صفحه</TableHead>
              <TableHead className="text-start">Chunk</TableHead>
              <TableHead className="text-start">وضعیت</TableHead>
              <TableHead className="text-start">اقدامات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/40">
                <TableCell>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.publisher}</div>
                </TableCell>
                <TableCell className="text-xs">{CATEGORY[s.category]}</TableCell>
                <TableCell className="text-xs">{s.versionLabel}</TableCell>
                <TableCell className="text-xs">{s.effectiveFrom}</TableCell>
                <TableCell className="text-xs">{toFaDigits(s.pageCount)}</TableCell>
                <TableCell className="text-xs">{toFaDigits(s.chunkCount)}</TableCell>
                <TableCell>
                  <Badge className={statusBadge(s.status) + " text-[11px]"}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1"
                      onClick={() => reprocess.mutate(s.id)}
                      disabled={reprocess.isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      پردازش
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1"
                      onClick={() => setOpenVersions(s.id)}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      نسخه‌ها
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-destructive"
                      onClick={() => remove.mutate(s.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!openVersions} onOpenChange={(o) => !o && setOpenVersions(null)}>
        {openVersions && <VersionsDialog sourceId={openVersions} />}
      </Dialog>
    </div>
  );
}

function AddSourceDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<KnowledgeSourceInput["ingestMode"]>("upload");
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [category, setCategory] = useState<KnowledgeSourceInput["category"]>("tax");
  const [versionLabel, setVersionLabel] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [pageCount, setPageCount] = useState<number>(20);
  const [sourceRef, setSourceRef] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing">("idle");

  const add = useMutation({
    mutationFn: async () => {
      setPhase("uploading");
      await new Promise((r) => setTimeout(r, 500));
      setPhase("processing");
      const s = await services.knowledge.addSource({
        title,
        publisher,
        category,
        versionLabel,
        effectiveFrom,
        pageCount,
        ingestMode: mode,
        sourceRef,
      });
      await services.knowledge.reprocess(s.id);
      return s;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-sources"] });
      toast.success("منبع دانش افزوده و پردازش شد");
      setPhase("idle");
      onDone();
    },
    onError: () => {
      setPhase("idle");
      toast.error("افزودن منبع ناموفق بود");
    },
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>افزودن منبع دانش</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="flex gap-2">
          {(
            [
              ["upload", "بارگذاری فایل", Upload],
              ["url", "URL مستقیم", LinkIcon],
              ["crawl", "Crawl وب", Globe],
            ] as const
          ).map(([m, label, Icon]) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "outline"}
              onClick={() => setMode(m)}
              className="gap-1"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">عنوان</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">ناشر / مرجع</div>
            <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">دسته</div>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">نسخه</div>
            <Input
              placeholder="مثلاً v1"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">اعتبار از</div>
            <Input
              placeholder="۱۴۰۴/۰۱/۰۱"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">تعداد صفحه</div>
            <Input
              type="number"
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {mode === "upload" ? "نام فایل" : mode === "url" ? "URL" : "دامنه یا الگو"}
          </div>
          <Input
            placeholder={mode === "url" ? "https://…" : mode === "crawl" ? "https://example.gov.ir/*" : "law.pdf"}
            value={sourceRef}
            onChange={(e) => setSourceRef(e.target.value)}
          />
        </div>

        {phase !== "idle" && (
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {phase === "uploading"
              ? "در حال بارگذاری منبع…"
              : "در حال پردازش (Chunking + Embedding)…"}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          disabled={!title || !publisher || !versionLabel || !effectiveFrom || add.isPending}
          onClick={() => add.mutate()}
        >
          {add.isPending ? "در حال ثبت…" : "ثبت و پردازش"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function VersionsDialog({ sourceId }: { sourceId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["kb-versions", sourceId],
    queryFn: () => services.knowledge.listVersions(sourceId),
  });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>نسخه‌های منبع</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        {data.length === 0 ? (
          <div className="text-xs text-muted-foreground">نسخه‌ای ثبت نشده است.</div>
        ) : (
          data.map((v) => (
            <div
              key={v.id}
              className="rounded border p-3 text-sm flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  {v.versionLabel}
                  {v.isCurrent && (
                    <Badge className="ms-2 bg-primary text-primary-foreground text-[10px]">
                      جاری
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  اعتبار از {v.effectiveFrom}
                  {v.effectiveTo ? ` تا ${v.effectiveTo}` : ""} • {toFaDigits(v.pageCount)} صفحه
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DialogContent>
  );
}
