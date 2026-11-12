import { useMemo, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useApi from '../hooks/useApi.js';
import Icon from '../components/Icon.jsx';
import {
  Card, Avatar, Badge, Stat, Modal, Field, Loading, ErrorNote, Empty } from '../components/ui.jsx';
import { formatDateTime } from '../utils/format.js';

const ROLE_TONES = {
  Doctor: 'blue', Nurse: 'teal', Pharmacist: 'purple',
  Admin: 'red', BillingClerk: 'amber', LabTech: 'green',
};

export default function UserManagement() {
  const { user } = useAuth();
  const toast = useToast();

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const { data, loading, error, reload } = useApi('/staff');
  const { data: auditData, loading: auditLoading, reload: reloadAudit } = useApi('/staff/audit-log?limit=8');

  const staff = data?.staff ?? [];

  const summary = useMemo(
    () => ({
      total: staff.length,
      active: staff.filter((s) => s.isActive).length,
      inactive: staff.filter((s) => !s.isActive).length,
      roles: new Set(staff.map((s) => s.role)).size,
    }),
    [staff],
  );

  async function toggle(s) {
    setBusyId(s.staffId);
    try {
      const res = await api.post(`/staff/${s.staffId}/toggle`);
      toast.success(res.message);
      reload();
      reloadAudit();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update the account.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="row between wrap">
          <div>
            <h1>User Management</h1>
            <div className="sub">SCR-10 · Admin panel · Role-based access control</div>
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={15} /> Add User</button>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <Stat label="Total Staff" value={summary.total} icon="users" tile="blue" foot="All accounts" />
        <Stat label="Active" value={summary.active} icon="check" tile="green" tone="green" foot="Can sign in" />
        <Stat label="Inactive" value={summary.inactive} icon="stop" tile="red" foot="Access revoked" attention={summary.inactive > 0} />
        <Stat label="Roles" value={summary.roles} icon="settings" tile="purple" foot="Defined RBAC roles" />
      </div>

      <Card title="Staff Accounts" icon="users" bodyClass="card-body">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNote error={error} onRetry={reload} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Staff ID</th>
                  <th>Role</th>
                  <th>Specialty</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.staffId}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar initials={s.initials} size="sm" tone={ROLE_TONES[s.role] === 'blue' ? 'blue' : undefined} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.fullName}</div>
                          <div className="sub">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono small">{s.staffId}</td>
                    <td><Badge tone={ROLE_TONES[s.role]}>{s.role}</Badge></td>
                    <td className="small">{s.specialty || <span className="faint">—</span>}</td>
                    <td className="mono small">{s.phone}</td>
                    <td>
                      {s.isActive ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 12.5 }}>✓ Active</span>
                      ) : (
                        <span className="faint" style={{ fontSize: 12.5 }}>⦸ Inactive</span>
                      )}
                    </td>
                    <td className="actions">
                      <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
                        <button className="link-btn" onClick={() => setEditing(s)}>✎ Edit</button>
                        {s.staffId === user?.staffId ? (
                          <span className="faint small">Current user</span>
                        ) : (
                          <button
                            className={`link-btn${s.isActive ? ' danger' : ''}`}
                            onClick={() => toggle(s)}
                            disabled={busyId === s.staffId}
                          >
                            {s.isActive ? '⊘ Deactivate' : '◉ Activate'}
                          </button>
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

      <div style={{ height: 14 }} />

      <Card
        title="Audit Log"
        icon="clock"
        action={<span className="faint small">Last {auditData?.entries?.length ?? 0} events · POPIA compliant</span>}
        bodyClass="card-body"
      >
        {auditLoading ? (
          <Loading />
        ) : !auditData?.entries?.length ? (
          <Empty icon="clock" title="No audit entries yet" />
        ) : (
          <div>
            {auditData.entries.map((e) => (
              <div
                key={e.logId}
                className="row"
                style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', gap: 12 }}
              >
                <span style={{ color: 'var(--primary)', fontSize: 15 }} aria-hidden="true">◷</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong>{e.staffName}</strong>
                    <span className="muted"> · {e.action}</span>
                  </div>
                  <div className="faint small">
                    {formatDateTime(e.timestamp)} · IP: {e.ipAddress}
                  </div>
                </div>
                {e.affectedTable && <Badge tone="grey">{e.affectedTable}</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <StaffModal
        open={creating}
        onClose={() => setCreating(false)}
        onDone={(msg) => {
          setCreating(false);
          toast.success(msg);
          reload();
          reloadAudit();
        }}
      />
      <StaffModal
        open={Boolean(editing)}
        staff={editing}
        onClose={() => setEditing(null)}
        onDone={(msg) => {
          setEditing(null);
          toast.success(msg);
          reload();
          reloadAudit();
        }}
      />
    </>
  );
}

function StaffModal({ open, staff, onClose, onDone }) {
  const toast = useToast();
  const editing = Boolean(staff);

  const [form, setForm] = useState({
    staffId: '', firstName: '', lastName: '', role: 'Nurse', specialty: '',
    email: '', phone: '', password: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Load the selected account's values whenever the modal opens.
  const key = staff?.staffId ?? 'new';
  useMemo(() => {
    if (!open) return;
    setErrors({});
    setForm(
      staff
        ? {
            staffId: staff.staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
            role: staff.role,
            specialty: staff.specialty || '',
            email: staff.email || '',
            phone: staff.phone || '',
            password: '',
          }
        : { staffId: '', firstName: '', lastName: '', role: 'Nurse', specialty: '', email: '', phone: '', password: '' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, open]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit() {
    const next = {};
    if (!editing && !form.staffId.trim()) next.staffId = 'Required';
    if (!form.firstName.trim()) next.firstName = 'Required';
    if (!form.lastName.trim()) next.lastName = 'Required';
    if (!form.email.trim()) next.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = 'Enter a valid email address';
    if (!editing && form.password.length < 8) next.password = 'Use at least 8 characters';
    if (editing && form.password && form.password.length < 8) next.password = 'Use at least 8 characters';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        delete payload.staffId;
        const res = await api.patch(`/staff/${form.staffId}`, payload);
        onDone(res.message);
      } else {
        const res = await api.post('/staff', form);
        onDone(res.message);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields || {});
        if (!err.fields) toast.error(err.message);
      } else {
        toast.error('Could not save the account.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit Account — ${staff?.fullName}` : 'Add Staff Account'}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '💾'} Save
          </button>
        </>
      }
    >
      <div className="grid cols-2">
        <Field label="Staff ID" required={!editing} error={errors.staffId}>
          <input className={`input${errors.staffId ? ' error' : ''}`} value={form.staffId} onChange={set('staffId')} disabled={editing} placeholder="e.g. NR003" />
        </Field>
        <Field label="Role" required error={errors.role}>
          <select className="select" value={form.role} onChange={set('role')}>
            {['Doctor', 'Nurse', 'Pharmacist', 'Admin', 'BillingClerk', 'LabTech'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="First Name" required error={errors.firstName}>
          <input className={`input${errors.firstName ? ' error' : ''}`} value={form.firstName} onChange={set('firstName')} />
        </Field>
        <Field label="Last Name" required error={errors.lastName}>
          <input className={`input${errors.lastName ? ' error' : ''}`} value={form.lastName} onChange={set('lastName')} />
        </Field>
        <Field label="Email Address" required error={errors.email}>
          <input className={`input${errors.email ? ' error' : ''}`} value={form.email} onChange={set('email')} type="email" />
        </Field>
        <Field label="Phone Number" error={errors.phone}>
          <input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" />
        </Field>
        {form.role === 'Doctor' && (
          <Field label="Specialty" error={errors.specialty}>
            <select className="select" value={form.specialty} onChange={set('specialty')}>
              <option value="">Select specialty…</option>
              {['General Practice', 'Cardiology', 'Paediatrics', 'Orthopaedics', 'Gynaecology'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
        <Field
          label={editing ? 'New Password' : 'Password'}
          required={!editing}
          error={errors.password}
          hint={editing ? 'Leave blank to keep the current password' : 'Minimum 8 characters'}
        >
          <input className={`input${errors.password ? ' error' : ''}`} value={form.password} onChange={set('password')} type="password" autoComplete="new-password" />
        </Field>
      </div>
    </Modal>
  );
}