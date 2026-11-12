import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useApi from '../hooks/useApi.js';
import Icon from '../components/Icon.jsx';
import {
  Card, Avatar, Badge, Modal, Field, Loading, ErrorNote, Empty } from '../components/ui.jsx';
import { formatDate } from '../utils/format.js';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const EMPTY_FORM = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '', idNumber: '',
  bloodType: '', phoneNumber: '', emailAddress: '', physicalAddress: '',
  medicalAidProvider: '', medicalAidNumber: '',
  emergencyContactName: '', emergencyContactPhone: '',
};

export default function Patients() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [registering, setRegistering] = useState(false);

  const { data, loading, error, reload } = useApi('/patients');

  const canRegister = ['Admin', 'BillingClerk'].includes(user?.role);

  const patients = data?.patients ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      [p.fullName, p.patientId, p.phoneNumber, p.idNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [patients, query]);

  return (
    <>
      <div className="page-head">
        <div className="row between wrap">
          <div>
            <h1>Patients</h1>
            <div className="sub">SCR-01 · Search and manage registered patients</div>
          </div>
          {canRegister && (
            <button className="btn btn-primary" onClick={() => setRegistering(true)}>
              <Icon name="plus" size={15} /> Register New Patient
            </button>
          )}
        </div>
      </div>

      <Card
        title="Patient Directory"
        icon="users"
        action={
          <div className="input-wrap" style={{ width: 280 }}>
            <input
              className="input"
              placeholder="🔍 Search by name, ID or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
        bodyClass="card-body"
      >
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNote error={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <Empty icon="users" title="No patients found" hint="Try a different search term." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Patient ID</th>
                  <th>Age / Gender</th>
                  <th>Blood</th>
                  <th>Contact</th>
                  <th>Medical Aid</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.patientId}
                    className="clickable"
                    onClick={() => navigate(`/patients/${p.patientId}`)}
                  >
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar initials={p.initials} size="sm" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.fullName}</div>
                          <div className="sub">{p.dateOfBirth}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono small">{p.patientId}</td>
                    <td>
                      {p.age != null ? `${p.age} yrs` : '—'} · {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}
                    </td>
                    <td>{p.bloodType ? <Badge tone="red">{p.bloodType}</Badge> : <span className="faint">—</span>}</td>
                    <td>
                      <div className="small">{p.phoneNumber}</div>
                      {p.emailAddress && <div className="sub">{p.emailAddress}</div>}
                    </td>
                    <td>
                      {p.medicalAidProvider ? (
                        <>
                          <div className="small">{p.medicalAidProvider}</div>
                          <div className="sub">{p.medicalAidNumber}</div>
                        </>
                      ) : (
                        <Badge tone="grey">None</Badge>
                      )}
                    </td>
                    <td className="small">{formatDate(p.registrationDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <RegistrationModal
        open={registering}
        onClose={() => setRegistering(false)}
        onDone={(patient) => {
          setRegistering(false);
          toast.success(`Patient ${patient.patientId} registered.`);
          reload();
          navigate(`/patients/${patient.patientId}`);
        }}
      />
    </>
  );
}

/* ==========================================================================
   SCR-02 — New Patient Registration
   Design change #2 (report Section 2.2): the primary action buttons appear at
   BOTH the top-right and the bottom of the form, because the single bottom
   button was missed on smaller screens.
   ========================================================================== */

function RegistrationModal({ open, onClose, onDone }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'Required';
    if (!form.lastName.trim()) next.lastName = 'Required';
    if (!form.dateOfBirth) next.dateOfBirth = 'Required';
    if (!form.gender) next.gender = 'Select a gender';
    if (!form.phoneNumber.trim()) next.phoneNumber = 'Required';
    if (form.idNumber && !/^\d{13}$/.test(form.idNumber)) {
      next.idNumber = 'ID number must be 13 digits';
    }
    if (form.phoneNumber && !/^[0-9+\-\s()]{7,15}$/.test(form.phoneNumber)) {
      next.phoneNumber = 'Enter a valid phone number';
    }
    if (form.emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.emailAddress)) {
      next.emailAddress = 'Enter a valid email address';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    try {
      const res = await api.post('/patients', form);
      setForm(EMPTY_FORM);
      onDone(res.patient);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields || {});
        if (!err.fields) toast.error(err.message);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  // Same primary action, rendered in the header and at the foot of the form.
  const saveButton = (
    <button className="btn btn-primary" onClick={onSubmit} disabled={busy} type="button">
      {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '💾'} Save &amp; Generate Patient ID
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Patient Registration"
      wide
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} type="button">
            Cancel
          </button>
          {saveButton}
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="faint small">SCR-02 · Required fields marked with *</div>
          {saveButton}
        </div>

        <Card title="Personal Details" className="card" bodyClass="card-body">
          <div className="grid cols-2">
            <Field label="First Name" required error={errors.firstName}>
              <input className={`input${errors.firstName ? ' error' : ''}`} value={form.firstName} onChange={set('firstName')} placeholder="e.g. John" />
            </Field>
            <Field label="Surname" required error={errors.lastName}>
              <input className={`input${errors.lastName ? ' error' : ''}`} value={form.lastName} onChange={set('lastName')} placeholder="e.g. Mokoena" />
            </Field>
            <Field label="Date of Birth" required error={errors.dateOfBirth}>
              <input type="date" className={`input${errors.dateOfBirth ? ' error' : ''}`} value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <select className={`select${errors.gender ? ' error' : ''}`} value={form.gender} onChange={set('gender')}>
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="X">Other</option>
              </select>
            </Field>
            <Field label="ID Number" error={errors.idNumber} hint="13 digits">
              <input className={`input${errors.idNumber ? ' error' : ''}`} value={form.idNumber} onChange={set('idNumber')} placeholder="e.g. 8506035467890" inputMode="numeric" />
            </Field>
            <Field label="Blood Type" error={errors.bloodType}>
              <select className="select" value={form.bloodType} onChange={set('bloodType')}>
                <option value="">Select blood type</option>
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <div style={{ height: 12 }} />

        <Card title="Contact Information" bodyClass="card-body">
          <div className="grid cols-2">
            <Field label="Phone Number" required error={errors.phoneNumber}>
              <input className={`input${errors.phoneNumber ? ' error' : ''}`} value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="e.g. 0731234567" inputMode="tel" />
            </Field>
            <Field label="Email Address" error={errors.emailAddress}>
              <input className={`input${errors.emailAddress ? ' error' : ''}`} value={form.emailAddress} onChange={set('emailAddress')} placeholder="e.g. patient@email.com" type="email" />
            </Field>
          </div>
          <Field label="Physical Address" error={errors.physicalAddress}>
            <textarea className="textarea" value={form.physicalAddress} onChange={set('physicalAddress')} placeholder="Street address, City, Postal code" />
          </Field>
        </Card>

        <div style={{ height: 12 }} />

        <Card title="Medical Aid & Emergency Contact" bodyClass="card-body">
          <div className="grid cols-2">
            <Field label="Medical Aid Provider" error={errors.medicalAidProvider}>
              <input className="input" value={form.medicalAidProvider} onChange={set('medicalAidProvider')} placeholder="e.g. Discovery Health" />
            </Field>
            <Field label="Medical Aid Number" error={errors.medicalAidNumber}>
              <input className="input" value={form.medicalAidNumber} onChange={set('medicalAidNumber')} placeholder="e.g. DH998213" />
            </Field>
            <Field label="Emergency Contact Name" error={errors.emergencyContactName}>
              <input className="input" value={form.emergencyContactName} onChange={set('emergencyContactName')} placeholder="Full name" />
            </Field>
            <Field label="Emergency Contact Phone" error={errors.emergencyContactPhone}>
              <input className="input" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} placeholder="e.g. 0731234567" inputMode="tel" />
            </Field>
          </div>
        </Card>
      </form>
    </Modal>
  );
}