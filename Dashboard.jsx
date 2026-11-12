import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import useApi from '../hooks/useApi.js';
import { Card, Stat, Avatar, Badge, Loading, ErrorNote, Empty } from '../components/ui.jsx';
import { prettyDate } from '../utils/format.js';

/**
 * Widget sets per role — report Section 2.1, "Change 3 – Role-Adaptive
 * Dashboard". Nurses see no billing widgets; pharmacists see stock widgets.
 */
const WIDGETS = {
  Doctor: [
    { key: 'todayAppointments', label: "Today's Appointments", tone: 'blue', icon: 'calendar', tile: 'blue', foot: (s) => `${s.scheduled} Scheduled` },
    { key: 'queueSize', label: 'Patient Queue', tone: 'green', icon: 'users', tile: 'green', foot: () => 'Waiting' },
    { key: 'pendingLabs', label: 'Pending Lab Results', tone: 'amber', icon: 'lab', tile: 'amber', foot: () => 'Awaiting review', attention: true },
    { key: 'pendingPrescriptions', label: 'Prescriptions', tone: 'purple', icon: 'clipboard', tile: 'purple', foot: () => 'Pending review' },
  ],
  Nurse: [
    { key: 'queueSize', label: 'Patient Queue', tone: 'blue', icon: 'users', tile: 'blue', foot: () => 'Waiting' },
    { key: 'vitalsDue', label: 'Vitals Due', tone: 'green', icon: 'stethoscope', tile: 'green', foot: () => 'Observations outstanding' },
    { key: 'dischargesPending', label: 'Discharges Pending', tone: 'amber', icon: 'door', tile: 'amber', foot: () => 'Follow-up due today' },
    { key: 'pendingLabs', label: 'Lab Results', tone: 'purple', icon: 'lab', tile: 'purple', foot: () => 'Awaiting review' },
  ],
  Pharmacist: [
    { key: 'pendingPrescriptions', label: 'Pending Prescriptions', tone: 'purple', icon: 'clipboard', tile: 'purple', foot: () => 'In the dispensing queue' },
    { key: 'lowStock', label: 'Low Stock Alerts', tone: 'amber', icon: 'warning', tile: 'amber', foot: () => 'Below reorder level' },
    { key: 'outOfStock', label: 'Out of Stock', tone: 'red', icon: 'stop', tile: 'red', foot: () => 'Blocking dispensing', attention: true },
    { key: 'dispensedToday', label: 'Dispensed Today', tone: 'green', icon: 'check', tile: 'green', foot: () => 'Completed' },
  ],
  Admin: [
    { key: 'totalPatients', label: 'Registered Patients', tone: 'blue', icon: 'users', tile: 'blue', foot: () => 'All time' },
    { key: 'todayAppointments', label: "Today's Appointments", tone: 'green', icon: 'calendar', tile: 'green', foot: (s) => `${s.scheduled} Scheduled` },
    { key: 'billedToday', label: 'Billed Today', tone: 'purple', icon: 'invoice', tile: 'purple', foot: () => 'Across all departments' },
    { key: 'owingToday', label: 'Patient Owing', tone: 'red', icon: 'money', tile: 'red', foot: () => 'Outstanding balance' },
  ],
  BillingClerk: [
    { key: 'billedToday', label: 'Billed Today', tone: 'blue', icon: 'invoice', tile: 'blue', foot: () => 'Invoices raised' },
    { key: 'owingToday', label: 'Patient Owing', tone: 'red', icon: 'money', tile: 'red', foot: () => 'Outstanding balance' },
    { key: 'todayAppointments', label: "Today's Appointments", tone: 'green', icon: 'calendar', tile: 'green', foot: (s) => `${s.scheduled} Scheduled` },
    { key: 'totalPatients', label: 'Registered Patients', tone: 'purple', icon: 'users', tile: 'purple', foot: () => 'All time' },
  ],
  LabTech: [
    { key: 'pendingLabs', label: 'Pending Lab Results', tone: 'blue', icon: 'lab', tile: 'blue', foot: () => 'Awaiting upload' },
    { key: 'pendingPrescriptions', label: 'Prescriptions', tone: 'green', icon: 'clipboard', tile: 'green', foot: () => 'Pending review' },
    { key: 'queueSize', label: 'Patient Queue', tone: 'purple', icon: 'users', tile: 'purple', foot: () => 'Waiting' },
    { key: 'totalPatients', label: 'Registered Patients', tone: 'amber', icon: 'hospital', tile: 'amber', foot: () => 'All time' },
  ],
};

const money = (n) => `R ${Number(n || 0).toLocaleString('en-ZA')}`;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi('/dashboard');

  const widgets = WIDGETS[user?.role] || WIDGETS.Doctor;

  if (loading) return <Loading label="Loading your dashboard…" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const stats = data.stats;
  const firstName = String(user?.fullName || '').replace(/^Dr\.\s*/, '').split(' ')[0];

  return (
    <>
      <div className="page-head">
        <h1>Good morning, {firstName}!</h1>
        <div className="sub">
          {prettyDate(data.date)} · {user?.role} Dashboard
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        {widgets.map((w) => (
          <Stat
            key={w.key}
            label={w.label}
            icon={w.icon}
            tile={w.tile}
            tone={w.tone}
            value={
              ['billedToday', 'owingToday'].includes(w.key)
                ? money(stats[w.key])
                : stats[w.key]
            }
            foot={w.foot(stats)}
            attention={w.attention && stats[w.key] > 0}
          />
        ))}
      </div>

      <div className="grid split-wide">
        <Card
          title="Upcoming Appointments"
          icon="calendar"
          action={<Link className="link-btn" to="/appointments">View All →</Link>}
          bodyClass="card-body"
        >
          {data.upcomingAppointments.length === 0 ? (
            <Empty icon="calendar" title="No appointments scheduled today" />
          ) : (
            <div className="stack sm">
              {data.upcomingAppointments.map((a) => (
                <Link
                  key={a.appointmentId}
                  to={`/patients/${a.patientId}`}
                  className="row"
                  style={{ gap: 11, padding: '2px 0' }}
                >
                  <Avatar initials={a.initials} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.patientName}</div>
                    <div className="faint small">
                      {a.type} · {a.reason}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono small" style={{ fontWeight: 600 }}>{a.time}</div>
                    <div style={{ marginTop: 3 }}>
                      <Badge status={a.status}>{a.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Lab Alerts"
          icon="lab"
          action={<Link className="link-btn" to="/labs">View All →</Link>}
        >
          {data.labAlerts.length === 0 ? (
            <Empty icon="check" title="No outstanding lab alerts" />
          ) : (
            <div className="stack sm">
              {data.labAlerts.map((l) => (
                <div
                  key={`${l.labId}-${l.abnormalFlag}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('/labs')}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/labs')}
                  className="alert"
                  style={{
                    cursor: 'pointer',
                    ...(l.abnormalFlag
                      ? { background: 'var(--alert-warn-bg)', borderColor: 'var(--alert-warn-border)' }
                      : { background: 'var(--alert-info-bg)', borderColor: 'var(--alert-info-border)' }),
                  }}
                >
                  <span className="alert-ico" aria-hidden="true">{l.abnormalFlag ? '⚠' : '◷'}</span>
                  <div className="alert-body">
                    <div style={{ fontWeight: 700 }}>
                      {/* Stop propagation so the patient link is independently clickable. */}
                      <Link
                        to={`/patients/${l.patientId}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {l.patientName}
                      </Link>
                    </div>
                    <div className="small">
                      {l.testName} — {l.abnormalFlag ? 'Abnormal values flagged' : 'In Progress'}
                    </div>
                    {l.notes && (
                      <div className="small" style={{ color: 'var(--warning-text)', marginTop: 3 }}>
                        {l.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}