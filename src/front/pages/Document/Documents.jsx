import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const Documents = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API}/api/documents`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

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

  function dateWithoutHours(fechaStr) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fechaStr)) {
      return "Formato de fecha de entrada inválido. Se esperaba 'YYYY-MM-DD'.";
    }

    const partes = fechaStr.split('-');

    const anio = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    return `${dia}/${mes}/${anio}`;
  }

  const handleDeleteDocument = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`${API}/api/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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

  const handleDownload = async (doc) => {
    try {
      const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

      if (officeExtensions.includes(doc.type.toLowerCase())) {
        const link = document.createElement('a');
        link.href = doc.url_route;
        const downloadName = doc.original_filename || `${doc.name}.${doc.type}`;
        link.setAttribute('download', downloadName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(doc.url_route, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error handling file:', error);
      alert('Error al manejar el archivo');
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
                <th>Category</th>
                <th>File</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {store.documents.map((document) => (
                <tr key={document.id}>
                  <td><strong>{document.id}</strong></td>
                  <td>{document.name}</td>
                  <td>{document.description}</td>
                  <td>{document.category}</td>
                  <td>
                    <button
                      onClick={() => handleDownload(document)}
                      className="btn btn-success btn-sm"
                      title="Descargar archivo"
                    >
                      <i className="bi bi-arrow-down"></i>
                    </button>
                  </td>
                  <td>{dateWithoutHours(document.document_date)}</td>
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
        <div className="alert text-secondary bg-transparent border-0 mt-2">
          <i className="bi bi-info-circle"></i> No documents found. Create your first one!
        </div>
      )
      }
    </div >
  );
};