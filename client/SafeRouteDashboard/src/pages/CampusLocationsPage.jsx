import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, MapPin, Plus, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { fetchCampusLocations, friendly } from '../lib/data';
import { ErrorBox, EmptyState, Field, Loading, Modal, PageTitle, SearchBox } from '../components/UI';

const blank={name:'',location_type:'facility',latitude:'',longitude:'',description:'',is_active:true};


export default function CampusLocationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setRows(await fetchCampusLocations(true));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(row) {
    setForm(
      row
        ? {
            ...row,
            latitude: String(row.latitude),
            longitude: String(row.longitude),
          }
        : blank
    );

    setModal(true);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const db = requireSupabase();

      const payload = {
        name: form.name.trim(),
        location_type: form.location_type,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        description: form.description.trim() || null,
        is_active: Boolean(form.is_active),
      };

      if (
        !payload.name ||
        !Number.isFinite(payload.latitude) ||
        !Number.isFinite(payload.longitude) ||
        payload.latitude < -90 ||
        payload.latitude > 90 ||
        payload.longitude < -180 ||
        payload.longitude > 180
      ) {
        throw new Error(
          'Enter a name and valid latitude/longitude.'
        );
      }

      let result;

      if (form.id) {
        result = await db
          .from('campus_locations')
          .update(payload)
          .eq('id', form.id);
      } else {
        result = await db
          .from('campus_locations')
          .insert(payload);
      }

      if (result.error) {
        throw result.error;
      }

      setModal(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row) {
    setError('');

    const { error } = await requireSupabase()
      .from('campus_locations')
      .update({
        is_active: !row.is_active,
      })
      .eq('id', row.id);

    if (error) {
      setError(error.message);
    } else {
      load();
    }
  }

  const filtered = rows.filter((r) =>
    `${r.name} ${r.location_type} ${r.description || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <>
      <PageTitle
        title="Safe Zones"
        subtitle="Maintain approved campus facilities, entrances and safe points."
        action={
          <button
            className="btn btn-primary"
            onClick={() => edit(null)}
          >
            <Plus size={17} />
            Add location
          </button>
        }
      />

      <ErrorBox error={error} onRetry={load} />

      <section className="panel">
        <div className="filters-row">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search safe zones"
          />

          <button
            className="btn btn-secondary"
            onClick={load}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <Loading label="Loading campus locations..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No campus locations"
            message="Add a campus location or change your search."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Coordinates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="location-name">
                        <span className="location-icon">
                          <MapPin size={16} />
                        </span>

                        <span>
                          <b>{r.name}</b>
                          <small className="table-sub">
                            {r.description || 'No description'}
                          </small>
                        </span>
                      </div>
                    </td>

                    <td>{friendly(r.location_type)}</td>

                    <td>
                      {Number(r.latitude).toFixed(5)},{' '}
                      {Number(r.longitude).toFixed(5)}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          r.is_active
                            ? 'badge-active'
                            : 'badge-rejected'
                        }`}
                      >
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-link"
                          title="Edit location"
                          onClick={() => edit(r)}
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          className="icon-link"
                          title={
                            r.is_active ? 'Deactivate' : 'Activate'
                          }
                          onClick={() => toggle(r)}
                        >
                          {r.is_active ? (
                            <ToggleRight size={19} />
                          ) : (
                            <ToggleLeft size={19} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-foot">
          {filtered.length} locations
        </div>
      </section>

      {modal && (
        <Modal
          title={
            form.id
              ? 'Edit campus location'
              : 'Add campus location'
          }
          onClose={() => setModal(false)}
        >
          <form onSubmit={save} className="form-stack">
            <Field label="Location name">
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                required
                placeholder="e.g. Main Gate"
              />
            </Field>

            <Field label="Location type">
              <select
                value={form.location_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location_type: e.target.value,
                  })
                }
              >
                <option value="facility">Facility</option>
                <option value="security_point">
                  Security point
                </option>
                <option value="safe_point">Safe point</option>
                <option value="entrance">Entrance</option>
                <option value="residence">Residence</option>
                <option value="landmark">Landmark</option>
              </select>
            </Field>

            <div className="form-two-col">
              <Field label="Latitude">
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      latitude: e.target.value,
                    })
                  }
                  required
                  placeholder="-26.1851"
                />
              </Field>

              <Field label="Longitude">
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      longitude: e.target.value,
                    })
                  }
                  required
                  placeholder="28.0128"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                rows="3"
                value={form.description || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="Optional details"
              />
            </Field>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_active: e.target.checked,
                  })
                }
              />
              Visible as an active campus location
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                disabled={busy}
              >
                {busy ? 'Saving...' : 'Save location'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}