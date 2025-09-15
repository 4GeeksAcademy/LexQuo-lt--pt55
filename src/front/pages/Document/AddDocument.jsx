import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState } from "react";

export const AddDocument = () => {
  const { store, dispatch } = useGlobalReducer();
  const location = useLocation();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
  const token = auth?.token;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/documents";

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    url_route: "",
    description: "",
    category: "",
    document_date: ""
  });

  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);

  const documentTypes = [
    "PDF", "Word", "Excel", "Image", "Audio", "Video", "Other"
  ];

  const documentCategories = [
    "Legal", "Contract", "Evidence", "Report", "Correspondence", "Financial", "Other"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/api/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newDocument = await response.json();
        dispatch({ type: "ADD_DOCUMENT", payload: newDocument });

        if (preselectedCourtfileId) {
          setLinking(true);
          const linkResp = await fetch(`${API}/api/courtfile-document`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              document_id: newDocument.id,
              courtfile_id: Number(preselectedCourtfileId)
            })
          });

          if (!linkResp.ok) {
            const e = await linkResp.json().catch(() => ({}));
            throw new Error(e.error || `Document created, but failed to link (HTTP ${linkResp.status})`);
          }
        }

        alert(preselectedCourtfileId ? "Document created and linked!" : "Document created successfully!");
        navigate(returnTo);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create document");
      }
    } catch (err) {
      console.error("Error creating Document:", err);
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
              <h1>Add New Document</h1>
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
                    placeholder="Enter document name"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="type" className="form-label">
                    Document Type *
                  </label>
                  <select
                    className="form-select"
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select document type</option>
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* input fecha del documento */}
                <div className="mb-3">
                  <label htmlFor="document_date" className="form-label">Document Date</label>
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
                  <label htmlFor="url_route" className="form-label">
                    URL Route *
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    id="url_route"
                    name="url_route"
                    value={formData.url_route}
                    onChange={handleInputChange}
                    required
                    placeholder="https://example.com/document.pdf"
                    disabled={loading}
                  />
                  <div className="form-text">
                    Enter the full URL path to the document
                  </div>
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
                    placeholder="Enter document description (optional)"
                    disabled={loading}
                  />
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to={returnTo} className="btn btn-secondary me-md-2">Cancel</Link>   {/* [CHANGED] */}
                  <button type="submit" className="btn btn-primary" disabled={loading || linking}>
                    {loading || linking ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" />
                        {linking ? " Linking..." : " Creating..."}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create Document
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};