import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { knowledgeSources, ruleVersions } from "@/services/mockData";
import { toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/app/rules/")({
  head: () => ({ meta: [{ title: "کتابخانه کنترل‌ها — دیدبان حسابرسی" }] }),
  component: RulesPage,
});

const CATEGORY: Record<string, string> = {
  tax: "مالیاتی",
  insurance: "بیمه",
  accountingStandard: "استاندارد حسابداری",
  auditingStandard: "استاندارد حسابرسی",
  internalControl: "کنترل داخلی",
};

function RulesPage() {
  const { data = [] } = useQuery({
    queryKey: ["rules"],
    queryFn: () => services.compliance.listRules(),
  });
  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">کتابخانه کنترل‌ها</h1>
        <p className="text-sm text-muted-foreground mt-1">
          قواعد اجرایی متصل به منابع دانش. تغییرات فقط در Local State نمایش داده می‌شود.
        </p>
      </div>
      <div className="grid gap-3">
        {data.map((r) => {
          const version = ruleVersions.find((v) => v.id === r.currentVersionId);
          const source = knowledgeSources.find((s) => s.id === version?.sourceId);
          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{CATEGORY[r.category]}</Badge>
                    <Badge variant="outline">
                      {r.scope === "documentControl" ? "کنترل روی سند" : "ارزیابی حسابرس"}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.description}</div>
                  {version && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      نسخه: {version.versionLabel} • اعتبار از {version.effectiveFrom}
                      {source && (
                        <>
                          {" "}
                          • منبع: <span className="text-foreground">{source.title}</span>
                          {version.articleNumber && (
                            <> — م. {toFaDigits(version.articleNumber)}</>
                          )}
                          {version.clauseNumber && <>، {version.clauseNumber}</>}
                          <> — ص. {toFaDigits(version.pageNumber)}</>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">فعال</span>
                  <Switch defaultChecked={r.active} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
