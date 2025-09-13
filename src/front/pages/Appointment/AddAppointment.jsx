import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const AddAppointment = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/appointments";

  const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
  const token = auth?.token;

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    date: "",
    starts_at: "",
    ends_at: "",
    courtfile_id: preselectedCourtfileId ? String(preselectedCourtfileId) : "",
  });

  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);

  const [myCases, setMyCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [preselectedCf, setPreselectedCf] = useState(
    preselectedCourtfileNumber ? { case_number: preselectedCourtfileNumber, title: preselectedCourtfileTitle } : null
  );

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoadingCases(true);

        if (preselectedCourtfileId) {
          if (!preselectedCf) {
            const r = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`);
            if (r.ok) {
              const d = await r.json();
              setPreselectedCf({ case_number: d.case_number, title: d.title });
            }
          }
          setMyCases([]);
          return;
        }

        const endpoint = token ? `${API}/api/lawyers-courtfiles` : `${API}/api/courtfiles`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const resp = await fetch(endpoint, { headers });
        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }
        const data = await resp.json();
        const mapped = token
          ? data.map(r => ({ id: r.courtfile.id, number: r.courtfile.case_number, title: r.courtfile.title }))
          : data.map(cf => ({ id: cf.id, number: cf.case_number, title: cf.title }));
        setMyCases(mapped);
      } catch (err) {
        setError(err.message || "Error fetching courtfiles");
      } finally {
        setLoadingCases(false);
      }
    };
    fetchCases();
  }, [API, token, preselectedCourtfileId, preselectedCf]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev, [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.courtfile_id) {
      setError("Please select a courtfile to link this appointment.");
      return;
    }

    setLoading(true);
    try {

      const resp = await fetch(`${API}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: formData.title,
          location: formData.location,
          date: formData.date,
          starts_at: formData.starts_at,
          ends_at: formData.ends_at
        })
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Failed to create appointment");
      }

      const newAppointment = await resp.json();
      dispatch?.({ type: "ADD_APPOINTMENT", payload: newAppointment });

      setLinking(true);
      const linkResp = await fetch(`${API}/api/appointments-courtfiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          appointment_id: newAppointment.id,
          courtfile_id: Number(formData.courtfile_id)
        })
      });

      if (!linkResp.ok) {
        const e = await linkResp.json().catch(() => ({}));
        throw new Error(e.error || `Failed to link appointment (HTTP ${linkResp.status})`);
      }

      alert("Appointment created and linked successfully!");
      navigate(returnTo);
    } catch (err) {
      console.error("Error creating/linking appointment:", err);
      setError(err.message);
    } finally {
      setLinking(false);
      setLoading(false);
    }
  };


  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Add New Appointment</h1>
            <Link to="/appointments" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          {/* Card */}
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {preselectedCourtfileId ? (
                  <div className="mb-3">
                    <label className="form-label">Linked Courtfile</label>
                    <div className="form-control-plaintext">
                      Expediente {preselectedCf?.case_number || "—"}                     
                      {preselectedCf?.title ? ` — ${preselectedCf.title}` : ""}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label htmlFor="courtfile_id" className="form-label">Link to Courtfile *</label>
                    <select
                      className="form-select"
                      id="courtfile_id"
                      name="courtfile_id"
                      value={formData.courtfile_id}
                      onChange={handleInputChange}
                      required
                      disabled={loading || loadingCases}
                    >
                      <option value="">Select a courtfile</option>
                      {myCases.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.number} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="title" className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="Title"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="location" className="form-label">Location *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    placeholder="location"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="date" className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    placeholder="example: 2025-11-25"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="starts_at" className="form-label">Starts At *</label>
                  <input
                    type="time"
                    className="form-control"
                    id="starts_at"
                    name="starts_at"
                    value={formData.starts_at}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="ends_at" className="form-label">Ends At *</label>
                  <input
                    type="time"
                    className="form-control"
                    id="ends_at"
                    name="ends_at"
                    value={formData.ends_at}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to="/appointments" className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create Appointment
                      </>
                    )}
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
