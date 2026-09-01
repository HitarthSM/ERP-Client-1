import { useState } from 'react';
import {
  Info, CreditCard, Image as ImageIcon, Truck,
  Clock, Tag, Pencil, Globe, X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ImageLightbox } from '../../../components/ImageLightbox';
import { cn } from '../../../lib/utils';
import {
  Products,
  useProductImages,
  useProductSuppliers,
  useProductLogsByProduct,
} from '../../../api';
import type { Product, Supplier } from '../../../types';

// ── Formatters ──────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | Date | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function fmtTimeAgo(d: string | Date | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionDotClass(action: string) {
  if (['product_created', 'product_enabled', 'stock_added', 'stock_transferred_in', 'stock_published'].includes(action))
    return 'bg-green-500';
  if (['product_disabled', 'stock_removed', 'stock_damaged', 'stock_written_off'].includes(action))
    return 'bg-red-500';
  if (['product_updated', 'stock_adjusted', 'stock_reserved'].includes(action))
    return 'bg-blue-500';
  if (action === 'stock_transferred_out') return 'bg-orange-500';
  return 'bg-muted-foreground';
}

function actionBadgeClass(action: string) {
  if (['product_created', 'product_enabled', 'stock_added', 'stock_transferred_in', 'stock_published'].includes(action))
    return 'text-green-400 bg-green-950/40 border-green-800/40';
  if (['product_disabled', 'stock_removed', 'stock_damaged', 'stock_written_off'].includes(action))
    return 'text-red-400 bg-red-950/40 border-red-800/40';
  if (['product_updated', 'stock_adjusted', 'stock_reserved'].includes(action))
    return 'text-blue-400 bg-blue-950/40 border-blue-800/40';
  if (action === 'stock_transferred_out')
    return 'text-orange-400 bg-orange-950/40 border-orange-800/40';
  return 'text-muted-foreground bg-muted/40 border-border';
}

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function PriceBox({ label, value, isReorder }: { label: string; value?: number; isReorder?: boolean }) {
  const has = value != null;
  const highlight = isReorder && has && value > 0;
  return (
    <div className={cn('rounded-lg border p-3.5', highlight ? 'border-red-500/40 bg-red-950/30' : 'border-border bg-muted/30')}>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn('mt-1.5 text-lg font-bold', highlight ? 'text-red-400' : 'text-foreground')}>
        {!has ? '—' : isReorder ? String(value) : fmtCurrency(value)}
      </div>
    </div>
  );
}

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  productId: string;
  categoryName: Map<string, string>;
  allSuppliers: Supplier[];
  onClose: () => void;
  onEdit: (product: Product) => void;
}

export function ProductDetailView({ productId, categoryName, allSuppliers, onClose, onEdit }: Props) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<string[]>([]);

  const { data: product, isLoading: productLoading } = Products.useGet(productId);
  const { data: images = [], isLoading: imagesLoading } = useProductImages(productId);
  const { data: suppliers = [], isLoading: suppliersLoading } = useProductSuppliers(productId);
  const { data: logs = [], isLoading: logsLoading } = useProductLogsByProduct(productId);

  const isActive = product?.isActive !== false;
  const catLabel = product?.categoryId ? (categoryName.get(product.categoryId) ?? product.categoryId) : null;
  const lastLog = logs[0];

  const primaryImg = images.find((i) => i.isPrimary) ?? images[0];
  const restImgs = images.filter((i) => i.id !== primaryImg?.id);

  return (
    <>
      <div className="w-full">
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md px-1 py-3 mb-5">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm">
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Products
              </button>
              <span className="text-muted-foreground">›</span>
              <span className="font-medium text-foreground">Product Details</span>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Tag size={13} />
                Labels
              </Button>
              {product && (
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onEdit(product)}>
                  <Pencil size={13} />
                  Edit Product
                </Button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-1 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Product name + status */}
          <div className="mt-2.5 flex items-end gap-3">
            {productLoading ? (
              <SkeletonBox className="h-8 w-52" />
            ) : (
              <>
                <h1 className="text-2xl font-bold leading-tight">{product?.name ?? '—'}</h1>
                <span
                  className={cn(
                    'mb-0.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                    isActive
                      ? 'border-green-700/40 bg-green-950/50 text-green-400'
                      : 'border-red-700/40 bg-red-950/50 text-red-400',
                  )}
                >
                  ● {isActive ? 'Active' : 'Inactive'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-[1fr_360px] gap-5">
          {/* ──────────── LEFT COLUMN ──────────── */}
          <div className="space-y-5">
            {/* Product Information */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-5 flex items-center gap-2">
                <div className="rounded-md bg-blue-500/15 p-1.5">
                  <Info size={15} className="text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold">Product Information</h2>
              </div>

              {productLoading ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <SkeletonBox className="h-2.5 w-16" />
                      <SkeletonBox className="h-4 w-28" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <InfoField label="Product ID">
                    <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs break-all">
                      {product?.id ?? '—'}
                    </code>
                  </InfoField>

                  <InfoField label="SKU">
                    <span className="text-sm font-medium">{product?.sku || '—'}</span>
                  </InfoField>

                  <InfoField label="Category">
                    {catLabel ? (
                      <div className="flex items-center gap-1.5">
                        <Globe size={13} className="flex-shrink-0 text-blue-400" />
                        <span className="text-sm font-medium">{catLabel}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </InfoField>

                  <InfoField label="Unit">
                    <span className="text-sm font-medium">{product?.unit || '—'}</span>
                  </InfoField>

                  <InfoField label="Manufacturer / Brand">
                    <span className="text-sm font-medium">{product?.manufacturer || '—'}</span>
                  </InfoField>

                  <InfoField label="Pack Size">
                    <span className="text-sm font-medium">
                      {product?.packSize != null ? `${product.packSize} units/pack` : '—'}
                    </span>
                  </InfoField>

                  <InfoField label="Barcode">
                    {product?.barcode ? (
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                        {product.barcode}
                      </code>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </InfoField>

                  <InfoField label="Created At">
                    <span className="text-sm font-medium">{fmtDate(product?.createdAt)}</span>
                  </InfoField>

                  {product?.description && (
                    <div className="col-span-2">
                      <InfoField label="Description">
                        <p className="text-sm italic text-muted-foreground">
                          &ldquo;{product.description}&rdquo;
                        </p>
                      </InfoField>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pricing & Stock */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-emerald-500/15 p-1.5">
                    <CreditCard size={15} className="text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-semibold">Pricing &amp; Stock</h2>
                </div>
                <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground tracking-wide">
                  CURRENCY: USD
                </span>
              </div>

              {productLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonBox key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <PriceBox label="Retail Price" value={product?.retailPrice} />
                  <PriceBox label="Cost Price" value={product?.costPrice} />
                  <PriceBox label="Loyalty Price" value={product?.loyaltyPrice} />
                  <PriceBox label="Wholesale" value={product?.wholesalePrice} />
                  <PriceBox label="Transfer" value={product?.transferPrice} />
                  <PriceBox label="Reorder Point" value={product?.reorderPoint} isReorder />
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-5 flex items-center gap-2">
                <div className="rounded-md bg-purple-500/15 p-1.5">
                  <Clock size={15} className="text-purple-400" />
                </div>
                <h2 className="text-sm font-semibold">Activity Log</h2>
                {!logsLoading && logs.length > 0 && (
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {logs.length}
                  </span>
                )}
              </div>

              {logsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonBox key={i} className="h-12" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No activity recorded yet
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-3 rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <div
                        className={cn(
                          'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                          actionDotClass(log.action),
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              'inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              actionBadgeClass(log.action),
                            )}
                          >
                            {formatAction(log.action)}
                          </span>
                          <span className="flex-shrink-0 text-xs text-muted-foreground">
                            {fmtTimeAgo(log.createdAt)}
                          </span>
                        </div>

                        {(log.changedFields ?? []).length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {(log.changedFields ?? []).map((f, i) => (
                              <div key={i} className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/70">{f.field}:</span>{' '}
                                <span className="text-red-400/70 line-through">
                                  {String(f.oldValue ?? '—')}
                                </span>
                                {' → '}
                                <span className="text-green-400/70">
                                  {String(f.newValue ?? '—')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {Object.entries(log.metadata)
                              .filter(([, v]) => v != null)
                              .slice(0, 3)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ──────────── RIGHT COLUMN ──────────── */}
          <div className="space-y-5">
            {/* Media Gallery */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-md bg-indigo-500/15 p-1.5">
                  <ImageIcon size={15} className="text-indigo-400" />
                </div>
                <h2 className="text-sm font-semibold">Media Gallery</h2>
              </div>

              {imagesLoading ? (
                <div className="space-y-2">
                  <SkeletonBox className="aspect-video w-full" />
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonBox key={i} className="aspect-square" />
                    ))}
                  </div>
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="rounded-full bg-muted p-4">
                    <ImageIcon size={22} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No images uploaded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {primaryImg?.url && (
                    <button
                      type="button"
                      onClick={() => setPreviewSrc(primaryImg.url!)}
                      className="group relative w-full overflow-hidden rounded-lg border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <img
                        src={primaryImg.url}
                        alt="Primary"
                        className="aspect-video w-full object-cover transition group-hover:scale-105"
                      />
                      <span className="absolute bottom-2 left-2 rounded-full bg-blue-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Primary
                      </span>
                    </button>
                  )}
                  {restImgs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {restImgs.map((img) =>
                        img.url ? (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setPreviewSrc(img.url!)}
                            className="group aspect-square overflow-hidden rounded-lg border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <img
                              src={img.url}
                              alt=""
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          </button>
                        ) : (
                          <div
                            key={img.id}
                            className="flex aspect-square items-center justify-center rounded-lg border border-border bg-muted text-[10px] text-muted-foreground"
                          >
                            No URL
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Linked Suppliers */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-md bg-amber-500/15 p-1.5">
                  <Truck size={15} className="text-amber-400" />
                </div>
                <h2 className="text-sm font-semibold">Linked Suppliers</h2>
              </div>

              {suppliersLoading ? (
                <SkeletonBox className="h-12" />
              ) : suppliers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="rounded-full bg-muted p-3">
                    <Truck size={18} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No suppliers linked</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {suppliers.map((link) => {
                    const sup = allSuppliers.find((s) => s.id === link.supplierId);
                    const details = [
                      link.unitCost != null && `Cost $${link.unitCost}`,
                      link.leadTimeDays != null && `Lead ${link.leadTimeDays}d`,
                      link.minOrderQty != null && `MOQ ${link.minOrderQty}`,
                    ].filter(Boolean).join(' · ');
                    return (
                      <div
                        key={link.id}
                        className="rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{sup?.name ?? link.supplierId}</span>
                          {link.isDefault && (
                            <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {details || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Last Updated */}
            {lastLog && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className="rounded-full bg-muted p-2">
                  <Clock size={13} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Last Updated
                  </div>
                  <div className="text-sm font-medium text-blue-400">
                    {fmtTimeAgo(lastLog.createdAt)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </>
  );
}
