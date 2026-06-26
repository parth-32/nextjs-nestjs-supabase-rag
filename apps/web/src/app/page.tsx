'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Scale } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useDocuments } from '@/hooks/use-api';
import { PdfUpload } from '@/components/PdfUpload';
import { DocumentList } from '@/components/DocumentList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const router = useRouter();
  const { session, loading, signOut } = useAuth();
  const { data: documents, isLoading, refetch, isRefetching } = useDocuments(!!session);

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

  const email = session.user.email ?? '';
  const readyCount = documents?.filter((d) => d.status === 'ready').length ?? 0;

  return (
    <main className="min-h-screen">
      <header className="border-border/60 bg-card/70 sticky top-0 z-10 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
              <Scale className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Compliance Copilot</h1>
              <p className="text-muted-foreground truncate text-sm">{email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <section>
          <Card className="overflow-hidden border-0 shadow-md ring-1 ring-black/5">
            <CardHeader className="border-border/60 border-b bg-linear-to-br from-white to-slate-50/80 pb-5">
              <CardTitle className="text-base">Upload a document</CardTitle>
              <CardDescription>
                Drop a compliance PDF to extract obligations, risks, and chat with the content.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <PdfUpload />
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Your documents</h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {documents?.length
                  ? `${documents.length} total${readyCount ? ` · ${readyCount} ready` : ''}`
                  : 'Upload your first PDF to get started'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={isRefetching ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-18 w-full rounded-xl" />
              <Skeleton className="h-18 w-full rounded-xl" />
              <Skeleton className="h-18 w-full rounded-xl" />
            </div>
          ) : (
            <DocumentList documents={documents ?? []} />
          )}
        </section>
      </div>
    </main>
  );
}
