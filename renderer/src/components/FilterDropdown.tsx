import { useState, useMemo } from 'react';
import { Check, ChevronDown, Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';
import { TruncatedLabel } from './TruncatedLabel';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  group?: string;
}

interface BaseProps {
  /** Button label shown when nothing is selected */
  label: string;
  options: FilterOption[];
  /** Show a search box inside the dropdown when there are many options */
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Dropdown alignment relative to trigger */
  align?: 'start' | 'end' | 'center';
  className?: string;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value?: string | null;
  onChange: (value: string | null) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value?: string[];
  onChange: (values: string[]) => void;
}

export type FilterDropdownProps = SingleProps | MultiProps;

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupOptions(options: FilterOption[]) {
  const groups = new Map<string, FilterOption[]>();
  const ungrouped: FilterOption[] = [];
  for (const opt of options) {
    if (opt.group) {
      const existing = groups.get(opt.group) ?? [];
      existing.push(opt);
      groups.set(opt.group, existing);
    } else {
      ungrouped.push(opt);
    }
  }
  return { groups, ungrouped };
}

// ── Trigger button ────────────────────────────────────────────────────────────

function TriggerButton({
  label,
  selectedLabel,
  selectedCount,
  isActive,
  disabled,
  loading,
}: {
  label: string;
  selectedLabel?: string;
  selectedCount?: number;
  isActive: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isActive
          ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-accent hover:text-foreground',
      )}
    >
      <SlidersHorizontal size={13} className="flex-shrink-0" />

      <TruncatedLabel
        className="max-w-[160px] font-medium"
        text={selectedLabel ?? label}
      />

      {selectedCount != null && selectedCount > 1 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {selectedCount}
        </span>
      )}

      <ChevronDown size={13} className="flex-shrink-0 opacity-60" />
    </button>
  );
}

// ── Search box ────────────────────────────────────────────────────────────────

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative px-1 pb-1">
      <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          'w-full rounded-md border border-border bg-muted/50 py-1.5 pl-7 pr-2 text-sm outline-none',
          'placeholder:text-muted-foreground focus:border-ring focus:bg-muted',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ── Option row (shared look) ──────────────────────────────────────────────────

function OptionContent({ option, selected }: { option: FilterOption; selected: boolean }) {
  return (
    <>
      {option.icon && (
        <span className={cn('flex-shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}>
          {option.icon}
        </span>
      )}
      <TruncatedLabel className="flex-1" text={option.label} />
      {option.description && (
        <span className="ml-auto flex-shrink-0 text-xs text-muted-foreground">{option.description}</span>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FilterDropdown(props: FilterDropdownProps) {
  const { label, options, searchable, searchPlaceholder, disabled, loading, align = 'start', className } = props;
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.description ?? '').toLowerCase().includes(q));
  }, [options, search]);

  const { groups, ungrouped } = useMemo(() => groupOptions(filtered), [filtered]);

  // ── Single select ──────────────────────────────────────────────────────────

  if (!props.multiple) {
    const { value, onChange } = props;
    const selected = options.find((o) => o.value === value);
    const isActive = Boolean(selected);

    const handleSelect = (v: string) => {
      onChange(v === value ? null : v);
      if (!searchable) setOpen(false);
    };

    const renderItems = (opts: FilterOption[]) =>
      opts.map((opt) => (
        <DropdownMenuRadioItem
          key={opt.value}
          value={opt.value}
          className={cn(
            'gap-2',
            opt.value === value && 'text-primary focus:text-primary',
          )}
          onSelect={(e) => { e.preventDefault(); handleSelect(opt.value); }}
        >
          <OptionContent option={opt} selected={opt.value === value} />
        </DropdownMenuRadioItem>
      ));

    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <span className={className}>
            <TriggerButton
              label={label}
              selectedLabel={selected?.label}
              isActive={isActive}
              disabled={disabled}
              loading={loading}
            />
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          className="min-w-[200px] max-w-[280px]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {searchable && (
            <SearchBox value={search} onChange={setSearch} placeholder={searchPlaceholder} />
          )}

          <DropdownMenuRadioGroup value={value ?? ''}>
            {/* Clear option */}
            {isActive && (
              <>
                <DropdownMenuRadioItem
                  value=""
                  className="text-muted-foreground italic"
                  onSelect={(e) => { e.preventDefault(); onChange(null); setOpen(false); }}
                >
                  <X size={13} className="flex-shrink-0" />
                  All {label}
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Grouped options */}
            {Array.from(groups.entries()).map(([groupName, opts]) => (
              <div key={groupName}>
                <DropdownMenuLabel>{groupName}</DropdownMenuLabel>
                {renderItems(opts)}
              </div>
            ))}

            {/* Ungrouped options */}
            {ungrouped.length > 0 && (
              <>
                {groups.size > 0 && ungrouped.length > 0 && <DropdownMenuSeparator />}
                {renderItems(ungrouped)}
              </>
            )}

            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">No options found</p>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ── Multi select ───────────────────────────────────────────────────────────

  const { value: values = [], onChange } = props;
  const isActive = values.length > 0;
  const firstLabel = isActive ? options.find((o) => o.value === values[0])?.label : undefined;

  const toggle = (v: string) => {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  };

  const renderCheckboxItems = (opts: FilterOption[]) =>
    opts.map((opt) => {
      const checked = values.includes(opt.value);
      return (
        <DropdownMenuCheckboxItem
          key={opt.value}
          checked={checked}
          onCheckedChange={() => toggle(opt.value)}
          onSelect={(e) => e.preventDefault()}
          className={cn('gap-2', checked && 'text-primary focus:text-primary')}
        >
          <OptionContent option={opt} selected={checked} />
        </DropdownMenuCheckboxItem>
      );
    });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <span className={className}>
          <TriggerButton
            label={label}
            selectedLabel={firstLabel}
            selectedCount={values.length}
            isActive={isActive}
            disabled={disabled}
            loading={loading}
          />
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className="min-w-[200px] max-w-[280px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {searchable && (
          <SearchBox value={search} onChange={setSearch} placeholder={searchPlaceholder} />
        )}

        {/* Header with count + clear */}
        {isActive && (
          <>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground">{values.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={11} />
                Clear
              </button>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Grouped options */}
        {Array.from(groups.entries()).map(([groupName, opts]) => (
          <div key={groupName}>
            <DropdownMenuLabel>{groupName}</DropdownMenuLabel>
            {renderCheckboxItems(opts)}
          </div>
        ))}

        {/* Ungrouped options */}
        {ungrouped.length > 0 && (
          <>
            {groups.size > 0 && <DropdownMenuSeparator />}
            {renderCheckboxItems(ungrouped)}
          </>
        )}

        {/* Select all */}
        {filtered.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() =>
                values.length === options.length
                  ? onChange([])
                  : onChange(options.map((o) => o.value))
              }
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Check size={13} />
              {values.length === options.length ? 'Deselect all' : 'Select all'}
            </button>
          </>
        )}

        {filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No options found</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
