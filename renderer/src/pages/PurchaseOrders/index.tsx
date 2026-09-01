import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, ShoppingCart } from "lucide-react";
import { DataTable, Column } from "../../components/DataTable";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FormSelect } from "../../components/FormSelect";
import { PurchaseOrders, Suppliers } from "../../api";
import { usePagination } from "../../hooks/usePagination";
import { truncateId } from "../../lib/entityLabel";
import { loadErrorMessage } from "../../lib/api-error";
import type { PurchaseOrder, PurchaseOrderStatus } from "../../types";
import type { ExtraAction } from "../../components/RowActionsMenu";

const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  draft:                "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300",
  ordered:              "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  partially_received:   "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  received:             "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  partially_allocated:  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  allocated:            "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400",
  cancelled:            "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
};

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft:               'Draft',
  ordered:             'Ordered',
  partially_received:  'Partially Received',
  received:            'Received',
  partially_allocated: 'Partially Allocated',
  allocated:           'Allocated',
  cancelled:           'Cancelled',
};

function StatusBadge({ status }: { status: PurchaseOrderStatus | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] ?? "bg-muted text-foreground"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [supplierFilter, setSupplierFilter] = useState("");

  const removeMutation = PurchaseOrders.useDelete();
  const updateMutation = PurchaseOrders.useUpdate();
  const { page, setPage } = usePagination();
  const { data: suppliers = [] } = Suppliers.useList();

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  );

  const filters = useMemo(() => {
    if (supplierFilter) return { supplierId: supplierFilter };
    return undefined;
  }, [supplierFilter]);

  const { data, isLoading, isError, error, refetch } = PurchaseOrders.useSearch({ page, filters });

  const listError = isError ? loadErrorMessage(error, "purchase orders") : null;

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "poNumber",
      label: "PO #",
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-foreground">
          {row.poNumber ?? truncateId(row.id)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "supplierId",
      label: "Supplier",
      render: (row) =>
        row.supplierId
          ? (supplierMap[row.supplierId] ?? truncateId(row.supplierId))
          : "—",
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (row) =>
        row.totalAmount != null
          ? `$${Number(row.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—",
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString()
          : "—",
    },
  ];

  return (
    <div className="space-y-4" style={{ height: "100%" }}>
      <DataTable
        title="Purchase Orders"
        description="Manage purchase orders. Click a row to view details or receive stock."
        columns={columns}
        rows={listError ? [] : (data?.items ?? [])}
        total={listError ? 0 : (data?.total ?? 0)}
        page={page}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={setPage}
        hideSearch
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Supplier:</span>
            <FormSelect
              className="h-8 w-[200px] py-1.5"
              value={supplierFilter}
              onChange={(v) => { setSupplierFilter(v); setPage(1); }}
              placeholder="All suppliers"
              options={[
                { value: '', label: 'All suppliers' },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin={true}
        onAdd={() => navigate("/pos/purchase")}
        addLabel="Draft Purchase Order"
        onView={(row) => navigate(`/purchase-orders/${row.id}`)}
        onDelete={(row) => setDeleteTarget(row)}
        extraRowActions={(row) => {
          const actions: ExtraAction[] = [];
          if (row.status === 'draft') {
            actions.push({
              label: 'Mark as Ordered',
              icon: <ShoppingCart size={14} />,
              onSelect: () => updateMutation.mutate({ id: row.id, body: { status: 'ordered' } as Partial<PurchaseOrder> }),
            });
          }
          if (
            row.status === 'ordered' ||
            row.status === 'partially_received' ||
            row.status === 'received' ||
            row.status === 'partially_allocated'
          ) {
            actions.push({
              label: 'Verify Receipt',
              icon: <ClipboardCheck size={14} />,
              onSelect: () => navigate(`/purchase-orders/${row.id}/receive`),
            });
          }
          return actions;
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Purchase Order"
        description="Delete this purchase order? This cannot be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget &&
          removeMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }
      />
    </div>
  );
}
