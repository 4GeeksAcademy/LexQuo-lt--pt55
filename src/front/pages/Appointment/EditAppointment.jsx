import { Link, useNavigate, useParams } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditAppointment = () => {
  const { dispatch } = useGlobalReducer();
  const { appointmentId } = useParams();
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
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointment = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API}/api/appointments/${appointmentId}`);
      if (!response.ok) {
        throw new Error(`Failed to load appointment data. Status: ${response.status}`);
      }
      const data = await response.json();
      setFormData(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching appointment:", err);
      setError("Failed to load appointment data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (appointmentId) fetchAppointment();
  }, [appointmentId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      const response = await fetch(`${API}/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedAppointment = await response.json();
        dispatch({ type: "UPDATE_APPOINTMENT", payload: updatedAppointment });
        navigate(`/appointments/view/${appointmentId}`);
        alert("Appointment updated successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update Appointment");
      }
    } catch (err) {
      console.error("Error updating Appointment:", err);
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
          <p>Loading Appointment data...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.title) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
        <Link to="/appointments" className="btn btn-primary">Back to Appointment</Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Edit Appointment</h1>
            <Link to="/appointments" className="btn btn-outline-secondary">
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
                  <label htmlFor="title" className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
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
                  <Link to={`/appointments`} className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i> Update Appointment
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
