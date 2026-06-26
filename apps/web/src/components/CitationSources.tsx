'use client';

import { useState } from 'react';
import { FileText, X } from 'lucide-react';
import type { Citation } from '@ccp/shared';
import { cn } from '@/lib/utils';

function groupByPage(citations: Citation[]) {
  const map = new Map<number, Citation[]>();
  for (const c of citations) {
    const list = map.get(c.page) ?? [];
    list.push(c);
    map.set(c.page, list);
  }
  return [...map.entries()].sort(([a], [b]) => a - b);
}

export function CitationSources({ citations }: { citations: Citation[] }) {
  const [activePage, setActivePage] = useState<number | null>(null);
  const grouped = groupByPage(citations);

  if (grouped.length === 0) return null;

  const activeCitations =
    activePage != null ? (grouped.find(([page]) => page === activePage)?.[1] ?? []) : [];

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-[11px] font-medium">Sources</span>
        {grouped.map(([page]) => {
          const isActive = activePage === page;
          return (
            <button
              key={page}
              type="button"
              aria-expanded={isActive}
              aria-label={`View excerpt from page ${page}`}
              onClick={() => setActivePage(isActive ? null : page)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                isActive
                  ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100',
              )}
            >
              <FileText className="size-3 shrink-0" />
              Page {page}
            </button>
          );
        })}
      </div>

      {activePage != null && activeCitations.length > 0 && (
        <div
          className="border-border/70 bg-card mt-2 rounded-lg border p-3 shadow-sm"
          role="region"
          aria-label={`Excerpt from page ${activePage}`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-[11px] font-medium">
              Excerpt from page {activePage}
            </p>
            <button
              type="button"
              onClick={() => setActivePage(null)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-0.5 transition-colors"
              aria-label="Close excerpt"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {activeCitations.map((c) => (
              <blockquote
                key={c.chunkId}
                className="border-emerald-200/80 bg-emerald-50/50 text-foreground border-l-2 py-1 pl-2.5 text-xs leading-relaxed"
              >
                {c.snippet}
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
