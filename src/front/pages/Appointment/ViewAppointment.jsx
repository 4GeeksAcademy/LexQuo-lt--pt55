import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import MapComponent from "../../components/Map/MapComponent";
import AppNavsShell from "../../components/AppNavsShell";

export const ViewAppointment = () => {
  const { store, dispatch } = useGlobalReducer();
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/appointments";

  const API = import.meta.env.VITE_BACKEND_URL;
  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer" || role === "client";
  if (!allowed) return <Navigate to="/403" replace />;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const state = location.state || {};
  const initialLinked = state.courtfileId
    ? { id: state.courtfileId, number: state.courtfileNumber, title: state.courtfileTitle }
    : null;

  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);

  // ---------- Data fetch ----------
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setAppointment(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError("Failed to load appointment data");
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId && token) fetchAppointment();
  }, [API, appointmentId, token]);

  useEffect(() => {
    const loadCf = async () => {
      try {
        if (linkedCourtfile?.id && (!linkedCourtfile.number || !linkedCourtfile.title)) {
          const resp = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            const d = await resp.json();
            setLinkedCourtfile(cf => ({ ...(cf || {}), number: d.case_number, title: d.title }));
          }
        }
      } catch {
        // noop
      }
    };
    loadCf();
  }, [API, linkedCourtfile?.id, token]);

  useEffect(() => {
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !appointmentId) return;
        const resp = await fetch(`${API}/api/appointments-courtfiles`, {
          headers: { Authorization: `Bearer ${token}` }
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
      } catch {
        // noop
      }
    };
    fetchLinked();
  }, [API, appointmentId, linkedCourtfile, token]);

  // ---------- Actions ----------
  const handleDelete = async () => {
    if (!window.confirm("¿Seguro que querés eliminar este turno?")) return;
    try {
      const response = await fetch(`${API}/api/appointments/${appointmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        dispatch({ type: "DELETE_APPOINTMENT", payload: Number(appointmentId) || appointmentId });
        navigate(returnTo, { replace: true });
        alert("Turno eliminado correctamente");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "No se pudo eliminar el turno");
      }
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // ---------- UI states ----------
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="container mt-4">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Inicio</Link></li>
            <li className="breadcrumb-item"><Link to="/appointments">Appointments</Link></li>
            <li className="breadcrumb-item active" aria-current="page">View</li>
          </ol>
        </nav>

        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "appointment not found"}
        </div>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Back
        </Link>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <AppNavsShell>
      <div className="container main-content">
        {/* Breadcrumbs */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link to={returnTo || "/appointments"}>Appointments</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Details
            </li>
          </ol>
        </nav>

        <div className="col-8">
          {/* Header (title + actions) */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h1 className="h2 fw-bolder mb-0 line-clamp-1">
              {appointment.title || "Appointment"}
            </h1>

            {["lawyer", "admin_user"].includes(role) && (
              <div className="d-flex gap-2">
                <Link
                  to={`/appointments/${appointment.id}`}
                  state={{ returnTo }}
                  className="btn btn-phoenix-secondary btn-sm"
                >
                  <i className="bi bi-pencil"></i> Edit
                </Link>
                <button className="btn btn-phoenix-danger btn-sm" onClick={handleDelete}>
                  <i className="bi bi-trash"></i> Delete
                </button>
              </div>
            )}
          </div>

          {/* Summary strip */}
<div className="card mb-3 mt-5">
  <div className="card-body">
    <div className="row text-center g-4 align-items-center">
      {/* Date */}
      <div className="col-3">
        <div className="d-inline-flex align-items-center">
          <div className="d-flex bg-success-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
            <i className="bi bi-calendar-event text-success" />
          </div>
          <div className="text-start">
            <p className="fw-bold mb-1">Date</p>
            <h4 className="fw-bolder mb-0 text-nowrap">{appointment.date || "—"}</h4>
          </div>
        </div>
      </div>

      {/* Time */}
      <div className="col-4 border-start-md border-translucent ps-md-5">
        <div className="d-inline-flex align-items-center">
          <div className="d-flex bg-info-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
            <i className="bi bi-clock-history text-info" />
          </div>
          <div className="text-start">
            <p className="fw-bold mb-1">Time</p>
            <h4 className="fw-bolder mb-0 text-nowrap">
              {appointment.starts_at || "—"}
              {appointment.ends_at ? ` – ${appointment.ends_at}` : ""}
            </h4>
          </div>
        </div>
      </div>

      {/* Location (más ancho) */}
      <div className="col-5 border-start-md border-translucent ps-md-5">
        <div className="d-inline-flex align-items-center w-100">
          <div className="d-flex bg-primary-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
            <i className="bi bi-geo-alt text-primary" />
          </div>
          <div className="text-start w-100">
            <p className="fw-bold mb-1">Location</p>
            <h4 className="fw-bolder mb-0 text-truncate">{appointment.location || "—"}</h4>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>




          {/* Details + map (unstyled) */}
          <div className="row g-3 mt-4">
            {/* Details */}
            <div className="col-lg-6">
              <div className="mb-4 ms-2">
                <h3 className="fw-bold text-muted">Additional details</h3>
                <p className="fs-8 mb-3 mt-1">{appointment.details || "-"}</p>

                {/* Case File abajo de Additional details */}
                {linkedCourtfile && (
                  <div className="mt-5">
                    <h3 className="fw-bold mb-1 text-muted">Case File</h3>
                    <Link
                      to={`/courtfiles/ViewCourtfileLawyer/${linkedCourtfile.id}`}
                      className="badge badge-phoenix badge-phoenix-secondary fs-8"
                      title={linkedCourtfile.title || ""}
                    >
                      {linkedCourtfile.number || `#${linkedCourtfile.id}`}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Map (smaller, no card, no title) */}
            <div className="col-lg-6">
              {appointment.latitud && appointment.longitud && (
                <>
                  <div style={{ height: 220, borderRadius: 8, overflow: "hidden" }}>
                    <MapComponent
                      key={`view-${appointment.latitud}-${appointment.longitud}`}
                      position={[appointment.latitud, appointment.longitud]}
                      readonly
                    />
                  </div>
                  <div className="form-text mt-2">
                    Coords: {appointment.latitud}, {appointment.longitud}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );

};