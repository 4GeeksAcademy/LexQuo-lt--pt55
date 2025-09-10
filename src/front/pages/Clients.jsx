import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const Clients = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API}/api/clients`);
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_CLIENTS", payload: data });
      } else {
        console.error("Error fetching clients");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    try {
      const response = await fetch(`${API}/api/clients/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", "Content-Type": "application/json" }
      });

      if (response.ok) {
        dispatch({ type: "DELETE_CLIENT", payload: id });
        alert("Client deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert(`Error deleting client: ${error.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">CLIENTS</h1>

      <Link to="/clients/addClient" className="btn btn-primary mb-3">
        <i className="bi bi-plus-circle"></i> New Client
      </Link>

      {store.clients && store.clients.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Firstname</th>
                <th>Lastname</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.clients.map((client) => (
                <tr key={client.id}>
                  <td><strong>{client.id}</strong></td>
                  <td>{client.firstname}</td>
                  <td>{client.lastname}</td>
                  <td>{client.email}</td>
                  <td>{client.phone || "—"}</td>
                  <td>
                    <span className={`badge ${client.is_active ? "bg-success" : "bg-danger"}`}>
                      {client.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <Link to={`/clients/view/${client.id}`} className="btn btn-sm btn-info me-1" title="View">
                      <i className="bi bi-eye"></i>
                    </Link>
                    <Link to={`/clients/${client.id}`} className="btn btn-sm btn-warning me-1" title="Edit">
                      <i className="bi bi-pencil"></i>
                    </Link>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Delete"
                      onClick={() => handleDeleteClient(client.id)}
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
          <i className="bi bi-info-circle"></i> No Clients found. Create your first one!
        </div>
      )}
    </div>
  );
};
