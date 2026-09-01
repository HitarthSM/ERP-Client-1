import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { TruncatedLabel } from './TruncatedLabel';

export interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function FormSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  loading,
  className,
}: FormSelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || loading}
          className={cn(
            'flex w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <TruncatedLabel
            className="min-w-0 flex-1 text-left"
            text={loading ? 'Loading…' : (selected?.label ?? placeholder)}
          />
          <ChevronDown size={14} className="ml-2 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto"
        onCloseAutoFocus={(ev) => ev.preventDefault()}
      >
        {options.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No options available</p>
        )}
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => { onChange(opt.value); setOpen(false); }}
            className={cn('gap-2 cursor-pointer min-w-0', opt.value === value && 'text-primary focus:text-primary')}
          >
            <TruncatedLabel className="flex-1" text={opt.label} />
            {opt.value === value && <Check size={13} className="shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
