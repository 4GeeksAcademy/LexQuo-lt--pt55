import { Link, useNavigate, useParams } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditDeadline = () => {
  const { dispatch } = useGlobalReducer();
  const { deadlineId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    deadline_type: "",
    deadline_date: "",
    deadline_hour: "",
    priority: "medium",
  });

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

  useEffect(() => {
    if (deadlineId) fetchDeadline();
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
        navigate(`/deadlines/view/${deadlineId}`);
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

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Edit Deadline</h1>
            <Link to="/deadlines" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          {/* Form */}
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
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
                  <Link to={`/deadlines/view/${deadlineId}`} className="btn btn-secondary me-md-2">Cancel</Link>
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