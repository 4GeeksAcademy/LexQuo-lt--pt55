import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewDeadline = () => {
  const { dispatch } = useGlobalReducer();
  const { deadlineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/deadlines";

  const API = import.meta.env.VITE_BACKEND_URL;

  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/deadlines/${deadlineId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setDeadline(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching deadline:", err);
        setError("Failed to load deadline data");
      } finally {
        setLoading(false);
      }
    };

    if (deadlineId) fetchDeadline();

  }, [deadlineId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this deadline?")) return;
    try {
      const response = await fetch(`${API}/api/deadlines/${deadlineId}`, { method: "DELETE" });
      if (response.ok) {
        dispatch({ type: "DELETE_DEADLINE", payload: Number(deadlineId) || deadlineId });
        navigate(returnTo, { replace: true });
        alert("Deadline deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete deadline");
      }
    } catch (err) {
      console.error("Error deleting deadline:", err);
      alert(`Error deleting deadline: ${err.message}`);
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

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          <p>Loading deadline...</p>
        </div>
      </div>
    );
  }

  if (error || !deadline) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Deadline not found"}
        </div>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Back
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
              <h1>Deadline Details</h1>
              <p className="text-muted">ID #{deadline.id}</p>
            </div>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back 
            </Link>
          </div>

          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-calendar-event"></i> Deadline Information
              </h5>
            </div>

            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Deadline Type</label>
                    <p className="fs-6">{deadline.deadline_type || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Deadline Date</label>
                    <p className="fs-6">{deadline.deadline_date || "-"}</p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Deadline Time</label>
                    <p className="fs-6">{deadline.deadline_hour || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Priority</label>
                    <p className="fs-6">
                      <span className={`badge ${getPriorityBadgeClass(deadline.priority)}`}>
                        {deadline.priority ? deadline.priority.charAt(0).toUpperCase() + deadline.priority.slice(1) : "-"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">
                <Link
                  to={`/deadlines/${deadline.id}`}
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
    </div >
  );
};