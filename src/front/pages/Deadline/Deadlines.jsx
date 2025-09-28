import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const Deadlines = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
    const allowed =
      role === "admin_user" ||
      role === "lawyer";
  
    if (!allowed) return <Navigate to="/403" replace />;
  

  const fetchDeadlines = async () => {
    try {
      const response = await fetch(`${API}/api/deadlines`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_DEADLINES", payload: data });
      } else {
        console.error("Error fetching deadlines");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const handleDeleteDeadline = async (id) => {
    if (!window.confirm("Are you sure you want to delete this deadline?")) return;

    try {
      const response = await fetch(`${API}/api/deadlines/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (response.ok) {
        dispatch({ type: "DELETE_DEADLINE", payload: id });
        alert("Deadline deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting deadline:", error);
      alert(`Error deleting deadline: ${error.message}`);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "low": return "bg-secondary";
      case "medium": return "bg-info";
      case "high": return "bg-warning";
      case "urgent": return "bg-danger";
      default: return "bg-secondary";
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">DEADLINES</h1>

      <Link to="/deadlines/addDeadline" className="btn btn-primary mb-3">
        <i className="bi bi-plus-circle"></i> New Deadline
      </Link>

      {store.deadlines && store.deadlines.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.deadlines.map((deadline) => (
                <tr key={deadline.id}>
                  <td><strong>{deadline.id}</strong></td>
                  <td>{deadline.deadline_type}</td>
                  <td>{deadline.deadline_date}</td>
                  <td>{deadline.deadline_hour}</td>
                  <td>
                    <span className={`badge ${getPriorityBadgeClass(deadline.priority)}`}>
                      {deadline.priority.charAt(0).toUpperCase() + deadline.priority.slice(1)}
                    </span>
                  </td>
                  <td>
                    <Link to={`/deadlines/view/${deadline.id}`} className="btn btn-sm btn-info me-1" title="View">
                      <i className="bi bi-eye"></i>
                    </Link>
                    <Link to={`/deadlines/${deadline.id}`} className="btn btn-sm btn-warning me-1" title="Edit">
                      <i className="bi bi-pencil"></i>
                    </Link>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Delete"
                      onClick={() => handleDeleteDeadline(deadline.id)}
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
          <i className="bi bi-info-circle"></i> No deadlines found. Create your first one!
        </div>
      )}
    </div>
  );
};