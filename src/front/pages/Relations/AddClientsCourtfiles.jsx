import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useEffect, useState } from "react";

export const AddClientsCourtfiles = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    client_id: "",
    courtfile_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usar datos del store
  const clients = store.clients || [];
  const courtfiles = store.courtfiles || [];

  const clientLabel = (c) =>
    `${c.firstname ?? ""} ${c.lastname ?? ""}`.trim() || `Client #${c.id}`;

  const courtfileLabel = (cf) =>
    (cf.title ? `${cf.case_number} – ${cf.title}` : cf.case_number) ||
    `Courtfile #${cf.id}`;

  // Cargar datos solo si no están en el store
  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        if (clients.length === 0) {
          const response = await fetch(`${API}/api/clients`);
          if (response.ok) {
            const data = await response.json();
            if (alive) dispatch({ type: "SET_CLIENTS", payload: data });
          }
        }

        if (courtfiles.length === 0) {
          const response = await fetch(`${API}/api/courtfiles`);
          if (response.ok) {
            const data = await response.json();
            if (alive) dispatch({ type: "SET_COURTFILES", payload: data });
          }
        }
      } catch (err) {
        if (alive) setError("Error loading data");
        console.error(err);
      }
    };

    loadData();

    return () => { alive = false; };
  }, [API, dispatch, clients.length, courtfiles.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        client_id: Number(formData.client_id),
        courtfile_id: Number(formData.courtfile_id),
      };

      const res = await fetch(`${API}/api/clients-courtfiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create relation");
      }

      const relationsResponse = await fetch(`${API}/api/clients-courtfiles`);
      if (relationsResponse.ok) {
        const allRelations = await relationsResponse.json();
        dispatch({ type: "SET_CLIENT_COURTFILES", payload: allRelations });
      }

      alert("Relationship created successfully!");
      navigate("/ClientsCourtfiles");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Add Client–Courtfile</h1>
            <Link to="/ClientsCourtfiles" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="client_id" className="form-label">Client *</label>
                  <select
                    id="client_id"
                    name="client_id"
                    className="form-select"
                    value={formData.client_id}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{clientLabel(c)}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="courtfile_id" className="form-label">Courtfile *</label>
                  <select
                    id="courtfile_id"
                    name="courtfile_id"
                    className="form-select"
                    value={formData.courtfile_id}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a courtfile</option>
                    {courtfiles.map(cf => (
                      <option key={cf.id} value={cf.id}>{courtfileLabel(cf)}</option>
                    ))}
                  </select>
                </div>

                <div className="d-flex gap-2 justify-content-end">
                  <Link to="/ClientsCourtfiles" className="btn btn-secondary">
                    Cancel
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Creating..." : "Create Relation"}
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