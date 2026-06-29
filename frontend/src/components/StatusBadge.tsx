import type { DocumentStatus } from '@ccp/shared';
import { Badge } from '@/components/ui/badge';
import { DOCUMENT_STATUS_BADGE } from '@/constants';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn('gap-1.5 border capitalize', DOCUMENT_STATUS_BADGE.styles[status])}
    >
      <span
        className={cn('size-1.5 rounded-full', DOCUMENT_STATUS_BADGE.dot[status])}
        aria-hidden
      />
      {status}
    </Badge>
  );
}
