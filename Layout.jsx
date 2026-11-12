import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Avatar } from './ui.jsx';
import Icon from './Icon.jsx';

const NAV = [
  { key: 'dashboard', to: '/', label: 'Dashboard', ico: 'dashboard', end: true },
  { key: 'patients', to: '/patients', label: 'Patients', ico: 'patients' },
  { key: 'appointments', to: '/appointments', label: 'Appointments', ico: 'calendar' },
  { key: 'prescriptions', to: '/prescriptions', label: 'E-Prescriptions', ico: 'clipboard' },
  { key: 'labs', to: '/labs', label: 'Lab Results', ico: 'lab' },
  { key: 'pharmacy', to: '/pharmacy', label: 'Pharmacy', ico: 'pill' },
  { key: 'billing', to: '/billing', label: 'Billing', ico: 'invoice' },
  { key: 'reports', to: '/reports', label: 'Reports', ico: 'chart' },
  { key: 'staff', to: '/staff', label: 'User Management', ico: 'settings' },
];

export default function Layout() {
  const { user, logout, can, systemDate } = useAuth();
  const { isDark, toggle } = useTheme();
  const { pathname } = useLocation();

  // Nav items are filtered per role, matching the server's RBAC table.
  const visible = NAV.filter((n) => can(n.key));

  // The hospital's operating date, not the viewer's machine clock.
  const displayDate = systemDate
    ? new Date(`${systemDate}T00:00:00`).toLocaleDateString('en-ZA', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo" aria-hidden="true">
            <Icon name="hospital" size={19} />
          </div>
          <div className="brand-text">
            <strong>Community</strong>
            <span>General Hospital</span>
          </div>
        </div>

        <div className="sidebar-user">
          <Avatar initials={user?.initials} tone="blue" />
          <div className="meta">
            <div className="name">{user?.fullName}</div>
            <div className="role">
              {user?.staffId} · {user?.role}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visible.map((n) => (
            <NavLink
              key={n.key}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              title={n.label}
            >
              <span className="ico" aria-hidden="true">
                <Icon name={n.ico} />
              </span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="nav-link" style={{ width: '100%', border: 'none', background: 'none' }} onClick={logout}>
            <span className="ico" aria-hidden="true"><Icon name="logout" /></span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="sys-name">HMS v1.0 — Community General Hospital</div>
            <div className="sys-date">Today: {displayDate}</div>
          </div>
          <div className="who">
            <button
              className="icon-btn"
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Icon name={isDark ? 'sun' : 'moon'} size={17} />
            </button>
            <button className="icon-btn" title="Notifications" aria-label="Notifications">
              <Icon name="bell" />
              <span className="dot">3</span>
            </button>
            <Avatar initials={user?.initials} tone="blue" size="sm" />
            <div className="user-name">{user?.fullName}</div>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}