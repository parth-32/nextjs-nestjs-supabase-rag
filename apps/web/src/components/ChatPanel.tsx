'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, MessageSquare, Send, Sparkles, User } from 'lucide-react';
import type { Citation } from '@ccp/shared';
import { api } from '@/lib/api';
import { useMessages } from '@/hooks/use-api';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CitationSources } from '@/components/CitationSources';
import { cn } from '@/lib/utils';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
}

const SUGGESTED_QUESTIONS = [
  'What are the key obligations?',
  'What risks should I watch for?',
  'Are there any gaps or missing info?',
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5" aria-label="Assistant is typing">
      <span className="typing-dot bg-muted-foreground/50 size-1.5 rounded-full" />
      <span className="typing-dot bg-muted-foreground/50 size-1.5 rounded-full" />
      <span className="typing-dot bg-muted-foreground/50 size-1.5 rounded-full" />
    </div>
  );
}

export function ChatPanel({ documentId, className }: { documentId: string; className?: string }) {
  const qc = useQueryClient();
  const { data: history = [] } = useMessages(documentId, true);
  const [pending, setPending] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, watch } = useForm<{ question: string }>({
    defaultValues: { question: '' },
  });
  const question = watch('question');
  const { ref: registerRef, ...questionField } = register('question');

  const messages: UiMessage[] = [
    ...history.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: m.citations,
    })),
    ...pending,
  ];

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  const submitQuestion = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || streaming) return;
    reset({ question: '' });
    setError(null);
    setStreaming(true);

    const assistantId = `tmp-${Date.now()}`;
    setPending([
      { id: `u-${Date.now()}`, role: 'user', content: trimmed, citations: [] },
      { id: assistantId, role: 'assistant', content: '', citations: [] },
    ]);

    const patch = (p: Partial<UiMessage>) =>
      setPending((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ...p } : m)));

    try {
      let answer = '';
      await api.streamChat(documentId, trimmed, (event) => {
        if (event.type === 'token') {
          answer += event.value;
          patch({ content: answer });
          const el = messagesRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        } else if (event.type === 'citations') {
          patch({ citations: event.value });
        } else if (event.type === 'error') {
          setError(event.message);
        }
      });
      await qc.invalidateQueries({ queryKey: ['messages', documentId] });
      setPending([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setStreaming(false);
    }
  };

  const onSubmit = handleSubmit(({ question }) => submitQuestion(question));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void onSubmit();
    }
  };

  return (
    <Card
      className={cn('flex h-full min-h-0 flex-col gap-0 overflow-hidden py-0 shadow-sm', className)}
    >
      <CardHeader className="border-border/60 shrink-0 border-b bg-linear-to-r from-white to-slate-50/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
            <MessageSquare className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">Chat</CardTitle>
            <CardDescription className="text-xs">
              Answers are grounded in this document only.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <div
        ref={messagesRef}
        className="panel-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
      >
        {messages.length === 0 && (
          <div className="flex min-h-full flex-col items-center justify-center px-2 py-8 text-center">
            <div className="bg-primary/8 text-primary mb-3 flex size-12 items-center justify-center rounded-2xl">
              <Sparkles className="size-5" />
            </div>
            <p className="text-foreground text-sm font-medium">Ask anything about this document</p>
            <p className="text-muted-foreground mt-1 max-w-xs text-xs">
              Get answers with page citations from your uploaded PDF.
            </p>
            <div className="mt-5 flex w-full max-w-sm flex-col gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={streaming}
                  onClick={() => void submitQuestion(q)}
                  className="border-border/80 bg-card hover:border-primary/30 hover:bg-primary/5 text-foreground rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'message-in flex gap-2',
              m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            <div
              className={cn(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {m.role === 'user' ? <User className="size-3" /> : <Bot className="size-3" />}
            </div>

            <div className={cn('min-w-0 max-w-[88%]')}>
              <div
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap'
                    : 'bg-muted/70 text-foreground rounded-tl-sm',
                )}
              >
                {m.role === 'assistant' ? (
                  m.content ? (
                    <MarkdownContent content={m.content} />
                  ) : streaming ? (
                    <TypingIndicator />
                  ) : null
                ) : (
                  m.content
                )}
              </div>

              {m.citations.length > 0 && <CitationSources citations={m.citations} />}
            </div>
          </div>
        ))}
      </div>

      <div className="border-border/60 bg-card shrink-0 border-t shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.06)]">
        {error && (
          <div className="bg-destructive/8 text-destructive border-destructive/15 border-b px-4 py-2 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Ask about obligations, risks, deadlines..."
              autoComplete="off"
              rows={1}
              className="max-h-28 min-h-9 resize-none rounded-xl py-2 text-sm"
              disabled={streaming}
              onKeyDown={handleKeyDown}
              {...questionField}
              ref={registerRef}
            />
            <Button
              type="submit"
              size="icon"
              className="size-9 shrink-0 rounded-xl"
              disabled={streaming || !question?.trim()}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
