import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useApi from '../hooks/useApi.js';
import Icon from '../components/Icon.jsx';
import {
  Card, Badge, Stat, Modal, Field, Loading, ErrorNote, Empty } from '../components/ui.jsx';
import { rand, formatDate } from '../utils/format.js';

const TABS = [
  { key: 'queue', label: 'Dispensing Queue' },
  { key: 'stock', label: 'Stock Levels' },
];

const STOCK_FILTERS = ['All', 'InStock', 'LowStock', 'OutOfStock'];

export default function Pharmacy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState('queue');
  const [stockFilter, setStockFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [restocking, setRestocking] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const canDispense = ['Pharmacist', 'Admin'].includes(user?.role);

  const { data: inv, loading: invLoading, error: invError, reload: reloadInv } = useApi('/pharmacy/inventory');
  const { data: queueData, loading: qLoading, error: qError, reload: reloadQueue } = useApi('/pharmacy/queue');

  const inventory = inv?.inventory ?? [];
  const queue = queueData?.queue ?? [];

  const filteredStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((m) => {
      if (stockFilter !== 'All' && m.stockStatus !== stockFilter) return false;
      if (!q) return true;
      return `${m.drugName} ${m.drugCode} ${m.category}`.toLowerCase().includes(q);
    });
  }, [inventory, stockFilter, search]);

  async function dispense(rx) {
    setBusyId(rx.prescriptionId);
    try {
      const res = await api.post('/pharmacy/dispense', {
        prescriptionId: rx.prescriptionId,
        notes: 'Dispensed from the pharmacy queue',
      });
      toast.success(res.message);
      if (res.reorderAlerts?.length) {
        res.reorderAlerts.forEach((a) => toast.error(a.message));
      }
      reloadQueue();
      reloadInv();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not dispense this prescription.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="row between wrap">
          <div>
            <h1>Pharmacy Inventory</h1>
            <div className="sub">SCR-07 · Stock control and prescription dispensing</div>
          </div>
          {canDispense && (
            <button className="btn btn-primary" onClick={() => setRestocking(inventory.find((m) => m.stockStatus !== 'InStock') || inventory[0])}>
              <Icon name="plus" size={15} /> Receive Stock
            </button>
          )}
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <Stat label="Formulary Items" value={inv?.summary.total ?? 0} icon="pill" tile="blue" foot="Tracked in inventory" />
        <Stat label="Low Stock" value={inv?.summary.lowStock ?? 0} icon="warning" tile="amber" tone="amber" foot="At or below reorder level" attention={(inv?.summary.lowStock ?? 0) > 0} />
        <Stat label="Out of Stock" value={inv?.summary.outOfStock ?? 0} icon="stop" tile="red" tone="red" foot="Blocks dispensing" attention={(inv?.summary.outOfStock ?? 0) > 0} />
        <Stat label="Expiring Soon" value={inv?.summary.expiringSoon ?? 0} icon="clock" tile="purple" foot="Within 90 days" />
      </div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' ? (
        <Card title={`Pending Prescriptions (${queue.length})`} icon="clipboard" bodyClass="card-body">
          {qLoading ? (
            <Loading />
          ) : qError ? (
            <ErrorNote error={qError} onRetry={reloadQueue} />
          ) : queue.length === 0 ? (
            <Empty icon="check" title="The dispensing queue is empty" hint="New prescriptions arrive here automatically." />
          ) : (
            <div>
              {queue.map((rx) => (
                <div key={rx.prescriptionId} className={`queue-item ${rx.priority === 'Urgent' ? 'urgent' : 'routine'}`}>
                  <div className="row between wrap" style={{ gap: 10 }}>
                    <div>
                      <div className="row" style={{ gap: 9, marginBottom: 3 }}>
                        <span className="mono" style={{ fontWeight: 700 }}>{rx.number}</span>
                        {/* Design change #4: priority tag added after the
                            pharmacist reported no urgency indicator. */}
                        <Badge status={rx.priority}>{rx.priority}</Badge>
                        {!rx.canDispense && <Badge tone="red">⚠ Out of stock</Badge>}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        <button className="link-btn" onClick={() => navigate(`/patients/${rx.patientId}`)}>
                          {rx.patientName}
                        </button>
                        <span className="faint small"> · {rx.patientId}</span>
                      </div>
                      <div className="faint small">{rx.doctorName} · {formatDate(rx.prescribedDate)}</div>
                    </div>
                    {canDispense && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!rx.canDispense || busyId === rx.prescriptionId}
                        onClick={() => dispense(rx)}
                        title={rx.canDispense ? 'Dispense now' : 'Blocked: a drug is out of stock'}
                      >
                        {busyId === rx.prescriptionId ? (
                          <span className="spinner" style={{ borderTopColor: '#fff' }} />
                        ) : (
                          <>
                            <Icon name="pill" size={14} /> Dispense
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="row wrap" style={{ gap: 7, marginTop: 9 }}>
                    {rx.items.map((i) => (
                      <span key={i.itemId} className="med-chip">
                        {i.drugName} {i.dosage}
                        <span className="faint" style={{ fontWeight: 500 }}>({i.frequency})</span>
                        {i.quantityInStock <= 0 && <span style={{ color: 'var(--danger)' }}>· 0 in stock</span>}
                      </span>
                    ))}
                  </div>

                  {rx.pharmacyNotes && (
                    <div className="small muted" style={{ marginTop: 8 }}>
                      📝 {rx.pharmacyNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card
          title="Stock Levels"
          icon="box"
          action={
            <input
              className="input"
              style={{ width: 240 }}
              placeholder="🔍 Search drug or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
          bodyClass="card-body"
        >
          <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
            {STOCK_FILTERS.map((s) => (
              <button
                key={s}
                className={`chip${stockFilter === s ? ' active' : ''}`}
                onClick={() => setStockFilter(s)}
              >
                {s === 'All' ? 'All' : s.replace('Stock', ' stock')}
              </button>
            ))}
          </div>

          {invLoading ? (
            <Loading />
          ) : invError ? (
            <ErrorNote error={invError} onRetry={reloadInv} />
          ) : filteredStock.length === 0 ? (
            <Empty icon="box" title="No stock items match" />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Medication</th>
                    <th>Code</th>
                    <th>Category</th>
                    <th className="num">In Stock</th>
                    <th className="num">Reorder At</th>
                    <th>Expiry</th>
                    <th>Supplier</th>
                    <th className="num">Unit Cost</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((m) => (
                    <tr key={m.medicationId}>
                      <td><Badge status={m.stockStatus}>{m.stockStatus}</Badge></td>
                      <td style={{ fontWeight: 600 }}>
                        <span className={`stock-dot ${m.stockStatus}`} style={{ marginRight: 7 }} />
                        {m.drugName}
                      </td>
                      <td className="mono small">{m.drugCode}</td>
                      <td className="small">{m.category}</td>
                      <td className="num mono">{m.quantityInStock}</td>
                      <td className="num mono faint">{m.reorderLevel}</td>
                      <td className="small">{m.expiryDate ? formatDate(m.expiryDate) : '—'}</td>
                      <td className="small">{m.supplier || '—'}</td>
                      <td className="num mono">{rand(m.unitCost)}</td>
                      <td className="actions">
                        {canDispense && (
                          <button className="link-btn" onClick={() => setRestocking(m)}>Receive</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <RestockModal
        medication={restocking}
        onClose={() => setRestocking(null)}
        onDone={(msg) => {
          setRestocking(null);
          toast.success(msg);
          reloadInv();
        }}
      />
    </>
  );
}

function RestockModal({ medication, onClose, onDone }) {
  const toast = useToast();
  const { data } = useApi('/pharmacy/medications');
  const [medId, setMedId] = useState('');
  const [qty, setQty] = useState('');
  const [expiry, setExpiry] = useState('');
  const [supplier, setSupplier] = useState('');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);

  // Re-seed the form whenever a different medication is chosen.
  const key = medication?.medicationId ?? null;
  useMemo(() => {
    if (medication) {
      setMedId(String(medication.medicationId));
      setQty('');
      setExpiry(medication.expiryDate || '');
      setSupplier(medication.supplier || '');
      setCost(String(medication.unitCost ?? ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const meds = data?.medications ?? [];
  const selected = meds.find((m) => String(m.medicationId) === String(medId));

  async function submit() {
    if (!medId) { toast.error('Select a medication.'); return; }
    if (!qty || Number(qty) <= 0) { toast.error('Enter a quantity greater than zero.'); return; }

    setBusy(true);
    try {
      const res = await api.post('/pharmacy/restock', {
        medicationId: Number(medId),
        quantity: Number(qty),
        expiryDate: expiry || undefined,
        supplier: supplier || undefined,
        unitCost: cost ? Number(cost) : undefined,
      });
      onDone(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not receive stock.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(medication)}
      onClose={onClose}
      title="Receive Stock"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '📦'} Receive Stock
          </button>
        </>
      }
    >
      <Field label="Medication" required>
        <select className="select" value={medId} onChange={(e) => {
          setMedId(e.target.value);
          const m = meds.find((x) => String(x.medicationId) === e.target.value);
          if (m) { setExpiry(m.expiryDate || ''); setSupplier(m.supplier || ''); setCost(String(m.unitCost ?? '')); }
        }}>
          <option value="">Select a medication…</option>
          {meds.map((m) => (
            <option key={m.medicationId} value={m.medicationId}>
              {m.drugName} ({m.quantityInStock} in stock)
            </option>
          ))}
        </select>
      </Field>

      {selected && (
        <div className="alert info" style={{ marginBottom: 12 }}>
          <span className="alert-ico" aria-hidden="true">ℹ</span>
          <div className="alert-body">
            Current stock <strong>{selected.quantityInStock}</strong>, reorder level{' '}
            <strong>{selected.reorderLevel}</strong>. After receiving{' '}
            <strong>{qty || 0}</strong> the new level will be{' '}
            <strong>{Number(selected.quantityInStock || 0) + Number(qty || 0)}</strong>.
          </div>
        </div>
      )}

      <div className="grid cols-2">
        <Field label="Quantity Received" required>
          <input type="number" min="1" className="input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 200" />
        </Field>
        <Field label="Expiry Date">
          <input type="date" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </Field>
        <Field label="Supplier">
          <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. PharmActi" />
        </Field>
        <Field label="Unit Cost (R)">
          <input type="number" step="0.01" min="0" className="input" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}