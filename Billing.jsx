import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useApi from '../hooks/useApi.js';
import Icon from '../components/Icon.jsx';
import {
  Card, Badge, Modal, Field, Loading, ErrorNote, Empty } from '../components/ui.jsx';
import { rand, formatDate, formatDateTime } from '../utils/format.js';

const FILTERS = ['All', 'Unpaid', 'PartiallyPaid', 'Paid'];

export default function Billing() {
  const { user } = useAuth();
  const toast = useToast();

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [paying, setPaying] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data, loading, error, reload } = useApi('/billing');
  const invoices = data?.invoices ?? [];
  const totals = data?.totals;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (filter !== 'All' && i.status !== filter) return false;
      if (!q) return true;
      return `${i.patientName} ${i.invoiceNumber} ${i.patientId}`
        .toLowerCase().includes(q);
    });
  }, [invoices, filter, search]);

  useEffect(() => {
    if (invoices.length && selectedId === null) setSelectedId(invoices[0].invoiceId);
  }, [invoices, selectedId]);

  const selected = invoices.find((i) => i.invoiceId === selectedId) || null;
  const canBill = ['BillingClerk', 'Admin'].includes(user?.role);

  async function takePayment(invoice, amount, method) {
    try {
      const res = await api.post(`/billing/${invoice.invoiceId}/payment`, { amount, method });
      setPaying(null);
      toast.success(res.message);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not record the payment.');
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="row between wrap">
          <div>
            <h1>Billing &amp; Invoicing</h1>
            <div className="sub">SCR-08 · Patient accounts and medical aid claims</div>
          </div>
          {canBill && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <Icon name="plus" size={15} /> Generate Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <div className="stat-card"><div className="label">Total Billed</div><div className="value">{rand(totals?.billed)}</div></div>
        <div className="stat-card"><div className="label">Aid Covered</div><div className="value blue">{rand(totals?.aid)}</div></div>
        <div className="stat-card"><div className="label">Patient Owing</div><div className="value red">{rand(totals?.owing)}</div></div>
        <div className="stat-card"><div className="label">Paid</div><div className="value green">{rand(totals?.paid)}</div></div>
      </div>

      <div className="grid split-wide">
        <Card
          title="Invoices"
          icon="invoice"
          action={
            <input
              className="input"
              style={{ width: 240 }}
              placeholder="🔍 Search patient or invoice…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
          bodyClass="card-body"
        >
          <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
            {FILTERS.map((f) => (
              <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'PartiallyPaid' ? 'Partially paid' : f}
              </button>
            ))}
          </div>

          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorNote error={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <Empty icon="invoice" title="No invoices found" />
          ) : (
            <div>
              {filtered.map((i) => (
                <div
                  key={i.invoiceId}
                  className={`invoice-item${i.invoiceId === selectedId ? ' active' : ''}`}
                  onClick={() => setSelectedId(i.invoiceId)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="name">{i.patientName}</div>
                    <div className="num mono">
                      {i.invoiceNumber} · {formatDate(i.invoiceDate)}
                    </div>
                    <div className="small muted">{i.medicalAidProvider || 'None'}</div>
                  </div>
                  <div className="amt">
                    <div>{rand(i.totalAmount)}</div>
                    <div style={{ marginTop: 3 }}><Badge status={i.status}>{i.status}</Badge></div>
                    {i.patientOwing > 0 && <div className="owing">Owing: {rand(i.patientOwing)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card bodyClass="card-body">
          {!selected ? (
            <Empty icon="invoice" title="Select an invoice to view details" />
          ) : (
            <InvoiceDetail
              invoice={selected}
              canBill={canBill}
              onPay={() => setPaying(selected)}
            />
          )}
        </Card>
      </div>

      <PaymentModal
        invoice={paying}
        onClose={() => setPaying(null)}
        onSubmit={takePayment}
      />
      <CreateInvoiceModal
        open={creating}
        onClose={() => setCreating(false)}
        onDone={(msg) => {
          setCreating(false);
          toast.success(msg);
          reload();
        }}
      />
    </>
  );
}

function InvoiceDetail({ invoice, canBill, onPay }) {
  return (
    <div>
      <div className="row between wrap" style={{ gap: 10, marginBottom: 4 }}>
        <div>
          <h3 style={{ fontSize: 16, color: 'var(--text)' }}>{invoice.invoiceNumber}</h3>
          <div className="faint small">{formatDateTime(invoice.invoiceDate)}</div>
        </div>
        <Badge status={invoice.status}>{invoice.status}</Badge>
      </div>

      <div className="row wrap" style={{ gap: 14, marginTop: 10, marginBottom: 12 }}>
        <div>
          <div className="faint small">Patient</div>
          <div style={{ fontWeight: 600 }}>{invoice.patientName}</div>
          <div className="faint small mono">{invoice.patientId}</div>
        </div>
        <div>
          <div className="faint small">Medical Aid</div>
          <div style={{ fontWeight: 600 }}>{invoice.medicalAidProvider || 'None'}</div>
          {invoice.medicalAidNumber && <div className="faint small mono">{invoice.medicalAidNumber}</div>}
        </div>
      </div>

      <div className="section-title">Services Rendered</div>
      {invoice.items.length === 0 ? (
        <Empty icon="invoice" title="No line items" />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Description</th><th>Category</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id}>
                  <td className="small">{it.description}</td>
                  <td className="small"><Badge tone="grey">{it.category}</Badge></td>
                  <td className="num mono">{rand(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="divider" />

      <div className="stack sm">
        <Line label="Total" value={rand(invoice.totalAmount)} strong />
        <Line label="Medical Aid Covers" value={`− ${rand(invoice.aidCovers)}`} tone="green" />
        <Line label="Patient Owes" value={rand(invoice.patientOwing)} tone="red" strong />
      </div>

      {invoice.payments.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-title">Payments Received</div>
          <div className="stack sm">
            {invoice.payments.map((p) => (
              <div key={p.id} className="row between small">
                <span className="muted">{p.method} · {formatDate(p.paidAt)}</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--success)' }}>
                  {rand(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="row" style={{ gap: 9, marginTop: 16 }}>
        {canBill && invoice.patientOwing > 0 && (
          <button className="btn btn-primary btn-sm" onClick={onPay}><Icon name="card" size={14} /> Record Payment</button>
        )}
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Icon name="print" size={14} /> Print Invoice</button>
        {invoice.medicalAidProvider && (
          <button className="btn btn-outline btn-sm" onClick={() => {}}><Icon name="send" size={14} /> Email to Medical Aid</button>
        )}
      </div>
    </div>
  );
}

function Line({ label, value, tone, strong }) {
  return (
    <div className="row between">
      <span className={strong ? 'muted' : 'faint small'} style={strong ? { fontWeight: 600 } : undefined}>
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontWeight: 700,
          fontSize: strong ? 15 : 13,
          color: tone === 'red' ? 'var(--danger)' : tone === 'green' ? 'var(--success)' : 'var(--text)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentModal({ invoice, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Card');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (invoice) {
      setAmount(String(invoice.patientOwing));
      setMethod('Card');
    }
  }, [invoice]);

  if (!invoice) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Record Payment — ${invoice.invoiceNumber}`}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSubmit(invoice, Number(amount), method);
              setBusy(false);
            }}
          >
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '✓'} Record Payment
          </button>
        </>
      }
    >
      <div className="alert info" style={{ marginBottom: 14 }}>
        <span className="alert-ico" aria-hidden="true">ℹ</span>
        <div className="alert-body">
          Outstanding balance for <strong>{invoice.patientName}</strong>:{' '}
          <strong>{rand(invoice.patientOwing)}</strong>
        </div>
      </div>
      <div className="grid cols-2">
        <Field label="Amount (R)" required>
          <input type="number" min="0" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Payment Method" required>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Card</option>
            <option>Cash</option>
            <option>EFT</option>
            <option>MedicalAid</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

/** Auto-populates services rendered from the visit (SCR-08). */
function CreateInvoiceModal({ open, onClose, onDone }) {
  const toast = useToast();
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState([]);
  const [aidPct, setAidPct] = useState(100);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: patientsData } = useApi(open ? '/patients' : null, [open]);
  const patients = patientsData?.patients ?? [];

  useEffect(() => {
    if (open) {
      setPatientId('');
      setItems([]);
      setAidPct(100);
    }
  }, [open]);

  async function loadDraft(id) {
    setPatientId(id);
    if (!id) { setItems([]); return; }
    setLoadingDraft(true);
    try {
      const draft = await api.get(`/billing/${id}/draft`);
      setItems(draft.items);
      if (draft.patient.medicalAidNumber) setAidPct(100);
    } catch {
      setItems([]);
    } finally {
      setLoadingDraft(false);
    }
  }

  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const aid = (total * aidPct) / 100;
  const owing = total - aid;

  async function submit() {
    if (!patientId) { toast.error('Select a patient.'); return; }
    if (!items.length) { toast.error('The visit has no billable services.'); return; }
    setBusy(true);
    try {
      const res = await api.post('/billing', {
        patientId, aidCoveragePercent: aidPct, items, sendToMedicalAid: aidPct > 0,
      });
      onDone(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not generate the invoice.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Invoice"
      wide
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '🧾'} Generate Invoice
          </button>
        </>
      }
    >
      <Field label="Patient" required hint="Selecting a patient auto-populates the services rendered during their visit">
        <select className="select" value={patientId} onChange={(e) => loadDraft(e.target.value)}>
          <option value="">Select a patient…</option>
          {patients.map((p) => (
            <option key={p.patientId} value={p.patientId}>
              {p.fullName} ({p.patientId}){p.medicalAidProvider ? ` — ${p.medicalAidProvider}` : ' — no medical aid'}
            </option>
          ))}
        </select>
      </Field>

      {loadingDraft ? (
        <Loading label="Pulling services from the visit…" />
      ) : patientId ? (
        items.length === 0 ? (
          <Empty icon="invoice" title="No billable services found" hint="Completed consultations, lab results and dispensed medication appear here." />
        ) : (
          <>
            <div className="section-title">Auto-populated Services</div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Description</th><th>Category</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="small">{it.description}</td>
                      <td className="small"><Badge tone="grey">{it.category}</Badge></td>
                      <td className="num mono">{rand(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field label="Medical Aid Coverage (%)" hint="Applied automatically when the patient has a medical aid number">
                <input type="number" min="0" max="100" className="input" value={aidPct} onChange={(e) => setAidPct(Number(e.target.value))} />
              </Field>
            </div>

            <div className="divider" />
            <div className="stack sm">
              <Line label="Total" value={rand(total)} strong />
              <Line label={`Medical Aid Covers (${aidPct}%)`} value={`− ${rand(aid)}`} tone="green" />
              <Line label="Patient Owes" value={rand(owing)} tone="red" strong />
            </div>
          </>
        )
      ) : null}
    </Modal>
  );
}