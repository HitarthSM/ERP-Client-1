import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const getBlob = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('../../lib/http', () => ({ getBlob: (...args: unknown[]) => getBlob(...args) }));
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

describe('printCreditorStatement', () => {
  const click = vi.fn();

  beforeEach(() => {
    getBlob.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    click.mockReset();
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ click, href: '', download: '' }),
    };
    (globalThis as { URL: typeof URL }).URL = {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: () => undefined,
    } as unknown as typeof URL;
  });

  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it('downloads PDF from the statement export endpoint', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    getBlob.mockResolvedValue({ blob, filename: 'statement-Yaddah.pdf' });

    const { printCreditorStatement } = await import('./statementPdf');
    await printCreditorStatement({ customerId: 'cust-1' });

    expect(getBlob).toHaveBeenCalledWith('/api/v1/customers/cust-1/statement/pdf');
    expect(click).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalled();
  });
});
