import { Link, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect, useMemo } from "react";
import AppNavsShell from "../../components/AppNavsShell";

export const EditDeadline = () => {
  const { store, dispatch } = useGlobalReducer();
  const { deadlineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `/deadlines/view/${deadlineId}`;

  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  const [formData, setFormData] = useState({
    deadline_type: "",
    deadline_date: "",
    deadline_hour: "",
    priority: "medium",
  });

  const initialLinked =
    location.state?.courtfileId
      ? {
        id: location.state.courtfileId,
        number: location.state.courtfileNumber,
        title: location.state.courtfileTitle,
      }
      : null;

  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Deadline
  const fetchDeadline = async () => {
    try {
      setFetching(true);
      const resp = await fetch(`${API}/api/deadlines/${deadlineId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setFormData({
        deadline_type: data.deadline_type,
        deadline_date: data.deadline_date,
        deadline_hour: data.deadline_hour,
        priority: data.priority,
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching deadline:", err);
      setError("Failed to load deadline data");
    } finally {
      setFetching(false);
    }
  };

  // Fetch Courtfile linked
  const fetchLinkedCourtfile = async () => {
    try {
      const resp = await fetch(`${API}/api/deadlines-courtfiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const rows = await resp.json();
      const rel = (rows || []).find(
        (r) => Number(r.deadline_id) === Number(deadlineId)
      );
      if (rel) {
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

  useEffect(() => {
    if (deadlineId) {
      fetchDeadline();
      if (!linkedCourtfile) fetchLinkedCourtfile();
    }
  }, [deadlineId, linkedCourtfile, API, token]);

  // hydrate cf
  useEffect(() => {
    const loadCf = async () => {
      try {
        if (linkedCourtfile?.id && (!linkedCourtfile.number || !linkedCourtfile.title)) {
          const resp = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok) {
            const d = await resp.json();
            setLinkedCourtfile((cf) => ({
              ...(cf || {}),
              number: d.case_number,
              title: d.title,
            }));
          }
        }
      } catch {
        /* noop */
      }
    };
    loadCf();
  }, [API, linkedCourtfile?.id, token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/api/deadlines/${deadlineId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update deadline");
      }
      const updated = await resp.json();
      dispatch({ type: "UPDATE_DEADLINE", payload: updated });
      navigate(returnTo, { replace: true });
      alert("Deadline updated successfully!");
    } catch (err) {
      console.error("Error updating deadline:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // helpers
  const times15 = Array.from({ length: 96 }, (_, i) => {
    const hh = String(Math.floor(i / 4)).padStart(2, "0");
    const mm = String((i % 4) * 15).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  const crumbs = useMemo(() => {
    const arr = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Deadlines", to: "/deadlines" },
      { label: `Edit`, to: null },
    ];
    return arr;
  }, [deadlineId]);

  // Loading
  if (fetching) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status"></div>
        <p>Loading deadline data...</p>
      </div>
    );
  }

  if (error && !formData.deadline_type) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
        <Link to={returnTo} className="btn btn-primary">
          Back
        </Link>
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
                        <Link to={c.to} state={{ returnTo }}>
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
              {/* Título */}
              <h1 className="display-5 fw-bold mb-2 mb-md-0">Edit Deadline</h1>

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
                  form="deadlineForm"
                  className="btn btn-phoenix btn-phoenix-primary fs-10 fs-md-9"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2" />
                      Update Deadline
                    </>
                  )}
                </button>
              </div>
            </div>


            {linkedCourtfile && (
              <span
                className="
                  badge badge-phoenix-secondary mb-3
                  d-block d-sm-inline      /* bloque (ancho 100%) en XS, inline en SM+ */
                  w-100 w-sm-auto
                  text-wrap text-break     /* permitir saltos de línea y cortar palabras largas */
                "
              >
                Related to Courtfile {linkedCourtfile.number || "—"}
                {linkedCourtfile.title ? ` — ${linkedCourtfile.title}` : ""}
              </span>
            )}
            {/* Form */}
            <form id="deadlineForm" onSubmit={handleSubmit}>
              {/* Deadline Type */}
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control form-control-ux"
                  id="deadline_type"
                  name="deadline_type"
                  placeholder=" "
                  value={formData.deadline_type}
                  disabled
                />
                <label htmlFor="deadline_type">Deadline Type</label>
              </div>

              {/* Date */}
              <div className="form-floating mb-3">
                <input
                  type="date"
                  className="form-control form-control-ux"
                  id="deadline_date"
                  name="deadline_date"
                  placeholder=" "
                  value={formData.deadline_date}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="deadline_date">Deadline Date *</label>
              </div>

              {/* Hour */}
              <div className="form-floating mb-3">
                <select
                  className="form-select form-control-ux"
                  id="deadline_hour"
                  name="deadline_hour"
                  value={formData.deadline_hour}
                  onChange={handleInputChange}
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
                <label htmlFor="deadline_hour">Deadline Time *</label>
              </div>

              {/* Priority */}
              <div className="form-floating mb-4">
                <select
                  className="form-select form-control-ux"
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <label htmlFor="priority">Priority *</label>
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
                form="deadlineForm"
                className="btn btn-phoenix btn-phoenix-primary fs-10"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2" />
                    Update Deadline
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
