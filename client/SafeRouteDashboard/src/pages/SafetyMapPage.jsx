import React, { useCallback, useEffect, useState } from 'react';
import { Layers, MapPin, RefreshCw } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { fetchIncidents, fetchCampusLocations, ACTIVE_INCIDENT_STATUSES, friendly, formatDate } from '../lib/data';
import { ErrorBox, Loading, PageTitle } from '../components/UI';

const icon = new L.Icon({iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',iconSize:[25,41],iconAnchor:[12,41]});
function Recenter({center}){const map=useMap();useEffect(()=>{map.setView(center,map.getZoom());},[center,map]);return null;}


export default function SafetyMapPage() {
    const [incidents, setIncidents] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showIncidents, setShowIncidents] = useState(true);
    const [showLocations, setShowLocations] = useState(true);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState("");
    const [satellite, setSatellite] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [i, l] = await Promise.all([
                fetchIncidents(),
                fetchCampusLocations(false),
            ]);

            setIncidents(
                i.filter((x) =>
                    ACTIVE_INCIDENT_STATUSES.includes(x.status)
                )
            );

            setLocations(l);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const center = [-26.1851, 28.0128];

    const filteredLocations = locations.filter((l) =>
        `${l.name} ${l.location_type}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <>
            <PageTitle
                title="Safety map"
                subtitle="View active incident reports and approved campus locations."
                action={
                    <button
                        className="btn btn-secondary"
                        onClick={load}
                    >
                        <RefreshCw size={16} /> Refresh map
                    </button>
                }
            />

            <ErrorBox error={error} onRetry={load} />

            {loading ? (
                <Loading label="Loading map data..." />
            ) : (
                <div className="map-layout">
                    <aside className="map-sidebar">
                        <div className="map-control-title">
                            <Layers size={18} />
                            <b>Map layers</b>
                        </div>

                        <label className="toggle-row">
                            <span>
                                <i className="legend-dot red-dot" />
                                Active incidents
                            </span>

                            <input
                                type="checkbox"
                                checked={showIncidents}
                                onChange={(e) =>
                                    setShowIncidents(e.target.checked)
                                }
                            />
                        </label>

                        <label className="toggle-row">
                            <span>
                                <i className="legend-dot teal-dot" />
                                Campus locations
                            </span>

                            <input
                                type="checkbox"
                                checked={showLocations}
                                onChange={(e) =>
                                    setShowLocations(e.target.checked)
                                }
                            />
                        </label>

                        <button
                            className="btn btn-secondary full-width"
                            onClick={() =>
                                setSatellite(!satellite)
                            }
                        >
                            {satellite
                                ? "Street map"
                                : "Satellite view"}
                        </button>

                        <div className="map-control-title location-list-title">
                            <MapPin size={18} />
                            <b>Campus locations</b>

                            <span className="count-pill">
                                {filteredLocations.length}
                            </span>
                        </div>

                        <input
                            className="location-search"
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            placeholder="Search locations..."
                        />

                        <div className="map-location-list">
                            {filteredLocations.map((l) => (
                                <button
                                    key={l.id}
                                    className={`map-location-item ${
                                        selected?.id === l.id
                                            ? "selected"
                                            : ""
                                    }`}
                                    onClick={() => setSelected(l)}
                                >
                                    <b>{l.name}</b>
                                    <small>
                                        {friendly(l.location_type)}
                                    </small>
                                </button>
                            ))}
                        </div>

                        <p className="map-disclaimer">
                            Poor-lighting overlays and SOS markers
                            are not shown unless supported and
                            authorised in the backend.
                        </p>
                    </aside>

                    <div className="map-canvas">
                        <MapContainer
                            center={center}
                            zoom={16}
                            scrollWheelZoom
                            style={{
                                height: "100%",
                                width: "100%",
                            }}
                        >
                            <TileLayer
                                attribution={
                                    satellite
                                        ? "Tiles &copy; Esri"
                                        : "&copy; OpenStreetMap contributors"
                                }
                                url={
                                    satellite
                                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                }
                            />

                            {showIncidents &&
                                incidents
                                    .filter(
                                        (i) =>
                                            Number.isFinite(i.latitude) &&
                                            Number.isFinite(i.longitude)
                                    )
                                    .map((i) => (
                                        <Marker
                                            key={i.id}
                                            position={[
                                                i.latitude,
                                                i.longitude,
                                            ]}
                                            icon={icon}
                                            eventHandlers={{
                                                click: () =>
                                                    setSelected(i),
                                            }}
                                        >
                                            <Popup>
                                                <b>
                                                    {i.reference_number}
                                                </b>
                                                <br />

                                                {i.title}
                                                <br />

                                                {friendly(i.status)}
                                                <br />

                                                <Link
                                                    to={`/incidents/${i.id}`}
                                                >
                                                    View details
                                                </Link>
                                            </Popup>
                                        </Marker>
                                    ))}

                            {showLocations &&
                                filteredLocations.map((l) => (
                                    <Marker
                                        key={l.id}
                                        position={[
                                            l.latitude,
                                            l.longitude,
                                        ]}
                                        icon={icon}
                                        eventHandlers={{
                                            click: () =>
                                                setSelected(l),
                                        }}
                                    >
                                        <Popup>
                                            <b>{l.name}</b>
                                            <br />

                                            {friendly(l.location_type)}
                                        </Popup>
                                    </Marker>
                                ))}
                        </MapContainer>

                        {selected && (
                            <div className="map-selected-card">
                                <button
                                    className="map-card-close"
                                    onClick={() => setSelected(null)}
                                >
                                    ×
                                </button>

                                <small>
                                    {selected.reference_number
                                        ? "INCIDENT"
                                        : "CAMPUS LOCATION"}
                                </small>

                                <b>
                                    {selected.title || selected.name}
                                </b>

                                <span>
                                    {selected.location_name ||
                                        friendly(
                                            selected.location_type ||
                                                selected.category
                                        )}
                                </span>

                                {selected.status && (
                                    <span className="muted">
                                        {friendly(selected.status)} ·{" "}
                                        {formatDate(
                                            selected.reported_at
                                        )}
                                    </span>
                                )}

                                {selected.reference_number && (
                                    <Link
                                        to={`/incidents/${selected.id}`}
                                        className="text-link"
                                    >
                                        Open incident details →
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}