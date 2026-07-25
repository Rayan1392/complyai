import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { phase4, services } from "@/services";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssistantThread } from "@/types/domain";
import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, Send, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/assistant/")({
  head: () => ({
    meta: [
      { title: "دستیار حسابرسی — دیدبان حسابرسی" },
      {
        name: "description",
        content: "پرسش‌وپاسخ هوشمند دربارهٔ ریسک اسناد، شواهد و کنترل‌های قانونی.",
      },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const qc = useQueryClient();
  const { data: threads = [] } = useQuery({
    queryKey: ["assistant-threads"],
    queryFn: () => phase4.assistantThreads.listThreads(),
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => services.documents.list(),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [scopeDoc, setScopeDoc] = useState<string>("d-flower-1405");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id);
  }, [activeId, threads]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active?.messages.length]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["assistant-threads"] });

  const createThread = async (title?: string) => {
    const t = await phase4.assistantThreads.createThread(
      title ?? "گفت‌وگوی جدید",
      scopeDoc,
    );
    setActiveId(t.id);
    invalidate();
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    let threadId = activeId;
    if (!threadId) {
      const t = await phase4.assistantThreads.createThread(
        q.slice(0, 40),
        scopeDoc,
      );
      threadId = t.id;
      setActiveId(threadId);
    }
    setInput("");
    setSending(true);
    try {
      await phase4.assistantThreads.ask(threadId!, q);
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    await phase4.assistantThreads.removeThread(id);
    if (activeId === id) setActiveId(null);
    invalidate();
  };

  const suggestions = [
    "چرا سند خرید گل پرریسک ارزیابی شده است؟",
    "کدام کنترل‌های قانونی نقض شده‌اند؟",
    "چه مدارک پشتیبانی مفقود است؟",
    "قیمت خرید با بازار چگونه مقایسه می‌شود؟",
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background">
      {/* Threads sidebar */}
      <aside className="w-72 border-l bg-muted/20 flex flex-col shrink-0">
        <div className="p-3 border-b space-y-2">
          <Button onClick={() => createThread()} className="w-full" size="sm">
            <MessageSquarePlus className="h-4 w-4 ms-1" />
            گفت‌وگوی جدید
          </Button>
          <div>
            <label className="text-[11px] text-muted-foreground">دامنهٔ سند</label>
            <Select value={scopeDoc} onValueChange={setScopeDoc}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {docs.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.number} — {d.title.slice(0, 24)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {threads.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              گفت‌وگویی وجود ندارد.
            </div>
          )}
          {threads.map((t) => (
            <ThreadRow
              key={t.id}
              t={t}
              active={t.id === activeId}
              onSelect={() => setActiveId(t.id)}
              onDelete={() => remove(t.id)}
            />
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b p-3 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">دستیار حسابرسی هوشمند</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {active
                ? `${active.title} — ${active.createdAt}`
                : "برای شروع، گفت‌وگوی جدید ایجاد کنید یا سؤال بپرسید."}
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
          {!active ? (
            <div className="max-w-2xl mx-auto text-center space-y-4 mt-8">
              <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  چطور می‌توانم کمک کنم؟
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  دربارهٔ ریسک اسناد، شواهد، کنترل‌های قانونی و ارجاع به پایگاه
                  دانش سؤال بپرسید.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-start">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-md border p-3 text-sm hover:border-primary/40 hover:bg-accent/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            active.messages.map((m) => (
              <div key={m.id} className="flex gap-2">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-md shrink-0 ${
                    m.role === "assistant"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <Card className="p-3 flex-1 max-w-3xl">
                  <div className="text-sm leading-7 whitespace-pre-wrap">
                    {m.text}
                  </div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        منابع پایگاه دانش:
                      </div>
                      {m.citations.map((c) => (
                        <div
                          key={c.id}
                          className="text-[11px] text-muted-foreground flex gap-2"
                        >
                          <Badge variant="outline" className="text-[10px]">
                            {c.sourceTitle}
                          </Badge>
                          <span>
                            مادهٔ {c.articleNumber ?? "—"} — صفحهٔ{" "}
                            {c.pageNumber ?? "—"} — نسخه {c.versionLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-2 text-end">
                    {m.createdAt}
                  </div>
                </Card>
              </div>
            ))
          )}
          {sending && (
            <div className="text-xs text-muted-foreground animate-pulse ms-10">
              دستیار در حال تحلیل…
            </div>
          )}
        </div>

        <div className="border-t p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 max-w-4xl mx-auto"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="سؤال حسابرسی خود را بپرسید…"
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !input.trim()}>
              <Send className="h-4 w-4 ms-1" />
              ارسال
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ThreadRow({
  t,
  active,
  onSelect,
  onDelete,
}: {
  t: AssistantThread;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-md px-2 py-2 text-xs cursor-pointer ${
        active ? "bg-accent" : "hover:bg-accent/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{t.title}</div>
        <div className="text-[10px] text-muted-foreground">
          {t.messages.length} پیام — {t.createdAt}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        aria-label="حذف"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
