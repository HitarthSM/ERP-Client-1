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

export type PrintDocType = 'receipt' | 'debtor_note' | 'statement' | 'delivery_note';

/** Printable receipt body — only this block is shown when printing (see index.css). */
export function ReceiptDocument({ receipt, docType = 'receipt' }: { receipt: PosReceipt, docType?: PrintDocType }) {
  const extrasTotal = receipt.extraCharges.reduce((s, c) => s + c.amount, 0);
  const showPrices = docType !== 'delivery_note';

  const docTitle = {
    receipt: receipt.mode === 'sales' ? 'Bill / Sales Receipt' : 'Goods Receipt',
    debtor_note: 'Debtor Note',
    statement: 'Statement',
    delivery_note: 'Delivery Note',
  }[docType];

  return (
    <div className="pos-receipt-sheet mx-auto w-full max-w-[800px] bg-white px-7 py-8 text-[12px] leading-relaxed text-slate-800 shadow-sm">
      <header className="mb-6 flex items-start justify-between gap-6 border-b-2 border-[#1e4b8e] pb-5">
        <div className="flex min-w-0 items-center gap-4">
          {receipt.logoUrl && (
            <img
              src={receipt.logoUrl}
              alt={`${receipt.orgName || 'Organization'} logo`}
              className="h-14 w-14 shrink-0 object-contain"
            />
          )}
          <div className="min-w-0">
            <p className="text-xl font-bold leading-tight text-[#1e4b8e]">
              {receipt.orgName || 'Sales Receipt'}
            </p>
            {receipt.orgMeta && (
              <p className="mt-1 text-[11px] text-slate-500">{receipt.orgMeta}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1e4b8e]">
            {docTitle}
          </p>
          <p className="mt-1 font-mono text-[13px] font-semibold text-slate-900">
            {receipt.ref}
          </p>
          <p className="mt-2 inline-flex rounded bg-[#e8f0fb] px-3 py-1 text-[10px] font-semibold text-[#1e4b8e]">
            {fmtDate(receipt.createdAt)}
          </p>
          {!receipt.synced && (
            <p className="mt-2 text-[10px] font-semibold text-amber-700">
              Local only — not synced
            </p>
          )}
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <section className="rounded border border-[#c5d4ea] p-4">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1e4b8e]">
            Our business
          </h2>
          <p className="font-semibold text-slate-900">
            {receipt.orgName || receipt.storeName || '—'}
          </p>
          {receipt.storeName && receipt.storeName !== receipt.orgName && (
            <p className="mt-1 text-slate-600">{receipt.storeName}</p>
          )}
          {receipt.orgPhone && <p className="mt-1 text-slate-600">{receipt.orgPhone}</p>}
          {receipt.orgAddress && <p className="mt-1 text-slate-600">{receipt.orgAddress}</p>}
        </section>
        <section className="rounded border border-[#c5d4ea] p-4">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1e4b8e]">
            {receipt.mode === 'sales' ? 'Billed to' : 'Received from'}
          </h2>
          <p className="font-semibold text-slate-900">{receipt.partyLabel || 'Walk-in customer'}</p>
          {receipt.paymentMethod && (
            <p className="mt-1 text-slate-600">
              Payment: <span className="font-medium uppercase">{receipt.paymentMethod}</span>
            </p>
          )}
          {receipt.saleType && receipt.saleType !== 'normal' && (
            <p className="mt-1 capitalize text-slate-600">Sale type: {receipt.saleType}</p>
          )}
          {receipt.paymentTiming && receipt.paymentTiming !== 'cod' && (
            <p className="mt-1 capitalize text-slate-600">
              Payment timing: {receipt.paymentTiming.replace('_', ' ')}
            </p>
          )}
        </section>
      </div>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#1e4b8e] text-[10px] uppercase tracking-wider text-white">
            <th className="px-3 py-2.5 text-left font-semibold">Item</th>
            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
            {showPrices && <th className="px-3 py-2.5 text-right font-semibold">Amount</th>}
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((l, i) => (
            <tr key={`${l.sku}-${i}`} className="border-b border-[#c5d4ea] align-top">
              <td className="px-3 py-3 pr-2">
                <div className="font-medium leading-snug text-slate-900">{l.name}</div>
                <div className="mt-0.5 font-mono text-[9px] text-slate-500">{l.sku}</div>
                {showPrices && (
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {fmt(l.rate)}
                    {l.taxPct > 0 ? ` · ${l.taxPct}% tax` : ''}
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-700">{l.qty}</td>
              {showPrices && (
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {fmt(l.lineTotal)}
                </td>
              )}
            </tr>
          ))}
          {showPrices && receipt.extraCharges.map((c, i) => (
            <tr key={`x-${i}`} className="border-b border-[#c5d4ea]">
              <td className="px-3 py-2 italic text-slate-600" colSpan={2}>
                {c.label}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                {c.amount < 0 ? '−' : ''}
                {fmt(Math.abs(c.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showPrices && (
        <div className="ml-auto mt-5 w-full max-w-[330px] space-y-1.5 text-[11px]">
          <div className="flex justify-between px-3 text-slate-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(receipt.subtotal)}</span>
          </div>
          <div className="flex justify-between px-3 text-slate-600">
            <span>Tax</span>
            <span className="tabular-nums">{fmt(receipt.taxAmount)}</span>
          </div>
          {extrasTotal !== 0 && (
            <div className="flex justify-between px-3 text-slate-600">
              <span>Extras</span>
              <span className="tabular-nums">
                {extrasTotal < 0 ? '−' : ''}
                {fmt(Math.abs(extrasTotal))}
              </span>
            </div>
          )}
          <div className="mt-2 flex items-baseline justify-between bg-[#e8f0fb] px-3 py-3 text-[#1e4b8e]">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total
            </span>
            <span className="text-lg font-bold tabular-nums tracking-tight">
              {fmt(receipt.totalAmount)}
            </span>
          </div>
        </div>
      )}

      {docType === 'debtor_note' && (
        <div className="mt-4 border-t border-[#c5d4ea] pt-3 text-center text-[10px] text-slate-600">
          This is a debtor note reflecting the outstanding balance for this transaction.
        </div>
      )}
      {docType === 'statement' && (
        <div className="mt-4 border-t border-[#c5d4ea] pt-3 text-center text-[10px] text-slate-600">
          This is an official statement of account for this transaction.
        </div>
      )}

      <p className="mt-7 border-t border-[#c5d4ea] bg-[#e8f0fb] px-4 py-3 text-center text-[11px] font-semibold text-[#1e4b8e]">
        {docType === 'delivery_note' ? 'Please verify all items upon delivery' : 'Thank you for your business'}
      </p>
    </div>
  );
}
