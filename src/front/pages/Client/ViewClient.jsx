import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewClient = () => {
  const { dispatch } = useGlobalReducer();
  const { clientId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/clients/${clientId}`); // singular
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setClient(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching client:", err);
        setError("Failed to load client data");
      } finally {
        setLoading(false);
      }
    };

    if (clientId) fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      const response = await fetch(`${API}/api/clients/${clientId}`, { method: "DELETE" });
      if (response.ok) {
        dispatch({ type: "DELETE_CLIENT", payload: Number(clientId) || clientId });
        navigate("/clients");
        alert("Client deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete client");
      }
    } catch (err) {
      console.error("Error deleting client:", err);
      alert(`Error deleting client: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          <p>Loading client...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Client not found"}
        </div>
        <Link to="/clients" className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Client Details</h1>
              <p className="text-muted">ID #{client.id}</p>
            </div>
            <Link to="/clients" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-person-badge"></i> Client Information
              </h5>
            </div>

            <div className="card-body">
              <div className="d-flex justify-content-center mb-4">
                {client.url_img ? (
                  <img
                    src={client.url_img}
                    alt="Client Profile"
                    className="rounded-circle border border-2 shadow-sm"
                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                  />
                ) : (
                  <i className="bi bi-person-circle text-muted" style={{ fontSize: '150px' }}></i>
                )}
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">First Name</label>
                    <p className="fs-6">{client.firstname || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Last Name</label>
                    <p className="fs-6">{client.lastname || "-"}</p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Email</label>
                    <p className="fs-6">{client.email || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Phone</label>
                    <p className="fs-6">{client.phone || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Status</label>
                    <p className="fs-6">
                      {client.is_active ? (
                        <span className="badge text-bg-success">Active</span>
                      ) : (
                        <span className="badge text-bg-secondary">Inactive</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">
                <Link to="/clients" className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-left"></i> Back
                </Link>
                <Link to={`/clients/${client.id}`} className="btn btn-warning">
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
