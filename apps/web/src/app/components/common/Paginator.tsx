import { cn } from '@/lib/utils/cn.util';
import { Link } from '../ui/Link';

const SIBLINGS = 2;
const BOUNDARY_THRESHOLD = SIBLINGS + 3;

export function Paginator(props: {
  total: number;
  current: number;
  getHref: (page: number) => string;
  className?: string;
}) {
  const { current, total, getHref, className } = props;
  if (total === 1) return null;

  const renderPageLink = (page: number) => {
    const isActive = page === current;
    return (
      <Link
        key={page}
        href={getHref(page)}
        variant={isActive ? 'default' : 'muted'}
        underline={isActive ? 'always' : 'none'}
      >
        {page}
      </Link>
    );
  };
  const center: React.ReactNode[] = [];

  if (total <= 10) {
    for (let i = 1; i <= total; i++) {
      center.push(renderPageLink(i));
    }
    return buildPaginator({ center });
  }

  const start = current > BOUNDARY_THRESHOLD ? renderPageLink(1) : null;
  const end = current < total - BOUNDARY_THRESHOLD ? renderPageLink(total) : null;
  const initialCentralItem = start ? current - SIBLINGS : 1;
  const lastCentralItem = end ? current + SIBLINGS : total;
  for (let i = initialCentralItem; i <= lastCentralItem; i++) {
    center.push(renderPageLink(i));
  }

  return buildPaginator({ center, start, end, className });
}

function buildPaginator(params: {
  center: React.ReactNode[];
  start?: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
}) {
  const { center, end, start, className } = params;
  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {start && <>{start}...</>}
      {center}
      {end && <>...{end}</>}
    </div>
  );
}
