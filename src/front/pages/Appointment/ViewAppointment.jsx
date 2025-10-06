import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import MapComponent from "../../components/Map/MapComponent";
import AppNavsShell from "../../components/AppNavsShell";
import { toast } from "react-toastify";

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

  // Si vino por state desde un expediente, lo precargamos (como antes)
  const state = location.state || {};
  const initialLinked = state.courtfileId
    ? { id: state.courtfileId, number: state.courtfileNumber, title: state.courtfileTitle }
    : null;

  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);

  // ---------- Data fetch: APPOINTMENT "puro" por id ----------
  useEffect(() => {
    let abort = false;
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!abort) setAppointment(data);
      } catch (err) {
        console.error("Error fetching appointment:", err);
        if (!abort) toast.error("Failed to load appointment data");
      } finally {
        if (!abort) setLoading(false);
      }
    };

    if (appointmentId && token) fetchAppointment();
    return () => { abort = true; };
  }, [API, appointmentId, token]);

  // ---------- Si no vino prelinkeado, buscamos la relación y armamos linkedCourtfile ----------
  useEffect(() => {
    let abort = false;
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !appointmentId) return;
        const resp = await fetch(`${API}/api/appointments-courtfiles?appointment_id=${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const rows = await resp.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (row && !abort) {
          setLinkedCourtfile({
            id: row.courtfile_id,
            number: row.courtfile_number,
            title: row.courtfile_title
          });
        }
      } catch {
        /* noop */
      }
    };
    fetchLinked();
    return () => { abort = true; };
  }, [API, appointmentId, linkedCourtfile, token]);

  // ---------- Completar number/title si sólo vino el id por state ----------
  useEffect(() => {
    let abort = false;
    const loadCf = async () => {
      try {
        if (linkedCourtfile?.id && (!linkedCourtfile.number || !linkedCourtfile.title)) {
          const resp = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            const d = await resp.json();
            if (!abort) {
              setLinkedCourtfile(cf => ({
                ...(cf || {}),
                number: d.case_number,
                title: d.title
              }));
            }
          }
        }
      } catch {
        /* noop */
      }
    };
    loadCf();
    return () => { abort = true; };
  }, [API, linkedCourtfile?.id, token]);

  // ---------- Actions ----------
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      const resp = await fetch(`${API}/api/appointments/${appointmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      dispatch({ type: "DELETE_APPOINTMENT", payload: Number(appointmentId) || appointmentId });
      toast.success("Appointment deleted successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Error deleting appointment:", err);
      toast.error(`Error deleting appointment: ${err.message}`);
    }
  };

  // ---------- UI ----------
  if (loading || !appointment) {
    return (
      <AppNavsShell>
        <div className="container add-page text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2">Loading appointment…</p>
        </div>
      </AppNavsShell>
    );
  }

  return (
    <AppNavsShell>
      <div className="container add-page">
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

        <div className="col-sm-8">
          {/* Header (title + actions) */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-3">
            <h1 className="h2 fw-bolder mb-0 line-clamp-1 fs-6 fs-md-5">
              {appointment?.title || "Appointment"}
            </h1>

            {["lawyer", "admin_user"].includes(role) && (
              <div className="d-flex gap-2 mt-2 mt-md-0 align-self-end align-self-md-center">
                <Link
                  to={`/appointments/${appointment?.id}`}
                  state={{ returnTo }}
                  className="btn btn-phoenix-secondary btn-sm fs-10 fs-md-9"
                >
                  <i className="bi bi-pencil"></i> Edit
                </Link>
                <button
                  className="btn btn-phoenix-danger btn-sm fs-10 fs-md-9"
                  onClick={handleDelete}
                >
                  <i className="bi bi-trash"></i> Delete
                </button>
              </div>
            )}
          </div>

          {/* Summary strip */}
          <div className="card mb-3 mt-5">
            <div className="card-body">
              <div className="row text-start text-md-center g-4 align-items-center">
                {/* Date */}
                <div className="col-12 col-md-3">
                  <div className="d-inline-flex align-items-center">
                    <div className="d-flex bg-success-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
                      <i className="bi bi-calendar-event text-success" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Date</p>
                      <h4 className="fw-bolder mb-0 text-nowrap">{appointment?.date || "—"}</h4>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="col-12 col-md-4 border-start-md border-translucent ps-md-5">
                  <div className="d-inline-flex align-items-center">
                    <div className="d-flex bg-info-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
                      <i className="bi bi-clock-history text-info" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Time</p>
                      <h4 className="fw-bolder mb-0 text-nowrap">
                        {appointment?.starts_at || "—"}
                        {appointment?.ends_at ? ` – ${appointment.ends_at}` : ""}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="col-12 col-md-5 border-start-md border-translucent ps-md-5">
                  <div className="d-inline-flex align-items-center w-100">
                    <div className="d-flex bg-primary-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
                      <i className="bi bi-geo-alt text-primary" />
                    </div>
                    <div className="text-start w-100">
                      <p className="fw-bold mb-1">Location</p>
                      <h4 className="fw-bolder mb-0 text-truncate">{appointment?.location || "—"}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details + map */}
          <div className="row g-3 mt-4">
            {/* Details */}
            <div className="col-lg-6">
              <div className="mb-4 ms-2">
                <h3 className="fw-bold text-muted">Additional details</h3>
                <p className="fs-8 mb-3 mt-1">{appointment?.details || "-"}</p>

                {/* Case File — SIEMPRE con linkedCourtfile (como antes) */}
                {linkedCourtfile && (
                  <div className="mt-5">
                    <h3 className="fw-bold mb-1 text-muted">Case File</h3>
                    <Link
                      to={
                        role === "client"
                          ? `/courtfiles/viewclient/${linkedCourtfile.id}`
                          : role === "lawyer"
                          ? `/courtfiles/ViewCourtfileLawyer/${linkedCourtfile.id}`
                          : `/courtfiles/${linkedCourtfile.id}`
                      }
                      className="badge badge-phoenix badge-phoenix-secondary fs-8"
                      title={linkedCourtfile.title || ""}
                    >
                      {linkedCourtfile.number || `#${linkedCourtfile.id}`}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            <div className="col-lg-6">
              {appointment?.latitud && appointment?.longitud && (
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
