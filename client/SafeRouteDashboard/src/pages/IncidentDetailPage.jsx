import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock, ExternalLink, MapPin, ShieldCheck, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { changeIncidentStatus, fetchEvidence, fetchIncident, fetchIncidentUpdates, formatDate, friendly, INCIDENT_STATUSES } from '../lib/data';
import { ErrorBox, Field, Loading, PageTitle, StatusBadge, Modal, EmptyState } from '../components/UI';

const markerIcon = new L.Icon({iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',iconSize:[25,41],iconAnchor:[12,41]});


export default function IncidentDetailPage() {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [i, e, h] = await Promise.all([
        fetchIncident(id),
        fetchEvidence(id),
        fetchIncidentUpdates(id),
      ]);

      setItem(i);
      setEvidence(e);
      setHistory(h);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function apply() {
    if (
      ['rejected', 'resolved'].includes(action) &&
      !note.trim()
    ) {
      setError(
        action === 'rejected'
          ? 'Enter a reason for rejecting this report.'
          : 'Enter a resolution note.'
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      await changeIncidentStatus(item, action, note.trim());

      setAction('');
      setNote('');

      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Loading label="Loading incident details..." />;
  }

  return (
    <>
      <PageTitle
        title="Incident details"
        subtitle={item?.reference_number || 'Report details'}
        action={
          <Link
            to="/incidents"
            className="btn btn-secondary"
          >
            <ArrowLeft size={16} />
            Back to incidents
          </Link>
        }
      />

      <ErrorBox error={error} onRetry={load} />

      {!item ? (
        <EmptyState title="Incident not found" />
      ) : (
        <>
          <div className="detail-header panel">
            <div>
              <div className="detail-ref">
                {item.reference_number}
              </div>

              <h2>{item.title}</h2>
              <p>{item.description}</p>

              <div className="detail-badges">
                <StatusBadge status={item.status} />
                <StatusBadge status={item.severity} />

                <span className="muted">
                  {friendly(item.category)}
                </span>
              </div>
            </div>

            <div className="action-stack">
              {item.status !== 'verified' &&
                item.status !== 'resolved' &&
                item.status !== 'rejected' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setAction('verified');
                      setNote('');
                    }}
                  >
                    <Check size={16} />
                    Verify incident
                  </button>
                )}

              {item.status !== 'resolved' &&
                item.status !== 'rejected' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setAction('resolved');
                      setNote('');
                    }}
                  >
                    <ShieldCheck size={16} />
                    Resolve
                  </button>
                )}

              {item.status !== 'rejected' &&
                item.status !== 'resolved' && (
                  <button
                    className="btn btn-danger-outline"
                    onClick={() => {
                      setAction('rejected');
                      setNote('');
                    }}
                  >
                    <XCircle size={16} />
                    Reject report
                  </button>
                )}
            </div>
          </div>

          <div className="detail-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Report information</h3>
                  <p>
                    Submitted {formatDate(item.reported_at)}
                  </p>
                </div>
              </div>

              <div className="info-grid">
                <div>
                  <small>Reference</small>
                  <b>{item.reference_number}</b>
                </div>

                <div>
                  <small>Category</small>
                  <b>{friendly(item.category)}</b>
                </div>

                <div>
                  <small>Severity</small>
                  <b>{friendly(item.severity)}</b>
                </div>

                <div>
                  <small>Reported at</small>
                  <b>{formatDate(item.reported_at)}</b>
                </div>

                <div>
                  <small>Occurred at</small>
                  <b>{formatDate(item.occurred_at)}</b>
                </div>

                <div>
                  <small>Happening now?</small>
                  <b>
                    {item.is_happening_now ? 'Yes' : 'No'}
                  </b>
                </div>

                <div className="wide">
                  <small>Location</small>
                  <b>
                    <MapPin size={14} />
                    {item.location_name ||
                      'Location not provided'}
                  </b>
                </div>

                {item.resolution_notes && (
                  <div className="wide">
                    <small>Resolution notes</small>
                    <b>{item.resolution_notes}</b>
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Incident location</h3>
                  <p>Recorded coordinates</p>
                </div>
              </div>

              {Number.isFinite(item.latitude) &&
              Number.isFinite(item.longitude) ? (
                <>
                  <div className="mini-map">
                    <MapContainer
                      center={[
                        item.latitude,
                        item.longitude,
                      ]}
                      zoom={15}
                      scrollWheelZoom={false}
                      style={{
                        height: '100%',
                        width: '100%',
                      }}
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <Marker
                        position={[
                          item.latitude,
                          item.longitude,
                        ]}
                        icon={markerIcon}
                      >
                        <Popup>
                          {item.reference_number}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>

                  <p className="coordinates">
                    {item.latitude.toFixed(5)},{' '}
                    {item.longitude.toFixed(5)}
                  </p>
                </>
              ) : (
                <EmptyState title="No coordinates" />
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Evidence</h3>
                  <p>Private uploaded evidence</p>
                </div>
              </div>

              {evidence.length === 0 ? (
                <EmptyState title="No evidence attached" />
              ) : (
                <div className="evidence-grid">
                  {evidence.map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.signedUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="evidence-item"
                    >
                      {ev.mime_type?.startsWith('image/') &&
                      ev.signedUrl ? (
                        <img
                          src={ev.signedUrl}
                          alt={ev.file_name}
                        />
                      ) : (
                        <div className="evidence-file">
                          FILE
                        </div>
                      )}

                      <span>{ev.file_name}</span>

                      {ev.signedUrl && (
                        <ExternalLink size={14} />
                      )}
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Report history</h3>
                  <p>Status changes recorded by the system</p>
                </div>
              </div>

              {history.length === 0 ? (
                <EmptyState title="No history yet" />
              ) : (
                <div className="timeline">
                  {history.map((h) => (
                    <div
                      className="timeline-item"
                      key={h.id}
                    >
                      <span className="timeline-dot" />

                      <div>
                        <b>{friendly(h.new_status)}</b>

                        <p>{h.note || 'Status updated'}</p>

                        <small>
                          {formatDate(h.created_at)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {action && (
        <Modal
          title={`${friendly(action)} incident`}
          onClose={() => setAction('')}
        >
          <p className="modal-copy">
            {action === 'verified'
              ? 'Confirm that you have reviewed and verified this incident.'
              : action === 'rejected'
                ? 'Provide a reason for rejecting this report.'
                : 'Provide a note explaining why this incident is resolved.'}
          </p>

          {action !== 'verified' && (
            <Field
              label={
                action === 'rejected'
                  ? 'Rejection reason'
                  : 'Resolution note'
              }
            >
              <textarea
                rows="4"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter a clear note..."
                required
              />
            </Field>
          )}

          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setAction('')}
            >
              Cancel
            </button>

            <button
              className={`btn ${
                action === 'rejected'
                  ? 'btn-danger'
                  : 'btn-primary'
              }`}
              disabled={busy}
              onClick={apply}
            >
              {busy ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}