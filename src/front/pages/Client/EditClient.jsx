import { Link, useNavigate, useParams } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditClient = () => {
  const { dispatch } = useGlobalReducer();
  const { clientId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    password: "",
    is_active: true
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const fetchClient = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API}/api/clients/${clientId}`); // singular
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        ...data,
        password: "",
        phone: data.phone || ""
      }));
      setError(null);
    } catch (err) {
      console.error("Error fetching client:", err);
      setError("Failed to load client data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (clientId) fetchClient();
  }, [clientId]);

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

      const response = await fetch(`${API}/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedClient = await response.json();
        dispatch({ type: "UPDATE_CLIENT", payload: updatedClient });
        navigate(`/clients/view/${clientId}`);
        alert("Client updated successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update Client");
      }
    } catch (err) {
      console.error("Error updating Client:", err);
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
          <p>Loading Client data...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.firstname) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
        <Link to="/clients" className="btn btn-primary">Back to Clients</Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Edit Client</h1>
            <Link to="/clients" className="btn btn-outline-secondary">
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
                  <label htmlFor="firstname" className="form-label">First Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="firstname"
                    name="firstname"
                    value={formData.firstname}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="lastname" className="form-label">Last Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="lastname"
                    name="lastname"
                    value={formData.lastname}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label">Phone *</label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="+54 9 11 5555-5555"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password (leave empty to keep current)</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <label htmlFor="is_active" className="form-check-label">Active Client</label>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to={`/clients/view/${clientId}`} className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i> Update Client
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
