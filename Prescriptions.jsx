import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useApi from '../hooks/useApi.js';
import Icon from '../components/Icon.jsx';
import {
  Card, Badge, Loading, ErrorNote, Empty } from '../components/ui.jsx';
import { formatDateTime } from '../utils/format.js';

const TABS = [
  { key: 'New', label: 'New Prescription', status: 'Pending' },
  { key: 'History', label: 'Prescription History', status: null },
];

export default function Prescriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState('New');
  const [search, setSearch] = useState('');

  const { data, loading, error, reload } = useApi('/prescriptions');

  const canPrescribe = ['Doctor', 'Admin'].includes(user?.role);

  const rows = data?.prescriptions ?? [];

  const visible = useMemo(() => {
    const status = TABS.find((t) => t.key === tab)?.status;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (!q) return true;
      return [r.number, r.patientName, r.patientId, r.doctorName]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, tab, search]);

  async function cancel(rx) {
    try {
      await api.patch(`/prescriptions/${rx.prescriptionId}`, { status: 'Cancelled' });
      toast.success(`${rx.number} cancelled.`);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not cancel the prescription.');
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="row between wrap">
          <div>
            <h1>E-Prescriptions</h1>
            <div className="sub">SCR-06 · Digital prescriptions sent to the pharmacy queue</div>
          </div>
          {canPrescribe && (
            <button className="btn btn-primary" onClick={() => navigate('/patients')}>
              <Icon name="plus" size={15} /> New Prescription
            </button>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <Card
        title="Prescriptions"
        icon="clipboard"
        action={
          <input
            className="input"
            style={{ width: 260 }}
            placeholder="🔍 Search by number or patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
        bodyClass="card-body"
      >
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNote error={error} onRetry={reload} />
        ) : visible.length === 0 ? (
          <Empty
            icon="clipboard"
            title={tab === 'New' ? 'No prescriptions awaiting review' : 'No prescription history'}
            hint="New prescriptions appear here the moment a doctor issues them."
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Patient</th>
                  <th>Prescriber</th>
                  <th>Issued</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Medications</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.prescriptionId}>
                    <td className="mono" style={{ fontWeight: 600 }}>{r.number}</td>
                    <td>
                      <button className="link-btn" onClick={() => navigate(`/patients/${r.patientId}`)}>
                        {r.patientName}
                      </button>
                      <div className="sub mono">{r.patientId}</div>
                    </td>
                    <td className="small">{r.doctorName}</td>
                    <td className="small">{formatDateTime(r.prescribedDate)}</td>
                    <td><Badge status={r.priority}>{r.priority}</Badge></td>
                    <td><Badge status={r.status}>{r.status}</Badge></td>
                    <td>
                      <div className="stack sm" style={{ gap: 3 }}>
                        {r.items.map((i) => (
                          <div key={i.itemId} className="small">
                            {i.drugName} {i.dosage}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="actions">
                      {r.status === 'Pending' && canPrescribe && (
                        <button className="link-btn danger" onClick={() => cancel(r)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ height: 14 }} />

      <Card title="How prescribing works" icon="info" bodyClass="card-body">
        <div className="grid cols-3">
          <Step n="1" title="Allergy check" text="The EHR's allergy list is cross-checked against the drug and its class before the prescription is accepted." />
          <Step n="2" title="Formulary search" text="Only formulary items are selectable, and out-of-stock drugs are marked in the dropdown." />
          <Step n="3" title="Pharmacy dispatch" text="Submitting queues the prescription for the pharmacist and decrements inventory on dispensing." />
        </div>
      </Card>
    </>
  );
}

function Step({ n, title, text }) {
  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 5 }}>
        <span className="badge blue">{n}</span>
        <strong style={{ fontSize: 13 }}>{title}</strong>
      </div>
      <p className="small muted">{text}</p>
    </div>
  );
}