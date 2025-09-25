import { useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { Link } from "react-router-dom";

export const CourtfilesDocuments = () => {
    const { store, dispatch } = useGlobalReducer();
    const API = import.meta.env.VITE_BACKEND_URL;

    const token = store?.auth?.token;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCourtfileDocuments();
    }, []);

    const fetchCourtfileDocuments = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API}/api/courtfile-document`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            dispatch({ type: "SET_COURTFILE_DOCUMENT", payload: data });
            setError(null);
        } catch (err) {
            console.error("Error fetching courtfile-document relationships:", err);
            setError("Failed to load courtfile-document relationships");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this relationship?")) {
            return;
        }

        try {
            const response = await fetch(`${API}/api/courtfile-document/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });

            if (response.ok) {
                dispatch({ type: "DELETE_COURTFILE_DOCUMENT", payload: id });
                alert("Relationship deleted successfully!");
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to delete relationship");
            }
        } catch (err) {
            console.error("Error deleting relationship:", err);
            alert(`Error: ${err.message}`);
        }
    };

    const handleViewDocument = async (relationship) => {
        try {
            if (!relationship.document_url) {
                alert("Document URL not available");
                return;
            }

            const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'];
            const documentType = relationship.document_type ? relationship.document_type.toLowerCase() : '';

            if (officeExtensions.includes(documentType)) {
                const link = document.createElement('a');
                link.href = relationship.document_url;

                const downloadName = relationship.document_original_filename ||
                    `${relationship.document_name}.${relationship.document_type}`;

                link.setAttribute('download', downloadName);
                link.style.display = 'none';

                document.body.appendChild(link);
                link.click();

                setTimeout(() => {
                    if (document.body.contains(link)) {
                        document.body.removeChild(link);
                    }
                }, 100);

            } else {
                window.open(relationship.document_url, '_blank', 'noopener,noreferrer');
            }

        } catch (error) {
            console.error('Error handling document:', error);
            window.open(relationship.document_url, '_blank', 'noopener,noreferrer');
        }
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading courtfile-document relationships...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
                <button className="btn btn-primary" onClick={fetchCourtfileDocuments}>
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Courtfile-Document Relationships</h1>
                <Link to="/AddCourtfilesDocuments" className="btn btn-primary">
                    <i className="bi bi-plus-circle"></i> Add New Relationship
                </Link>
            </div>

            <div className="card">
                <div className="card-body">
                    {store.courtfileDocument && store.courtfileDocument.length > 0 ? (
                        <div className="table-responsive">
                            <table className="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Courtfile</th>
                                        <th>Case Number</th>
                                        <th>Document</th>
                                        <th>Type</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {store.courtfileDocument.map((relationship) => (
                                        <tr key={relationship.id}>
                                            <td>{relationship.id}</td>
                                            <td>{relationship.courtfile_title}</td>
                                            <td>{relationship.courtfile_number || "-"}</td>
                                            <td>{relationship.document_name}</td>
                                            <td>
                                                <span className="badge bg-info text-dark">
                                                    {relationship.document_type || "-"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="btn-group" role="group">
                                                    {relationship.document_url && (
                                                        <button
                                                            className="btn btn-sm btn-success me-1"
                                                            onClick={() => handleViewDocument(relationship)}
                                                            title="View Document"
                                                        >
                                                            <i className="bi bi-eye"></i> View
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDelete(relationship.id)}
                                                        title="Delete Relationship"
                                                    >
                                                        <i className="bi bi-trash"></i> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <i className="bi bi-file-earmark-break display-1 text-muted"></i>
                            <h4 className="mt-3">No Relationships Found</h4>
                            <p className="text-muted">
                                There are no courtfile-document relationships yet.
                            </p>
                            <Link to="/AddCourtfilesDocuments" className="btn btn-primary">
                                <i className="bi bi-plus-circle"></i> Create First Relationship
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {store.courtfileDocument && store.courtfileDocument.length > 0 && (
                <div className="mt-3">
                    <small className="text-muted">
                        Total: {store.courtfileDocument.length} relationship(s)
                    </small>
                </div>
            )}
        </div>
    );
};