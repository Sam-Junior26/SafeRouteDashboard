import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, FileWarning, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchIncidents, ACTIVE_INCIDENT_STATUSES, formatDate, shortDate, friendly } from '../lib/data';
import { requireSupabase } from '../lib/supabase';
import { ErrorBox, Loading, MetricCard, PageTitle, StatusBadge, EmptyState } from '../components/UI';


export default function DashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const rows = await fetchIncidents({
        from: new Date(
          Date.now() - range * 86400000
        ).toISOString(),
      });

      setIncidents(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();

    const db = requireSupabase();

    const ch = db
      .channel('dashboard-incidents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
        },
        () => load()
      )
      .subscribe();

    return () => {
      db.removeChannel(ch);
    };
  }, [load]);

  const active = incidents.filter((i) =>
    ACTIVE_INCIDENT_STATUSES.includes(i.status)
  ).length;

  const pending = incidents.filter((i) =>
    ['submitted', 'under_review'].includes(i.status)
  ).length;

  const resolved = incidents.filter(
    (i) => i.status === 'resolved'
  ).length;

  const chart = Array.from(
    { length: range },
    (_, idx) => {
      const d = new Date();

      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (range - 1 - idx));

      const key = d.toISOString().slice(0, 10);

      return {
        date: shortDate(key),
        count: incidents.filter(
          (i) =>
            (i.reported_at || '').slice(0, 10) === key
        ).length,
      };
    }
  );

  return (
    <>
      <PageTitle
        title="Overview"
        subtitle={`Good ${
          new Date().getHours() < 12
            ? 'morning'
            : new Date().getHours() < 18
              ? 'afternoon'
              : 'evening'
        }, Administrator. Here's today's safety activity.`}
        action={
          <button
            className="btn btn-secondary"
            onClick={load}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      <div className="date-note">
        {new Intl.DateTimeFormat('en-ZA', {
          dateStyle: 'full',
          timeZone: 'Africa/Johannesburg',
        }).format(new Date())}
      </div>

      <ErrorBox error={error} onRetry={load} />

      {loading ? (
        <Loading label="Loading safety overview..." />
      ) : (
        <>
          <div className="metrics-grid">
            <MetricCard
              label="Total incidents"
              value={incidents.length}
              hint={`Last ${range} days`}
              icon={FileWarning}
            />

            <MetricCard
              label="Active incidents"
              value={active}
              hint="Requires attention"
              icon={AlertTriangle}
              tone="red"
            />

            <MetricCard
              label="Pending review"
              value={pending}
              hint="Awaiting assessment"
              icon={Clock3}
              tone="amber"
            />

            <MetricCard
              label="Resolved incidents"
              value={resolved}
              hint={`Last ${range} days`}
              icon={CheckCircle2}
              tone="green"
            />

            <MetricCard
              label="Active SOS alerts"
              value="—"
              hint="Monitoring not enabled"
              icon={ShieldAlert}
              tone="red"
            />
          </div>

          <div className="range-toolbar">
            <div>
              <h2>Incident activity</h2>
              <p className="muted">
                Reports received during the selected period
              </p>
            </div>

            <select
              value={range}
              onChange={(e) =>
                setRange(Number(e.target.value))
              }
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div className="dashboard-grid">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Reports over time</h3>
                  <p>Daily incident reports</p>
                </div>

                <Activity size={18} />
              </div>

              <div className="chart-wrap">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={chart}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#edf0f2"
                    />

                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      name="Incidents"
                      fill="#087f72"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Recent incidents</h3>
                  <p>Latest reports from the mobile app</p>
                </div>

                <Link
                  to="/incidents"
                  className="text-link"
                >
                  View all
                </Link>
              </div>

              {incidents.length === 0 ? (
                <EmptyState
                  title="No incidents found"
                  message="New reports will appear here."
                />
              ) : (
                <div className="recent-list">
                  {incidents.slice(0, 6).map((i) => (
                    <Link
                      to={`/incidents/${i.id}`}
                      className="recent-item"
                      key={i.id}
                    >
                      <span className="incident-dot" />

                      <span className="recent-copy">
                        <b>
                          {i.title || friendly(i.category)}
                        </b>

                        <small>
                          {i.reference_number} ·{' '}
                          {i.location_name ||
                            'Location not provided'}
                        </small>
                      </span>

                      <span className="recent-end">
                        <StatusBadge status={i.status} />

                        <small>
                          {formatDate(i.reported_at)}
                        </small>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="notice">
            <ShieldAlert size={18} />

            <span>
              <b>SOS monitoring:</b> emergency alerts are
              intentionally not queried until the backend
              explicitly identifies which alerts are approved
              for administrator monitoring.
            </span>
          </div>
        </>
      )}
    </>
  );
}