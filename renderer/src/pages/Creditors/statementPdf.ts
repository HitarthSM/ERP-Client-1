import { toast } from 'sonner';
import { getBlob } from '../../lib/http';

/** Download creditor account statement PDF from core-apis PdfExportService. */
export async function printCreditorStatement(opts: { customerId: string }): Promise<void> {
  try {
    const { blob, filename } = await getBlob(`/api/v1/customers/${opts.customerId}/statement/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Statement PDF downloaded');
  } catch {
    toast.error('Could not download statement PDF');
  }
}
