import type { DocumentStatus, SummarySectionKey } from '@ccp/shared';

export const DOCUMENT_STATUS_BADGE = {
  styles: {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    processing: 'border-blue-200 bg-blue-50 text-blue-700',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    failed: 'border-red-200 bg-red-50 text-red-700',
  },
  dot: {
    pending: 'bg-amber-500',
    processing: 'bg-blue-500 animate-pulse',
    ready: 'bg-emerald-500',
    failed: 'bg-red-500',
  },
} as const satisfies Record<string, Record<DocumentStatus, string>>;

export const DOCUMENT_LIST_STATUS = {
  accent: {
    pending: 'border-l-amber-400',
    processing: 'border-l-blue-500',
    ready: 'border-l-emerald-500',
    failed: 'border-l-red-500',
  },
  iconBg: {
    pending: 'bg-amber-50 text-amber-600',
    processing: 'bg-blue-50 text-blue-600',
    ready: 'bg-emerald-50 text-emerald-600',
    failed: 'bg-red-50 text-red-600',
  },
} as const satisfies Record<string, Record<DocumentStatus, string>>;

export const SUMMARY_COLLAPSED_COUNT = 8;

export const SUMMARY_SECTION_LABELS: Record<SummarySectionKey, string> = {
  obligations: 'Key Obligations',
  risks: 'Potential Risks',
  gaps: 'Gaps / Missing Info',
  recommendedActions: 'Recommended Actions',
};

export const SUMMARY_SECTION_ACCENTS: Record<SummarySectionKey, string> = {
  obligations: 'text-slate-700',
  risks: 'text-red-700',
  gaps: 'text-amber-700',
  recommendedActions: 'text-emerald-700',
};

export const SUMMARY_SECTION_MARKERS: Record<SummarySectionKey, string> = {
  obligations: 'bg-slate-400',
  risks: 'bg-red-400',
  gaps: 'bg-amber-400',
  recommendedActions: 'bg-emerald-400',
};
