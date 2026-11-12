import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useApi from '../hooks/useApi.js';
import Icon from '../components/Icon.jsx';
import {
  Card, Badge, Modal, Field, Loading, ErrorNote, Empty } from '../components/ui.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';

const STATUS_ICON = {
  Completed: { ico: '✓', tone: 'var(--success)' },
  InProgress: { ico: '◷', tone: 'var(--info)' },
  Ordered: { ico: '◷', tone: 'var(--text-faint)' },
};

export default function LabResults() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [filter, setFilter] = useState('All');

  const canUpload = ['LabTech', 'Admin'].includes(user?.role);

  const { data, loading, error, reload } = useApi('/labs');
  const labs = data?.labs ?? [];

  const filtered = useMemo(
    () => (filter === 'All' ? labs : labs.filter((l) => l.status === filter)),
    [labs, filter],
  );

  // Default selection prioritises the most clinically urgent order: an
  // abnormal result first, then anything still awaiting upload.
  useEffect(() => {
    if (labs.length && selectedId === null) {
      const pick =
        labs.find((l) => l.abnormalFlag) ||
        labs.find((l) => l.status !== 'Completed') ||
        labs[0];
      setSelectedId(pick.labId);
    }
  }, [labs, selectedId]);

  const selected = labs.find((l) => l.labId === selectedId) || null;

  return (
    <>
      <div className="page-head">
        <h1>Lab Results</h1>
        <div className="sub">SCR-09 · Upload and review test results</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)' }}>
        {/* ---------------- Order list ---------------- */}
        <Card title={`Lab Orders (${filtered.length})`} icon="lab" bodyClass="card-body">
          <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
            {['All', 'Ordered', 'InProgress', 'Completed'].map((s) => (
              <button key={s} className={`chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'InProgress' ? 'In progress' : s}
              </button>
            ))}
          </div>

          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorNote error={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <Empty icon="lab" title="No lab orders" />
          ) : (
            <div>
              {filtered.map((l) => {
                const icon = STATUS_ICON[l.status] || STATUS_ICON.Ordered;
                return (
                  <button
                    key={l.labId}
                    className="lab-row"
                    style={{
                      width: '100%', textAlign: 'left', border: 'none',
                      borderBottom: '1px solid var(--border)',
                      background: l.labId === selectedId ? 'var(--alert-info-bg)' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedId(l.labId)}
                  >
                    <span style={{ color: icon.tone, fontWeight: 700, fontSize: 14 }} aria-hidden="true">
                      {icon.ico}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name">{l.patientName}</div>
                      <div className="sub">{l.testName}</div>
                      <div className="chips">
                        <span className="faint small">{formatDate(l.orderDate)}</span>
                        {l.urgency !== 'Routine' && <Badge status={l.urgency}>{l.urgency}</Badge>}
                        {l.abnormalFlag && <Badge tone="amber">⚠ Abnormal</Badge>}
                        {l.status === 'InProgress' && <Badge tone="blue">In progress</Badge>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* ---------------- Result detail ---------------- */}
        <div>
          {!selected ? (
            <Card bodyClass="card-body">
              <Empty icon="lab" title="Select a lab order" hint="Choose an order on the left to view its results." />
            </Card>
          ) : (
            <>
              <div className="panel-header" style={{ borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
                <h3>Lab Results</h3>
                <div className="sub">
                  Patient: {selected.patientName} ({selected.patientId})
                </div>
              </div>

              <div className="card" style={{ borderTop: 'none', borderRadius: '0 0 var(--r-lg) var(--r-lg)' }}>
                <div className="card-body">
                  <div className="row between wrap" style={{ marginBottom: 14, gap: 10 }}>
                    {canUpload && selected.status !== 'Completed' ? (
                      <button className="btn btn-primary btn-sm" onClick={() => setUploading(selected)}>
                        <Icon name="plus" size={15} /> Upload New Results
                      </button>
                    ) : (
                      <div className="faint small">
                        Ordered by: {selected.orderedByName}
                      </div>
                    )}
                    <div className="row" style={{ gap: 7 }}>
                      <Badge status={selected.urgency}>{selected.urgency}</Badge>
                      <Badge status={selected.status}>{selected.status}</Badge>
                    </div>
                  </div>

                  <div className="row between wrap" style={{ marginBottom: 12, gap: 10 }}>
                    <div>
                      <h4 style={{ fontSize: 15 }}>Test: {selected.testName}</h4>
                      <div className="faint small">
                        Order Date: {formatDate(selected.orderDate)} · Lab ID:{' '}
                        <span className="mono">{selected.labNumber}</span>
                      </div>
                    </div>
                    {selected.abnormalFlag && <Badge tone="amber">⚠ Abnormal Values</Badge>}
                  </div>

                  {selected.status !== 'Completed' ? (
                    <Empty
                      icon="clock"
                      title="Awaiting results"
                      hint={
                        canUpload
                          ? 'Upload the result set to complete this order.'
                          : 'The lab technician has not uploaded results yet.'
                      }
                    />
                  ) : (
                    <>
                      <div className="table-wrap">
                        <table className="data">
                          <thead>
                            <tr>
                              <th>Parameter</th>
                              <th>Result</th>
                              <th>Normal Range</th>
                              <th>Flag</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selected.resultData ?? []).map((row, i) => {
                              const abnormal = ['LOW', 'HIGH', 'CRITICAL', 'ABNORMAL'].includes(
                                String(row.flag).toUpperCase(),
                              );
                              return (
                                <tr key={i} className={abnormal ? 'flag-row-odd' : ''}>
                                  <td>{row.parameter}</td>
                                  <td className="mono" style={{ fontWeight: 700 }}>{row.result}</td>
                                  <td className="small muted">{row.range}</td>
                                  <td>
                                    {abnormal ? (
                                      <span className="flag-cell" style={{ color: 'var(--danger)' }}>
                                        ⚠ {String(row.flag).toUpperCase()}
                                      </span>
                                    ) : (
                                      <span className="flag-cell" style={{ color: 'var(--success)' }}>
                                        ✓ {row.flag}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {selected.technicianNotes && (
                        <div className="alert info" style={{ marginTop: 14 }}>
                          <span className="alert-ico" aria-hidden="true">ℹ</span>
                          <div className="alert-body">
                            <strong>Lab Technician Notes:</strong>
                            <div className="small">{selected.technicianNotes}</div>
                          </div>
                        </div>
                      )}

                      <div className="row" style={{ marginTop: 13, color: 'var(--success)', fontSize: 13 }}>
                        <span aria-hidden="true">✓</span>
                        <span>Results uploaded — {selected.orderedByName} notified</span>
                      </div>

                      <div className="row" style={{ gap: 9, marginTop: 14 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/patients/${selected.patientId}`)}>
                          <Icon name="eye" size={14} /> View in EHR
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                          <Icon name="print" size={14} /> Print Results
                        </button>
                      </div>
                    </>
                  )}

                  {selected.resultDate && (
                    <div className="faint small" style={{ marginTop: 12 }}>
                      Resulted {formatDateTime(selected.resultDate)} by {selected.uploadedByName}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <UploadModal
        lab={uploading}
        onClose={() => setUploading(null)}
        onDone={(msg, abnormal) => {
          setUploading(null);
          if (abnormal) toast.error(msg);
          else toast.success(msg);
          reload();
        }}
      />
    </>
  );
}

/* ==========================================================================
   Result upload (SCR-09). The server derives the abnormal flag from the
   per-parameter flags so the dashboard and email alerts always agree.
   ========================================================================== */

const PRESETS = {
  'Full Blood Count (FBC)': [
    { parameter: 'Haemoglobin', result: '', range: '12.0–16.0 g/dL', flag: 'Normal' },
    { parameter: 'White Cell Count', result: '', range: '4.0–11.0 ×10⁹/L', flag: 'Normal' },
    { parameter: 'Platelets', result: '', range: '150–400 ×10⁹/L', flag: 'Normal' },
    { parameter: 'MCV', result: '', range: '80–100 fL', flag: 'Normal' },
    { parameter: 'Serum Ferritin', result: '', range: '12–150 µg/L', flag: 'Normal' },
  ],
  'HbA1c & Fasting Glucose': [
    { parameter: 'HbA1c', result: '', range: '4.0–5.6 %', flag: 'Normal' },
    { parameter: 'Fasting Glucose', result: '', range: '3.9–5.5 mmol/L', flag: 'Normal' },
  ],
  'Lipid Profile': [
    { parameter: 'Total Cholesterol', result: '', range: '< 5.2 mmol/L', flag: 'Normal' },
    { parameter: 'LDL Cholesterol', result: '', range: '< 3.0 mmol/L', flag: 'Normal' },
    { parameter: 'HDL Cholesterol', result: '', range: '> 1.0 mmol/L', flag: 'Normal' },
    { parameter: 'Triglycerides', result: '', range: '< 1.7 mmol/L', flag: 'Normal' },
  ],
};

const FLAGS = ['Normal', 'LOW', 'HIGH', 'CRITICAL'];

function UploadModal({ lab, onClose, onDone }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (lab) {
      setRows(PRESETS[lab.testName] || [{ parameter: '', result: '', range: '', flag: 'Normal' }]);
      setNotes('');
    }
  }, [lab]);

  const update = (i, key, value) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));

  const abnormalCount = rows.filter((r) => !['Normal', 'normal'].includes(r.flag)).length;

  async function submit() {
    const filled = rows.filter((r) => r.parameter.trim() && String(r.result).trim());
    if (!filled.length) {
      toast.error('Enter at least one parameter and its result.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/labs/${lab.labId}/results`, {
        resultData: filled,
        technicianNotes: notes || undefined,
      });
      onDone(res.message, res.abnormalFlag);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not upload the results.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(lab)}
      onClose={onClose}
      title={`Upload Results — ${lab?.labNumber ?? ''}`}
      wide
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '📤'} Upload Results
          </button>
        </>
      }
    >
      {lab && (
        <div className="row between wrap" style={{ marginBottom: 14, gap: 8 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{lab.patientName}</div>
            <div className="faint small">{lab.testName} · ordered by {lab.orderedByName}</div>
          </div>
          {abnormalCount > 0 && <Badge tone="red">⚠ {abnormalCount} abnormal value{abnormalCount > 1 ? 's' : ''}</Badge>}
        </div>
      )}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr><th>Parameter</th><th>Result</th><th>Normal Range</th><th>Flag</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={['Normal', 'normal'].includes(r.flag) ? '' : 'flag-row-odd'}>
                <td><input className="input" value={r.parameter} onChange={(e) => update(i, 'parameter', e.target.value)} placeholder="Parameter" /></td>
                <td><input className="input" value={r.result} onChange={(e) => update(i, 'result', e.target.value)} placeholder="e.g. 11.2 g/dL" /></td>
                <td><input className="input" value={r.range} onChange={(e) => update(i, 'range', e.target.value)} placeholder="Range" /></td>
                <td style={{ width: 130 }}>
                  <select className="select" value={r.flag} onChange={(e) => update(i, 'flag', e.target.value)}>
                    {FLAGS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </td>
                <td className="actions">
                  {rows.length > 1 && (
                    <button className="link-btn danger" onClick={() => setRows((x) => x.filter((_, idx) => idx !== i))}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className="btn btn-outline btn-sm"
        style={{ marginTop: 10 }}
        onClick={() => setRows((r) => [...r, { parameter: '', result: '', range: '', flag: 'Normal' }])}
      >
        <Icon name="plus" size={14} /> Add parameter
      </button>

      <div style={{ marginTop: 14 }}>
        <Field label="Lab Technician Notes">
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clinical interpretation and recommended follow-up…"
          />
        </Field>
      </div>
    </Modal>
  );
}