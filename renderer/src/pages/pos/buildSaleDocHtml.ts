import type { PosReceipt } from './checkout';

export type SaleDocKind = 'receipt' | 'debtor' | 'statement' | 'delivery';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

function linesTable(receipt: PosReceipt) {
  const rows = receipt.lines
    .map(
      (l) => `
      <tr>
        <td>${esc(l.name)}<div class="muted mono">${esc(l.sku)}</div></td>
        <td class="right">${l.qty}</td>
        <td class="right">${fmt(l.rate)}</td>
        <td class="right">${l.taxPct > 0 ? `${l.taxPct}%` : '—'}</td>
        <td class="right">${fmt(l.lineTotal)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table>
      <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Tax</th><th class="right">Amt</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function titleFor(kind: SaleDocKind, receipt: PosReceipt) {
  if (kind === 'debtor') return 'Debtor Note';
  if (kind === 'statement') return 'Statement';
  if (kind === 'delivery') return 'Delivery Note';
  return receipt.mode === 'sales' ? 'Sales receipt' : 'Goods receipt';
}

function receiptTitle(receipt: PosReceipt) {
  return receipt.mode === 'sales' ? 'BILL' : 'GOODS RECEIPT';
}

function formalReceiptLinesTable(receipt: PosReceipt) {
  const rows = receipt.lines
    .map(
      (l) => `
      <tr>
        <td>
          <div>${esc(l.name)}</div>
          <div class="item-desc">${esc(l.sku)}</div>
        </td>
        <td class="num">${l.qty}</td>
        <td class="num">${fmt(l.rate)}</td>
        <td class="num">${l.taxPct > 0 ? `${l.taxPct}%` : '—'}</td>
        <td class="num">${fmt(l.lineTotal)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table>
      <thead>
        <tr>
          <th>ITEM</th>
          <th class="num">QTY</th>
          <th class="num">UNIT PRICE</th>
          <th class="num">TAX %</th>
          <th class="num">TOTAL</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td class="empty" colspan="5">No line items.</td></tr>'}</tbody>
    </table>`;
}

function buildFormalReceiptHtml(receipt: PosReceipt): string {
  const title = receiptTitle(receipt);
  const orgName = receipt.orgName || receipt.storeName || '—';
  const extrasTotal = receipt.extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const logo = receipt.logoUrl
    ? `<img src="${esc(receipt.logoUrl)}" alt="" />`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)} ${esc(receipt.ref)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    background: #fff;
    color: #123;
    font-size: 12px;
    line-height: 1.45;
  }
  .page { padding: 8px 4px; }
  .brand { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
  .brand img { height: 42px; }
  .brand h1 { font-size: 22px; color: #1e4b8e; font-weight: 800; }
  .meta { color: #555; margin-top: 4px; font-size: 11px; }
  .doc-title {
    text-align: center;
    font-size: 16px;
    letter-spacing: 0.08em;
    font-weight: 800;
    margin: 18px 0 10px;
  }
  .wrap { text-align: center; margin-bottom: 16px; }
  .range {
    text-align: center;
    border: 1px solid #1e4b8e;
    display: inline-block;
    padding: 4px 12px;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .box { border: 1px solid #c5d4ea; padding: 10px; }
  .box h2 {
    margin: 0 0 6px;
    font-size: 11px;
    color: #1e4b8e;
    text-transform: uppercase;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th {
    background: #1e4b8e;
    color: #fff;
    text-align: left;
    padding: 8px;
    font-size: 10px;
    letter-spacing: 0.06em;
  }
  th.num, td.num { text-align: right; }
  td { padding: 7px 8px; border-bottom: 1px solid #e6eef8; }
  tbody tr:nth-child(even) td { background: #f4f7fb; }
  .item-desc { font-size: 10px; color: #666; margin-top: 2px; }
  .empty { text-align: center; color: #666; padding: 16px; }
  .foot {
    margin-top: 16px;
    background: #e8f0fb;
    border: 1px solid #c5d4ea;
    padding: 12px;
  }
  .foot-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .foot-row.total { margin-top: 6px; padding-top: 8px; border-top: 1px solid #c5d4ea; }
  .bal { font-size: 18px; font-weight: 800; color: #1e4b8e; }
  .extra { margin-top: 12px; }
  .extra-label {
    font-size: 10px;
    color: #1e4b8e;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }
  .thanks { text-align: center; margin-top: 18px; color: #555; }
</style>
</head>
<body>
  <div class="page">
    <div class="brand">
      ${logo}
      <div>
        <h1>${esc(orgName)}</h1>
        ${receipt.orgMeta ? `<div class="meta">${esc(receipt.orgMeta)}</div>` : ''}
      </div>
    </div>

    <div class="doc-title">${esc(title)}</div>
    <div class="wrap"><div class="range">#${esc(receipt.ref)} · ${esc(fmtDate(receipt.createdAt))}</div></div>

    <div class="grid">
      <div class="box">
        <h2>Our business</h2>
        <div>${esc(orgName)}</div>
        ${receipt.orgAddress ? `<div>${esc(receipt.orgAddress)}</div>` : ''}
        ${receipt.orgPhone ? `<div>${esc(receipt.orgPhone)}</div>` : ''}
        ${receipt.orgMeta ? `<div>${esc(receipt.orgMeta)}</div>` : ''}
      </div>
      <div class="box">
        <h2>Billed to</h2>
        <div>${esc(receipt.partyLabel || '—')}</div>
        ${receipt.storeName ? `<div>Location: ${esc(receipt.storeName)}</div>` : ''}
        ${
          receipt.paymentMethod
            ? `<div>Payment: ${esc(String(receipt.paymentMethod).toUpperCase())}</div>`
            : ''
        }
      </div>
    </div>

    ${formalReceiptLinesTable(receipt)}

    <div class="foot">
      <div class="foot-row"><span>Subtotal</span><span>${fmt(receipt.subtotal)}</span></div>
      <div class="foot-row"><span>Tax</span><span>${fmt(receipt.taxAmount)}</span></div>
      ${
        extrasTotal
          ? `<div class="foot-row"><span>Extras</span><span>${fmt(extrasTotal)}</span></div>`
          : ''
      }
      <div class="foot-row total"><span>Total</span><span class="bal">${fmt(receipt.totalAmount)}</span></div>
    </div>

    ${
      receipt.paymentMethod
        ? `<div class="extra">
            <div class="extra-label">Payment method</div>
            <div>${esc(String(receipt.paymentMethod).toUpperCase())}</div>
          </div>`
        : ''
    }

    <p class="thanks">Thank you for your business · ${esc(orgName)}</p>
  </div>
</body>
</html>`;
}

/** Minimal printable HTML for Electron printToPDF (no React/CSS deps). */
export function buildSaleDocHtml(receipt: PosReceipt, kind: SaleDocKind): string {
  if (kind === 'receipt') {
    return buildFormalReceiptHtml(receipt);
  }

  const title = titleFor(kind, receipt);
  const prev = Number(receipt.creditBalance ?? 0);
  const next = prev + receipt.totalAmount;
  const d = receipt.delivery;

  let body = '';
  if (kind === 'statement') {
    body = `
      <dl>
        <div><dt>Store</dt><dd>${esc(receipt.storeName || '—')}</dd></div>
        <div><dt>Customer</dt><dd>${esc(receipt.partyLabel || '—')}</dd></div>
        ${
          receipt.creditLimit != null
            ? `<div><dt>Credit limit</dt><dd>${fmt(Number(receipt.creditLimit))}</dd></div>`
            : ''
        }
      </dl>
      <div class="box">
        <div class="row"><span>Previous balance</span><span>${fmt(prev)}</span></div>
        <div class="row"><span>This sale</span><span>${fmt(receipt.totalAmount)}</span></div>
        <div class="row total"><span>Balance</span><span>${fmt(next)}</span></div>
      </div>`;
  } else {
    body = `
      <dl>
        ${receipt.storeName ? `<div><dt>Store</dt><dd>${esc(receipt.storeName)}</dd></div>` : ''}
        <div><dt>Customer</dt><dd>${esc(receipt.partyLabel || '—')}</dd></div>
        ${
          receipt.paymentMethod
            ? `<div><dt>Payment</dt><dd>${esc(String(receipt.paymentMethod).toUpperCase())}</dd></div>`
            : ''
        }
        ${
          receipt.paymentTiming
            ? `<div><dt>Timing</dt><dd>${esc(receipt.paymentTiming.replace(/_/g, ' '))}</dd></div>`
            : ''
        }
      </dl>
      ${linesTable(receipt)}
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${fmt(receipt.subtotal)}</span></div>
        <div class="row"><span>Tax</span><span>${fmt(receipt.taxAmount)}</span></div>
        <div class="row total"><span>${kind === 'debtor' ? 'Amount owed' : 'Total'}</span><span>${fmt(receipt.totalAmount)}</span></div>
      </div>
      ${
        kind === 'delivery' && d
          ? `<div class="box">
              <div class="label">Delivery</div>
              ${d.driverName ? `<div class="row"><span>Driver</span><span>${esc(d.driverName)}</span></div>` : ''}
              ${d.companionName ? `<div class="row"><span>With driver</span><span>${esc(d.companionName)}</span></div>` : ''}
              ${d.vehicleNumber ? `<div class="row"><span>Vehicle</span><span>${esc(d.vehicleNumber)}</span></div>` : ''}
              ${d.license ? `<div class="row"><span>License</span><span>${esc(d.license)}</span></div>` : ''}
              ${d.location ? `<div class="row"><span>Location</span><span>${esc(d.location)}</span></div>` : ''}
              ${d.distance ? `<div class="row"><span>Distance</span><span>${esc(d.distance)}</span></div>` : ''}
              ${d.gps ? `<div class="row"><span>GPS</span><span>${esc(d.gps)}</span></div>` : ''}
              ${d.rating ? `<div class="row"><span>Rating</span><span>${esc(d.rating)}</span></div>` : ''}
              ${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}
            </div>`
          : ''
      }`;
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)} ${esc(receipt.ref)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #111; margin: 24px; font-size: 13px; }
  h1 { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #666; margin: 0; text-align: center; }
  .ref { font-family: ui-monospace, monospace; font-size: 16px; font-weight: 700; text-align: center; margin: 8px 0 4px; }
  .date { text-align: center; color: #666; font-size: 11px; margin-bottom: 16px; }
  hr { border: none; border-top: 1px dashed #ccc; margin: 16px 0; }
  dl { margin: 0 0 14px; }
  dl div { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; }
  dt { color: #666; }
  dd { margin: 0; font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #666; border-bottom: 1px solid #ddd; padding: 0 0 6px; }
  td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .right { text-align: right; }
  .muted { color: #999; font-size: 10px; }
  .mono { font-family: ui-monospace, monospace; }
  .row { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; color: #555; }
  .total { font-weight: 800; color: #111; font-size: 16px; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px; }
  .box { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-top: 12px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #666; margin-bottom: 8px; font-weight: 700; }
  .note { margin: 8px 0 0; color: #444; }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="ref">${esc(receipt.ref)}</div>
  <div class="date">${esc(fmtDate(receipt.createdAt))}</div>
  <hr />
  ${body}
</body>
</html>`;
}

export function defaultPdfFileName(receipt: PosReceipt, kind: SaleDocKind) {
  const safe = receipt.ref.replace(/[^\w.-]+/g, '_');
  return `${kind}-${safe}.pdf`;
}
