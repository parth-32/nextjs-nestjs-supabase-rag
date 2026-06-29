'use client';

import Link from 'next/link';
import { AlertCircle, ChevronRight, FileText } from 'lucide-react';
import type { DocumentSummaryDto } from '@ccp/shared';
import { DOCUMENT_STATUS } from '@ccp/shared';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { DOCUMENT_LIST_STATUS } from '@/constants';
import { cn } from '@/lib/utils';

function formatUploadedAt(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function DocumentList({ documents }: { documents: DocumentSummaryDto[] }) {
  if (documents.length === 0) {
    return (
      <Card className="items-center border-dashed py-14 text-center shadow-sm">
        <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-full">
          <FileText className="text-muted-foreground size-5" />
        </div>
        <p className="font-medium">No documents yet</p>
        <p className="text-muted-foreground mt-1 max-w-xs text-sm">
          Upload a compliance PDF above to analyze obligations and start chatting.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const interactive = doc.status === DOCUMENT_STATUS.READY;
        const inner = (
          <Card
            className={cn(
              'group flex-row items-center gap-4 border-l-4 py-4 shadow-sm transition-all',
              DOCUMENT_LIST_STATUS.accent[doc.status],
              interactive
                ? 'hover:border-ring hover:shadow-md cursor-pointer hover:-translate-y-px'
                : 'opacity-95',
            )}
          >
            <div
              className={cn(
                'ml-2 flex size-10 shrink-0 items-center justify-center rounded-lg',
                DOCUMENT_LIST_STATUS.iconBg[doc.status],
              )}
            >
              <FileText className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{doc.filename}</p>
              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                {doc.pageCount != null && <span>{doc.pageCount} pages</span>}
                {doc.pageCount != null && <span aria-hidden>·</span>}
                <span>{formatUploadedAt(doc.createdAt)}</span>
              </div>
              {doc.status === DOCUMENT_STATUS.FAILED && doc.error && (
                <div className="bg-destructive/5 text-destructive mt-2 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{doc.error}</span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 pr-2">
              <StatusBadge status={doc.status} />
              {interactive && (
                <ChevronRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </div>
          </Card>
        );

        return interactive ? (
          <Link key={doc.id} href={`/documents/${doc.id}`} className="block">
            {inner}
          </Link>
        ) : (
          <div key={doc.id}>{inner}</div>
        );
      })}
    </div>
  );
}
