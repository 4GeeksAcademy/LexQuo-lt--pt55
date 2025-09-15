
import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useState, useEffect } from "react"; 

export const ViewCourtfileLawyer = () => {
  const { store, dispatch } = useGlobalReducer();
  const { courtfileId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null"); 
  const token = auth?.token; 
  const authed = !!token;    

  // ------------------- COURTFILE -------------------
  const [courtfile, setCourtfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ------------------- DEADLINES (YA FILTRADOS) -------------------
  const [caseDeadlines, setCaseDeadlines] = useState([]);                 
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);        
  const [deadlinesErr, setDeadlinesErr] = useState("");                   
  const [deletingDeadlineRelId, setDeletingDeadlineRelId] = useState(null);

  // ------------------- APPOINTMENTS (YA FILTRADOS) -------------------
  const [caseAppointments, setCaseAppointments] = useState([]);          
  const [loadingAppointments, setLoadingAppointments] = useState(false);  
  const [appointmentsErr, setAppointmentsErr] = useState("");             
  const [deletingApptRelId, setDeletingApptRelId] = useState(null);

  // ------------------- FETCHERS -------------------
  const fetchCourtfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCourtfile(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching courtfile:", err);
      setError("Failed to load courtfile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeadlines = async () => {
    try {
      setLoadingDeadlines(true);
      setDeadlinesErr("");
      const resp = await fetch(
        `${API}/api/deadlines-courtfiles`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const idNum = Number(courtfileId);                                              
      const enriched = data.map(d => ({ relation_id: d.id, ...d }));                  
      const filtered = enriched.filter(d =>                                          
        d.courtfile_id === idNum || d?.courtfile?.id === idNum
      );
      setCaseDeadlines(filtered);                                                     
    } catch (e) {
      setDeadlinesErr(e.message || "Error fetching deadlines");
    } finally {
      setLoadingDeadlines(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      setAppointmentsErr("");
      const resp = await fetch(
        `${API}/api/appointments-courtfiles`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const idNum = Number(courtfileId);                                              
      const enriched = data.map(a => ({ relation_id: a.id, ...a }));                  
      const filtered = enriched.filter(a =>                                          
        a.courtfile_id === idNum || a?.courtfile?.id === idNum
      );
      setCaseAppointments(filtered);                                                  
    } catch (e) {
      setAppointmentsErr(e.message || "Error fetching appointments");
    } finally {
      setLoadingAppointments(false);
    }
  };

  // ------------------- EFFECTS -------------------
  useEffect(() => {
    if (!courtfileId) return;
    fetchCourtfile();
  }, [courtfileId, token]);

  useEffect(() => {
    if (!authed || !courtfileId) return;
    fetchDeadlines();
    fetchAppointments();
  }, [API, authed, token, courtfileId]); 

  // ------------------- HELPERS -------------------
  const getPriorityBadgeClass = (priority = "") => {
    switch (String(priority).toLowerCase()) {
      case "low": return "bg-secondary";
      case "medium": return "bg-info";
      case "high": return "bg-warning";
      case "urgent": return "bg-danger";
      default: return "bg-secondary";
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this courtfile?")) return;
    try {
      const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        dispatch({ type: "DELETE_COURTFILE", payload: courtfileId });
        navigate("/courtfiles");
        alert("Courtfile deleted successfully!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete courtfile");
      }
    } catch (error) {
      console.error("Error deleting courtfile:", error);
      alert(`Error deleting courtfile: ${error.message}`);
    }
  };

  const handleDeleteDeadlineRelation = async (relationId) => {
    if (!authed) return;
    if (!window.confirm("Delete this link? The deadline will no longer be associated with this case.")) return;
    try {
      setDeletingDeadlineRelId(relationId);
      const resp = await fetch(`${API}/api/deadlines-courtfiles/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      await fetchDeadlines(); 
    } catch (err) {
      alert(err.message || "Error deleting relation");
    } finally {
      setDeletingDeadlineRelId(null);
    }
  };

  const handleDeleteAppointmentRelation = async (relationId) => {
    if (!authed) return;
    if (!window.confirm("Delete this link? The appointment will no longer be associated with this case.")) return;
    try {
      setDeletingApptRelId(relationId);
      const resp = await fetch(`${API}/api/appointments-courtfiles/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      await fetchAppointments(); 
    } catch (err) {
      alert(err.message || "Error deleting relation");
    } finally {
      setDeletingApptRelId(null);
    }
  };

  // ------------------- RENDER -------------------
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading courtfile...</p>
        </div>
      </div>
    );
  }

  if (error || !courtfile) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Courtfile not found"}
        </div>
        <Link to="/courtfiles" className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Courtfiles
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-10">
          {/* Header del expediente */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Courtfile Details PRIVADOS</h1>
              <p className="text-muted">Case #{courtfile.id}</p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/DashboardLawyer" className="btn btn-outline-secondary">
                <i className="bi bi-grid"></i> Dashboard
              </Link>
              <Link to={`/courtfiles/${courtfile.id}`} className="btn btn-warning">
                <i className="bi bi-pencil"></i> Edit
              </Link>
              <button className="btn btn-danger" onClick={handleDelete}>
                <i className="bi bi-trash"></i> Delete
              </button>
            </div>
          </div>

          {/* Card con detalles */}
          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-file-earmark-text"></i> Case Information
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                {/* Columna izquierda */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Case Number</label>
                    <p className="fs-5">{courtfile.case_number}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Title</label>
                    <p className="fs-6">{courtfile.title}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Jurisdiction</label>
                    <p>
                      <span className="badge bg-secondary">{courtfile.jurisdiction}</span>
                    </p>
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Court</label>
                    <p>{courtfile.court}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Status</label>
                    <p>
                      <span className={`badge ${courtfile.status ? "bg-success" : "bg-danger"}`}>
                        {courtfile.status ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Created Date</label>
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Description</label>
                    <div className="card bg-light">
                      <div className="card-body">
                        <p className="card-text">{courtfile.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DEADLINES */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">DEADLINES</h3>
              {/* Botón de agregar en el título */}
              <Link
                to="/deadlines/addDeadline"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/view/${courtfile.id}`
                }}
                className="btn btn-sm btn-success"
              >
                + New Deadline
              </Link>
            </div>

            {loadingDeadlines && <p className="mt-3">Loading deadlines...</p>}
            {deadlinesErr && <div className="alert alert-danger mt-3">{deadlinesErr}</div>}
            {!loadingDeadlines && !deadlinesErr && caseDeadlines.length === 0 && (
              <div className="alert alert-info mt-3">No deadlines linked yet. Please add one!</div>
            )}

            {!loadingDeadlines && caseDeadlines.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Deadline ID</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Hour</th>
                      <th>Priority</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseDeadlines.map(dl => (
                      <tr key={dl.relation_id}>
                        <td>{dl.deadline_id}</td>
                        <td>{dl.deadline_type}</td>
                        <td>{dl.deadline_date}</td>
                        <td>{dl.deadline_hour}</td>
                        <td>
                          <span className={`badge ${getPriorityBadgeClass(dl.priority)}`}>
                            {String(dl.priority).charAt(0).toUpperCase() + String(dl.priority).slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="text-end">
                          <Link to={`/deadlines/view/${dl.deadline_id}`} className="btn btn-sm btn-info me-1" title="View">
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link to={`/deadlines/${dl.deadline_id}`} className="btn btn-sm btn-warning me-1" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-danger"
                            title={dl.relation_id ? "Unlink" : "No link available"}
                            disabled={!dl.relation_id || deletingDeadlineRelId === dl.relation_id}
                            onClick={() => handleDeleteDeadlineRelation(dl.relation_id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* APPOINTMENTS */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">APPOINTMENTS</h3>
              {/* Botón de agregar en el título */}
              <Link
                to="/appointments/addAppointment"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/view/${courtfile.id}`
                }}
                className="btn btn-sm btn-success"
              >
                + New Appointment
              </Link>
            </div>

            {loadingAppointments && <p className="mt-3">Loading appointments...</p>}
            {appointmentsErr && <div className="alert alert-danger mt-3">{appointmentsErr}</div>}
            {!loadingAppointments && !appointmentsErr && caseAppointments.length === 0 && (
              <div className="alert alert-info mt-3">No appointments linked yet. Please add one!</div>
            )}

            {!loadingAppointments && caseAppointments.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Appointment ID</th>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Starts</th>
                      <th>Ends</th>
                      <th>Location</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseAppointments.map(ap => (
                      <tr key={ap.relation_id}>
                        <td>{ap.appointment_id}</td>
                        <td>{ap.appointment_title}</td>
                        <td>{ap.appointment_date}</td>
                        <td>{ap.starts_at}</td>
                        <td>{ap.ends_at}</td>
                        <td>{ap.appointment_location}</td>
                        <td className="text-end">
                          <Link to={`/appointments/view/${ap.appointment_id}`} className="btn btn-sm btn-info me-1" title="View">
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link to={`/appointments/${ap.appointment_id}`} className="btn btn-sm btn-warning me-1" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-danger"
                            title={ap.relation_id ? "Unlink" : "No link available"}
                            disabled={!ap.relation_id || deletingApptRelId === ap.relation_id}
                            onClick={() => handleDeleteAppointmentRelation(ap.relation_id)}
                          >
                            {deletingApptRelId === ap.relation_id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
