import { cn } from '../lib/utils';

const ROLE_COLORS: Record<string, string> = {
  super_admin:   'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  org_admin:     'bg-blue-500/10   text-blue-600   dark:text-blue-400',
  store_manager: 'bg-sky-500/10    text-sky-600    dark:text-sky-400',
  org_manager:   'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  store_staff:   'bg-teal-500/10   text-teal-600   dark:text-teal-400',
  admin:         'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  manager:       'bg-blue-500/10   text-blue-600   dark:text-blue-400',
  viewer:        'bg-sky-500/10    text-sky-600    dark:text-sky-400',
};

function roleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] ?? 'bg-muted text-muted-foreground';
}

interface Props {
  roles: string[];
  max?: number;
}

export function UserRolePills({ roles, max = 3 }: Props) {
  if (!roles.length) {
    return <span className="text-xs text-muted-foreground">No roles</span>;
  }
  const visible  = roles.slice(0, max);
  const overflow = roles.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((r) => (
        <span
          key={r}
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
            roleColor(r),
          )}
        >
          {r.replace(/_/g, ' ')}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}
