import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect, useMemo } from "react";
import AppNavsShell from "../../components/AppNavsShell";
import DeadlineBadge from "../../components/DeadlineBadge";


// ----------------- Helpers -----------------
const dateYMDToDMY = (v) => {
  if (!v) return "—";
  const isYMD = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const parts = isYMD
    ? v.split("-")
    : new Date(v).toISOString().slice(0, 10).split("-");
  if (!parts || parts.length !== 3) return "—";
  const [yy, mm, dd] = parts;
  return `${dd}/${mm}/${yy}`;
};
const safeTime = (v) => (v ? String(v).slice(0, 5) : "—");

export const ViewDeadline = () => {
  const { store, dispatch } = useGlobalReducer();
  const { deadlineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const API = import.meta.env.VITE_BACKEND_URL;
  const token = store?.auth?.token || null;
  const role = (store?.me?.role || "").toLowerCase();

  // Guards
  const allowed = role === "admin_user" || role === "lawyer" || role === "client";
  if (!allowed) return <Navigate to="/403" replace />;

  // ReturnTo: default a /deadlines si no vino por state
  const returnTo = useMemo(
    () => location.state?.returnTo || "/deadlines",
    [location.state]
  );

  // Si vino por state desde un expediente, lo precargamos
  const state = location.state || {};
  const initialLinked =
    state.courtfileId
      ? { id: state.courtfileId, number: state.courtfileNumber, title: state.courtfileTitle }
      : null;

  const [deadline, setDeadline] = useState(null);
  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch principal
  useEffect(() => {
    let abort = false;
    const fetchDeadline = async () => {
      try {
        setLoading(true);
        const resp = await fetch(`${API}/api/deadlines/${deadlineId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!abort) {
          setDeadline(data);
          setError(null);
        }
      } catch (e) {
        if (!abort) {
          console.error("Error fetching deadline:", e);
          setError("Failed to load deadline data");
        }
      } finally {
        if (!abort) setLoading(false);
      }
    };
    if (deadlineId && token) fetchDeadline();
    return () => { abort = true; };
  }, [API, token, deadlineId]);

  // Si vino solo el id del courtfile, completar number/title
  useEffect(() => {
    let abort = false;
    const loadCf = async () => {
      try {
        if (linkedCourtfile?.id && (!linkedCourtfile.number || !linkedCourtfile.title)) {
          const resp = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok) {
            const d = await resp.json();
            if (!abort) {
              setLinkedCourtfile((cf) => ({
                ...(cf || {}),
                number: d.case_number,
                title: d.title,
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

  // Si no vino por state, buscá el link en la tabla de relaciones
  useEffect(() => {
    let abort = false;
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !deadlineId) return;
        const resp = await fetch(`${API}/api/deadlines-courtfiles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const rows = await resp.json();
        const rel = (rows || []).find((r) => Number(r.deadline_id) === Number(deadlineId));
        if (rel && !abort) {
          setLinkedCourtfile({
            id: rel.courtfile_id,
            number: rel.courtfile_number,
            title: rel.courtfile_title,
          });
        }
      } catch {
        /* noop */
      }
    };
    fetchLinked();
    return () => { abort = true; };
  }, [API, token, deadlineId, linkedCourtfile]);

  // Delete
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this deadline?")) return;
    try {
      const resp = await fetch(`${API}/api/deadlines/${deadlineId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      dispatch({ type: "DELETE_DEADLINE", payload: Number(deadlineId) || deadlineId });
      alert("Deadline deleted successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Error deleting deadline:", err);
      alert(`Error deleting deadline: ${err.message}`);
    }
  };

  // UI states
  if (loading) {
    return (
      <AppNavsShell>
        <div className="container mt-4 text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2">Loading deadline…</p>
        </div>
      </AppNavsShell>
    );
  }

  if (error || !deadline) {
    return (
      <AppNavsShell>
        <div className="container add-page">
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle"></i> {error || "Deadline not found"}
          </div>
          <Link to={returnTo} className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left"></i> Back
          </Link>
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
              <Link to={returnTo || "/deadlines"}>Deadlines</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Details
            </li>
          </ol>
        </nav>

        <div className="col-md-8 col-lg-8">
          {/* Header (title + actions) */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h1 className="h2 fw-bolder mb-0 line-clamp-1">
              {deadline.deadline_type || "Deadline"}
            </h1>

            {["lawyer", "admin_user"].includes(role) && (
              <div className="d-flex gap-2">
                <Link
                  to={`/deadlines/${deadline.id}`}
                  state={{ returnTo }}
                  className="btn btn-phoenix-secondary btn-sm"
                >
                  <i className="bi bi-pencil" /> Edit
                </Link>
                <button className="btn btn-phoenix-danger btn-sm" onClick={handleDelete}>
                  <i className="bi bi-trash" /> Delete
                </button>
              </div>
            )}
          </div>

          {/* Summary strip */}
          <div className="card mb-3 mt-5">
            <div className="card-body">
              <div className="row text-center g-4">

                {/* Date */}
                <div className="col-sm-4">
                  <div className="d-inline-flex align-items-center">
                    <div
                      className="d-flex bg-success-subtle rounded flex-center me-3"
                      style={{ width: 32, height: 32 }}
                    >
                      <i className="bi bi-calendar-event text-success" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Date</p>
                      <h4 className="fw-bolder text-nowrap mb-0">
                        {deadline.deadline_date ? dateYMDToDMY(deadline.deadline_date) : "—"}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="col-sm-4 border-start-sm border-translucent ps-sm-5">
                  <div className="d-inline-flex align-items-center">
                    <div
                      className="d-flex bg-info-subtle rounded flex-center me-3"
                      style={{ width: 32, height: 32 }}
                    >
                      <i className="bi bi-clock-history text-info" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Time</p>
                      <h4 className="fw-bolder text-nowrap mb-0">
                        {safeTime(deadline.deadline_hour) || "—"}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div className="col-sm-4 border-start-sm border-translucent ps-sm-5">
                  <div className="d-inline-flex align-items-center">
                    <div
                      className="d-flex bg-primary-subtle rounded flex-center me-3"
                      style={{ width: 32, height: 32 }}
                    >
                      <i className="bi bi-flag text-primary" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Priority</p>
                      <div className="mt-1">
                        <DeadlineBadge priority={deadline.priority} outline />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>


          {/* Case File abajo */}
          <div className="row g-3 mt-3">
            <div className="col-12">
              {linkedCourtfile && (
                <div className="mb-4 ms-2">
                  <h3 className="fw-bold mb-1 text-muted">Case File</h3>
                  <Link
                    to={`/courtfiles/ViewCourtfileLawyer/${linkedCourtfile.id}`}
                    className="badge badge-phoenix badge-phoenix-secondary fs-8 mt-2"
                    title={linkedCourtfile.title || ""}
                  >
                    {linkedCourtfile.number || `#${linkedCourtfile.id}`}
                  </Link>
                </div>
              )}
            </div>
        

        </div>
      </div>
    </div>
    </AppNavsShell >
  );

}
