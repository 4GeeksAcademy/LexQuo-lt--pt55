import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import MapComponent from "../../components/Map/MapComponent";
import LocationAutocomplete from "../../components/Map/LocationAutocomplete";

export const ViewAppointment = () => {
  const { store, dispatch } = useGlobalReducer();
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const rawReturnTo = location.state?.returnTo;
  const returnTo =
    typeof rawReturnTo === "string"
      ? rawReturnTo
      : (rawReturnTo && typeof rawReturnTo === "object" && "pathname" in rawReturnTo)
        ? rawReturnTo
        : fallbackByRole;

  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer" ||
    role === "client";

  if (!allowed) return <Navigate to="/403" replace />;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const state = location.state || {};
  const initialLinked = state.courtfileId
    ? { id: state.courtfileId, number: state.courtfileNumber, title: state.courtfileTitle }
    : null;

  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);

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
      } catch (e) {
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
      } catch (e) {
        // noop
      }
    };
    fetchLinked();
  }, [API, appointmentId, linkedCourtfile, token]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      const response = await fetch(`${API}/api/appointments/${appointmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        dispatch({ type: "DELETE_APPOINTMENT", payload: Number(appointmentId) || appointmentId });
        navigate(returnTo, { replace: true });
        alert("Appointment deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete appointment");
      }
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert(`Error deleting appointment: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          <p>Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Appointment not found"}
        </div>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Back
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Appointment Details</h1>
            </div>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          {linkedCourtfile && (
            <span className="badge bg-dark mt-1 mb-2">
              Linked to Case {linkedCourtfile.number || `#${linkedCourtfile.id}`}
              {linkedCourtfile.title ? ` — ${linkedCourtfile.title}` : ""}
            </span>
          )}

          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-person-badge"></i> Appointment Information
              </h5>
            </div>

            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Title</label>
                    <p className="fs-6">{appointment.title || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Location</label>
                    <p className="fs-6">{appointment.location || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Aditional details</label>
                    <p className="fs-6">{appointment.details || "-"}</p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Date</label>
                    <p className="fs-6">{appointment.date || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Starts At</label>
                    <p className="fs-6">{appointment.starts_at || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Ends At</label>
                    <p className="fs-6">{appointment.ends_at || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
            {appointment.latitud && appointment.longitud && (
              <div className="mb-3">
                <label className="fw-bold text-muted">Ubicación en Mapa</label>
                <MapComponent
                  key={appointment ? `view-${appointment.latitud}-${appointment.longitud}` : 'view-null'}
                  position={appointment ? [appointment.latitud, appointment.longitud] : null}
                  readonly
                />
                <div className="form-text">
                  Coordenadas: {appointment.latitud}, {appointment.longitud}
                </div>
              </div>
            )}
            <div className="card-footer bg-light">
              {["lawyer", "admin_user"].includes(role) && (
                <div className="d-flex gap-2 justify-content-end">
                  <Link
                    to={`/appointments/${appointment.id}`}
                    state={{ returnTo }}
                    className="btn btn-warning"
                  >
                    <i className="bi bi-pencil"></i> Edit
                  </Link>
                  <button className="btn btn-danger" onClick={handleDelete}>
                    <i className="bi bi-trash"></i> Delete
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div >
  );
};
