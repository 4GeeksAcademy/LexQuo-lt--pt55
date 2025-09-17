import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import MapComponent from "../../components/Map/MapComponent";
import LocationAutocomplete from "../../components/Map/LocationAutocomplete";

export const ViewAppointment = () => {
  const { dispatch } = useGlobalReducer();
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/appointments/${appointmentId}`); // singular
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setAppointment(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError("Failed to load appointment data");
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) fetchAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      const response = await fetch(`${API}/api/appointments/${appointmentId}`, { method: "DELETE" });
      if (response.ok) {
        dispatch({ type: "DELETE_APPOINTMENT", payload: Number(appointmentId) || appointmentId });
        navigate("/appointments");
        alert("Appointment deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete appointment");
      }
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert(`Error deleting appointment: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          <p>Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Appointment not found"}
        </div>
        <Link to="/appointments" className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Appointments
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
              <h1>Appointment Details</h1>
              <p className="text-muted">ID #{appointment.id}</p>
            </div>
            <Link to="/appointments" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-person-badge"></i> Appointment Information
              </h5>
            </div>

            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Title</label>
                    <p className="fs-6">{appointment.title || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Location</label>
                    <p className="fs-6">{appointment.location || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Aditional details</label>
                    <p className="fs-6">{appointment.details || "-"}</p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Date</label>
                    <p className="fs-6">{appointment.date || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Starts At</label>
                    <p className="fs-6">{appointment.starts_at || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Ends At</label>
                    <p className="fs-6">{appointment.ends_at || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
            {appointment.latitud && appointment.longitud && (
              <div className="mb-3">
                <label className="fw-bold text-muted">Ubicación en Mapa</label>
                <MapComponent
                  position={[appointment.latitud, appointment.longitud]}
                  readonly={true}
                />
                <div className="form-text">
                  Coordenadas: {appointment.latitud}, {appointment.longitud}
                </div>
              </div>
            )}

            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">
                <Link to="/appointments" className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-left"></i> Back
                </Link>
                <Link to={`/appointments/${appointment.id}`} className="btn btn-warning">
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