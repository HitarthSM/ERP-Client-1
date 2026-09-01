import type { PosReceipt } from './checkout';

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/** Printable customer statement — same sheet layout as Sales Receipt / Debtor Note. */
export function StatementDocument({ receipt }: { receipt: PosReceipt }) {
  const prev = Number(receipt.creditBalance ?? 0);
  const sale = receipt.totalAmount;
  const next = prev + sale;

  return (
    <div className="pos-receipt-sheet mx-auto w-full max-w-[300px] bg-white text-neutral-900 px-4 py-5 text-[13px] leading-snug shadow-sm">
      <header className="text-center pb-4 mb-4 border-b border-dashed border-neutral-300">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Account Statement
        </p>
        <p className="mt-2 font-mono text-[15px] font-semibold tracking-tight text-neutral-950">
          {receipt.ref}
        </p>
        <p className="mt-1.5 text-[11px] text-neutral-500">{fmtDate(receipt.createdAt)}</p>
      </header>

      <dl className="mb-4 space-y-2 text-[12px]">
        {receipt.storeName && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Store</dt>
            <dd className="text-right font-medium text-neutral-900">{receipt.storeName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-neutral-500">Customer</dt>
          <dd className="text-right font-medium text-neutral-900">{receipt.partyLabel || '—'}</dd>
        </div>
        {receipt.creditLimit != null && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Credit limit</dt>
            <dd className="text-right font-medium tabular-nums text-neutral-900">
              {fmt(Number(receipt.creditLimit))}
            </dd>
          </div>
        )}
      </dl>

      {receipt.lines.length > 0 && (
        <table className="mb-4 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-wider text-neutral-500">
              <th className="pb-2 text-left font-semibold">Item</th>
              <th className="pb-2 text-right font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Amt</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((l, i) => (
              <tr key={`${l.sku}-${i}`} className="border-b border-neutral-100 align-top">
                <td className="py-2.5 pr-2">
                  <div className="font-medium text-neutral-900 leading-snug">{l.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-neutral-400">{l.sku}</div>
                </td>
                <td className="py-2.5 text-right tabular-nums text-neutral-700">{l.qty}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums whitespace-nowrap text-neutral-900">
                  {fmt(l.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="space-y-1.5 border-t border-dashed border-neutral-300 pt-3 text-[12px]">
        <div className="flex justify-between text-neutral-500">
          <span>Previous balance</span>
          <span className="tabular-nums">{fmt(prev)}</span>
        </div>
        <div className="flex justify-between text-neutral-500">
          <span>This sale</span>
          <span className="tabular-nums">{fmt(sale)}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
            Balance due
          </span>
          <span className="text-xl font-bold tabular-nums tracking-tight text-neutral-950">
            {fmt(next)}
          </span>
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] font-medium text-neutral-500">
        Official statement of account for this transaction
      </p>
    </div>
  );
}
