import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { CustomerAttachment, CustomerAttachmentKind, User } from '../types';
import { getAllUsers, getCachedAllUsers, deleteUser, updateCustomer, type StoredUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import {
  createCustomerProduct,
  deleteCustomerProduct,
  listCustomerProductsForAdmin,
  type CustomerProduct,
  updateCustomerProduct,
} from '../lib/customerProducts';
import { MOCK_PRODUCTS } from '../mockData';

const AdminCustomers: React.FC = () => {
  const { user } = useOutletContext<{ user: User }>();
  if (user.role === 'ENGINEER') {
    return <Navigate to="/dashboard" replace />;
  }

  const [customers, setCustomers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<StoredUser | null>(null);
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editCustomerSaving, setEditCustomerSaving] = useState(false);
  const [editCustomerError, setEditCustomerError] = useState<string | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [editCustomerAttachments, setEditCustomerAttachments] = useState<CustomerAttachment[]>([]);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<CustomerAttachment | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    catalogProductCode: '',
    label: '',
    quantity: 1,
    purchaseDate: '',
    warrantyStart: '',
    warrantyEnd: '',
    serialNumber: '',
    notes: '',
  });

  const getTodayForDateInput = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const catalogOptions = useMemo(
    () => MOCK_PRODUCTS.map((p) => ({ id: p.id, name: p.name })),
    []
  );

  const customersLenRef = useRef(0);
  useEffect(() => {
    customersLenRef.current = customers.length;
  }, [customers.length]);

  const loadCustomers = async () => {
    const hasRows = customersLenRef.current > 0;
    if (hasRows) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const users = await getAllUsers();
      let customerUsers = users.filter((u) => u.role === 'CUSTOMER');

      setCustomers(customerUsers);
    } catch (e) {
      // Let the outer retry loop handle the brief "Not authenticated" window post-login.
      const msg = e instanceof Error ? e.message : 'Failed to load customers.';
      if (String(msg).toLowerCase().includes('not authenticated')) {
        throw e;
      }
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    // Render cached customers immediately (fast UX), then refresh in background.
    const cached = getCachedAllUsers().filter((u) => u.role === 'CUSTOMER');
    if (cached.length > 0) {
      setCustomers(cached);
      setLoading(false);
    }

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, ms);
      });

    const loadWithRetry = async () => {
      // Fast retry for the brief window after logout/login where the app user exists
      // but Supabase session token isn't usable yet.
      const delays = [0, 150, 300, 600, 1000, 1500, 2500];
      for (const d of delays) {
        if (cancelled) return;
        if (d) await sleep(d);
        if (cancelled) return;
        try {
          await loadCustomers();
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.toLowerCase().includes('not authenticated')) {
            return;
          }
        }
      }
      if (!cancelled) {
        // Keep cached rows visible; only error if we have nothing to show.
        if (customersLenRef.current === 0) {
          setLoading(false);
          setError('Not authenticated');
        } else {
          setRefreshing(false);
        }
      }
    };

    loadWithRetry();

    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [user.id]);

  const handleDeleteCustomer = async (customer: StoredUser) => {
    if (!window.confirm(`Delete customer "${customer.name}" and all associated data?`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await deleteUser(customer.id);
      if (!result.success) {
        setError(result.error || 'Failed to delete customer.');
      } else {
        if (selected?.id === customer.id) {
          setSelected(null);
          setProducts([]);
        }
        await loadCustomers();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete customer.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      return (
        (c.accountNumber || '').toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const loadCustomerProducts = async (customer: StoredUser) => {
    setSelected(customer);
    setProducts([]);
    setProductsLoading(true);
    try {
      const list = await listCustomerProductsForAdmin(customer.id);
      setProducts(list);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, productsCount: list.length } : c))
      );
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const CUSTOMER_ATTACHMENTS_BUCKET = 'customer-attachments';
  const MAX_ATTACHMENTS_FILES = 20;
  const MAX_FILE_MB = 50;

  const toAttachmentKind = (file: File): CustomerAttachmentKind => {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const safeFileName = (name: string) =>
    name
      .trim()
      .replace(/[^\w.\- ]+/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 120) || 'file';

  const generateAttachmentPath = (customerId: string, fileName: string) => {
    const cleaned = safeFileName(fileName);
    const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${customerId}/${slug}-${cleaned}`;
  };

  const persistCustomerAttachments = async (customerId: string, attachments: CustomerAttachment[]) => {
    const { error } = await supabase
      .from('profiles')
      .update({ attachments })
      .eq('id', customerId);
    if (error) throw new Error(error.message || 'Failed to save attachments');
  };

  const openEditCustomer = (customer: StoredUser) => {
    setEditCustomerError(null);
    setEditCustomerForm({
      id: customer.id,
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setEditCustomerAttachments(customer.attachments ?? []);
    setAttachmentsError(null);
    setIsEditCustomerOpen(true);
  };

  const handleCustomerAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (!editCustomerForm.id) return;

    setAttachmentsError(null);
    const currentCount = editCustomerAttachments.length;
    if (currentCount + files.length > MAX_ATTACHMENTS_FILES) {
      setAttachmentsError(`You can attach up to ${MAX_ATTACHMENTS_FILES} files per customer.`);
      e.target.value = '';
      return;
    }

    const overLimit = Array.from(files).find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (overLimit) {
      setAttachmentsError(`Each file must be ${MAX_FILE_MB} MB or smaller.`);
      e.target.value = '';
      return;
    }

    setAttachmentsUploading(true);
    try {
      const created: CustomerAttachment[] = [];
      for (const file of Array.from(files)) {
        const path = generateAttachmentPath(editCustomerForm.id, file.name);
        const { error: uploadError } = await supabase.storage
          .from(CUSTOMER_ATTACHMENTS_BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(uploadError.message || 'Upload failed');
        const { data } = supabase.storage.from(CUSTOMER_ATTACHMENTS_BUCKET).getPublicUrl(path);
        created.push({
          kind: toAttachmentKind(file),
          path,
          url: data.publicUrl,
          name: file.name,
          mime: file.type || undefined,
          size: file.size || undefined,
          uploadedAt: new Date().toISOString(),
        });
      }

      const next = [...editCustomerAttachments, ...created];
      await persistCustomerAttachments(editCustomerForm.id, next);
      setEditCustomerAttachments(next);

      // keep list view in sync without a full refresh
      setCustomers((prev) =>
        prev.map((c) => (c.id === editCustomerForm.id ? { ...c, attachments: next } : c))
      );
      setSelected((prev) => (prev?.id === editCustomerForm.id ? { ...prev, attachments: next } : prev));
    } catch (err) {
      setAttachmentsError(err instanceof Error ? err.message : 'Failed to upload attachment(s).');
    } finally {
      setAttachmentsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (attachment: CustomerAttachment) => {
    if (!editCustomerForm.id) return;
    if (!window.confirm(`Remove "${attachment.name}"?`)) return;
    setAttachmentsError(null);
    try {
      const next = editCustomerAttachments.filter((a) => a.path !== attachment.path);
      await persistCustomerAttachments(editCustomerForm.id, next);
      setEditCustomerAttachments(next);

      // best-effort delete from storage (ignore failures so UI doesn't break)
      await supabase.storage.from(CUSTOMER_ATTACHMENTS_BUCKET).remove([attachment.path]).catch(() => null);

      setCustomers((prev) =>
        prev.map((c) => (c.id === editCustomerForm.id ? { ...c, attachments: next } : c))
      );
      setSelected((prev) => (prev?.id === editCustomerForm.id ? { ...prev, attachments: next } : prev));
      if (attachmentPreview?.path === attachment.path) setAttachmentPreview(null);
    } catch (err) {
      setAttachmentsError(err instanceof Error ? err.message : 'Failed to remove attachment.');
    }
  };

  const handleSaveCustomer = async () => {
    if (!editCustomerForm.id) return;
    if (!editCustomerForm.name.trim()) {
      setEditCustomerError('Please enter the customer name.');
      return;
    }
    if (!editCustomerForm.email.trim()) {
      setEditCustomerError('Please enter the customer email.');
      return;
    }

    setEditCustomerSaving(true);
    setEditCustomerError(null);
    try {
      const result = await updateCustomer({
        userId: editCustomerForm.id,
        name: editCustomerForm.name,
        email: editCustomerForm.email,
        phone: editCustomerForm.phone,
        address: editCustomerForm.address,
      });
      if (!result.success) {
        setEditCustomerError(result.error || 'Failed to update customer.');
        return;
      }

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editCustomerForm.id
            ? {
                ...c,
                name: editCustomerForm.name.trim(),
                email: editCustomerForm.email.trim(),
                phone: editCustomerForm.phone.trim() || undefined,
                address: editCustomerForm.address.trim() || undefined,
              }
            : c
        )
      );
      setSelected((prev) =>
        prev?.id === editCustomerForm.id
          ? {
              ...prev,
              name: editCustomerForm.name.trim(),
              email: editCustomerForm.email.trim(),
              phone: editCustomerForm.phone.trim() || undefined,
              address: editCustomerForm.address.trim() || undefined,
            }
          : prev
      );

      setIsEditCustomerOpen(false);
      // Refresh for any fields the edge function may hydrate (accountNumber/productsCount)
      loadCustomers();
    } catch (e) {
      setEditCustomerError(e instanceof Error ? e.message : 'Failed to update customer.');
    } finally {
      setEditCustomerSaving(false);
    }
  };

  const openCreateModal = () => {
    if (!selected) return;
    const today = getTodayForDateInput();
    setEditing(null);
    setForm({
      catalogProductCode: '',
      label: '',
      quantity: 1,
      purchaseDate: today,
      warrantyStart: today,
      warrantyEnd: today,
      serialNumber: '',
      notes: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: CustomerProduct) => {
    setEditing(p);
    setForm({
      catalogProductCode: p.catalog_product_code || '',
      label: p.label,
      quantity: 1,
      purchaseDate: p.purchase_date,
      warrantyStart: p.warranty_start,
      warrantyEnd: p.warranty_end,
      serialNumber: p.serial_number || '',
      notes: p.notes || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const onCatalogChange = (value: string) => {
    const selectedProduct = catalogOptions.find((p) => p.id === value);
    setForm((prev) => ({
      ...prev,
      catalogProductCode: value,
      label: prev.label || selectedProduct?.name || '',
    }));
  };

  const handleSave = async () => {
    if (!selected) return;
    if (!form.label.trim()) {
      setFormError('Product name is required.');
      return;
    }
    const qty = Math.floor(Number(form.quantity) || 1);
    if (!Number.isFinite(qty) || qty < 1) {
      setFormError('Quantity must be at least 1.');
      return;
    }
    if (!editing && qty > 25) {
      setFormError('Quantity is too high. Please use 25 or less per save.');
      return;
    }
    if (!form.purchaseDate || !form.warrantyStart || !form.warrantyEnd) {
      setFormError('Please provide purchase date and warranty dates.');
      return;
    }
    if (form.warrantyEnd < form.warrantyStart) {
      setFormError('Warranty end date cannot be before warranty start.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateCustomerProduct(editing.id, {
          catalogProductCode: form.catalogProductCode || null,
          label: form.label.trim(),
          purchaseDate: form.purchaseDate,
          warrantyStart: form.warrantyStart,
          warrantyEnd: form.warrantyEnd,
          serialNumber: form.serialNumber.trim() || null,
          notes: form.notes.trim() || null,
        });
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const payload = {
          customerId: selected.id,
          catalogProductCode: form.catalogProductCode || null,
          label: form.label.trim(),
          purchaseDate: form.purchaseDate,
          warrantyStart: form.warrantyStart,
          warrantyEnd: form.warrantyEnd,
          serialNumber: form.serialNumber.trim() || null,
          notes: form.notes.trim() || null,
        };
        const createdRows: CustomerProduct[] = [];
        for (let i = 0; i < qty; i++) {
          // Sequential inserts keeps UI deterministic and is easier to debug if one fails.
          // eslint-disable-next-line no-await-in-loop
          const created = await createCustomerProduct(payload);
          createdRows.push(created);
        }
        setProducts((prev) => [...createdRows, ...prev]);
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === selected.id ? { ...c, productsCount: (c.productsCount || 0) + qty } : c
          )
        );
      }
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: CustomerProduct) => {
    if (!selected) return;
    if (!window.confirm(`Delete "${p.label}"?`)) return;
    try {
      await deleteCustomerProduct(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, productsCount: Math.max((c.productsCount || 1) - 1, 0) }
            : c
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete product.');
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F2C200]">Customers</h1>
          <p className="text-gray-500 text-sm">Assign products and manage customer warranties.</p>
          {refreshing && (
            <p className="text-[10px] text-gray-600 font-bold mt-1 uppercase tracking-widest">
              Refreshing…
            </p>
          )}
        </div>
        <div className="relative w-full max-w-md">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by account number or business details..."
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 bg-[#111111] rounded-2xl border border-[#333333] overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-gray-500 font-bold text-sm">Loading customers...</div>
          ) : error ? (
            <div className="p-10 text-center text-red-400 font-bold text-sm">{error}</div>
          ) : (
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-[#1A1A1A] border-b border-[#333333]">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Business Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Products</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => loadCustomerProducts(c)}
                    className={`cursor-pointer hover:bg-white/5 transition-colors ${
                      selected?.id === c.id ? 'bg-white/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[#F2C200] font-black tracking-widest text-xs uppercase">
                          {c.accountNumber || c.id}
                        </span>
                        {c.accountNumber && (
                          <span className="text-[10px] text-gray-600 mt-1">ID: {c.id}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-bold">{c.name}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-300 font-bold">{c.phone || 'No phone'}</div>
                      <div className="text-[10px] text-gray-500">{c.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-black border border-[#333333] text-xs font-bold text-white">
                        {c.productsCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditCustomer(c);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase bg-[#333333] text-[#F2C200] border border-[#333333] hover:bg-[#F2C200] hover:text-black hover:border-[#F2C200] transition-all whitespace-nowrap"
                          title="Edit customer"
                        >
                          <i className="fas fa-pencil-alt" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomer(c);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase bg-transparent text-red-400 border border-red-800/50 hover:bg-red-900/30 whitespace-nowrap"
                          title="Delete customer"
                        >
                          <i className="fas fa-trash-alt" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-bold text-sm">
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>

        <section className="lg:col-span-2 bg-[#111111] rounded-2xl border border-[#333333] p-5 min-h-[420px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm font-bold text-center">
              Select a customer to manage assigned products.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                  <p className="text-[10px] text-[#F2C200] font-black uppercase tracking-widest mt-1">
                    {selected.accountNumber || selected.id}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{selected.email || 'No email'}</p>
                </div>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="bg-[#F2C200] text-black px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:brightness-110"
                >
                  Add Product
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-1">
                {productsLoading ? (
                  <div className="p-6 text-center text-gray-500 text-sm font-bold">Loading products...</div>
                ) : products.length === 0 ? (
                  <div className="p-6 bg-black/40 border border-dashed border-[#333333] rounded-xl text-center text-gray-500 text-sm font-bold">
                    No products assigned yet.
                  </div>
                ) : (
                  products.map((p) => {
                    const days = getDaysRemaining(p.warranty_end);
                    const status =
                      days <= 0 ? 'Expired' : days <= 30 ? 'Expiring soon' : 'Active';
                    const statusColor =
                      days <= 0
                        ? 'bg-red-900/30 text-red-400'
                        : days <= 30
                          ? 'bg-amber-900/30 text-amber-400'
                          : 'bg-green-900/30 text-green-400';
                    return (
                      <div key={p.id} className="bg-black/40 border border-[#333333] rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-white">{p.label}</h3>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Catalog: {catalogOptions.find((x) => x.id === p.catalog_product_code)?.name || 'Custom'}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                            {status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-gray-400">
                          <div>Purchased: {new Date(p.purchase_date).toLocaleDateString()}</div>
                          <div>Start: {new Date(p.warranty_start).toLocaleDateString()}</div>
                          <div>End: {new Date(p.warranty_end).toLocaleDateString()}</div>
                          <div className="font-bold text-[#F2C200]">
                            {days > 0 ? `${days} days left` : 'Expired'}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-3">
                          <button
                            onClick={() => openEditModal(p)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-[#333333] text-white hover:bg-[#444]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-900/30 text-red-400 hover:bg-red-900/50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#111111] border border-[#333333] rounded-2xl overflow-hidden shadow-2xl max-h-[calc(100dvh-2rem)] flex flex-col">
            <div className="bg-[#F2C200] p-5 text-black flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold">
                {editing ? 'Edit Assigned Product' : 'Assign Product to Customer'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-lg" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-bold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Catalog Product</label>
                <select
                  value={form.catalogProductCode}
                  onChange={(e) => onCatalogChange(e.target.value)}
                  className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl"
                >
                  <option value="">Custom / Not in catalog</option>
                  {catalogOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {!editing && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    step={1}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        quantity: Math.max(1, Math.min(25, parseInt(e.target.value || '1', 10) || 1)),
                      }))
                    }
                    className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Creates one record per unit so you can edit/delete individually later.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Name *</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g. Front Kitchen Tandoori Oven"
                  className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Purchase Date *</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                    className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warranty Start *</label>
                  <input
                    type="date"
                    value={form.warrantyStart}
                    onChange={(e) => setForm((prev) => ({ ...prev, warrantyStart: e.target.value }))}
                    className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warranty End *</label>
                  <input
                    type="date"
                    value={form.warrantyEnd}
                    onChange={(e) => setForm((prev) => ({ ...prev, warrantyEnd: e.target.value }))}
                    className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Serial Number</label>
                <input
                  type="text"
                  value={form.serialNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="Optional"
                  className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full p-3 bg-black border border-[#333333] text-white rounded-xl resize-none"
                />
              </div>
              <div className="pt-4 border-t border-[#333333] flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold border border-[#333333] text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editing ? 'Update Product' : 'Assign Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditCustomerOpen && (
        <div className="fixed inset-0 z-[320] bg-black/90 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#111111] border border-[#333333] rounded-2xl overflow-hidden shadow-2xl max-h-[calc(100dvh-2rem)] flex flex-col">
            <div className="bg-[#F2C200] p-5 text-black flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold">Edit Customer</h3>
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">ID: {editCustomerForm.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCustomerOpen(false)}
                className="text-black hover:opacity-70"
                disabled={editCustomerSaving}
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {editCustomerError && (
                <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm font-bold">
                  {editCustomerError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Name *</label>
                <input
                  type="text"
                  value={editCustomerForm.name}
                  onChange={(e) => setEditCustomerForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Email *</label>
                <input
                  type="email"
                  value={editCustomerForm.email}
                  onChange={(e) => setEditCustomerForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Phone</label>
                <input
                  type="tel"
                  value={editCustomerForm.phone}
                  onChange={(e) => setEditCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Address</label>
                <textarea
                  rows={3}
                  value={editCustomerForm.address}
                  onChange={(e) => setEditCustomerForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full p-4 bg-black border border-[#333333] text-white rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none font-medium text-sm leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-[#333333] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#F2C200]">Attachments</p>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">
                      Images, PDFs, documents and videos. Click a tile to view.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {editCustomerAttachments.length}/{MAX_ATTACHMENTS_FILES}
                  </span>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleCustomerAttachmentUpload}
                  disabled={attachmentsUploading || editCustomerSaving}
                  className="block w-full text-sm text-gray-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#F2C200] file:text-black hover:file:brightness-110 cursor-pointer disabled:opacity-60"
                />
                <p className="text-[11px] text-gray-500 font-bold">
                  Up to {MAX_ATTACHMENTS_FILES} files. Max {MAX_FILE_MB}MB per file.
                </p>
                {attachmentsError && (
                  <div className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-bold">
                    {attachmentsError}
                  </div>
                )}
                {attachmentsUploading && (
                  <p className="text-xs text-gray-400 font-bold">
                    <i className="fas fa-spinner fa-spin mr-2" />
                    Uploading attachments...
                  </p>
                )}

                {editCustomerAttachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editCustomerAttachments.map((a) => (
                      <div
                        key={a.path}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-[#333333] hover:border-[#F2C200] transition-colors bg-black"
                      >
                        <button
                          type="button"
                          onClick={() => setAttachmentPreview(a)}
                          className="absolute inset-0 w-full h-full"
                          title="View attachment"
                        >
                          {a.kind === 'image' ? (
                            <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                          ) : a.kind === 'video' ? (
                            <video src={a.url} className="w-full h-full object-cover" muted />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center px-2 text-center">
                              <i
                                className={`fas ${
                                  a.kind === 'pdf' ? 'fa-file-pdf text-red-400' : 'fa-paperclip text-gray-400'
                                } text-2xl mb-2`}
                              />
                              <span className="text-[10px] text-gray-300 font-bold line-clamp-2">
                                {a.name}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white">
                            View
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(a)}
                          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditCustomerOpen(false)}
                  disabled={editCustomerSaving}
                  className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest bg-[#333333] text-white hover:bg-[#444] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomer}
                  disabled={editCustomerSaving}
                  className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest bg-[#F2C200] text-black hover:brightness-110 disabled:opacity-60"
                >
                  {editCustomerSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {attachmentPreview && (
        <div
          className="fixed inset-0 bg-black/90 z-[700] flex items-center justify-center p-4"
          onClick={() => setAttachmentPreview(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {attachmentPreview.kind === 'image' ? (
              <img
                src={attachmentPreview.url}
                alt={attachmentPreview.name}
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : attachmentPreview.kind === 'video' ? (
              <video
                src={attachmentPreview.url}
                controls
                className="max-w-full max-h-[80vh] bg-black"
              />
            ) : attachmentPreview.kind === 'pdf' ? (
              <iframe
                src={attachmentPreview.url}
                title={attachmentPreview.name}
                className="w-full h-[80vh] bg-black rounded-lg border border-[#333333]"
              />
            ) : (
              <div className="w-full max-w-xl bg-[#111111] border border-[#333333] rounded-2xl p-6">
                <p className="text-white font-bold">{attachmentPreview.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  This file type can be downloaded and opened locally.
                </p>
              </div>
            )}

            <div className="absolute bottom-3 left-3 flex gap-2">
              <a
                href={attachmentPreview.url}
                download={attachmentPreview.name || 'attachment'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 text-xs font-bold text-white hover:bg-black"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="fas fa-download text-xs" />
                <span>{attachmentPreview.kind === 'pdf' ? 'Download PDF' : 'Download'}</span>
              </a>
              {attachmentPreview.kind === 'video' && (
                <a
                  href={attachmentPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 text-xs font-bold text-white hover:bg-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="fas fa-up-right-from-square text-xs" />
                  <span>Open</span>
                </a>
              )}
            </div>

            <button
              onClick={() => setAttachmentPreview(null)}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-2"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;

