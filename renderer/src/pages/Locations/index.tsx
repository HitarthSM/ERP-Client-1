import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ViewDrawer } from '../../components/ViewDrawer';
import { FilterDropdown } from '../../components/FilterDropdown';
import { SingleImageUploader } from '../../components/SingleImageUploader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Locations,
  Organizations,
  useUploadLocationImage,
  useRemoveLocationImage,
  useListCountries,
  useListStates,
  useListCities,
} from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { useSession } from '../../context/SessionContext';
import type { Location, LocationType } from '../../types';

const TYPE_OPTIONS: LocationType[] = ['store', 'warehouse'];

interface FormState {
  name: string;
  type: LocationType | '';
  address: string;
  countryName: string;
  countryId: number | null;
  stateName: string;
  stateId: number | null;
  cityName: string;
  phone: string;
  organizationId: string;
}

interface PendingImage { file: File; previewUrl: string }

const EMPTY_FORM: FormState = {
  name: '', type: '',
  address: '',
  countryName: '', countryId: null,
  stateName: '', stateId: null,
  cityName: '',
  phone: '',
  organizationId: '',
};

export default function LocationsPage() {
  const { pathname } = useLocation();
  const { isSuperAdmin } = useSession();
  const warehouseOnly = pathname.startsWith('/warehouse');
  const storeOnly     = pathname.startsWith('/stores');
  const emptyForm: FormState = warehouseOnly
    ? { ...EMPTY_FORM, type: 'warehouse' }
    : storeOnly
      ? { ...EMPTY_FORM, type: 'store' }
      : EMPTY_FORM;

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [editing, setEditing]             = useState<Location | null>(null);
  const [form, setForm]                   = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget]   = useState<Location | null>(null);
  const [viewRow, setViewRow]             = useState<Location | null>(null);
  const [pendingImage, setPendingImage]   = useState<PendingImage | null>(null);
  const [serverImage, setServerImage]     = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [statusFilter, setStatusFilter]   = useState<string | null>(null);
  const pendingRef = useRef<PendingImage | null>(null);
  pendingRef.current = pendingImage;

  useEffect(() => {
    return () => { if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.previewUrl); };
  }, []);

  const createMutation      = Locations.useCreate();
  const updateMutation      = Locations.useUpdate();
  const removeMutation      = Locations.useDelete();
  const uploadImageMutation = useUploadLocationImage();
  const removeImageMutation = useRemoveLocationImage();
  const { data: orgs = [] } = Organizations.useList(isSuperAdmin);

  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (warehouseOnly) next.type = 'warehouse';
    else if (storeOnly) next.type = 'store';
    if (statusFilter)  next.isActive = statusFilter;
    return Object.keys(next).length ? next : undefined;
  }, [warehouseOnly, storeOnly, statusFilter]);

  const { data, isLoading, error, refetch } = Locations.useSearch({ page, search: debouncedSearch, filters });

  const { data: countries = [] } = useListCountries();
  const { data: states = [] }    = useListStates(form.countryId);
  const { data: cities = [] }    = useListCities(form.stateId);

  const clearPending = () => {
    setPendingImage((prev) => { if (prev) URL.revokeObjectURL(prev.previewUrl); return null; });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setServerImage(false);
    clearPending();
    setDrawerOpen(true);
  };

  const openEdit = (row: Location) => {
    setEditing(row);
    const country = countries.find((c) => c.name === row.country) ?? null;
    setForm({
      name:        row.name        ?? '',
      type:        row.type        ?? '',
      address:     row.address     ?? '',
      countryName: row.country     ?? '',
      countryId:   country?.id     ?? null,
      stateName:   row.state       ?? '',
      stateId:     null,
      cityName:    row.city        ?? '',
      phone:       row.phone       ?? '',
      organizationId: row.organizationId ?? '',
    });
    setServerImage(!!row.imageKey);
    clearPending();
    setDrawerOpen(true);
  };

  const closeDrawer = () => { clearPending(); setDrawerOpen(false); };

  const uploadFor = async (locationId: string, file: File) => {
    setUploading(true);
    try {
      await uploadImageMutation.mutateAsync({ locationId, file });
      toast.success('Image uploaded');
      setServerImage(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveServer = async () => {
    if (!editing) return;
    setUploading(true);
    try {
      await removeImageMutation.mutateAsync(editing.id);
      toast.success('Image removed');
      setServerImage(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Location> = {
      name:    form.name,
      type:    form.type   || undefined,
      address: form.address || undefined,
      city:    form.cityName   || undefined,
      state:   form.stateName  || undefined,
      country: form.countryName || undefined,
      phone:   form.phone  || undefined,
      organizationId: isSuperAdmin && !editing ? form.organizationId || undefined : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      if (isSuperAdmin && !form.organizationId) {
        toast.error('Select an organization');
        return;
      }
      const queued = pendingImage?.file;
      createMutation.mutate(body, {
        onSuccess: async (created) => {
          try { if (queued) await uploadFor(created.id, queued); } catch { /* toasted */ }
          clearPending();
          setDrawerOpen(false);
        },
      });
    }
  };

  const columns: Column<Location>[] = [
    { key: 'name',    label: 'Name' },
    { key: 'type',    label: 'Type' },
    { key: 'city',    label: 'City',    render: (r) => r.city    || '—' },
    { key: 'state',   label: 'State',   render: (r) => r.state   || '—' },
    { key: 'country', label: 'Country', render: (r) => r.country || '—' },
    {
      key: 'isActive',
      label: 'Status',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${r.isActive === false ? 'bg-red-500' : 'bg-green-500'}`} />
          {r.isActive === false ? 'Inactive' : 'Active'}
        </span>
      ),
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending || uploading;
  const pageTitle   = warehouseOnly ? 'Warehouses' : storeOnly ? 'Stores'     : 'Locations';
  const entityLabel = warehouseOnly ? 'Warehouse'  : storeOnly ? 'Store'      : 'Location';
  const pageDesc    = warehouseOnly
    ? 'Manage warehouse locations for your organization.'
    : storeOnly
      ? 'Manage store locations for your organization.'
      : 'Manage store and warehouse locations for your organization.';

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title={pageTitle}
        description={pageDesc}
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        toolbar={
          <FilterDropdown
            label="Status"
            options={[
              { value: 'true',  label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          />
        }
        searchPlaceholder={warehouseOnly ? 'Search warehouses…' : storeOnly ? 'Search stores…' : 'Search locations…'}
        isAdmin={true}
        onAdd={openCreate}
        addLabel={warehouseOnly ? 'Configure Warehouse' : 'Configure Location'}
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title={`View ${entityLabel}`}
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
        footer={
          <>
            <Button type="submit" form="location-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer} disabled={uploading}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="location-form" onSubmit={handleSubmit} className="space-y-4">
          {isSuperAdmin && !editing && (
            <Field label="Organization" required>
              <Select
                value={form.organizationId || undefined}
                onValueChange={(v) => setForm({ ...form, organizationId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select organization…" /></SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>

          {!warehouseOnly && !storeOnly && (
            <Field label="Type" required>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LocationType })}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>

          <Field label="Country">
            <Select
              value={form.countryId?.toString() ?? ''}
              onValueChange={(v) => {
                const country = countries.find((c) => c.id === Number(v));
                setForm({ ...form, countryId: Number(v), countryName: country?.name ?? '', stateId: null, stateName: '', cityName: '' });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select country…" /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="State">
            <Select
              value={form.stateId?.toString() ?? ''}
              onValueChange={(v) => {
                const state = states.find((s) => s.id === Number(v));
                setForm({ ...form, stateId: Number(v), stateName: state?.name ?? '', cityName: '' });
              }}
              disabled={!form.countryId}
            >
              <SelectTrigger><SelectValue placeholder={form.countryId ? 'Select state…' : 'Select country first'} /></SelectTrigger>
              <SelectContent>
                {states.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="City">
            <Select
              value={form.cityName}
              onValueChange={(v) => setForm({ ...form, cityName: v })}
              disabled={!form.stateId}
            >
              <SelectTrigger><SelectValue placeholder={form.stateId ? 'Select city…' : 'Select state first'} /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>

          {editing && (
            <Field label="Status">
              <Select
                value={editing.isActive === false ? 'false' : 'true'}
                onValueChange={(v) => setEditing({ ...editing, isActive: v === 'true' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Image">
            <SingleImageUploader
              serverImageKey={serverImage ? (editing?.imageKey ?? 'set') : undefined}
              pendingPreviewUrl={pendingImage?.previewUrl}
              pendingFile={pendingImage?.file}
              uploading={uploading}
              editing={!!editing}
              onFilePick={(file) => {
                if (editing) {
                  void uploadFor(editing.id, file);
                } else {
                  clearPending();
                  const previewUrl = URL.createObjectURL(file);
                  setPendingImage({ file, previewUrl });
                }
              }}
              onClearPending={clearPending}
              onRemoveServer={handleRemoveServer}
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${entityLabel}`}
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
