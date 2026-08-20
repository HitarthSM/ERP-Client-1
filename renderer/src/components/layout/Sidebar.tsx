import { useState, Fragment } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { MODULES } from '../../config/modules';
import { cn } from '../../lib/utils';
import { Tooltip } from '../ui/tooltip';
import { usePageAccess } from '../../context/PageAccessContext';

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const { canAccess, isLoading } = usePageAccess();

  const visibleModules = MODULES.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(item.key)),
  })).filter((group) => group.items.length > 0);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = MODULES.find((g) => g.items.some((i) => i.path === location.pathname));
    return new Set(active ? [active.label] : MODULES.map((g) => g.label));
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  return (
    <aside className={cn("bg-card border-r border-border transition-all duration-300 flex flex-col h-full", collapsed ? 'w-16' : 'w-64')}>
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">E</div>
          {!collapsed && <span className="font-bold text-lg text-primary whitespace-nowrap overflow-hidden truncate">ERP System</span>}
        </div>
        {!collapsed && (
          <button onClick={onToggle} aria-label="Collapse sidebar" className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground flex-shrink-0">
            <ChevronLeft size={20} />
          </button>
        )}
      </div>
      {collapsed && (
        <button onClick={onToggle} aria-label="Expand sidebar" className="mx-auto mt-2 p-1 rounded-md hover:bg-accent hover:text-accent-foreground">
          <ChevronRight size={20} />
        </button>
      )}
      <div className="flex-1 overflow-y-auto py-3 space-y-1 custom-scrollbar">
        {isLoading ? (
          <div className="px-3 space-y-4 animate-pulse">
            {[5, 3, 4, 2].map((count, gi) => (
              <div key={gi} className="space-y-1">
                {!collapsed && <div className="h-3 w-20 rounded bg-muted mb-2" />}
                {Array.from({ length: count }).map((_, ii) => (
                  <div key={ii} className={cn('h-9 rounded-md bg-muted/60', collapsed ? 'w-10 mx-auto' : 'w-full')} />
                ))}
              </div>
            ))}
          </div>
        ) : visibleModules.map((group) => {
          const isOpen = openGroups.has(group.label);
          const isGroupActive = group.items.some((i) => !i.disabled && i.path === location.pathname);
          const GroupIcon = group.icon;

          return (
            <div key={group.label} className="px-3">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors",
                    isGroupActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon size={14} />
                    {group.label}
                  </span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              {(collapsed || isOpen) && (
                <nav className="space-y-1 mt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    if (item.disabled) {
                      const disabledItem = (
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground/40 cursor-not-allowed",
                            collapsed && "justify-center px-0 w-full"
                          )}
                          title={collapsed ? undefined : 'Coming soon'}
                        >
                          <Icon size={18} />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </div>
                      );
                      return collapsed ? (
                        <Tooltip
                          key={item.key}
                          content={`${item.title} (coming soon)`}
                          side="right"
                          className="flex w-full"
                        >
                          {disabledItem}
                        </Tooltip>
                      ) : (
                        <Fragment key={item.key}>{disabledItem}</Fragment>
                      );
                    }

                    const link = (
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                            isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            collapsed && "justify-center px-0 w-full"
                          )
                        }
                      >
                        <Icon size={18} />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    );

                    return collapsed ? (
                      <Tooltip key={item.key} content={item.title} side="right" className="flex w-full">
                        {link}
                      </Tooltip>
                    ) : (
                      <Fragment key={item.key}>{link}</Fragment>
                    );
                  })}
                </nav>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
