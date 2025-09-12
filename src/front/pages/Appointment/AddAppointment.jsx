import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState } from "react";

export const AddAppointment = () => {
  const { dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    date: "",
    starts_at: "",
    ends_at: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev, [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = { ...formData };

      const response = await fetch(`${API}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newAppointment = await response.json();
        dispatch({ type: "ADD_APPOINTMENT", payload: newAppointment });
        navigate("/appointments");
        alert("Appointment created successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create appointment");
      }
    } catch (err) {
      console.error("Error creating appointment:", err);
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
            <h1>Add New Appointment</h1>
            <Link to="/appointments" className="btn btn-outline-secondary">
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
                  <label htmlFor="title" className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="Title"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="location" className="form-label">Location *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    placeholder="location"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="date" className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    placeholder="example: 2025-11-25"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="starts_at" className="form-label">Starts At *</label>
                  <input
                    type="time"
                    className="form-control"
                    id="starts_at"
                    name="starts_at"
                    value={formData.starts_at}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="ends_at" className="form-label">Ends At *</label>
                  <input
                    type="time"
                    className="form-control"
                    id="ends_at"
                    name="ends_at"
                    value={formData.ends_at}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to="/appointments" className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create Appointment
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
