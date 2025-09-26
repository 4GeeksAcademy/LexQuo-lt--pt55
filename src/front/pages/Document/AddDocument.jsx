import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const AddDocument = () => {
  const { store, dispatch } = useGlobalReducer();
  const location = useLocation();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer";

  if (!allowed) return <Navigate to="/403" replace />;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/documents";
  const suggestion = location.state?.suggestion || null;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    document_date: "",
    courtfile_id: preselectedCourtfileId ? String(preselectedCourtfileId) : ""
  });

  const [file, setFile] = useState(null);
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

        // si ya viene el courtfileId, no hace falta llenar el combo
        if (preselectedCourtfileId) {
          // si no llegaron number/title, podemos intentar completarlos
          if (!preselectedCf) {
            const r = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
              signal: ac.signal,
            });
            if (r.ok) {
              const d = await r.json();
              setPreselectedCf({ case_number: d.case_number, title: d.title });
            }
          }
          setMyCases([]);
          return;
        }

        const endpoint = `${API}/api/lawyers-courtfiles`
        const headers = { Authorization: `Bearer ${token}` }
        const resp = await fetch(endpoint, { headers });

        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const mapped = (data || [])
          .map(r => r?.courtfile)
          .filter(Boolean)
          .map(cf => ({
            id: cf.id,
            number: cf.case_number,
            title: cf.title,
          }));

        setMyCases(mapped);
      } catch (err) {
        setError(err.message || "Error fetching courtfiles");
      } finally {
        setLoadingCases(false);
      }
    };
    fetchCases();
  }, [API, token, preselectedCourtfileId, preselectedCf]);


  const documentCategories = [
    "Resolution / Ruling",
    "Party Filing",
    "Evidence",
    "Precautionary Measure / Urgent Request",
    "Public Prosecutor's Office Action",
    "Relevant Judicial Proceeding",
    "Official Letter / Communication",
    "Judgment",
    "Costs and Fees",
    "Internal Note / Reminder",
    "Others"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);


    if (!preselectedCourtfileId && !formData.courtfile_id) {
      setLoading(false);
      setError("Please select a courtfile to link this document.");
      return;
    }

    try {
      // 1) Crear el Document (multipart/form-data)
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("category", formData.category);
      data.append("document_date", formData.document_date);
      if (file) data.append("file", file);

      const response = await fetch(`${API}/api/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create document");
      }

      const newDocument = await response.json();
      dispatch({ type: "ADD_DOCUMENT", payload: newDocument });

      // 2) Link al Courtfile (preseleccionado o elegido)
      const targetCfId = preselectedCourtfileId ? Number(preselectedCourtfileId) : Number(formData.courtfile_id);

      if (targetCfId) {
        setLinking(true);
        const linkResp = await fetch(`${API}/api/courtfile-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            document_id: newDocument.id,
            courtfile_id: targetCfId
          })
        });

        if (!linkResp.ok) {
          const e = await linkResp.json().catch(() => ({}));
          throw new Error(e.error || `Document created, but failed to link (HTTP ${linkResp.status})`);
        }
      }

      alert("Document created and linked successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Error creating Document:", err);
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
            <div>
              <h1>Add New Document</h1>
              {preselectedCourtfileId && (
                <span className="badge bg-dark mt-2">
                  Linked to Case {preselectedCourtfileNumber || `#${preselectedCourtfileId}`}
                  {preselectedCourtfileTitle ? ` — ${preselectedCourtfileTitle}` : ""}
                </span>
              )}
            </div>

            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          {/* Card */}
          <div className="card">
            {suggestion && (
              <div className="alert alert-info">
                <h5 className="mb-1">
                  <i className="bi bi-lightbulb"></i> Sugerencia IA
                </h5>
                <strong>{suggestion.title}</strong>
                {suggestion.reasoning && <p className="mb-1">{suggestion.reasoning}</p>}
                {Array.isArray(suggestion.next_steps) && suggestion.next_steps.length > 0 && (
                  <ul className="mb-1">
                    {suggestion.next_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                )}
                {suggestion.legal_basis && (
                  <small className="text-muted">Fundamento: {suggestion.legal_basis}</small>
                )}
              </div>
            )}
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {!preselectedCourtfileId && (
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
                  <label htmlFor="name" className="form-label">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter document name"
                    disabled={loading}
                  />
                </div>

                {/* input fecha del documento */}
                <div className="mb-3">
                  <label htmlFor="document_date" className="form-label">Document Date</label>
                  <input
                    type="date"
                    className="form-control"
                    id="document_date"
                    name="document_date"
                    value={formData.document_date}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <div className="form-text">Used for the case timeline</div>
                </div>

                <div className="mb-3">
                  <label htmlFor="file" className="form-label">
                    File (optional)
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    id="file"
                    name="file"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="category" className="form-label">
                    Category
                  </label>
                  <select
                    className="form-select"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="">Select category (optional)</option>
                    {documentCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Enter document description (optional)"
                    disabled={loading}
                  />
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to={returnTo} className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading || linking}>
                    {loading || linking ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" />
                        {linking ? " Linking..." : " Creating..."}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create Document
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};