import type { DocumentStatus } from '@ccp/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<DocumentStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-blue-200 bg-blue-50 text-blue-700',
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
};

const STATUS_DOT: Record<DocumentStatus, string> = {
  pending: 'bg-amber-500',
  processing: 'bg-blue-500 animate-pulse',
  ready: 'bg-emerald-500',
  failed: 'bg-red-500',
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant="secondary" className={cn('gap-1.5 border capitalize', STATUS_STYLES[status])}>
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} aria-hidden />
      {status}
    </Badge>
  );
}
