import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useEffect, useState } from "react";

export const AddAppointmentsCourtfiles = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    appointment_id: "",
    courtfile_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usar datos del store
  const appointments = store.appointments || [];
  const courtfiles = store.courtfiles || [];

  const appointmentLabel = (a) => {
    const title = a.title || "Unknown title";
    const date = a.date ? new Date(a.date).toLocaleDateString() : "No date";
    const time = a.starts_at ? `${a.starts_at} - ${a.ends_at}` : "";
    return `${title} - ${date} ${time}`.trim();
  };

  const courtfileLabel = (cf) =>
    (cf.title ? `${cf.case_number} – ${cf.title}` : cf.case_number) ||
    `Courtfile #${cf.id}`;

  // Cargar datos solo si no están en el store
  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        if (appointments.length === 0) {
          const response = await fetch(`${API}/api/appointments`);
          if (response.ok) {
            const data = await response.json();
            if (alive) dispatch({ type: "SET_APPOINTMENTS", payload: data });
          }
        }

        if (courtfiles.length === 0) {
          const response = await fetch(`${API}/api/courtfiles`);
          if (response.ok) {
            const data = await response.json();
            if (alive) dispatch({ type: "SET_COURTFILES", payload: data });
          }
        }
      } catch (err) {
        if (alive) setError("Error loading data");
        console.error(err);
      }
    };

    loadData();

    return () => { alive = false; };
  }, [API, dispatch, appointments.length, courtfiles.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        appointment_id: Number(formData.appointment_id),
        courtfile_id: Number(formData.courtfile_id),
      };

      const res = await fetch(`${API}/api/appointments-courtfiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create relation");
      }

      // Actualizar la lista de relaciones en el store
      const relationsResponse = await fetch(`${API}/api/appointments-courtfiles`);
      if (relationsResponse.ok) {
        const allRelations = await relationsResponse.json();
        dispatch({ type: "SET_APPOINTMENT_COURTFILES", payload: allRelations });
      }

      alert("Relationship created successfully!");
      navigate("/AppointmentsCourtfiles");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Add Appointment–Courtfile</h1>
            <Link to="/AppointmentsCourtfiles" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="appointment_id" className="form-label">Appointment *</label>
                  <select
                    id="appointment_id"
                    name="appointment_id"
                    className="form-select"
                    value={formData.appointment_id}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select an appointment</option>
                    {appointments.map(a => (
                      <option key={a.id} value={a.id}>{appointmentLabel(a)}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="courtfile_id" className="form-label">Courtfile *</label>
                  <select
                    id="courtfile_id"
                    name="courtfile_id"
                    className="form-select"
                    value={formData.courtfile_id}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a courtfile</option>
                    {courtfiles.map(cf => (
                      <option key={cf.id} value={cf.id}>{courtfileLabel(cf)}</option>
                    ))}
                  </select>
                </div>

                <div className="d-flex gap-2 justify-content-end">
                  <Link to="/AppointmentsCourtfiles" className="btn btn-secondary">
                    Cancel
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Creating..." : "Create Relation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};