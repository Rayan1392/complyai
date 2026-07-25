import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { phase4 } from "@/services";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Integration, IntegrationKind } from "@/types/domain";
import { toFaDigits } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import {
  Banknote,
  Cloud,
  Database,
  KeyRound,
  Mail,
  RefreshCw,
  ScanText,
  Settings2,
  ShieldCheck,
  Unplug,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/app/integrations/")({
  head: () => ({
    meta: [
      { title: "یکپارچه‌سازی‌ها — دیدبان حسابرسی" },
      {
        name: "description",
        content:
          "اتصال به ERP، سامانه مؤدیان، بانک، ایمیل، OCR و سرویس‌های احراز هویت.",
      },
    ],
  }),
  component: IntegrationsPage,
});

const KIND_ICON: Record<IntegrationKind, typeof Database> = {
  erp: Database,
  tax: ShieldCheck,
  bank: Banknote,
  email: Mail,
  ocr: ScanText,
  identity: KeyRound,
  storage: Cloud,
};

const KIND_LABEL: Record<IntegrationKind, string> = {
  erp: "ERP",
  tax: "مالیاتی",
  bank: "بانکی",
  email: "ایمیل",
  ocr: "OCR",
  identity: "احراز هویت",
  storage: "بایگانی",
};

function IntegrationsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => phase4.integrations.list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["integrations"] });

  const connected = data.filter((i) => i.status === "connected").length;
  const total = data.length;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">یکپارچه‌سازی با سیستم‌های خارجی</h1>
        <p className="text-sm text-muted-foreground mt-1">
          پروتوتایپ اتصال به سامانه‌های ERP، مالیاتی، بانکی و پشتیبانی. وضعیت
          فعلی: {toFaDigits(connected)} از {toFaDigits(total)} فعال.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {data.map((it) => (
          <IntegrationCard key={it.id} it={it} onChange={invalidate} />
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({
  it,
  onChange,
}: {
  it: Integration;
  onChange: () => void;
}) {
  const Icon = KIND_ICON[it.kind];
  const [busy, setBusy] = useState<null | "sync" | "connect" | "disconnect">(null);
  const [open, setOpen] = useState(false);

  const doSync = async () => {
    setBusy("sync");
    try {
      await phase4.integrations.sync(it.id);
      toast.success(`همگام‌سازی ${it.name} انجام شد.`);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const doConnect = async () => {
    setBusy("connect");
    await phase4.integrations.connect(it.id);
    toast.success(`${it.name} متصل شد.`);
    onChange();
    setBusy(null);
  };
  const doDisconnect = async () => {
    setBusy("disconnect");
    await phase4.integrations.disconnect(it.id);
    toast.success(`اتصال ${it.name} قطع شد.`);
    onChange();
    setBusy(null);
  };

  return (
    <Card className="p-4 space-y-3 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-sm">{it.name}</div>
            <Badge variant="outline" className="text-[10px]">
              {KIND_LABEL[it.kind]}
            </Badge>
            <StatusBadge status={it.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{it.provider}</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{it.description}</p>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div>
          آخرین همگام‌سازی: <span className="text-foreground">{it.lastSyncAt ?? "—"}</span>
        </div>
        <div>
          موارد همگام: <span className="text-foreground">
            {toFaDigits(it.itemsSynced ?? 0)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-2 border-t">
        {it.status === "disconnected" ? (
          <Button size="sm" onClick={doConnect} disabled={busy !== null}>
            <Zap className="h-4 w-4 ms-1" />
            {busy === "connect" ? "در حال اتصال…" : "اتصال"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={doSync}
            disabled={busy !== null || it.status === "error"}
          >
            <RefreshCw
              className={`h-4 w-4 ms-1 ${busy === "sync" ? "animate-spin" : ""}`}
            />
            {busy === "sync" ? "در حال همگام‌سازی…" : "همگام‌سازی"}
          </Button>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost">
              <Settings2 className="h-4 w-4 ms-1" />
              پیکربندی
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>پیکربندی {it.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {it.configFields.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs mb-1 block">{f.label}</Label>
                  <Input defaultValue={f.value ?? ""} readOnly={f.masked} />
                </div>
              ))}
              {it.events && it.events.length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-1">رویدادهای اخیر</div>
                  <div className="rounded-md border divide-y max-h-40 overflow-auto">
                    {it.events.map((e, i) => (
                      <div key={i} className="p-2 text-xs flex justify-between">
                        <span>{e.message}</span>
                        <span className="text-muted-foreground">{e.at}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              {it.status !== "disconnected" && (
                <Button variant="outline" onClick={doDisconnect}>
                  <Unplug className="h-4 w-4 ms-1" />
                  قطع اتصال
                </Button>
              )}
              <Button onClick={() => setOpen(false)}>بستن</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: Integration["status"] }) {
  if (status === "connected")
    return (
      <Badge className="bg-[color:var(--color-success)] text-[color:var(--color-success-foreground)] text-[10px]">
        فعال
      </Badge>
    );
  if (status === "syncing")
    return (
      <Badge className="bg-primary/15 text-primary text-[10px]">در حال همگام‌سازی</Badge>
    );
  if (status === "error")
    return <Badge className="bg-destructive text-destructive-foreground text-[10px]">خطا</Badge>;
  return (
    <Badge variant="outline" className="text-[10px]">
      قطع
    </Badge>
  );
}
