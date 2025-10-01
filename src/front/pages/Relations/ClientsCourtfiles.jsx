// src/front/pages/ClientCourtfiles.jsx
import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const ClientsCourtfiles = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;

  const fetchRelations = async () => {
    try {
      const response = await fetch(`${API}/api/clients-courtfiles`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_CLIENT_COURTFILES", payload: data });
      } else {
        console.error("Error fetching relations");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchRelations();
  }, []);

  const handleDeleteRelation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this relation?")) return;

    try {
      const response = await fetch(`${API}/api/clients-courtfiles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (response.ok) {
        dispatch({ type: "DELETE_CLIENT_COURTFILE", payload: id });
        alert("Relation deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting relation:", error);
      alert(`Error deleting relation: ${error.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">CLIENT–COURTFILES</h1>

      <Link to="/AddClientsCourtfiles" className="btn btn-primary mb-3">
        <i className="bi bi-plus-circle"></i> New Relation
      </Link>

      {store.clientsCourtfiles && store.clientsCourtfiles.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Courtfile</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.clientsCourtfiles.map((cc) => (
                <tr key={cc.id}>
                  <td><strong>{cc.id}</strong></td>
                  <td>{cc.client_name}</td>
                  <td>{cc.courtfile_number}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Delete"
                      onClick={() => handleDeleteRelation(cc.id)}
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
          <i className="bi bi-info-circle"></i> No Relations found. Create your first one!
        </div>
      )}
    </div>
  );
};