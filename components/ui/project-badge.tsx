import { cn } from '@/lib/utils';

import Link from 'next/link';

interface ProjectBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  href?: string;
  onClick?: () => void;
}

export function ProjectBadge({
  name,
  color,
  size = 'md',
  className,
  href,
  onClick,
}: ProjectBadgeProps) {
  const clickable = Boolean(href || onClick);

  const badgeClassName = cn(
    'inline-flex items-center gap-2 rounded-full px-3 py-1',
    'bg-gray-900/50 border border-gray-700',
    clickable && 'cursor-pointer transition-colors hover:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-blue-600/40',
    size === 'sm' && 'px-2 py-0.5 text-xs',
    size === 'md' && 'px-3 py-1 text-sm',
    size === 'lg' && 'px-4 py-2 text-base',
    className,
  );

  const content = (
    <>
      <div
        className={cn(
          'rounded-full',
          size === 'sm' && 'w-2 h-2',
          size === 'md' && 'w-3 h-3',
          size === 'lg' && 'w-4 h-4',
        )}
        style={{ backgroundColor: color }}
      />
      <span className="font-medium text-white truncate">
        {name.length > 40 ? `${name.substring(0, 30)}...` : name}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={badgeClassName}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={badgeClassName}>
        {content}
      </button>
    );
  }

  return <div className={badgeClassName}>{content}</div>;
}
