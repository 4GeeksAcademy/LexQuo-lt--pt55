import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const DeadlinesCourtfiles = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;

  const fetchRelations = async () => {
    try {
      const response = await fetch(`${API}/api/deadlines-courtfiles`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,          
        },
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_DEADLINE_COURTFILES", payload: data });
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

  const formatDateTime = (dateStr, timeStr) => {
    const date = dateStr ? new Date(dateStr).toLocaleDateString() : "No date";
    const time = timeStr || "";
    return `${date} ${time}`.trim();
  };

  const handleDeleteRelation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this relation?")) return;

    try {
      const response = await fetch(`${API}/api/deadlines-courtfiles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (response.ok) {
        dispatch({ type: "DELETE_DEADLINE_COURTFILE", payload: id });
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
      <h1 className="mb-4">DEADLINES–COURTFILES</h1>

      <Link to="/AddDeadlinesCourtfiles" className="btn btn-primary mb-3">
        <i className="bi bi-plus-circle"></i> New Relation
      </Link>

      {store.deadlinesCourtfiles && store.deadlinesCourtfiles.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Deadline Type</th>
                <th>Date & Time</th>
                <th>Priority</th>
                <th>Courtfile</th>
                <th>Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.deadlinesCourtfiles.map((dc) => (
                <tr key={dc.id}>
                  <td><strong>{dc.id}</strong></td>
                  <td>{dc.deadline_type || "N/A"}</td>
                  <td>{formatDateTime(dc.deadline_date, dc.deadline_hour)}</td>
                  <td>{dc.priority || "N/A"}</td>
                  <td>{dc.courtfile_number || "N/A"}</td>
                  <td>{dc.courtfile_title || "N/A"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Delete"
                      onClick={() => handleDeleteRelation(dc.id)}
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