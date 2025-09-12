import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const AppointmentsCourtfiles = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const fetchRelations = async () => {
    try {
      const response = await fetch(`${API}/api/appointments-courtfiles`);
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_APPOINTMENT_COURTFILES", payload: data });
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
      const response = await fetch(`${API}/api/appointments-courtfiles/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", "Content-Type": "application/json" }
      });

      if (response.ok) {
        dispatch({ type: "DELETE_APPOINTMENT_COURTFILE", payload: id });
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
      <h1 className="mb-4">APPOINTMENTS–COURTFILES</h1>

      <Link to="/AddAppointmentsCourtfiles" className="btn btn-primary mb-3">
        <i className="bi bi-plus-circle"></i> New Relation
      </Link>

      {store.appointmentsCourtfiles && store.appointmentsCourtfiles.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Appointment Title</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Courtfile</th>
                <th>Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.appointmentsCourtfiles.map((ac) => (
                <tr key={ac.id}>
                  <td><strong>{ac.id}</strong></td>
                  <td>{ac.appointment_title || "N/A"}</td>
                  <td>{formatDateTime(ac.appointment_date, ac.starts_at)} - {ac.ends_at}</td>
                  <td>{ac.appointment_location || "N/A"}</td>
                  <td>{ac.courtfile_number || "N/A"}</td>
                  <td>{ac.courtfile_title || "N/A"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Delete"
                      onClick={() => handleDeleteRelation(ac.id)}
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
          <i className="bi bi-info-circle"></i> No Relations found. Create your first one!
        </div>
      )}
    </div>
  );
};