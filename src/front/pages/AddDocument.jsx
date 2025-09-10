import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useState } from "react";

export const AddDocument = () => {
  const { dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    url_route: "",
    description: "",
    category: "",
  });

  const [loading, setLoading] = useState(false);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newDocument = await response.json();
        dispatch({ type: "ADD_DOCUMENT", payload: newDocument });
        navigate("/documents");
        alert("Document created successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create document");
      }
    } catch (err) {
      console.error("Error creating Document:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Add New Document</h1>
            <Link to="/documents" className="btn btn-outline-secondary">
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
                  <Link to="/documents" className="btn btn-secondary me-md-2">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Creating...
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
    </div>
  );
};