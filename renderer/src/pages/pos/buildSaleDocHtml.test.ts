import { describe, expect, it } from 'vitest';
import { buildSaleDocHtml } from './buildSaleDocHtml';
import type { PosReceipt } from './checkout';

const base: PosReceipt = {
  ref: 'BILL-9',
  mode: 'sales',
  storeName: 'Main',
  partyLabel: 'Ada',
  paymentMethod: 'cash',
  lines: [{ sku: 'SKU1', name: 'Widget', qty: 2, rate: 10, taxPct: 0, lineTotal: 20 }],
  extraCharges: [],
  subtotal: 20,
  taxAmount: 0,
  totalAmount: 20,
  createdAt: '2026-08-01T10:00:00.000Z',
  synced: true,
  orgName: 'Acme Traders',
  logoUrl: 'https://cdn.example/logo.png',
  orgMeta: 'a@acme.test · 111',
};

describe('buildSaleDocHtml receipt formal layout', () => {
  it('uses statement navy chrome and BILL title', () => {
    const html = buildSaleDocHtml(base, 'receipt');
    expect(html).toContain('#1e4b8e');
    expect(html).toMatch(/>\s*BILL\s*</);
    expect(html).toContain('Our business');
    expect(html).toContain('Billed to');
    expect(html).toContain('Acme Traders');
    expect(html).toContain('https://cdn.example/logo.png');
  });

  it('includes extra charges in the formal totals', () => {
    const html = buildSaleDocHtml(
      {
        ...base,
        extraCharges: [{ label: 'Delivery', amount: 5 }],
        totalAmount: 25,
      },
      'receipt',
    );

    expect(html).toContain('<span>Extras</span>');
    expect(html).toContain('$5.00');
  });
});
