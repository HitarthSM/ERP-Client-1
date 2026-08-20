import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CustomerDetailContent } from '../pages/CustomerDetail';

interface CustomerDetailDrawerProps {
  customerId: string;
  open: boolean;
  onClose: () => void;
  onCreditUpdated: () => void;
}

export function CustomerDetailDrawer({ customerId, open, onClose, onCreditUpdated }: CustomerDetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex flex-col bg-background shadow-xl w-full max-w-3xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
          <p className="font-semibold text-sm">Customer Account</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
            <X size={16} />
          </button>
        </div>
        <CustomerDetailContent
          customerId={customerId}
          onCreditUpdated={onCreditUpdated}
        />
      </div>
    </div>
  );
}
