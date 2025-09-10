import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewDocument = () => {
  const { dispatch } = useGlobalReducer();
  const { documentId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/documents/${documentId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setDocument(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load document data");
      } finally {
        setLoading(false);
      }
    };

    if (documentId) fetchDocument();
  }, [documentId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`${API}/api/documents/${documentId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        dispatch({ type: "DELETE_DOCUMENT", payload: Number(documentId) || documentId });
        navigate("/documents");
        alert("Document deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete document");
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      alert(`Error deleting document: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Document not found"}
        </div>
        <Link to="/documents" className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Documents
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
            <div>
              <h1>Document Details</h1>
              <p className="text-muted">ID #{document.id}</p>
            </div>
            <Link to="/documents" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          {/* Card */}
          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-file-earmark"></i> Document Information
              </h5>
            </div>

            <div className="card-body">
              <div className="row">
                {/* Columna izquierda */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Document Name</label>
                    <p className="fs-6">{document.name || "-"}</p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Type</label>
                    <p className="fs-6">
                      <span className="badge bg-info text-dark">
                        {document.type || "-"}
                      </span>
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Category</label>
                    <p className="fs-6">
                      {document.category ? (
                        <span className="badge bg-secondary">
                          {document.category}
                        </span>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">URL Route</label>
                    <p className="fs-6">
                      {document.url_route ? (
                        <a
                          href={document.url_route}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none"
                        >
                          <i className="bi bi-link-45deg"></i> View Document
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Created At</label>
                    <p className="fs-6">{formatDate(document.create_at) || "-"}</p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Description</label>
                    <p className="fs-6">
                      {document.description ? (
                        <div className="border p-2 bg-light rounded">
                          {document.description}
                        </div>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">
                <Link to="/documents" className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-left"></i> Back
                </Link>

                <Link to={`/documents/${document.id}`} className="btn btn-warning">
                  <i className="bi bi-pencil"></i> Edit
                </Link>

                <button className="btn btn-danger" onClick={handleDelete}>
                  <i className="bi bi-trash"></i> Delete
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};