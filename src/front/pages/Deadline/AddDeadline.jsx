import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const AddDeadline = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/deadlines";

  const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
  const token = auth?.token;

  const Deadline_Categories = ["Contestación de demanda", "Traslado / Vista", "Ofrecimiento de prueba", "Producción de prueba", "Audiencia",
    "Recurso / Apelación", "Ejecución / Cumplimiento", "Caducidad de instancia", "Plazo penal (excarcelación, preventiva, etc.)",
    "Mediación obligatoria", "Vencimiento de contrato", "Pago de tasa de justicia / aportes", "Vencimiento administrativo (AFIP, IGJ, etc.)",
    "Documentación del cliente", "Recordatorio interno / reunión con cliente", "Otros"
  ]

  const [formData, setFormData] = useState({
    deadline_type: "",
    deadline_date: "",
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
            const r = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`);
            if (r.ok) {
              const d = await r.json();
              setPreselectedCf({ case_number: d.case_number, title: d.title });
            }
          }
          setMyCases([]);
          return;
        }

        const endpoint = token
          ? `${API}/api/lawyers-courtfiles`
          : `${API}/api/courtfiles`;

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const resp = await fetch(endpoint, { headers });

        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();

        const mapped = token
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
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          deadline_type: formData.deadline_type,
          deadline_date: formData.deadline_date,
          deadline_hour: formData.deadline_hour,
          priority: String(formData.priority).toUpperCase()
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
          ...(token ? { Authorization: `Bearer ${token}` } : {})
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
      navigate(returnTo);
    } catch (err) {
      console.error("Error creating/linking Deadline:", err);
      setError(err.message);
    } finally {
      setLinking(false);
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Add New Deadline</h1>
            <Link to="/deadlines" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          {/* Card */}
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {preselectedCourtfileId ? (
                  <div className="mb-3">
                    <label className="form-label">Linked Courtfile</label>
                    <div className="form-control-plaintext">
                      Expediente {preselectedCf?.case_number || "—"}                
                      {preselectedCf?.title ? ` — ${preselectedCf.title}` : ""}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label htmlFor="courtfile_id" className="form-label">Link to Courtfile *</label>
                    <select
                      className="form-select"
                      id="courtfile_id"
                      name="courtfile_id"
                      value={formData.courtfile_id}
                      onChange={handleInputChange}
                      required
                      disabled={loading || loadingCases}
                    >
                      <option value="">Select a courtfile</option>
                      {myCases.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.number} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="deadline_type" className="form-label">Deadline Type *</label>
                  <select
                    className="form-select"
                    id="deadline_type"
                    name="deadline_type"
                    value={formData.deadline_type}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a Type</option>
                    {Deadline_Categories.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
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
                  <input
                    type="time"
                    className="form-control"
                    id="deadline_hour"
                    name="deadline_hour"
                    value={formData.deadline_hour}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
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
                  <Link to="/deadlines" className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create Deadline
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