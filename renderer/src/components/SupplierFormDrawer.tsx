import { useEffect, useState } from 'react';
import { FormDrawer, Field } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Suppliers } from '../api';
import type { Supplier } from '../types';

interface FormState {
  name: string;
  email: string;
  phone: string;
  contactPerson: string;
  address: string;
  taxId: string;
}

function emptyForm(): FormState {
  return { name: '', email: '', phone: '', contactPerson: '', address: '', taxId: '' };
}

export interface SupplierFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: (supplier: Supplier) => void;
}

export function SupplierFormDrawer({ open, onClose, onSaved }: SupplierFormDrawerProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const createMutation = Suppliers.useCreate();
  const isSaving = createMutation.isPending;

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const canSubmit = form.name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createMutation.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        address: form.address.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
      },
      { onSuccess: (supplier) => onSaved(supplier) },
    );
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add Supplier"
      footer={
        <>
          <Button type="submit" form="supplier-form-drawer" disabled={isSaving || !canSubmit}>
            {isSaving ? 'Saving…' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="supplier-form-drawer" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Company / Supplier Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Contact Person">
          <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="PIN / Tax ID">
          <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
        </Field>
      </form>
    </FormDrawer>
  );
}
