import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useEffect, useState } from "react";

export const AddLawyersClients = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    lawyer_id: "",
    client_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lawyers = store.lawyers || [];
  const clients = store.clients || [];

  const lawyerLabel = (l) =>
    `${l.firstname ?? ""} ${l.lastname ?? ""}`.trim() || `Lawyer #${l.id}`;

  const clientLabel = (c) =>
    `${c.firstname ?? ""} ${c.lastname ?? ""}`.trim() || `Client #${c.id}`;

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        if (lawyers.length === 0) {
          const response = await fetch(`${API}/api/lawyers`);
          if (response.ok) {
            const data = await response.json();
            if (alive) dispatch({ type: "SET_LAWYERS", payload: data });
          }
        }

        if (clients.length === 0) {
          const response = await fetch(`${API}/api/clients`);
          if (response.ok) {
            const data = await response.json();
            if (alive) dispatch({ type: "SET_CLIENTS", payload: data });
          }
        }
      } catch (err) {
        if (alive) setError("Error loading data");
        console.error(err);
      }
    };

    loadData();

    return () => { alive = false; };
  }, [API, dispatch, lawyers.length, clients.length]);

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
        lawyer_id: Number(formData.lawyer_id),
        client_id: Number(formData.client_id),
      };

      const res = await fetch(`${API}/api/lawyer-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create relationship");
      }

      const relationsResponse = await fetch(`${API}/api/lawyer-client`);
      if (relationsResponse.ok) {
        const allRelations = await relationsResponse.json();
        dispatch({ type: "SET_LAWYER_CLIENT", payload: allRelations });
      }

      alert("Relationship created successfully!");
      navigate("/LawyersClients");
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
            <h1>Add Lawyer–Client Relationship</h1>
            <Link to="/LawyersClients" className="btn btn-outline-secondary">
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
                  <label htmlFor="lawyer_id" className="form-label">Lawyer *</label>
                  <select
                    id="lawyer_id"
                    name="lawyer_id"
                    className="form-select"
                    value={formData.lawyer_id}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a lawyer</option>
                    {lawyers.map(l => (
                      <option key={l.id} value={l.id}>
                        {lawyerLabel(l)} {l.email && `(${l.email})`}
                      </option>
                    ))}
                  </select>
                </div>

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
                      <option key={c.id} value={c.id}>
                        {clientLabel(c)} {c.email && `(${c.email})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="d-flex gap-2 justify-content-end">
                  <Link to="/LawyersClients" className="btn btn-secondary">
                    Cancel
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      "Create Relationship"
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