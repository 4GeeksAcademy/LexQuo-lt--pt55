import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState } from "react";

export const AddClient = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  const auth = store?.auth || JSON.parse(localStorage.getItem("auth") || "null");
  const token = auth?.token;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/clients";

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    password: "",
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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

      // 1) crear cliente
      const response = await fetch(`${API}/api/clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create client");
      }

      const newClient = await response.json();
      dispatch({ type: "ADD_CLIENT", payload: newClient });

      if (preselectedCourtfileId) {
        setLinking(true);
        const linkResp = await fetch(`${API}/api/clients-courtfiles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            client_id: newClient.id,
            courtfile_id: Number(preselectedCourtfileId)
          })
        });
        if (!linkResp.ok) {
          const e = await linkResp.json().catch(() => ({}));
          throw new Error(e.error || `Client created, but failed to link (HTTP ${linkResp.status})`);
        }
      }

      alert(preselectedCourtfileId ? "Client created and linked!" : "Client created successfully!");
      navigate(returnTo); 
    } catch (err) {
      console.error("Error creating Client:", err);
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
            <div>                                                                  
              <h1>Add New Client</h1>
              {preselectedCourtfileId && (
                <span className="badge bg-info mt-2">
                  Linked to Case {preselectedCourtfileNumber || `#${preselectedCourtfileId}`}
                  {preselectedCourtfileTitle ? ` — ${preselectedCourtfileTitle}` : ""}
                </span>
              )}
            </div>
            <Link to={returnTo} className="btn btn-outline-secondary"> 
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
                  <label htmlFor="firstname" className="form-label">Firstname *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="firstname"
                    name="firstname"
                    value={formData.firstname}
                    onChange={handleInputChange}
                    required
                    placeholder="Firstname"
                    disabled={loading || linking}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="lastname" className="form-label">Lastname *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="lastname"
                    name="lastname"
                    value={formData.lastname}
                    onChange={handleInputChange}
                    required
                    placeholder="Lastname"
                    disabled={loading || linking}
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
                    placeholder="example@email.com"
                    disabled={loading || linking}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label">Phone *</label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="+54 9 11 5555-5555"
                    disabled={loading || linking}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password *</label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      placeholder="Password"
                      minLength={6}
                      disabled={loading || linking}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(v => !v)}
                      disabled={loading || linking}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                    </button>
                  </div>
                </div>

                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    disabled={loading || linking}
                  />
                  <label htmlFor="is_active" className="form-check-label">Active Client</label>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to="/clients" className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading || linking}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        {linking ? " Linking..." : " Creating..."}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create Client
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
