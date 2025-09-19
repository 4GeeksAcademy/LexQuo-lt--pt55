import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewDocument = () => {
  const { dispatch } = useGlobalReducer();
  const { documentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/documents";

  const API = import.meta.env.VITE_BACKEND_URL;

  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const preselectedCourtfileId = location.state?.preselectedCourtfileId || null;
  const preselectedCourtfileNumber = location.state?.preselectedCourtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.preselectedCourtfileTitle || null;

  const [preselectedCf, setPreselectedCf] = useState(
    preselectedCourtfileNumber && preselectedCourtfileTitle
      ? { case_number: preselectedCourtfileNumber, title: preselectedCourtfileTitle }
      : null
  );

  useEffect(() => {
    const loadCf = async () => {
      try {
        if (preselectedCourtfileId && !preselectedCf) {
          const resp = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`);
          if (resp.ok) {
            const d = await resp.json();
            setPreselectedCf({ case_number: d.case_number, title: d.title });
          }
        }
      } catch (e) {
        // opcional: log/ignorar
      }
    };
    loadCf();
  }, [API, preselectedCourtfileId, preselectedCf]);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/documents/${documentId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setDocumentData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load document data");
      } finally {
        setLoading(false);
      }
    };

    if (documentId) fetchDocument();
  }, [documentId, API]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`${API}/api/documents/${documentId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        dispatch({ type: "DELETE_DOCUMENT", payload: Number(documentId) || documentId });
        navigate(returnTo, { replace: true });
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

  const handleDownload = (docItem) => {
    try {
      const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
      const isOfficeFile = officeExtensions.includes((docItem.type || "").toLowerCase());

      if (isOfficeFile) {
        const downloadLink = document.createElement('a');
        downloadLink.href = docItem.url_route;
        const downloadName = docItem.original_filename || `${docItem.name}.${docItem.type}`;
        downloadLink.setAttribute('download', downloadName);
        downloadLink.style.display = 'none';

        document.body.appendChild(downloadLink);
        downloadLink.click();

        document.body.removeChild(downloadLink);
      } else {
        window.open(docItem.url_route, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error handling file:', error);
      alert('Error al manejar el archivo');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  function dateWithoutHours(fechaStr) {
    if (!fechaStr) return "-";
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fechaStr)) {
      return "Invalid date format";
    }

    const partes = fechaStr.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

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

  if (error || !documentData) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Document not found"}
        </div>
        <Link to={returnTo} className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back
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
              <p className="text-muted">ID #{documentData.id}</p>
              {preselectedCourtfileId && (
                <span className="badge bg-dark">
                  Linked to Case {preselectedCf?.case_number || preselectedCourtfileNumber || `#${preselectedCourtfileId}`}
                  {(preselectedCf?.title || preselectedCourtfileTitle) ? ` — ${preselectedCf?.title || preselectedCourtfileTitle}` : ""}
                </span>
              )}
            </div>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
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
                    <p className="fs-6">{documentData.name || "-"}</p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Download</label>
                    <p className="fs-6">
                      <button
                        onClick={() => handleDownload(documentData)}
                        className="btn btn-success btn-sm"
                        title={`Download ${documentData.name}`}
                      >
                        <i className="bi bi-download"></i> {documentData.name}
                      </button>
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Created At</label>
                    <p className="fs-6">{formatDate(documentData.create_at) || "-"}</p>
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Category</label>
                    <p className="fs-6">
                      {documentData.category ? (
                        <span className="badge bg-secondary">
                          {documentData.category}
                        </span>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Document Date</label>
                    <p className="fs-6">{dateWithoutHours(documentData.document_date) || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Description</label>
                    <div className="border p-3 bg-light rounded">
                      {documentData.description ? (
                        <p className="mb-0">{documentData.description}</p>
                      ) : (
                        <p className="text-muted mb-0">No description provided</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">

                <Link
                  to={`/documents/${documentData.id}`}
                  state={{ returnTo }}
                  className="btn btn-warning"
                >
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