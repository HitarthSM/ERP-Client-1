import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, CloudUpload,
  Image as ImageIcon, Link2, Trash2, X, ScanBarcode, TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Products, Suppliers,
  useCategoryParents, useLinkProductSupplier, useNextSku, useProductSuppliers,
  useUnlinkProductSupplier, useUploadProductImage,
} from '../../../api';
import { useDebounce } from '../../../hooks/useDebounce';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import type { Category, Product, ProductSupplier, ProductUnit, Supplier } from '../../../types';
import { cn } from '../../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

export interface PendingImg { id: string; file: File; preview: string }

const UNITS: ProductUnit[] = ['piece', 'kg', 'gram', 'litre', 'ml', 'box', 'pack', 'dozen'];

const STEP_LABELS: Record<Step, string> = {
  1: 'Product Details',
  2: 'Media & Category',
  3: 'Pricing',
  4: 'Suppliers',
};

interface WizardProps {
  editingProduct?: Product;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Step progress indicator ────────────────────────────────────────────────────

function StepDot({ num, current }: { num: Step; current: Step }) {
  const done   = num < current;
  const active = num === current;
  return (
    <div className="flex flex-col items-center gap-2 z-10">
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300',
          done   && 'bg-primary border-primary text-primary-foreground',
          active && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20',
          !done && !active && 'bg-muted border-border text-muted-foreground opacity-40',
        )}
      >
        {done ? <Check size={15} strokeWidth={3} /> : num}
      </div>
      <span
        className={cn(
          'text-[10px] font-semibold tracking-widest uppercase whitespace-nowrap transition-colors duration-300',
          active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground opacity-40',
        )}
      >
        {STEP_LABELS[num]}
      </span>
    </div>
  );
}

function StepperTrack({ current }: { current: Step }) {
  const steps = [1, 2, 3, 4] as const;
  return (
    <div className="px-8 py-5 border-b border-border bg-card/40">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start">
          {steps.map((s, idx) => (
            <div key={s} className={cn('flex items-start', idx < steps.length - 1 && 'flex-1')}>
              <StepDot num={s} current={current} />
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-[2px] mt-[18px] mx-1 transition-colors duration-500',
                    current > s ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared primitives ──────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground block mb-1.5">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({ title, icon, children, badge }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; badge?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CurrencyInput({ label, value, onChange, hint, showMargin, margin }: {
  label: string; value: string; onChange: (v: string) => void;
  hint?: string; showMargin?: boolean; margin?: number | null;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-7 pr-24"
          placeholder="0.00"
        />
        {showMargin && margin !== null && margin !== undefined && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
            {margin}% margin
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground italic">{hint}</p>}
    </div>
  );
}

// ── Step 1: Media & Category ───────────────────────────────────────────────────

function Step1Panel({
  catId, setCatId, categories, pendingImgs, fileInputRef, onFilePick, onRemovePending,
}: {
  catId: string; setCatId: (v: string) => void; categories: Category[];
  pendingImgs: PendingImg[]; fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilePick: (f: FileList | null) => void; onRemovePending: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Gallery upload */}
      <SectionCard title="Product Gallery" icon={<ImageIcon size={15} className="text-primary" />}
        badge={<span className="text-[10px] text-muted-foreground">Recommended 1200×1200 px</span>}>
        <div
          className="relative group border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center py-10 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-200"
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUpload size={36} className="text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
          <p className="text-sm font-semibold text-foreground mb-1">Drop images here</p>
          <p className="text-xs text-muted-foreground">or click to browse your files</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFilePick(e.target.files)}
          />
        </div>

        {pendingImgs.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {pendingImgs.map((img) => (
              <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemovePending(img.id); }}
                    className="p-1.5 bg-destructive/90 text-destructive-foreground rounded-md hover:scale-110 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {/* Empty slot hints */}
            {pendingImgs.length < 4 && Array.from({ length: 4 - pendingImgs.length }).map((_, idx) => (
              <div
                key={idx}
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors"
              >
                <ImageIcon size={20} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Category */}
      <SectionCard title="Classification" icon={<Link2 size={15} className="text-primary" />}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Primary Category</FieldLabel>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name ?? cat.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-2.5 p-3 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground">
            <span className="text-primary mt-0.5">ℹ</span>
            Accurate classification improves search visibility across inventory systems.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Step 2: Product Details ────────────────────────────────────────────────────

function Step2Panel({
  name, setName, sku, barcode, setBarcode,
  unit, setUnit, description, setDescription,
  manufacturer, setManufacturer, packSize, setPackSize,
}: {
  name: string; setName: (v: string) => void;
  sku: string;
  barcode: string; setBarcode: (v: string) => void;
  unit: ProductUnit | ''; setUnit: (v: ProductUnit | '') => void;
  description: string; setDescription: (v: string) => void;
  manufacturer: string; setManufacturer: (v: string) => void;
  packSize: string; setPackSize: (v: string) => void;
}) {
  return (
    <SectionCard title="Product Details" icon={<CheckCircle2 size={15} className="text-primary" />}
      badge={<span className="text-[10px] text-muted-foreground italic">* Required</span>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <FieldLabel required>Product Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cooking Oil 5L"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>SKU</FieldLabel>
            <Input value={sku} readOnly placeholder="Auto-generated from name" className="bg-muted/50 cursor-not-allowed" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Barcode</FieldLabel>
            <div className="relative">
              <ScanBarcode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Unit of Measure</FieldLabel>
            <Select value={unit} onValueChange={(v) => setUnit(v as ProductUnit)}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit…" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Manufacturer / Brand</FieldLabel>
            <Input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g. Amul, Nestle, 3M"
            />
          </div>
          <div>
            <FieldLabel>Pack Size (units per pack)</FieldLabel>
            <Input
              type="number"
              min="1"
              step="1"
              value={packSize}
              onChange={(e) => setPackSize(e.target.value)}
              placeholder="Leave blank if sold individually"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a detailed description including features, benefits, and specifications…"
            className="resize-none"
          />
        </div>

        <div className="flex items-start gap-2.5 p-3 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground">
          <span className="text-primary mt-0.5">💡</span>
          Pro tip: Use unique SKUs for each product variant to ensure accurate inventory tracking across warehouses.
        </div>
      </div>
    </SectionCard>
  );
}

// ── Step 3: Pricing ───────────────────────────────────────────────────────────

function Step3Panel({
  costPrice, setCostPrice, retailPrice, setRetailPrice,
  loyaltyPrice, setLoyaltyPrice, wholesalePrice, setWholesalePrice,
  transferPrice, setTransferPrice, reorderPoint, setReorderPoint, margin,
}: {
  costPrice: string; setCostPrice: (v: string) => void;
  retailPrice: string; setRetailPrice: (v: string) => void;
  loyaltyPrice: string; setLoyaltyPrice: (v: string) => void;
  wholesalePrice: string; setWholesalePrice: (v: string) => void;
  transferPrice: string; setTransferPrice: (v: string) => void;
  reorderPoint: string; setReorderPoint: (v: string) => void;
  margin: number | null;
}) {
  return (
    <div className="space-y-5">
      <SectionCard title="Pricing Configuration" icon={<CheckCircle2 size={15} className="text-primary" />}>
        <div className="space-y-5">
          {/* Core pricing */}
          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput
              label="Cost Price *"
              value={costPrice}
              onChange={setCostPrice}
              hint="Supplier purchase price per unit."
            />
            <CurrencyInput
              label="Retail Price *"
              value={retailPrice}
              onChange={setRetailPrice}
              hint="Standard selling price for consumers."
              showMargin
              margin={margin}
            />
          </div>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
              Bulk & Distribution Pricing
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Secondary pricing */}
          <div className="grid grid-cols-3 gap-4">
            <CurrencyInput label="Loyalty Price"   value={loyaltyPrice}   onChange={setLoyaltyPrice} />
            <CurrencyInput label="Wholesale Price" value={wholesalePrice} onChange={setWholesalePrice} />
            <CurrencyInput label="Transfer Price"  value={transferPrice}  onChange={setTransferPrice} />
          </div>
        </div>
      </SectionCard>

      {/* Inventory threshold */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <TriangleAlert size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Inventory Threshold</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set the minimum stock level to trigger automated restock notifications.
            </p>
          </div>
          <div className="w-44">
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                placeholder="0"
                className="pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                units
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">System reorder point</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-muted/30 border border-border rounded-xl text-xs text-muted-foreground">
        <span className="text-amber-400 mt-0.5">💡</span>
        <p>
          <strong className="text-foreground">Pro Tip — Margin Analysis:</strong> The system computes gross margin
          from Cost vs. Retail automatically. For wholesale distribution, ensure Transfer Price covers logistical
          overheads to maintain per-department profitability.
        </p>
      </div>
    </div>
  );
}

// ── Step 4: Suppliers & Finalize ──────────────────────────────────────────────

function Step4Panel({
  productName, suppliers, productSuppliers,
  supId, setSupId, supCost, setSupCost,
  supLeadDays, setSupLeadDays, supMinQty, setSupMinQty,
  supDefault, setSupDefault, confirmed, setConfirmed,
  onLinkSupplier, onUnlinkSupplier, linkPending, unlinkPending,
}: {
  productName: string | undefined;
  suppliers: Supplier[]; productSuppliers: ProductSupplier[];
  supId: string; setSupId: (v: string) => void;
  supCost: string; setSupCost: (v: string) => void;
  supLeadDays: string; setSupLeadDays: (v: string) => void;
  supMinQty: string; setSupMinQty: (v: string) => void;
  supDefault: boolean; setSupDefault: (v: boolean) => void;
  confirmed: boolean; setConfirmed: (v: boolean) => void;
  onLinkSupplier: () => void; onUnlinkSupplier: (supplierId: string) => void;
  linkPending: boolean; unlinkPending: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionCard
        title="Suppliers"
        icon={<Link2 size={15} className="text-primary" />}
        badge={
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground border border-border rounded px-2 py-0.5">
            Optional
          </span>
        }
      >
        {/* Linked suppliers list */}
        {productSuppliers.length > 0 && (
          <div className="mb-4 space-y-2">
            {productSuppliers.map((link) => {
              const sup = suppliers.find((s) => s.id === link.supplierId);
              return (
                <div key={link.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-foreground">{sup?.name ?? link.supplierId}</span>
                    {link.isDefault && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-primary bg-primary/10 rounded px-1.5 py-0.5">
                        Default
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {link.unitCost != null && `Cost $${link.unitCost}`}
                      {link.leadTimeDays != null && ` · Lead ${link.leadTimeDays}d`}
                      {link.minOrderQty != null && ` · MOQ ${link.minOrderQty}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnlinkSupplier(link.supplierId)}
                    disabled={unlinkPending}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {productSuppliers.length === 0 && (
          <p className="text-xs text-muted-foreground mb-4">No suppliers linked yet.</p>
        )}

        <div className="space-y-3 pt-3 border-t border-border">
          <Select value={supId} onValueChange={setSupId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a supplier to link…" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <Input type="number" step="0.01" min="0" placeholder="Unit cost" value={supCost} onChange={(e) => setSupCost(e.target.value)} className="pr-6" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
            </div>
            <Input type="number" min="0" placeholder="Lead days" value={supLeadDays} onChange={(e) => setSupLeadDays(e.target.value)} />
            <Input type="number" min="0" placeholder="Min qty"   value={supMinQty}   onChange={(e) => setSupMinQty(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input text-primary"
              checked={supDefault}
              onChange={(e) => setSupDefault(e.target.checked)}
            />
            Set as default supplier
          </label>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!supId || linkPending}
            onClick={onLinkSupplier}
            className="gap-2"
          >
            <Link2 size={14} />
            {linkPending ? 'Linking…' : 'Link Supplier'}
          </Button>
        </div>
      </SectionCard>

      {/* Confirmation */}
      <div className={cn(
        'rounded-xl border p-5 transition-colors duration-200',
        confirmed ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
      )}>
        <label className="flex items-start gap-4 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 rounded border-input text-primary flex-shrink-0"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">Confirm Product Readiness</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              By completing this onboarding, the product{' '}
              {productName && <strong className="text-foreground">"{productName}"</strong>} will be
              made active in the system and listed for purchase orders immediately.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export function ProductOnboardingWizard({ editingProduct, onClose, onSuccess }: WizardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState<Step>(1);
  const [animKey, setAnimKey]     = useState(0);
  const [animDir, setAnimDir]     = useState<'forward' | 'back'>('forward');
  const [productId, setProductId] = useState<string | null>(editingProduct?.id ?? null);
  const [pendingImgs, setPendingImgs] = useState<PendingImg[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  // Step 1
  const [catId, setCatId]       = useState(editingProduct?.categoryId ?? '');
  // Step 2
  const [name, setName]         = useState(editingProduct?.name ?? '');
  const [sku, setSku]           = useState(editingProduct?.sku ?? '');
  const [barcode, setBarcode]   = useState(editingProduct?.barcode ?? '');
  const [unit, setUnit]         = useState<ProductUnit | ''>(editingProduct?.unit ?? '');
  const [description, setDescription] = useState(editingProduct?.description ?? '');
  const [manufacturer, setManufacturer] = useState(editingProduct?.manufacturer ?? '');
  const [packSize, setPackSize] = useState(editingProduct?.packSize != null ? String(editingProduct.packSize) : '');
  // Step 3
  const [costPrice, setCostPrice]         = useState(editingProduct?.costPrice != null ? String(editingProduct.costPrice) : '');
  const [retailPrice, setRetailPrice]     = useState(editingProduct?.retailPrice != null ? String(editingProduct.retailPrice) : '');
  const [loyaltyPrice, setLoyaltyPrice]   = useState(editingProduct?.loyaltyPrice != null ? String(editingProduct.loyaltyPrice) : '');
  const [wholesalePrice, setWholesalePrice] = useState(editingProduct?.wholesalePrice != null ? String(editingProduct.wholesalePrice) : '');
  const [transferPrice, setTransferPrice] = useState(editingProduct?.transferPrice != null ? String(editingProduct.transferPrice) : '');
  const [reorderPoint, setReorderPoint]   = useState(editingProduct?.reorderPoint != null ? String(editingProduct.reorderPoint) : '');
  // Step 4 supplier form
  const [supId, setSupId]           = useState('');
  const [supCost, setSupCost]       = useState('');
  const [supLeadDays, setSupLeadDays] = useState('');
  const [supMinQty, setSupMinQty]   = useState('');
  const [supDefault, setSupDefault] = useState(false);

  // API
  const createMutation      = Products.useCreate();
  const updateMutation      = Products.useUpdate();
  const uploadImgMutation   = useUploadProductImage();
  const linkSupMutation     = useLinkProductSupplier(productId ?? undefined);
  const unlinkSupMutation   = useUnlinkProductSupplier(productId ?? undefined);
  const { data: categories }       = useCategoryParents();
  const { data: suppliers }        = Suppliers.useList();
  const { data: productSuppliers, refetch: refetchSups } = useProductSuppliers(productId ?? undefined);

  // SKU preview: only while creating a brand-new, not-yet-persisted product.
  const isEditing = !!editingProduct;
  const debouncedName = useDebounce(name, 300);
  const { data: nextSkuData } = useNextSku(!isEditing && !productId ? debouncedName : '');
  useEffect(() => {
    if (!isEditing && !productId && nextSkuData?.sku) {
      setSku(nextSkuData.sku);
    }
  }, [nextSkuData, isEditing, productId]);

  const margin =
    costPrice && retailPrice && Number(costPrice) > 0 && Number(retailPrice) > 0
      ? Math.round((1 - Number(costPrice) / Number(retailPrice)) * 100)
      : null;

  // Revoke blob URLs on unmount
  const pendingImgsRef = useRef<PendingImg[]>([]);
  pendingImgsRef.current = pendingImgs;
  useEffect(() => {
    return () => { for (const img of pendingImgsRef.current) URL.revokeObjectURL(img.preview); };
  }, []);

  const navigate = (next: Step, dir: 'forward' | 'back') => {
    setAnimDir(dir);
    setStep(next);
    setAnimKey((k) => k + 1);
  };

  const handleFilePick = (files: FileList | null) => {
    if (!files?.length) return;
    const newImgs = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingImgs((prev) => [...prev, ...newImgs]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePending = (id: string) => {
    setPendingImgs((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleStep1Next = async () => {
    if (!name.trim()) { toast.error('Product name is required.'); return; }
    try {
      let pid = productId;
      if (!pid) {
        const created = await createMutation.mutateAsync({
          name: name.trim(),
          sku: undefined, // server generates the authoritative SKU; the field above is preview-only
          barcode: barcode || undefined,
          unit: unit || undefined,
          description: description || undefined,
          manufacturer: manufacturer || undefined,
          packSize: packSize ? Number(packSize) : undefined,
        });
        pid = created.id;
        setProductId(pid);
        setSku(created.sku ?? '');
      } else {
        await updateMutation.mutateAsync({
          id: pid,
          body: {
            name: name.trim(),
            sku: sku || undefined,
            barcode: barcode || undefined,
            unit: unit || undefined,
            description: description || undefined,
            manufacturer: manufacturer || undefined,
            packSize: packSize ? Number(packSize) : undefined,
          },
        });
      }
      navigate(2, 'forward');
    } catch { /* errors are toasted by mutations */ }
  };

  const handleStep2Next = async () => {
    if (!productId) return;
    try {
      await updateMutation.mutateAsync({ id: productId, body: { categoryId: catId || undefined } });
      for (const img of pendingImgs) {
        await uploadImgMutation.mutateAsync({ productId, file: img.file });
      }
      setPendingImgs((prev) => { for (const img of prev) URL.revokeObjectURL(img.preview); return []; });
      navigate(3, 'forward');
    } catch { /* toasted */ }
  };

  const handleStep3Next = async () => {
    if (!productId) return;
    try {
      await updateMutation.mutateAsync({
        id: productId,
        body: {
          costPrice: costPrice ? Number(costPrice) : undefined,
          retailPrice: retailPrice ? Number(retailPrice) : undefined,
          loyaltyPrice: loyaltyPrice ? Number(loyaltyPrice) : undefined,
          wholesalePrice: wholesalePrice ? Number(wholesalePrice) : undefined,
          transferPrice: transferPrice ? Number(transferPrice) : undefined,
          reorderPoint: reorderPoint ? Number(reorderPoint) : undefined,
        },
      });
      navigate(4, 'forward');
    } catch { /* toasted */ }
  };

  const handleLinkSupplier = async () => {
    if (!supId) return;
    try {
      await linkSupMutation.mutateAsync({
        supplierId: supId,
        unitCost: supCost ? Number(supCost) : undefined,
        leadTimeDays: supLeadDays ? Number(supLeadDays) : undefined,
        minOrderQty: supMinQty ? Number(supMinQty) : undefined,
        isDefault: supDefault,
      });
      setSupId(''); setSupCost(''); setSupLeadDays(''); setSupMinQty(''); setSupDefault(false);
      void refetchSups();
    } catch { /* toasted */ }
  };

  const handleFinish = () => {
    toast.success(editingProduct ? 'Product updated successfully.' : 'Product onboarded successfully!');
    onSuccess();
  };

  const isBusy = createMutation.isPending || updateMutation.isPending || uploadImgMutation.isPending;
  const canSkipForward = !!productId && step < 4;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {editingProduct ? 'Edit Product' : 'New Product Onboarding'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {editingProduct
              ? 'Update product details across all steps.'
              : 'Complete the 4-step process to list a new item in your inventory.'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Stepper */}
      <StepperTrack current={step} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-7 px-8 custom-scrollbar">
        <div
          key={animKey}
          className={cn(
            'max-w-3xl mx-auto',
            animDir === 'forward' ? 'animate-step-in-right' : 'animate-step-in-left',
          )}
        >
          {step === 1 && (
            <Step2Panel
              name={name} setName={setName}
              sku={sku}
              barcode={barcode} setBarcode={setBarcode}
              unit={unit} setUnit={setUnit}
              description={description} setDescription={setDescription}
              manufacturer={manufacturer} setManufacturer={setManufacturer}
              packSize={packSize} setPackSize={setPackSize}
            />
          )}
          {step === 2 && (
            <Step1Panel
              catId={catId} setCatId={setCatId}
              categories={categories ?? []}
              pendingImgs={pendingImgs}
              fileInputRef={fileInputRef}
              onFilePick={handleFilePick}
              onRemovePending={removePending}
            />
          )}
          {step === 3 && (
            <Step3Panel
              costPrice={costPrice} setCostPrice={setCostPrice}
              retailPrice={retailPrice} setRetailPrice={setRetailPrice}
              loyaltyPrice={loyaltyPrice} setLoyaltyPrice={setLoyaltyPrice}
              wholesalePrice={wholesalePrice} setWholesalePrice={setWholesalePrice}
              transferPrice={transferPrice} setTransferPrice={setTransferPrice}
              reorderPoint={reorderPoint} setReorderPoint={setReorderPoint}
              margin={margin}
            />
          )}
          {step === 4 && (
            <Step4Panel
              productName={name || editingProduct?.name}
              suppliers={suppliers ?? []}
              productSuppliers={productSuppliers ?? []}
              supId={supId} setSupId={setSupId}
              supCost={supCost} setSupCost={setSupCost}
              supLeadDays={supLeadDays} setSupLeadDays={setSupLeadDays}
              supMinQty={supMinQty} setSupMinQty={setSupMinQty}
              supDefault={supDefault} setSupDefault={setSupDefault}
              confirmed={confirmed} setConfirmed={setConfirmed}
              onLinkSupplier={() => void handleLinkSupplier()}
              onUnlinkSupplier={(sid) => void unlinkSupMutation.mutate(sid)}
              linkPending={linkSupMutation.isPending}
              unlinkPending={unlinkSupMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-border bg-card/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step > 1 ? (
            <Button
              type="button" variant="outline"
              onClick={() => navigate((step - 1) as Step, 'back')}
              disabled={isBusy}
              className="gap-2"
            >
              <ArrowLeft size={15} /> Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkipForward && (
            <Button
              type="button" variant="ghost"
              onClick={() => navigate((step + 1) as Step, 'forward')}
              disabled={isBusy}
              className="text-muted-foreground text-xs"
            >
              Skip
            </Button>
          )}

          {step === 1 && (
            <Button type="button" onClick={() => void handleStep1Next()} disabled={isBusy} className="gap-2 min-w-44">
              {isBusy ? 'Saving…' : <><span>Attach Images & Category</span><ArrowRight size={15} /></>}
            </Button>
          )}
          {step === 2 && (
            <Button type="button" onClick={() => void handleStep2Next()} disabled={isBusy || !productId} className="gap-2 min-w-40">
              {isBusy ? 'Saving…' : <><span>Adjust Pricing</span><ArrowRight size={15} /></>}
            </Button>
          )}
          {step === 3 && (
            <Button type="button" onClick={() => void handleStep3Next()} disabled={isBusy || !productId} className="gap-2 min-w-44">
              {isBusy ? 'Saving…' : <><span>Attach Supplier Info</span><ArrowRight size={15} /></>}
            </Button>
          )}
          {step === 4 && (
            <Button
              type="button" onClick={handleFinish}
              disabled={!confirmed}
              className="gap-2 min-w-44"
            >
              <CheckCircle2 size={15} />
              {editingProduct ? 'Save Changes' : 'Onboard Product'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
