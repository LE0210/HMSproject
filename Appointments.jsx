import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useApi from '../hooks/useApi.js';
import Icon from '../components/Icon.jsx';
import {
  Card, Avatar, Badge, Modal, Field, Loading, ErrorNote, Empty, Stat } from '../components/ui.jsx';
import { formatDate } from '../utils/format.js';

const TYPES = ['Consultation', 'Follow-up', 'Procedure'];
const STATUS_FILTERS = ['All', 'Scheduled', 'Completed', 'Cancelled', 'NoShow'];
const TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

export default function Appointments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [date, setDate] = useState('2026-05-12');
  const [statusFilter, setStatusFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [booking, setBooking] = useState(false);

  const canBook = ['Admin', 'BillingClerk', 'Doctor'].includes(user?.role);

  const { data, loading, error, reload } = useApi(
    `/appointments?date=${date}`,
    [date],
  );
  const { data: summary, reload: reloadSummary } = useApi('/appointments/summary');

  const rows = data?.appointments ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      if (!q) return true;
      return [a.patientName, a.patientId, a.doctorName, a.reason]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, statusFilter, query]);

  async function setStatus(id, status) {
    try {
      await api.patch(`/appointments/${id}`, { status });
      toast.success(`Appointment marked ${status}.`);
      reload();
      reloadSummary();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update the appointment.');
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="row between wrap">
          <div>
            <h1>Appointment Scheduling</h1>
            <div className="sub">SCR-05 · Manage and book appointments</div>
          </div>
          {canBook && (
            <button className="btn btn-primary" onClick={() => setBooking(true)}>
              <Icon name="plus" size={15} /> Book Appointment
            </button>
          )}
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 14 }}>
        <Stat label="Today Total" value={summary?.total ?? 0} icon="calendar" tile="blue" foot={`${summary?.completed ?? 0} completed`} />
        <Stat label="No Shows" value={summary?.noShows ?? 0} icon="warning" tile="red" tone="red" foot="Across the period" attention={(summary?.noShows ?? 0) > 0} />
      </div>

      <Card
        title="Appointments"
        icon="calendar"
        action={
          <div className="row wrap" style={{ gap: 8 }}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 155 }} />
          </div>
        }
        bodyClass="card-body"
      >
        <div className="row between wrap" style={{ marginBottom: 12 }}>
          <input
            className="input"
            style={{ maxWidth: 300 }}
            placeholder="🔍 Search patient…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="row wrap" style={{ gap: 6 }}>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                className={`chip${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNote error={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <Empty icon="calendar" title="No appointments for this date" hint="Try another date or clear the filters." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Doctor</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Reminder</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.appointmentId}>
                    <td>
                      <div className="row" style={{ gap: 9 }}>
                        <Avatar initials={a.patientInitials} size="sm" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{a.patientName}</div>
                          <div className="sub mono">{a.patientId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="small">{formatDate(a.appointmentDate)}</td>
                    <td className="mono">{a.appointmentTime}</td>
                    <td className="small">{a.appointmentType}</td>
                    <td className="small">{a.doctorName}</td>
                    <td className="small">{a.reason}</td>
                    <td><Badge status={a.status}>{a.status}</Badge></td>
                    <td className="small">
                      {a.reminderSent ? <span style={{ color: 'var(--success)' }}>✓ Sent</span> : <span className="faint">◷ Pending</span>}
                    </td>
                    <td className="actions">
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <button className="link-btn" onClick={() => navigate(`/patients/${a.patientId}`)}>EHR</button>
                        {a.status === 'Scheduled' && (
                          <>
                            <button className="link-btn" onClick={() => setStatus(a.appointmentId, 'Completed')}>Complete</button>
                            <button className="link-btn" onClick={() => setStatus(a.appointmentId, 'NoShow')}>No-show</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <BookingModal
        open={booking}
        onClose={() => setBooking(false)}
        defaultDate={date}
        onDone={(msg) => {
          setBooking(false);
          toast.success(msg);
          reload();
          reloadSummary();
        }}
      />
    </>
  );
}

/* ==========================================================================
   Booking modal (SCR-05).
   Design change from usability testing (report Section 2.1): a Specialty
   filter was added because the receptionist could not find the right doctor.
   ========================================================================== */

const SPECIALTIES = ['All Specialties', 'General Practice', 'Cardiology', 'Paediatrics', 'Orthopaedics', 'Gynaecology'];

function BookingModal({ open, onClose, defaultDate, onDone }) {
  const toast = useToast();
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState('');
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [specialty, setSpecialty] = useState('General Practice');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState('Consultation');
  const [reason, setReason] = useState('');
  const [sms, setSms] = useState(true);
  const [email, setEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data: patientsData } = useApi(open ? '/patients' : null, [open]);
  const { data: doctorsData } = useApi(open ? '/staff?role=Doctor&includeInactive=false' : null, [open]);
  const { data: availability, reload: reloadAvailability } = useApi(
    open && doctorId ? `/appointments/availability?doctorId=${doctorId}` : null,
    [open, doctorId],
  );

  // Design change: narrowing by specialty makes the right doctor findable.
  const doctors = useMemo(() => {
    const list = doctorsData?.staff ?? [];
    if (specialty === 'All Specialties') return list;
    return list.filter((d) => d.specialty === specialty);
  }, [doctorsData, specialty]);

  useEffect(() => {
    if (!doctors.some((d) => d.staffId === doctorId)) {
      setDoctorId(doctors[0]?.staffId ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, doctorsData]);

  useEffect(() => {
    if (open) setDate(defaultDate);
  }, [open, defaultDate]);

  const patients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    const list = patientsData?.patients ?? [];
    if (!q) return list.slice(0, 6);
    return list
      .filter((p) => `${p.fullName} ${p.patientId}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [patientsData, patientQuery]);

  const chosenPatient = (patientsData?.patients ?? []).find((p) => p.patientId === patientId);

  async function submit() {
    if (!patientId) { toast.error('Search and select a patient.'); return; }
    if (!doctorId) { toast.error('Select a doctor.'); return; }
    if (!reason.trim()) { toast.error('Enter a reason for the visit.'); return; }

    setBusy(true);
    try {
      const res = await api.post('/appointments', {
        patientId, doctorId, appointmentDate: date, appointmentTime: time,
        appointmentType: type, reason, sendSms: sms, sendEmail: email,
      });
      setPatientId(''); setPatientQuery(''); setReason('');
      onDone(res.message);
    } catch (err) {
      if (err instanceof ApiError && err.fields?.appointmentTime) {
        toast.error(err.message);
        reloadAvailability();
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Could not book the appointment.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Book New Appointment"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-lg" style={{ minWidth: 200 }} onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'CONFIRM BOOKING'}
          </button>
        </>
      }
    >
      <Field label="Search Patient" required>
        <input
          className="input"
          placeholder="🔍 Search by name or Patient ID…"
          value={patientQuery}
          onChange={(e) => { setPatientQuery(e.target.value); setPatientId(''); }}
        />
        <div className="row wrap" style={{ gap: 6, marginTop: 7 }}>
          {patients.map((p) => (
            <button
              key={p.patientId}
              className={`chip${patientId === p.patientId ? ' active' : ''}`}
              onClick={() => { setPatientId(p.patientId); setPatientQuery(p.fullName); }}
              type="button"
            >
              {p.fullName}
            </button>
          ))}
          {patients.length === 0 && <span className="faint small">No matching patients.</span>}
        </div>
        {chosenPatient && (
          <div className="alert info" style={{ marginTop: 9 }}>
            <span className="alert-ico" aria-hidden="true">✓</span>
            <div className="alert-body">
              <strong>{chosenPatient.fullName}</strong>
              <div className="small">
                {chosenPatient.patientId} · {chosenPatient.phoneNumber}
                {chosenPatient.emailAddress ? ` · ${chosenPatient.emailAddress}` : ''}
              </div>
            </div>
          </div>
        )}
      </Field>

      <div className="grid cols-2">
        <Field label="Specialty" hint="Filters the doctor list below">
          <select className="select" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Doctor" required>
          <select className="select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctors.length === 0 && <option value="">No doctors for this specialty</option>}
            {doctors.map((d) => (
              <option key={d.staffId} value={d.staffId}>{d.fullName}</option>
            ))}
          </select>
        </Field>
      </div>

      {availability?.days?.length > 0 && (
        <Field label={`Availability — Week of ${formatDate(availability.days[0].date)}`}>
          <div className="day-strip">
            {availability.days.map((d) => (
              <button
                key={d.date}
                type="button"
                disabled={!d.available}
                className={`day-chip${d.date === date ? ' selected' : ''}${d.available ? '' : ' unavailable'}`}
                onClick={() => setDate(d.date)}
              >
                <div className="dow">{d.label}</div>
                <div className="dom">{d.dayOfMonth} {formatDate(d.date).slice(3, 6)}</div>
                <div className="tick">{d.available ? '✓' : '✕'}</div>
              </button>
            ))}
          </div>
        </Field>
      )}

      <div className="grid cols-2">
        <Field label="Time Slot" required>
          <select className="select" value={time} onChange={(e) => setTime(e.target.value)}>
            {TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Appointment Type" required>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Reason for Visit" required>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief description of reason…" />
      </Field>

      <div className="row wrap" style={{ gap: 18, marginBottom: 6 }}>
        <label className="checkbox-row">
          <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
          Send SMS reminder 24h before
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
          Send Email confirmation
        </label>
      </div>
    </Modal>
  );
}