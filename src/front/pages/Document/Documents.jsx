import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const Documents = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API}/api/documents`);
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_DOCUMENTS", payload: data });
      } else {
        console.error("Error fetching documents");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDeleteDocument = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`${API}/api/documents/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", "Content-Type": "application/json" }
      });

      if (response.ok) {
        dispatch({ type: "DELETE_DOCUMENT", payload: id });
        alert("Document deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert(`Error deleting document: ${error.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">DOCUMENTS</h1>

      <Link to="/documents/addDocument" className="btn btn-primary mb-3">
        <i className="bi bi-plus-circle"></i> New Document
      </Link>

      {store.documents && store.documents.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Type</th>
                <th>Category</th>
                <th>Url</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {store.documents.map((document) => (
                <tr key={document.id}>
                  <td><strong>{document.id}</strong></td>
                  <td>{document.name}</td>
                  <td>{document.description}</td>
                  <td>{document.type}</td>
                  <td>{document.category}</td>
                  <td>{document.url_route}</td>
                  <td>{document.create_at}</td>
                  <td>
                    <Link to={`/documents/view/${document.id}`} className="btn btn-sm btn-info me-1" title="View">
                      <i className="bi bi-eye"></i>
                    </Link>
                    <Link to={`/documents/${document.id}`} className="btn btn-sm btn-warning me-1" title="Edit">
                      <i className="bi bi-pencil"></i>
                    </Link>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Delete"
                      onClick={() => handleDeleteDocument(document.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> No documents found. Create your first one!
        </div>
      )}
    </div>
  );
};