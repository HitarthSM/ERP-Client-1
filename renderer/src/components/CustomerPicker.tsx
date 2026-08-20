import { useRef, useState } from "react";
import { User, X } from "lucide-react";
import { Customers } from "../api";
import { useDebounce } from "../hooks/useDebounce";
import { formatEntityLabel } from "../lib/entityLabel";
import type { Customer, CustomerType, SaleType } from "../types";
import { CustomerFormDrawer } from "./CustomerFormDrawer";

export interface CustomerPickerProps {
  /** Currently selected customer id (empty = none). */
  customerId: string;
  /** Called when user selects a customer from search or creates one. */
  onSelect: (customer: Customer) => void;
  /** Called when user clears the selection. */
  onClear: () => void;
  /** Placeholder text inside the search input. */
  placeholder?: string;
  /** When true, restricts search to customers with a credit limit. */
  creditOnly?: boolean;
  /** Show inline "+ Create customer" when no match. Default true. */
  allowCreate?: boolean;
  /** Size variant. Default "md". */
  size?: "sm" | "md";
  /** Extra class on outermost wrapper. */
  className?: string;
  /** If provided, shown as a chip next to the linked customer label. */
  customerType?: CustomerType | string;
  /** Pre-filled search text (controlled externally). If omitted, component manages its own text. */
  value?: string;
  /** Called when the search text changes. Only needed for controlled mode. */
  onChange?: (v: string) => void;
  /** Initial name when creating a new customer. */
  initialCreateName?: string;
  /** Disable the input. */
  disabled?: boolean;
}

/**
 * Reusable customer search + select + inline-create component.
 *
 * Encapsulates debounced search, dropdown, inline CustomerFormDrawer,
 * and selected-customer chip with clear. Works in both controlled
 * (value/onChange) and uncontrolled modes.
 */
export function CustomerPicker({
  customerId,
  onSelect,
  onClear,
  placeholder = "Search customer…",
  creditOnly = false,
  allowCreate = true,
  size = "md",
  className = "",
  customerType,
  value: controlledValue,
  onChange: controlledOnChange,
  initialCreateName,
  disabled = false,
}: CustomerPickerProps) {
  const [internalValue, setInternalValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledValue !== undefined;
  const searchText = isControlled ? controlledValue : internalValue;
  const setSearchText = (v: string) => {
    if (isControlled) {
      controlledOnChange?.(v);
    } else {
      setInternalValue(v);
    }
  };

  const debouncedSearch = useDebounce(searchText, 300);

  const { data: searchResult } = Customers.useSearch({
    page: 1,
    limit: 8,
    search:
      !customerId && debouncedSearch.trim().length >= 2
        ? debouncedSearch.trim()
        : undefined,
    hasCreditLimit: creditOnly ? true : undefined,
    enabled: !customerId && debouncedSearch.trim().length >= 2,
  });

  const { data: selectedCustomer } = Customers.useGet(
    customerId || undefined,
  );

  const items = searchResult?.items ?? [];

  const handleSelect = (c: Customer) => {
    setSearchText(
      formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }),
    );
    setShowSuggestions(false);
    onSelect(c);
  };

  const handleClear = () => {
    setSearchText("");
    onClear();
    inputRef.current?.focus();
  };

  const handleCreated = (c: Customer) => {
    setShowCreate(false);
    handleSelect(c);
  };

  const sizeClasses =
    size === "sm"
      ? "py-1.5 text-xs pl-7 pr-8"
      : "py-2 text-sm pl-8 pr-9";

  const iconSize = size === "sm" ? 11 : 13;

  return (
    <div className={`relative ${className}`}>
      {/* Search input */}
      <div className="relative">
        <User
          size={iconSize}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
        />
        <input
          ref={inputRef}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (customerId) onClear();
            setShowSuggestions(true);
          }}
          onFocus={() => !customerId && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-lg border border-border bg-background outline-none focus:border-primary disabled:opacity-50 ${sizeClasses}`}
        />
        {customerId && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X size={iconSize} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showSuggestions &&
        !customerId &&
        debouncedSearch.trim().length >= 2 && (
          <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(c)}
              >
                <span className="font-medium">{c.name || "Unnamed"}</span>
                {c.phone && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c.phone}
                  </span>
                )}
                {c.email && (
                  <span className="ml-2 text-[10px] text-muted-foreground/70">
                    {c.email}
                  </span>
                )}
              </button>
            ))}
            {items.length === 0 && allowCreate && (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowCreate(true);
                  setShowSuggestions(false);
                }}
              >
                No match —{" "}
                <span className="font-medium text-primary">
                  + Create customer
                </span>
              </button>
            )}
            {items.length === 0 && !allowCreate && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No customers found
              </p>
            )}
          </div>
        )}

      {/* Selected chip */}
      {customerId && selectedCustomer && (
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="truncate">
            {formatEntityLabel({
              name: selectedCustomer.name,
              phone: selectedCustomer.phone,
              id: selectedCustomer.id,
            })}
          </span>
          {customerType && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold uppercase tracking-wide text-[9px] text-foreground">
              {String(customerType).replace(/_/g, " ")}
            </span>
          )}
        </div>
      )}

      {/* Inline create drawer */}
      {allowCreate && (
        <CustomerFormDrawer
          open={showCreate}
          initialName={initialCreateName ?? searchText.trim()}
          onClose={() => setShowCreate(false)}
          onSaved={handleCreated}
        />
      )}
    </div>
  );
}
