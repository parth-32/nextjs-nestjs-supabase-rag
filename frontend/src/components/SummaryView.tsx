'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  RefreshCw,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { SummaryItem } from '@ccp/shared';
import { SUMMARY_SECTION_KEYS } from '@ccp/shared';
import { useGenerateSummary, useSummary } from '@/hooks/use-api';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SUMMARY_COLLAPSED_COUNT,
  SUMMARY_SECTION_ACCENTS,
  SUMMARY_SECTION_LABELS,
  SUMMARY_SECTION_MARKERS,
} from '@/constants';
import { cn } from '@/lib/utils';

const SECTION_ICONS = {
  obligations: Shield,
  risks: AlertTriangle,
  gaps: HelpCircle,
  recommendedActions: CheckCircle2,
} as const;

const SECTIONS = SUMMARY_SECTION_KEYS.map((key) => ({
  key,
  title: SUMMARY_SECTION_LABELS[key],
  icon: SECTION_ICONS[key],
  accent: SUMMARY_SECTION_ACCENTS[key],
  marker: SUMMARY_SECTION_MARKERS[key],
}));

function formatPages(pages: number[]) {
  if (pages.length === 0) return null;
  if (pages.length === 1) return `p. ${pages[0]}`;
  return `pp. ${pages.join(', ')}`;
}

export function SummaryView({ documentId, className }: { documentId: string; className?: string }) {
  const { data: summary, isLoading, error } = useSummary(documentId, true);
  const generate = useGenerateSummary(documentId);

  const totalItems = summary
    ? SECTIONS.reduce((n, { key }) => n + (summary[key] as SummaryItem[]).length, 0)
    : 0;

  return (
    <Card
      className={cn('flex h-full min-h-0 flex-col gap-0 overflow-hidden py-0 shadow-sm', className)}
    >
      <CardHeader className="border-border/60 flex shrink-0 flex-row items-center justify-between gap-3 border-b bg-linear-to-r from-white to-slate-50/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-700 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <ClipboardList className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-sm font-semibold">Compliance Summary</CardTitle>
            <CardDescription className="text-xs">
              {summary
                ? `${totalItems} finding${totalItems === 1 ? '' : 's'} · ${SECTIONS.length} categories`
                : 'Structured analysis of the document.'}
            </CardDescription>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
        >
          {generate.isPending ? <Spinner /> : <RefreshCw className="size-3.5" />}
          {summary ? 'Regenerate' : 'Generate'}
        </Button>
      </CardHeader>

      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
        {isLoading ? (
          <div className="space-y-5">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">
            {error instanceof Error ? error.message : 'Failed to load summary'}
          </p>
        ) : generate.isError ? (
          <p className="text-destructive text-sm">
            {generate.error instanceof Error ? generate.error.message : 'Failed to generate'}
          </p>
        ) : !summary ? (
          <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
            <div className="bg-emerald-500/8 text-emerald-700 mb-3 flex size-12 items-center justify-center rounded-2xl">
              <Sparkles className="size-5" />
            </div>
            <p className="text-foreground text-sm font-medium">No summary yet</p>
            <p className="text-muted-foreground mt-1 max-w-xs text-xs">
              Generate a structured breakdown of obligations, risks, gaps, and actions.
            </p>
            <Button
              size="sm"
              className="mt-5"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {generate.isPending ? <Spinner /> : <Sparkles className="size-4" />}
              Generate summary
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {SECTIONS.map(({ key, ...section }) => (
              <Section key={key} {...section} items={summary[key] as SummaryItem[]} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  accent,
  marker,
  items,
}: {
  title: string;
  icon: typeof Shield;
  accent: string;
  marker: string;
  items: SummaryItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > SUMMARY_COLLAPSED_COUNT;
  const visibleItems = expanded || !hasMore ? items : items.slice(0, SUMMARY_COLLAPSED_COUNT);

  if (items.length === 0) {
    return (
      <section>
        <SectionHeader title={title} icon={Icon} accent={accent} count={0} />
        <p className="text-muted-foreground border-border/60 rounded-lg border border-dashed px-3 py-2.5 text-xs">
          None identified.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title={title} icon={Icon} accent={accent} count={items.length} />

      <ol className="border-border/70 divide-border/70 overflow-hidden rounded-lg border bg-white/60 divide-y">
        {visibleItems.map((item, i) => (
          <li
            key={i}
            className="hover:bg-muted/30 flex gap-2.5 px-3 py-2.5 text-[13px] leading-snug transition-colors"
          >
            <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', marker)} aria-hidden />
            <div className="min-w-0 flex-1">
              <span className="text-foreground">{item.text}</span>
              {item.pages?.length > 0 && (
                <span className="text-muted-foreground ml-1.5 whitespace-nowrap text-[11px]">
                  ({formatPages(item.pages)})
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-1.5 h-8 w-full text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show ${items.length - SUMMARY_COLLAPSED_COUNT} more`}
        </Button>
      )}
    </section>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  accent,
  count,
}: {
  title: string;
  icon: typeof Shield;
  accent: string;
  count: number;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className={cn('size-3.5', accent)} />
      <h3 className={cn('text-xs font-semibold tracking-wide uppercase', accent)}>{title}</h3>
      <span className="text-muted-foreground ml-auto text-[11px] tabular-nums">{count}</span>
    </div>
  );
}
