import { Link, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect, useMemo } from "react";
import AppNavsShell from "../../components/AppNavsShell";

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
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    document_date: "",
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const initialLinked =
    location.state?.courtfileId
      ? {
          id: location.state.courtfileId,
          number: location.state.courtfileNumber,
          title: location.state.courtfileTitle,
        }
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
    "Internal Note / Reminder",
  ];

  // -------- Fetch Document --------
  const fetchDocument = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API}/api/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setFormData({
        name: data.name || "",
        description: data.description || "",
        category: data.category || "",
        document_date: data.document_date || "",
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

  // -------- Fetch linked CF --------
  useEffect(() => {
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !documentId) return;
        const resp = await fetch(`${API}/api/courtfile-document`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const rows = await resp.json();
        const rel = (rows || []).find(
          (r) => Number(r.document_id) === Number(documentId)
        );
        if (rel) {
          setLinkedCourtfile({
            id: rel.courtfile_id,
            number: rel.courtfile_number,
            title: rel.courtfile_title,
          });
        }
      } catch {
        /* noop */
      }
    };
    fetchLinked();
  }, [API, documentId, linkedCourtfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("category", formData.category);
      data.append("document_date", formData.document_date);
      if (file) data.append("file", file);

      const response = await fetch(`${API}/api/documents/${documentId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update document");
      }

      const updatedDoc = await response.json();
      dispatch({ type: "UPDATE_DOCUMENT", payload: updatedDoc });
      navigate(returnTo, { replace: true });
      alert("Document updated successfully!");
    } catch (err) {
      console.error("Error updating document:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const crumbs = useMemo(() => {
    const arr = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Documents", to: "/documents" },
      { label: `Edit #${documentId}`, to: null },
    ];
    return arr;
  }, [documentId]);

  // -------- Loading / Error States --------
  if (fetching) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status"></div>
        <p>Loading document data...</p>
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
    <AppNavsShell>
      <div className="container add-page">
        <div className="row">
          <div className="col-lg-9">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="mb-4">
              <ol className="breadcrumb small mb-0">
                {crumbs.map((c, i) => {
                  const isLast = i === crumbs.length - 1;
                  return (
                    <li
                      key={i}
                      className={`breadcrumb-item ${isLast ? "active" : ""}`}
                      {...(isLast ? { "aria-current": "page" } : {})}
                    >
                      {isLast || !c.to ? (
                        <span className="text-body">{c.label}</span>
                      ) : (
                        <Link to={c.to} state={{ returnTo }}>
                          {c.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-5 fw-bold mb-0">Edit Case Record</h1>
              <div className="d-flex gap-2">
                <Link
                  to={returnTo}
                  className="btn btn-phoenix btn-phoenix-secondary"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  form="documentForm"
                  className="btn btn-phoenix btn-phoenix-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2" />
                      Update Record
                    </>
                  )}
                </button>
              </div>
            </div>

            {linkedCourtfile && (
              <span className="badge badge-phoenix-secondary mb-3">
                Linked to Case {linkedCourtfile.number || `#${linkedCourtfile.id}`}
                {linkedCourtfile.title ? ` — ${linkedCourtfile.title}` : ""}
              </span>
            )}

            {error && (
              <div className="alert alert-danger d-flex align-items-center">
                <i className="bi bi-exclamation-triangle me-2" /> {error}
              </div>
            )}

            {/* Form */}
            <form id="documentForm" onSubmit={handleSubmit}>
              {/* Name */}
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control form-control-ux"
                  id="name"
                  name="name"
                  placeholder=" "
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="name">Document Name *</label>
              </div>

              {/* File */}
              <div className="mb-3">
                <label htmlFor="file" className="form-label form-label-ux">
                  Replace File (Optional)
                </label>
                <input
                  type="file"
                  className="form-control form-control-ux"
                  id="file"
                  name="file"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <div className="form-text">
                  Leave empty to keep the current file.
                </div>
              </div>

              {/* Date */}
              <div className="form-floating mb-3">
                <input
                  type="date"
                  className="form-control form-control-ux"
                  id="document_date"
                  name="document_date"
                  placeholder=" "
                  value={formData.document_date}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label htmlFor="document_date">Document Date</label>
                <div className="form-text">Used for the case timeline</div>
              </div>

              {/* Category */}
              <div className="form-floating mb-3">
                <select
                  className="form-select form-control-ux"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value=""></option>
                  {documentCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <label htmlFor="category">Category</label>
              </div>

              {/* Description */}
              <div className="form-floating mb-4">
                <textarea
                  className="form-control form-control-ux"
                  id="description"
                  name="description"
                  placeholder=" "
                  style={{ height: 120 }}
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label htmlFor="description">Description</label>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
