import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { User } from '../types';
import { getAllUsers, deleteUser, type StoredUser } from '../lib/auth';
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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<StoredUser | null>(null);
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

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

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const users = await getAllUsers();
      setCustomers(users.filter((u) => u.role === 'CUSTOMER'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

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
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(c);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase bg-transparent text-red-400 border border-red-800/50 hover:bg-red-900/30"
                        title="Delete customer"
                      >
                        <i className="fas fa-trash-alt" />
                        Delete
                      </button>
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
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111111] border border-[#333333] rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#F2C200] p-5 text-black flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editing ? 'Edit Assigned Product' : 'Assign Product to Customer'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-lg" />
              </button>
            </div>
            <div className="p-6 space-y-4">
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
    </div>
  );
};

export default AdminCustomers;

