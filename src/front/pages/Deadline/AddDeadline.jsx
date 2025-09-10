import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState } from "react";

export const AddDeadline = () => {
  const { dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    deadline_type: "",
    deadline_date: "",
    deadline_hour: "",
    priority: "medium",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {

      const response = await fetch(`${API}/api/deadlines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newDeadline = await response.json();
        dispatch({ type: "ADD_DEADLINE", payload: newDeadline });
        navigate("/deadlines");
        alert("Deadline created successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create deadline");
      }
    } catch (err) {
      console.error("Error creating Deadline:", err);
      setError(err.message);
    } finally {
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
                <div className="mb-3">
                  <label htmlFor="deadline_type" className="form-label">Deadline Type *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="deadline_type"
                    name="deadline_type"
                    value={formData.deadline_type}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Court Hearing, Document Submission"
                    disabled={loading}
                  />
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