import { useEffect, useState } from 'react';
import { FormDrawer, Field } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Customers, BillingSettings } from '../api';
import type { Customer, CustomerType } from '../types';

const CUSTOMER_TYPE_OPTIONS: Array<{ value: CustomerType; label: string }> = [
  { value: 'regular', label: 'Regular' },
  { value: 'new', label: 'New' },
  { value: 'shop', label: 'Shop' },
  { value: 'big_customer', label: 'Big Customer' },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  shopName: string;
  address: string;
  pinCode: string;
  creditLimit: string;
  customerType: CustomerType;
  discountPercent: string;
  skipOverLimitApproval: '' | 'true' | 'false';
}

function emptyForm(initialName?: string, defaultCustomerType: CustomerType = 'new'): FormState {
  return {
    name: initialName ?? '',
    email: '',
    phone: '',
    gstin: '',
    shopName: '',
    address: '',
    pinCode: '',
    creditLimit: '',
    customerType: defaultCustomerType,
    discountPercent: '',
    skipOverLimitApproval: '',
  };
}

function formFromCustomer(customer: Customer): FormState {
  return {
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    gstin: customer.gstin ?? '',
    shopName: customer.shopName ?? '',
    address: customer.address ?? '',
    pinCode: customer.pinCode ?? '',
    creditLimit: customer.creditLimit != null ? String(customer.creditLimit) : '',
    customerType: (customer.customerType as CustomerType) || 'regular',
    discountPercent: customer.discountPercent != null ? String(customer.discountPercent) : '',
    skipOverLimitApproval:
      customer.skipOverLimitApproval == null ? '' : customer.skipOverLimitApproval ? 'true' : 'false',
  };
}

export interface CustomerFormDrawerProps {
  open: boolean;
  onClose: () => void;
  editing?: Customer | null;
  initialName?: string;
  requireCreditLimit?: boolean;
  onSaved: (customer: Customer) => void;
}

export function CustomerFormDrawer({
  open,
  onClose,
  editing,
  initialName,
  requireCreditLimit,
  onSaved,
}: CustomerFormDrawerProps) {
  const createDefaultType: CustomerType = requireCreditLimit ? 'regular' : 'new';
  const [form, setForm] = useState<FormState>(() =>
    editing ? formFromCustomer(editing) : emptyForm(initialName, createDefaultType),
  );
  const createMutation = Customers.useCreate();
  const updateMutation = Customers.useUpdate();
  const { data: typeRules = [] } = BillingSettings.useCustomerTypeRules();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(editing ? formFromCustomer(editing) : emptyForm(initialName, createDefaultType));
  }, [open, editing, initialName, createDefaultType]);

  const creditLimitValue = Number(form.creditLimit.trim());
  const creditLimitOk = !requireCreditLimit || (form.creditLimit.trim() !== '' && creditLimitValue > 0);
  const canSubmit = form.name.trim() && creditLimitOk;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const trimmedCreditLimit = form.creditLimit.trim();
    const trimmedDiscount = form.discountPercent.trim();
    const body = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
      shopName: form.shopName.trim() || undefined,
      address: form.address.trim() || undefined,
      pinCode: form.pinCode.trim() || undefined,
      creditLimit: trimmedCreditLimit ? Number(trimmedCreditLimit) : undefined,
      customerType: form.customerType,
      discountPercent: trimmedDiscount === '' ? null : Number(trimmedDiscount),
      skipOverLimitApproval: form.skipOverLimitApproval === '' ? null : form.skipOverLimitApproval === 'true',
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: (customer) => onSaved(customer) });
      return;
    }
    createMutation.mutate(body, { onSuccess: (customer) => onSaved(customer) });
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Customer' : requireCreditLimit ? 'Add Creditor' : 'Add Customer'}
      footer={
        <>
          <Button type="submit" form="customer-form-drawer" disabled={isSaving || !canSubmit}>
            {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="customer-form-drawer" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="GSTIN">
          <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
        </Field>
        <Field label="Shop / store name">
          <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="Postal PIN">
          <Input value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} />
        </Field>
        <Field label={requireCreditLimit ? 'Credit Limit (required)' : 'Credit Limit'}>
          <Input
            type="number"
            min="0"
            step="0.01"
            required={requireCreditLimit}
            value={form.creditLimit}
            onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
            placeholder={
              typeRules.find((r) => r.customerType === form.customerType)?.defaultCreditLimit != null
                ? `Type default: ${typeRules.find((r) => r.customerType === form.customerType)?.defaultCreditLimit}`
                : undefined
            }
          />
        </Field>
        <Field label="Customer Type">
          <select
            value={form.customerType}
            onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card outline-none focus:border-primary"
          >
            {CUSTOMER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Discount % override">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.discountPercent}
            onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
            placeholder="Inherit from type"
          />
        </Field>
        <Field label="Skip over-limit approval">
          <select
            value={form.skipOverLimitApproval}
            onChange={(e) => setForm({ ...form, skipOverLimitApproval: e.target.value as FormState['skipOverLimitApproval'] })}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card outline-none focus:border-primary"
          >
            <option value="">Inherit from type</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </form>
    </FormDrawer>
  );
}
