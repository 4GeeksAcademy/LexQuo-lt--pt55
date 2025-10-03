import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect, useMemo } from "react";
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
  const preselectedDate = location.state?.date || "";

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
    date: preselectedDate,
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

        // Si ya viene preseleccionado, solo asegurar datos del CF
        if (preselectedCourtfileId) {
          if (!preselectedCf) {
            const r = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
            });
            if (r.ok) {
              const d = await r.json();
              setPreselectedCf({ case_number: d.case_number, title: d.title });
            }
          }
          setMyCases([]);
          return;
        }

        const endpoint =
          role === "lawyer"
            ? `${API}/api/lawyers-courtfiles?expand=courtfile`
            : `${API}/api/courtfiles`;

        const resp = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        });
        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }
        const data = await resp.json();

        // Map robusto (soporta {courtfile:{...}} o plano)
        const mapped =
          role === "lawyer"
            ? data.map(r => ({
              id: r.courtfile?.id ?? r.courtfile_id ?? r.id,
              number: r.courtfile?.case_number ?? r.case_number,
              title: r.courtfile?.title ?? r.title
            }))
            : data.map(cf => ({ id: cf.id, number: cf.case_number, title: cf.title }));

        setMyCases(mapped.filter(x => x?.id));
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



  const crumbs = useMemo(() => {
    const arr = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Appointments", to: "/appointments" },
    ];

    if (preselectedCourtfileId) {
      arr.push({
        label: `CF ${preselectedCf?.case_number || preselectedCourtfileId}`,
        to: `/courtfiles/ViewCourtfileLawyer/${preselectedCourtfileId}`,
      });
    }

    arr.push({ label: "Add", to: null }); // current page
    return arr;
  }, [preselectedCourtfileId, preselectedCf?.case_number]);

  return (
    <AppNavsShell>
      <div className="container add-page">
        <div className="row">
          <div className="col-12 col-md-8">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="mb-4">
              <ol className="breadcrumb small mb-0">
                {crumbs.map((c, i) => {
                  const isLast = i === crumbs.length - 1;
                  return (
                    <li
                      key={i}
                      className={`breadcrumb-item ${isLast ? "active" : ""}`}
                      {...(isLast ? { "aria-current": "page" } : {})}
                    >
                      {isLast || !c.to ? (
                        <span className="text-body">{c.label}</span>
                      ) : (
                        <Link to={c.to} state={{ returnTo }} className="text-decoration-none">
                          {c.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-2">
              {/* Título */}
              <h1 className="display-6 display-sm-5 fw-bold mb-0">Add New Appointment</h1>

              {/* Botones solo en md+ */}
              <div className="d-none d-md-flex gap-2">
                <Link
                  to={returnTo}
                  className="btn btn-phoenix btn-phoenix-secondary fs-10 fs-md-9"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  form="appointmentForm"
                  className="btn btn-phoenix btn-phoenix-primary fs-10 fs-md-9"
                  disabled={loading}
                >
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
            </div>


            {/* Courtfile context / selector */}
            {preselectedCourtfileId ? (
              <>
                <span className="badge badge-phoenix-secondary mb-3 text-wrap">
                  Related to Courtfile {preselectedCf?.case_number || preselectedCourtfileId}
                  {preselectedCf?.title && (
                    <>
                      <br className="d-sm-none" /> {/* salto solo en < sm */}
                      {preselectedCf.title}
                    </>
                  )}
                </span>
                <input type="hidden" name="courtfile_id" value={preselectedCourtfileId} />
              </>
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
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-3 p-md-4 border-start border-4 border-primary rounded-start">
                  <div className="d-flex align-items-start">
                    <div
                      className="me-3 rounded-circle bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center"
                      style={{ width: 36, height: 36 }}
                    >
                      <i className="bi bi-lightbulb-fill" />
                    </div>

                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-1 text-uppercase text-muted fw-bold">Sugerencia IA</h6>
                        {suggestion.urgency && (
                          <span className={`badge badge-phoenix ${String(suggestion.urgency).toLowerCase() === "urgent" ? "badge-phoenix-danger" :
                            String(suggestion.urgency).toLowerCase() === "high" ? "badge-phoenix-warning" :
                              String(suggestion.urgency).toLowerCase() === "medium" ? "badge-phoenix-info" :
                                "badge-phoenix-secondary"
                            }`}>
                            {String(suggestion.urgency).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <h5 className="mb-1 fw-semibold">{suggestion.title}</h5>

                      {suggestion.reasoning && (
                        <p className="mb-2 text-body-secondary">{suggestion.reasoning}</p>
                      )}

                      {Array.isArray(suggestion.next_steps) && suggestion.next_steps.length > 0 && (
                        <ul className="mb-2 small ps-3">
                          {suggestion.next_steps.map((step, i) => <li key={i}>{step}</li>)}
                        </ul>
                      )}

                      {(suggestion.legal_basis || typeof suggestion.confidence === "number") && (
                        <div className="small text-body-tertiary">
                          {suggestion.legal_basis ? `Fundamento: ${suggestion.legal_basis}` : ""}
                          {typeof suggestion.confidence === "number" ? ` • Conf.: ${(suggestion.confidence * 100).toFixed(0)}%` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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

              {/* Fecha/Horas (izq) + Mapa (der) */}
              <div className="row g-4 align-items-start">
                {/* IZQUIERDA: Fecha + Horas */}
                <div className="col-md-6 order-2 order-md-1">
                  <div className="row g-3">
                    <div className="col-12">
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

                    <div className="col-6">
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

                    <div className="col-6">
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
                  </div>

                </div>

                {/* DERECHA: Mapa */}
                <div className="col-md-6 order-1 order-md-2">
                  <div className="ratio ratio-4x3"> {/* mantiene proporción */}
                    <div className="w-100 h-100 rounded-3 overflow-hidden">
                      <MapComponent
                        position={mapPosition}
                        onPositionChange={handleMapPositionChange}
                        readonly={false}
                      />
                    </div>
                  </div>
                  {formData.latitud && formData.longitud && (
                    <div className="form-text mt-2">
                      Coordenadas: {formData.latitud?.toFixed(6)}, {formData.longitud?.toFixed(6)}
                    </div>
                  )}
                </div>

              </div>




            </form>
            {/* Botones solo en mobile */}
            <div className="d-flex d-md-none gap-2 mt-3 justify-content-end">
              <Link
                to={returnTo}
                className="btn btn-phoenix btn-phoenix-secondary fs-10"
              >
                Cancel
              </Link>
              <button
                type="submit"
                form="appointmentForm"
                className="btn btn-phoenix btn-phoenix-primary fs-10"
                disabled={loading}
              >
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
          </div>
        </div>
      </div >
    </AppNavsShell >
  );
}