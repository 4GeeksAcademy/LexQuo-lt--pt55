import { Link, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditDocument = () => {
  const { store, dispatch } = useGlobalReducer();
  const { documentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `/documents/view/${documentId}`;

  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer";

  if (!allowed) return <Navigate to="/403" replace />;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    document_date: ""
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const initialLinked =
    location.state?.courtfileId
      ? { id: location.state.courtfileId, number: location.state.courtfileNumber, title: location.state.courtfileTitle }
      : null;

  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);

  const documentCategories = [
    "Resolution / Ruling",
    "Party Filing",
    "Evidence",
    "Precautionary Measure / Urgent Request",
    "Public Prosecutor's Office Action",
    "Relevant Judicial Proceeding",
    "Official Letter / Communication",
    "Judgment",
    "Costs and Fees",
    "Internal Note / Reminder"
  ];

  const fetchDocument = async () => {
    try {
      setFetching(true);

      const response = await fetch(`${API}/api/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setFormData({
        name: data.name || "",
        description: data.description || "",
        category: data.category || "",
        document_date: data.document_date || ""
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching document:", err);
      setError("Failed to load document data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (documentId) fetchDocument();
  }, [documentId]);

  useEffect(() => {
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !documentId) return;
        const resp = await fetch(`${API}/api/courtfile-document`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const rows = await resp.json();
        const rel = (rows || []).find(r => Number(r.document_id) === Number(documentId));
        if (rel) {
          setLinkedCourtfile({
            id: rel.courtfile_id,
            number: rel.courtfile_number,
            title: rel.courtfile_title
          });
        }
      } catch { /* noop */ }
    };
    fetchLinked();
  }, [API, documentId, linkedCourtfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Crear FormData para enviar archivo y datos
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("category", formData.category);
      data.append("document_date", formData.document_date);

      // Solo agregar el archivo si se seleccionó uno nuevo
      if (file) {
        data.append("file", file);
      }

      const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
      const token = auth?.token;

      const response = await fetch(`${API}/api/documents/${documentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data,
      });

      if (response.ok) {
        const updatedDocument = await response.json();
        dispatch({ type: "UPDATE_DOCUMENT", payload: updatedDocument });
        navigate(returnTo, { replace: true });
        alert("Document updated successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update document");
      }
    } catch (err) {
      console.error("Error updating document:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading document data...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
        <Link to={returnTo} className="btn btn-primary">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Edit Document</h1>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          {linkedCourtfile && (
            <div className="mb-3">
              <span className="badge bg-dark mt-1 mb-2">
                Linked to Case {linkedCourtfile.number || `#${linkedCourtfile.id}`}
                {linkedCourtfile.title ? ` — ${linkedCourtfile.title}` : ""}
              </span>
            </div>
          )}

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
                  <label htmlFor="name" className="form-label">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Input para subir archivo */}
                <div className="mb-3">
                  <label htmlFor="file" className="form-label">
                    Replace File (Optional)
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    id="file"
                    name="file"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                  <div className="form-text">
                    Leave empty to keep the current file. Allowed: documents, images, audio, video
                  </div>
                </div>

                {/* Input fecha del documento */}
                <div className="mb-3">
                  <label htmlFor="document_date" className="form-label">
                    Document Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="document_date"
                    name="document_date"
                    value={formData.document_date}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <div className="form-text">Used for the case timeline</div>
                </div>

                <div className="mb-3">
                  <label htmlFor="category" className="form-label">
                    Category
                  </label>
                  <select
                    className="form-select"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="">Select category (optional)</option>
                    {documentCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    disabled={loading}
                    placeholder="Enter document description (optional)"
                  />
                </div>

                {/* Buttons */}
                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to={returnTo} className="btn btn-secondary me-md-2">
                    Cancel
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i> Update Document
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