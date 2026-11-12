import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError, api } from '../api/client.js';
import { Field } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const ROLES = ['Doctor', 'Nurse', 'Pharmacist', 'Admin', 'BillingClerk', 'LabTech'];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ staffId: '', password: '', role: 'Doctor' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined, _form: undefined }));
  };

  function validate() {
    const next = {};
    if (!form.staffId.trim()) next.staffId = 'Staff ID is required';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;

    setBusy(true);
    try {
      await login(form.staffId.trim(), form.password, form.role);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setBanner({ text: err.message, tone: err.status === 423 ? 'warn' : 'error' });
        if (err.fields) setErrors(err.fields);
      } else {
        setBanner({ text: 'Unable to sign in. Please try again.', tone: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword() {
    if (!form.staffId.trim()) {
      setErrors((e) => ({ ...e, staffId: 'Enter your Staff ID first' }));
      return;
    }
    setForgotBusy(true);
    try {
      const res = await api.post('/auth/forgot-password', { staffId: form.staffId.trim() });
      setBanner({ text: res.message, tone: 'info' });
    } catch {
      setBanner({ text: 'Could not start the reset flow. Try again shortly.', tone: 'error' });
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo" aria-hidden="true">
            <Icon name="hospital" size={38} strokeWidth={1.6} />
          </div>
          <h1>Community General Hospital</h1>
          <p>Hospital Management System v1.0</p>
        </div>

        {banner && (
          <div className={`alert ${banner.tone === 'info' ? 'info' : 'danger'}`} style={{ marginBottom: 14 }}>
            <span className="alert-ico" aria-hidden="true">
              {banner.tone === 'info' ? 'ℹ' : '⚠'}
            </span>
            <div className="alert-body">{banner.text}</div>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <Field label="Staff ID" required error={errors.staffId}>
            <input
              className={`input${errors.staffId ? ' error' : ''}`}
              value={form.staffId}
              onChange={set('staffId')}
              placeholder="DR001"
              autoComplete="username"
              autoFocus
            />
          </Field>

          <Field label="Password" required error={errors.password}>
            <div className="input-wrap">
              <input
                className={`input${errors.password ? ' error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: 38 }}
              />
              <button
                type="button"
                className="adornment"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </Field>

          <Field label="Role" required error={errors.role}>
            <select className="select" value={form.role} onChange={set('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <button className="btn btn-teal btn-lg btn-block login-submit" disabled={busy}>
            {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'LOG IN'}
          </button>
        </form>

        <div className="forgot">
          <button className="link-btn" onClick={onForgotPassword} disabled={forgotBusy}>
            {forgotBusy ? 'Sending…' : 'Forgot Password?'}
          </button>
        </div>

        <div className="login-hint">
          Demo: <code>DR001</code>/<code>doctor123</code> ·{' '}
          <code>NR001</code>/<code>nurse123</code> ·{' '}
          <code>PH001</code>/<code>pharm123</code> ·{' '}
          <code>AD001</code>/<code>admin123</code>
        </div>
      </div>
    </div>
  );
}