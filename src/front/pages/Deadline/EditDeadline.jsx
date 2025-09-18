import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditDeadline = () => {
  const { dispatch } = useGlobalReducer();
  const { deadlineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `/deadlines/view/${deadlineId}`;

  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    deadline_type: "",
    deadline_date: "",
    deadline_hour: "",
    priority: "medium",
  });

  const [linkedCourtfile, setLinkedCourtfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const Deadline_Categories = ["Contestación de demanda", "Traslado / Vista", "Ofrecimiento de prueba", "Producción de prueba", "Audiencia",
    "Recurso / Apelación", "Ejecución / Cumplimiento", "Caducidad de instancia", "Plazo penal (excarcelación, preventiva, etc.)",
    "Mediación obligatoria", "Vencimiento de contrato", "Pago de tasa de justicia / aportes", "Vencimiento administrativo (AFIP, IGJ, etc.)",
    "Documentación del cliente", "Recordatorio interno / reunión con cliente", "Otros"
  ]

  const fetchDeadline = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API}/api/deadlines/${deadlineId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();


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

  const fetchLinkedCourtfile = async () => {
    try {
      // intento con query param (si tu API lo soporta)
      let resp = await fetch(`${API}/api/deadlines-courtfiles?deadline_id=${deadlineId}`);
      if (!resp.ok) {
        // fallback: traer todos y filtrar
        resp = await fetch(`${API}/api/deadlines-courtfiles`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const all = await resp.json();
        const rel = (all || []).find(r => Number(r.deadline_id) === Number(deadlineId));
        if (rel) {
          setLinkedCourtfile({
            id: rel.courtfile_id,
            number: rel.courtfile_number || rel.courtfile?.case_number,
            title: rel.courtfile_title || rel.courtfile?.title
          });
        } else {
          setLinkedCourtfile(null);
        }
        return;
      }
      const rows = await resp.json(); // si trae filtrado
      const r = Array.isArray(rows) ? rows[0] : rows;
      if (r) {
        setLinkedCourtfile({
          id: r.courtfile_id,
          number: r.courtfile_number || r.courtfile?.case_number,
          title: r.courtfile_title || r.courtfile?.title
        });
      } else {
        setLinkedCourtfile(null);
      }
    } catch (e) {
      console.warn("Could not fetch linked courtfile:", e);
      setLinkedCourtfile(null);
    }
  };

  useEffect(() => {
    if (deadlineId) {
      fetchDeadline();
      fetchLinkedCourtfile();
    }
  }, [deadlineId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {

      const response = await fetch(`${API}/api/deadlines/${deadlineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedDeadline = await response.json();
        dispatch({ type: "UPDATE_DEADLINE", payload: updatedDeadline });
        navigate(returnTo, { replace: true });
        alert("Deadline updated successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update deadline");
      }
    } catch (err) {
      console.error("Error updating deadline:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          <p>Loading deadline data...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.deadline_type) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
        <Link to="/deadlines" className="btn btn-primary">Back to Deadlines</Link>
      </div>
    );
  }

  // helpers
  const timeToMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const times15 = Array.from({ length: (24 * 60) / 15 }, (_, i) => {
    const total = i * 15;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Edit Deadline</h1>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          {/* Form */}
          <div className="card">
            {linkedCourtfile && (
              <div className="mb-3">
                <div className="form-control-plaintext">
                  Related to Courtfile {linkedCourtfile.number || "—"}
                  {linkedCourtfile.title ? ` — ${linkedCourtfile.title}` : ""}
                </div>
              </div>
            )}
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Deadline Type</label>
                  <div className="form-control-plaintext">
                    {formData.deadline_type}
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="deadline_date" className="form-label">Deadline Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    id="deadline_date"
                    name="deadline_date"
                    value={formData.deadline_date}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="deadline_hour" className="form-label">Deadline Time *</label>
                  <select
                    className="form-select"
                    id="deadline_hour"
                    name="deadline_hour"
                    value={formData.deadline_hour}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="" disabled>Select time…</option>
                    {times15.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="priority" className="form-label">Priority *</label>
                  <select
                    className="form-select"
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
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to={returnTo} className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i> Update Deadline
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};