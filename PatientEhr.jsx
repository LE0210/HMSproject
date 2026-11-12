import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useApi from '../hooks/useApi.js';
import Icon from '../components/Icon.jsx';
import {
  Card, Avatar, Badge, Modal, Field, Loading, ErrorNote, Empty } from '../components/ui.jsx';
import { rand, formatDate, truncate } from '../utils/format.js';

const TABS = ['Medical History', 'Prescriptions', 'Lab Results', 'Appointments', 'Billing', 'Documents'];

const TEST_TEMPLATES = [
  'Full Blood Count (FBC)',
  'HbA1c & Fasting Glucose',
  'Lipid Profile',
  'Liver Function Tests',
  'Urine Analysis',
  'ECG + Holter',
  'Chest X-Ray',
];

export default function PatientEhr() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState('Medical History');
  const [rxOpen, setRxOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [dxOpen, setDxOpen] = useState(false);

  const { data, loading, error, reload } = useApi(`/ehr/${patientId}`, [patientId]);

  if (loading) return <Loading label="Loading patient record…" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return null;

  const p = data.patient;
  const canPrescribe = ['Doctor', 'Admin'].includes(user?.role);
  const canOrderLabs = ['Doctor', 'Admin'].includes(user?.role);
  const canDiagnose = ['Doctor', 'Admin'].includes(user?.role);

  const actions = (
    <div className="row wrap" style={{ gap: 8 }}>
      {canPrescribe && (
        <button className="btn btn-primary btn-sm" onClick={() => setRxOpen(true)}>
          <Icon name="plus" size={14} /> Add Prescription
        </button>
      )}
      {canOrderLabs && (
        <button className="btn btn-outline btn-sm" onClick={() => setLabOpen(true)}>
          <Icon name="lab" size={14} /> Order Lab Test
        </button>
      )}
      {canDiagnose && (
        <button className="btn btn-outline btn-sm" onClick={() => setDxOpen(true)}>
          ＋ Add Diagnosis
        </button>
      )}
      <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
        <Icon name="print" size={14} /> Print Summary
      </button>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div className="row between wrap">
          <h1>{p.firstName} {p.lastName}</h1>
          <Link className="link-btn" to="/patients">← Back to Patients</Link>
        </div>
      </div>

      {/* Allergy banner sits ABOVE all other content — design change #1
          (report Section 2.2): it must be impossible to miss. */}
      {data.allergies.length > 0 && (
        <div className="allergy-banner" style={{ marginBottom: 14 }} role="alert">
          <span className="ico" aria-hidden="true">⚠</span>
          <div>
            <strong>ALLERGY ALERT</strong>
            <p>
              {p.firstName} {p.lastName} is allergic to{' '}
              <strong>{data.allergies.join(', ')}</strong>
            </p>
          </div>
        </div>
      )}

      <div className="patient-banner" style={{ marginBottom: 14 }}>
        <div className="top">
          <Avatar initials={`${p.firstName.charAt(0)}${p.lastName.charAt(0)}`} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{p.firstName} {p.lastName}</h2>
            <div className="meta-row">
              <span><span className="k">ID:</span> <span className="mono">{p.patientId}</span></span>
              <span><span className="k">DOB:</span> {formatDate(p.dateOfBirth)}</span>
              <span><span className="k">Gender:</span> {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}</span>
              {p.bloodType && <Badge tone="red">Blood: {p.bloodType}</Badge>}
            </div>
            <div className="meta-row">
              {p.phoneNumber && <span>📞 {p.phoneNumber}</span>}
              {p.emailAddress && <span>✉ {p.emailAddress}</span>}
              {p.medicalAidProvider && (
                <span>🏥 {p.medicalAidProvider} · {p.medicalAidNumber}</span>
              )}
            </div>
            {p.physicalAddress && <div className="meta-row">📍 {p.physicalAddress}</div>}
          </div>
        </div>

        {data.currentMedications.length > 0 && (
          <div className="meds-box">
            <div className="label">Current Medications:</div>
            <div className="row wrap" style={{ gap: 8 }}>
              {data.currentMedications.map((m) => (
                <span key={m.medicationId} className="med-chip">
                  🔗 {m.drugName} {m.dosage}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>{actions}</div>
      </div>

      <Card bodyClass="card-body">
        <div className="tabs" style={{ marginBottom: 14 }}>
          {TABS.map((t) => (
            <button
              key={t}
              className={`tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Medical History' && <HistoryTab data={data} />}
        {tab === 'Prescriptions' && <PrescriptionsTab data={data} />}
        {tab === 'Lab Results' && <LabsTab data={data} />}
        {tab === 'Appointments' && <AppointmentsTab data={data} />}
        {tab === 'Billing' && <BillingTab data={data} />}
        {tab === 'Documents' && <DocumentsTab data={data} />}
      </Card>

      <PrescribeModal
        open={rxOpen}
        onClose={() => setRxOpen(false)}
        patient={p}
        allergies={data.allergies}
        onDone={(msg) => {
          setRxOpen(false);
          toast.success(msg);
          reload();
        }}
      />
      <OrderLabModal
        open={labOpen}
        onClose={() => setLabOpen(false)}
        patientId={patientId}
        onDone={(msg) => {
          setLabOpen(false);
          toast.success(msg);
          reload();
        }}
      />
      <DiagnosisModal
        open={dxOpen}
        onClose={() => setDxOpen(false)}
        patientId={patientId}
        onDone={(msg) => {
          setDxOpen(false);
          toast.success(msg);
          reload();
        }}
      />
    </>
  );
}

/* ------------------------------ tabs ------------------------------------ */

function HistoryTab({ data }) {
  if (!data.history.length) return <Empty icon="clipboard" title="No clinical history recorded" />;
  return (
    <div>
      <div className="section-title">Visit History &amp; Diagnoses</div>
      {data.history.map((h) => (
        <div key={h.ehrId} className="history-item">
          <div className="head">
            <div>
              <div className="date">{formatDate(h.visitDate)}</div>
              <div className="by">Recorded by {h.recordedBy}</div>
            </div>
            {h.followUpDate && <Badge tone="amber">Follow-up: {formatDate(h.followUpDate)}</Badge>}
          </div>
          <h4>{h.diagnosis}</h4>
          {h.treatmentNotes && <p>{h.treatmentNotes}</p>}
          {h.allergies && (
            <div style={{ marginTop: 7 }}>
              <Badge tone="red">⚠ Allergy: {h.allergies}</Badge>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PrescriptionsTab({ data }) {
  if (!data.prescriptions.length) return <Empty icon="clipboard" title="No prescriptions on record" />;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Prescriber</th><th className="num">Items</th><th>Priority</th><th>Status</th></tr>
        </thead>
        <tbody>
          {data.prescriptions.map((r) => (
            <tr key={r.prescriptionId}>
              <td className="mono">{r.number}</td>
              <td>{formatDate(r.prescribedDate)}</td>
              <td>{r.doctorName}</td>
              <td className="num">{r.itemCount}</td>
              <td><Badge status={r.priority}>{r.priority}</Badge></td>
              <td><Badge status={r.status}>{r.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LabsTab({ data }) {
  if (!data.labs.length) return <Empty icon="lab" title="No lab tests ordered" />;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr><th>Test</th><th>Ordered</th><th>Urgency</th><th>Status</th><th>Result</th></tr>
        </thead>
        <tbody>
          {data.labs.map((l) => (
            <tr key={l.labId}>
              <td style={{ fontWeight: 600 }}>{l.testName}</td>
              <td>{formatDate(l.orderDate)}</td>
              <td><Badge status={l.urgency}>{l.urgency}</Badge></td>
              <td><Badge status={l.status}>{l.status}</Badge></td>
              <td>
                {l.status === 'Completed' ? (
                  l.abnormalFlag ? <Badge tone="amber">⚠ Abnormal</Badge> : <Badge tone="green">✓ Normal</Badge>
                ) : (
                  <span className="faint small">Awaiting result</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppointmentsTab({ data }) {
  if (!data.appointments.length) return <Empty icon="calendar" title="No appointments booked" />;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr><th>Date</th><th>Time</th><th>Type</th><th>Reason</th><th>Doctor</th><th>Status</th></tr>
        </thead>
        <tbody>
          {data.appointments.map((a) => (
            <tr key={a.appointmentId}>
              <td>{formatDate(a.date)}</td>
              <td className="mono">{a.time}</td>
              <td>{a.type}</td>
              <td>{truncate(a.reason, 40)}</td>
              <td>{a.doctorName}</td>
              <td><Badge status={a.status}>{a.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillingTab({ data }) {
  if (!data.invoices.length) return <Empty icon="invoice" title="No invoices raised" />;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr><th>Date</th><th className="num">Total</th><th className="num">Owing</th><th>Status</th></tr>
        </thead>
        <tbody>
          {data.invoices.map((i) => (
            <tr key={i.invoiceId}>
              <td>{formatDate(i.invoiceDate)}</td>
              <td className="num">{rand(i.totalAmount)}</td>
              <td className="num">{rand(i.patientOwing)}</td>
              <td><Badge status={i.status}>{i.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsTab() {
  return (
    <Empty
      icon="invoice"
      title="No documents uploaded"
      hint="Consent forms and referral letters will appear here."
    />
  );
}

/* ----------------------------- modals ----------------------------------- */

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every 4 hours', 'As needed', 'At bedtime'];
const ROUTES = ['Oral', 'Intravenous', 'Intramuscular', 'Subcutaneous', 'Topical', 'Inhaled'];

function PrescribeModal({ open, onClose, patient, allergies, onDone }) {
  const toast = useToast();
  const [items, setItems] = useState([{ medicationId: '', dosage: '', frequency: 'Twice daily', durationDays: 7, route: 'Oral', instructions: '' }]);
  const [priority, setPriority] = useState('Routine');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: formulary } = useApi(open ? '/pharmacy/medications' : null, [open]);

  const reset = () => {
    setItems([{ medicationId: '', dosage: '', frequency: 'Twice daily', durationDays: 7, route: 'Oral', instructions: '' }]);
    setPriority('Routine');
    setNotes('');
  };

  const update = (i, key, value) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));

  const addItem = () =>
    setItems((l) => [...l, { medicationId: '', dosage: '', frequency: 'Twice daily', durationDays: 7, route: 'Oral', instructions: '' }]);

  const removeItem = (i) => setItems((l) => l.filter((_, idx) => idx !== i));

  async function submit() {
    const chosen = items.filter((i) => i.medicationId && i.dosage);
    if (!chosen.length) {
      toast.error('Add at least one medication with a dosage.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/prescriptions', { patientId: patient.patientId, priority, pharmacyNotes: notes || undefined, items: chosen });
      reset();
      onDone(res.message);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message);
      } else if (err instanceof ApiError && err.fields?.items) {
        toast.error('Complete the medication details before submitting.');
      } else if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Could not create the prescription.');
      }
    } finally {
      setBusy(false);
    }
  }

  const meds = formulary?.medications ?? [];

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="New Prescription"
      wide
      footer={
        <>
          <button className="btn btn-outline" onClick={() => { reset(); onClose(); }}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '📤'} Issue Prescription
          </button>
        </>
      }
    >
      <Card title="Patient" bodyClass="card-body" className="card">
        <div className="row between wrap">
          <div>
            <div style={{ fontWeight: 600 }}>
              {patient.firstName} {patient.lastName}{' '}
              <span className="mono faint">({patient.patientId})</span>
            </div>
            <div className="faint small">Prescribing on behalf of {new Date().toLocaleDateString('en-ZA')}</div>
          </div>
          <Field label="Priority" error={null}>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 130 }}>
              <option>Routine</option>
              <option>Urgent</option>
            </select>
          </Field>
        </div>
      </Card>

      {allergies.length > 0 && (
        <div className="allergy-banner" style={{ margin: '12px 0' }} role="alert">
          <span className="ico" aria-hidden="true">⚠</span>
          <div>
            <strong>ALLERGY ALERT</strong>
            <p>{patient.firstName} {patient.lastName} is allergic to: <strong>{allergies.join(', ')}</strong></p>
          </div>
        </div>
      )}

      {items.map((item, i) => {
        const selected = meds.find((m) => String(m.medicationId) === String(item.medicationId));
        const clashes = selected && allergies.some(
          (a) => a.toLowerCase() === selected.drugName.toLowerCase() ||
                 String(selected.category || '').toLowerCase().includes(a.toLowerCase()),
        );
        return (
          <Card key={i} title={`Medication ${i + 1}`} bodyClass="card-body" className="card" style={{ marginBottom: 12 }}>
            <Field label="Drug Name (search formulary)" required>
              <select className="select" value={item.medicationId} onChange={(e) => update(i, 'medicationId', e.target.value)}>
                <option value="">Search drug name…</option>
                {meds.map((m) => (
                  <option key={m.medicationId} value={m.medicationId} disabled={m.stockStatus === 'OutOfStock'}>
                    {m.drugName} ({m.category}){m.stockStatus === 'OutOfStock' ? ' — OUT OF STOCK' : ` — ${m.quantityInStock} in stock`}
                  </option>
                ))}
              </select>
            </Field>

            {clashes && (
              <div className="alert danger" style={{ marginBottom: 12 }}>
                <span className="alert-ico" aria-hidden="true">⚠</span>
                <div className="alert-body">
                  <strong>Allergy conflict</strong>
                  This patient is allergic to {allergies.join(', ')}. The server will reject this prescription.
                </div>
              </div>
            )}

            <div className="grid cols-2">
              <Field label="Dosage" required>
                <input className="input" value={item.dosage} onChange={(e) => update(i, 'dosage', e.target.value)} placeholder="e.g. 500mg" />
              </Field>
              <Field label="Frequency" required>
                <select className="select" value={item.frequency} onChange={(e) => update(i, 'frequency', e.target.value)}>
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Duration (days)">
                <input type="number" min="1" className="input" value={item.durationDays} onChange={(e) => update(i, 'durationDays', e.target.value)} />
              </Field>
              <Field label="Route">
                <select className="select" value={item.route} onChange={(e) => update(i, 'route', e.target.value)}>
                  {ROUTES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Special Instructions">
              <textarea className="textarea" value={item.instructions} onChange={(e) => update(i, 'instructions', e.target.value)} placeholder="e.g. Take with food, avoid alcohol…" />
            </Field>
            {items.length > 1 && (
              <button className="btn btn-danger-ghost btn-sm" onClick={() => removeItem(i)}>✕ Remove medication</button>
            )}
          </Card>
        );
      })}

      <button className="btn btn-outline btn-sm" onClick={addItem} style={{ marginBottom: 12 }}>
        <Icon name="plus" size={14} /> Add another medication
      </button>

      <Field label="Pharmacy Notes">
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the pharmacist…" />
      </Field>
    </Modal>
  );
}

function OrderLabModal({ open, onClose, patientId, onDone }) {
  const toast = useToast();
  const [testName, setTestName] = useState(TEST_TEMPLATES[0]);
  const [custom, setCustom] = useState('');
  const [urgency, setUrgency] = useState('Routine');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const name = custom.trim() || testName;
    if (!name) {
      toast.error('Select or type a test name.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/labs', { patientId, testName: name, urgency });
      setCustom('');
      onDone(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not order the test.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Order Lab Test"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '⚗'} Order Test
          </button>
        </>
      }
    >
      <Field label="Test" required>
        <select className="select" value={testName} onChange={(e) => setTestName(e.target.value)}>
          {TEST_TEMPLATES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Or type a custom test" hint="Overrides the selection above">
        <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom test name…" />
      </Field>
      <Field label="Urgency" required>
        <select className="select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          <option>Routine</option>
          <option>Urgent</option>
          <option>STAT</option>
        </select>
      </Field>
    </Modal>
  );
}

function DiagnosisModal({ open, onClose, patientId, onDone }) {
  const toast = useToast();
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!diagnosis.trim()) {
      toast.error('Enter a diagnosis.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/ehr/${patientId}/diagnosis`, {
        diagnosis,
        treatmentNotes: notes || undefined,
        followUpDate: followUp || undefined,
      });
      setDiagnosis(''); setNotes(''); setFollowUp('');
      onDone('Diagnosis added to the patient record.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save the diagnosis.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Diagnosis"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '💾'} Save Diagnosis
          </button>
        </>
      }
    >
      <Field label="Diagnosis" required>
        <input className="input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Hypertension (Stage 1)" />
      </Field>
      <Field label="Treatment Notes">
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Medication, advice, follow-up instructions…" />
      </Field>
      <Field label="Follow-up Date">
        <input type="date" className="input" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
      </Field>
    </Modal>
  );
}