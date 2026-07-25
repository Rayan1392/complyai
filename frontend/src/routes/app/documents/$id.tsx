import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  MessageSquare,
  Bot,
  ArrowLeft,
  Send,
  BookOpen,
  ArrowUpRight,
  ArrowRightCircle,
  Sparkles,
  Loader2,
  FileText,
  Info,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { formatIRR, formatPercent, toFaDigits } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  vendors,
  evidenceRequirements,
  attachments as allAttachments,
  complianceRules,
  citations as allCitations,
} from "@/services/mockData";
import type {
  AssistantMessage,
  KnowledgeCitation,
  OrchestrationResult,
  PipelineStage,
  RuleEvaluation,
} from "@/types/domain";

export const Route = createFileRoute("/app/documents/$id")({
  head: () => ({ meta: [{ title: "جزئیات سند — دیدبان حسابرسی" }] }),
  component: DocumentDetail,
});

const STAGE_ICON: Record<PipelineStage["status"], ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
  warn: <AlertTriangle className="h-4 w-4 text-[color:var(--color-warning)]" />,
  info: <Info className="h-4 w-4 text-primary" />,
};

function DocumentDetail() {
  const { id } = useParams({ from: "/app/documents/$id" });
  const qc = useQueryClient();
  const [citationOpen, setCitationOpen] = useState<KnowledgeCitation | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const doc = useQuery({ queryKey: ["doc", id], queryFn: () => services.documents.get(id) });
  const orchestration = useQuery<OrchestrationResult>({
    queryKey: ["orchestration", id],
    queryFn: () => services.orchestration.evaluateDocument(id),
  });
  const trail = useQuery({
    queryKey: ["trail", id],
    queryFn: () => services.trail.listForDocument(id),
    enabled: !!orchestration.data,
  });
  const atts = useQuery({
    queryKey: ["atts", id],
    queryFn: () => services.documents.getAttachments(id),
  });

  const vendor = doc.data ? vendors.find((v) => v.id === doc.data.vendorId) : undefined;

  async function updateStatus(status: any, label: string) {
    if (!doc.data) return;
    await services.documents.updateStatus(id, status);
    await services.trail.append({
      entityId: id,
      entityKind: "document",
      actor: "علی محمدی",
      action: label,
    });
    qc.invalidateQueries({ queryKey: ["doc", id] });
    qc.invalidateQueries({ queryKey: ["trail", id] });
    toast.success(label);
  }

  if (doc.isLoading || !doc.data) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const d = doc.data;
  const r = orchestration.data;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <Link
            to="/app/documents"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowRightCircle className="h-3 w-3" />
            بازگشت به فهرست
          </Link>
          <h1 className="text-2xl font-bold">{d.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono">{d.number}</span>
            <span>•</span>
            <span>تاریخ: {d.date}</span>
            <span>•</span>
            <Link
              to="/app/vendors/$id"
              params={{ id: d.vendorId }}
              className="text-primary hover:underline"
            >
              {vendor?.name}
            </Link>
            <span>•</span>
            <span>{d.organizationUnit}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-xs text-muted-foreground">مبلغ سند</div>
          <div className="text-2xl font-bold">{formatIRR(d.amount)}</div>
          <div className="flex items-center gap-2">
            <RiskChip score={d.riskScore} />
            <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bot className="h-4 w-4" />
                  دستیار حسابرس
                </Button>
              </SheetTrigger>
              <AssistantSheet documentId={id} onCitation={setCitationOpen} />
            </Sheet>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground me-2">اقدامات:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateStatus("approved", "تأیید سند")}
        >
          <CheckCircle2 className="ms-1 h-4 w-4" />
          تأیید سند
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateStatus("returned", "بازگرداندن سند برای اصلاح")}
        >
          بازگرداندن برای اصلاح
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            services.trail
              .append({
                entityId: id,
                entityKind: "document",
                actor: "علی محمدی",
                action: "ثبت یادداشت",
                detail: "یادداشت دستی حسابرس",
              })
              .then(() => {
                qc.invalidateQueries({ queryKey: ["trail", id] });
                toast.success("یادداشت ثبت شد.");
              })
          }
        >
          <MessageSquare className="ms-1 h-4 w-4" />
          ثبت یادداشت
        </Button>
        <div className="ms-auto text-xs text-muted-foreground">
          مسئول بررسی: {d.assignee}
        </div>
      </Card>

      {/* Pipeline */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">جریان ارزیابی خودکار (Pipeline)</div>
            <div className="text-xs text-muted-foreground">
              خروجی <span className="font-mono">ComplianceOrchestrationService</span> —
              {r ? ` اجرا در ${r.ranAt}` : " در حال اجرا…"}
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        {!r ? (
          <div className="h-24 bg-muted animate-pulse rounded" />
        ) : (
          <ol className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
            {r.stages.map((s, i) => (
              <li
                key={s.key}
                className="flex items-start gap-2 rounded-md border bg-card/50 p-3"
              >
                <div className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                  {toFaDigits(String(i + 1).padStart(2, "0"))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {STAGE_ICON[s.status]}
                    <span className="text-xs font-medium truncate">{s.label}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {s.summary}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary" dir="rtl" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="summary">خلاصه هوشمند</TabsTrigger>
          <TabsTrigger value="evidence">مدارک پشتیبان</TabsTrigger>
          <TabsTrigger value="compliance">انطباق کنترل‌ها</TabsTrigger>
          <TabsTrigger value="anomaly">ناهنجاری قیمت</TabsTrigger>
          <TabsTrigger value="matching">زنجیره تطبیق</TabsTrigger>
          <TabsTrigger value="finding">یافته حسابرسی</TabsTrigger>
          <TabsTrigger value="trail">تاریخچه حسابرسی</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SummaryTab result={r} onCitation={setCitationOpen} />
        </TabsContent>
        <TabsContent value="evidence">
          <EvidenceTab result={r} onCitation={setCitationOpen} />
        </TabsContent>
        <TabsContent value="compliance">
          <ComplianceTab result={r} onCitation={setCitationOpen} />
        </TabsContent>
        <TabsContent value="anomaly">
          <AnomalyTab result={r} />
        </TabsContent>
        <TabsContent value="matching">
          <MatchingTab result={r} />
        </TabsContent>
        <TabsContent value="finding">
          <FindingTab documentId={id} result={r} onCitation={setCitationOpen} />
        </TabsContent>
        <TabsContent value="trail">
          <TrailTab trail={trail.data ?? []} />
        </TabsContent>
      </Tabs>

      {/* Citation Sheet */}
      <Sheet
        open={!!citationOpen}
        onOpenChange={(o) => !o && setCitationOpen(null)}
      >
        <SheetContent side="left" className="w-full sm:max-w-md">
          {citationOpen && <CitationView citation={citationOpen} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---------- Small helpers ----------

function RiskChip({ score }: { score: number }) {
  const cfg =
    score >= 80
      ? { label: "بحرانی", cls: "bg-destructive text-destructive-foreground" }
      : score >= 60
        ? {
            label: "بالا",
            cls: "bg-[color:var(--color-warning)] text-[color:var(--color-warning-foreground)]",
          }
        : { label: "متوسط", cls: "bg-secondary text-secondary-foreground" };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${cfg.cls}`}
    >
      امتیاز ریسک {toFaDigits(score)} / ۱۰۰ — {cfg.label}
    </span>
  );
}

function CitationChip({
  citationId,
  onClick,
  citations,
}: {
  citationId: string;
  onClick: (c: KnowledgeCitation) => void;
  citations: KnowledgeCitation[];
}) {
  const c = citations.find((x) => x.id === citationId);
  if (!c) return null;
  return (
    <button
      onClick={() => onClick(c)}
      className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[11px] hover:bg-muted transition-colors"
    >
      <BookOpen className="h-3 w-3" />
      {c.sourceTitle}
      {c.articleNumber && <span className="text-muted-foreground">— م. {c.articleNumber}</span>}
      <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}

// ---------- Tabs ----------

function SummaryTab({
  result,
  onCitation,
}: {
  result?: OrchestrationResult;
  onCitation: (c: KnowledgeCitation) => void;
}) {
  if (!result) return <Skeleton />;
  const { interpretation, risk, citations } = result;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-4 lg:col-span-2 space-y-3">
        <div className="text-sm font-semibold">تفسیر هوشمند</div>
        <p className="text-sm leading-7 text-foreground/90">{interpretation.summary}</p>
        <ul className="mt-2 space-y-2">
          {interpretation.keyPoints.map((kp, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-primary">•</span>
              <span>{kp}</span>
            </li>
          ))}
        </ul>
        <div className="pt-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground">منابع استناد:</div>
          <div className="flex flex-wrap gap-2">
            {interpretation.citationIds.map((id) => (
              <CitationChip
                key={id}
                citationId={id}
                citations={citations}
                onClick={onCitation}
              />
            ))}
          </div>
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">امتیاز ریسک</div>
        <div className="text-4xl font-bold">
          {toFaDigits(risk.score)}
          <span className="text-sm text-muted-foreground">/۱۰۰</span>
        </div>
        <div className="space-y-2 pt-2">
          {risk.contributingFactors.map((f) => (
            <div key={f.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{f.label}</span>
                <span className="text-muted-foreground">{formatPercent(f.weight)}</span>
              </div>
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${f.weight * 2}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function EvidenceTab({
  result,
  onCitation,
}: {
  result?: OrchestrationResult;
  onCitation: (c: KnowledgeCitation) => void;
}) {
  if (!result) return <Skeleton />;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-4 lg:col-span-2">
        <div className="text-sm font-semibold mb-3">لیست مدارک الزامی (Evidence Checklist)</div>
        <ul className="space-y-2">
          {result.evidenceMatches.map((m) => {
            const req = evidenceRequirements.find((r) => r.id === m.requirementId)!;
            const att = m.attachmentId
              ? allAttachments.find((a) => a.id === m.attachmentId)
              : undefined;
            const icon =
              m.status === "present" ? (
                <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
              ) : m.status === "weak" ? (
                <AlertTriangle className="h-4 w-4 text-[color:var(--color-warning)]" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              );
            return (
              <li
                key={m.requirementId}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <div className="mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{req.title}</span>
                    {req.mandatory && <Badge variant="outline">الزامی</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{req.rationale}</div>
                  {att && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{att.filename}</span>
                      <span className="text-muted-foreground">
                        OCR {toFaDigits((att.ocrConfidence * 100).toFixed(0))}٪
                      </span>
                      <span
                        className={
                          att.relevanceScore < 0.4
                            ? "text-destructive"
                            : "text-[color:var(--color-success)]"
                        }
                      >
                        ارتباط {toFaDigits((att.relevanceScore * 100).toFixed(0))}٪
                      </span>
                      {m.note && (
                        <span className="text-[color:var(--color-warning)]">— {m.note}</span>
                      )}
                    </div>
                  )}
                  {att && att.relevanceScore < 0.4 && (
                    <div className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      {att.extractedSummary}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">ارزیابی حسابرس روی شواهد</div>
        <p className="text-xs text-muted-foreground leading-6">
          طبق استاندارد حسابرسی ۵۰۰، شواهد باید از نظر <b>کفایت</b>، <b>مناسب‌بودن</b> و
          <b> قابلیت اتکا</b> ارزیابی شوند.
        </p>
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">وضعیت:</span>{" "}
            <b className="text-[color:var(--color-warning)]">NeedsReview</b>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">دلیل:</span> فقدان صورتحساب الکترونیکی معتبر
            و وجود ضمیمهٔ نامرتبط، کفایت شواهد را مخدوش کرده است.
          </div>
          <div className="pt-2">
            <CitationChip
              citationId="ct-audit-500"
              citations={result.citations}
              onClick={onCitation}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ComplianceTab({
  result,
  onCitation,
}: {
  result?: OrchestrationResult;
  onCitation: (c: KnowledgeCitation) => void;
}) {
  if (!result) return <Skeleton />;

  const groupsDoc: Array<{ key: string; label: string }> = [
    { key: "tax", label: "مالیاتی" },
    { key: "insurance", label: "بیمه و تأمین اجتماعی" },
    { key: "accountingStandard", label: "استانداردهای حسابداری" },
    { key: "internalControl", label: "کنترل داخلی" },
  ];
  const groupsAudit = [{ key: "auditingStandard", label: "استانداردهای حسابرسی" }];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold">کنترل‌های روی سند</div>
          <div className="text-xs text-muted-foreground">
            بررسی خودکار قواعد مالیاتی، بیمه‌ای، حسابداری و کنترل داخلی روی این سند.
          </div>
        </div>
        <div className="space-y-4">
          {groupsDoc.map((g) => (
            <RuleGroup
              key={g.key}
              label={g.label}
              result={result}
              category={g.key}
              onCitation={onCitation}
            />
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold">ارزیابی حسابرس روی شواهد</div>
          <div className="text-xs text-muted-foreground">
            نتیجهٔ استانداردهای حسابرسی — این ارزیابی «نقض قانون توسط سند» نیست، بلکه بررسی
            کیفیت شواهد است.
          </div>
        </div>
        {groupsAudit.map((g) => (
          <RuleGroup
            key={g.key}
            label={g.label}
            result={result}
            category={g.key}
            onCitation={onCitation}
          />
        ))}
      </Card>
    </div>
  );
}

function RuleGroup({
  label,
  result,
  category,
  onCitation,
}: {
  label: string;
  result: OrchestrationResult;
  category: string;
  onCitation: (c: KnowledgeCitation) => void;
}) {
  // We look up rules via mock imports
  const evalsInCategory = result.evaluations.filter((ev) => {
    // find rule to check category
    return true; // filtered below
  });
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-2">{label}</div>
      <div className="space-y-2">
        {result.evaluations
          .map((ev) => ({ ev, rule: findRule(ev.ruleId) }))
          .filter(({ rule }) => rule?.category === category)
          .map(({ ev, rule }) => (
            <EvaluationRow
              key={ev.id}
              ev={ev}
              ruleTitle={rule!.title}
              ruleDescription={rule!.description}
              onCitation={onCitation}
              result={result}
            />
          ))}
        {result.evaluations
          .map((ev) => ({ ev, rule: findRule(ev.ruleId) }))
          .filter(({ rule }) => rule?.category === category).length === 0 && (
          <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
            کنترلی در این دسته اجرا نشده است.
          </div>
        )}
      </div>
    </div>
  );
}

function findRule(id: string) {
  return complianceRules.find((r) => r.id === id);
}

function EvaluationRow({
  ev,
  ruleTitle,
  ruleDescription,
  onCitation,
  result,
}: {
  ev: RuleEvaluation;
  ruleTitle: string;
  ruleDescription: string;
  onCitation: (c: KnowledgeCitation) => void;
  result: OrchestrationResult;
}) {
  const statusMeta = {
    Pass: {
      icon: <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />,
      cls: "border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/5",
      label: "Pass",
    },
    Fail: {
      icon: <XCircle className="h-4 w-4 text-destructive" />,
      cls: "border-destructive/40 bg-destructive/5",
      label: "Fail",
    },
    NeedsReview: {
      icon: <AlertTriangle className="h-4 w-4 text-[color:var(--color-warning)]" />,
      cls: "border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/5",
      label: "NeedsReview",
    },
    NotApplicable: {
      icon: <MinusCircle className="h-4 w-4 text-muted-foreground" />,
      cls: "border-border bg-muted/30",
      label: "NotApplicable",
    },
    Applicable: {
      icon: <Info className="h-4 w-4 text-primary" />,
      cls: "border-primary/40 bg-primary/5",
      label: "Applicable",
    },
  }[ev.status];

  return (
    <div className={`rounded-md border p-3 ${statusMeta.cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {statusMeta.icon}
          <div className="min-w-0">
            <div className="text-sm font-medium">{ruleTitle}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{ruleDescription}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className="text-[10px]">
            {statusMeta.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {ev.evaluationMode} · اطمینان {toFaDigits((ev.confidence * 100).toFixed(0))}٪
          </span>
        </div>
      </div>

      <div className="mt-2 rounded bg-background/70 p-2 text-xs leading-6">{ev.rationale}</div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {ev.citationIds.map((id) => (
          <CitationChip
            key={id}
            citationId={id}
            citations={result.citations.concat(getAllCitations())}
            onClick={onCitation}
          />
        ))}
        {ev.requiresHumanReview && (
          <Badge className="bg-[color:var(--color-warning)]/20 text-[color:var(--color-warning)] border-none">
            نیازمند بررسی انسانی
          </Badge>
        )}
      </div>
    </div>
  );
}

function getAllCitations(): KnowledgeCitation[] {
  return allCitations;
}

function AnomalyTab({ result }: { result?: OrchestrationResult }) {
  if (!result) return <Skeleton />;
  const price = result.anomalies.find((a) => a.kind === "price");
  if (!price?.benchmark)
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        ناهنجاری قیمتی برای این سند شناسایی نشده است.
      </Card>
    );
  const b = price.benchmark;
  const chart = [
    { name: "میانگین داخلی", value: b.internalAverage },
    { name: "کف بازار", value: b.marketMin },
    { name: "سقف بازار", value: b.marketMax },
    { name: "این سند", value: b.documentAmount },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-4 lg:col-span-2">
        <div className="text-sm font-semibold mb-3">مقایسه با سوابق داخلی و بازار</div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`}
              />
              <Tooltip
                formatter={(v: number) => formatIRR(v)}
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">شاخص‌های ناهنجاری</div>
        <Row label="مبلغ سند" value={formatIRR(b.documentAmount)} tone="destructive" />
        <Row
          label={`میانگین ${toFaDigits(b.internalSampleSize)} خرید داخلی`}
          value={formatIRR(b.internalAverage)}
        />
        <Row label="بازه بازار" value={`${formatIRR(b.marketMin)} — ${formatIRR(b.marketMax)}`} />
        <div className="rounded-md bg-destructive/10 p-3 text-destructive">
          <div className="text-xs">انحراف از میانگین</div>
          <div className="text-2xl font-bold">+{toFaDigits(b.deviationPercent)}٪</div>
        </div>
        <div className="text-xs text-muted-foreground leading-6">{price.description}</div>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "destructive";
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "destructive" ? "text-destructive font-medium" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}

function MatchingTab({ result }: { result?: OrchestrationResult }) {
  if (!result) return <Skeleton />;
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold mb-4">زنجیره تطبیق چندطرفه</div>
      <div className="flex flex-wrap items-stretch gap-3">
        {result.matchingChain.nodes.map((n, i) => {
          const cfg =
            n.status === "present"
              ? {
                  cls: "border-[color:var(--color-success)]/50 bg-[color:var(--color-success)]/5",
                  icon: (
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
                  ),
                }
              : n.status === "missing"
                ? {
                    cls: "border-destructive/50 bg-destructive/5",
                    icon: <XCircle className="h-4 w-4 text-destructive" />,
                  }
                : {
                    cls: "border-[color:var(--color-warning)]/50 bg-[color:var(--color-warning)]/5",
                    icon: (
                      <AlertTriangle className="h-4 w-4 text-[color:var(--color-warning)]" />
                    ),
                  };
          return (
            <div key={n.id} className="flex items-center">
              <div className={`min-w-[180px] rounded-md border p-3 ${cfg.cls}`}>
                <div className="flex items-center gap-2">
                  {cfg.icon}
                  <span className="text-sm font-medium">{n.label}</span>
                </div>
                {n.reference && (
                  <div className="text-[11px] font-mono text-muted-foreground mt-1">
                    {n.reference}
                  </div>
                )}
                {n.date && (
                  <div className="text-[11px] text-muted-foreground">تاریخ: {n.date}</div>
                )}
                {n.note && (
                  <div className="text-[11px] text-destructive mt-1">{n.note}</div>
                )}
              </div>
              {i < result.matchingChain.nodes.length - 1 && (
                <ArrowLeft className="mx-2 h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FindingTab({
  documentId,
  result,
  onCitation,
}: {
  documentId: string;
  result?: OrchestrationResult;
  onCitation: (c: KnowledgeCitation) => void;
}) {
  const qc = useQueryClient();
  const finding = useQuery({
    queryKey: ["findings-doc", documentId],
    queryFn: () => services.findings.listForDocument(documentId),
    enabled: !!result,
  });

  if (!result || !finding.data) return <Skeleton />;
  const f = finding.data[0];
  if (!f)
    return (
      <Card className="p-6 text-sm text-muted-foreground">یافته‌ای برای این سند وجود ندارد.</Card>
    );

  async function act(status: any, label: string) {
    await services.findings.updateStatus(f.id, status, "علی محمدی");
    qc.invalidateQueries({ queryKey: ["findings-doc", documentId] });
    qc.invalidateQueries({ queryKey: ["trail", documentId] });
    toast.success(label);
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-destructive text-destructive-foreground">شدت بالا</Badge>
            <Badge variant="outline">وضعیت: {f.status}</Badge>
            <Badge variant="outline">تولید توسط {f.createdBy === "ai" ? "AI" : "حسابرس"}</Badge>
          </div>
          <h3 className="mt-2 text-lg font-semibold">{f.title}</h3>
        </div>
        <Link
          to="/app/findings/$id"
          params={{ id: f.id }}
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          مشاهده در مرکز یافته‌ها <ArrowRightCircle className="h-4 w-4" />
        </Link>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">علت ریشه‌ای</div>
        <p className="text-sm leading-7">{f.rootCause}</p>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">پیشنهاد حسابرس</div>
        <p className="text-sm leading-7">{f.auditorSuggestion}</p>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">منابع استناد</div>
        <div className="flex flex-wrap gap-2">
          {f.citationIds.map((id) => (
            <CitationChip
              key={id}
              citationId={id}
              citations={result.citations.concat(getAllCitations())}
              onClick={onCitation}
            />
          ))}
        </div>
      </div>

      <div className="pt-3 border-t flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act("Confirmed", "یافته تأیید شد")}>
          تأیید یافته
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => act("Edited", "یافته ویرایش شد")}
        >
          ویرایش
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => act("NeedsInvestigation", "یافته نیازمند بررسی بیشتر")}
        >
          نیازمند بررسی بیشتر
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          onClick={() => act("Dismissed", "یافته رد شد")}
        >
          رد یافته
        </Button>
      </div>
    </Card>
  );
}

function TrailTab({ trail }: { trail: any[] }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold mb-3">تاریخچه حسابرسی</div>
      {trail.length === 0 ? (
        <div className="text-sm text-muted-foreground">رخدادی ثبت نشده است.</div>
      ) : (
        <ol className="relative border-r-2 border-border pr-4 space-y-4">
          {trail
            .slice()
            .reverse()
            .map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -right-[7px] top-1 h-3 w-3 rounded-full bg-primary" />
                <div className="text-sm font-medium">{t.action}</div>
                <div className="text-xs text-muted-foreground">
                  {t.actor} — {t.timestamp}
                </div>
                {t.detail && <div className="text-xs mt-1">{t.detail}</div>}
              </li>
            ))}
        </ol>
      )}
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
      <div className="h-24 bg-muted animate-pulse rounded" />
    </div>
  );
}

// ---------- Citation view ----------
function CitationView({ citation }: { citation: KnowledgeCitation }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-start">{citation.sourceTitle}</SheetTitle>
      </SheetHeader>
      <div className="p-4 space-y-3 text-sm">
        <div className="text-xs text-muted-foreground">{citation.publisher}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {citation.articleNumber && <Row label="ماده / بخش" value={citation.articleNumber} />}
          {citation.clauseNumber && <Row label="بند" value={citation.clauseNumber} />}
          <Row label="صفحه" value={toFaDigits(citation.pageNumber)} />
          <Row label="نسخه" value={citation.versionLabel} />
          <Row label="اعتبار از" value={citation.effectiveFrom} />
          {citation.effectiveTo && <Row label="اعتبار تا" value={citation.effectiveTo} />}
        </div>
        <div className="rounded-md border bg-muted/40 p-3 text-sm leading-7">
          «{citation.snippet}»
        </div>
        <Link
          to="/app/knowledge"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          مشاهده در مرکز دانش <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </>
  );
}

// ---------- Assistant Sheet ----------
function AssistantSheet({
  documentId,
  onCitation,
}: {
  documentId: string;
  onCitation: (c: KnowledgeCitation) => void;
}) {
  const [msgs, setMsgs] = useState<AssistantMessage[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    services.assistant.suggestedQuestions(documentId).then(setSuggested);
  }, [documentId]);

  async function send(text?: string) {
    const question = (text ?? q).trim();
    if (!question) return;
    setQ("");
    const userMsg: AssistantMessage = {
      id: `um-${Date.now()}`,
      role: "user",
      text: question,
      createdAt: "",
    };
    setMsgs((m) => [...m, userMsg]);
    setSending(true);
    try {
      const reply = await services.assistant.ask(documentId, question);
      setMsgs((m) => [...m, reply]);
    } finally {
      setSending(false);
    }
  }

  return (
    <SheetContent side="left" className="w-full sm:max-w-lg flex flex-col p-0">
      <SheetHeader className="p-4 border-b">
        <SheetTitle className="text-start flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          دستیار حسابرس
        </SheetTitle>
        <div className="text-xs text-muted-foreground text-start">
          پاسخ‌ها با استناد به منابع Mock در مرکز دانش تولید می‌شوند.
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">پیشنهاد سؤالات:</div>
            {suggested.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-start rounded-md border p-2 text-sm hover:bg-accent transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-3 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground ms-8"
                : "bg-muted me-8"
            }`}
          >
            <div className="leading-7 whitespace-pre-wrap">{m.text}</div>
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.citations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onCitation(c)}
                    className="inline-flex items-center gap-1 rounded border bg-background/80 text-foreground px-2 py-1 text-[11px] hover:bg-background"
                  >
                    <BookOpen className="h-3 w-3" />
                    {c.sourceTitle}
                    {c.articleNumber && <span>— م. {c.articleNumber}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            در حال آماده‌سازی پاسخ…
          </div>
        )}
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="سؤال خود را بپرسید…"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button size="icon" onClick={() => send()} disabled={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </SheetContent>
  );
}
