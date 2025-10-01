import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useEffect, useState } from "react";

export const AddLawyersCourtfiles = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;
  const token = store?.auth?.token;

  const [formData, setFormData] = useState({
    lawyer_id: "",
    courtfile_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lawyers = store.lawyers || [];
  const courtfiles = store.courtfiles || [];

  const lawyerLabel = (l) =>
    `${l.firstname ?? ""} ${l.lastname ?? ""}`.trim() || `Lawyer #${l.id}`;

  const courtfileLabel = (cf) =>
    (cf.title ? `${cf.case_number} – ${cf.title}` : cf.case_number) ||
    `Courtfile #${cf.id}`;

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        if (lawyers.length === 0) {
          const response = await fetch(`${API}/api/lawyers`, {
            headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, 
                },
          });
          if (response.ok) {
            const data = await response.json();
            if (alive) dispatch({ type: "SET_LAWYERS", payload: data });
          }
        }

        if (courtfiles.length === 0) {
          const response = await fetch(`${API}/api/courtfiles`, {
            headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, 
                },
          });
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
  }, [API, dispatch, lawyers.length, courtfiles.length]);

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
        courtfile_id: Number(formData.courtfile_id),
      };

      const res = await fetch(`${API}/api/lawyers-courtfiles`, {
        method: "POST",
        headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, 
                },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create relation");
      }

      const relationsResponse = await fetch(`${API}/api/lawyers-courtfiles`, {
        headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, 
                },
      });
      if (relationsResponse.ok) {
        const allRelations = await relationsResponse.json();
        dispatch({ type: "SET_LAWYER_COURTFILES", payload: allRelations });
      }

      alert("Relationship created successfully!");
      navigate("/LawyersCourtfiles");
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
            <h1>Add Lawyer–Courtfile</h1>
            <Link to="/LawyersCourtfiles" className="btn btn-outline-secondary">
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
                      <option key={l.id} value={l.id}>{lawyerLabel(l)}</option>
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
                  <Link to="/LawyersCourtfiles" className="btn btn-secondary">
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