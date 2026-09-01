import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { CreditApprovals, Customers, Locations, Products } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { get } from "../../lib/http";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { formatEntityLabel, truncateId } from "../../lib/entityLabel";
import { fmt } from "../pos/posHelpers";
import { billToPosReceipt, printSaleDoc } from "../pos/billReceipt";
import type { Bill, CreditApprovalRequest, Customer } from "../../types";

function ApprovalCard({
  req,
  customer,
  bill,
  onApprove,
  onReject,
  busy,
}: {
  req: CreditApprovalRequest;
  customer?: Customer;
  bill?: Bill;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const customerLabel = customer
    ? formatEntityLabel({ name: customer.name, phone: customer.phone, id: customer.id })
    : `Customer ${truncateId(req.customerId)}`;

  const billLabel = bill?.billNumber || truncateId(req.billId);
  const limit = Number(customer?.creditLimit ?? 0);
  const balance = Number(customer?.creditBalance ?? 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-foreground">{customerLabel}</span>
          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-600 font-semibold rounded-full">
            Needs Approval
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Bill <span className="font-mono font-medium text-foreground">{billLabel}</span>
          {bill?.totalAmount != null && (
            <span className="ml-2">· Bill total {fmt(Number(bill.totalAmount))}</span>
          )}
        </p>
        {customer && limit > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Credit limit {fmt(limit)} · Balance {fmt(balance)} · After sale{" "}
            {fmt(balance + Number(req.requestedAmount))}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(req.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Requested</p>
          <p className="text-xl font-bold text-primary tabular-nums">
            {fmt(Number(req.requestedAmount))}
          </p>
        </div>

        <div className="flex gap-2 ml-4 border-l border-border pl-4">
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
            title="Reject"
          >
            <XCircle size={24} />
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-40"
          >
            <CheckCircle2 size={18} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PendingApprovals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: approvals = [], isLoading } = CreditApprovals.useListPending();
  const approve = CreditApprovals.useApprove();
  const reject = CreditApprovals.useReject();
  const { data: customersPage } = Customers.useSearch({});
  const { data: locations = [] } = Locations.useList();
  const { data: products = [] } = Products.useList();

  const customerMap = useMemo(() => {
    const m = new Map<string, Customer>();
    for (const c of customersPage?.items ?? []) {
      m.set(c.id, c);
    }
    return m;
  }, [customersPage?.items]);

  const billQueries = useQueries({
    queries: approvals.map((req) => ({
      queryKey: ["bills", req.billId],
      queryFn: () => get<Bill>(`/api/v1/bills/${req.billId}`),
      enabled: !!req.billId,
    })),
  });

  const billMap = useMemo(() => {
    const m = new Map<string, Bill>();
    approvals.forEach((req, i) => {
      const bill = billQueries[i]?.data;
      if (bill) m.set(req.billId, bill);
    });
    return m;
  }, [approvals, billQueries]);

  const busy = approve.isPending || reject.isPending;

  const handleApprove = (req: CreditApprovalRequest) => {
    approve.mutate(req.id, {
      onSuccess: async () => {
        try {
          const bill = await get<Bill>(`/api/v1/bills/${req.billId}`);
          const loc = locations.find((l) => l.id === bill.locationId);
          const customer = customerMap.get(req.customerId);
          const receipt = billToPosReceipt(bill, {
            orgName: user?.organization?.name,
            logoUrl: user?.organization?.logoUrl,
            orgMeta: user?.organization?.slug,
            locationName: loc
              ? formatEntityLabel({ name: loc.name, id: loc.id })
              : bill.locationId,
            partyLabel: customer
              ? formatEntityLabel({ name: customer.name, phone: customer.phone, id: customer.id })
              : bill.walkInName || undefined,
            productLabel: (productId) => {
              const p = products.find((x) => x.id === productId);
              return formatEntityLabel({ name: p?.name, sku: p?.sku, id: productId });
            },
          });
          navigate(`/bills/${req.billId}`);
          requestAnimationFrame(() => printSaleDoc(receipt));
        } catch {
          navigate(`/bills/${req.billId}`);
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Credit Sales</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Over-limit credit sales held as drafts until you approve or reject.
          </p>
        </div>
      </div>

      <div className="grid gap-4 max-w-4xl">
        {approvals.length === 0 ? (
          <p className="text-muted-foreground bg-card p-6 rounded-xl border border-border">
            No pending credit approvals at this time.
          </p>
        ) : (
          approvals.map((req) => (
            <ApprovalCard
              key={req.id}
              req={req}
              customer={customerMap.get(req.customerId)}
              bill={billMap.get(req.billId)}
              onApprove={() => handleApprove(req)}
              onReject={() => reject.mutate(req.id)}
              busy={busy}
            />
          ))
        )}
      </div>
    </div>
  );
}
