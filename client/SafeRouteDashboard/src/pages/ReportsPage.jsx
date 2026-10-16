import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts';
import { fetchIncidents, friendly, shortDate } from '../lib/data';
import { ErrorBox, Loading, PageTitle, MetricCard } from '../components/UI';

const palette=['#087f72','#2563eb','#f59e0b','#dc2626','#7c3aed','#0d9488','#64748b','#db2777'];


export default function ReportsPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [status, setStatus] = useState("all");
    const [category, setCategory] = useState("all");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            setRows(
                await fetchIncidents({
                    from,
                    to,
                    status,
                    category,
                })
            );
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [from, to, status, category]);

    useEffect(() => {
        load();
    }, [load]);

    const countBy = (key) =>
        Object.entries(
            rows.reduce((a, r) => {
                const k = r[key] || "unknown";
                a[k] = (a[k] || 0) + 1;
                return a;
            }, {})
        ).map(([name, value]) => ({
            name: friendly(name),
            value,
        }));

    const trend = Object.entries(
        rows.reduce((a, r) => {
            const k = (r.reported_at || "").slice(0, 10);

            if (k) {
                a[k] = (a[k] || 0) + 1;
            }

            return a;
        }, {})
    )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
            date: shortDate(date),
            count,
        }));

    const resolved = rows.filter(
        (r) => r.status === "resolved"
    );

    const avgHours = resolved
        .filter((r) => r.resolved_at && r.reported_at)
        .map(
            (r) =>
                (new Date(r.resolved_at) -
                    new Date(r.reported_at)) /
                3600000
        );

    const avg = avgHours.length
        ? (
              avgHours.reduce((a, b) => a + b, 0) /
              avgHours.length
          ).toFixed(1)
        : "—";

    function exportCsv() {
        const head = [
            "Reference",
            "Title",
            "Category",
            "Location",
            "Reported At",
            "Status",
            "Severity",
            "Resolved At",
        ];

        const data = rows.map((r) => [
            r.reference_number,
            r.title,
            r.category,
            r.location_name,
            r.reported_at,
            r.status,
            r.severity,
            r.resolved_at,
        ]);

        const csv = [head, ...data]
            .map((r) =>
                r
                    .map(
                        (v) =>
                            `"${String(v ?? "").replaceAll('"', '""')}"`
                    )
                    .join(",")
            )
            .join("\n");

        const a = document.createElement("a");

        a.href = URL.createObjectURL(
            new Blob([csv], { type: "text/csv" })
        );

        a.download = "saferoute-report.csv";
        a.click();

        URL.revokeObjectURL(a.href);
    }

    return (
        <>
            <PageTitle
                title="Reports & analytics"
                subtitle="Understand incident patterns and track resolution activity."
                action={
                    <button
                        className="btn btn-secondary"
                        onClick={exportCsv}
                    >
                        <Download size={16} /> Export CSV
                    </button>
                }
            />

            <section className="panel filters-panel">
                <div className="filters-row">
                    <label className="filter-field">
                        <span>From</span>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) =>
                                setFrom(e.target.value)
                            }
                        />
                    </label>

                    <label className="filter-field">
                        <span>To</span>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) =>
                                setTo(e.target.value)
                            }
                        />
                    </label>

                    <select
                        value={category}
                        onChange={(e) =>
                            setCategory(e.target.value)
                        }
                    >
                        <option value="all">
                            All categories
                        </option>

                        {[
                            "theft",
                            "harassment",
                            "suspicious_activity",
                            "poor_lighting",
                            "unsafe_building",
                            "medical_emergency",
                            "fire_hazard",
                            "other",
                        ].map((s) => (
                            <option key={s} value={s}>
                                {friendly(s)}
                            </option>
                        ))}
                    </select>

                    <select
                        value={status}
                        onChange={(e) =>
                            setStatus(e.target.value)
                        }
                    >
                        <option value="all">
                            All statuses
                        </option>

                        {[
                            "submitted",
                            "under_review",
                            "verified",
                            "assigned",
                            "in_progress",
                            "resolved",
                            "rejected",
                        ].map((s) => (
                            <option key={s} value={s}>
                                {friendly(s)}
                            </option>
                        ))}
                    </select>

                    <button
                        className="btn btn-secondary"
                        onClick={load}
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </section>

            <ErrorBox error={error} onRetry={load} />

            {loading ? (
                <Loading label="Calculating reports..." />
            ) : (
                <>
                    <div className="metrics-grid report-metrics">
                        <MetricCard
                            label="Total reports"
                            value={rows.length}
                        />

                        <MetricCard
                            label="Resolved reports"
                            value={resolved.length}
                        />

                        <MetricCard
                            label="Resolution rate"
                            value={`${
                                rows.length
                                    ? Math.round(
                                          (resolved.length /
                                              rows.length) *
                                              100
                                      )
                                    : 0
                            }%`}
                        />

                        <MetricCard
                            label="Average resolution"
                            value={
                                avg === "—" ? "—" : `${avg} h`
                            }
                            hint="Resolved incidents with timestamps"
                        />
                    </div>

                    <div className="reports-grid">
                        {/* Incident trends */}
                        <section className="panel report-chart">
                            <div className="panel-heading">
                                <div>
                                    <h3>Incident trends</h3>
                                    <p>Reports over time</p>
                                </div>
                            </div>

                            <div className="chart-wrap">
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <LineChart data={trend}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                        />
                                        <XAxis dataKey="date" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />

                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            name="Incidents"
                                            stroke="#087f72"
                                            strokeWidth={2.5}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* Incidents by category */}
                        <section className="panel report-chart">
                            <div className="panel-heading">
                                <div>
                                    <h3>Incidents by category</h3>
                                    <p>Category distribution</p>
                                </div>
                            </div>

                            <div className="chart-wrap">
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <BarChart
                                        data={countBy("category")}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="name"
                                            angle={-25}
                                            textAnchor="end"
                                            height={70}
                                            interval={0}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />

                                        <Bar
                                            dataKey="value"
                                            name="Incidents"
                                            fill="#087f72"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* Incident status */}
                        <section className="panel report-chart">
                            <div className="panel-heading">
                                <div>
                                    <h3>Incident status</h3>
                                    <p>Current status distribution</p>
                                </div>
                            </div>

                            <div className="chart-wrap">
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <PieChart>
                                        <Pie
                                            data={countBy("status")}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="45%"
                                            outerRadius={90}
                                            label
                                        >
                                            {countBy("status").map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={
                                                            palette[
                                                                index %
                                                                    palette.length
                                                            ]
                                                        }
                                                    />
                                                )
                                            )}
                                        </Pie>

                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* Resolution activity */}
                        <section className="panel report-chart">
                            <div className="panel-heading">
                                <div>
                                    <h3>Resolution activity</h3>
                                    <p>Resolved reports per date</p>
                                </div>
                            </div>

                            <div className="chart-wrap">
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <BarChart
                                        data={Object.entries(
                                            resolved.reduce((a, r) => {
                                                const k = (
                                                    r.resolved_at || ""
                                                ).slice(0, 10);

                                                if (k) {
                                                    a[k] =
                                                        (a[k] || 0) + 1;
                                                }

                                                return a;
                                            }, {})
                                        )
                                            .sort(([a], [b]) =>
                                                a.localeCompare(b)
                                            )
                                            .map(([date, count]) => ({
                                                date: shortDate(date),
                                                count,
                                            }))}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                        />
                                        <XAxis dataKey="date" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />

                                        <Bar
                                            dataKey="count"
                                            name="Resolved"
                                            fill="#16a34a"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </section>
                    </div>
                </>
            )}
        </>
    );
}