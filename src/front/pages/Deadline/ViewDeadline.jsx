import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";
import DeadlineBadge from "../../components/DeadlineBadge";

export const ViewDeadline = () => {
  const { store, dispatch } = useGlobalReducer();
  const { deadlineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/deadlines";

  const API = import.meta.env.VITE_BACKEND_URL;

  // ---------- AUTH + ME ----------
  const token = store?.auth?.token || null;
  const me    = store?.me || null;
  const role  = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Si vino por state desde un expediente
  const prelinked = location.state?.courtfileId
    ? { id: location.state.courtfileId, number: location.state.courtfileNumber, title: location.state.courtfileTitle }
    : null;

  const [linkedCourtfile, setLinkedCourtfile] = useState(prelinked);

  // ---------- Helpers ----------
  const dateYMDToDMY = (v) => {
    if (!v) return "-";
    // admite "YYYY-MM-DD" o ISO con tiempo
    const isYMD = /^\d{4}-\d{2}-\d{2}$/.test(v);
    const d = isYMD ? v.split("-") : (new Date(v).toISOString().slice(0,10).split("-"));
    if (!d || d.length !== 3) return "-";
    const [yy, mm, dd] = d;
    return `${dd}/${mm}/${yy}`;
  };
  const safeTime = (v) => (v ? String(v).slice(0,5) : "—"); // "HH:MM"

  const getPriorityBadgeClass = (priority = "") => {
    switch (String(priority).toLowerCase()) {
      case "low": return "bg-secondary";
      case "medium": return "bg-info";
      case "high": return "bg-warning";
      case "urgent": return "bg-danger";
      default: return "bg-secondary";
    }
  };

  // ---------- Fetch ----------
  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/deadlines/${deadlineId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setDeadline(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching deadline:", err);
        setError("Failed to load deadline data");
      } finally {
        setLoading(false);
      }
    };
    if (deadlineId) fetchDeadline();
  }, [API, token, deadlineId]);

  useEffect(() => {
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !deadlineId) return;
        const resp = await fetch(`${API}/api/deadlines-courtfiles`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const rows = await resp.json();
        const rel = (rows || []).find(r => Number(r.deadline_id) === Number(deadlineId));
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
  }, [API, token, deadlineId, linkedCourtfile]);

  // ---------- Actions ----------
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this deadline?")) return;
    try {
      const response = await fetch(`${API}/api/deadlines/${deadlineId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${response.status}`);
      }
      dispatch({ type: "DELETE_DEADLINE", payload: Number(deadlineId) || deadlineId });
      navigate(returnTo, { replace: true });
      alert("Deadline deleted successfully!");
    } catch (err) {
      console.error("Error deleting deadline:", err);
      alert(`Error deleting deadline: ${err.message}`);
    }
  };

  // ---------- UI states ----------
  if (loading) {
    return (
      <AppNavsShell>
        <div className="container mt-4 text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
          <p className="mt-2">Loading deadline…</p>
        </div>
      </AppNavsShell>
    );
  }

  if (error || !deadline) {
    return (
      <AppNavsShell>
        <div className="container mt-4">
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
      <div className="page-add col-8">
        {/* Topbar */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-3">
            <h1 className="h2 mb-2">Deadline details</h1>
            {linkedCourtfile && (
              <span className="badge bg-dark">
                {`Linked to Case ${linkedCourtfile.number || `#${linkedCourtfile.id}`}${
                  linkedCourtfile.title ? ` — ${linkedCourtfile.title}` : ""
                }`}
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>
        </div>

        {/* Card */}
        <div className="card shadow-sm card-roomy">
          <div className="card-body">
            {/* Título principal = tipo de deadline */}
            <h2 className="h1 mb-4">{deadline.deadline_type || "-"}</h2>

            {/* Grid 2x2 alineada */}
            <div className="row g-4">
              {/* Col izquierda */}
              <div className="col-12 col-lg-6">
                <div className="mb-3">
                  <span className="fw-semibold text-muted d-block mb-1">Deadline Date</span>
                  <span className="fs-8">{dateYMDToDMY(deadline.deadline_date)}</span>
                </div>
                <div className="mb-0">
                  <span className="fw-semibold text-muted d-block mb-1">Deadline Time</span>
                  <span className="fs-8">{safeTime(deadline.deadline_hour)}</span>
                </div>
              </div>

              {/* Col derecha */}
              <div className="col-12 col-lg-6">
                <div className="mb-3">
                  <span className="fw-semibold text-muted d-block mb-1">Priority</span>
                  <DeadlineBadge priority={deadline.priority} outline />
                </div>
                <div className="mb-0">
                  <span className="fw-semibold text-muted d-block mb-1">Created At</span>
                  <span className="fs-8">
                    {deadline.created_at
                      ? new Date(deadline.created_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card-footer bg-light d-flex justify-content-end gap-2">
            <Link to={`/deadlines/${deadline.id}`} state={{ returnTo }} className="btn btn-warning btn-sm">
              <i className="bi bi-pencil"></i> Edit
            </Link>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              <i className="bi bi-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
