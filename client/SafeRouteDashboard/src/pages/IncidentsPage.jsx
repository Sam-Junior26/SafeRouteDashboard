import React, { useCallback, useEffect, useState } from 'react';
import { Download, Eye, Filter, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchIncidents, formatDate, friendly, INCIDENT_STATUSES } from '../lib/data';
import { ErrorBox, Loading, PageTitle, SearchBox, StatusBadge, EmptyState } from '../components/UI';


export default function IncidentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setRows(
        await fetchIncidents({
          search,
          status,
          category,
          from,
          to,
        })
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, category, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const header = [
      'Reference',
      'Title',
      'Category',
      'Location',
      'Reported At',
      'Severity',
      'Status',
    ];

    const data = rows.map((r) => [
      r.reference_number,
      r.title,
      r.category,
      r.location_name,
      r.reported_at,
      r.severity,
      r.status,
    ]);

    const csv = [header, ...data]
      .map((row) =>
        row
          .map(
            (v) =>
              `"${String(v ?? '').replaceAll('"', '""')}"`
          )
          .join(',')
      )
      .join('\n');

    const a = document.createElement('a');

    a.href = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv' })
    );

    a.download = 'saferoute-incidents.csv';
    a.click();

    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageTitle
        title="Incident management"
        subtitle="Review, verify and resolve safety reports submitted through SafeRoute."
        action={
          <button
            className="btn btn-secondary"
            onClick={exportCsv}
          >
            <Download size={16} />
            Export CSV
          </button>
        }
      />

      <section className="panel">
        <div className="filters-row">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search reference, title or location"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>

            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {friendly(s)}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>

            {[
              'theft',
              'harassment',
              'suspicious_activity',
              'poor_lighting',
              'unsafe_building',
              'medical_emergency',
              'fire_hazard',
              'other',
            ].map((s) => (
              <option key={s} value={s}>
                {friendly(s)}
              </option>
            ))}
          </select>

          <input
            aria-label="From date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />

          <input
            aria-label="To date"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />

          <button
            className="btn btn-secondary"
            onClick={load}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <ErrorBox error={error} onRetry={load} />

        {loading ? (
          <Loading label="Loading incidents..." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No matching incidents"
            message="Try changing your search or filters."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Incident</th>
                  <th>Location</th>
                  <th>Reported on</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b className="ref-code">
                        {r.reference_number}
                      </b>
                    </td>

                    <td>
                      <b>{r.title}</b>

                      <small className="table-sub">
                        {friendly(r.category)}
                      </small>
                    </td>

                    <td>
                      {r.location_name || 'Not provided'}
                    </td>

                    <td>{formatDate(r.reported_at)}</td>

                    <td>
                      <StatusBadge status={r.severity} />
                    </td>

                    <td>
                      <StatusBadge status={r.status} />
                    </td>

                    <td>
                      <Link
                        className="icon-link"
                        to={`/incidents/${r.id}`}
                        title="View details"
                      >
                        <Eye size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-foot">
          {rows.length} incident
          {rows.length === 1 ? '' : 's'} shown
        </div>
      </section>
    </>
  );
}