import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import MapComponent from "../../components/Map/MapComponent";
import LocationAutocomplete from "../../components/Map/LocationAutocomplete";
import AppNavsShell from "../../components/AppNavsShell";

export const AddAppointment = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/appointments";
  const suggestion = location.state?.suggestion || null;

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer";

  if (!allowed) return <Navigate to="/403" replace />;

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    details: "",
    date: "",
    starts_at: "",
    ends_at: "",
    courtfile_id: preselectedCourtfileId ? String(preselectedCourtfileId) : "",
    latitud: null,
    longitud: null
  });

  const [mapPosition, setMapPosition] = useState(null);


  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);

  const [myCases, setMyCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [preselectedCf, setPreselectedCf] = useState(
    preselectedCourtfileNumber ? { case_number: preselectedCourtfileNumber, title: preselectedCourtfileTitle } : null
  );

  useEffect(() => {
    const fetchCases = async () => {
      if (!role) return;
      try {
        setLoadingCases(true);

        if (preselectedCourtfileId) {
          if (!preselectedCf) {
            const r = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (r.ok) {
              const d = await r.json();
              setPreselectedCf({ case_number: d.case_number, title: d.title });
            }
          }
          setMyCases([]);
          return;
        }

        const endpoint = role === "lawyer"
          ? `${API}/api/lawyers-courtfiles`
          : `${API}/api/courtfiles`;
        const headers = { Authorization: `Bearer ${token}` };
        const resp = await fetch(endpoint, { headers });
        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }
        const data = await resp.json();
        const mapped = role === "lawyer"
          ? data.map(r => ({ id: r.courtfile.id, number: r.courtfile.case_number, title: r.courtfile.title }))
          : data.map(cf => ({ id: cf.id, number: cf.case_number, title: cf.title }));
        setMyCases(mapped);
      } catch (err) {
        setError(err.message || "Error fetching courtfiles");
      } finally {
        setLoadingCases(false);
      }
    };
    fetchCases();
  }, [API, token, role, preselectedCourtfileId, preselectedCf]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev, [name]: value
    }));
  };

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      location: locationData.address,
      latitud: locationData.lat,
      longitud: locationData.lng
    }));
    setMapPosition([locationData.lat, locationData.lng]);
  };

  const handleMapPositionChange = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitud: lat,
      longitud: lng
    }));
    setMapPosition([lat, lng]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.courtfile_id) {
      setError("Please select a courtfile to link this appointment.");
      return;
    }

    setLoading(true);
    try {

      const resp = await fetch(`${API}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          location: formData.location,
          details: formData.details,
          date: formData.date,
          starts_at: formData.starts_at,
          ends_at: formData.ends_at,
          latitud: formData.latitud,
          longitud: formData.longitud,
          courtfile_id: Number(formData.courtfile_id)
        })
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Failed to create appointment");
      }

      const newAppointment = await resp.json();
      dispatch?.({ type: "ADD_APPOINTMENT", payload: newAppointment });


      alert("Appointment created and linked successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Error creating/linking appointment:", err);
      setError(err.message);
    } finally {
      setLinking(false);
      setLoading(false);
    }
  };

  // helpers (fuera del componente o arriba)
  const timeToMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const addMinutes = (hhmm, delta) => {
    const base = new Date(2000, 0, 1, ...hhmm.split(":").map(Number), 0);
    const plus = new Date(base.getTime() + delta * 60000);
    const hh = String(plus.getHours()).padStart(2, "0");
    const mm = String(plus.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // dentro del componente:
  const times15 = Array.from({ length: (24 * 60) / 15 }, (_, i) => {
    const total = i * 15;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  const handleStartSelect = (e) => {
    const starts = e.target.value;             // ej "19:30"
    const ends = addMinutes(starts, 30);       // +30’
    setFormData(prev => ({ ...prev, starts_at: starts, ends_at: ends }));
  };

  const handleEndSelect = (e) => {
    const ends = e.target.value;
    setFormData(prev => ({ ...prev, ends_at: ends }));
  };

  // si querés que "Ends" sólo muestre opciones >= start:
  const endOptions = formData.starts_at
    ? times15.filter(t => timeToMinutes(t) >= timeToMinutes(formData.starts_at))
    : times15;


  return (
   <AppNavsShell>
  <div className="container add-page">
    <div className="row">
      <div className="col-lg-10 col-xl-10 p-0">
        {/* Header */}
        <div className="d-flex justify-content-between mb-4">
          <h1 className="display-5 fw-bold mb-0">Add New Appointment</h1>
          <Link to={returnTo} className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1" />
            Back
          </Link>
        </div>

        {/* Courtfile context / selector */}
        {preselectedCourtfileId ? (
          <span className="badge bg-dark mt-1 mb-3">
            Related to Courtfile {preselectedCf?.case_number || "—"}
            {preselectedCf?.title ? ` — ${preselectedCf.title}` : ""}
          </span>
        ) : (
          <div className="form-floating mb-3">
            <select
              className="form-select form-control-ux"
              id="courtfile_id"
              name="courtfile_id"
              value={formData.courtfile_id}
              onChange={handleInputChange}
              required
              disabled={loading || loadingCases}
            >
              <option value=""></option>
              {myCases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.number} — {c.title}
                </option>
              ))}
            </select>
            <label htmlFor="courtfile_id">Link to Courtfile *</label>
          </div>
        )}

        {/* Card contenedora */}
        

            {suggestion && (
              <div className="alert alert-info">
                <h5 className="mb-1">
                  <i className="bi bi-lightbulb" /> Sugerencia IA
                </h5>
                <strong>{suggestion.title}</strong>
                {suggestion.reasoning && <p className="mb-1">{suggestion.reasoning}</p>}
                {Array.isArray(suggestion.next_steps) && suggestion.next_steps.length > 0 && (
                  <ul className="mb-1">
                    {suggestion.next_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                )}
                {suggestion.legal_basis && (
                  <small className="text-muted">Fundamento: {suggestion.legal_basis}</small>
                )}
              </div>
            )}

            {error && (
              <div className="alert alert-danger d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-triangle me-2" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* TITLE */}
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control form-control-ux"
                  id="title"
                  name="title"
                  placeholder=" "
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="title">Title *</label>
              </div>

              {/* LOCATION (componente custom: dejo label normal) */}
              <div className="mb-3">
                <label htmlFor="location" className="form-label form-label-ux pe-0 me-0">Location *</label>
                <LocationAutocomplete
                  onLocationSelect={handleLocationSelect}
                  value={formData.location}
                  onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                />
                <div className="form-text">Search for a location or drag the marker on the map</div>
              </div>

              {/* DETAILS */}
              <div className="form-floating mb-4">
                <textarea
                  className="form-control form-control-ux"
                  id="details"
                  name="details"
                  placeholder=" "
                  style={{ height: 120 }}
                  value={formData.details}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label htmlFor="details">Add details</label>
              </div>

              {/* MAPA */}
              <div className="mb-4">
                <label className="form-label form-label-ux">Map</label>
                <MapComponent
                  position={mapPosition}
                  onPositionChange={handleMapPositionChange}
                  readonly={false}
                />
                {formData.latitud && formData.longitud && (
                  <div className="form-text">
                    Coordenadas: {formData.latitud?.toFixed(6)}, {formData.longitud?.toFixed(6)}
                  </div>
                )}
              </div>

              {/* FECHA + HORAS (grid como el ejemplo) */}
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="form-floating">
                    <input
                      type="date"
                      className="form-control form-control-ux"
                      id="date"
                      name="date"
                      placeholder=" "
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                    <label htmlFor="date">Date *</label>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-floating">
                    <select
                      className="form-select form-control-ux"
                      id="starts_at"
                      value={formData.starts_at || ""}
                      onChange={handleStartSelect}
                      required
                      disabled={loading}
                    >
                      <option value=""></option>
                      {times15.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label htmlFor="starts_at">Starts at *</label>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-floating">
                    <select
                      className="form-select form-control-ux"
                      id="ends_at"
                      value={formData.ends_at || ""}
                      onChange={handleEndSelect}
                      required
                      disabled={loading}
                    >
                      <option value=""></option>
                      {endOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label htmlFor="ends_at">Ends at *</label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex gap-2 justify-content-end mt-4">
                <Link to={returnTo} className="btn btn-outline-secondary">Cancel</Link>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2" />
                      Create Appointment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
 </AppNavsShell>
);
}