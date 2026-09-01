import { Bills } from "../../api";
import type { Bill } from "../../types";
import { ListRestart, Loader2, X } from "lucide-react";
import { fmt } from "./posHelpers";

interface Props {
  onResume: (bill: Bill) => void;
  onClose: () => void;
}

export function HeldSalesPanel({ onResume, onClose }: Props) {
  const { data: billsPage, isLoading } = Bills.useSearch({
    page: 1,
    limit: 20,
    filters: { status: "DRAFT" },
  });

  const drafts = billsPage?.items || [];

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-right-10">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <ListRestart size={16} className="text-amber-500" />
          Held Sales
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-8">No held sales found.</p>
        ) : (
          <div className="space-y-2">
            {drafts.map((b) => (
              <div key={b.id} className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition text-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{b.walkInName || `Customer ${b.customerId?.slice(0, 8)}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.createdAt!).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="font-semibold text-primary tabular-nums">
                    {fmt(Number(b.totalAmount))}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{b.items?.length || 0} items</span>
                  <button
                    onClick={() => {
                      onResume(b);
                      onClose();
                    }}
                    className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90"
                  >
                    Resume
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
