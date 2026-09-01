import { cn } from '../lib/utils';

export function TruncatedLabel({
  text,
  className,
  as: Tag = 'span',
}: {
  text: string;
  className?: string;
  as?: 'span' | 'p';
}): React.JSX.Element {
  return (
    <Tag className={cn('truncate', className)} title={text}>
      {text}
    </Tag>
  );
}
