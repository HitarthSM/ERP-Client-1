import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { FormDrawer } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Bills, Products } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatEntityLabel } from '../../lib/entityLabel';
import { ReceiptDocument } from '../pos/ReceiptDocument';
import { billToPosReceipt, downloadSaleDoc, printSaleDoc } from '../pos/billReceipt';

export function BillViewDrawer({
  billId,
  locationName,
  partyLabel,
  onClose,
}: {
  billId: string | null;
  locationName?: string;
  partyLabel?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: bill, isLoading } = Bills.useGet(billId ?? undefined);
  const { data: products = [] } = Products.useList();

  const productLabel = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    return formatEntityLabel({ name: p?.name, sku: p?.sku, id: productId });
  };

  const receipt = bill
    ? billToPosReceipt(bill, {
        locationName,
        partyLabel,
        productLabel,
        orgName: user?.organization?.name,
        logoUrl: user?.organization?.logoUrl,
        orgMeta: user?.organization?.slug,
      })
    : null;

  return (
    <FormDrawer
      open={billId != null}
      onClose={onClose}
      title="View Bill"
      subtitle={bill?.status ? String(bill.status) : undefined}
      width={900}
      footer={
        <div className="flex w-full flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={!receipt}
              onClick={() => receipt && printSaleDoc(receipt)}
            >
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={!receipt}
              onClick={() => receipt && void downloadSaleDoc(receipt)}
            >
              Download
            </Button>
          </div>
          {billId && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                onClose();
                navigate(`/bills/${billId}`);
              }}
            >
              Open full page
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {isLoading || !receipt ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-2">
          <ReceiptDocument receipt={receipt} />
        </div>
      )}
    </FormDrawer>
  );
}
