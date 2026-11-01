
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileWarning,
  MapPin,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchIncidents,
  ACTIVE_INCIDENT_STATUSES,
  formatDate,
  shortDate,
  friendly,
} from '../lib/data';
import { requireSupabase } from '../lib/supabase';
import {
  ErrorBox,
  Loading,
  MetricCard,
  PageTitle,
  StatusBadge,
  EmptyState,
} from '../components/UI';

// Convert the last activity time into a readable format.
function timeAgo(value) {
  if (!value) return 'Unknown';

  const difference = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  return 'Just now';
}

// Calculate how long an incident has been waiting since its last activity.
function getWaitingTime(value) {
  if (!value) return 0;
  return Math.max(0, Date.now() - new Date(value).getTime());
}

export default function DashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyWarning, setHistoryWarning] = useState('');
  const [range, setRange] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setHistoryWarning('');

    try {
      const rows = await fetchIncidents({
        from: new Date(Date.now() - range * 86400000).toISOString(),
      });

      setIncidents(rows);

      // Load the status updates for the incidents so the dashboard
      // can check when each incident was last updated.
      if (rows.length > 0) {
        const ids = rows.map((incident) => incident.id);

        const { data, error: updateError } = await requireSupabase()
          .from('incident_updates')
          .select('*')
          .in('incident_id', ids)
          .order('created_at', { ascending: false });

        // Show a warning if the incident update history cannot be loaded.
        if (updateError) {
          setUpdates([]);
          setHistoryWarning(
            'Incident status history could not be loaded. Waiting-time checks will use the original report date.'
          );
        } else {
          setUpdates(data || []);
        }
      } else {
        setUpdates([]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();

    const db = requireSupabase();

    // Listen for changes to incidents and their updates.
    // This refreshes the dashboard when new information is recorded.
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_updates',
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

  const resolved = incidents.filter((i) => i.status === 'resolved').length;

  // Get the latest recorded update for each incident.
  const updatesByIncident = useMemo(() => {
    const grouped = {};

    updates.forEach((update) => {
      if (!grouped[update.incident_id]) {
        grouped[update.incident_id] = update;
      }
    });

    return grouped;
  }, [updates]);

  // Identify active incidents that have been waiting too long.
  const attentionIncidents = useMemo(() => {
    return incidents
      .filter((incident) =>
        ACTIVE_INCIDENT_STATUSES.includes(incident.status)
      )
      .map((incident) => {
        // Get the latest update, or use the original report date if there is no update.
        const latestUpdate = updatesByIncident[incident.id];
        const lastActivity =
          latestUpdate?.created_at || incident.reported_at;

        // Calculate how many hours have passed since the last activity.
        const waiting = getWaitingTime(lastActivity);
        const waitingHours = waiting / 3600000;

        // Pending incidents have a shorter waiting-time limit.
        const isPending = ['submitted', 'under_review'].includes(
          incident.status
        );

        const thresholdHours = isPending ? 24 : 72;

        return {
          ...incident,
          lastActivity,
          waiting,
          waitingHours,
          thresholdHours,
          needsAttention: waitingHours >= thresholdHours,
        };
      })
      // Only display incidents that have passed their waiting-time limit.
      .filter((incident) => incident.needsAttention)
      // Show the incidents that have waited the longest first.
      .sort((a, b) => b.waiting - a.waiting)
      .slice(0, 6);
  }, [incidents, updatesByIncident]);

  // Group reports by location to identify campus incident hotspots.
  const hotspots = Object.values(
    incidents.reduce((groups, incident) => {
      const location = incident.location_name?.trim();

      if (!location) return groups;

      const key = location.toLowerCase();

      if (!groups[key]) {
        groups[key] = {
          location,
          total: 0,
          active: 0,
          categories: {},
        };
      }

      groups[key].total += 1;

      if (ACTIVE_INCIDENT_STATUSES.includes(incident.status)) {
        groups[key].active += 1;
      }

      // Count the incident categories reported at each location.
      const category = incident.category || 'Unknown';
      groups[key].categories[category] =
        (groups[key].categories[category] || 0) + 1;

      return groups;
    }, {})
  )
    .map((item) => {
      // Find the most common incident category at each location.
      const mostCommonCategory = Object.entries(item.categories).sort(
        (a, b) => b[1] - a[1]
      )[0];

      return {
        ...item,
        topCategory: mostCommonCategory?.[0] || 'Unknown',
      };
    })
    // Display the five locations with the highest number of incidents.
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const maxHotspotCount = Math.max(
    1,
    ...hotspots.map((item) => item.total)
  );

  // Daily incident activity for the selected period.
  const chart = Array.from({ length: range }, (_, idx) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (range - 1 - idx));

    const key = d.toISOString().slice(0, 10);

    return {
      date: shortDate(key),
      count: incidents.filter(
        (i) => (i.reported_at || '').slice(0, 10) === key
      ).length,
    };
  });

  // Analyse which days of the week reports are submitted most often.
  const weekdayPatterns = useMemo(() => {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    // Start each day with zero reports.
    const counts = days.map((day) => ({
      day,
      reports: 0,
    }));

    // Check the submission date of each incident and count its weekday.
    incidents.forEach((incident) => {
      if (!incident.reported_at) return;

      const day = new Date(incident.reported_at).getDay();
      counts[day].reports += 1;
    });

    return counts;
  }, [incidents]);

  // Analyse the hours when incidents are most commonly reported.
  const hourlyPatterns = useMemo(() => {
    // Create 24 entries, one for each hour of the day.
    const counts = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      reports: 0,
    }));

    // Count how many incidents were submitted during each hour.
    incidents.forEach((incident) => {
      if (!incident.reported_at) return;

      const hour = new Date(incident.reported_at).getHours();
      counts[hour].reports += 1;
    });

    return counts;
  }, [incidents]);

  // Find the day with the highest number of submitted reports.
  const busiestDay = [...weekdayPatterns].sort(
    (a, b) => b.reports - a.reports
  )[0];

  // Find the hour with the highest number of submitted reports.
  const busiestHour = [...hourlyPatterns].sort(
    (a, b) => b.reports - a.reports
  )[0];

  const maxWeekdayReports = Math.max(
    1,
    ...weekdayPatterns.map((day) => day.reports)
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
          <button className="btn btn-secondary" onClick={load}>
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
              onChange={(e) => setRange(Number(e.target.value))}
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
                <ResponsiveContainer width="100%" height="100%">
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
                <Link to="/incidents" className="text-link">
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
                        <b>{i.title || friendly(i.category)}</b>
                        <small>
                          {i.reference_number} ·{' '}
                          {i.location_name || 'Location not provided'}
                        </small>
                      </span>
                      <span className="recent-end">
                        <StatusBadge status={i.status} />
                        <small>{formatDate(i.reported_at)}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Display active incidents that have exceeded their waiting-time limit. */}
          <section className="panel attention-panel">
            <div className="panel-heading">
              <div>
                <h3>Incidents needing attention</h3>
                <p>
                  Active reports that have not received a recent status update
                </p>
              </div>
              <AlertTriangle size={19} />
            </div>

            {attentionIncidents.length === 0 ? (
              <EmptyState
                title="No overdue incidents"
                message="There are no active incidents currently exceeding the waiting-time thresholds."
              />
            ) : (
              <div className="attention-list">
                {attentionIncidents.map((incident) => (
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="attention-item"
                    key={incident.id}
                  >
                    <div className="attention-icon">
                      <AlertTriangle size={18} />
                    </div>

                    <div className="attention-copy">
                      <strong>
                        {incident.title || friendly(incident.category)}
                      </strong>
                      <small>
                        {incident.reference_number} ·{' '}
                        {incident.location_name || 'Location not provided'}
                      </small>
                      <small>
                        Last activity: {timeAgo(incident.lastActivity)}
                      </small>
                    </div>

                    <div className="attention-meta">
                      <StatusBadge status={incident.status} />
                      <span>
                        Waiting {Math.floor(incident.waitingHours)}h
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="attention-footer">
              <span>Review thresholds</span>
              <span>Pending review: 24 hours · Other active reports: 72 hours</span>
            </div>

            {historyWarning && (
              <p className="history-warning">{historyWarning}</p>
            )}
          </section>

          {/* Display the campus locations with the highest number of incidents. */}
          <section className="panel hotspot-panel">
            <div className="hotspot-heading">
              <div>
                <div className="hotspot-title">
                  <MapPin size={19} />
                  <h3>Campus Incident Hotspots</h3>
                </div>
                <p>
                  Locations with the highest number of reported incidents
                  during the selected period.
                </p>
              </div>

              <Link to="/map" className="text-link">
                Open safety map
              </Link>
            </div>

            {hotspots.length === 0 ? (
              <EmptyState
                title="No location data available"
                message="Incident hotspots will appear when reports contain campus location information."
              />
            ) : (
              <div className="hotspot-list">
                {hotspots.map((item, index) => (
                  <div className="hotspot-item" key={item.location}>
                    <div className="hotspot-rank">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="hotspot-information">
                      <div className="hotspot-name-row">
                        <strong>{item.location}</strong>
                        <span>
                          {item.total}{' '}
                          {item.total === 1 ? 'incident' : 'incidents'}
                        </span>
                      </div>

                      <div className="hotspot-progress">
                        <div
                          className="hotspot-progress-fill"
                          style={{
                            width: `${(item.total / maxHotspotCount) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="hotspot-details">
                        <span>
                          Most reported: {friendly(item.topCategory)}
                        </span>
                        <span className="hotspot-active">
                          {item.active} active
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="hotspot-footer">
              <span>Based on recorded incident locations</span>
              <span>Last {range} days</span>
            </div>
          </section>

          {/* Show patterns in the days and times when incidents are reported. */}
          <section className="panel patterns-panel">
            <div className="panel-heading">
              <div>
                <h3>When incidents are reported</h3>
                <p>
                  Patterns based on report submission time during the selected
                  period
                </p>
              </div>
              <Activity size={19} />
            </div>

            {incidents.length === 0 ? (
              <EmptyState
                title="Not enough data yet"
                message="Submission patterns will appear when incidents have been reported."
              />
            ) : (
              <>
                {/* Show the busiest day and hour for incident submissions. */}
                <div className="pattern-summary">
                  <div className="pattern-summary-card">
                    <span>Busiest reporting day</span>
                    <strong>
                      {busiestDay?.reports > 0 ? busiestDay.day : 'No data'}
                    </strong>
                    <small>
                      {busiestDay?.reports || 0} reports submitted
                    </small>
                  </div>

                  <div className="pattern-summary-card">
                    <span>Busiest reporting hour</span>
                    <strong>
                      {busiestHour?.reports > 0
                        ? busiestHour.label
                        : 'No data'}
                    </strong>
                    <small>
                      {busiestHour?.reports || 0} reports submitted
                    </small>
                  </div>
                </div>

                {/* Display charts showing reports by weekday and hour. */}
                <div className="patterns-grid">
                  <div className="pattern-chart">
                    <h4>Reports by day of the week</h4>
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={weekdayPatterns}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#edf0f2"
                        />
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="reports"
                          name="Reports"
                          fill="#087f72"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pattern-chart">
                    <h4>Reports by hour of the day</h4>
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={hourlyPatterns}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#edf0f2"
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 9 }}
                          interval={2}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="reports"
                          name="Reports"
                          fill="#459f91"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="pattern-footer">
                  <span>
                    Based on the report submission time recorded in the
                    database.
                  </span>
                  <span>Last {range} days</span>
                </div>
              </>
            )}
          </section>

          <div className="notice">
            <ShieldAlert size={18} />
            <span>
              <b>SOS monitoring:</b> emergency alerts are intentionally not
              queried until the backend explicitly identifies which alerts
              are approved for administrator monitoring.
            </span>
          </div>
        </>
      )}
    </>
  );
}
