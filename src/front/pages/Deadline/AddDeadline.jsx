import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";

export const AddDeadline = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/deadlines";
  const suggestion = location.state?.suggestion || null;
  const preselectedDate = location.state?.date || "";

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer";

  if (!allowed) return <Navigate to="/403" replace />;

  const Deadline_Categories = ["Contestación de demanda", "Traslado / Vista", "Ofrecimiento de prueba", "Producción de prueba", "Audiencia",
    "Recurso / Apelación", "Ejecución / Cumplimiento", "Caducidad de instancia", "Plazo penal (excarcelación, preventiva, etc.)",
    "Mediación obligatoria", "Vencimiento de contrato", "Pago de tasa de justicia / aportes", "Vencimiento administrativo (AFIP, IGJ, etc.)",
    "Documentación del cliente", "Recordatorio interno / reunión con cliente", "Otros"
  ]

  const [formData, setFormData] = useState({
    deadline_type: "",
    deadline_date: preselectedDate,
    deadline_hour: "",
    priority: "medium",
    courtfile_id: preselectedCourtfileId ? String(preselectedCourtfileId) : "",
  });

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
        const resp = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();

        const mapped = role === "lawyer"
          ? data.map(r => ({
            id: r.courtfile.id,
            number: r.courtfile.case_number,
            title: r.courtfile.title
          }))
          : data.map(cf => ({
            id: cf.id,
            number: cf.case_number,
            title: cf.title
          }));

        setMyCases(mapped);
      } catch (err) {
        setError(err.message || "Error fetching courtfiles");
      } finally {
        setLoadingCases(false);
      }
    };
    fetchCases();
  }, [API, token, preselectedCourtfileId, preselectedCf]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.courtfile_id) {
        throw new Error("Please select a courtfile to link this deadline.");
      }

      // 1) Crear Deadline
      const response = await fetch(`${API}/api/deadlines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deadline_type: formData.deadline_type,
          deadline_date: formData.deadline_date,
          deadline_hour: formData.deadline_hour,
          priority: String(formData.priority).toUpperCase(),
          courtfile_id: Number(formData.courtfile_id)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create deadline");
      }

      const newDeadline = await response.json();
      dispatch({ type: "ADD_DEADLINE", payload: newDeadline });

      // 2) Vincular con courtfile
      setLinking(true);
      const relResp = await fetch(`${API}/api/deadlines-courtfiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deadline_id: newDeadline.id,
          courtfile_id: Number(formData.courtfile_id)
        })
      });

      if (!relResp.ok) {
        const e = await relResp.json().catch(() => ({}));
        throw new Error(e.error || `Failed to link deadline (HTTP ${relResp.status})`);
      }

      alert("Deadline created and linked successfully!");
      navigate(returnTo, { replace: true })
    } catch (err) {
      console.error("Error creating/linking Deadline:", err);
      setError(err.message);
    } finally {
      setLinking(false);
      setLoading(false);
    }
  };

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

  const caseLabel =
    preselectedCourtfileNumber ||
    preselectedCourtfileTitle ||
    (preselectedCourtfileId ? `#${preselectedCourtfileId}` : null);

  return (
    <AppNavsShell>
      <div className="container add-page">
        <div className="row">
          <div className="col-8">

            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb">
                {caseLabel && (
                  <li className="breadcrumb-item">
                    <Link to={`/courtfiles/ViewCourtfileLawyer/${preselectedCourtfileId}`}>
                      {caseLabel}
                    </Link>
                  </li>
                )}
                <li className="breadcrumb-item">
                  <Link to={returnTo || "/deadlines"}>Deadlines</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Add
                </li>
              </ol>
            </nav>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-5 fw-bold mb-0">Add New Deadline</h1>
              <div className="d-flex gap-2">
                <Link to={returnTo} className="btn btn-phoenix btn-phoenix-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  form="addDeadlineForm"
                  className="btn btn-phoenix btn-phoenix-primary"
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
                      Create Deadline
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Courtfile context / selector */}
            {preselectedCourtfileId ? (
              <span className="badge badge-phoenix-secondary mt-1 mb-3">
                Related to Courtfile {preselectedCf?.case_number || "—"}
                {preselectedCf?.title ? ` — ${preselectedCf.title}` : ""}
              </span>
            ) : (
              <div className="form-floating mb-3">
                <select
                  className="form-select"
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
                  <i className="bi bi-lightbulb"></i> Sugerencia IA
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

            <form id="addDeadlineForm" onSubmit={handleSubmit}>

              <div className="form-floating mb-3">
                <select
                  className="form-select"
                  id="deadline_type"
                  name="deadline_type"
                  value={formData.deadline_type}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value=""></option>
                  {Deadline_Categories.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <label htmlFor="deadline_type">Deadline Type *</label>
              </div>

              <div className="form-floating mb-3">
                <input
                  type="date"
                  className="form-control"
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

              <div className="form-floating mb-3">
                <select
                  className="form-select"
                  id="deadline_hour"
                  name="deadline_hour"
                  value={formData.deadline_hour}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value=""></option>
                  {times15.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label htmlFor="deadline_hour">Deadline Time *</label>
              </div>

              <div className="form-floating mb-3">
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
                <label htmlFor="priority">Priority *</label>
              </div>

            </form>
          </div>
        </div>
      </div>

    </AppNavsShell>
  );
};