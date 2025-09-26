import { useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { Link } from "react-router-dom";

export const LawyersClients = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLawyersClients();
  }, []);

  const fetchLawyersClients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/lawyer-client`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      dispatch({ type: "SET_LAWYER_CLIENT", payload: data });
      setError(null);
    } catch (err) {
      console.error("Error fetching lawyer-client relationships:", err);
      setError("Failed to load lawyer-client relationships");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this relationship?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/api/lawyer-client/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });

      if (response.ok) {
        dispatch({ type: "DELETE_LAWYER_CLIENT", payload: id });
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

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading lawyer-client relationships...</p>
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
        <button className="btn btn-primary" onClick={fetchLawyersClients}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Lawyer-Client Relationships</h1>
        <Link to="/AddLawyersClients" className="btn btn-primary">
          <i className="bi bi-plus-circle"></i> Add New Relationship
        </Link>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {store.lawyerClient && store.lawyerClient.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Lawyer</th>
                    <th>Client</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {store.lawyerClient.map((relationship) => (
                    <tr key={relationship.id}>
                      <td>{relationship.id}</td>
                      <td>
                        {relationship.lawyer_name}
                      </td>
                      <td>
                        {relationship.client_name}
                      </td>
                      <td>
                        <div className="btn-group" role="group">
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
              <i className="bi bi-people display-1 text-muted"></i>
              <h4 className="mt-3">No Relationships Found</h4>
              <p className="text-muted">
                There are no lawyer-client relationships yet.
              </p>
              <Link to="/AddLawyersClients" className="btn btn-primary">
                <i className="bi bi-plus-circle"></i> Create First Relationship
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {store.lawyerClient && store.lawyerClient.length > 0 && (
        <div className="mt-3">
          <small className="text-muted">
            Total: {store.lawyerClient.length} relationship(s)
          </small>
        </div>
      )}
    </div>
  );
};