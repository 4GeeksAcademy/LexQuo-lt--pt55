import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useEffect, useState } from "react";

export const AddCourtfilesDocuments = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;

  const [formData, setFormData] = useState({
    courtfile_id: "",
    document_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const courtfiles = store.courtfiles || [];
  const documents = store.documents || [];

  const courtfileLabel = (cf) =>
    cf.case_number ? `${cf.case_number} - ${cf.title}` : `Courtfile #${cf.id}`;

  const documentLabel = (doc) =>
    doc.name ? `${doc.name} (${doc.type})` : `Document #${doc.id}`;

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
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

        if (documents.length === 0) {
          const response = await fetch(`${API}/api/documents`, {
            headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, 
                },
          });
          if (response.ok) {
            const data = await response.json();
            if (alive) dispatch({ type: "SET_DOCUMENTS", payload: data });
          }
        }
      } catch (err) {
        if (alive) setError("Error loading data");
        console.error(err);
      }
    };

    loadData();

    return () => { alive = false; };
  }, [API, dispatch, courtfiles.length, documents.length]);

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
        courtfile_id: Number(formData.courtfile_id),
        document_id: Number(formData.document_id),
      };

      const res = await fetch(`${API}/api/courtfile-document`, {
        method: "POST",
        headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, 
                },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create relationship");
      }

      const relationsResponse = await fetch(`${API}/api/courtfile-document`, {
        headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, 
                },
      });
      if (relationsResponse.ok) {
        const allRelations = await relationsResponse.json();
        dispatch({ type: "SET_COURTFILE_DOCUMENT", payload: allRelations });
      }

      alert("Relationship created successfully!");
      navigate("/CourtfilesDocuments");
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
            <h1>Add Courtfile-Document Relationship</h1>
            <Link to="/CourtfilesDocuments" className="btn btn-outline-secondary">
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
                      <option key={cf.id} value={cf.id}>
                        {courtfileLabel(cf)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="document_id" className="form-label">Document *</label>
                  <select
                    id="document_id"
                    name="document_id"
                    className="form-select"
                    value={formData.document_id}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a document</option>
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {documentLabel(doc)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="d-flex gap-2 justify-content-end">
                  <Link to="/CourtfilesDocuments" className="btn btn-secondary">
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