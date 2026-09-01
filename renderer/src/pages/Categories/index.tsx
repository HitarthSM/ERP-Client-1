import { useMemo, useState } from 'react';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FilterDropdown } from '../../components/FilterDropdown';
import { CategoryDetailModal } from '../../components/CategoryDetailModal';
import { ResourceSelect } from '../../components/ResourceSelect';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Categories, Organizations, useCategoryParents } from '../../api';
import { useSession } from '../../context/SessionContext';
import { usePagination } from '../../hooks/usePagination';
import { formatEntityLabel } from '../../lib/entityLabel';
import type { Category } from '../../types';

// Every field here matches core-apis' CreateCategoryRequest/UpdateCategoryRequest exactly
// (categories.controller.ts + the request DTOs): no `code` field exists on the backend,
// and `isActive` is only settable via update (create always starts active).
interface FormState {
  name: string;
  description: string;
  parentId: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: '', description: '', parentId: '', isActive: true };

export default function CategoriesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [viewRow, setViewRow] = useState<Category | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const createMutation = Categories.useCreate();
  const updateMutation = Categories.useUpdate();
  const removeMutation = Categories.useDelete();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (statusFilter) next.isActive = statusFilter;
    if (typeFilter !== null) next.hasParent = typeFilter;
    return Object.keys(next).length ? next : undefined;
  }, [statusFilter, typeFilter]);

  const { data, isLoading, error, refetch } = Categories.useSearch({ page, search: debouncedSearch, filters });
  const { data: allCategories } = Categories.useList();
  const categoryName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of allCategories ?? []) {
      m.set(c.id, formatEntityLabel({ name: c.name, id: c.id }));
    }
    return m;
  }, [allCategories]);
  const { organization, isSuperAdmin } = useSession();
  const { data: orgs } = Organizations.useList(isSuperAdmin);
  const orgName = useMemo(() => {
    const m = new Map<string, string>();
    if (organization) {
      m.set(organization.id, formatEntityLabel({ name: organization.name, id: organization.id }));
    }
    for (const o of orgs ?? []) m.set(o.id, formatEntityLabel({ name: o.name, id: o.id }));
    return m;
  }, [orgs, organization]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: Category) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      description: row.description ?? '',
      parentId: row.parentId ?? '',
      isActive: row.isActive !== false,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Category> = {
      name: form.name,
      description: form.description || undefined,
      parentId: form.parentId || undefined,
      ...(editing ? { isActive: form.isActive } : {}),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      createMutation.mutate(body, { onSuccess: closeDrawer });
    }
  };

  const columns: Column<Category>[] = [
    { key: 'name', label: 'Name' },
    {
      key: 'parentId',
      label: 'Parent',
      render: (row) =>
        row.parentId ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
            {categoryName.get(row.parentId) ?? formatEntityLabel({ id: row.parentId })}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
            Yes
          </span>
        ),
    },
    { key: 'description', label: 'Description' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (row.isActive === false ? 'Inactive' : 'Active'),
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Categories"
        description="Manage the product category hierarchy."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search categories…"
        isAdmin={true}
        onAdd={openCreate}
        addLabel="Define Category"
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
        toolbar={
          <>
            <FilterDropdown
              label="Status"
              options={[
                { value: 'true',  label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
            />
            <FilterDropdown
              label="Type"
              options={[
                { value: 'false', label: 'Parent Categories' },
                { value: 'true',  label: 'Sub Categories' },
              ]}
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
            />
          </>
        }
      />

      <CategoryDetailModal
        category={viewRow}
        categoryName={categoryName}
        orgName={orgName}
        onClose={() => setViewRow(null)}
        onEdit={(cat) => { setViewRow(null); openEdit(cat); }}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <Button type="submit" form="category-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Parent Category">
            <ResourceSelect
              resource={{ useList: useCategoryParents }}
              getLabel={(c) => formatEntityLabel({ name: c.name, id: c.id })}
              value={form.parentId}
              onValueChange={(v) => setForm({ ...form, parentId: v })}
              placeholder="No parent (top level)"
              allowNone
              noneLabel="None (top level)"
              excludeId={editing?.id}
            />
          </Field>
          {editing && (
            <Field label="Active">
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="category-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
              </div>
            </Field>
          )}
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
