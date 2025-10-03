import { Link, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect, useMemo } from "react";
import MapComponent from "../../components/Map/MapComponent";
import LocationAutocomplete from "../../components/Map/LocationAutocomplete";
import AppNavsShell from "../../components/AppNavsShell";

export const EditAppointment = () => {
  const { store, dispatch } = useGlobalReducer();
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `/appointments/view/${appointmentId}`;
  const [loadingCases, setLoadingCases] = useState(false);
  const [myCases, setMyCases] = useState([]);

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const preselectedDate = location.state?.date || "";

  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer";

  if (!allowed) return <Navigate to="/403" replace />;



  const initialLinked =
    location.state?.courtfileId
      ? { id: location.state.courtfileId, number: location.state.courtfileNumber, title: location.state.courtfileTitle }
      : null;

  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    details: "",
    date: "",
    starts_at: "",
    ends_at: "",
    latitud: null,
    longitud: null
  });

  const [mapPosition, setMapPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointment = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API}/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to load appointment data. Status: ${response.status}`);
      }
      const toHHMM = (v) => {
        if (!v) return "";
        // acepta "19:30" o "19:30:00"
        const m = String(v).match(/^(\d{2}):(\d{2})/);
        return m ? `${m[1]}:${m[2]}` : "";
      };

      const data = await response.json();
      setFormData({
        ...data,
        starts_at: toHHMM(data.starts_at),
        ends_at: toHHMM(data.ends_at),
      });

      if (data.latitud && data.longitud) {
        setMapPosition([data.latitud, data.longitud]);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching appointment:", err);
      setError("Failed to load appointment data");
    } finally {
      setFetching(false);
    }
  };

  // helpers
  const timeToMinutes = (hhmm) => {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const addMinutes = (hhmm, delta) => {
    if (!hhmm) return "";
    const [h, m] = hhmm.split(":").map(Number);
    const base = new Date(2000, 0, 1, h, m, 0);
    const plus = new Date(base.getTime() + delta * 60000);
    const hh = String(plus.getHours()).padStart(2, "0");
    const mm = String(plus.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // opciones 00:00, 00:15, ... 23:45
  const times15 = Array.from({ length: (24 * 60) / 15 }, (_, i) => {
    const total = i * 15;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  // handlers
  const handleStartSelect = (e) => {
    const starts = e.target.value;
    const ends = addMinutes(starts, 30); // +30’
    setFormData(prev => ({ ...prev, starts_at: starts, ends_at: ends }));
  };
  const handleEndSelect = (e) => {
    const ends = e.target.value;
    setFormData(prev => ({ ...prev, ends_at: ends }));
  };

  // mostrar en Ends sólo >= Starts (opcional)
  const endOptions = formData.starts_at
    ? times15.filter(t => timeToMinutes(t) >= timeToMinutes(formData.starts_at))
    : times15;

  useEffect(() => {
    if (!appointmentId || !token) return;
    fetchAppointment();
  }, [API, appointmentId, token]);

  useEffect(() => {
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !appointmentId) return;
        const resp = await fetch(`${API}/api/appointments-courtfiles`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resp.ok) return;
        const rows = await resp.json();
        const rel = (rows || []).find(r => Number(r.appointment_id) === Number(appointmentId));
        if (rel) {
          setLinkedCourtfile({
            id: rel.courtfile_id,
            number: rel.courtfile_number,
            title: rel.courtfile_title
          });
        }
      } catch (e) {
        // noop
      }
    };
    if (token) fetchLinked();
  }, [API, appointmentId, token, linkedCourtfile]);



  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
    setLoading(true);
    setError(null);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      const response = await fetch(`${API}/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedAppointment = await response.json();
        dispatch({ type: "UPDATE_APPOINTMENT", payload: updatedAppointment });
        navigate(returnTo, { replace: true });
        alert("Appointment updated successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update Appointment");
      }
    } catch (err) {
      console.error("Error updating Appointment:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hydrateCf = async () => {
      try {
        if (!token) return;
        const id = linkedCourtfile?.id ?? preselectedCourtfileId;
        const hasLabel = (linkedCourtfile?.number || preselectedCourtfileNumber) && (linkedCourtfile?.title || preselectedCourtfileTitle);
        if (!id || hasLabel) return;

        const r = await fetch(`${API}/api/courtfiles/${id}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!r.ok) return;
        const d = await r.json();
        // si venías con preselected, no pises; si no, completá linkedCourtfile
        if (linkedCourtfile?.id) {
          setLinkedCourtfile(cf => ({ ...(cf || {}), number: cf?.number ?? d.case_number, title: cf?.title ?? d.title }));
        }
      } catch {
        /* noop */
      }
    };
    hydrateCf();
  }, [API, token, linkedCourtfile?.id, preselectedCourtfileId, linkedCourtfile?.number, linkedCourtfile?.title, preselectedCourtfileNumber, preselectedCourtfileTitle]);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoadingCases(true);
        const endpoint =
          role === "lawyer"
            ? `${API}/api/lawyers-courtfiles?expand=courtfile`
            : `${API}/api/courtfiles`;

        const resp = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!resp.ok) return;

        const data = await resp.json();

        const mapped =
          role === "lawyer"
            ? data.map(r => ({
              id: r.courtfile?.id ?? r.courtfile_id ?? r.id,
              number: r.courtfile?.case_number ?? r.case_number,
              title: r.courtfile?.title ?? r.title,
            }))
            : data.map(cf => ({ id: cf.id, number: cf.case_number, title: cf.title }));

        setMyCases(mapped.filter(x => x?.id));
      } catch {
        /* noop */
      } finally {
        setLoadingCases(false);
      }
    };

    // Solo cargo la lista si NO venís con courtfile preseleccionado
    if (token && role && !preselectedCourtfileId) {
      fetchCases();
    }
  }, [API, token, role, preselectedCourtfileId]);


  const crumbs = useMemo(() => {
    const arr = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Appointments", to: "/appointments" },
    ];

    const cfId = linkedCourtfile?.id ?? preselectedCourtfileId;
    const cfNum = linkedCourtfile?.number ?? preselectedCourtfileNumber;
    const cfTitle = linkedCourtfile?.title ?? preselectedCourtfileTitle;


    arr.push({ label: "Edit", to: null }); // <- era "Add"
    return arr;
  }, [
    linkedCourtfile?.id,
    linkedCourtfile?.number,
    linkedCourtfile?.title,
    preselectedCourtfileId,
    preselectedCourtfileNumber,
    preselectedCourtfileTitle,
  ]);

  if (fetching) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          <p>Loading Appointment data...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.title) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
        <Link to={returnTo} className="btn btn-primary">Back</Link>
      </div>
    );
  }

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
                        <Link
                          to={c.to}
                          state={{ returnTo }}
                          className="text-decoration-none"
                        >
                          {c.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start mb-4">
              <h1 className="display-5 fw-bold mb-2 mb-sm-0">Edit Appointment</h1>

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
          Updating...
        </>
      ) : (
        <>
          <i className="bi bi-check-circle me-2" />
          Update Appointment
        </>
      )}
    </button>
  </div>
</div>


            {(linkedCourtfile?.id || preselectedCourtfileId) ? (
              <>
                <span
                  className="badge badge-phoenix-secondary mb-3 text-wrap text-break fs-9 fs-sm-8"
                  style={{ whiteSpace: "normal" }}
                >
                  Related to Courtfile{" "}
                  {(linkedCourtfile?.number || preselectedCourtfileNumber || "—")}
                  {(linkedCourtfile?.title || preselectedCourtfileTitle)
                    ? ` — ${linkedCourtfile?.title || preselectedCourtfileTitle}`
                    : ""}
                </span>
              </>
            ) : (
              <div className="form-floating mb-3">
                <select
                  className="form-select form-control-ux"
                  id="courtfile_id"
                  name="courtfile_id"
                  value={formData.courtfile_id || ""}
                  onChange={handleInputChange}
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


            {/* Error */}
            {error && (
              <div
                className="alert alert-danger d-flex align-items-center"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle me-2" /> {error}
              </div>
            )}

            {/* Form */}
            <form id="appointmentForm" onSubmit={handleSubmit}>
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

              {/* LOCATION */}
              <div className="mb-3">
                <label
                  htmlFor="location"
                  className="form-label form-label-ux pe-0 me-0"
                >
                  Location *
                </label>
                <LocationAutocomplete
                  onLocationSelect={handleLocationSelect}
                  value={formData.location}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, location: value }))
                  }
                />
                <div className="form-text">
                  Search for a location or drag the marker on the map
                </div>
              </div>

              {/* Fecha/Horas (izq) + Mapa (der) */}
              <div className="row g-4 align-items-start">
                {/* IZQUIERDA: Fecha + Horas + Detalles */}
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
                          {times15.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
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
                          {endOptions.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
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
                  <div className="ratio ratio-4x3">
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
                      Coordenadas: {formData.latitud?.toFixed(6)},{" "}
                      {formData.longitud?.toFixed(6)}
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
          Updating...
        </>
      ) : (
        <>
          <i className="bi bi-check-circle me-2" />
          Update Appointment
        </>
      )}
    </button>
  </div>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );

};
