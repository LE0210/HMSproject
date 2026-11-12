import { useState } from 'react';
import { api, ApiError } from '../api/client.js';
import useApi from '../hooks/useApi.js';
import { Card, Stat, Loading, ErrorNote } from '../components/ui.jsx';
import { rand } from '../utils/format.js';
import Icon from '../components/Icon.jsx';

const REPORT_TYPES = ['Patient Statistics', 'Appointment Analysis', 'Pharmacy Report', 'Revenue Summary'];
const DEPARTMENTS = ['All', 'General Practice', 'Cardiology', 'Paediatrics', 'Orthopaedics'];

export default function Reports() {
  const [config, setConfig] = useState({
    type: 'Patient Statistics',
    from: '2026-05-01',
    to: '2026-05-12',
    department: 'All',
  });

  const query = `type=${encodeURIComponent(config.type)}&from=${config.from}&to=${config.to}&department=${encodeURIComponent(config.department)}`;
  const { data, loading, error, reload } = useApi(`/reports?${query}`, [config.type, config.from, config.to, config.department]);

  const set = (k) => (e) => setConfig((c) => ({ ...c, [k]: e.target.value }));

  return (
    <>
      <div className="page-head">
        <h1>Reports &amp; Analytics</h1>
        <div className="sub">SCR-11 · Generate and export hospital management reports</div>
      </div>

      <Card title="Report Configuration" icon="filter" className="card" bodyClass="card-body" >
        <div className="grid cols-4">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Report Type</label>
            <select className="select" value={config.type} onChange={set('type')}>
              {REPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Date From</label>
            <input type="date" className="input" value={config.from} onChange={set('from')} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Date To</label>
            <input type="date" className="input" value={config.to} onChange={set('to')} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Department</label>
            <select className="select" value={config.department} onChange={set('department')}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={reload} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '⟳'} Generate Report
          </button>
        </div>
      </Card>

      {loading ? (
        <Loading label="Building your report…" />
      ) : error ? (
        <div style={{ marginTop: 14 }}><ErrorNote error={error} onRetry={reload} /></div>
      ) : data ? (
        <>
          <div style={{ height: 14 }} />

          <Card
            title={`Summary — ${data.type} (${data.range.from} to ${data.range.to})`}
            icon="chart"
            action={
              <div className="row" style={{ gap: 7 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => api.download(`/reports/export.csv?from=${config.from}&to=${config.to}`, `hms-report-${config.from}_${config.to}.csv`)}
                >
                  <Icon name="download" size={14} /> Export CSV
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Icon name="print" size={14} /> Print</button>
              </div>
            }
          >
            <div className="grid cols-3">
              <Stat label="Total Patients Seen" value={data.summary.totalPatientsSeen} foot="All registered patients" />
              <Stat label="New Registrations" value={data.summary.newRegistrations} foot="In the selected period" />
              <Stat label="Appointments" value={data.summary.appointments} foot={`${data.summary.completed} completed`} />
              <Stat label="No-Show Rate" value={`${data.summary.noShowRate}%`} tone="red" foot={`${data.summary.noShows} no-shows`} attention={data.summary.noShowRate > 5} />
              <Stat label="Avg. Wait Time" value={`${data.summary.avgWaitMinutes} min`} tone="green" foot="Target: under 20 min" />
              <Stat label="Lab Tests Ordered" value={data.summary.labTestsOrdered} foot="In the selected period" />
            </div>

            <div className="divider" />

            <div className="grid cols-3">
              <Stat label="Billed" value={rand(data.revenue.billed)} foot="Total invoiced" />
              <Stat label="Medical Aid Covers" value={rand(data.revenue.aidCovers)} tone="green" foot="Claimed from schemes" />
              <Stat label="Outstanding" value={rand(data.revenue.outstanding)} tone="red" foot="Awaiting patient payment" />
            </div>
          </Card>

          <div style={{ height: 14 }} />

          <div className="grid split">
            <Card title="Monthly Patient Volume" icon="chart" bodyClass="card-body">
              {data.monthlyVolume.length === 0 ? (
                <div className="empty">No appointment data in this period.</div>
              ) : (
                <BarChart data={data.monthlyVolume} />
              )}
            </Card>

            <Card title="Wait Time &amp; No-Show Trend" icon="chart" bodyClass="card-body">
              <LineChart data={data.waitTrend} />
            </Card>
          </div>

          <div style={{ height: 14 }} />

          <Card title="Department Distribution" icon="layers" bodyClass="card-body">
            {data.departmentShare.length === 0 ? (
              <div className="empty">No departmental data in this period.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)', gap: 24, alignItems: 'center' }}>
                <div>
                  {data.departmentShare.map((d) => (
                    <div key={d.department} className="progress-row">
                      <div>
                        <div className="pname">{d.department}</div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{ width: `${d.percent}%`, background: CHART_COLORS[data.departmentShare.indexOf(d) % CHART_COLORS.length] }}
                          />
                        </div>
                      </div>
                      <div className="pval">{d.percent}%</div>
                    </div>
                  ))}
                </div>
                <PieChart data={data.departmentShare} />
              </div>
            )}
          </Card>
        </>
      ) : null}
    </>
  );
}

/* ============================ SVG charts =================================
   Hand-rolled so the prototype has no charting dependency.
   ========================================================================== */

/**
 * Chart colours come from CSS custom properties so the charts re-theme with
 * the rest of the app. `var()` is valid inside SVG `fill`/`stroke`.
 */
const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function BarChart({ data }) {
  const W = 520;
  const H = 230;
  const padL = 40;
  const padB = 30;
  const padT = 10;

  const max = Math.max(...data.map((d) => d.appointments), 1);
  const step = Math.ceil(max / 4) || 1;
  const top = step * 4;
  const plotH = H - padB - padT;
  const slot = (W - padL) / data.length;
  const barW = Math.min(46, slot * 0.5);

  const ticks = [0, step, step * 2, step * 3, step * 4];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="230" role="img" aria-label="Monthly patient volume bar chart">
        {ticks.map((t) => {
          const y = padT + plotH - (t / top) * plotH;
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={W} y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} fontSize="10" fill="var(--chart-muted)" textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}
        <line x1={padL} y1={padT + plotH} x2={W} y2={padT + plotH} stroke="var(--chart-axis)" />

        {data.map((d, i) => {
          const h = (d.appointments / top) * plotH;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = padT + plotH - h;
          const label = d.month ? MONTHS[Number(String(d.month).slice(5, 7)) - 1] || d.month : d.month;
          return (
            <g key={d.month}>
              <rect x={x} y={y} width={barW} height={h} rx="4" fill={CHART_COLORS[1]} />
              <text x={x + barW / 2} y={H - 10} fontSize="11" fill="var(--chart-muted)" textAnchor="middle">
                {label}
              </text>
              <text x={x + barW / 2} y={y - 6} fontSize="10" fill="var(--text)" fontWeight="700" textAnchor="middle">
                {d.appointments}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span className="item"><span className="swatch" style={{ background: CHART_COLORS[0] }} />Patients</span>
        <span className="item"><span className="swatch" style={{ background: CHART_COLORS[1] }} />Appointments</span>
      </div>
    </div>
  );
}

function LineChart({ data }) {
  const W = 520;
  const H = 230;
  const padL = 40;
  const padB = 30;
  const padT = 12;
  const plotH = H - padB - padT;
  const plotW = W - padL - 12;
  const max = Math.max(...data.flatMap((d) => [d.avgWait, d.noShow]), 10);

  const x = (i) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v) => padT + plotH - (v / max) * plotH;

  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="230" role="img" aria-label="Wait time and no-show trend line chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={y(t)} x2={W - 12} y2={y(t)} stroke="var(--chart-grid)" />
            <text x={padL - 8} y={y(t) + 4} fontSize="10" fill="var(--chart-muted)" textAnchor="end">
              {Math.round(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => (
          <g key={d.label}>
            <line x1={x(i)} y1={padT} x2={x(i)} y2={padT + plotH} stroke="var(--chart-grid)" strokeDasharray="3 3" />
            <text x={x(i)} y={H - 10} fontSize="11" fill="var(--chart-muted)" textAnchor="middle">
              {d.label}
            </text>
          </g>
        ))}

        <polyline
          points={data.map((d, i) => `${x(i)},${y(d.avgWait)}`).join(' ')}
          fill="none" stroke={CHART_COLORS[0]} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        />
        {data.map((d, i) => (
          <circle key={`a${d.label}`} cx={x(i)} cy={y(d.avgWait)} r="4" fill={CHART_COLORS[0]} />
        ))}

        <polyline
          points={data.map((d, i) => `${x(i)},${y(d.noShow)}`).join(' ')}
          fill="none" stroke="var(--danger)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        />
        {data.map((d, i) => (
          <circle key={`n${d.label}`} cx={x(i)} cy={y(d.noShow)} r="4" fill="var(--danger)" />
        ))}
      </svg>
      <div className="chart-legend">
        <span className="item">
          <span className="swatch" style={{ background: CHART_COLORS[0] }} />Avg Wait (min)
        </span>
        <span className="item">
          <span className="swatch" style={{ background: 'var(--danger)' }} />No-Show %
        </span>
      </div>
    </div>
  );
}

function PieChart({ data }) {
  const R = 78;
  const total = data.reduce((s, d) => s + d.percent, 0) || 1;
  let angle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const frac = d.percent / total;
    const a0 = angle;
    const a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (r, a) => `${100 + r * Math.cos(a)} ${100 + r * Math.sin(a)}`;
    return {
      ...d,
      color: CHART_COLORS[i % CHART_COLORS.length],
      path: `M 100 100 L ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} Z`,
      // Anchor the label on the slice's mid-angle.
      lx: 100 + (R + 22) * Math.cos((a0 + a1) / 2),
      ly: 100 + (R + 22) * Math.sin((a0 + a1) / 2),
      anchor: Math.cos((a0 + a1) / 2) >= 0 ? 'start' : 'end',
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg viewBox="0 0 200 200" width="190" height="190" role="img" aria-label="Department distribution pie chart">
        {slices.map((s) => (
          <path key={s.department} d={s.path} fill={s.color} stroke="#fff" strokeWidth="2" />
        ))}
        {slices.map((s) => (
          <text
            key={`l${s.department}`}
            x={s.lx}
            y={s.ly}
            fontSize="11"
            fill={s.color}
            fontWeight="700"
            textAnchor={s.anchor}
            dominantBaseline="middle"
          >
            {s.department}: {s.percent}%
          </text>
        ))}
      </svg>
    </div>
  );
}