'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileText, MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useDocument } from '@/hooks/use-api';
import { ChatPanel } from '@/components/ChatPanel';
import { SummaryView } from '@/components/SummaryView';
import { StatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type WorkspaceTab = 'chat' | 'summary';

export default function DocumentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading } = useAuth();
  const { data: doc, error } = useDocument(id, !!session && !!id);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner className="text-primary size-6" />
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="border-border/60 bg-card/70 sticky top-0 z-10 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">All documents</span>
            </Link>
            <div className="bg-border/80 hidden h-5 w-px sm:block" aria-hidden />
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                  {doc?.filename ?? 'Document'}
                </h1>
                {doc?.pageCount != null && (
                  <p className="text-muted-foreground text-xs">{doc.pageCount} pages</p>
                )}
              </div>
            </div>
          </div>
          {doc && <StatusBadge status={doc.status} />}
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5">
        {error && (
          <p className="text-destructive mb-4 text-sm">
            {error instanceof Error ? error.message : 'Failed to load document'}
          </p>
        )}

        {doc && doc.status !== 'ready' ? (
          <Card className="flex flex-1 flex-col items-center justify-center border-dashed py-16 text-center shadow-sm">
            <div className="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-2xl">
              <Spinner className="size-6" />
            </div>
            <p className="font-medium">Processing your document</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Status: <span className="capitalize">{doc.status}</span>. Chat and summary will unlock
              when indexing completes.
            </p>
          </Card>
        ) : doc ? (
          <>
            <div className="bg-muted/60 mb-4 flex gap-1 rounded-xl p-1 lg:hidden">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  activeTab === 'chat'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <MessageSquare className="size-4" />
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  activeTab === 'summary'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <ClipboardList className="size-4" />
                Summary
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
              <ChatPanel
                documentId={id}
                className={cn('min-h-0', activeTab !== 'chat' && 'hidden lg:flex')}
              />
              <SummaryView
                documentId={id}
                className={cn('min-h-0', activeTab !== 'summary' && 'hidden lg:flex')}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
